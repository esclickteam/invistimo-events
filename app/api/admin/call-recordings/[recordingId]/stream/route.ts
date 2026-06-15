import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";
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

const globalCache = globalThis as typeof globalThis & {
  mongooseCallRecordingStreamCache?: MongoCache;
  invistimoR2Client?: S3Client;
};

const cached: MongoCache =
  globalCache.mongooseCallRecordingStreamCache ||
  (globalCache.mongooseCallRecordingStreamCache = {
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

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function getR2Endpoint() {
  const directEndpoint = cleanStr(process.env.R2_ENDPOINT);
  if (directEndpoint) return directEndpoint.replace(/\/+$/, "");

  const accountId = cleanStr(process.env.R2_ACCOUNT_ID);
  if (!accountId) return "";

  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function getR2Config() {
  const endpoint = getR2Endpoint();
  const bucket = cleanStr(process.env.R2_BUCKET_NAME);
  const accessKeyId = cleanStr(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = cleanStr(process.env.R2_SECRET_ACCESS_KEY);

  return {
    enabled: Boolean(endpoint && bucket && accessKeyId && secretAccessKey),
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}

function getR2Client() {
  if (globalCache.invistimoR2Client) {
    return globalCache.invistimoR2Client;
  }

  const config = getR2Config();

  if (!config.enabled) {
    throw new Error("R2 configuration is missing");
  }

  globalCache.invistimoR2Client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return globalCache.invistimoR2Client;
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

function getRecordingBucket(item: any) {
  return cleanStr(
    item?.recordingBucket || item?.bucket || process.env.R2_BUCKET_NAME
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

function inferContentTypeFromKey(key: string) {
  const lower = key.toLowerCase().split("?")[0];

  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".aac")) return "audio/aac";

  return "";
}

function normalizeContentType(value: unknown, key = "") {
  const contentType = cleanStr(value);

  if (
    contentType &&
    contentType !== "application/octet-stream" &&
    contentType !== "binary/octet-stream"
  ) {
    return contentType;
  }

  return inferContentTypeFromKey(key) || "audio/wav";
}

function getFilename(item: any) {
  const id = cleanStr(item?.recordingId) || String(item?._id || "recording");
  const key = getRecordingKey(item);

  let extension = "wav";

  const fromKey = key.split("?")[0].match(/\.([a-z0-9]{2,6})$/i)?.[1];
  if (fromKey) extension = fromKey.toLowerCase();

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

async function toWebResponseBody(body: any) {
  if (!body) return null;

  if (typeof body.transformToWebStream === "function") {
    return body.transformToWebStream();
  }

  if (body instanceof ReadableStream) {
    return body;
  }

  if (typeof body.transformToByteArray === "function") {
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (typeof body.pipe === "function") {
    return Readable.toWeb(body as Readable) as ReadableStream;
  }

  return body;
}

function buildAudioHeaders(params: {
  contentType: string;
  contentLength?: number;
  contentRange?: string;
  etag?: string;
  lastModified?: Date;
  filename: string;
  download: boolean;
}) {
  const headers = new Headers();

  headers.set("Content-Type", params.contentType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-Content-Type-Options", "nosniff");

  if (typeof params.contentLength === "number") {
    headers.set("Content-Length", String(params.contentLength));
  }

  if (params.contentRange) {
    headers.set("Content-Range", params.contentRange);
  }

  if (params.etag) {
    headers.set("ETag", params.etag);
  }

  if (params.lastModified) {
    headers.set("Last-Modified", params.lastModified.toUTCString());
  }

  headers.set(
    "Content-Disposition",
    `${params.download ? "attachment" : "inline"}; filename="${params.filename}"`
  );

  return headers;
}

async function streamFromR2(req: NextRequest, recording: any) {
  const key = getRecordingKey(recording);
  const bucket = getRecordingBucket(recording);

  if (!key || !bucket) {
    return jsonError("CALL_RECORDING_R2_KEY_OR_BUCKET_MISSING", 404, {
      key,
      bucket,
    });
  }

  const range = req.headers.get("range") || undefined;

  try {
    const client = getR2Client();

    const result = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: range,
      })
    );

    const body = await toWebResponseBody(result.Body);

    if (!body) {
      return jsonError("CALL_RECORDING_R2_BODY_EMPTY", 404);
    }

    const shouldDownload =
      req.nextUrl.searchParams.get("download") === "1" ||
      req.nextUrl.searchParams.get("download") === "true";

    const contentType = normalizeContentType(
      result.ContentType || recording.recordingContentType,
      key
    );

    const headers = buildAudioHeaders({
      contentType,
      contentLength: result.ContentLength,
      contentRange: result.ContentRange,
      etag: result.ETag,
      lastModified: result.LastModified,
      filename: getFilename(recording),
      download: shouldDownload,
    });

    return new NextResponse(body, {
      status: result.ContentRange || range ? 206 : 200,
      headers,
    });
  } catch (error: any) {
    console.error("STREAM RECORDING FROM R2 FAILED:", {
      message: error?.message,
      name: error?.name,
      code: error?.Code,
      key,
      bucket,
    });

    return jsonError("CALL_RECORDING_R2_STREAM_FAILED", 500, {
      message: error?.message,
      name: error?.name,
      code: error?.Code,
      key,
      bucket,
    });
  }
}

async function streamFromLegacyUrl(req: NextRequest, recording: any) {
  const legacyUrl = getLegacyRecordingUrl(recording);

  if (!legacyUrl) {
    return jsonError("CALL_RECORDING_FILE_URL_MISSING", 404);
  }

  const range = req.headers.get("range");

  const upstream = await fetch(legacyUrl, {
    method: "GET",
    headers: range ? { Range: range } : {},
    cache: "no-store",
    redirect: "follow",
  });

  if (!upstream.ok && upstream.status !== 206) {
    const details = await upstream.text().catch(() => "");

    if (upstream.status === 401 || upstream.status === 403) {
      return jsonError("CALL_RECORDING_SOURCE_URL_EXPIRED_OR_FORBIDDEN", 410, {
        status: upstream.status,
        hint:
          "הקישור הישן של Telnyx פג תוקף. הקלטות ישנות יעבדו רק אם יש להן recordingKey ב-R2.",
        details: details.slice(0, 1000),
      });
    }

    return jsonError("CALL_RECORDING_SOURCE_FETCH_FAILED", upstream.status, {
      status: upstream.status,
      details: details.slice(0, 1000),
    });
  }

  const shouldDownload =
    req.nextUrl.searchParams.get("download") === "1" ||
    req.nextUrl.searchParams.get("download") === "true";

  const contentType = normalizeContentType(
    upstream.headers.get("content-type") || recording.recordingContentType,
    getRecordingKey(recording) || legacyUrl
  );

  const headers = new Headers();

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

  headers.set(
    "Content-Disposition",
    `${shouldDownload ? "attachment" : "inline"}; filename="${getFilename(
      recording
    )}"`
  );

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
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

    const recordingKey = getRecordingKey(recording);

    if (recordingKey) {
      return streamFromR2(req, recording);
    }

    return streamFromLegacyUrl(req, recording);
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