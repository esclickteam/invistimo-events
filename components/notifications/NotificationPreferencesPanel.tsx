"use client";

import { useCallback, useEffect, useState } from "react";
import { detectPushSupport, type PushPreferenceToggles } from "@/lib/customerNotifications/planners";

type Device = {
  id: string;
  endpoint: string;
  platform: string;
  label: string;
  createdAt: string;
};

type Support = ReturnType<typeof detectPushSupport>;

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function readSupport(): Support {
  if (typeof window === "undefined") {
    return detectPushSupport({
      hasNotification: false,
      hasServiceWorker: false,
      hasPushManager: false,
      userAgent: "",
      standalone: false,
      permission: "unsupported",
    });
  }
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const permission = "Notification" in window ? Notification.permission : "unsupported";
  return detectPushSupport({
    hasNotification: "Notification" in window,
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
    userAgent: navigator.userAgent,
    standalone,
    permission,
  });
}

const TOGGLES: Array<{ key: keyof PushPreferenceToggles; label: string; hint: string }> = [
  { key: "rsvp", label: "אישורי הגעה", hint: "סיום סבב הודעות או שיחות, ומספרים לבדיקה" },
  { key: "failures", label: "תקלות", hint: "שליחה שנכשלה, הודעות שלא יצאו ושגיאות מערכת" },
  { key: "eventManagement", label: "ניהול אירוע", hint: "פעולות להשלמה ונתונים חסרים" },
  { key: "reminders", label: "תזכורות", hint: "תזכורות לפני האירוע והושבה באולם" },
];

