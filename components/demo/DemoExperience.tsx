"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProductTour from "@/components/demo/ProductTour";
import { writeDemoCheckInState, DEMO_CHECKIN_CHANNEL, readDemoCheckInState } from "@/lib/checkIn/demoCheckIn";
import { installDemoFetchBridge } from "@/lib/demo/interactive/clientBridge";
import { DEMO_TOUR_STEPS } from "@/lib/demo/interactive/tour";
import type { DemoActivity, DemoSession } from "@/lib/demo/interactive/types";
import { useSeatingStore } from "@/store/seatingStore";

type Props = {
  children: React.ReactNode;
};

export default function DemoExperience({ children }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<DemoSession | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [lead, setLead] = useState({ name: "", phone: "", email: "" });
  const [leadMessage, setLeadMessage] = useState("");
  const checkInSignature = useRef("");

  useEffect(() => {
    const removeBridge = installDemoFetchBridge();
    useSeatingStore.getState().setDemoMode(true);
    let cancelled = false;

    async function boot() {
      const res = await fetch("/api/demo/interactive", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!cancelled && data?.session) setSession(data.session);
    }

    boot();
    const onSync = () => {
      boot();
    };
    window.addEventListener("invistimo:demo-sync", onSync);
    const onLead = () => setSummaryOpen(true);
    window.addEventListener("invistimo:demo-lead", onLead);
    return () => {
      cancelled = true;
      window.removeEventListener("invistimo:demo-sync", onSync);
      window.removeEventListener("invistimo:demo-lead", onLead);
      removeBridge();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const guests = (session.guests || []).map((guest) => ({
      token: guest.token,
      name: guest.name,
      phone: guest.phone || "",
      eventTitle: session.event.title,
      coupleNames: "מאיה ואיתי",
      confirmedGuestCount:
        guest.rsvp === "yes"
          ? Math.max(1, Number(guest.arrivedCount || guest.guestsCount || 1))
          : Math.max(1, Number(guest.guestsCount || 1)),
      checkedInGuestCount: Number(guest.actualArrivedCount || 0),
      tableNumber: guest.tableNumber ?? null,
      tableName: guest.tableName || "",
      giftCreditUrl: "",
      detailsUrl: "/try/dashboard",
    }));
    const signature = guests
      .map((guest) => `${guest.token}:${guest.checkedInGuestCount}`)
      .join("|");
    if (signature === checkInSignature.current) return;
    checkInSignature.current = signature;
    writeDemoCheckInState({ guests, interactive: true });
  }, [session]);

  useEffect(() => {
    const push = () => {
      const state = readDemoCheckInState();
      const signature = state.guests
        .map((guest) => `${guest.token}:${guest.checkedInGuestCount}`)
        .join("|");
      if (!signature || signature === checkInSignature.current) return;
      checkInSignature.current = signature;
      void fetch("/api/demo/interactive/action", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "syncCheckIn",
          counts: state.guests.map((guest) => ({
            token: guest.token,
            checkedInGuestCount: guest.checkedInGuestCount,
          })),
        }),
      }).then(() => {
        window.dispatchEvent(new CustomEvent("invistimo:demo-sync"));
      });
    };
    window.addEventListener(DEMO_CHECKIN_CHANNEL, push as EventListener);
    return () => window.removeEventListener(DEMO_CHECKIN_CHANNEL, push as EventListener);
  }, []);

  async function choose(mode: "guided" | "free") {
    const res = await fetch("/api/demo/interactive", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json().catch(() => null);
    if (data?.session) setSession(data.session);
  }

  async function restartTour() {
    const res = await fetch("/api/demo/interactive", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "guided", restart: true }),
    });
    const data = await res.json().catch(() => null);
    if (data?.session) setSession(data.session);
    router.push("/try/dashboard");
  }

  async function saveTour(patch: Partial<DemoSession["tour"]>) {
    const res = await fetch("/api/demo/interactive/action", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "tour", tour: patch }),
    });
    const data = await res.json().catch(() => null);
    if (data?.session) setSession(data.session);
  }

  async function resetDemo() {
    const res = await fetch("/api/demo/interactive/reset", {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (data?.session) setSession(data.session);
    window.dispatchEvent(new CustomEvent("invistimo:demo-sync"));
    router.push("/try/dashboard");
    router.refresh();
  }

  async function submitLead(event: React.FormEvent) {
    event.preventDefault();
    setLeadMessage("");
    const res = await fetch("/api/demo/interactive/lead", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    const data = await res.json().catch(() => ({}));
    setLeadMessage(data?.message || "לא הצלחנו לשמור");
    if (data?.success) {
      setLead({ name: "", phone: "", email: "" });
    }
  }

  const mode = session?.mode || null;
  const tour = session?.tour;
  const showTour = mode === "guided" && tour?.active && !tour.finished;
  const completed = tour?.completed?.length || tour?.stepIndex || 0;

  return (
    <>
      {children}

      <div
        dir="rtl"
        className="pointer-events-none fixed inset-x-0 bottom-3 z-[100] flex justify-center px-3"
      >
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-[#E7D3B0] bg-[#FFFDF8]/95 px-3 py-1.5 text-[11px] font-black text-[#5C4A38] shadow-sm backdrop-blur">
          <span>דמו מבודד · בלי שליחה אמיתית</span>
          {mode === "guided" && (
            <span>
              {Math.min(completed, DEMO_TOUR_STEPS.length)}/{DEMO_TOUR_STEPS.length}
            </span>
          )}
          <button
            type="button"
            className="underline"
            onClick={() => void restartTour()}
          >
            התחל סיור מחדש
          </button>
          <button type="button" className="underline" onClick={() => void resetDemo()}>
            איפוס
          </button>
          <button type="button" className="underline" onClick={() => setSummaryOpen(true)}>
            סיום והשארת פרטים
          </button>
        </div>
      </div>

      {session && !mode && (
        <WelcomeChoice onChoose={(next) => void choose(next)} />
      )}

      {showTour && tour && (
        <ProductTour
          stepIndex={tour.stepIndex || 0}
          onStep={(index) =>
            void saveTour({
              stepIndex: index,
              active: true,
              finished: false,
              completed: Array.from(new Set([...(tour.completed || []), DEMO_TOUR_STEPS[tour.stepIndex]?.id].filter(Boolean))),
            })
          }
          onFinish={() => {
            void saveTour({ active: false, finished: true });
            setSummaryOpen(true);
          }}
          onSkipTour={() => {
            void saveTour({ active: false, finished: true });
            setSummaryOpen(true);
          }}
        />
      )}

      {summaryOpen && (
        <SummaryCard
          activity={session?.activity || []}
          lead={lead}
          setLead={setLead}
          message={leadMessage}
          onSubmit={submitLead}
          onClose={() => setSummaryOpen(false)}
          onKeepGoing={() => {
            setSummaryOpen(false);
            void choose("free");
          }}
        />
      )}
    </>
  );
}

function WelcomeChoice({
  onChoose,
}: {
  onChoose: (mode: "guided" | "free") => void;
}) {
  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-[#1E1B2E]/35 p-4 sm:items-center" dir="rtl">
      <div className="w-full max-w-xl rounded-[28px] border border-[#E7D3B0] bg-[#FFFDF8] p-6 shadow-2xl">
        <p className="text-xs font-black tracking-[0.14em] text-[#9A6E24]">INVISTIMO</p>
        <h2 className="mt-2 text-2xl font-black text-[#2B2118]">איך תרצו להתנסות?</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#6B5A48]">
          זו המערכת שבעל האירוע רואה. הנתונים מבודדים, ואפשר לאפס אותם בכל רגע.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onChoose("guided")}
            className="rounded-2xl bg-[#2B2118] px-4 py-4 text-sm font-black text-white"
          >
            סיור מודרך
          </button>
          <button
            type="button"
            onClick={() => onChoose("free")}
            className="rounded-2xl border border-[#E7D3B0] bg-white px-4 py-4 text-sm font-black text-[#2B2118]"
          >
            התנסות חופשית
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  activity,
  lead,
  setLead,
  message,
  onSubmit,
  onClose,
  onKeepGoing,
}: {
  activity: DemoActivity[];
  lead: { name: string; phone: string; email: string };
  setLead: (value: { name: string; phone: string; email: string }) => void;
  message: string;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
  onKeepGoing: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-[#1E1B2E]/40 p-3 sm:items-center" dir="rtl">
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-[#E7D3B0] bg-[#FFFDF8] p-5 shadow-2xl">
        <h2 className="text-xl font-black text-[#2B2118]">רוצים לנהל כך גם את האירוע שלכם?</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#6B5A48]">
          אלה הפעולות שביצעתם בדמו. אפשר להמשיך להתנסות, או להשאיר פרטים לקבלת הצעה.
        </p>
        <ul className="mt-3 space-y-1 text-sm font-bold text-[#3F3328]">
          {(activity || []).slice(0, 6).map((item) => (
            <li key={item.id}>• {item.label}</li>
          ))}
        </ul>
        <form className="mt-4 space-y-2" onSubmit={onSubmit}>
          <input
            className="w-full rounded-xl border border-[#E7D3B0] px-3 py-2 text-sm"
            placeholder="שם"
            value={lead.name}
            onChange={(event) => setLead({ ...lead, name: event.target.value })}
          />
          <input
            className="w-full rounded-xl border border-[#E7D3B0] px-3 py-2 text-sm"
            placeholder="טלפון"
            value={lead.phone}
            onChange={(event) => setLead({ ...lead, phone: event.target.value })}
          />
          <input
            className="w-full rounded-xl border border-[#E7D3B0] px-3 py-2 text-sm"
            placeholder="אימייל"
            value={lead.email}
            onChange={(event) => setLead({ ...lead, email: event.target.value })}
          />
          <button type="submit" className="w-full rounded-2xl bg-[#2B2118] py-3 text-sm font-black text-white">
            שלחו לי הצעה
          </button>
        </form>
        {message && <p className="mt-2 text-sm font-bold text-[#2F6B4F]">{message}</p>}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onKeepGoing} className="flex-1 rounded-2xl border border-[#E7D3B0] py-2 text-sm font-black">
            המשך התנסות חופשית
          </button>
          <button type="button" onClick={onClose} className="rounded-2xl px-4 py-2 text-sm font-black text-[#6B5A48]">
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
