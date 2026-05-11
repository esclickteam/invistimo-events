"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import SeatingEditor from "./SeatingEditor";
import UploadBackgroundModal from "./UploadBackgroundModal";
import UpgradePlanModal from "./UpgradePlanModal";
import MobileGuests from "./MobileGuests";
import SeatingSidebar from "./SeatingSidebar";
import ExportSeatingPdf from "./ExportSeatingPdf";

import ZonesToolbar from "@/app/components/zones/ZonesToolbar";

import { useAuth } from "@/context/AuthContext";
import { useSeatingStore } from "@/store/seatingStore";
import { useZoneStore } from "@/store/zoneStore";

/* ===============================
   TYPES
=============================== */
type GuestDTO = {
  _id: string;
  name: string;
  guestsCount?: number;
  arrivedCount?: number;
  actualArrivedCount?: number;
  rsvp?: "yes" | "no" | "pending";
  groupId?: string | null;
};

type TableLite = {
  x: number;
  y: number;
};

export default function SeatingPage() {
  const pathname = usePathname();
  const isProducer = pathname.includes("/events/production");
  const isDemo = pathname.startsWith("/try/");

  const didLoadRef = useRef(false);
  const didFinishInitialLoadRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ===============================
     LOCAL STATE
  =============================== */
  const [showUpload, setShowUpload] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showGuests, setShowGuests] = useState(false);

  const [eventId, setEventId] = useState<string | null>(null);
  const [invitationId, setInvitationId] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [blockReason, setBlockReason] = useState<"no-plan" | null>(null);

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);

  const [showSmartPanel, setShowSmartPanel] = useState(false);
  const [isSmartSeating, setIsSmartSeating] = useState(false);
  const [isClearingSmartSeating, setIsClearingSmartSeating] = useState(false);

  /* ===============================
     STORES
  =============================== */
  const { user } = useAuth();

  const init = useSeatingStore((s) => s.init);
  const tables = useSeatingStore((s) => s.tables);

  const setGroups = useSeatingStore((s) => s.setGroups);
  const setShowAddModal = useSeatingStore((s) => s.setShowAddModal);

  const background = useSeatingStore((s) => s.background);
  const setBackground = useSeatingStore((s) => s.setBackground);

  const canvasView = useSeatingStore((s) => s.canvasView);
  const setCanvasView = useSeatingStore((s) => s.setCanvasView);

  const setSeatingMode = useSeatingStore((s) => s.setSeatingMode);

  const setZones = useZoneStore((s) => s.setZones);

  const tablesLite = tables as unknown as TableLite[];

  /* ===============================
     RESPONSIVE SIDEBAR
  =============================== */
  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 768;

      setIsMobile(mobile);

      if (mobile) {
        setSidebarOpen(false);
      }
    };

    update();

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* ===============================
     PLAN BLOCK
  =============================== */
  useEffect(() => {
    if (!user) return;

    if (user.role === "producer" || user.impersonated) {
      return;
    }

    if (user.planLimits?.seatingEnabled !== true) {
      setBlockReason("no-plan");
    }
  }, [user]);

  /* ===============================
     PRODUCER LIVE MODE
  =============================== */
  useEffect(() => {
    if (!isProducer) return;

    console.log("🔥 ENABLE LIVE MODE (SEATING)");
    setSeatingMode("live");
  }, [isProducer, setSeatingMode]);

  /* ===============================
     LOAD SEATING DATA
  =============================== */
  const loadSeatingData = useCallback(
    async (eventIdToLoad: string, invitationIdToLoad: string) => {
      const gRes = await fetch(`/api/seating/guests/${eventIdToLoad}`, {
        cache: "no-store",
      });

      if (gRes.status === 403) {
        setBlockReason("no-plan");
        return false;
      }

      const gData = await gRes.json();

      const normalizedGuests = (gData.guests || []).map((g: GuestDTO) => ({
        id: g._id,
        name: g.name,
        rsvp: g.rsvp,
        guestsCount: g.guestsCount,
        arrivedCount: g.arrivedCount,
        actualArrivedCount: g.actualArrivedCount ?? 0,
        groupId: g.groupId ?? null,
        count: g.guestsCount ?? 1,
      }));

      const tRes = await fetch(`/api/seating/tables/${eventIdToLoad}`, {
        cache: "no-store",
      });

      if (tRes.status === 403) {
        setBlockReason("no-plan");
        return false;
      }

      const tData = await tRes.json();

      init(
        tData.tables || [],
        normalizedGuests,
        tData.background ?? null,
        tData.canvasView ?? null
      );

      setZones(tData.zones || []);

      const grRes = await fetch(`/api/seating/groups/${invitationIdToLoad}`, {
        cache: "no-store",
      });

      if (grRes.ok) {
        const grData = await grRes.json();
        setGroups(grData.groups || []);
      }

      return true;
    },
    [init, setGroups, setZones]
  );

  /* ===============================
     LOAD INITIAL DATA
  =============================== */
  useEffect(() => {
    if (isDemo) return;

    if (didLoadRef.current) return;
    didLoadRef.current = true;

    async function load() {
      try {
        const seatingState = useSeatingStore.getState();

        const hasTables =
          seatingState.tables && seatingState.tables.length > 0;

        if (!hasTables) {
          seatingState.init([], [], null, null);
          useZoneStore.getState().setZones([]);
        }

        const invRes = await fetch("/api/invitations/my", {
          cache: "no-store",
        });

        const invData = await invRes.json();

        const invitationIdFromApi: string | undefined =
          invData?.invitation?._id;

        const eventIdFromApi: string | undefined =
          invData?.invitation?.eventId;

        if (!invitationIdFromApi || !eventIdFromApi) {
          console.error("❌ Missing invitation/event id", invData);
          return;
        }

        setInvitationId(invitationIdFromApi);
        setEventId(eventIdFromApi);

        await loadSeatingData(eventIdFromApi, invitationIdFromApi);
      } catch (err) {
        console.error("❌ SeatingPage load error:", err);
      } finally {
        didFinishInitialLoadRef.current = true;
      }
    }

    load();
  }, [isDemo, loadSeatingData]);

  /* ===============================
     AUTO FIT ONE TIME
  =============================== */
  useEffect(() => {
    if (!tablesLite?.length) return;

    const isDefault =
      !canvasView ||
      (canvasView.scale === 1 && canvasView.x === 0 && canvasView.y === 0);

    if (!isDefault) return;

    const minX = Math.min(...tablesLite.map((t) => t.x));
    const maxX = Math.max(...tablesLite.map((t) => t.x));
    const minY = Math.min(...tablesLite.map((t) => t.y));
    const maxY = Math.max(...tablesLite.map((t) => t.y));

    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);

    const PAD = 420;
    const VIEW_W = 1200;
    const VIEW_H = 700;

    const scale = Math.max(
      0.4,
      Math.min(
        3,
        Math.min(VIEW_W / (contentW + PAD), VIEW_H / (contentH + PAD))
      )
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const x = VIEW_W / 2 - centerX * scale;
    const y = VIEW_H / 2 - centerY * scale;

    console.log("🟣 AutoFit canvasView:", { x, y, scale });

    setCanvasView({ x, y, scale });
  }, [tablesLite, canvasView, setCanvasView]);

  /* ===============================
     BACKGROUND
  =============================== */
  const handleBackgroundSelect = (bgUrl: string) => {
    if (!bgUrl) return;

    setBackground({
      url: bgUrl,
      opacity: 0.28,
    });
  };

  /* ===============================
     DRAG HANDLER
  =============================== */
  const handleDragStart = (guest: any) => {
    useSeatingStore.getState().startDragGuest(guest);
  };

  /* ===============================
     SAVE
  =============================== */
  const saveSeating = useCallback(
    async (showToast = true): Promise<boolean> => {
      if (!eventId || !invitationId) {
        if (showToast) alert("❌ חסר invitationId או eventId");
        return false;
      }

      try {
        const zones = useZoneStore.getState().zones;
        const cv = useSeatingStore.getState().canvasView;

        const res = await fetch(`/api/seating/save/${eventId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId,
            invitationId,
            tables: useSeatingStore.getState().tables,
            guests: useSeatingStore.getState().guests,
            groups: useSeatingStore.getState().groups,
            background: useSeatingStore.getState().background,
            zones,
            canvasView: cv,
          }),
        });

        const data = await res.json().catch(() => ({}));
        const ok = res.ok && data?.success;

        if (showToast) {
          alert(ok ? "🎉 נשמר בהצלחה" : "❌ שגיאה בשמירה");
        }

        return !!ok;
      } catch (e) {
        console.error("❌ Seating save network error:", e);

        if (showToast) {
          alert("❌ שגיאת רשת בשמירה");
        }

        return false;
      }
    },
    [eventId, invitationId]
  );

  /* ===============================
     SMART SEATING BY GROUPS
  =============================== */
  const handleSmartSeatByGroups = useCallback(async () => {
    if (!eventId || !invitationId) {
      alert("❌ חסר eventId או invitationId");
      return;
    }

    if (isSmartSeating) return;

    const ok = window.confirm(
      "המערכת תושיב מחדש רק את האורחים שאישרו הגעה, לפי קבוצות ומקומות פנויים בשולחנות.\n\n" +
        "שימי לב: פעולה זו עשויה להחליף את ההושבה הקיימת.\n" +
        "לאחר מכן עדיין אפשר לגרור אורחים, להסיר אורחים משולחנות ולשנות הכל ידנית.\n\n" +
        "להמשיך?"
    );

    if (!ok) return;

    try {
      setIsSmartSeating(true);

      const res = await fetch(`/api/seating/smart-seat-by-groups/${eventId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בהושבה חכמה");
      }

      await loadSeatingData(eventId, invitationId);
      await saveSeating(false);

      setShowSmartPanel(false);

      alert(
        `✅ ההושבה החכמה הושלמה בהצלחה\n\nהושבו: ${
          data.seatedCount ?? 0
        }\nלא הושבו: ${data.unseatedCount ?? 0}`
      );
    } catch (err: any) {
      console.error("❌ Smart seating error:", err);
      alert(err?.message || "❌ שגיאה בהושבה חכמה");
    } finally {
      setIsSmartSeating(false);
    }
  }, [
    eventId,
    invitationId,
    isSmartSeating,
    loadSeatingData,
    saveSeating,
  ]);

  /* ===============================
     CLEAR SMART SEATING
  =============================== */
  const handleClearSmartSeating = useCallback(async () => {
    if (!eventId || !invitationId) {
      alert("❌ חסר eventId או invitationId");
      return;
    }

    if (isClearingSmartSeating) return;

    const ok = window.confirm(
      "הפעולה תסיר את ההושבה מכל השולחנות ותחזיר את האורחים לרשימת האורחים.\n\n" +
        "השולחנות עצמם לא יימחקו.\n" +
        "האורחים לא יימחקו.\n" +
        "רק השיבוץ שלהם לשולחנות יתאפס.\n\n" +
        "להמשיך?"
    );

    if (!ok) return;

    try {
      setIsClearingSmartSeating(true);

      const res = await fetch(`/api/seating/clear-smart-seating/${eventId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בהסרת ההושבה");
      }

      await loadSeatingData(eventId, invitationId);
      await saveSeating(false);

      setShowSmartPanel(false);

      alert("✅ ההושבה הוסרה בהצלחה. האורחים חזרו לרשימת האורחים.");
    } catch (err: any) {
      console.error("❌ Clear smart seating error:", err);
      alert(err?.message || "❌ שגיאה בהסרת ההושבה");
    } finally {
      setIsClearingSmartSeating(false);
    }
  }, [
    eventId,
    invitationId,
    isClearingSmartSeating,
    loadSeatingData,
    saveSeating,
  ]);

  /* ===============================
     AUTO SAVE TEMPLATE
  =============================== */
  useEffect(() => {
    if (isDemo) return;
    if (blockReason === "no-plan") return;

    if (!eventId || !invitationId) return;
    if (!didFinishInitialLoadRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      setIsAutoSaving(true);

      const ok = await saveSeating(false);

      if (ok) {
        setLastAutoSavedAt(new Date());
      }

      setIsAutoSaving(false);
    }, 900);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    tables,
    background,
    canvasView,
    eventId,
    invitationId,
    isDemo,
    blockReason,
    saveSeating,
  ]);

  /* ===============================
     BLOCKED PLAN VIEW
  =============================== */
  if (blockReason === "no-plan") {
    return (
      <>
        <div
          dir="rtl"
          className="
            flex min-h-screen items-center justify-center
            bg-[radial-gradient(circle_at_top,#fff8ec_0%,#f7f1e8_38%,#f2eee8_100%)]
            px-4
          "
        >
          <div
            className="
              relative w-full max-w-[520px] overflow-hidden
              rounded-[34px] border border-[#ead8c5]
              bg-white/85 p-9 text-center
              shadow-[0_24px_80px_rgba(92,64,36,0.16)]
              backdrop-blur-xl
            "
          >
            <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[#d7b56d]/20 blur-3xl" />

            <div
              className="
                mx-auto mb-6 flex h-16 w-16 items-center justify-center
                rounded-3xl bg-[#1f1b17] text-2xl text-[#d7b56d]
                shadow-[0_16px_34px_rgba(0,0,0,0.18)]
              "
            >
              ♛
            </div>

            <h2 className="mb-3 text-3xl font-black tracking-tight text-[#2c2118]">
              הושבה אינה כלולה בחבילה שלך
            </h2>

            <p className="mx-auto mb-7 max-w-sm text-sm leading-7 text-[#7c6b5c]">
              כדי להשתמש במערכת ההושבה, ניהול שולחנות, גרירה חכמה וסידור
              אורחים באולם — יש לשדרג לחבילת פרימיום.
            </p>

            <button
              onClick={() => setShowUpgrade(true)}
              className="
                h-12 rounded-2xl bg-[#171412] px-8
                text-sm font-bold text-white
                shadow-[0_14px_30px_rgba(0,0,0,0.18)]
                transition hover:-translate-y-0.5 hover:bg-black
              "
            >
              שדרוג חבילה
            </button>
          </div>
        </div>

        <UpgradePlanModal
          isOpen={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          currentPaid={user?.paidAmount ?? 0}
          currentPlan={(user?.plan as "plan1" | "plan2" | "plan3") ?? "plan1"}
        />
      </>
    );
  }

  /* ===============================
     RENDER
  =============================== */
  return (
    <div
      dir="rtl"
      className="
        h-screen w-screen overflow-hidden
        bg-[radial-gradient(circle_at_top_left,#fff8ec_0%,#faf6ef_34%,#f3efe8_100%)]
        text-[#2a2119]
      "
    >
      {/* HEADER */}
      <header
        className="
          fixed inset-x-0 top-0 z-[9999]
          h-[76px] overflow-visible
          border-b border-[#eadcca]/80
          bg-white/78 shadow-[0_10px_40px_rgba(100,70,40,0.08)]
          backdrop-blur-2xl
        "
      >
        <div
          className="
            flex h-full items-center justify-between gap-4
            overflow-visible
            px-4 md:px-7
          "
        >
          {/* RIGHT TITLE */}
          <div className="flex shrink-0 items-center gap-4">
            <div
              className="
                hidden h-11 w-11 items-center justify-center rounded-2xl
                border border-[#e7d3b6] bg-[#fffaf3]
                text-lg text-[#b78a45] shadow-sm md:flex
              "
            >
              ♛
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="whitespace-nowrap text-xl font-black tracking-tight text-[#2b2119] md:text-2xl">
                  הושבה באולם
                </h1>

                {isProducer && (
                  <span
                    className="
                      rounded-full border border-[#d7b56d]/50
                      bg-[#fff8e8] px-2.5 py-1
                      text-[11px] font-bold text-[#9b7436]
                    "
                  >
                    מצב מפיק
                  </span>
                )}
              </div>

              <p className="mt-0.5 hidden text-xs font-medium text-[#9a8773] md:block">
                תכנון שולחנות, אורחים, אזורים וסידור הושבה חכם
              </p>
            </div>
          </div>

          {/* CENTER TOOLS */}
          <div
            className="
              hidden min-w-0 flex-1 items-center justify-center md:flex
            "
          >
            <div
              className="
                max-w-full overflow-x-auto rounded-[24px]
                border border-[#eadcca]/80 bg-white/60
                px-2 py-2 shadow-inner
              "
            >
              <ZonesToolbar />

              <div
                id="header-portal"
                className="relative z-[10000] pointer-events-none"
              />
            </div>
          </div>

          {/* LEFT ACTIONS */}
          <div
            className="
              flex shrink-0 items-center gap-2
              overflow-visible
              whitespace-nowrap
            "
          >
            {/* SMART SEATING MENU */}
            <div className="relative z-[10060] shrink-0">
              <button
                onClick={() => setShowSmartPanel((v) => !v)}
                disabled={!eventId || isSmartSeating || isClearingSmartSeating}
                className="
                  flex h-11 shrink-0 items-center gap-2 rounded-2xl
                  bg-gradient-to-l from-[#2b2119] to-[#8b6b3e]
                  px-4 text-sm font-black text-white
                  shadow-[0_12px_28px_rgba(139,107,62,0.25)]
                  transition hover:-translate-y-0.5 hover:brightness-105
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                <span>✨</span>
                הושבה חכמה
                <span className="text-xs opacity-80">
                  {showSmartPanel ? "▲" : "▼"}
                </span>
              </button>

              {showSmartPanel && (
                <>
                  <button
                    type="button"
                    aria-label="סגור תפריט הושבה חכמה"
                    onClick={() => setShowSmartPanel(false)}
                    className="
                      fixed inset-0 z-[10050]
                      cursor-default bg-transparent
                    "
                  />

                  <div
                    className="
                      fixed left-4 top-[68px] z-[10070]
                      w-[380px] max-w-[calc(100vw-32px)]
                      overflow-hidden rounded-[28px]
                      border border-[#ead8c8]
                      bg-white/95 p-4 text-right
                      shadow-[0_24px_70px_rgba(70,45,20,0.22)]
                      backdrop-blur-2xl
                    "
                  >
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-black text-[#2b2119]">
                          <span>✨</span>
                          הושבה חכמה לפי קבוצות
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowSmartPanel(false)}
                          className="
                            flex h-8 w-8 items-center justify-center
                            rounded-full bg-[#f8efe4]
                            text-sm font-black text-[#8a765f]
                            transition hover:bg-[#f0dfca]
                          "
                        >
                          ×
                        </button>
                      </div>

                      <p className="text-xs font-semibold leading-6 text-[#8a765f]">
                        המערכת תושיב רק אורחים שאישרו הגעה, לפי קבוצות
                        ומקומות פנויים. לאחר מכן אפשר לערוך ידנית, לגרור
                        אורחים, להסיר אורחים משולחנות או לבצע הושבה מחדש.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleSmartSeatByGroups}
                        disabled={
                          isSmartSeating || isClearingSmartSeating || !eventId
                        }
                        className="
                          flex h-11 w-full items-center justify-center gap-2
                          rounded-2xl bg-[#1f1b17] px-4
                          text-sm font-black text-white
                          shadow-[0_12px_26px_rgba(0,0,0,0.16)]
                          transition hover:-translate-y-0.5 hover:bg-black
                          disabled:cursor-not-allowed disabled:opacity-50
                        "
                      >
                        <span>♛</span>
                        {isSmartSeating
                          ? "מבצע הושבה..."
                          : "הושב מחדש לפי קבוצות"}
                      </button>

                      <button
                        onClick={handleClearSmartSeating}
                        disabled={
                          isSmartSeating || isClearingSmartSeating || !eventId
                        }
                        className="
                          flex h-11 w-full items-center justify-center gap-2
                          rounded-2xl border border-[#ead8c8]
                          bg-[#fffaf3] px-4
                          text-sm font-black text-[#7a4d2c]
                          transition hover:-translate-y-0.5 hover:bg-[#fff3e2]
                          disabled:cursor-not-allowed disabled:opacity-50
                        "
                      >
                        <span>↩️</span>
                        {isClearingSmartSeating
                          ? "מסיר הושבה..."
                          : "הסר הושבה"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="
                group flex h-11 shrink-0 items-center gap-2 rounded-2xl
                bg-[#17203a] px-4 text-sm font-bold text-white
                shadow-[0_12px_28px_rgba(23,32,58,0.22)]
                transition hover:-translate-y-0.5 hover:bg-[#11182c]
              "
            >
              <span className="text-lg leading-none">+</span>
              הוסף שולחן
            </button>

            <button
              onClick={() => setShowUpload(true)}
              className="
                flex h-11 shrink-0 items-center gap-2 rounded-2xl
                border border-[#e5d2b8] bg-white/85 px-4
                text-sm font-bold text-[#6f5536]
                shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff8ee]
              "
            >
              ☁️
              העלאת תבנית אולם
            </button>

            <div
              className="
                shrink-0 rounded-2xl border border-[#e5d2b8]
                bg-white/85 shadow-sm
              "
            >
              <ExportSeatingPdf eventId={eventId} />
            </div>

            <div
              className="
                hidden shrink-0 rounded-2xl border border-[#eadcca]
                bg-white/70 px-3 py-2 text-xs font-bold
                text-[#8a765f] shadow-sm md:block
              "
            >
              {isAutoSaving ? (
                <span>שומר אוטומטית...</span>
              ) : lastAutoSavedAt ? (
                <span>
                  נשמר ב־
                  {lastAutoSavedAt.toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : (
                <span>שמירה אוטומטית פעילה</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE GUESTS BUTTON */}
      <button
        onClick={() => setShowGuests(true)}
        className="
          fixed left-4 top-[92px] z-[10002]
          flex h-11 items-center gap-2 rounded-2xl
          border border-[#eadcca] bg-white/90 px-4
          text-sm font-bold text-[#4c3827]
          shadow-[0_14px_34px_rgba(80,50,20,0.13)]
          backdrop-blur-xl md:hidden
        "
      >
        👥 רשימת אורחים
      </button>

      {showGuests && (
        <Suspense fallback={null}>
          <MobileGuests
            onDragStart={handleDragStart}
            onClose={() => setShowGuests(false)}
          />
        </Suspense>
      )}

      {/* MAIN AREA */}
      <main
        className="
          absolute inset-x-0 flex min-w-0 flex-row-reverse
        "
        style={{
          top: 76,
          bottom: 0,
        }}
      >
        {/* CANVAS AREA */}
        <section className="relative min-w-0 flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(90deg,rgba(202,161,90,0.04)_1px,transparent_1px),linear-gradient(rgba(202,161,90,0.04)_1px,transparent_1px)] bg-[size:34px_34px]" />

          <div className="relative z-10 h-full w-full">
            <SeatingEditor
              background={background?.url || null}
              invitationId={invitationId}
              onAutoSave={() => saveSeating(false)}
              hideSeats={isProducer}
              sidebarOpen={sidebarOpen}
            />
          </div>
        </section>

        {/* SIDEBAR */}
        <div className="hidden flex-shrink-0 md:flex">
          <aside
            className={`
              relative h-full overflow-hidden
              border-l border-[#ead8c8]/90
              bg-white/78 backdrop-blur-2xl
              shadow-[-18px_0_48px_rgba(92,64,36,0.08)]
              transition-all duration-300
              ${sidebarOpen ? "w-[430px]" : "w-0"}
            `}
          >
            {sidebarOpen && (
              <div className="h-full">
                <div
                  className="
                    pointer-events-none absolute inset-x-0 top-0 h-32
                    bg-gradient-to-b from-[#fff8ed] to-transparent
                  "
                />

                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center">
                      <div
                        className="
                          rounded-2xl border border-[#ead8c8]
                          bg-white px-5 py-4 text-sm font-semibold
                          text-[#9a8773] shadow-sm
                        "
                      >
                        טוען רשימת שולחנות...
                      </div>
                    </div>
                  }
                >
                  <SeatingSidebar invitationId={invitationId} />
                </Suspense>
              </div>
            )}
          </aside>

          {/* SIDEBAR TOGGLE */}
          <div className="relative h-full">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className={`
                absolute top-1/2 z-40 flex h-11 w-11
                -translate-y-1/2 items-center justify-center
                rounded-full border border-[#e4caa7]
                bg-white/95 text-lg font-black text-[#9b7436]
                shadow-[0_12px_32px_rgba(80,50,20,0.16)]
                backdrop-blur-xl transition
                hover:scale-105 hover:bg-[#fff8ee]
                ${sidebarOpen ? "right-[-22px]" : "right-[-22px]"}
              `}
              aria-label={
                sidebarOpen ? "סגור רשימת שולחנות" : "פתח רשימת שולחנות"
              }
            >
              {sidebarOpen ? "❯" : "❮"}
            </button>
          </div>
        </div>
      </main>

      {/* MODALS */}
      {showUpload && (
        <UploadBackgroundModal
          onClose={() => setShowUpload(false)}
          onBackgroundSelect={(bgUrl: string) => {
            handleBackgroundSelect(bgUrl);
            setShowUpload(false);
          }}
        />
      )}
    </div>
  );
}