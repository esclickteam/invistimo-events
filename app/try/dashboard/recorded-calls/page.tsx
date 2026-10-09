"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Phone } from "lucide-react";
import IvrRoundsPanel from "@/app/components/IvrRoundsPanel";

type Guest = {
  _id: string;
  name: string;
  rsvp?: string;
  phone?: string;
};

type ScheduleState = {
  enabled: boolean;
  rounds: Array<{
    roundNumber: number;
    title: string;
    scheduledAt: string;
    notes: string;
    status?: string;
  }>;
};

const EMPTY_SCHEDULE: ScheduleState = {
  enabled: true,
  rounds: [1, 2, 3].map((roundNumber) => ({
    roundNumber,
    title: `סבב מוקלט ${roundNumber}`,
    scheduledAt: "",
    notes: "",
    status: "scheduled",
  })),
};

export default function DemoRecordedCallsPage() {
  const [schedule, setSchedule] = useState<ScheduleState>(EMPTY_SCHEDULE);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestId, setGuestId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/demo/interactive", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (cancelled || !data?.session) return;
      const rounds = data.session.ivrSchedule;
      if (Array.isArray(rounds) && rounds.length) {
        setSchedule({ enabled: true, rounds });
      }
      const nextGuests = Array.isArray(data.session.guests) ? data.session.guests : [];
      setGuests(nextGuests);
      setGuestId((current) => current || nextGuests[0]?._id || "");
    }
    load();
    window.addEventListener("invistimo:demo-sync", load);
    return () => {
      cancelled = true;
      window.removeEventListener("invistimo:demo-sync", load);
    };
  }, []);

  async function saveSchedule(next: ScheduleState = schedule) {
    setMessage("שומר בדמו...");
    const res = await fetch("/api/ivr/schedule", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rounds: next.rounds }),
    });
    const data = await res.json().catch(() => null);
    setMessage(data?.ok ? "התזמון נשמר בדמו. לא יצאה שיחה." : "שמירת התזמון בדמו נכשלה");
  }

  async function press(digit: "1" | "2" | "3") {
    if (!guestId) return;
    await fetch("/api/demo/interactive/action", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "ivr", guestId, digit }),
    });
    window.dispatchEvent(new CustomEvent("invistimo:demo-action", { detail: { action: "ivr" } }));
    window.dispatchEvent(new CustomEvent("invistimo:demo-sync"));
    setMessage(
      digit === "1"
        ? "האורח הקיש 1. הסטטוס עודכן למגיע."
        : digit === "2"
          ? "האורח הקיש 2. הסטטוס עודכן ללא מגיע."
          : "האורח הקיש 3. הסטטוס עודכן למתלבט."
    );
  }

  return (
    <div dir="rtl" className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#E3CFB0] bg-[#FFF8EE] px-3 py-1 text-[11px] font-black tracking-[0.12em] text-[#9A7444]">
            <Phone size={13} />
            סבבי שיחות
          </div>
          <h1 className="text-3xl font-black text-[#241A14]">שיחות מוקלטות</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[#8A7A68]">
            אותו מסך תזמון של בעל האירוע. בדמו אין חיוג ואין קריינות אמיתית.
          </p>
        </div>
        <Link
          href="/try/dashboard?action=calls"
          className="rounded-xl border border-[#E7D8C6] bg-white px-4 py-2 text-sm font-black text-[#3A2A1C]"
        >
          לו״ז אישורי הגעה
        </Link>
      </div>

      <PanelBoundary>
        <IvrRoundsPanel
          schedule={schedule}
          onScheduleChange={(next: ScheduleState) => {
            setSchedule(next);
            void saveSchedule(next);
          }}
          userId="demo-owner"
        />
      </PanelBoundary>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-[#8A7867]">{message}</p>
        <button
          type="button"
          data-tour="call-schedule-save"
          onClick={() => void saveSchedule()}
          className="rounded-xl bg-[#B97821] px-4 py-2 text-sm font-black text-white"
        >
          שמירת תזמון סבבים
        </button>
      </div>

      <section
        data-tour="call-keypad"
        className="mt-6 rounded-2xl border border-[#E7D8C6] bg-white p-5"
      >
        <h2 className="text-lg font-black text-[#241A14]">הדמיית הקשה של האורח</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#6B5A48]">
          בחרו אורח והקישו כמו בשיחה המוקלטת. הסטטוס ברשימה מתעדכן, בלי שיחת טלפון.
        </p>
        <select
          className="mt-4 w-full rounded-xl border border-[#E7D3B0] px-3 py-3 text-sm font-bold"
          value={guestId}
          onChange={(event) => setGuestId(event.target.value)}
        >
          {guests.map((guest) => (
            <option key={guest._id} value={guest._id}>
              {guest.name} · {guest.rsvp === "yes" ? "מגיע" : guest.rsvp === "no" ? "לא מגיע" : guest.rsvp === "maybe" ? "מתלבט" : "בהמתנה"}
            </option>
          ))}
        </select>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Key digit="1" label="מגיע" onPress={press} />
          <Key digit="2" label="לא מגיע" onPress={press} />
          <Key digit="3" label="מתלבט" onPress={press} />
        </div>
      </section>

      <section
        data-tour="call-report"
        className="mt-6 rounded-2xl border border-[#E7D8C6] bg-white p-5"
      >
        <h2 className="text-lg font-black text-[#241A14]">דוח תוצאות לדוגמה</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#6B5A48]">
          אחרי הקשה, הסטטוס של האורח מתעדכן כאן ובדשבורד. אין חיוג אמיתי.
        </p>
        <ul className="mt-4 space-y-2">
          {guests.map((guest) => (
            <li
              key={guest._id}
              className="flex items-center justify-between rounded-xl bg-[#FFFDF8] px-3 py-2 text-sm font-bold text-[#3A2A1C]"
            >
              <span>{guest.name}</span>
              <span>
                {guest.rsvp === "yes"
                  ? "מגיע"
                  : guest.rsvp === "no"
                    ? "לא מגיע"
                    : guest.rsvp === "maybe"
                      ? "מתלבט"
                      : "בהמתנה"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

class PanelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="rounded-2xl border border-[#E7D8C6] bg-white p-4 text-sm font-bold text-[#6B5A48]">
          תזמון הסבבים נשמר בדמו. יצירת שמע וחיוג אמיתיים חסומים.
        </p>
      );
    }
    return this.props.children;
  }
}

function Key({
  digit,
  label,
  onPress,
}: {
  digit: "1" | "2" | "3";
  label: string;
  onPress: (digit: "1" | "2" | "3") => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPress(digit)}
      className="rounded-2xl border border-[#E7D3B0] bg-[#FFFDF8] px-3 py-4 text-center"
    >
      <span className="block text-2xl font-black text-[#2B2118]">{digit}</span>
      <span className="mt-1 block text-xs font-black text-[#8A6A3B]">{label}</span>
    </button>
  );
}
