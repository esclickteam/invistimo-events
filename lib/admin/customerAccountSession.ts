import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import { getAuthCookieDomain } from "@/lib/env/appEnv";
import { pickPrimaryInvitation } from "@/lib/pickPrimaryInvitation";
import { writeAdminAuditLog } from "@/lib/admin/auditLog";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const SESSION_EXPIRES_IN = "7d";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRole(value: unknown) {
  return cleanStr(value).toLowerCase();
}

function normalizeStaffType(value: unknown) {
  return cleanStr(value).toLowerCase();
}

export function resolveTargetEffectiveRole(user: any) {
  const role = normalizeRole(user?.role);
  const staffType = normalizeStaffType(user?.staffType);

  if (role === "admin") return "admin";
  if (role === "producer") return "producer";
  if (role === "venue_owner") return "venue_owner";

  if (role === "staff" && staffType === "producer_staff") {
    return "producer_staff";
  }

  if (role === "staff") return "staff";

  return role || "user";
}

export function resolveCustomerRedirectUrl(targetEffectiveRole: string) {
  switch (targetEffectiveRole) {
    case "admin":
      return "/admin";
    case "producer":
      return "/producer/dashboard";
    case "producer_staff":
      return "/producer-staff/dashboard";
    case "staff":
      return "/staff/dashboard";
    case "venue_owner":
      return "/venues/dashboard";
    default:
      return "/dashboard";
  }
}

function cookieOptions(httpOnly = true) {
  const domain = getAuthCookieDomain();

  return {
    path: "/",
    httpOnly,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    ...(domain ? { domain } : {}),
    maxAge: SESSION_MAX_AGE,
  };
}

function expireCookie(res: NextResponse, name: string, httpOnly = true) {
  const domain = getAuthCookieDomain();
  const base = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  res.cookies.set(name, "", {
    ...base,
    ...(domain ? { domain } : {}),
    httpOnly,
  });

  res.cookies.set(name, "", {
    ...base,
    httpOnly,
  });
}

/**
 * Active session becomes the selected customer.
 * The admin token is kept only so exit can restore the admin panel.
 * Customer screens then use the same user id, role, and queries as the customer.
 */
export function applyAdminCustomerSessionCookies(
  res: NextResponse,
  input: {
    adminToken: string;
    impersonationToken: string;
    role: string;
    staffType: string | null;
    targetEffectiveRole: string;
    hasPaid: boolean;
    isTrial: boolean;
    trialExpiresAt?: Date | string | null;
  }
) {
  const cookiesToClear = [
    "authToken",
    "token",
    "impersonationToken",
    "hasPaid",
    "isTrial",
    "trialExpiresAt",
    "role",
    "staffType",
    "impersonationRole",
    "originalTargetRole",
    "impersonationSourceRole",
    "impersonatedByAdmin",
    // Parallel "manage" cookies must not keep a second customer context.
    "adminManageUserId",
    "adminManageUserName",
  ];

  for (const name of cookiesToClear) {
    const isHttpOnly =
      name === "authToken" ||
      name === "token" ||
      name === "impersonationToken" ||
      name === "adminManageUserId";

    expireCookie(res, name, isHttpOnly);
  }

  res.cookies.set("adminAuthToken", input.adminToken, cookieOptions(true));
  res.cookies.set("adminToken", input.adminToken, cookieOptions(true));

  res.cookies.set("authToken", input.impersonationToken, cookieOptions(true));
  res.cookies.set("token", input.impersonationToken, cookieOptions(true));
  res.cookies.set(
    "impersonationToken",
    input.impersonationToken,
    cookieOptions(true)
  );

  res.cookies.set("role", input.role, cookieOptions(false));

  if (input.staffType) {
    res.cookies.set("staffType", input.staffType, cookieOptions(false));
  } else {
    expireCookie(res, "staffType", false);
  }

  res.cookies.set(
    "impersonationRole",
    input.targetEffectiveRole,
    cookieOptions(false)
  );
  res.cookies.set(
    "originalTargetRole",
    input.targetEffectiveRole,
    cookieOptions(false)
  );
  res.cookies.set("impersonationSourceRole", "admin", cookieOptions(false));
  res.cookies.set("impersonatedByAdmin", "true", cookieOptions(false));
  res.cookies.set("hasPaid", String(input.hasPaid), cookieOptions(false));
  res.cookies.set("isTrial", String(input.isTrial), cookieOptions(false));

  if (input.isTrial && input.trialExpiresAt) {
    res.cookies.set(
      "trialExpiresAt",
      String(new Date(input.trialExpiresAt).getTime()),
      cookieOptions(false)
    );
  } else {
    expireCookie(res, "trialExpiresAt", false);
  }
}

