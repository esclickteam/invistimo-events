import { listEnabledNativePushTokens } from "@/lib/push/mobilePushDevices";
import {
  sanitizeNativePushPayload,
  type NativePushType,
} from "@/lib/push/nativePush";
import MobilePushDevice from "@/models/MobilePushDevice";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendNativePushToUser(
  userId: string,
  input: { type: NativePushType }
) {
  try {
    const tokens = await listEnabledNativePushTokens(userId);
    if (!tokens.length) return { sent: 0 };

    const payload = sanitizeNativePushPayload(input);
    const messages = tokens.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      sound: payload.sound,
      channelId: payload.channelId,
      data: payload.data,
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const body = (await res.json().catch(() => ({}))) as {
      data?: Array<{ status?: string; details?: { error?: string } }>;
    };
    const tickets = Array.isArray(body.data) ? body.data : [];
    const invalid: string[] = [];
    tickets.forEach((ticket, index) => {
      if (ticket?.details?.error === "DeviceNotRegistered" && tokens[index]) {
        invalid.push(tokens[index]);
      }
    });
    if (invalid.length) {
      await MobilePushDevice.updateMany(
        { expoPushToken: { $in: invalid } },
        { $set: { revokedAt: new Date(), enabled: false } }
      );
    }
    return { sent: tokens.length - invalid.length };
  } catch {
    return { sent: 0 };
  }
}

export function notifyNativeUser(
  userId: string | null | undefined,
  type: NativePushType
) {
  if (!userId) return;
  void sendNativePushToUser(String(userId), { type }).catch(() => undefined);
}
