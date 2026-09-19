"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera,
  Search,
  QrCode,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { userCanEditCheckIn, userCanScanCheckIn } from "@/lib/checkIn/permissions";

type GuestPreview = {
  id: string;
  name: string;
  phone: string;
  rsvp: string;
  confirmedGuestCount: number;
  checkedInGuestCount: number;
  remaining: number;
  tableNumber: number | null;
  tableName: string;
  status: string;
};

export default function CheckInPage() {
  const { user } = useAuth();
  const canScan = userCanScanCheckIn(user as any);
  const canOverride = userCanEditCheckIn(user as any);

  const [checkInEnabled, setCheckInEnabled] = useState<boolean | null>(null);
  const [invitationId, setInvitationId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [continuous, setContinuous] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GuestPreview[]>([]);
  const [selected, setSelected] = useState<GuestPreview | null>(null);
  const [scanMethod, setScanMethod] = useState<"QR" | "MANUAL">("QR");
  const [quantity, setQuantity] = useState(1);
  const [overrideConfirm, setOverrideConfirm] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ token: string; at: number }>({ token: "", at: 0 });
  const scannerBoxId = "invistimo-checkin-scanner";

  const remainingOptions = useMemo(() => {
    if (!selected) return [];
    const rem = Math.max(0, selected.remaining);
    if (rem <= 0 && canOverride) {
      return [1];
    }
    return Array.from({ length: rem }, (_, i) => i + 1);
  }, [selected, canOverride]);

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/check-in/summary", {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCheckInEnabled(false);
      setError(data?.error === "CHECKIN_DISABLED" ? "" : data?.message || "אין גישה");
      return;
    }
    setCheckInEnabled(Boolean(data.checkInEnabled));
    setInvitationId(String(data.invitationId || ""));
  }, []);

  useEffect(() => {
    loadSummary().catch(() => setCheckInEnabled(false));
  }, [loadSummary]);

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

  const openGuest = useCallback((guest: GuestPreview, method: "QR" | "MANUAL" = "MANUAL") => {
    setSelected(guest);
    setScanMethod(method);
    const rem = Math.max(0, guest.remaining);
    setQuantity(rem > 0 ? 1 : 0);
    setOverrideConfirm(false);
    setError("");
  }, []);

  const lookupToken = useCallback(
    async (raw: string) => {
      const now = Date.now();
      if (
        lastScanRef.current.token === raw &&
        now - lastScanRef.current.at < 2500
      ) {
        return;
      }
      lastScanRef.current = { token: raw, at: now };

      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/check-in/lookup", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: raw, invitationId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.guest) {
          setError(
            data?.error === "GUEST_NOT_FOUND"
              ? "QR לא מזוהה באירוע זה"
              : "סריקה נכשלה"
          );
          return;
        }
        openGuest(data.guest as GuestPreview, "QR");
        if (!continuous) await stopScanner();
      } catch {
        setError("שגיאת רשת");
      } finally {
        setBusy(false);
      }
    },
    [invitationId, continuous, openGuest, stopScanner]
  );

  const startScanner = useCallback(async () => {
    if (!canScan) return;
    setError("");
    await stopScanner();
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
  }, [canScan, lookupToken, stopScanner]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({
          q: query.trim(),
          invitationId,
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
  }, [query, invitationId]);

  const confirmEntry = async () => {
    if (!selected || quantity <= 0) return;
    setBusy(true);
    setError("");
    try {
      const needsOverride = quantity > selected.remaining;
      const res = await fetch("/api/check-in/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: selected.id,
          invitationId,
          quantityAdded: quantity,
          method: scanMethod,
          allowOverride: needsOverride && overrideConfirm && canOverride,
          deviceSession:
            typeof window !== "undefined"
              ? window.sessionStorage.getItem("invistimo.checkin.session") ||
                (() => {
                  const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                  window.sessionStorage.setItem("invistimo.checkin.session", id);
                  return id;
                })()
              : null,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data?.error === "CONCURRENT_UPDATE") {
        setError(
          data?.message ||
            "האורח עודכן במקביל. רעננו ובחרו שוב כמה נוספים הגיעו."
        );
        if (typeof data?.currentCheckedInCount === "number" && selected) {
          setSelected({
            ...selected,
            checkedInGuestCount: data.currentCheckedInCount,
            remaining: Math.max(
              0,
              selected.confirmedGuestCount - data.currentCheckedInCount
            ),
          });
        }
        return;
      }

      if (res.status === 409 && data?.error === "EXCEEDS_CONFIRMED") {
        if (canOverride) {
          setOverrideConfirm(true);
          setError("הכמות גבוהה מהמאושרים. אשר דריסת מגבלה להמשך.");
        } else {
          setError("לא ניתן לסמן יותר מהמאושרים");
        }
        return;
      }

      if (!res.ok || !data?.success) {
        setError(data?.message || "אישור כניסה נכשל");
        return;
      }

      setToast(`עודכן: ${data.guest.name}`);
      setSelected(null);
      setOverrideConfirm(false);
      setTimeout(() => setToast(""), 2500);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  if (checkInEnabled === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm font-bold text-[#7C6A58]">
        <Loader2 className="mr-2 animate-spin" size={18} />
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
            Check-in כבוי לאירוע זה
          </h1>
          <p className="mt-2 text-sm font-bold text-[#7C6A58]">
            הפעילו את Invistimo Check-in בהגדרות האירוע כדי לפתוח סריקת QR.
          </p>
        </div>
      </div>
    );
  }

  if (!canScan) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm font-bold text-[#7C6A58]" dir="rtl">
        אין הרשאה לסריקת כניסה
      </div>
    );
  }

  const alreadyIn = selected ? selected.checkedInGuestCount : 0;
  const confirmed = selected ? selected.confirmedGuestCount : 0;
  const question =
    selected && alreadyIn > 0
      ? "כמה נוספים הגיעו עכשיו?"
      : "כמה הגיעו עכשיו?";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6" dir="rtl">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-[#3F3328]">כניסה לאירוע</h1>
        <p className="mt-1 text-sm font-bold text-[#7C6A58]">
          סריקת QR רציפה או חיפוש ידני — סימון כמות נכנסים בלבד
        </p>
      </div>

      {toast && (
        <div className="mb-4 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
          {toast}
        </div>
      )}
      {error && !selected && (
        <div className="mb-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-[24px] border border-[#EADBC4] bg-[#FFFDF8] p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-black text-[#3F3328]">
            <Camera size={18} className="text-[#B88A2D]" />
            סורק QR
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-[#5A4635]">
            <input
              type="checkbox"
              checked={continuous}
              onChange={(e) => setContinuous(e.target.checked)}
              className="rounded border-[#E3D6C3]"
            />
            סריקה רציפה
          </label>
        </div>

        <div
          id={scannerBoxId}
          className="overflow-hidden rounded-[18px] bg-black/5 min-h-[240px]"
        />

        <div className="mt-3 flex gap-2">
          {!scanning ? (
            <button
              type="button"
              onClick={() => void startScanner()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#2F6B4F] px-4 py-3 text-sm font-black text-white transition hover:bg-[#25563F]"
            >
              <Camera size={16} />
              פתיחת מצלמה
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void stopScanner()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[14px] border border-[#E3D6C3] bg-white px-4 py-3 text-sm font-black text-[#5A4635]"
            >
              עצירת מצלמה
            </button>
          )}
        </div>
      </section>

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
                  onClick={() => openGuest(g, "MANUAL")}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition hover:bg-[#FBF7F0]"
                >
                  <div>
                    <p className="text-sm font-black text-[#241A14]">{g.name}</p>
                    <p className="text-xs font-bold text-[#8A7A68]">
                      {g.phone || "—"} · שולחן {g.tableName || g.tableNumber || "—"}
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

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-[28px] border border-[#EADBC4] bg-[#FFFDF8] p-5 shadow-2xl sm:rounded-[28px]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-[#B88A2D]">שם ההזמנה</p>
                <h2 className="text-xl font-black text-[#241A14]">{selected.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full border border-[#E3D6C3] bg-white p-2 text-[#5A4635]"
                aria-label="סגור"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm font-bold text-[#5A4635]">
              <div className="rounded-[16px] border border-[#EADBC4] bg-white p-3">
                <p className="text-[11px] text-[#8A7A68]">אישרו הגעה</p>
                <p className="mt-1 text-lg font-black text-[#241A14]">{confirmed}</p>
              </div>
              <div className="rounded-[16px] border border-[#EADBC4] bg-white p-3">
                <p className="text-[11px] text-[#8A7A68]">שולחן</p>
                <p className="mt-1 text-lg font-black text-[#241A14]">
                  {selected.tableName || selected.tableNumber || "—"}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm font-black text-[#3F3328]">
              הגיעו עד עכשיו: {alreadyIn} מתוך {confirmed}
            </p>

            <p className="mt-4 text-sm font-black text-[#241A14]">{question}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(remainingOptions.length
                ? remainingOptions
                : canOverride
                  ? [1]
                  : []
              ).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuantity(n)}
                  className={`h-12 w-12 rounded-full border text-base font-black transition ${
                    quantity === n
                      ? "border-[#2F6B4F] bg-[#2F6B4F] text-white"
                      : "border-[#E3D6C3] bg-white text-[#3F3328] hover:bg-[#F8EEDB]"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {overrideConfirm && (
              <label className="mt-4 flex items-start gap-2 rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-bold text-amber-900">
                <input
                  type="checkbox"
                  checked={overrideConfirm}
                  onChange={(e) => setOverrideConfirm(e.target.checked)}
                  className="mt-0.5"
                />
                אני מאשר/ת דריסת מגבלת המאושרים לכניסה זו
              </label>
            )}

            {error && (
              <p className="mt-3 text-sm font-bold text-rose-700">{error}</p>
            )}

            <button
              type="button"
              disabled={busy || quantity <= 0}
              onClick={() => void confirmEntry()}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#2F6B4F] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#25563F] disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Check size={16} />
              )}
              אישור כניסה
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
