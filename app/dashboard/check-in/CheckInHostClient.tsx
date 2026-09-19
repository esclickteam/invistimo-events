"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, Check, Loader2, QrCode, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { userCanScanCheckIn } from "@/lib/checkIn/permissions";
import {
  formatTableLabel,
  hostRemainingOptions,
  hostScanIsFullyArrived,
} from "@/lib/checkIn/guestPassState";
import {
  applyDemoCheckIn,
  DEMO_CHECKIN_CHANNEL,
  DEMO_CHECKIN_STORAGE_KEY,
  isDemoCheckInToken,
  readDemoCheckInState,
  serializeDemoGuest,
  type DemoCheckInGuest,
} from "@/lib/checkIn/demoCheckIn";

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

type Phase = "scan" | "guest" | "already" | "confirmed";

type Props = {
  demo?: boolean;
};

function tableText(guest: GuestPreview) {
  return formatTableLabel(guest) || "—";
}

export default function CheckInHostClient({ demo = false }: Props) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const canScan = demo || userCanScanCheckIn(user as any);
  const invitationFromUrl = demo ? "" : searchParams.get("invitationId") || "";
  const eventFromUrl = demo ? "" : searchParams.get("eventId") || "";

  const [checkInEnabled, setCheckInEnabled] = useState<boolean | null>(
    demo ? true : null
  );
  const [invitationId, setInvitationId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GuestPreview[]>([]);
  const [selected, setSelected] = useState<GuestPreview | null>(null);
  const [scanMethod, setScanMethod] = useState<"QR" | "MANUAL">("QR");
  const [quantity, setQuantity] = useState(1);
  const [phase, setPhase] = useState<Phase>("scan");
  const [confirmedQty, setConfirmedQty] = useState(0);
  const [demoReady, setDemoReady] = useState(false);
  const [demoGuests, setDemoGuests] = useState<DemoCheckInGuest[]>([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ token: string; at: number }>({ token: "", at: 0 });
  const resumeCameraRef = useRef(false);
  const scannerBoxId = "invistimo-checkin-scanner";

  const remainingOptions = useMemo(
    () =>
      selected
        ? hostRemainingOptions(
            selected.confirmedGuestCount,
            selected.checkedInGuestCount
          )
        : [],
    [selected]
  );

  const loadSummary = useCallback(async () => {
    if (demo) {
      setCheckInEnabled(true);
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
      setError(data?.error === "CHECKIN_DISABLED" ? "" : data?.message || "אין גישה");
      return;
    }
    setCheckInEnabled(Boolean(data.checkInEnabled));
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

  const openGuest = useCallback(
    async (guest: GuestPreview, method: "QR" | "MANUAL" = "MANUAL") => {
      resumeCameraRef.current = scanning || resumeCameraRef.current;
      await stopScanner();
      setSelected(guest);
      setScanMethod(method);
      setError("");
      if (
        hostScanIsFullyArrived(
          guest.confirmedGuestCount,
          guest.checkedInGuestCount
        )
      ) {
        setPhase("already");
        setQuantity(0);
        return;
      }
      const options = hostRemainingOptions(
        guest.confirmedGuestCount,
        guest.checkedInGuestCount
      );
      setQuantity(options[0] || 0);
      setPhase("guest");
    },
    [scanning, stopScanner]
  );

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
        if (demo || isDemoCheckInToken(raw)) {
          const guest = readDemoCheckInState().guests.find(
            (item) => item.token === raw
          );
          if (!guest) {
            setError("QR לא מזוהה באירוע זה");
            return;
          }
          await openGuest(serializeDemoGuest(guest) as GuestPreview, "QR");
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
            data?.error === "GUEST_NOT_FOUND"
              ? "QR לא מזוהה באירוע זה"
              : "סריקה נכשלה"
          );
          return;
        }
        await openGuest(data.guest as GuestPreview, "QR");
      } catch {
        setError("שגיאת רשת");
      } finally {
        setBusy(false);
      }
    },
    [demo, invitationId, invitationFromUrl, eventFromUrl, openGuest]
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

  const returnToScanner = useCallback(async () => {
    setSelected(null);
    setPhase("scan");
    setError("");
    if (resumeCameraRef.current) {
      resumeCameraRef.current = false;
      await startScanner();
    }
  }, [startScanner]);

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

  const confirmEntry = async () => {
    if (!selected || quantity <= 0) return;
    setBusy(true);
    setError("");
    try {
      if (demo || isDemoCheckInToken(selected.id)) {
        const result = applyDemoCheckIn(selected.id, quantity);
        if (!result.ok) {
          setError("לא ניתן לסמן יותר מהמאושרים");
          return;
        }
        setConfirmedQty(result.quantityAdded);
        setDemoGuests(readDemoCheckInState().guests);
        setSelected({
          ...selected,
          checkedInGuestCount: result.newCheckedInCount,
          remaining: Math.max(
            0,
            selected.confirmedGuestCount - result.newCheckedInCount
          ),
        });
        setPhase("confirmed");
        window.setTimeout(() => {
          void returnToScanner();
        }, 1600);
        return;
      }

      const res = await fetch("/api/check-in/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: selected.id,
          invitationId: invitationId || invitationFromUrl,
          eventId: eventFromUrl,
          quantityAdded: quantity,
          method: scanMethod,
          allowOverride: false,
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

      if (res.status === 409 && data?.error === "ALREADY_CHECKED_IN") {
        if (data?.guest) setSelected(data.guest as GuestPreview);
        setPhase("already");
        return;
      }

      if (res.status === 409 && data?.error === "EXCEEDS_CONFIRMED") {
        setError("לא ניתן לסמן יותר מהמאושרים");
        return;
      }

      if (!res.ok || !data?.success) {
        setError(data?.message || "אישור כניסה נכשל");
        return;
      }

      setConfirmedQty(Number(data.quantityAdded || quantity));
      setSelected({
        ...selected,
        ...(data.guest || {}),
      });
      setPhase("confirmed");
      window.setTimeout(() => {
        void returnToScanner();
      }, 1600);
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
          סריקה → הרשומה של האורח בלבד → בחירת כמות → אישור
        </p>
      </div>

      {error && phase === "scan" && (
        <div className="mb-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
          {error}
        </div>
      )}

      {demo && demoReady && (
        <section className="mb-5 rounded-[24px] border border-[#EADBC4] bg-[#FFFDF8] p-4 text-sm font-bold text-[#5A4635]">
          <p className="font-black text-[#3F3328]">אורחי בדיקה</p>
          <ul className="mt-3 space-y-2">
            {demoGuests.map((guest) => (
              <li key={guest.token} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {guest.name} · {guest.checkedInGuestCount}/{guest.confirmedGuestCount}
                </span>
                <a
                  href={`/try/check-in/pass/${guest.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-black text-[#B88A2D] underline"
                >
                  עמוד האורח
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-[24px] border border-[#EADBC4] bg-[#FFFDF8] p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#3F3328]">
          <Camera size={18} className="text-[#B88A2D]" />
          סורק QR
        </div>

        <div
          id={scannerBoxId}
          className="min-h-[240px] overflow-hidden rounded-[18px] bg-black/5"
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
                  onClick={() => void openGuest(g, "MANUAL")}
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

      {selected && phase !== "scan" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-[28px] border border-[#EADBC4] bg-[#FFFDF8] p-5 shadow-2xl sm:rounded-[28px]">
            {phase === "confirmed" ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#2F6B4F] text-white">
                  <Check size={28} />
                </div>
                <h2 className="mt-4 text-xl font-black text-[#241A14]">
                  הכניסה אושרה
                </h2>
                <p className="mt-2 text-sm font-bold text-[#5A4635]">
                  {confirmedQty} אורחים
                </p>
                <p className="mt-1 text-sm font-black text-[#241A14]">
                  {tableText(selected)}
                </p>
              </div>
            ) : phase === "already" ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-[#B88A2D]">
                      האורחים כבר נכנסו
                    </p>
                    <h2 className="text-xl font-black text-[#241A14]">
                      {selected.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void returnToScanner()}
                    className="rounded-full border border-[#E3D6C3] bg-white p-2 text-[#5A4635]"
                    aria-label="סגור"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-sm font-black text-[#3F3328]">
                  {alreadyIn} מתוך {confirmed} נכנסו
                </p>
                <p className="mt-2 text-sm font-bold text-[#5A4635]">
                  {tableText(selected)}
                </p>
                <button
                  type="button"
                  onClick={() => void returnToScanner()}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-[16px] bg-[#241A14] px-4 py-3.5 text-sm font-black text-white"
                >
                  המשך לסריקה הבאה
                </button>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-[#B88A2D]">שם ההזמנה</p>
                    <h2 className="text-xl font-black text-[#241A14]">
                      {selected.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void returnToScanner()}
                    className="rounded-full border border-[#E3D6C3] bg-white p-2 text-[#5A4635]"
                    aria-label="סגור"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm font-bold text-[#5A4635]">
                  <div className="rounded-[16px] border border-[#EADBC4] bg-white p-3">
                    <p className="text-[11px] text-[#8A7A68]">אישרו הגעה</p>
                    <p className="mt-1 text-lg font-black text-[#241A14]">
                      {confirmed}
                    </p>
                  </div>
                  <div className="rounded-[16px] border border-[#EADBC4] bg-white p-3">
                    <p className="text-[11px] text-[#8A7A68]">שולחן</p>
                    <p className="mt-1 text-lg font-black text-[#241A14]">
                      {tableText(selected)}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm font-black text-[#3F3328]">
                  {alreadyIn > 0
                    ? `כבר הגיעו: ${alreadyIn} מתוך ${confirmed}`
                    : `כבר נכנסו בפועל: ${alreadyIn}`}
                </p>

                <p className="mt-4 text-sm font-black text-[#241A14]">{question}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {remainingOptions.map((n) => (
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
