import mongoose from "mongoose";
import CustomerNotification from "@/models/CustomerNotification";
import User from "@/models/User";
import {
  planVenueSeatingBriefingAdminNotice,
  type BriefingRole,
  type BriefingSendKind,
} from "@/lib/venueSeatingBriefing/logic";

/**
 * Side effect after the existing briefing SMS already finished.
 * This does not choose recipients, text, or whether the SMS is sent.
 */
export async function recordVenueSeatingBriefingAdminNotice(input: {
  eventId: string;
  eventTitle: string;
  customerId?: string | null;
  recipientId: string;
  recipientRole?: BriefingRole | string | null;
  kind: BriefingSendKind | string;
  ok: boolean;
  attemptAt: string;
}) {
  try {
    const notice = planVenueSeatingBriefingAdminNotice(input);
    if (!notice || mongoose.connection.readyState !== 1) return;
    const admins = await User.find({ role: "admin", isActive: { $ne: false } })
      .select("_id")
      .limit(25)
      .lean<Array<{ _id: mongoose.Types.ObjectId }>>();
    for (const admin of admins) {
      await writeOneAdminNotice(admin._id, notice);
    }
  } catch (error) {
    console.error("venue seating briefing admin notice failed", error);
  }
}

async function writeOneAdminNotice(
  adminId: mongoose.Types.ObjectId,
  notice: NonNullable<ReturnType<typeof planVenueSeatingBriefingAdminNotice>>
) {
  const dedupeKey = `${notice.incidentKey}:admin:${String(adminId)}`;
  const existing = await CustomerNotification.collection.findOne({ dedupeKey });
  if (existing) return;
  const now = new Date();
  const eventId = mongoose.Types.ObjectId.isValid(notice.eventId)
    ? new mongoose.Types.ObjectId(notice.eventId)
    : null;
  const customerId = mongoose.Types.ObjectId.isValid(notice.customerId)
    ? new mongoose.Types.ObjectId(notice.customerId)
    : null;
  let insertedId: mongoose.Types.ObjectId | null = null;
  try {
    const inserted = await CustomerNotification.collection.insertOne({
      userId: adminId,
      eventId,
      customerId,
      audience: "admin",
      type: notice.type,
      category: notice.category,
      severity: notice.severity,
      title: notice.title,
      body: notice.body,
      actionHref: notice.actionHref,
      status: "active",
      readAt: null,
      resolvedAt: null,
      resolveReason: "",
      dedupeKey,
      pushClaimedAt: notice.category === "admin_info" ? now : null,
      meta: { incidentKey: notice.incidentKey, eventTitle: notice.eventTitle },
      createdAt: now,
      updatedAt: now,
    });
    insertedId = inserted.insertedId;
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code === 11000) return;
    throw error;
  }
  if (notice.category !== "admin_important" || !insertedId) return;
  const pushed = await pushFailureToAdminDevices({
    adminId,
    title: notice.title,
    body: notice.body,
    actionHref: notice.actionHref,
    tag: notice.incidentKey,
  });
  if (pushed) {
    await CustomerNotification.collection.updateOne(
      { _id: insertedId },
      { $set: { pushClaimedAt: new Date() } }
    );
  }
}

async function pushFailureToAdminDevices(input: {
  adminId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  actionHref: string;
  tag: string;
}) {
  try {
    const preferences = mongoose.connection.collection("notificationpreferences");
    const preference = await preferences.findOne({ userId: input.adminId });
    if (preference && preference.adminImportant === false) return false;
    const subscriptions = await mongoose.connection
      .collection("webpushsubscriptions")
      .find({ userId: input.adminId, disabledAt: null })
      .limit(20)
      .toArray();
    if (!subscriptions.length) return false;
    const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
    const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
    const subject = String(process.env.VAPID_SUBJECT || "mailto:support@invistimo.com").trim();
    if (!publicKey || !privateKey) return false;
    const load = new Function("return import('web-push')") as () => Promise<{
      setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
      sendNotification: (
        subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
        payload: string,
        options: { TTL: number; urgency: string }
      ) => Promise<unknown>;
    }>;
    const webpush = await load();
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const payload = JSON.stringify({
      title: input.title.slice(0, 120),
      body: input.body.slice(0, 220),
      url: input.actionHref.startsWith("/") ? input.actionHref : "/admin",
      tag: input.tag.slice(0, 120),
      severity: "important",
    });
    let sent = 0;
    for (const subscription of subscriptions) {
      const endpoint = String(subscription.endpoint || "");
      const p256dh = String(subscription.p256dh || "");
      const auth = String(subscription.auth || "");
      if (!endpoint || !p256dh || !auth) continue;
      try {
        await webpush.sendNotification(
          { endpoint, keys: { p256dh, auth } },
          payload,
          { TTL: 60 * 60 * 12, urgency: "normal" }
        );
        sent += 1;
      } catch {
        continue;
      }
    }
    return sent > 0;
  } catch (error) {
    console.error("venue seating briefing failure push skipped", error);
    return false;
  }
}
