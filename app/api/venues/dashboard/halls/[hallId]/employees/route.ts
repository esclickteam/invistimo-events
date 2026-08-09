import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import VenueMembership from "@/models/VenueMembership";
import VenueEmployee from "@/models/VenueEmployee";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import { writeVenueAudit } from "@/lib/venues/audit";
import {
  VENUE_ROLES,
  isVenuePermission,
  isVenueRole,
  resolveVenuePermissions,
  type VenueRole,
} from "@/lib/venues/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ hallId: string }>;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function serializeMembership(m: any, user?: any, employee?: any) {
  const role: VenueRole = isVenueRole(m.role) ? m.role : "VIEWER";
  return {
    id: String(m._id),
    membershipId: String(m._id),
    userId: String(m.userId),
    venueId: m.venueId,
    role,
    permissions: resolveVenuePermissions(role, m.permissions),
    customPermissions: Array.isArray(m.permissions) ? m.permissions : [],
    status: m.status || "active",
    mustChangePassword: Boolean(m.mustChangePassword),
    lastLoginAt: m.lastLoginAt || null,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    name: user?.name || employee?.fullName || "",
    email: user?.email || employee?.email || "",
    phone: user?.phone || employee?.phone || "",
    isActiveUser: user ? user.isActive !== false : true,
    venueEmployeeId: employee ? String(employee._id) : null,
    jobTitle: employee?.jobTitle || "",
  };
}

/* ======================================================
   GET — list venue users (memberships) for this hall
====================================================== */
export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;

    const { ctx, error } = await requireVenueAccess(
      req,
      hallId,
      "employees.view"
    );
    if (error || !ctx) return error!;

    const memberships = await VenueMembership.find({
      venueId: ctx.venueId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const userIds = memberships.map((m: any) => m.userId);
    const users = await User.find({ _id: { $in: userIds } })
      .select("name email phone isActive venueUser employeeScope staffType role")
      .lean();
    const userMap = new Map(users.map((u: any) => [String(u._id), u]));

    const employees = await VenueEmployee.find({
      venueId: ctx.venueId,
      userId: { $in: userIds },
    }).lean();
    const empByUser = new Map(
      employees.map((e: any) => [String(e.userId), e])
    );

    return NextResponse.json({
      success: true,
      venueId: ctx.venueId,
      role: ctx.role,
      permissions: ctx.permissions,
      employees: memberships.map((m: any) =>
        serializeMembership(
          m,
          userMap.get(String(m.userId)),
          empByUser.get(String(m.userId))
        )
      ),
      roles: VENUE_ROLES,
    });
  } catch (error) {
    console.error("GET venue employees failed:", error);
    return NextResponse.json(
      { success: false, message: "טעינת עובדים נכשלה" },
      { status: 500 }
    );
  }
}

