"use client";

import { useEffect, useState } from "react";
import type { SmsScheduleStatus } from "@/lib/weddingChallenges/types";
import { DEFAULT_EVENT_TIMEZONE } from "@/lib/weddingChallenges/timezone";

type SmsPublic = {
  timezone: string;
  status: SmsScheduleStatus;
  scheduledAt: string | null;
  scheduledAtLocal: string;
  scheduledAtLabel: string;
  sentAt: string | null;
  sentAtLabel: string;
  sentCount: number;
  lastError: string | null;
  alreadySent: boolean;
  failed?: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canSendNow: boolean;
  canRetry?: boolean;
};

const STATUS_COPY: Record<SmsScheduleStatus, string> = {
  idle: "לא תוזמן עדיין",
  scheduled: "מתוזמן",
  sending: "נשלח כעת",
  sent: "נשלח",
  failed: "שליחת ה-SMS נכשלה",
  cancelled: "בוטל",
};

function errorText(json: {
  error?: string;
  code?: string;
  details?: { lastError?: string | null } | null;
}) {
  return (
    json?.details?.lastError ||
    json?.error ||
    (json?.code ? `שגיאה: ${json.code}` : "פעולת SMS נכשלה")
  );
}

export default function SmsSchedulePanel({
  eventId,
  template,
  timezone,
  preview,
  disabled,
  onTemplateChange,
  onTimezoneChange,
  onMessage,
}: {
  eventId: string;
  template: "full" | "short";
  timezone: string;
  preview: string;
  disabled?: boolean;
  onTemplateChange: (template: "full" | "short") => void;
  onTimezoneChange: (timezone: string) => void;
  onMessage: (message: string) => void;
}) {
  const [sms, setSms] = useState<SmsPublic | null>(null);
  const [wall, setWall] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/wedding-challenges/sms?eventId=${eventId}`, { cache: "no-store" });
    const json = await res.json();
    if (json?.sms) {
      setSms(json.sms);
      setWall(json.sms.scheduledAtLocal || "");
      if (json.sms.timezone) onTimezoneChange(json.sms.timezone);
    }
  };

  useEffect(() => {
    load().catch(() => onMessage("לא הצלחנו לטעון את תזמון ה-SMS"));
  }, [eventId]);

  const post = async (action: string, extra: Record<string, unknown> = {}) => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        eventId,
        action,
        timezone: timezone || DEFAULT_EVENT_TIMEZONE,
        ...extra,
      };
      if (action === "schedule" || action === "update") {
        payload.scheduledAt = wall;
      }
      const res = await fetch("/api/wedding-challenges/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        onMessage(errorText(json));
        await load();
        return;
      }
      if (action === "send_now") {
        onMessage(`נשלחו ${json.sent} הודעות`);
      } else if (action === "cancel") {
        onMessage("התזמון בוטל. לא נשלח SMS.");
      } else {
        onMessage("השליחה תוזמנה. ה-SMS יישלח אוטומטית בזמן שנבחר.");
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const sent = Boolean(sms?.alreadySent || sms?.status === "sent");
  const failed = Boolean(sms?.failed || sms?.status === "failed");
  const tz = timezone || DEFAULT_EVENT_TIMEZONE;

  return (
    <section className="mb-6 space-y-3 rounded-[26px] border border-[#E7D8C6] bg-[#FFFDF8] p-5">
      <h2 className="text-lg font-black">הודעת הפתיחה</h2>
      <p className="text-sm text-[#7B6754]">
        אין SMS לכל משימה. האורחים מקבלים לינק אישי אחד לכרטיס הגירוד.
        &quot;תזמון שליחה&quot; רק שומר את הזמן. &quot;שלח עכשיו&quot; שולח מיד.
        כשהזמן מגיע, השרת שולח לבד בלי דפדפן פתוח.
      </p>
      <label className="text-sm font-bold text-[#7B6754]">
        תבנית
        <select
          value={template}
          disabled={disabled || sent}
          onChange={(event) => onTemplateChange(event.target.value === "short" ? "short" : "full")}
          className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
        >
          <option value="full">תבנית מלאה</option>
          <option value="short">תבנית קצרה</option>
        </select>
      </label>
      <p className="text-xs font-bold text-[#A86F2B]">
        אזור זמן: {tz === "Asia/Jerusalem" ? "שעון ישראל (Asia/Jerusalem)" : tz}
      </p>
      <label className="text-sm font-bold text-[#7B6754]">
        תאריך ושעת שליחה
        <input
          type="datetime-local"
          value={wall}
          disabled={disabled || sent || sms?.status === "sending"}
          onChange={(event) => setWall(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#E7D8C6] px-3 py-2"
        />
      </label>
      <div className="rounded-2xl border border-[#E7D8C6] bg-white px-4 py-3 text-sm">
        <p className="font-black text-[#3A2A1C]">סטטוס: {STATUS_COPY[sms?.status || "idle"]}</p>
        {sms?.scheduledAtLabel ? (
          <p className="mt-1 text-[#7B6754]">מתוזמן ל: {sms.scheduledAtLabel}</p>
        ) : (
          <p className="mt-1 text-[#7B6754]">אין שליחה מתוזמנת.</p>
        )}
        {sms?.sentAtLabel ? (
          <p className="mt-1 font-bold text-[#A86F2B]">
            נשלח ב: {sms.sentAtLabel} ({sms.sentCount} הודעות)
          </p>
        ) : null}
      </div>
      {failed ? (
        <div className="rounded-2xl border border-[#E8B4B4] bg-[#FFF5F5] px-4 py-3 text-sm">
          <p className="font-black text-[#8B2E2E]">שליחת ה-SMS נכשלה</p>
          <p className="mt-1 text-[#8B2E2E]">{sms?.lastError || "לא התקבלה סיבת כשל מהשרת."}</p>
          <button
            type="button"
            disabled={disabled || saving || sent}
            onClick={() => {
              if (!window.confirm("לנסות לשלוח שוב עכשיו לכל האורחים הזכאים?")) return;
              post("send_now", { force: true });
            }}
            className="mt-3 rounded-full bg-[#8B2E2E] px-5 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            נסה שוב
          </button>
        </div>
      ) : null}
      <pre className="whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm text-[#3A2A1C]">{preview}</pre>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={disabled || saving || sent || !wall}
          onClick={() => post(sms?.status === "scheduled" ? "update" : "schedule")}
          className="rounded-full bg-[#C89545] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          {sms?.status === "scheduled" ? "עדכון תזמון" : "תזמון שליחה"}
        </button>
        <button
          type="button"
          disabled={disabled || saving || sent || !sms?.canCancel}
          onClick={() => post("cancel")}
          className="rounded-full border border-[#E7D8C6] px-5 py-3 text-sm font-bold disabled:opacity-50"
        >
          ביטול תזמון
        </button>
        <button
          type="button"
          disabled={disabled || saving || sent}
          onClick={() => {
            if (!window.confirm("לשלוח עכשיו לכל האורחים? הפעולה לא מחכה לתזמון ולא ניתן לבטל אחרי השליחה.")) {
              return;
            }
            post("send_now");
          }}
          className="rounded-full bg-[#3A2A1C] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          שלח עכשיו
        </button>
      </div>
    </section>
  );
}
