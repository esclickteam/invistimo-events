import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type JwtPayload = {
  userId?: string;
  id?: string;
  _id?: string;
  role?: string;
  email?: string;
  isAdmin?: boolean;
  effectiveRole?: string;
  [key: string]: unknown;
};

type MongoCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseAdminEndEmployeeShiftCache: MongoCache | undefined;
}

const cached: MongoCache =
  global.mongooseAdminEndEmployeeShiftCache ||
  (global.mongooseAdminEndEmployeeShiftCache = {
    conn: null,
    promise: null,
  });

async function connectMongo() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "";

  if (!uri) {
    throw new Error("Mongo connection string is missing");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      details,
    },
    { status },
  );
}

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization") || "";

  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }

  return "";
}

function getTokenFromCookies(req: NextRequest) {
  const names = [
    "token",
    "accessToken",
    "access_token",
    "authToken",
    "auth_token",
    "adminToken",
    "admin_token",
  ];

  for (const name of names) {
    const value = req.cookies.get(name)?.value;
    if (value) return value;
  }

  return "";
}

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ""
  );
}

function getUserId(decoded: JwtPayload) {
  return cleanStr(decoded.userId) || cleanStr(decoded.id) || cleanStr(decoded._id);
}

function toObjectId(value: unknown) {
  const clean = cleanStr(value);
  if (!clean || !mongoose.Types.ObjectId.isValid(clean)) return null;
  return new mongoose.Types.ObjectId(clean);
}

async function requireAdmin(req: NextRequest) {
  const token = getBearerToken(req) || getTokenFromCookies(req);

  if (!token) {
    return {
      ok: false as const,
      status: 401,
      error: "UNAUTHORIZED_NO_TOKEN",
    };
  }

  const secret = getJwtSecret();

  if (!secret) {
    return {
      ok: false as const,
      status: 500,
      error: "JWT_SECRET is missing",
    };
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    const role = cleanStr(decoded.effectiveRole || decoded.role).toLowerCase();

    if (decoded.isAdmin === true || role === "admin") {
      return {
        ok: true as const,
        adminId: getUserId(decoded),
        adminEmail: cleanStr(decoded.email),
      };
    }

    await connectMongo();

    const userId = getUserId(decoded);
    const email = cleanStr(decoded.email).toLowerCase();
    const or: Record<string, unknown>[] = [];

    const objectId = toObjectId(userId);
    if (objectId) or.push({ _id: objectId });
    if (userId) {
      or.push({ id: userId });
      or.push({ userId });
    }
    if (email) or.push({ email });

    const user = or.length
      ? await mongoose.connection.collection("users").findOne({ $or: or })
      : null;

    const userRole = cleanStr(user?.role).toLowerCase();

    if (userRole !== "admin" && user?.isAdmin !== true) {
      return {
        ok: false as const,
        status: 403,
        error: "FORBIDDEN_ADMIN_ONLY",
      };
    }

    return {
      ok: true as const,
      adminId: cleanStr(user?._id?.toString?.()) || userId,
      adminEmail: cleanStr(user?.email) || email,
    };
  } catch (error) {
    return {
      ok: false as const,
      status: 401,
      error: "UNAUTHORIZED_INVALID_TOKEN",
      details: error instanceof Error ? error.message : error,
    };
  }
}

async function collectionExists(name: string) {
  const db = mongoose.connection.db;
  if (!db) return false;

  const found = await db.listCollections({ name }).toArray();
  return found.length > 0;
}

async function getCollection(name: string) {
  if (!(await collectionExists(name))) return null;
  return mongoose.connection.collection(name);
}

