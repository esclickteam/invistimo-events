import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import {
  fetchMe,
  loginRequest,
  logoutRequest,
  persistSession,
  refreshAccessToken,
  hydrateSessionFromStore,
  setAuthToken,
  setUnauthorizedHandler,
  type MeUser,
} from "@/src/api";
import {
  getBiometricCapability,
  promptBiometric,
  type BiometricCapability,
} from "@/src/biometrics";
import { customerError, invalidSessionMessage } from "@/src/errors";
import {
  accessTokenNeedsRefresh,
  clearSecureSession,
  peekSessionMeta,
  setBiometricsEnabled,
} from "@/src/sessionStore";

type AuthContextValue = {
  ready: boolean;
  locked: boolean;
  user: MeUser | null;
  biometric: BiometricCapability;
  biometricsEnabled: boolean;
  login: (identifier: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  unlockWithBiometrics: () => Promise<string | null>;
  usePasswordInstead: () => void;
  enableBiometrics: () => Promise<string | null>;
  disableBiometrics: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function restoreUserFromStore() {
  const stored = await hydrateSessionFromStore();
  if (!stored.accessToken && !stored.refreshToken) return null;
  if (!stored.accessToken || accessTokenNeedsRefresh(stored.accessToken)) {
    const refreshed = await refreshAccessToken();
    if (!refreshed && !stored.accessToken) return null;
  }
  return fetchMe();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [biometricsEnabled, setBiometricsEnabledState] = useState(false);
  const [biometric, setBiometric] = useState<BiometricCapability>({
    available: false,
    enrolled: false,
    label: "ביומטריה",
    enrolledLevel: 0,
  });

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => undefined);
    setAuthToken(null, null);
    setUser(null);
    setLocked(false);
    await clearSecureSession();
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
    if (!me) await logout();
  }, [logout]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const capability = await getBiometricCapability();
        const meta = await peekSessionMeta();
        if (cancelled) return;
        setBiometric(capability);
        setBiometricsEnabledState(meta.biometricsEnabled);

        const enrollmentChanged =
          meta.biometricsEnabled &&
          meta.enrolledLevel != null &&
          capability.enrolledLevel === 0;

        if (meta.hasSession && meta.biometricsEnabled && capability.available && !enrollmentChanged) {
          setLocked(true);
          return;
        }

        if (meta.hasSession && meta.biometricsEnabled && !capability.available) {
          setLocked(true);
          return;
        }

        if (meta.hasSession) {
          const me = await restoreUserFromStore();
          if (!cancelled) {
            if (me) setUser(me);
            else await logout();
          }
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const askToEnableBiometrics = useCallback(
    async (capability: BiometricCapability) => {
      if (!capability.available) return;
      Alert.alert(
        `פתיחה עם ${capability.label}?`,
        `בפעם הבאה אפשר לפתוח את האפליקציה עם ${capability.label} בלי להקליד סיסמה. הסיסמה עצמה לא נשמרת במכשיר.`,
        [
          { text: "לא עכשיו", style: "cancel" },
          {
            text: "הפעלה",
            onPress: () => {
              void (async () => {
                const result = await promptBiometric(`אישור ${capability.label} ל-Invistimo`);
                if (!result.success) return;
                await setBiometricsEnabled(true, capability.enrolledLevel);
                setBiometricsEnabledState(true);
              })();
            },
          },
        ]
      );
    },
    []
  );

  const login = useCallback(
    async (identifier: string, password: string) => {
      const result = await loginRequest(identifier.trim(), password);
      if (!result.ok || !result.data.success) {
        return customerError(result.status, result.data, "מייל/טלפון או סיסמה שגויים");
      }
      if (!result.token) {
        return "ההתחברות הצליחה, אבל לא ניתן לפתוח את הסשן במכשיר.";
      }
      const previous = await hydrateSessionFromStore();
      if (previous.refreshToken && previous.refreshToken !== result.refreshToken) {
        await logoutRequest(previous.refreshToken);
      }
      await persistSession(result.token, result.refreshToken);
      const me = await fetchMe();
      setUser(me || result.data.user || null);
      setLocked(false);
      const capability = await getBiometricCapability();
      setBiometric(capability);
      if (capability.available && !biometricsEnabled) {
        void askToEnableBiometrics(capability);
      }
      return null;
    },
    [askToEnableBiometrics, biometricsEnabled]
  );

  const unlockWithBiometrics = useCallback(async () => {
    if (!biometric.available) {
      return `${biometric.label} לא זמין במכשיר הזה`;
    }
    const result = await promptBiometric(`פתיחת Invistimo עם ${biometric.label}`);
    if (!result.success) {
      return result.error === "user_cancel" || result.error === "system_cancel"
        ? null
        : "הזיהוי לא הצליח. אפשר לנסות שוב או להתחבר עם הסיסמה.";
    }
    const me = await restoreUserFromStore();
    if (!me) {
      await logout();
      return invalidSessionMessage;
    }
    setUser(me);
    setLocked(false);
    return null;
  }, [biometric, logout]);

  const usePasswordInstead = useCallback(() => {
    setLocked(false);
    setAuthToken(null, null);
    setUser(null);
  }, []);

  const enableBiometrics = useCallback(async () => {
    const capability = await getBiometricCapability();
    setBiometric(capability);
    if (!capability.available) {
      return `${capability.label} לא זמין במכשיר הזה`;
    }
    const result = await promptBiometric(`אישור ${capability.label} ל-Invistimo`);
    if (!result.success) return "ההפעלה בוטלה";
    await setBiometricsEnabled(true, capability.enrolledLevel);
    setBiometricsEnabledState(true);
    return null;
  }, []);

  const disableBiometrics = useCallback(async () => {
    await setBiometricsEnabled(false);
    setBiometricsEnabledState(false);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      locked,
      user,
      biometric,
      biometricsEnabled,
      login,
      logout,
      refreshUser,
      unlockWithBiometrics,
      usePasswordInstead,
      enableBiometrics,
      disableBiometrics,
    }),
    [
      ready,
      locked,
      user,
      biometric,
      biometricsEnabled,
      login,
      logout,
      refreshUser,
      unlockWithBiometrics,
      usePasswordInstead,
      enableBiometrics,
      disableBiometrics,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}
