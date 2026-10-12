import mongoose from "mongoose";
import CustomerNotification from "@/models/CustomerNotification";
import { VENUE_SEATING_NOTIFICATION_CATEGORY } from "@/lib/venueSeatingContacts/logic";
import { deliverWebPushForNotification } from "@/lib/push/webPush";
import { safeActionPath } from "@/lib/customerNotifications/planners";

export type CreateCustomerNotificationInput = {
  userId: string;
  eventId?: string | null;
  customerId?: string | null;
  type: string;
  category: string;
  severity: "info" | "important" | "urgent";
  title: string;
  body: string;
  actionHref?: string;
  dedupeKey: string;
  audience?: "customer" | "admin";
  meta?: Record<string, unknown>;
};

function toObjectId(value: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

export async function createCustomerNotification(
  input: CreateCustomerNotificationInput
) {
  const userId = toObjectId(input.userId);
  if (!userId) return { created: false as const, reason: "BAD_USER" };
  const eventId = input.eventId ? toObjectId(input.eventId) : null;
  const customerId = input.customerId ? toObjectId(input.customerId) : null;
  const audience = input.audience === "admin" ? "admin" : "customer";

  try {
    const existing = await CustomerNotification.findOne({
      dedupeKey: input.dedupeKey,
    })
      .select("_id status")
      .lean();
    if (existing) return { created: false as const, reason: "DUPLICATE" };

    const doc = await CustomerNotification.create({
      userId,
      eventId,
      customerId,
      audience,
      type: input.type,
      category: input.category,
      severity: input.severity,
      title: input.title,
      body: input.body,
      actionHref: safeActionPath(input.actionHref || "", audience === "admin" ? "/admin" : "/dashboard"),
      status: "active",
      readAt: null,
      resolvedAt: null,
      pushClaimedAt: null,
      dedupeKey: input.dedupeKey,
      meta: input.meta,
    });
    try {
      await deliverWebPushForNotification(String(doc._id));
    } catch (error) {
      console.error("web push delivery failed", error);
    }
    return { created: true as const, id: String(doc._id) };
  } catch (error: unknown) {
    const code = (error as { code?: number })?.code;
    if (code === 11000) return { created: false as const, reason: "DUPLICATE" };
    throw error;
  }
}

export async function listActiveCustomerNotifications(userId: string) {
  const id = toObjectId(userId);
  if (!id) return [];
  const rows = await CustomerNotification.find({
    userId: id,
    status: "active",
    audience: { $ne: "admin" },
  })
    .sort({ readAt: 1, createdAt: -1 })
    .limit(80)
    .lean();

  return rows.map((row) => ({
    id: String(row._id),
    eventId: row.eventId ? String(row.eventId) : null,
    type: row.type,
    category: row.category,
    severity: row.severity,
    title: row.title,
    body: row.body,
    actionHref: row.actionHref || "",
    read: Boolean(row.readAt),
    readAt: row.readAt ? new Date(row.readAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}

export async function countUnreadCustomerNotifications(userId: string) {
  const id = toObjectId(userId);
  if (!id) return 0;
  return CustomerNotification.countDocuments({
    userId: id,
    status: "active",
    audience: { $ne: "admin" },
    readAt: null,
  });
}

export async function listActiveAdminNotifications(userId: string) {
  const id = toObjectId(userId);
  if (!id) return [];
  const rows = await CustomerNotification.find({
    userId: id,
    status: "active",
    audience: "admin",
  })
    .sort({ readAt: 1, createdAt: -1 })
    .limit(80)
    .lean();

  return rows.map((row) => ({
    id: String(row._id),
    eventId: row.eventId ? String(row.eventId) : null,
    customerId: row.customerId ? String(row.customerId) : null,
    type: row.type,
    category: row.category,
    severity: row.severity,
    title: row.title,
    body: row.body,
    actionHref: row.actionHref || "",
    read: Boolean(row.readAt),
    readAt: row.readAt ? new Date(row.readAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}

export async function countUnreadAdminNotifications(userId: string) {
  const id = toObjectId(userId);
  if (!id) return 0;
  return CustomerNotification.countDocuments({
    userId: id,
    status: "active",
    audience: "admin",
    readAt: null,
  });
}

export async function markCustomerNotificationRead(input: {
  userId: string;
  notificationId?: string | null;
  all?: boolean;
  audience?: "customer" | "admin";
}) {
  const userId = toObjectId(input.userId);
  if (!userId) return { updated: 0 };
  const now = new Date();
  const audienceFilter =
    input.audience === "admin"
      ? { audience: "admin" as const }
      : { audience: { $ne: "admin" as const } };
  if (input.all) {
    const result = await CustomerNotification.updateMany(
      { userId, status: "active", readAt: null, ...audienceFilter },
      { $set: { readAt: now } }
    );
    return { updated: result.modifiedCount || 0 };
  }
  const notificationId = input.notificationId
    ? toObjectId(input.notificationId)
    : null;
  if (!notificationId) return { updated: 0 };
  const result = await CustomerNotification.updateOne(
    { _id: notificationId, userId, status: "active", readAt: null, ...audienceFilter },
    { $set: { readAt: now } }
  );
  return { updated: result.modifiedCount || 0 };
}

export async function resolveVenueSeatingNotifications(input: {
  userId: string;
  eventId: string;
  reason: string;
  startKey?: string | null;
  stages?: Array<"h72" | "h24">;
}) {
  const userId = toObjectId(input.userId);
  const eventId = toObjectId(input.eventId);
  if (!userId || !eventId) return { updated: 0 };

  const filter: Record<string, unknown> = {
    userId,
    eventId,
    category: VENUE_SEATING_NOTIFICATION_CATEGORY,
    status: "active",
  };

  if (input.startKey && input.stages?.length) {
    filter.type = {
      $in: input.stages.map((stage) => `venue_seating_contacts.${stage}`),
    };
    filter["meta.startKey"] = { $ne: input.startKey };
  }

  const now = new Date();
  const result = await CustomerNotification.updateMany(filter, {
    $set: {
      status: "resolved",
      resolvedAt: now,
      readAt: now,
      resolveReason: input.reason,
    },
  });
  return { updated: result.modifiedCount || 0 };
}

export async function listVenueSeatingNotificationsForEvent(input: {
  userId: string;
  eventId: string;
}) {
  const userId = toObjectId(input.userId);
  const eventId = toObjectId(input.eventId);
  if (!userId || !eventId) return [];
  const rows = await CustomerNotification.find({
    userId,
    eventId,
    category: VENUE_SEATING_NOTIFICATION_CATEGORY,
  })
    .sort({ createdAt: -1 })
    .lean();
  return rows.map((row) => ({
    id: String(row._id),
    type: row.type,
    severity: row.severity,
    title: row.title,
    status: row.status,
    readAt: row.readAt ? new Date(row.readAt).toISOString() : null,
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt).toISOString() : null,
    resolveReason: row.resolveReason || "",
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}
