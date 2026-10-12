import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import WebPushSubscription from "@/models/WebPushSubscription";
import { isWebPushConfigured } from "@/lib/push/webPush";
import {
  platformFromUserAgent,
  platformLabel,
} from "@/lib/customerNotifications/planners";

export const dynamic = "force-dynamic";

function userId(auth: { userId: string }) {
  return auth.userId;
}

function toObjectId(value: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function validEndpoint(value: unknown) {
  const endpoint = String(value || "").trim();
  if (!endpoint.startsWith("https://") || endpoint.length > 2000) return "";
  return endpoint;
}

export async function GET(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  await dbConnect();
  const id = toObjectId(userId(auth));
  if (!id) return NextResponse.json({ success: false }, { status: 400 });
  const rows = await WebPushSubscription.find({ userId: id, disabledAt: null })
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json({
    success: true,
    configured: isWebPushConfigured(),
    subscriptions: rows.map((row) => ({
      id: String(row._id),
      endpoint: row.endpoint,
      platform: row.platform,
      label: row.label || platformLabel(row.platform),
      createdAt: new Date(row.createdAt).toISOString(),
      lastSuccessAt: row.lastSuccessAt ? new Date(row.lastSuccessAt).toISOString() : null,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  if (!isWebPushConfigured()) {
    return NextResponse.json({ success: false, error: "PUSH_NOT_CONFIGURED" }, { status: 503 });
  }
  const body = await request.json().catch(() => null);
  const endpoint = validEndpoint(body?.endpoint);
  const p256dh = String(body?.keys?.p256dh || "").trim();
  const authKey = String(body?.keys?.auth || "").trim();
  if (!endpoint || !p256dh || !authKey || p256dh.length > 300 || authKey.length > 300) {
    return NextResponse.json({ success: false, error: "BAD_SUBSCRIPTION" }, { status: 400 });
  }
  await dbConnect();
  const id = toObjectId(userId(auth));
  if (!id) return NextResponse.json({ success: false }, { status: 400 });
  const userAgent = String(request.headers.get("user-agent") || "").slice(0, 300);
  const platform = platformFromUserAgent(userAgent);
  const expiration = body?.expirationTime ? new Date(body.expirationTime) : null;
  await WebPushSubscription.findOneAndUpdate(
    { endpoint },
    {
      $set: {
        userId: id,
        endpoint,
        p256dh,
        auth: authKey,
        expirationTime: expiration && !Number.isNaN(expiration.getTime()) ? expiration : null,
        platform,
        label: platformLabel(platform),
        userAgent,
        disabledAt: null,
        failureCount: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const auth = await getUserIdFromRequest(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const body = await request.json().catch(() => null);
  await dbConnect();
  const id = toObjectId(userId(auth));
  if (!id) return NextResponse.json({ success: false }, { status: 400 });
  const endpoint = validEndpoint(body?.endpoint);
  const subscriptionId = body?.id ? toObjectId(String(body.id)) : null;
  const filter: Record<string, unknown> = { userId: id };
  if (endpoint) filter.endpoint = endpoint;
  else if (subscriptionId) filter._id = subscriptionId;
  else return NextResponse.json({ success: false, error: "BAD_SUBSCRIPTION" }, { status: 400 });
  const result = await WebPushSubscription.deleteOne(filter);
  return NextResponse.json({ success: true, removed: result.deletedCount || 0 });
}