/* ======================================================
   POST — create venue user + membership (+ optional VenueEmployee link)
====================================================== */
export async function POST(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;

    const { ctx, error } = await requireVenueAccess(
      req,
      hallId,
      "employees.manage"
    );
    if (error || !ctx) return error!;

    const body = await req.json();
    const name = cleanString(body.name || body.fullName);
    const email = cleanString(body.email || body.username).toLowerCase();
    const phone = cleanString(body.phone);
    const password = String(body.password || "");
    const roleRaw = cleanString(body.role || "VIEWER");
    const role: VenueRole = isVenueRole(roleRaw) ? roleRaw : "VIEWER";
    const jobTitle = cleanString(body.jobTitle);
    const customPermissions = Array.isArray(body.permissions)
      ? body.permissions.filter(isVenuePermission)
      : [];
    const linkEmployeeId = cleanString(body.venueEmployeeId);
    const createEmployeeRecord = body.createEmployeeRecord !== false;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "חובה להזין שם מלא" },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, message: "חובה להזין אימייל או טלפון להתחברות" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "סיסמה חייבת להכיל לפחות 8 תווים" },
        { status: 400 }
      );
    }

    if (role === "OWNER" && ctx.role !== "OWNER" && !ctx.isAdmin) {
      return NextResponse.json(
        { success: false, message: "רק בעלים יכול ליצור בעלים נוסף" },
        { status: 403 }
      );
    }

    const loginEmail =
      email ||
      `venue-${ctx.venueId}-${Date.now()}@venue.invistimo.local`;

    const existing = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    }).select("+password name email phone role staffType employeeScope venueUser");

    let user: any = existing;

    if (user) {
      // Never turn Invistimo staff into venue users via this API
      if (
        user.role === "staff" ||
        user.role === "admin" ||
        (user.employeeScope && user.employeeScope !== "venue")
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "המשתמש כבר קיים כעובד Invistimo / אדמין. לא ניתן לשייך אותו כאן.",
          },
          { status: 409 }
        );
      }

      const existingMembership = await VenueMembership.findOne({
        userId: user._id,
        venueId: ctx.venueId,
      });

      if (existingMembership) {
        return NextResponse.json(
          {
            success: false,
            message: "למשתמש כבר יש גישה לאולם זה",
            membershipId: String(existingMembership._id),
          },
          { status: 409 }
        );
      }
    } else {
      const hashed = await bcrypt.hash(password, 12);
      user = await User.create({
        name,
        email: loginEmail,
        phone: phone || undefined,
        password: hashed,
        role: "user",
        venueUser: true,
        employeeScope: "venue",
        staffType: null,
        isActive: true,
        hasPaid: true,
        needsPasswordSetup: false,
        mustChangePassword: true,
        authVersion: 0,
        plan: "basic",
        guests: 0,
        maxGuests: 0,
        allowedMessageRounds: 2,
      });
    }

    const membership = await VenueMembership.create({
      userId: user._id,
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      role,
      permissions: customPermissions,
      status: "active",
      mustChangePassword: true,
      createdBy: ctx.auth.userId,
    });

    let employee: any = null;
    if (linkEmployeeId && mongoose.Types.ObjectId.isValid(linkEmployeeId)) {
      employee = await VenueEmployee.findOneAndUpdate(
        {
          _id: linkEmployeeId,
          venueId: ctx.venueId,
          ownerId: ctx.ownerId,
        },
        {
          $set: {
            userId: user._id,
            fullName: name,
            phone: phone || undefined,
            email: email || undefined,
            status: "active",
          },
        },
        { new: true }
      );
    } else if (createEmployeeRecord) {
      employee = await VenueEmployee.create({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        fullName: name,
        phone,
        email,
        jobTitle: jobTitle || (isVenueRole(role) ? role : ""),
        status: "active",
        userId: user._id,
        createdBy: ctx.auth.userId,
      });
    }

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "employees.create",
      targetType: "VenueMembership",
      targetId: String(membership._id),
      meta: { userId: String(user._id), role },
    });

    return NextResponse.json({
      success: true,
      message: "המשתמש נוצר בהצלחה",
      employee: serializeMembership(membership, user, employee),
      temporaryPasswordSet: true,
    });
  } catch (error: any) {
    console.error("POST venue employees failed:", error);
    if (error?.code === 11000) {
      return NextResponse.json(
        { success: false, message: "משתמש/הרשאה כבר קיימים" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: "יצירת משתמש נכשלה" },
      { status: 500 }
    );
  }
}

