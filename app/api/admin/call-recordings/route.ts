import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import CallRecording from "@/models/CallRecording";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JwtPayload = {
  userId?: string;
  id?: string;
  role?: string;
  email?: string;
  isAdmin?: boolean;
  isSystemStaff?: boolean;
  effectiveRole?: string;
  [key: string]: unknown;
};

type MongoCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCallRecordingsCache: MongoCache | undefined;
}

const cached: MongoCache =
  global.mongooseCallRecordingsCache ||
  (global.mongooseCallRecordingsCache = {
    conn: null,
    promise: null,
  });

async function connectMongo() {
  if (cached.conn) return cached.conn;

  // ✅ תומך גם בשם שיש לך עכשיו ב-Vercel וגם בשם הסטנדרטי
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    throw new Error("Mongo connection string is missing. Please set MONGODB_URI or MONGO_URI.");
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
    { status }
  );
}

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";

  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return "";
}

function getTokenFromCookies(req: NextRequest) {
  const possibleCookieNames = [
    "token",
    "accessToken",
    "access_token",
    "authToken",
    "auth_token",
    "adminToken",
    "admin_token",
  ];

  for (const name of possibleCookieNames) {
    const value = req.cookies.get(name)?.value;
    if (value) return value;
  }

  return "";
}

async function verifyAdmin(req: NextRequest) {
  const token = getBearerToken(req) || getTokenFromCookies(req);

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "UNAUTHORIZED_NO_TOKEN",
    };
  }

  const secret =
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "";

  if (!secret) {
    return {
      ok: false,
      status: 500,
      error: "JWT_SECRET is missing",
    };
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const role = String(decoded.role || "");
    const effectiveRole = String(decoded.effectiveRole || "");

    const isAdmin =
      decoded.isAdmin === true ||
      role === "admin" ||
      role === "super_admin" ||
      effectiveRole === "admin" ||
      effectiveRole === "super_admin";

    const isSystemStaff =
      decoded.isSystemStaff === true ||
      effectiveRole === "system_staff" ||
      role === "system_staff";

    if (!isAdmin && !isSystemStaff) {
      return {
        ok: false,
        status: 403,
        error: "FORBIDDEN_ADMIN_ONLY",
      };
    }

    return {
      ok: true,
      user: decoded,
    };
  } catch (error) {
    return {
      ok: false,
      status: 401,
      error: "UNAUTHORIZED_INVALID_TOKEN",
      details: error instanceof Error ? error.message : error,
    };
  }
}

function toNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeDirection(value: string | null) {
  if (value === "inbound" || value === "outbound" || value === "unknown") {
    return value;
  }

  return "";
}

function buildDateFilter(fromDate: string | null, toDate: string | null) {
  const filter: Record<string, Date> = {};

  if (fromDate) {
    const from = new Date(fromDate);
    if (!Number.isNaN(from.getTime())) {
      filter.$gte = from;
    }
  }

  if (toDate) {
    const to = new Date(toDate);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      filter.$lte = to;
    }
  }

  return Object.keys(filter).length ? filter : null;
}

function safeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);

    if (!admin.ok) {
      return jsonError(
        admin.error || "UNAUTHORIZED",
        admin.status || 401,
        admin.details
      );
    }

    await connectMongo();

    const { searchParams } = new URL(req.url);

    const page = Math.max(1, toNumber(searchParams.get("page"), 1));
    const limit = Math.min(
      100,
      Math.max(1, toNumber(searchParams.get("limit"), 25))
    );
    const skip = (page - 1) * limit;

    const search = (searchParams.get("search") || "").trim();
    const direction = normalizeDirection(searchParams.get("direction"));
    const status = (searchParams.get("status") || "").trim();
    const agentId = (searchParams.get("agentId") || "").trim();
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const query: Record<string, unknown> = {};

    if (direction) {
      query.direction = direction;
    }

    if (status) {
      query.recordingStatus = status;
    }

    if (agentId) {
      query.agentId = agentId;
    }

    const dateFilter = buildDateFilter(fromDate, toDate);

    if (dateFilter) {
      query.createdAt = dateFilter;
    }

    if (search) {
      const regex = new RegExp(safeRegex(search), "i");

      query.$or = [
        { from: regex },
        { to: regex },
        { customerPhone: regex },
        { customerName: regex },
        { agentName: regex },
        { agentEmail: regex },
        { recordingId: regex },
        { callSessionId: regex },
        { callControlId: regex },
      ];
    }

    const [items, total] = await Promise.all([
      CallRecording.find(query)
        .sort({ recordedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CallRecording.countDocuments(query),
    ]);

    const recordings = items.map((item: any) => {
      const recordingUrl =
        item.recordingUrl ||
        item.recordingUrls?.mp3 ||
        item.recordingUrls?.wav ||
        item.recordingUrls?.raw ||
        "";

      return {
        id: String(item._id),
        eventId: item.eventId || "",

        callControlId: item.callControlId || "",
        callLegId: item.callLegId || "",
        callSessionId: item.callSessionId || "",
        connectionId: item.connectionId || "",

        recordingId: item.recordingId || "",
        recordingStatus: item.recordingStatus || "saved",
        recordingUrl,
        recordingUrls: item.recordingUrls || {},

        from: item.from || "",
        to: item.to || "",
        direction: item.direction || "unknown",

        agentId: item.agentId || "",
        agentName: item.agentName || "",
        agentEmail: item.agentEmail || "",

        customerId: item.customerId || "",
        customerName: item.customerName || "",
        customerPhone: item.customerPhone || "",

        startedAt: item.startedAt || null,
        endedAt: item.endedAt || null,
        recordedAt: item.recordedAt || item.createdAt || null,
        durationSeconds: item.durationSeconds || 0,

        provider: item.provider || "telnyx",
        source: item.source || "webhook",

        createdAt: item.createdAt || null,
        updatedAt: item.updatedAt || null,
      };
    });

    return NextResponse.json({
      success: true,
      recordings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("ADMIN GET CALL RECORDINGS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "ADMIN_GET_CALL_RECORDINGS_FAILED",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}