async function closeOpenShiftSessions(params: {
  employeeId: string;
  employeeEmail: string;
  shiftSessionId: string;
  now: Date;
}) {
  const names = [
    "softphoneshiftsessions",
    "SoftphoneShiftSessions",
    "employeeshiftsessions",
    "EmployeeShiftSessions",
    "softphone_shift_sessions",
  ];

  for (const name of names) {
    const collection = await getCollection(name);
    if (!collection) continue;

    const employeeObjectId = toObjectId(params.employeeId);
    const shiftObjectId = toObjectId(params.shiftSessionId);

    const or: Record<string, unknown>[] = [];

    if (params.shiftSessionId) {
      or.push({ id: params.shiftSessionId });
      or.push({ _id: params.shiftSessionId });
    }

    if (shiftObjectId) {
      or.push({ _id: shiftObjectId });
    }

    if (params.employeeId) {
      or.push({ employeeId: params.employeeId });
      or.push({ staffId: params.employeeId });
      or.push({ userId: params.employeeId });
    }

    if (employeeObjectId) {
      or.push({ employeeId: employeeObjectId });
      or.push({ staffId: employeeObjectId });
      or.push({ userId: employeeObjectId });
    }

    if (params.employeeEmail) {
      or.push({ employeeEmail: params.employeeEmail });
      or.push({ staffEmail: params.employeeEmail });
      or.push({ email: params.employeeEmail });
    }

    if (!or.length) continue;

    await collection.updateMany(
      {
        $and: [
          { $or: or },
          {
            $or: [
              { status: "open" },
              { endedAt: null },
              { endedAt: { $exists: false } },
              { active: true },
              { isActive: true },
            ],
          },
        ],
      },
      {
        $set: {
          status: "closed",
          active: false,
          isActive: false,
          endedAt: params.now,
          updatedAt: params.now,
          endedBy: "admin",
          endReason: "admin_force_end_shift",
        },
      },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    if (!admin.ok) {
      return jsonError(
        admin.error,
        admin.status,
        "details" in admin ? admin.details : undefined,
      );
    }

    await connectMongo();

    const body = await req.json().catch(() => ({}));

    const employeeId = cleanStr(
      body?.employeeId || body?.agentId || body?.staffId || body?.userId,
    );
    const employeeEmail = cleanStr(body?.employeeEmail || body?.agentEmail || body?.email).toLowerCase();
    const shiftSessionId = cleanStr(body?.shiftSessionId);

    if (!employeeId && !employeeEmail) {
      return jsonError("MISSING_EMPLOYEE_ID_OR_EMAIL", 400);
    }

    const now = new Date();
    const employeeObjectId = toObjectId(employeeId);

    const employeeOr: Record<string, unknown>[] = [];

    if (employeeId) {
      employeeOr.push({ agentId: employeeId });
      employeeOr.push({ employeeId });
      employeeOr.push({ staffId: employeeId });
      employeeOr.push({ userId: employeeId });
    }

    if (employeeObjectId) {
      employeeOr.push({ agentId: employeeObjectId });
      employeeOr.push({ employeeId: employeeObjectId });
      employeeOr.push({ staffId: employeeObjectId });
      employeeOr.push({ userId: employeeObjectId });
    }

    if (employeeEmail) {
      employeeOr.push({ agentEmail: employeeEmail });
      employeeOr.push({ employeeEmail });
      employeeOr.push({ staffEmail: employeeEmail });
      employeeOr.push({ email: employeeEmail });
    }

    await mongoose.connection.collection("softphonestatuses").updateMany(
      { $or: employeeOr },
      {
        $set: {
          status: "offline",
          softphoneStatus: "offline",
          availabilityStatus: "offline",
          rawAgentStatus: "offline",
          reason: "admin_force_end_shift",
          reasonLabel: "הוצא ממשמרת על ידי אדמין",
          currentCall: null,
          shiftStarted: false,
          forceEndedAt: now,
          forceEndedByAdminId: admin.adminId,
          forceEndedByAdminEmail: admin.adminEmail,
          endedAt: now,
          endedBy: "admin",
          updatedAt: now,
          lastSeenAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    await mongoose.connection.collection("softphonecalls").updateMany(
      {
        $and: [
          { $or: employeeOr },
          {
            $or: [
              { active: true },
              { isActive: true },
              { source: "softphone-live-current" },
            ],
          },
        ],
      },
      {
        $set: {
          active: false,
          isActive: false,
          status: "completed",
          callStatus: "completed",
          endedAt: now,
          updatedAt: now,
          endedBy: "admin",
          endReason: "admin_force_end_shift",
        },
      },
    );

    await closeOpenShiftSessions({
      employeeId,
      employeeEmail,
      shiftSessionId,
      now,
    });

    return NextResponse.json({
      success: true,
      employeeId,
      employeeEmail,
      shiftSessionId,
      endedBy: "admin",
      endedAt: now,
    });
  } catch (error) {
    console.error("ADMIN END EMPLOYEE SHIFT FAILED:", error);

    return jsonError(
      "ADMIN_END_EMPLOYEE_SHIFT_FAILED",
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
