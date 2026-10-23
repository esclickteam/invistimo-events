import mongoose from "mongoose";
import CustomerNotification from "@/models/CustomerNotification";
import WebPushSubscription from "@/models/WebPushSubscription";
import { getPushPreferences } from "@/lib/customerNotifications/preferences";
import {
  safeActionPath,
  shouldDeliverPush,
} from "@/lib/customerNotifications/planners";
import { customerNotificationsEnabled } from "@/lib/customerNotifications/featureFlag";

export function getVapidConfig() {
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
  const subject = String(process.env.VAPID_SUBJECT || "mailto:support@invistimo.com").trim();
  if (!publicKey || !privateKey) return null;
  if (!subject.startsWith("mailto:") && !subject.startsWith("https://")) return null;
  return { publicKey, privateKey, subject };
}

export function isWebPushConfigured() {
  return Boolean(getVapidConfig());
}

function toObjectId(value: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

async function loadWebPush() {
  try {
    const loaded = await import("web-push");
    return loaded;
  } catch (error) {
    console.error("web-push module unavailable", error);
    return null;
  }
}

export async function deliverWebPushForNotification(notificationId: string) {
  const id = toObjectId(notificationId);
  if (!id) return { sent: 0, reason: "BAD_ID" as const };

  if (!customerNotificationsEnabled()) {
    const preview = await CustomerNotification.findById(id).select("audience").lean();
    if (preview && preview.audience !== "admin") {
      return { sent: 0, reason: "DISABLED" as const };
    }
  }

  const claimed = await CustomerNotification.findOneAndUpdate(
    { _id: id, pushClaimedAt: null },
    { $set: { pushClaimedAt: new Date() } },
    { new: true }
  ).lean();
  if (!claimed) return { sent: 0, reason: "ALREADY_CLAIMED" as const };

  const config = getVapidConfig();
  const preferences = await getPushPreferences(String(claimed.userId));
  const subscriptions = config
    ? await WebPushSubscription.find({
        userId: claimed.userId,
        disabledAt: null,
      }).lean()
    : [];

  if (
    !shouldDeliverPush({
      category: claimed.category,
      preferences,
      configured: Boolean(config),
      subscriptionCount: subscriptions.length,
    })
  ) {
    return { sent: 0, reason: "SKIPPED" as const };
  }

  const webpush = await loadWebPush();
  if (!webpush || !config) return { sent: 0, reason: "NOT_CONFIGURED" as const };
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  const payload = JSON.stringify({
    title: String(claimed.title || "Invistimo").slice(0, 120),
    body: String(claimed.body || "").slice(0, 220),
    url: safeActionPath(claimed.actionHref),
    tag: String(claimed.dedupeKey || claimed._id).slice(0, 120),
    severity: claimed.severity,
  });
  const urgency = claimed.severity === "urgent" ? "high" : "normal";

  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload,
        { TTL: 60 * 60 * 12, urgency }
      );
      sent += 1;
      await WebPushSubscription.updateOne(
        { _id: subscription._id },
        { $set: { lastSuccessAt: new Date(), failureCount: 0 } }
      );
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
      if (statusCode === 404 || statusCode === 410) {
        await WebPushSubscription.deleteOne({ _id: subscription._id });
        continue;
      }
      const nextFailures = Number(subscription.failureCount || 0) + 1;
      await WebPushSubscription.updateOne(
        { _id: subscription._id },
        {
          $set: {
            failureCount: nextFailures,
            lastFailureAt: new Date(),
            ...(nextFailures >= 5 ? { disabledAt: new Date() } : {}),
          },
        }
      );
    }
  }

  return { sent, reason: "SENT" as const };
}

export async function deliverWebPushTest(userId: string, endpoint: string) {
  const target = String(endpoint || "").trim();
  if (!target) {
    return { sent: 0, attempted: 0, reason: "NO_CURRENT_DEVICE" as const };
  }
  const id = toObjectId(userId);
  const config = getVapidConfig();
  if (!id || !config) {
    return { sent: 0, attempted: 0, reason: "NOT_CONFIGURED" as const };
  }
  const subscription = await WebPushSubscription.findOne({
    userId: id,
    disabledAt: null,
    endpoint: target,
  }).lean();
  if (!subscription) {
    return { sent: 0, attempted: 0, reason: "NO_DEVICE" as const };
  }
  const webpush = await loadWebPush();
  if (!webpush) return { sent: 0, attempted: 1, reason: "NOT_CONFIGURED" as const };
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  const payload = JSON.stringify({
    title: "בדיקת התראות",
    body: "התראת בדיקה למכשיר הזה.",
    url: "/admin/notification-settings",
    tag: `admin-test:${userId}`,
    severity: "info",
  });
  let sent = 0;
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payload,
      { TTL: 60 * 10, urgency: "normal" }
    );
    sent = 1;
  } catch (error) {
    const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
    if (statusCode === 404 || statusCode === 410) {
      await WebPushSubscription.deleteOne({ _id: subscription._id });
    }
  }
  return {
    sent,
    attempted: 1,
    reason: sent > 0 ? ("SENT" as const) : ("FAILED" as const),
  };
}