/* ======================================================
   PUT — update role / permissions / status / reset password
====================================================== */
export async function PUT(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;

    const { ctx, error } = await requireVenueAccess(
      req,
      hallId,
      "employees.manage"
    );
    if (error || !ctx) return error!;

    const body = await req.json();
    const membershipId = cleanString(body.membershipId || body.id);
    const action = cleanString(body.action || "update");

    if (!membershipId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה membership" },
        { status: 400 }
      );
    }

    const membership = await VenueMembership.findOne({
      _id: membershipId,
      venueId: ctx.venueId,
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, message: "החברות לא נמצאה" },
        { status: 404 }
      );
    }

    // Prevent locking out the last OWNER
    if (
      (action === "disable" ||
        action === "changeRole" ||
        body.status === "disabled" ||
        (body.role && body.role !== "OWNER")) &&
      membership.role === "OWNER"
    ) {
      const ownerCount = await VenueMembership.countDocuments({
        venueId: ctx.venueId,
        role: "OWNER",
        status: "active",
      });
      if (ownerCount <= 1 && String(membership.userId) === String(ctx.auth.userId)) {
        return NextResponse.json(
          {
            success: false,
            message: "לא ניתן לבטל/להוריד את הבעלים האחרון של האולם",
          },
          { status: 400 }
        );
      }
      if (
        ownerCount <= 1 &&
        (action === "disable" || body.status === "disabled" || body.role)
      ) {
        const nextRole = cleanString(body.role);
        if (
          action === "disable" ||
          body.status === "disabled" ||
          (nextRole && nextRole !== "OWNER")
        ) {
          return NextResponse.json(
            {
              success: false,
              message: "חייבים להשאיר לפחות בעלים אחד פעיל באולם",
            },
            { status: 400 }
          );
        }
      }
    }

    if (action === "disable") {
      membership.status = "disabled";
      await membership.save();
      await User.findByIdAndUpdate(membership.userId, {
        // Invalidate sessions without globally deactivating multi-venue users
        $inc: { authVersion: 1 },
      });
      await writeVenueAudit({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        actorUserId: ctx.auth.userId,
        action: "employees.disable",
        targetType: "VenueMembership",
        targetId: membershipId,
      });
      return NextResponse.json({
        success: true,
        message: "הגישה בוטלה",
        employee: serializeMembership(membership),
      });
    }

    if (action === "enable") {
      membership.status = "active";
      await membership.save();
      await writeVenueAudit({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        actorUserId: ctx.auth.userId,
        action: "employees.enable",
        targetType: "VenueMembership",
        targetId: membershipId,
      });
      return NextResponse.json({
        success: true,
        message: "הגישה שוחזרה",
        employee: serializeMembership(membership),
      });
    }

    if (action === "revoke") {
      membership.status = "disabled";
      membership.permissions = [];
      await membership.save();
      await User.findByIdAndUpdate(membership.userId, {
        $inc: { authVersion: 1 },
      });
      if (membership.employeeId) {
        try {
          const VenueEmployee = (await import("@/models/VenueEmployee")).default;
          await VenueEmployee.findOneAndUpdate(
            {
              _id: membership.employeeId,
              venueId: ctx.venueId,
            },
            { $set: { status: "inactive", hasLogin: false } }
          );
        } catch {
          /* best-effort */
        }
      }
      await writeVenueAudit({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        actorUserId: ctx.auth.userId,
        action: "employees.revoke",
        targetType: "VenueMembership",
        targetId: membershipId,
      });
      return NextResponse.json({
        success: true,
        message: "הגישה בוטלה לצמיתות (ניתן להפעיל מחדש ידנית)",
        employee: serializeMembership(membership),
      });
    }

    if (action === "resetPassword") {
      const password = String(body.password || "");
      if (password.length < 8) {
        return NextResponse.json(
          { success: false, message: "סיסמה חייבת להכיל לפחות 8 תווים" },
          { status: 400 }
        );
      }
      const hashed = await bcrypt.hash(password, 12);
      await User.findByIdAndUpdate(membership.userId, {
        $set: {
          password: hashed,
          mustChangePassword: true,
          needsPasswordSetup: false,
        },
        $inc: { authVersion: 1 },
      });
      membership.mustChangePassword = true;
      await membership.save();
      await writeVenueAudit({
        venueId: ctx.venueId,
        ownerId: ctx.ownerId,
        actorUserId: ctx.auth.userId,
        action: "employees.resetPassword",
        targetType: "VenueMembership",
        targetId: membershipId,
      });
      return NextResponse.json({
        success: true,
        message: "הסיסמה אופסה",
      });
    }

    if (body.role && isVenueRole(body.role)) {
      if (body.role === "OWNER" && ctx.role !== "OWNER" && !ctx.isAdmin) {
        return NextResponse.json(
          { success: false, message: "רק בעלים יכול למנות בעלים" },
          { status: 403 }
        );
      }
      membership.role = body.role;
    }

    if (Array.isArray(body.permissions)) {
      membership.permissions = body.permissions.filter(isVenuePermission);
    }

    if (body.status === "active" || body.status === "disabled") {
      membership.status = body.status;
    }

    await membership.save();

    if (body.name || body.phone || body.email) {
      const userPatch: any = {};
      if (body.name) userPatch.name = cleanString(body.name);
      if (body.phone) userPatch.phone = cleanString(body.phone);
      if (body.email) userPatch.email = cleanString(body.email).toLowerCase();
      if (Object.keys(userPatch).length) {
        await User.findByIdAndUpdate(membership.userId, { $set: userPatch });
      }
    }

    await writeVenueAudit({
      venueId: ctx.venueId,
      ownerId: ctx.ownerId,
      actorUserId: ctx.auth.userId,
      action: "employees.update",
      targetType: "VenueMembership",
      targetId: membershipId,
      meta: { role: membership.role, status: membership.status },
    });

    const user = await User.findById(membership.userId)
      .select("name email phone isActive")
      .lean();

    return NextResponse.json({
      success: true,
      message: "העובד עודכן",
      employee: serializeMembership(membership, user),
    });
  } catch (error) {
    console.error("PUT venue employees failed:", error);
    return NextResponse.json(
      { success: false, message: "עדכון עובד נכשל" },
      { status: 500 }
    );
  }
}
