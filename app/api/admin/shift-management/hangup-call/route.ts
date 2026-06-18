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
  [key: string]: unknown;
};

type MongoCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseAdminHangupCallCache: MongoCache | undefined;
}

const cached: MongoCache =
  global.mongooseAdminHangupCallCache ||
  (global.mongooseAdminHangupCallCache = {
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

async function getCurrentAdmin(req: NextRequest) {
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

    await connectMongo();

    const userId = getUserId(decoded);
    const email = cleanStr(decoded.email).toLowerCase();

    const orQuery: Record<string, unknown>[] = [];

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      orQuery.push({ _id: new mongoose.Types.ObjectId(userId) });
    }

    if (userId) {
      orQuery.push({ id: userId });
      orQuery.push({ userId });
    }

    if (email) {
      orQuery.push({ email });
    }

    const userDoc = orQuery.length
      ? await mongoose.connection.collection("users").findOne({ $or: orQuery })
      : null;

    const role = cleanStr(userDoc?.role || decoded.role).toLowerCase();
    const isAdmin =
      decoded.isAdmin === true ||
      role === "admin" ||
      role === "super_admin" ||
      role === "owner";

    if (!isAdmin) {
      return {
        ok: false as const,
        status: 403,
        error: "FORBIDDEN_ADMIN_ONLY",
      };
    }

    return {
      ok: true as const,
      admin: {
        id: cleanStr(userDoc?._id?.toString?.()) || userId || email,
        email: cleanStr(userDoc?.email) || email,
        role,
      },
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

function buildEmployeeMatchQuery(employeeId: string, employeeEmail: string) {
  const or: Record<string, unknown>[] = [];

  if (employeeId) {
    or.push({ agentId: employeeId });
    or.push({ employeeId });
    or.push({ staffId: employeeId });
    or.push({ userId: employeeId });

    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      const objectId = new mongoose.Types.ObjectId(employeeId);

      or.push({ agentId: objectId });
      or.push({ employeeId: objectId });
      or.push({ staffId: objectId });
      or.push({ userId: objectId });
    }
  }

  if (employeeEmail) {
    or.push({ agentEmail: employeeEmail });
    or.push({ employeeEmail });
    or.push({ staffEmail: employeeEmail });
  }

  return or.length ? { $or: or } : {};
}

async function markCallEnded({
  employeeId,
  employeeEmail,
  callControlId,
}: {
  employeeId: string;
  employeeEmail: string;
  callControlId: string;
}) {
  const now = new Date();

  const employeeQuery = buildEmployeeMatchQuery(employeeId, employeeEmail);

  await mongoose.connection.collection("softphonecalls").updateMany(
    {
      ...employeeQuery,
      $or: [
        { callControlId },
        { call_control_id: callControlId },
        { callLegId: callControlId },
        { call_leg_id: callControlId },
        { active: true },
        { isActive: true },
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
        lastSeenAt: now,
        endedByAdmin: true,
      },
    },
  );

  await mongoose.connection.collection("callrecordings").updateMany(
    {
      $or: [
        { callControlId },
        { call_control_id: callControlId },
        { callLegId: callControlId },
        { call_leg_id: callControlId },
      ],
    },
    {
      $set: {
        callStatus: "completed",
        endedAt: now,
        updatedAt: now,
        endedByAdmin: true,
      },
    },
  );

  await mongoose.connection.collection("softphonestatuses").updateOne(
    employeeQuery,
    {
      $set: {
        status: "busy",
        softphoneStatus: "busy",
        availabilityStatus: "busy",
        rawAgentStatus: "after_call",
        reason: "after_call",
        reasonLabel: "טיפול אחרי שיחה",
        currentCall: null,
        updatedAt: now,
        lastSeenAt: now,
        statusStartedAt: now,
        since: now,
        endedByAdmin: true,
      },
    },
  );
}

export async function POST(req: NextRequest) {
  try {
    const currentAdmin = await getCurrentAdmin(req);

    if (!currentAdmin.ok) {
      return jsonError(
        currentAdmin.error,
        currentAdmin.status,
        "details" in currentAdmin ? currentAdmin.details : undefined,
      );
    }

    const apiKey = process.env.TELNYX_API_KEY;

    if (!apiKey) {
      return jsonError("TELNYX_API_KEY is missing", 500);
    }

    const body = await req.json().catch(() => ({}));

    const employeeId = cleanStr(body?.employeeId);
    const employeeEmail = cleanStr(body?.employeeEmail).toLowerCase();
    const callControlId = cleanStr(body?.callControlId);

    if (!employeeId && !employeeEmail) {
      return jsonError("Missing employeeId or employeeEmail", 400);
    }

    if (!callControlId) {
      return jsonError("Missing callControlId", 400);
    }

    await connectMongo();

    const telnyxRes = await fetch(
      `https://api.telnyx.com/v2/calls/${encodeURIComponent(
        callControlId,
      )}/actions/hangup`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({}),
      },
    );

    const telnyxData = await telnyxRes.json().catch(() => null);

    if (!telnyxRes.ok) {
      console.error("TELNYX ADMIN HANGUP FAILED:", telnyxData);

      return jsonError("TELNYX_HANGUP_FAILED", telnyxRes.status, telnyxData);
    }

    await markCallEnded({
      employeeId,
      employeeEmail,
      callControlId,
    });

    return NextResponse.json({
      success: true,
      message: "CALL_HANGUP_SENT",
      callControlId,
      telnyx: telnyxData,
    });
  } catch (error) {
    console.error("ADMIN HANGUP CALL FAILED:", error);

    return jsonError(
      "ADMIN_HANGUP_CALL_FAILED",
      500,
      error instanceof Error ? error.message : error,
    );
  }
}