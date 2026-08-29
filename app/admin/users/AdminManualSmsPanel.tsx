"use client";

import { useEffect, useMemo, useState } from "react";
import { getGuestInvitationUrl } from "@/lib/guestInviteUrl";

type ManualTemplateKey = "rsvp" | "rsvp_reminder" | "reminder";
type Channel = "sms" | "whatsapp";

type MatchedGuest = {
  name: string;
  rsvpLink: string;
  tableName?: string;
  personalLinkUsed?: boolean;
};

type Props = {
  userId: string;
  invitationId?: string | null;
  defaultPhone?: string;
  invitationTitle?: string | null;
  invitationShareId?: string | null;
  rsvpSiteMode?: unknown;
  guestExperienceType?: unknown;
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
  personalRsvpLink,
  tableName,
  rsvpSiteMode,
  guestExperienceType,
}: {
  key: ManualTemplateKey;
  invitationTitle?: string | null;
  invitationShareId?: string | null;
  personalRsvpLink?: string | null;
  tableName?: string | null;
  rsvpSiteMode?: unknown;
  guestExperienceType?: unknown;
}) {
  const title = String(invitationTitle || "").trim() || "האירוע";
  const inviteLink =
    String(personalRsvpLink || "").trim() ||
    (invitationShareId
      ? getGuestInvitationUrl({
          shareId: invitationShareId,
          rsvpSiteMode,
          guestExperienceType,
        })
      : "{{rsvpLink}}");
  const eventLink = invitationShareId
    ? `https://www.invistimo.com/e/${invitationShareId}`
    : "{{navigationLink}}";
  const tableLabel = String(tableName || "").trim() || "{{tableName}}";

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
    (String(tableName || "").trim()
      ? `מספר השולחן שלך:\n${tableLabel}\n\n`
      : "") +
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
  rsvpSiteMode,
  guestExperienceType,
}: Props) {
  const [phone, setPhone] = useState(defaultPhone);
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ManualTemplateKey | "">("");
  const [channel, setChannel] = useState<Channel>("sms");
  const [sending, setSending] = useState(false);
  const [matchedGuest, setMatchedGuest] = useState<MatchedGuest | null>(null);
  const [lookupDone, setLookupDone] = useState(false);
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

  useEffect(() => {
    const digits = phone.replace(/\D/g, "");

    if (digits.length < 9) {
      setMatchedGuest(null);
      setLookupDone(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ phone: phone.trim() });

        if (invitationId) {
          params.set("invitationId", invitationId);
        }

        const res = await fetch(
          `/api/admin/users/${userId}/manual-sms?${params.toString()}`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );
        const data = await res.json().catch(() => null);

        if (controller.signal.aborted) return;

        setMatchedGuest(data?.guest || null);
        setLookupDone(true);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setMatchedGuest(null);
        setLookupDone(true);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [phone, userId, invitationId]);

  useEffect(() => {
    if (!selectedTemplate) return;

    setMessage(
      buildTemplateText({
        key: selectedTemplate,
        invitationTitle,
        invitationShareId,
        personalRsvpLink: matchedGuest?.rsvpLink,
        tableName: matchedGuest?.tableName,
        rsvpSiteMode,
        guestExperienceType,
      })
    );
  }, [
    selectedTemplate,
    matchedGuest,
    invitationTitle,
    invitationShareId,
    rsvpSiteMode,
    guestExperienceType,
  ]);

  function applyTemplate(key: ManualTemplateKey) {
    setSelectedTemplate(key);
    setMessage(
      buildTemplateText({
        key,
        invitationTitle,
        invitationShareId,
        personalRsvpLink: matchedGuest?.rsvpLink,
        tableName: matchedGuest?.tableName,
        rsvpSiteMode,
        guestExperienceType,
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
      (matchedGuest?.name
        ? `נמצא ברשימה: ${matchedGuest.name}. יישלח עם הקישור האישי שלו.\n\n`
        : "") +
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

      const guestLabel = data?.guestName ? ` ל-${data.guestName}` : "";
      const personalLabel = data?.personalLinkUsed
        ? " עם קישור אישי"
        : "";

      setStatus({
        type: "success",
        text: isWhatsapp
          ? `הודעת WhatsApp נשלחה בהצלחה${guestLabel}${personalLabel}`
          : `ההודעה נשלחה בהצלחה${guestLabel}${personalLabel} · ${data.parts} חלקי SMS`,
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
          שליחה למספר אחד בלבד. אם המספר ברשימת המוזמנים, נשלח הקישור האישי
          של אותו אורח. באישורי הגעה אפשר לבחור SMS או WhatsApp.
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

      <label className="mb-2 block">
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

      {matchedGuest?.name ? (
        <div className="mb-3 rounded-2xl bg-[#EAF8EF] px-4 py-2 text-xs font-bold text-[#1F9A55]">
          נמצא ברשימה: {matchedGuest.name} · יישלח עם הקישור האישי שלו
        </div>
      ) : lookupDone && phone.replace(/\D/g, "").length >= 10 ? (
        <div className="mb-3 rounded-2xl bg-[#FFF7E8] px-4 py-2 text-xs font-bold text-[#8A5A24]">
          המספר לא נמצא ברשימת המוזמנים · יישלח קישור כללי
        </div>
      ) : null}

      {isWhatsapp ? (
        <div className="mb-3 rounded-2xl border border-[#EFE2D1] bg-[#FFFDF8] px-4 py-3 text-xs font-bold leading-6 text-[#8A7867]">
          WhatsApp שולח את תבנית אישור ההגעה הרשמית עם תמונת ההזמנה, רק למספר
          הזה. אם המספר ברשימה, הכפתור ייפתח עם הקישור האישי של האורח.
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
