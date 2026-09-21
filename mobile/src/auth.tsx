import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import {
  fetchMe,
  loginRequest,
  setAuthToken,
  setUnauthorizedHandler,
  type MeUser,
} from "@/src/api";

const TOKEN_KEY = "invistimo.authToken";

type AuthContextValue = {
  ready: boolean;
  user: MeUser | null;
  login: (identifier: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
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
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          const me = await fetchMe();
          if (!cancelled) {
            if (me) setUser(me);
            else {
              setAuthToken(null);
              await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
            }
          }
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const result = await loginRequest(identifier.trim(), password);
    if (!result.ok || !result.data.success) {
      return result.data.error || "מייל/טלפון או סיסמה שגויים";
    }
    if (!result.token) {
      return "ההתחברות הצליחה, אבל לא התקבל אסימון מהשרת.";
    }
    setAuthToken(result.token);
    await SecureStore.setItemAsync(TOKEN_KEY, result.token);
    const me = await fetchMe();
    setUser(me || result.data.user || null);
    return null;
  }, []);

  const value = useMemo(
    () => ({ ready, user, login, logout, refreshUser }),
    [ready, user, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}
