"use client";

import { useMemo, useState } from "react";

type ManualTemplateKey = "rsvp" | "rsvp_reminder" | "reminder";
type Channel = "sms" | "whatsapp";

type Props = {
  userId: string;
  invitationId?: string | null;
  defaultPhone?: string;
  invitationTitle?: string | null;
  invitationShareId?: string | null;
};

const SMS_LIMIT_1 = 200;
const SMS_LIMIT_2 = 320;

const TEMPLATE_OPTIONS: {
  key: ManualTemplateKey;
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
  key: ManualTemplateKey;
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
  invitationId,
  defaultPhone = "",
  invitationTitle,
  invitationShareId,
}: Props) {
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ManualTemplateKey | "">("");
  const [channel, setChannel] = useState<Channel>("sms");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isRsvpTemplate =
    selectedTemplate === "rsvp" || selectedTemplate === "rsvp_reminder";
  const whatsappAllowed = isRsvpTemplate;
  const activeChannel = whatsappAllowed ? channel : "sms";
  const isWhatsapp = activeChannel === "whatsapp";

  const totalChars = [...message.trim()].length;
  const parts = countBusinessSms(message);
  const tooLong = !isWhatsapp && parts === -1;

  const canSend = useMemo(() => {
    if (!phone.trim() || sending) return false;

    if (isWhatsapp) {
      return Boolean(isRsvpTemplate);
    }

    return Boolean(message.trim() && !tooLong);
  }, [phone, sending, isWhatsapp, isRsvpTemplate, message, tooLong]);

  function applyTemplate(key: ManualTemplateKey) {
    setSelectedTemplate(key);
    setMessage(
      buildTemplateText({
        key,
        invitationTitle,
        invitationShareId,
      })
    );

    if (key === "reminder") {
      setChannel("sms");
    }

    setStatus(null);
  }

  async function sendManualMessage() {
    if (!canSend) return;

    const channelLabel = isWhatsapp ? "WhatsApp" : "SMS";
    const confirmText =
      `לשלוח ${channelLabel} למספר ${phone.trim()} בלבד?\n\n` +
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
          channel: activeChannel,
          templateKey: selectedTemplate || undefined,
          invitationId: invitationId || undefined,
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
          WHATSAPP_ONLY_FOR_RSVP:
            "WhatsApp זמין רק לאישור הגעה ולתזכורת אישור הגעה",
          INVITATION_NOT_FOUND: "לא נמצאה הזמנה למשתמש הזה",
          INVITE_LINK_MISSING: "חסר קישור הזמנה לשליחת WhatsApp",
          INVITATION_IMAGE_MISSING: "חסרה תמונת הזמנה לשליחת WhatsApp",
        };

        setStatus({
          type: "error",
          text: errorMap[String(data?.error || "")] || "שליחת ההודעה נכשלה",
        });
        return;
      }

      setStatus({
        type: "success",
        text: isWhatsapp
          ? "הודעת WhatsApp נשלחה בהצלחה למספר הזה בלבד"
          : `ההודעה נשלחה בהצלחה · ${data.parts} חלקי SMS`,
      });

      if (!isWhatsapp) {
        setMessage("");
        setSelectedTemplate("");
      }
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
          שליחה למספר אחד בלבד. באישורי הגעה אפשר לבחור SMS או WhatsApp.
          השליחה לא נועלת סבב ולא מחייבת את מכסת הלקוח.
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

      {whatsappAllowed && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setChannel("whatsapp");
              setStatus(null);
            }}
            className={`
              h-11 rounded-2xl border text-sm font-black transition
              ${
                activeChannel === "whatsapp"
                  ? "border-[#B97821] bg-[#FFF2D8] text-[#8A5A24]"
                  : "border-[#E7D8C6] bg-[#FFFDF8] text-[#7B6754]"
              }
            `}
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => {
              setChannel("sms");
              setStatus(null);
            }}
            className={`
              h-11 rounded-2xl border text-sm font-black transition
              ${
                activeChannel === "sms"
                  ? "border-[#B97821] bg-[#FFF2D8] text-[#8A5A24]"
                  : "border-[#E7D8C6] bg-[#FFFDF8] text-[#7B6754]"
              }
            `}
          >
            SMS
          </button>
        </div>
      )}

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

      {isWhatsapp ? (
        <div className="mb-3 rounded-2xl border border-[#EFE2D1] bg-[#FFFDF8] px-4 py-3 text-xs font-bold leading-6 text-[#8A7867]">
          WhatsApp שולח את תבנית אישור ההגעה הרשמית עם תמונת ההזמנה, רק למספר
          הזה. לא נשלחת הודעת טקסט חופשית, לא נשלח לשאר המוזמנים, ולא נוגעים
          בתזמון.
        </div>
      ) : (
        <>
          <label className="mb-2 block">
            <span className="mb-2 block text-xs font-black text-[#6B5A48]">
              תוכן ההודעה
            </span>
            <textarea
              rows={7}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
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
        </>
      )}

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
        onClick={sendManualMessage}
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
        {sending
          ? "שולח…"
          : isWhatsapp
            ? "שלח WhatsApp"
            : "שלח SMS"}
      </button>
    </div>
  );
}
