import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { api } from "@/src/api";
import { isPushScreen, pathForPushScreen, type NativePushScreen } from "@/src/pushRoutes";

const DEVICE_ID_KEY = "invistimo.deviceId";
const PUSH_TOKEN_KEY = "invistimo.expoPushToken";
const PUSH_PREF_KEY = "invistimo.pushEnabled";

const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let pendingScreen: NativePushScreen | null = null;

function extraProjectId() {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId || Constants.easConfig?.projectId || "";
}

export async function getMobileDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, created, STORE_OPTIONS);
  return created;
}

export async function getPushPreference() {
  const value = await SecureStore.getItemAsync(PUSH_PREF_KEY);
  return value !== "0";
}

export async function setPushPreference(enabled: boolean) {
  if (enabled) await SecureStore.deleteItemAsync(PUSH_PREF_KEY).catch(() => undefined);
  else await SecureStore.setItemAsync(PUSH_PREF_KEY, "0", STORE_OPTIONS);
}

export function consumePendingPushScreen() {
  const screen = pendingScreen;
  pendingScreen = null;
  return screen;
}

export function rememberPushScreen(screen: unknown) {
  if (isPushScreen(screen)) pendingScreen = screen;
}

export function pathForStoredPushScreen(screen: NativePushScreen) {
  return pathForPushScreen(screen);
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("invistimo", {
    name: "Invistimo",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: "#B88A2D",
  });
}

export async function getNotificationPermission() {
  return Notifications.getPermissionsAsync();
}

export async function requestNotificationPermission() {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return current;
  return Notifications.requestPermissionsAsync();
}

export async function getExpoPushToken() {
  if (!Device.isDevice) return null;
  const projectId = extraProjectId();
  if (!projectId) return null;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data || null;
}

export async function registerNativePush(enabled = true) {
  const deviceId = await getMobileDeviceId();
  await setPushPreference(enabled);
  if (!enabled) {
    const stored = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    await api(
      "/api/auth/mobile/push/unregister",
      {
        method: "POST",
        body: JSON.stringify({
          client: "native",
          expoPushToken: stored || "",
          deviceId,
        }),
      },
      { auth: true }
    ).catch(() => undefined);
    return { ok: true, enabled: false };
  }

  const permission = await requestNotificationPermission();
  if (permission.status !== "granted") {
    return { ok: false, enabled: false, permission: permission.status };
  }

  const expoPushToken = await getExpoPushToken();
  if (!expoPushToken) return { ok: false, enabled: true, permission: "granted" };

  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, expoPushToken, STORE_OPTIONS);
  const result = await api<{ success?: boolean; enabled?: boolean }>(
    "/api/auth/mobile/push/register",
    {
      method: "POST",
      body: JSON.stringify({
        client: "native",
        expoPushToken,
        deviceId,
        platform: Platform.OS,
        deviceLabel: [Device.osName, Device.modelName].filter(Boolean).join(" ").slice(0, 80),
        enabled: true,
      }),
    }
  );
  return { ok: result.ok && result.data.success !== false, enabled: true, permission: "granted" };
}

export async function unregisterNativePush() {
  const deviceId = await getMobileDeviceId();
  const stored = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  await api(
    "/api/auth/mobile/push/unregister",
    {
      method: "POST",
      body: JSON.stringify({
        client: "native",
        expoPushToken: stored || "",
        deviceId,
      }),
    },
    { auth: true }
  ).catch(() => undefined);
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY).catch(() => undefined);
}

export { Notifications };
