"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import IvrRoundsPanel from "@/app/components/IvrRoundsPanel";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import { formatCallRoundDateTimeInput } from "@/lib/calls/callRoundScheduleTime";

type ScheduleState = {
  enabled: boolean;
  rounds: Array<{
    roundNumber: number;
    title: string;
    scheduledAt: string;
    notes: string;
    status?: string;
    failureReason?: string;
  }>;
};

function buildScheduleFromUser(user: any): ScheduleState {
  return {
    enabled: true,
    rounds: [1, 2, 3].map((roundNumber) => {
      const existing = user?.callRoundsSchedule?.rounds?.find(
        (item: any) => Number(item.roundNumber) === roundNumber
      );
      return {
        roundNumber,
        title: existing?.title || `סבב מוקלט ${roundNumber}`,
        scheduledAt: formatCallRoundDateTimeInput(existing?.scheduledAt),
        status: existing?.status || "scheduled",
        failureReason: existing?.failureReason || "",
        notes: existing?.notes || "",
      };
    }),
  };
}

export default function RecordedCallsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const allowed = isIvrCallsUser(user);

  const [schedule, setSchedule] = useState<ScheduleState>(() =>
    buildScheduleFromUser(user)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    setSchedule(buildScheduleFromUser(user));
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [loading, allowed, router]);

  const userId = useMemo(
    () => String(user?._id || (user as any)?.id || ""),
    [user]
  );

  async function saveSchedule(next: ScheduleState = schedule) {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/ivr/schedule", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rounds: next.rounds }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || "שמירת תזמון נכשלה");
      }
      const savedRounds = data?.callRoundsSchedule?.rounds;
      if (Array.isArray(savedRounds)) {
        setSchedule({
          enabled: true,
          rounds: [1, 2, 3].map((roundNumber) => {
            const existing = savedRounds.find(
              (item: any) => Number(item.roundNumber) === roundNumber
            );
            return {
              roundNumber,
              title: existing?.title || `סבב מוקלט ${roundNumber}`,
              scheduledAt:
                existing?.scheduledAtInput ||
                formatCallRoundDateTimeInput(existing?.scheduledAt),
              status: existing?.status || "",
              failureReason: existing?.failureReason || "",
              notes: existing?.notes || "",
            };
          }),
        });
      } else {
        setSchedule(next);
      }
      setMessage("תזמון הסבבים נשמר. הקהל יחושב רק במועד הביצוע.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "שמירת תזמון נכשלה");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !allowed) {
    return (
      <div
        dir="rtl"
        className="flex min-h-[50vh] items-center justify-center text-sm font-bold text-[#8A7867]"
      >
        טוען שיחות מוקלטות...
      </div>
    );
  }

  return (
    <div dir="rtl" className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#E3CFB0] bg-[#FFF8EE] px-3 py-1 text-[11px] font-black tracking-[0.12em] text-[#9A7444]">
            <Phone size={13} />
            IVR
          </div>
          <h1 className="text-3xl font-black text-[#241A14]">שיחות מוקלטות</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[#8A7A68]">
            תזמון שלושת הסבבים, יצירת ההודעה הקולית (קריינות AI או הקלטה אישית), אישור
            ההודעה, תצוגה מקדימה וסטטיסטיקות אחרי הביצוע.
          </p>
        </div>
        <Link
          href="/dashboard?action=calls"
          className="rounded-xl border border-[#E7D8C6] bg-white px-4 py-2 text-sm font-black text-[#3A2A1C] shadow-sm transition hover:bg-[#FFF8EE]"
        >
          לו״ז אישורי הגעה המלא
        </Link>
      </div>

      <IvrRoundsPanel
        schedule={schedule}
        onScheduleChange={(next: ScheduleState) => {
          setSchedule(next);
          void saveSchedule(next);
        }}
        userId={userId}
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-[#8A7867]">
          {saving ? "שומר תזמון..." : message || ""}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveSchedule()}
          className="rounded-xl bg-[#B97821] px-4 py-2 text-sm font-black text-white disabled:opacity-60"
        >
          שמירת תזמון סבבים
        </button>
      </div>
    </div>
  );
}
