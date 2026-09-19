"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, Check, Loader2, QrCode, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  userCanManageCheckIn,
  userCanScanCheckIn,
} from "@/lib/checkIn/permissions";
import { formatTableLabel } from "@/lib/checkIn/guestPassState";
import {
  applyDemoCheckIn,
  DEMO_CHECKIN_CHANNEL,
  DEMO_CHECKIN_STORAGE_KEY,
  isDemoCheckInToken,
  readDemoCheckInState,
  serializeDemoGuest,
  undoDemoCheckIn,
  type DemoCheckInGuest,
} from "@/lib/checkIn/demoCheckIn";

type GuestPreview = {
  id: string;
  name: string;
  phone: string;
  confirmedGuestCount: number;
  checkedInGuestCount: number;
  tableNumber: number | null;
  tableName: string;
};

type ToastState = {
  guestId: string;
  quantity: number;
  table: string;
  method: "QR" | "MANUAL";
};

type SeatTableOption = {
  tableId?: string;
  _id?: string;
  id?: string;
  tableName?: string;
  name?: string;
  tableNumber?: number | string | null;
  freeSeats?: number;
  canFit?: boolean;
};

type SeatPrompt = {
  guestId: string;
  guestName: string;
  actual: number;
  allocated: number;
  shortage: number;
  surplus: number;
  status: "over" | "under";
  currentTable: SeatTableOption | null;
  suggestedTables: SeatTableOption[];
};

type Props = {
  demo?: boolean;
};

const QUICK_COUNTS = [1, 2, 3, 4, 5, 6];

function tableText(guest: { tableName?: string; tableNumber?: number | null }) {
  return formatTableLabel(guest) || "ללא שולחן";
}

function deviceSession() {
  if (typeof window === "undefined") return null;
  const key = "invistimo.checkin.session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  window.sessionStorage.setItem(key, id);
  return id;
}

