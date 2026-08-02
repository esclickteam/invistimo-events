import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/* =========================================================
   Helpers
========================================================= */
function getCookieFromReq(req: Request, name: string) {
  try {
    const cookieHeader = req.headers.get("cookie");
    if (!cookieHeader) return "";

    const found = cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${name}=`));

    if (!found) return "";

    return decodeURIComponent(found.split("=").slice(1).join("="));
  } catch {
    return "";
  }
}

function getUserIdFromToken(token: string) {
  try {
    if (!token || !process.env.JWT_SECRET) return "";

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    return String(decoded?.userId || decoded?.id || decoded?._id || "");
  } catch {
    return "";
  }
}

async function isUserAdmin(userId: unknown) {
  const id = String(userId || "").trim();

  if (!id) return false;

  try {
    const admin = await User.findOne({
      _id: id,
      role: "admin",
    })
      .select("_id role")
      .lean();

    return Boolean(admin);
  } catch {
    return false;
  }
}

async function isAdminContext(req: Request, auth: any) {
  if (!auth) return false;

  if (auth?.role === "admin" || auth?.impersonationRole === "admin") {
    return true;
  }

  if (auth?.impersonatedBy) {
    const originalUserIsAdmin = await isUserAdmin(auth.impersonatedBy);

    if (originalUserIsAdmin) return true;
  }

  const staffOriginalUserId = getCookieFromReq(req, "staffOriginalUserId");
  const authToken = getCookieFromReq(req, "authToken");

  const authTokenUserId = getUserIdFromToken(authToken);

  const possibleOriginalAdminIds = [
    staffOriginalUserId,
    authTokenUserId,
  ].filter(Boolean);

  for (const id of possibleOriginalAdminIds) {
    const originalUserIsAdmin = await isUserAdmin(id);

    if (originalUserIsAdmin) return true;
  }

  return false;
}

function isActiveUser(user: any) {
  return user?.isActive !== false;
}

function isProducerUser(user: any) {
  return (
    user?.role === "producer" ||
    user?.producerAccess === true ||
    user?.isProducer === true ||
    user?.userType === "producer"
  );
}

function isStaffUser(user: any) {
  const staffType = String(user?.staffType || "").trim();

  return (
    user?.role === "staff" ||
    user?.role === "employee" ||
    [
      "general_staff",
      "producer_staff",
      "seating_staff",
      "usher_staff",
    ].includes(staffType) ||
    Boolean(user?.employeeScope)
  );
}

/* =========================================================
   GET – ASSIGNEES (PRODUCERS + STAFF)
========================================================= */
export async function GET(req: Request) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const allowed = await isAdminContext(req, auth);

    if (!allowed) {
      console.log("❌ ASSIGNEES FORBIDDEN AUTH:", {
        userId: auth?.userId,
        role: auth?.role,
        impersonated: auth?.impersonated,
        impersonatedBy: auth?.impersonatedBy,
        impersonationRole: auth?.impersonationRole,
        hasAuthToken: Boolean(getCookieFromReq(req, "authToken")),
        hasImpersonationToken: Boolean(
          getCookieFromReq(req, "impersonationToken")
        ),
        staffOriginalUserId: getCookieFromReq(req, "staffOriginalUserId"),
      });

      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          debug: {
            role: auth?.role,
            impersonated: auth?.impersonated,
            impersonatedBy: auth?.impersonatedBy,
            impersonationRole: auth?.impersonationRole,
          },
        },
        { status: 403 }
      );
    }

    const users = await User.find({
      $or: [
        { role: { $in: ["producer", "staff", "employee"] } },
        { producerAccess: true },
        { isProducer: true },
        { userType: "producer" },
        {
          staffType: {
            $in: [
              "general_staff",
              "producer_staff",
              "seating_staff",
              "usher_staff",
            ],
          },
        },
        { staffType: { $exists: true, $ne: "" } },
        { employeeScope: { $exists: true, $ne: "" } },
      ],
    })
      .select(
        "name email role userType producerAccess isProducer staffType employeeScope assignedProducerId assignedClientIds isActive"
      )
      .sort({ name: 1, email: 1 })
      .lean();

    /*
      מפיקים תמיד מוצגים לבחירת "מפיק מטפל", גם אם isActive=false.
      isActive אצל מפיקים לא תמיד מסונכרן (ברירת מחדל false במודל),
      ולכן סינון לפיו השאיר מפיקים חסרים ברשימה.
      עובדים עדיין מסוננים לפי isActive.
    */
    const producers = users.filter(isProducerUser);

    const staff = users.filter((user: any) => {
      if (isProducerUser(user)) return false;
      if (!isActiveUser(user)) return false;
      return isStaffUser(user);
    });

    console.log("✅ ASSIGNEES RESULT:", {
      totalUsers: users.length,
      producers: producers.length,
      staff: staff.length,
    });

    return NextResponse.json(
      {
        success: true,
        producers,
        staff,
        counts: {
          totalUsers: users.length,
          producers: producers.length,
          staff: staff.length,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("❌ ASSIGNEES GET ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
