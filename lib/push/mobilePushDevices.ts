import MobilePushDevice from "@/models/MobilePushDevice";
import { normalizeExpoPushToken } from "@/lib/push/nativePush";

export async function registerMobilePushDevice(input: {
  userId: string;
  expoPushToken: string;
  deviceId?: string;
  platform?: string;
  deviceLabel?: string;
  enabled?: boolean;
}) {
  const expoPushToken = normalizeExpoPushToken(input.expoPushToken);
  if (!expoPushToken) {
    return { ok: false as const, error: "INVALID_PUSH_TOKEN" };
  }

  const deviceId = String(input.deviceId || "").trim().slice(0, 80);
  const platform =
    input.platform === "ios" || input.platform === "android"
      ? input.platform
      : "unknown";
  const enabled = input.enabled !== false;

  await MobilePushDevice.updateMany(
    { expoPushToken, userId: { $ne: input.userId }, revokedAt: null },
    { $set: { revokedAt: new Date(), enabled: false } }
  );

  if (deviceId) {
    await MobilePushDevice.updateMany(
      {
        userId: input.userId,
        deviceId,
        expoPushToken: { $ne: expoPushToken },
        revokedAt: null,
      },
      { $set: { revokedAt: new Date(), enabled: false } }
    );
  }

  const device = await MobilePushDevice.findOneAndUpdate(
    { expoPushToken },
    {
      $set: {
        userId: input.userId,
        expoPushToken,
        deviceId,
        platform,
        deviceLabel: String(input.deviceLabel || "").slice(0, 80),
        enabled,
        revokedAt: null,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { ok: true as const, device };
}

export async function revokeMobilePushDevice(input: {
  userId?: string;
  expoPushToken?: string;
  deviceId?: string;
}) {
  const expoPushToken = normalizeExpoPushToken(input.expoPushToken);
  const deviceId = String(input.deviceId || "").trim();
  if (!expoPushToken && !deviceId) return { ok: true as const, revoked: 0 };

  const query: Record<string, unknown> = { revokedAt: null };
  if (input.userId) query.userId = input.userId;
  const or = [];
  if (expoPushToken) or.push({ expoPushToken });
  if (deviceId) or.push({ deviceId });
  query.$or = or;

  const result = await MobilePushDevice.updateMany(query, {
    $set: { revokedAt: new Date(), enabled: false },
  });
  return { ok: true as const, revoked: result.modifiedCount || 0 };
}

export async function listEnabledNativePushTokens(userId: string) {
  const devices = await MobilePushDevice.find({
    userId,
    enabled: true,
    revokedAt: null,
  })
    .select("expoPushToken")
    .lean();
  return devices
    .map((device) => normalizeExpoPushToken(device.expoPushToken))
    .filter((token): token is string => Boolean(token));
}