export default function CheckInHostClient({ demo = false }: Props) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const canScan = demo || userCanScanCheckIn(user as any);
  const canManage = demo || userCanManageCheckIn(user as any);
  const invitationFromUrl = demo ? "" : searchParams.get("invitationId") || "";
  const eventFromUrl = demo ? "" : searchParams.get("eventId") || "";

  const [checkInEnabled, setCheckInEnabled] = useState<boolean | null>(
    demo ? true : null
  );
  const [live, setLive] = useState(demo);
  const [startingLive, setStartingLive] = useState(false);
  const [invitationId, setInvitationId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GuestPreview[]>([]);
  const [selected, setSelected] = useState<GuestPreview | null>(null);
  const [scanMethod, setScanMethod] = useState<"QR" | "MANUAL">("QR");
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [seatPrompt, setSeatPrompt] = useState<SeatPrompt | null>(null);
  const [seatBusy, setSeatBusy] = useState(false);
  const [demoReady, setDemoReady] = useState(false);
  const [demoGuests, setDemoGuests] = useState<DemoCheckInGuest[]>([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanLockedRef = useRef(false);
  const cooldownRef = useRef<{ token: string; until: number }>({
    token: "",
    until: 0,
  });
  const autoStartedRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);
  const scannerBoxId = "invistimo-checkin-scanner";

  const loadSummary = useCallback(async () => {
    if (demo) {
      setCheckInEnabled(true);
      setLive(true);
      return;
    }
    const params = new URLSearchParams();
    if (invitationFromUrl) params.set("invitationId", invitationFromUrl);
    if (eventFromUrl) params.set("eventId", eventFromUrl);
    const qs = params.toString();
    const res = await fetch(`/api/check-in/summary${qs ? `?${qs}` : ""}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCheckInEnabled(false);
      setLive(false);
      return;
    }
    setCheckInEnabled(Boolean(data.checkInEnabled));
    setLive(Boolean(data.live));
    setInvitationId(String(data.invitationId || ""));
  }, [demo, invitationFromUrl, eventFromUrl]);

  useEffect(() => {
    loadSummary().catch(() => setCheckInEnabled(false));
  }, [loadSummary]);

  useEffect(() => {
    if (!demo) return;
    const sync = () => {
      setDemoGuests(readDemoCheckInState().guests);
      setDemoReady(true);
    };
    sync();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === DEMO_CHECKIN_STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(DEMO_CHECKIN_CHANNEL, sync as EventListener);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(DEMO_CHECKIN_CHANNEL);
      channel.onmessage = () => sync();
    } catch {
      channel = null;
    }
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(DEMO_CHECKIN_CHANNEL, sync as EventListener);
      channel?.close();
    };
  }, [demo]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      await scanner.clear();
    } catch {
      // ignore
    }
  }, []);

  const pauseScanner = useCallback(() => {
    scanLockedRef.current = true;
    try {
      scannerRef.current?.pause(false);
    } catch {
      // ignore
    }
  }, []);

  const resumeScanner = useCallback((token?: string) => {
    if (token) {
      cooldownRef.current = { token, until: Date.now() + 1800 };
    }
    scanLockedRef.current = false;
    setSelected(null);
    setCustomOpen(false);
    setCustomValue("");
    setError("");
    try {
      scannerRef.current?.resume();
    } catch {
      // camera may not be running
    }
  }, []);

  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  const lookupToken = useCallback(
    async (raw: string) => {
      if (scanLockedRef.current) return;
      const now = Date.now();
      if (
        cooldownRef.current.token === raw &&
        now < cooldownRef.current.until
      ) {
        return;
      }

      pauseScanner();
      setBusy(true);
      setError("");
      try {
        if (demo || isDemoCheckInToken(raw)) {
          const guest = readDemoCheckInState().guests.find(
            (item) => item.token === raw
          );
          if (!guest) {
            setError("QR לא מזוהה באירוע זה");
            resumeScanner(raw);
            return;
          }
          setScanMethod("QR");
          setSelected(serializeDemoGuest(guest) as GuestPreview);
          return;
        }

        const res = await fetch("/api/check-in/lookup", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: raw,
            invitationId: invitationId || invitationFromUrl,
            eventId: eventFromUrl,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.guest) {
          setError(
            data?.error === "EVENT_NOT_LIVE"
              ? "סריקה אפשרית רק כאשר האירוע במצב LIVE"
              : data?.error === "GUEST_NOT_FOUND"
                ? "QR לא מזוהה באירוע זה"
                : "סריקה נכשלה"
          );
          resumeScanner(raw);
          return;
        }
        setScanMethod("QR");
        setSelected(data.guest as GuestPreview);
      } catch {
        setError("שגיאת רשת");
        resumeScanner(raw);
      } finally {
        setBusy(false);
      }
    },
    [
      demo,
      invitationId,
      invitationFromUrl,
      eventFromUrl,
      pauseScanner,
      resumeScanner,
    ]
  );

  const startScanner = useCallback(async () => {
    if (!canScan || !live) return;
    setError("");
    await stopScanner();
    scanLockedRef.current = false;
    setScanning(true);

    try {
      const scanner = new Html5Qrcode(scannerBoxId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          void lookupToken(decoded);
        },
        () => {}
      );
    } catch (err) {
      console.error(err);
      setScanning(false);
      setError("לא ניתן לפתוח מצלמה. ניתן לחפש אורח ידנית.");
    }
  }, [canScan, live, lookupToken, stopScanner]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      void stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    if (!canScan || !checkInEnabled || !live) return;
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    void startScanner();
  }, [canScan, checkInEnabled, live, startScanner]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        if (demo) {
          const q = query.trim();
          setSearchResults(
            readDemoCheckInState()
              .guests.filter((guest) => guest.name.includes(q))
              .map((guest) => serializeDemoGuest(guest) as GuestPreview)
          );
          return;
        }
        const qs = new URLSearchParams({
          q: query.trim(),
          invitationId: invitationId || invitationFromUrl,
          eventId: eventFromUrl,
        });
        const res = await fetch(`/api/check-in/lookup?${qs}`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        setSearchResults(Array.isArray(data?.guests) ? data.guests : []);
      } catch {
        setSearchResults([]);
      }
    }, 280);
    return () => clearTimeout(handle);
  }, [query, invitationId, invitationFromUrl, eventFromUrl, demo]);

  const openManual = (guest: GuestPreview) => {
    pauseScanner();
    setScanMethod("MANUAL");
    setError("");
    setSelected(guest);
  };

  const finishEntry = (guest: GuestPreview, quantity: number, method: "QR" | "MANUAL", table?: string) => {
    showToast({
      guestId: guest.id,
      quantity,
      table: table || tableText(guest),
      method,
    });
    setSeatPrompt(null);
    setSelected(null);
    resumeScanner(guest.id);
  };

  const readSeatPrompt = (
    guest: GuestPreview,
    actual: number,
    payload: any
  ): SeatPrompt | null => {
    const gap = payload?.seatStatus;
    if (!gap || gap.status === "match" || gap.status === "none") return null;
    if (gap.status === "over" && Number(gap.shortage) <= 0) return null;
    if (gap.status === "under" && Number(gap.surplus) <= 0) return null;
    if (gap.status !== "over" && gap.status !== "under") return null;

    return {
      guestId: guest.id,
      guestName: guest.name,
      actual,
      allocated: Number(gap.allocated || 0),
      shortage: Number(gap.shortage || 0),
      surplus: Number(gap.surplus || 0),
      status: gap.status,
      currentTable: payload?.currentTable || null,
      suggestedTables: Array.isArray(payload?.suggestedTables)
        ? payload.suggestedTables
        : [],
    };
  };

  const saveQuantity = async (rawQty: number) => {
    if (!selected || busy) return;
    const quantity = Math.floor(Number(rawQty));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("יש להזין כמות גדולה מ-0");
      return;
    }

    setBusy(true);
    setError("");
    const guest = selected;
    const method = scanMethod;
    try {
      if (demo || isDemoCheckInToken(guest.id)) {
        const result = applyDemoCheckIn(guest.id, quantity);
        if (!result.ok) {
          setError("לא ניתן לרשום את הכניסה");
          return;
        }
        setDemoGuests(readDemoCheckInState().guests);
        showToast({
          guestId: guest.id,
          quantity,
          table: tableText(guest),
          method,
        });
        resumeScanner(guest.id);
        return;
      }

      const res = await fetch("/api/check-in/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: guest.id,
          invitationId: invitationId || invitationFromUrl,
          eventId: eventFromUrl,
          quantityAdded: quantity,
          method,
          deviceSession: deviceSession(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        if (res.status === 409 && data?.error === "CONCURRENT_UPDATE") {
          setError(
            data?.message ||
              "האורח עודכן במקביל ממכשיר אחר. סרקו שוב."
          );
          if (typeof data?.currentCheckedInCount === "number") {
            setSelected({
              ...guest,
              checkedInGuestCount: data.currentCheckedInCount,
            });
          }
          return;
        }
        setError(data?.message || "שמירת הכניסה נכשלה");
        return;
      }

      const nextCount = Number(
        data.newCheckedInCount ?? data.guest?.checkedInGuestCount ?? 0
      );
      let prompt: SeatPrompt | null = null;
      try {
        const seatRes = await fetch(`/api/guests/${guest.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actualArrivedCount: nextCount,
            checkSeatOptionsOnly: true,
          }),
        });
        const seatData = await seatRes.json().catch(() => ({}));
        if (seatRes.ok && seatData?.success !== false) {
          prompt = readSeatPrompt(guest, nextCount, seatData);
        }
      } catch {
        prompt = null;
      }

      if (prompt) {
        setSelected(null);
        setSeatPrompt(prompt);
        return;
      }

      finishEntry(
        guest,
        Number(data.quantityAdded || quantity),
        method,
        tableText(data.guest || guest)
      );
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  const dismissSeatPrompt = () => {
    const current = seatPrompt;
    setSeatPrompt(null);
    if (!current) {
      resumeScanner();
      return;
    }
    showToast({
      guestId: current.guestId,
      quantity: current.actual,
      table: current.currentTable?.tableName || "ללא שולחן",
      method: scanMethod,
    });
    resumeScanner(current.guestId);
  };

  const releasePromptSeats = async () => {
    if (!seatPrompt || seatBusy) return;
    setSeatBusy(true);
    try {
      const res = await fetch(`/api/guests/${seatPrompt.guestId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualArrivedCount: seatPrompt.actual,
          syncSeatsToActual: true,
          releaseSeatsToActual: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.message || "לא הצלחנו לשחרר כיסאות");
        return;
      }
      dismissSeatPrompt();
    } catch {
      setError("לא הצלחנו לשחרר כיסאות");
    } finally {
      setSeatBusy(false);
    }
  };

  const movePromptGuest = async (table: SeatTableOption) => {
    if (!seatPrompt || seatBusy) return;
    const toTableId = String(
      table.tableId || table._id || table.id || table.tableNumber || ""
    );
    if (!eventFromUrl || !toTableId) {
      setError("חסר נתון להעברת שולחן");
      return;
    }
    setSeatBusy(true);
    try {
      const res = await fetch("/api/seating/live/move-guest-table", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventFromUrl,
          guestId: seatPrompt.guestId,
          toTableId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.message || "לא הצלחנו להעביר שולחן");
        return;
      }
      dismissSeatPrompt();
    } catch {
      setError("שגיאת רשת בהעברת שולחן");
    } finally {
      setSeatBusy(false);
    }
  };

  const claimCurrentTable = async () => {
    if (!seatPrompt || seatBusy) return;
    setSeatBusy(true);
    try {
      const res = await fetch(`/api/guests/${seatPrompt.guestId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualArrivedCount: seatPrompt.actual,
          syncSeatsToActual: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.message || "אין מספיק מקום בשולחן הנוכחי");
        return;
      }
      dismissSeatPrompt();
    } catch {
      setError("שגיאת רשת בעדכון הכיסאות");
    } finally {
      setSeatBusy(false);
    }
  };

  const undoToast = async () => {
    if (!toast) return;
    const current = toast;
    setToast(null);
    try {
      if (demo || isDemoCheckInToken(current.guestId)) {
        undoDemoCheckIn(current.guestId, current.quantity);
        setDemoGuests(readDemoCheckInState().guests);
        return;
      }
      await fetch("/api/check-in/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          undo: true,
          guestId: current.guestId,
          invitationId: invitationId || invitationFromUrl,
          eventId: eventFromUrl,
          quantityAdded: current.quantity,
          method: current.method,
          deviceSession: deviceSession(),
        }),
      });
    } catch {
      setError("לא הצלחנו לבטל את הרישום");
    }
  };

  const startLive = async () => {
    if (demo) {
      setLive(true);
      return;
    }
    setStartingLive(true);
    setError("");
    try {
      const res = await fetch("/api/check-in/live", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitationId: invitationId || invitationFromUrl,
          eventId: eventFromUrl,
          live: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setError(data?.message || "לא ניתן להפעיל מצב LIVE");
        return;
      }
      setLive(true);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setStartingLive(false);
    }
  };

  if (checkInEnabled === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm font-bold text-[#7C6A58]">
        <Loader2 className="ml-2 animate-spin" size={18} />
        טוען Check-in...
      </div>
    );
  }

  if (!checkInEnabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center" dir="rtl">
        <div className="rounded-[24px] border border-[#EADBC4] bg-[#FFFDF8] p-8 shadow-sm">
          <QrCode className="mx-auto text-[#B88A2D]" size={36} />
          <h1 className="mt-4 text-xl font-black text-[#3F3328]">
            Invistimo Check-in אינו פעיל באירוע זה
          </h1>
          <p className="mt-2 text-sm font-bold text-[#7C6A58]">
            זהו Add-on שמופעל רק על ידי צוות Invistimo.
          </p>
        </div>
      </div>
    );
  }

  if (!canScan) {
    return (
      <div
        className="mx-auto max-w-lg px-4 py-16 text-center text-sm font-bold text-[#7C6A58]"
        dir="rtl"
      >
        אין הרשאה לסריקת כניסה
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6" dir="rtl">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-[#3F3328]">כניסה לאירוע</h1>
        <p className="mt-1 text-sm font-bold text-[#7C6A58]">
          המצלמה נשארת פתוחה. בחירת כמות שומרת מיד ומוכנה לאורח הבא.
        </p>
      </div>

      {!live && (
        <section className="mb-5 rounded-[24px] border border-[#EADBC4] bg-[#FFFDF8] p-6 text-center shadow-sm">
          <h2 className="text-lg font-black text-[#3F3328]">
            הסריקה נפתחת רק במצב LIVE
          </h2>
          <p className="mt-2 text-sm font-bold text-[#7C6A58]">
            אפשר להכין QR מראש. כניסה בפועל נרשמת רק כשהאירוע LIVE.
          </p>
          {canManage ? (
            <button
              type="button"
              onClick={() => void startLive()}
              disabled={startingLive}
              className="mt-4 inline-flex items-center justify-center rounded-[14px] bg-[#B85C3A] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {startingLive ? "מפעיל..." : "הפעלת מצב LIVE"}
            </button>
          ) : (
            <p className="mt-3 text-sm font-bold text-[#8A7A68]">
              המארחת תוכל לסרוק ברגע שבעל האירוע יעביר את האירוע ל-LIVE.
            </p>
          )}
        </section>
      )}

      {error && !selected && (
        <div className="mb-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
          {error}
        </div>
      )}

      {demo && demoReady && (
        <section className="mb-5 rounded-[24px] border border-[#EADBC4] bg-[#FFFDF8] p-4 text-sm font-bold text-[#5A4635]">
          <p className="font-black text-[#3F3328]">אורחי בדיקה</p>
          <ul className="mt-3 space-y-2">
            {demoGuests.map((guest) => (
              <li
                key={guest.token}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {guest.name} · הגיעו {guest.checkedInGuestCount} / אישרו{" "}
                  {guest.confirmedGuestCount}
                </span>
                <button
                  type="button"
                  onClick={() => openManual(serializeDemoGuest(guest) as GuestPreview)}
                  className="text-xs font-black text-[#B88A2D] underline"
                >
                  סימון כניסה
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {live && (
        <section className="rounded-[24px] border border-[#EADBC4] bg-[#FFFDF8] p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#3F3328]">
            <Camera size={18} className="text-[#B88A2D]" />
            סורק QR
          </div>
          <div
            id={scannerBoxId}
            className="min-h-[280px] overflow-hidden rounded-[18px] bg-black/80"
          />
          {!scanning && (
            <button
              type="button"
              onClick={() => void startScanner()}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#2F6B4F] px-4 py-3 text-sm font-black text-white"
            >
              <Camera size={16} />
              פתיחת מצלמה
            </button>
          )}
        </section>
      )}

      {live && (
        <section className="mt-5 rounded-[24px] border border-[#EADBC4] bg-[#FFFDF8] p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#3F3328]">
            <Search size={18} className="text-[#B88A2D]" />
            חיפוש ידני
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="שם או טלפון..."
            className="w-full rounded-[14px] border border-[#E3D6C3] bg-white px-4 py-3 text-sm font-bold text-[#241A14] outline-none focus:border-[#B88A2D]"
          />
          {searchResults.length > 0 && (
            <ul className="mt-3 divide-y divide-[#F0E6D8] rounded-[16px] border border-[#EADBC4] bg-white">
              {searchResults.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => openManual(g)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition hover:bg-[#FBF7F0]"
                  >
                    <div>
                      <p className="text-sm font-black text-[#241A14]">{g.name}</p>
                      <p className="text-xs font-bold text-[#8A7A68]">
                        {g.phone || "—"} · {tableText(g)}
                      </p>
                    </div>
                    <span className="text-xs font-black text-[#5A4635]">
                      {g.checkedInGuestCount}/{g.confirmedGuestCount}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35">
          <div className="w-full max-w-md rounded-t-[28px] border border-[#EADBC4] bg-[#FFFDF8] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-xl font-black text-[#241A14]">{selected.name}</h2>
              <button
                type="button"
                onClick={() => resumeScanner(selected.id)}
                className="rounded-full border border-[#E3D6C3] bg-white p-2 text-[#5A4635]"
                aria-label="סגור"
              >
                <X size={16} />
              </button>
            </div>

            <dl className="space-y-2 text-sm font-bold text-[#5A4635]">
              <div className="flex items-center justify-between">
                <dt>אישרו מראש</dt>
                <dd className="font-black text-[#241A14]">
                  {selected.confirmedGuestCount}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>הגיעו בפועל עד עכשיו</dt>
                <dd className="font-black text-[#241A14]">
                  {selected.checkedInGuestCount}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>שולחן</dt>
                <dd className="font-black text-[#241A14]">{tableText(selected)}</dd>
              </div>
            </dl>

            <p className="mt-4 text-sm font-black text-[#241A14]">
              כמה הגיעו עכשיו?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={busy}
                  onClick={() => void saveQuantity(n)}
                  className="h-12 w-12 rounded-full border border-[#E3D6C3] bg-white text-base font-black text-[#3F3328] transition hover:bg-[#2F6B4F] hover:text-white disabled:opacity-50"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={() => setCustomOpen(true)}
                className="h-12 rounded-full border border-[#E3D6C3] bg-[#F8EEDB] px-4 text-sm font-black text-[#3F3328]"
              >
                כמות אחרת
              </button>
            </div>

            {customOpen && (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveQuantity(Number(customValue));
                }}
              >
                <input
                  inputMode="numeric"
                  enterKeyHint="done"
                  value={customValue}
                  onChange={(event) =>
                    setCustomValue(event.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="מספר"
                  className="w-full rounded-[14px] border border-[#E3D6C3] bg-white px-4 py-3 text-sm font-black outline-none focus:border-[#B88A2D]"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={busy || !customValue}
                  className="rounded-[14px] bg-[#2F6B4F] px-4 text-sm font-black text-white disabled:opacity-40"
                >
                  {customValue || "—"}
                </button>
              </form>
            )}

            {error && (
              <p className="mt-3 text-sm font-bold text-rose-700">{error}</p>
            )}
            {busy && (
              <p className="mt-3 flex items-center gap-2 text-sm font-bold text-[#7C6A58]">
                <Loader2 className="animate-spin" size={14} />
                שומר...
              </p>
            )}
          </div>
        </div>
      )}

      {seatPrompt && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-[#EADBC4] bg-[#FFFDF8] p-5 shadow-2xl">
            {seatPrompt.status === "over" ? (
              <>
                <h2 className="text-xl font-black text-[#241A14]">
                  הגיעו {seatPrompt.shortage} אורחים יותר ממספר המקומות שהוקצו
                </h2>
                <p className="mt-2 text-sm font-black text-[#6B451E]">
                  חסרים {seatPrompt.shortage} מקומות
                </p>
                <p className="mt-1 text-sm font-bold text-[#7C6A58]">
                  {seatPrompt.guestName} · הגיעו בפועל {seatPrompt.actual} · הוקצו{" "}
                  {seatPrompt.allocated} כיסאות
                </p>
                {seatPrompt.currentTable?.canFit && (
                  <button
                    type="button"
                    disabled={seatBusy}
                    onClick={() => void claimCurrentTable()}
                    className="mt-4 w-full rounded-[16px] bg-[#2F6B4F] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    אשר תפיסת כיסאות בשולחן הנוכחי
                    {seatPrompt.currentTable.tableName
                      ? ` · ${seatPrompt.currentTable.tableName}`
                      : ""}
                  </button>
                )}
                <ul className="mt-4 space-y-2">
                  {seatPrompt.suggestedTables.map((table, index) => {
                    const label =
                      table.tableName ||
                      table.name ||
                      `שולחן ${table.tableNumber || index + 1}`;
                    return (
                      <li key={String(table.tableId || table._id || label)}>
                        <button
                          type="button"
                          disabled={seatBusy}
                          onClick={() => void movePromptGuest(table)}
                          className="flex w-full items-center justify-between rounded-[16px] border border-[#EADBC4] bg-white px-4 py-3 text-right disabled:opacity-50"
                        >
                          <span className="text-sm font-black text-[#241A14]">
                            {label}
                          </span>
                          <span className="text-xs font-black text-[#2F6B4F]">
                            {table.freeSeats ?? "-"} מקומות פנויים
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={dismissSeatPrompt}
                  className="mt-4 w-full rounded-[16px] border border-[#E3D6C3] bg-white px-4 py-3 text-sm font-black text-[#5A4635]"
                >
                  לא עכשיו
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-black text-[#241A14]">
                  הגיעו {seatPrompt.surplus} אורחים פחות מהכמות שהוקצתה
                </h2>
                <p className="mt-3 text-base font-black text-[#6B451E]">
                  שחרור {seatPrompt.surplus} כיסאות?
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    disabled={seatBusy}
                    onClick={() => void releasePromptSeats()}
                    className="flex-1 rounded-[16px] bg-[#1E1B2E] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    שחרור כיסאות
                  </button>
                  <button
                    type="button"
                    onClick={dismissSeatPrompt}
                    className="flex-1 rounded-[16px] border border-[#E3D6C3] bg-white px-4 py-3 text-sm font-black text-[#5A4635]"
                  >
                    לא עכשיו
                  </button>
                </div>
              </>
            )}
            {error && (
              <p className="mt-3 text-sm font-bold text-rose-700">{error}</p>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-4 right-4 z-[60] mx-auto flex max-w-md items-center justify-between gap-3 rounded-[18px] bg-[#2F6B4F] px-4 py-3 text-white shadow-xl">
          <div>
            <p className="flex items-center gap-2 text-sm font-black">
              <Check size={16} />
              הכניסה נרשמה
            </p>
            <p className="mt-1 text-sm font-bold">
              {toast.quantity} אורחים · {toast.table}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void undoToast()}
            className="rounded-full bg-white/15 px-3 py-2 text-xs font-black"
          >
            ביטול
          </button>
        </div>
      )}
    </div>
  );
}
