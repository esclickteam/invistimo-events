"use client";

import { useMemo, useState } from "react";

type ManualSmsTemplateKey = "rsvp" | "rsvp_reminder" | "reminder";

type Props = {
  userId: string;
  defaultPhone?: string;
  invitationTitle?: string | null;
  invitationShareId?: string | null;
};

const SMS_LIMIT_1 = 200;
const SMS_LIMIT_2 = 320;

const TEMPLATE_OPTIONS: {
  key: ManualSmsTemplateKey;
  label: string;
}[] = [
  { key: "rsvp", label: "אישור הגעה" },
  { key: "rsvp_reminder", label: "תזכורת אישור הגעה" },
  { key: "reminder", label: "סבב תזכורת" },
];

function countBusinessSms(text: string) {
  const length = [...text.trim()].length;

  if (length === 0) return 0;
  if (length <= SMS_LIMIT_1) return 1;
  if (length <= SMS_LIMIT_2) return 2;

  return -1;
}

function buildTemplateText({
  key,
  invitationTitle,
  invitationShareId,
}: {
  key: ManualSmsTemplateKey;
  invitationTitle?: string | null;
  invitationShareId?: string | null;
}) {
  const title = String(invitationTitle || "").trim() || "האירוע";
  const inviteLink = invitationShareId
    ? `https://www.invistimo.com/invite/${invitationShareId}`
    : "{{rsvpLink}}";
  const eventLink = invitationShareId
    ? `https://www.invistimo.com/e/${invitationShareId}`
    : "{{navigationLink}}";

  if (key === "rsvp") {
    return (
      `הוזמנתם לאירוע ${title}.\n\n` +
      "לצפייה בהזמנה ואישור הגעה לחצו כאן:\n" +
      `${inviteLink}\n\n` +
      "מחכים לכם באהבה ❤️"
    );
  }

  if (key === "rsvp_reminder") {
    return (
      `תזכורת לאישור הגעה לאירוע ${title}.\n\n` +
      "לצפייה בהזמנה ואישור הגעה לחצו כאן:\n" +
      `${inviteLink}\n\n` +
      "מחכים לעדכון ❤️"
    );
  }

  return (
    `תזכורת לאירוע ${title}.\n\n` +
    "לכל פרטי האירוע והניווט:\n" +
    `${eventLink}\n\n` +
    "נשמח לראותכם ❤️"
  );
}

export default function AdminManualSmsPanel({
  userId,
  defaultPhone = "",
  invitationTitle,
  invitationShareId,
}: Props) {
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ManualSmsTemplateKey | "">("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const totalChars = [...message.trim()].length;
  const parts = countBusinessSms(message);
  const tooLong = parts === -1;

  const canSend = useMemo(() => {
    return Boolean(phone.trim() && message.trim() && !tooLong && !sending);
  }, [phone, message, tooLong, sending]);

  function applyTemplate(key: ManualSmsTemplateKey) {
    setSelectedTemplate(key);
    setMessage(
      buildTemplateText({
        key,
        invitationTitle,
        invitationShareId,
      })
    );
    setStatus(null);
  }

  async function sendManualSms() {
    if (!canSend) return;

    const confirmText =
      `לשלוח SMS למספר ${phone.trim()}?\n\n` +
      "השליחה ידנית ולא מסמנת סבב כנשלח.";

    if (!confirm(confirmText)) return;

    try {
      setSending(true);
      setStatus(null);

      const res = await fetch(`/api/admin/users/${userId}/manual-sms`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phone.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        const errorMap: Record<string, string> = {
          INVALID_PHONE: "מספר הטלפון לא תקין",
          MESSAGE_TOO_LONG: "ההודעה ארוכה מדי. מקסימום 320 תווים.",
          EXTERNAL_SENDS_BLOCKED: "שליחה חיצונית חסומה בסביבה הזו",
          MISSING_PARAMS: "חסר מספר או תוכן הודעה",
          USER_NOT_FOUND: "המשתמש לא נמצא",
          FORBIDDEN: "אין הרשאה לשליחה",
          SEND_FAILED: "שליחת ההודעה נכשלה",
        };

        setStatus({
          type: "error",
          text: errorMap[String(data?.error || "")] || "שליחת ההודעה נכשלה",
        });
        return;
      }

      setStatus({
        type: "success",
        text: `ההודעה נשלחה בהצלחה · ${data.parts} חלקי SMS`,
      });
      setMessage("");
      setSelectedTemplate("");
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        text: "שגיאה בשליחת ההודעה",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#E7D8C6] bg-white p-4">
      <div className="mb-3">
        <div className="font-black text-[#3A2A1C]">שליחה ידנית</div>
        <p className="mt-1 text-xs font-bold text-[#8A7867]">
          שליחת SMS חופשית לכל מספר. אפשר להתחיל מתבנית סבב קיימת ולערוך
          אותה. השליחה לא נועלת סבב ולא מחייבת את מכסת הלקוח.
        </p>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {TEMPLATE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => applyTemplate(option.key)}
            className={`
              rounded-full px-3 py-1.5 text-xs font-black transition
              ${
                selectedTemplate === option.key
                  ? "bg-[#B97821] text-white"
                  : "bg-[#FFF7E8] text-[#8A5A24] hover:bg-[#FFF2D8]"
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className="mb-3 block">
        <span className="mb-2 block text-xs font-black text-[#6B5A48]">
          מספר טלפון
        </span>
        <input
          type="tel"
          dir="ltr"
          placeholder="05XXXXXXXX"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setStatus(null);
          }}
          className="
            h-11 w-full rounded-2xl
            border border-[#E7D8C6]
            bg-[#FFFDF8] px-4
            text-sm font-bold
            text-[#3A2A1C]
            outline-none
            transition
            focus:border-[#C8944E]
          "
        />
      </label>

      <label className="mb-2 block">
        <span className="mb-2 block text-xs font-black text-[#6B5A48]">
          תוכן ההודעה
        </span>
        <textarea
          rows={7}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setSelectedTemplate("");
            setStatus(null);
          }}
          placeholder="כתבו כאן כל הודעה שתרצו לשלוח"
          className="
            w-full resize-y rounded-2xl
            border border-[#E7D8C6]
            bg-[#FFFDF8] px-4 py-3
            text-sm font-bold
            text-[#3A2A1C]
            outline-none
            transition
            focus:border-[#C8944E]
          "
        />
      </label>

      <div className="mb-3 flex items-center justify-between text-xs font-bold text-[#8A7867]">
        <span>
          {totalChars} / {SMS_LIMIT_2} תווים
        </span>
        <span className={tooLong ? "text-red-600" : ""}>
          {tooLong
            ? "ההודעה ארוכה מדי"
            : parts > 0
              ? `${parts} חלקי SMS`
              : "אין תוכן"}
        </span>
      </div>

      {status && (
        <div
          className={`
            mb-3 rounded-2xl px-4 py-3 text-sm font-bold
            ${
              status.type === "success"
                ? "bg-[#EAF8EF] text-[#1F9A55]"
                : "bg-red-50 text-red-600"
            }
          `}
        >
          {status.text}
        </div>
      )}

      <button
        type="button"
        disabled={!canSend}
        onClick={sendManualSms}
        className="
          h-11 w-full rounded-full
          bg-[#2F3742]
          px-4
          text-sm font-black
          text-white
          transition
          hover:bg-[#1F262E]
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >
        {sending ? "שולח…" : "שלח SMS"}
      </button>
    </div>
  );
}
