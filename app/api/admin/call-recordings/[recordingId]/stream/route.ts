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

type RouteContext = {
  params:
    | {
        recordingId?: string;
      }
    | Promise<{
        recordingId?: string;
      }>;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCallRecordingStreamCache: MongoCache | undefined;
}

const cached: MongoCache =
  global.mongooseCallRecordingStreamCache ||
  (global.mongooseCallRecordingStreamCache = {
    conn: null,
    promise: null,
  });

async function connectMongo() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    throw new Error(
      "Mongo connection string is missing. Please set MONGODB_URI or MONGO_URI."
    );
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

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function encodeStorageKey(key: string) {
  return key
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function joinUrl(base: string, key: string) {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanKey = encodeStorageKey(key.replace(/^\/+/, ""));

  return `${cleanBase}/${cleanKey}`;
}

function getRecordingKey(item: any) {
  return cleanStr(
    item?.recordingKey ||
      item?.storageKey ||
      item?.key ||
      item?.fileKey ||
      item?.recordingObjectKey
  );
}

function getPermanentBaseUrl() {
  return cleanStr(
    process.env.RECORDINGS_PUBLIC_BASE_URL ||
      process.env.RECORDINGS_BASE_URL ||
      process.env.CALL_RECORDINGS_PUBLIC_BASE_URL ||
      process.env.CALL_RECORDINGS_BASE_URL ||
      process.env.R2_PUBLIC_BASE_URL ||
      process.env.S3_PUBLIC_BASE_URL
  );
}

function getLegacyRecordingUrl(item: any) {
  return cleanStr(
    item?.recordingUrl ||
      item?.recordingUrls?.mp3 ||
      item?.recordingUrls?.wav ||
      item?.recordingUrls?.raw ||
      item?.downloadUrl ||
      item?.mediaUrl ||
      item?.url
  );
}

function getPermanentRecordingUrl(item: any) {
  return cleanStr(
    item?.permanentRecordingUrl ||
      item?.recordingPermanentUrl ||
      item?.recordingFileUrl ||
      item?.storageUrl ||
      item?.publicUrl ||
      item?.fileUrl
  );
}

function getRecordingSourceUrl(item: any) {
  const permanentUrl = getPermanentRecordingUrl(item);
  if (permanentUrl) {
    return {
      url: permanentUrl,
      source: "permanent_url",
    };
  }

  const recordingKey = getRecordingKey(item);
  const permanentBaseUrl = getPermanentBaseUrl();

  if (recordingKey && permanentBaseUrl) {
    return {
      url: joinUrl(permanentBaseUrl, recordingKey),
      source: "storage_key",
    };
  }

  const legacyUrl = getLegacyRecordingUrl(item);

  if (legacyUrl) {
    return {
      url: legacyUrl,
      source: "legacy_url",
    };
  }

  return {
    url: "",
    source: "none",
  };
}

function getFilename(item: any) {
  const id = cleanStr(item?.recordingId) || String(item?._id || "recording");
  const contentType = cleanStr(item?.recordingContentType || item?.contentType);

  let extension = "mp3";

  if (contentType.includes("wav")) extension = "wav";
  if (contentType.includes("webm")) extension = "webm";
  if (contentType.includes("ogg")) extension = "ogg";
  if (contentType.includes("mpeg")) extension = "mp3";

  return `call-recording-${id}.${extension}`.replace(/[\\/:*?"<>|]/g, "-");
}

async function findRecording(rawRecordingId: string) {
  const decodedRecordingId = decodeURIComponent(rawRecordingId || "").trim();

  if (!decodedRecordingId) return null;

  const orQuery: Record<string, unknown>[] = [
    { recordingId: decodedRecordingId },
    { callRecordingId: decodedRecordingId },
    { callControlId: decodedRecordingId },
    { callSessionId: decodedRecordingId },
    { callLegId: decodedRecordingId },
  ];

  if (mongoose.Types.ObjectId.isValid(decodedRecordingId)) {
    orQuery.unshift({ _id: new mongoose.Types.ObjectId(decodedRecordingId) });
  }

  return CallRecording.findOne({ $or: orQuery }).lean();
}

function copyAudioHeaders(upstream: Response, fallbackContentType: string) {
  const headers = new Headers();

  const contentType =
    upstream.headers.get("content-type") || fallbackContentType || "audio/mpeg";

  headers.set("Content-Type", contentType);
  headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-Content-Type-Options", "nosniff");

  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  const etag = upstream.headers.get("etag");
  const lastModified = upstream.headers.get("last-modified");

  if (contentLength) headers.set("Content-Length", contentLength);
  if (contentRange) headers.set("Content-Range", contentRange);
  if (etag) headers.set("ETag", etag);
  if (lastModified) headers.set("Last-Modified", lastModified);

  return headers;
}

function buildUpstreamHeaders(req: NextRequest) {
  const headers = new Headers();

  const range = req.headers.get("range");
  const ifRange = req.headers.get("if-range");
  const userAgent = req.headers.get("user-agent");

  if (range) headers.set("Range", range);
  if (ifRange) headers.set("If-Range", ifRange);
  if (userAgent) headers.set("User-Agent", userAgent);

  return headers;
}

export async function GET(req: NextRequest, context: RouteContext) {
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

    const params = await context.params;
    const rawRecordingId = cleanStr(params?.recordingId);
    const recording = await findRecording(rawRecordingId);

    if (!recording) {
      return jsonError("CALL_RECORDING_NOT_FOUND", 404, {
        recordingId: rawRecordingId,
      });
    }

    const source = getRecordingSourceUrl(recording);

    if (!source.url) {
      return jsonError("CALL_RECORDING_FILE_URL_MISSING", 404, {
        recordingId: rawRecordingId,
      });
    }

    const fallbackContentType =
      cleanStr(
        (recording as any).recordingContentType || (recording as any).contentType
      ) || "audio/mpeg";

    const upstream = await fetch(source.url, {
      method: "GET",
      headers: buildUpstreamHeaders(req),
      cache: "no-store",
      redirect: "follow",
    });

    if (!upstream.ok && upstream.status !== 206) {
      const details = await upstream.text().catch(() => "");

      if (upstream.status === 403 || upstream.status === 401) {
        return jsonError("CALL_RECORDING_SOURCE_URL_EXPIRED_OR_FORBIDDEN", 410, {
          status: upstream.status,
          source: source.source,
          hint:
            "הקישור הישן של ההקלטה פג תוקף. כדי שזה יעבוד קבוע צריך לשמור את הקובץ באחסון קבוע ולשמור recordingKey במונגו.",
          details: details.slice(0, 1000),
        });
      }

      return jsonError("CALL_RECORDING_SOURCE_FETCH_FAILED", upstream.status, {
        status: upstream.status,
        source: source.source,
        details: details.slice(0, 1000),
      });
    }

    const responseHeaders = copyAudioHeaders(upstream, fallbackContentType);
    const shouldDownload =
      req.nextUrl.searchParams.get("download") === "1" ||
      req.nextUrl.searchParams.get("download") === "true";

    if (shouldDownload) {
      responseHeaders.set(
        "Content-Disposition",
        `attachment; filename="${getFilename(recording)}"`
      );
    } else {
      responseHeaders.set(
        "Content-Disposition",
        `inline; filename="${getFilename(recording)}"`
      );
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("ADMIN STREAM CALL RECORDING ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "ADMIN_STREAM_CALL_RECORDING_FAILED",
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}