export async function beginAdminCustomerSession(input: {
  adminUserId: string;
  adminToken: string;
  targetUserId: string;
}) {
  await connectDB();

  if (!process.env.JWT_SECRET) {
    return NextResponse.json(
      { success: false, error: "JWT_SECRET_MISSING" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const user: any = await User.findById(input.targetUserId)
    .select(
      "_id role staffType producerId assignedProducerId createdByProducer email name hasPaid isTrial trialExpiresAt authVersion isActive"
    )
    .lean();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "USER_NOT_FOUND" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const admin = await User.findById(input.adminUserId)
    .select("name email role")
    .lean();

  if (!admin || (admin as any).role !== "admin") {
    return NextResponse.json(
      { success: false, error: "FORBIDDEN" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const targetEffectiveRole = resolveTargetEffectiveRole(user);
  const redirectUrl = resolveCustomerRedirectUrl(targetEffectiveRole);
  const role = normalizeRole(user.role) || "user";
  const staffType = user.staffType ? String(user.staffType) : null;
  const hasPaid = user.hasPaid ?? true;
  const isTrial = Boolean(user.isTrial);
  const targetAuthVersion = Number(user.authVersion ?? 0);

  const impersonationToken = jwt.sign(
    {
      userId: String(user._id),
      role,
      staffType,
      producerId: user.producerId ? String(user.producerId) : null,
      assignedProducerId: user.assignedProducerId
        ? String(user.assignedProducerId)
        : null,
      createdByProducer: user.createdByProducer ?? null,
      hasPaid,
      isTrial,
      trialExpiresAt: user.trialExpiresAt
        ? new Date(user.trialExpiresAt).getTime()
        : null,
      authVersion: Number.isFinite(targetAuthVersion) ? targetAuthVersion : 0,
      impersonated: true,
      impersonatedBy: input.adminUserId,
      impersonatedByAdmin: true,
      adminId: input.adminUserId,
      impersonationRole: targetEffectiveRole,
      originalTargetRole: targetEffectiveRole,
      impersonationSourceRole: "admin",
    },
    process.env.JWT_SECRET,
    { expiresIn: SESSION_EXPIRES_IN }
  );

  const event = await Event.findOne({ userId: user._id, status: "active" })
    .sort({ date: -1 })
    .select("_id title")
    .lean();

  const invitations = await Invitation.find({
    $or: [{ userId: user._id }, { ownerId: user._id }],
  })
    .select("_id shareId title eventId")
    .lean();

  const invitation =
    pickPrimaryInvitation(invitations as any[]) || invitations[0] || null;

  await writeAdminAuditLog({
    adminUserId: String(input.adminUserId),
    adminName: cleanStr((admin as any).name),
    adminEmail: cleanStr((admin as any).email),
    managedUserId: String(user._id),
    managedUserName: cleanStr(user.name),
    managedUserEmail: cleanStr(user.email),
    eventId: event ? String((event as any)._id) : null,
    invitationId: invitation ? String((invitation as any)._id) : null,
    action: "admin_manage_start",
    summary: `אדמין נכנס לחשבון של ${user.name || user.email || user._id}`,
  });

  const res = NextResponse.json(
    {
      success: true,
      role,
      staffType,
      impersonated: true,
      impersonatedByAdmin: true,
      impersonationRole: targetEffectiveRole,
      originalTargetRole: targetEffectiveRole,
      impersonationSourceRole: "admin",
      redirectUrl,
      redirectTo: redirectUrl,
      impersonatedBy: input.adminUserId,
      managedUser: {
        _id: String(user._id),
        name: user.name || "",
        email: user.email || "",
      },
      eventId: event ? String((event as any)._id) : null,
      invitationId: invitation ? String((invitation as any)._id) : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );

  applyAdminCustomerSessionCookies(res, {
    adminToken: input.adminToken,
    impersonationToken,
    role,
    staffType,
    targetEffectiveRole,
    hasPaid,
    isTrial,
    trialExpiresAt: user.trialExpiresAt || null,
  });

  return res;
}
