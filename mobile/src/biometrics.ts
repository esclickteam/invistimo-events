import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

export type BiometricCapability = {
  available: boolean;
  enrolled: boolean;
  label: string;
  enrolledLevel: number;
};

export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const types = hasHardware
      ? await LocalAuthentication.supportedAuthenticationTypesAsync()
      : [];
    const enrolled = hasHardware
      ? await LocalAuthentication.isEnrolledAsync()
      : false;
    const enrolledLevel = hasHardware
      ? await LocalAuthentication.getEnrolledLevelAsync()
      : LocalAuthentication.SecurityLevel.NONE;

    return {
      available: hasHardware && enrolled && types.length > 0,
      enrolled,
      label: biometricLabel(types),
      enrolledLevel,
    };
  } catch {
    return {
      available: false,
      enrolled: false,
      label: "ביומטריה",
      enrolledLevel: 0,
    };
  }
}

export function biometricLabel(types: LocalAuthentication.AuthenticationType[]) {
  const face = types.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
  );
  const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  if (Platform.OS === "ios" && face) return "Face ID";
  if (Platform.OS === "ios" && finger) return "Touch ID";
  if (face) return "זיהוי פנים";
  if (finger) return "טביעת אצבע";
  return "ביומטריה";
}

export async function promptBiometric(promptMessage: string) {
  return LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "ביטול",
    disableDeviceFallback: true,
    fallbackLabel: "סיסמת חשבון",
  });
}