export default function NotificationPreferencesPanel() {
  const [support, setSupport] = useState<Support | null>(null);
  const [configured, setConfigured] = useState(false);
  const [managingCustomer, setManagingCustomer] = useState(false);
  const [push, setPush] = useState<PushPreferenceToggles>({
    rsvp: true,
    failures: true,
    eventManagement: true,
    reminders: true,
  });
  const [devices, setDevices] = useState<Device[]>([]);
  const [currentEndpoint, setCurrentEndpoint] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refreshDevices = useCallback(async () => {
    const res = await fetch("/api/push/subscriptions", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) return;
    setConfigured(Boolean(data.configured));
    setDevices(Array.isArray(data.subscriptions) ? data.subscriptions : []);
  }, []);

  useEffect(() => {
    setSupport(readSupport());
    fetch("/api/notification-preferences", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.success) return;
        setConfigured(Boolean(data.configured));
        setManagingCustomer(Boolean(data.managingCustomer));
        if (data.push) setPush(data.push);
      })
      .catch(() => {});
    refreshDevices().catch(() => {});
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration("/").then(async (registration) => {
        const script = registration?.active?.scriptURL || "";
        if (!script.endsWith("/push-sw.js")) return;
        const subscription = await registration?.pushManager.getSubscription();
        setCurrentEndpoint(subscription?.endpoint || "");
      }).catch(() => {});
    }
  }, [refreshDevices]);

  const saveToggles = async (next: PushPreferenceToggles) => {
    setPush(next);
    setError("");
    const res = await fetch("/api/notification-preferences", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ push: next }),
    });
    if (!res.ok) setError("שמירת ההעדפות נכשלה");
  };

  const enableHere = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const current = readSupport();
      setSupport(current);
      if (!current.supported) {
        setError(
          current.reason === "ios-home-screen"
            ? "באייפון צריך קודם להוסיף את האתר למסך הבית ולפתוח אותו משם."
            : "הדפדפן או המכשיר לא תומכים בהתראות Push."
        );
        return;
      }
      if (!configured) {
        setError("התראות Push אינן זמינות בשרת כרגע.");
        return;
      }
      const permission = await Notification.requestPermission();
      setSupport(readSupport());
      if (permission !== "granted") {
        setError("ההרשאה לא אושרה, ולכן Push לא פעיל במכשיר הזה.");
        return;
      }
      const existing = await navigator.serviceWorker.getRegistration("/");
      const existingScript =
        existing?.active?.scriptURL ||
        existing?.waiting?.scriptURL ||
        existing?.installing?.scriptURL ||
        "";
      if (existingScript && !existingScript.endsWith("/push-sw.js")) {
        setError("באתר כבר רשום Service Worker אחר, ולא החלפנו אותו.");
        return;
      }
      const registration =
        existing || (await navigator.serviceWorker.register("/push-sw.js", { scope: "/" }));
      const keyRes = await fetch("/api/push/public-key", { credentials: "include" });
      const keyData = await keyRes.json().catch(() => null);
      if (!keyRes.ok || !keyData?.publicKey) {
        setError("התראות Push אינן זמינות בשרת כרגע.");
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
      const json = subscription.toJSON();
      const saveRes = await fetch("/api/push/subscriptions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      if (!saveRes.ok) {
        setError("שמירת המכשיר נכשלה.");
        return;
      }
      setCurrentEndpoint(subscription.endpoint);
      setMessage("התראות Push פעילות במכשיר הזה.");
      await refreshDevices();
    } catch {
      setError("לא הצלחנו להפעיל התראות במכשיר הזה.");
    } finally {
      setBusy(false);
    }
  };

  const disableHere = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      const endpoint = subscription?.endpoint || currentEndpoint;
      if (subscription) await subscription.unsubscribe();
      if (endpoint) {
        await fetch("/api/push/subscriptions", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setCurrentEndpoint("");
      setMessage("התראות Push כובו במכשיר הזה.");
      await refreshDevices();
      setSupport(readSupport());
    } catch {
      setError("כיבוי ההתראות במכשיר הזה נכשל.");
    } finally {
      setBusy(false);
    }
  };

  const removeDevice = async (device: Device) => {
    setBusy(true);
    setError("");
    try {
      await fetch("/api/push/subscriptions", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: device.id, endpoint: device.endpoint }),
      });
      if (device.endpoint === currentEndpoint) setCurrentEndpoint("");
      await refreshDevices();
    } finally {
      setBusy(false);
    }
  };

  const activeHere =
    support?.supported === true &&
    support.permission === "granted" &&
    Boolean(currentEndpoint) &&
    devices.some((device) => device.endpoint === currentEndpoint);

  return (
    <div dir="rtl" className="mx-auto max-w-3xl px-4 py-6 text-right">
      <h1 className="text-2xl font-black text-[#3F3328]">העדפות התראות</h1>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#6F5C49]">
        התראות תמיד נשמרות בפעמון בתוך המערכת. Push נשלח רק למכשיר שאישר זאת, ורק לקטגוריות שנבחרו.
        התראות קריטיות נשארות בפעמון גם אם Push כבוי.
      </p>
      {managingCustomer ? (
        <p className="mt-3 rounded-2xl bg-[#F8EEDB] px-4 py-3 text-sm font-bold text-[#8B5E34]">
          ההעדפות והמכשירים כאן שייכים למשתמש המחובר, לא ללקוח שנמצא בניהול.
        </p>
      ) : null}

      <section className="mt-6 rounded-[24px] border border-[#E7D3B4] bg-white p-5">
        <h2 className="text-lg font-black text-[#3F3328]">התראות Push במכשיר הזה</h2>
        <p className="mt-2 text-sm font-semibold text-[#6F5C49]">
          {!configured
            ? "התראות Push אינן זמינות בשרת כרגע."
            : support?.reason === "ios-home-screen"
              ? "באייפון ההתראות זמינות אחרי הוספת האתר למסך הבית ופתיחה מאייקון האפליקציה."
              : support?.supported === false
                ? "הדפדפן הזה לא תומך בהתראות Push."
                : support?.permission === "denied"
                  ? "ההרשאה נדחתה בדפדפן. Push לא פעיל במכשיר הזה."
                  : activeHere
                    ? "Push פעיל במכשיר הזה."
                    : "Push עדיין לא פעיל במכשיר הזה."}
        </p>
        {support?.supported && configured && support.permission !== "denied" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeHere ? (
              <button
                type="button"
                disabled={busy}
                onClick={disableHere}
                className="rounded-full border border-[#E7D3B4] px-4 py-2 text-sm font-black text-[#9C3B2E]"
              >
                כיבוי במכשיר הזה
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={enableHere}
                className="rounded-full bg-[#3F3328] px-4 py-2 text-sm font-black text-white"
              >
                הפעלת התראות במכשיר הזה
              </button>
            )}
          </div>
        ) : null}
        {message ? <p className="mt-3 text-sm font-bold text-[#3F3328]">{message}</p> : null}
        {error ? <p className="mt-3 text-sm font-bold text-[#9C3B2E]">{error}</p> : null}
      </section>

      <section className="mt-4 rounded-[24px] border border-[#E7D3B4] bg-white p-5">
        <h2 className="text-lg font-black text-[#3F3328]">אילו התראות לקבל ב-Push</h2>
        <div className="mt-3 space-y-3">
          {TOGGLES.map((item) => (
            <label key={item.key} className="flex items-start justify-between gap-3">
              <span>
                <span className="block text-sm font-black text-[#3F3328]">{item.label}</span>
                <span className="mt-1 block text-xs font-semibold text-[#8A7867]">{item.hint}</span>
              </span>
              <input
                type="checkbox"
                className="mt-1 h-5 w-5"
                checked={push[item.key]}
                onChange={(event) => saveToggles({ ...push, [item.key]: event.target.checked })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-[24px] border border-[#E7D3B4] bg-white p-5">
        <h2 className="text-lg font-black text-[#3F3328]">מכשירים מחוברים</h2>
        {devices.length === 0 ? (
          <p className="mt-2 text-sm font-semibold text-[#8A7867]">אין עדיין מכשיר שאישר התראות.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {devices.map((device) => (
              <li key={device.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#FFF8EF] px-3 py-3">
                <div>
                  <p className="text-sm font-black text-[#3F3328]">
                    {device.label}
                    {device.endpoint === currentEndpoint ? " · המכשיר הזה" : ""}
                  </p>
                  <p className="text-[11px] font-bold text-[#8A7867]">
                    {device.endpoint === currentEndpoint && activeHere ? "פעיל" : "רשום לחשבון"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => removeDevice(device)}
                  className="text-xs font-black text-[#9C3B2E]"
                >
                  הסרה
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
