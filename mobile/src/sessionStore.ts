import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "invistimo.accessToken";
const REFRESH_KEY = "invistimo.refreshToken";
const BIOMETRIC_KEY = "invistimo.biometrics";
const SESSION_KEY = "invistimo.hasSession";
const ENROLLED_KEY = "invistimo.biometricLevel";
const LEGACY_KEY = "invistimo.authToken";

const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function saveSecureSession(input: {
  accessToken: string;
  refreshToken?: string | null;
}) {
  await SecureStore.setItemAsync(ACCESS_KEY, input.accessToken, STORE_OPTIONS);
  if (input.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_KEY, input.refreshToken, STORE_OPTIONS);
  }
  await SecureStore.setItemAsync(SESSION_KEY, "1", STORE_OPTIONS);
  await SecureStore.deleteItemAsync(LEGACY_KEY).catch(() => undefined);
}

export async function peekSessionMeta() {
  const [hasSession, biometrics, enrolledLevel] = await Promise.all([
    SecureStore.getItemAsync(SESSION_KEY),
    SecureStore.getItemAsync(BIOMETRIC_KEY),
    SecureStore.getItemAsync(ENROLLED_KEY),
  ]);
  if (hasSession === "1") {
    return {
      hasSession: true,
      biometricsEnabled: biometrics === "1",
      enrolledLevel: enrolledLevel ? Number(enrolledLevel) : null,
      hasLegacyToken: false,
    };
  }
  const legacy = await SecureStore.getItemAsync(LEGACY_KEY);
  return {
    hasSession: Boolean(legacy),
    biometricsEnabled: biometrics === "1",
    enrolledLevel: enrolledLevel ? Number(enrolledLevel) : null,
    hasLegacyToken: Boolean(legacy),
  };
}

export async function readSecureSession() {
  const [accessToken, refreshToken, legacy, meta] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
    SecureStore.getItemAsync(LEGACY_KEY),
    peekSessionMeta(),
  ]);
  return {
    accessToken: accessToken || legacy,
    refreshToken,
    hasSession: meta.hasSession || Boolean(accessToken || refreshToken || legacy),
    biometricsEnabled: meta.biometricsEnabled,
    enrolledLevel: meta.enrolledLevel,
  };
}

export async function clearSecureSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_KEY).catch(() => undefined),
  ]);
}

export async function setBiometricsEnabled(enabled: boolean, enrolledLevel?: number) {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_KEY, "1", STORE_OPTIONS);
    if (enrolledLevel != null) {
      await SecureStore.setItemAsync(ENROLLED_KEY, String(enrolledLevel), STORE_OPTIONS);
    }
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY).catch(() => undefined);
    await SecureStore.deleteItemAsync(ENROLLED_KEY).catch(() => undefined);
  }
}

export { accessTokenExpiresAt, accessTokenNeedsRefresh } from "@/src/jwtExpiry";

