"use client";

import { useMemo, useState } from "react";

/* ================= TYPES ================= */

type PreRsvpTabProps = {
  invitationId: string;
  invitationTitle: string;
  eventDate: string;
  eventLocation: string;
  eventType?: string;
  giftCreditUrl?: string;
  headerImageUrl?: string;
  lat?: number;
  lng?: number;
};

/* ================= DEFAULTS ================= */

const DEFAULT_SAVE_THE_DATE_MESSAGE = `Save The Date
{כותרת סייב דה דייט}

אנחנו מתרגשים להזמין אתכם לשריין את התאריך
{תאריך אירוע}

פרטים נוספים יישלחו בקרוב 🤍`;

const DEFAULT_INVITATION_ONLY_MESSAGE = `ההזמנה שלנו כבר כאן 🤍

נשמח שתיכנסו לצפות בפרטי האירוע:
{שם האירוע}

{קישור להזמנה}

אישורי הגעה ייפתחו בהמשך וישלחו בנפרד.`;

/* ================= HELPERS ================= */

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function replaceMessageVariables({
  message,
  saveTheDateTitle,
  invitationTitle,
  eventDate,
  eventLocation,
  eventType,
}: {
  message: string;
  saveTheDateTitle?: string;
  invitationTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  eventType?: string;
}) {
  const customTitle = cleanString(saveTheDateTitle);
  const title = cleanString(invitationTitle);
  const date = cleanString(eventDate);
  const location = cleanString(eventLocation);
  const type = cleanString(eventType);

  return message
    .replaceAll("{כותרת סייב דה דייט}", customTitle || "כותרת מותאמת אישית")
    .replaceAll("{שם האירוע}", title || "שם האירוע")
    .replaceAll("{סוג האירוע}", type || "סוג האירוע")
    .replaceAll("{תאריך אירוע}", date || "תאריך האירוע")
    .replaceAll("{מיקום האירוע}", location || "מיקום האירוע")
    .replaceAll("{קישור להזמנה}", "{קישור להזמנה}")
    .replaceAll("{קישור לאתר האירוע}", "{קישור לאתר האירוע}");
}

/* ================= COMPONENT ================= */

export default function PreRsvpTab({
  invitationId,
  invitationTitle,
  eventDate,
  eventLocation,
  eventType,
}: PreRsvpTabProps) {
  const [saveTheDateTitle, setSaveTheDateTitle] = useState("");
  const [saveTheDateMessage, setSaveTheDateMessage] = useState(
    DEFAULT_SAVE_THE_DATE_MESSAGE
  );

  const [invitationOnlyMessage, setInvitationOnlyMessage] = useState(
    DEFAULT_INVITATION_ONLY_MESSAGE
  );

  const saveTheDatePreview = useMemo(() => {
    return replaceMessageVariables({
      message: saveTheDateMessage,
      saveTheDateTitle,
      invitationTitle,
      eventDate,
      eventLocation,
      eventType,
    });
  }, [
    saveTheDateMessage,
    saveTheDateTitle,
    invitationTitle,
    eventDate,
    eventLocation,
    eventType,
  ]);

  const invitationOnlyPreview = useMemo(() => {
    return replaceMessageVariables({
      message: invitationOnlyMessage,
      saveTheDateTitle,
      invitationTitle,
      eventDate,
      eventLocation,
      eventType,
    });
  }, [
    invitationOnlyMessage,
    saveTheDateTitle,
    invitationTitle,
    eventDate,
    eventLocation,
    eventType,
  ]);

  return (
    <div className="p-5 md:p-8">
      <div
        className="
          mb-6
          rounded-[32px]
          border
          border-[#E8D7BD]
          bg-gradient-to-br
          from-[#FFF8ED]
          via-white
          to-[#F7EEE1]
          p-5
          shadow-[0_18px_45px_rgba(88,58,30,0.08)]
          md:p-7
        "
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div
              className="
                mb-3
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-[#E4D4BF]
                bg-white/80
                px-4
                py-2
                text-xs
                font-black
                text-[#9B6A2D]
                shadow-sm
              "
            >
              <span>שליחה מוקדמת</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#C9A25C]" />
              <span>ללא אישור הגעה</span>
            </div>

            <h2 className="text-2xl font-black text-[#2D241D] md:text-3xl">
              טרום אישורי הגעה
            </h2>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-[#7B6A5B]">
              כאן אפשר לשלוח לאורחים הודעות מוקדמות לפני פתיחת אישורי ההגעה:
              Save The Date או הזמנה דיגיטלית בלבד, בלי כפתורי RSVP ובלי לשנות
              סטטוס אישור הגעה.
            </p>
          </div>

          <div
            className="
              rounded-[24px]
              border
              border-[#E5D6C2]
              bg-white/75
              px-4
              py-3
              text-sm
              font-extrabold
              text-[#8A6A3D]
              shadow-sm
            "
          >
            מזהה הזמנה:{" "}
            <span className="text-[#3A3028]">
              {invitationId ? invitationId : "לא נטען"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section
          className="
            overflow-hidden
            rounded-[34px]
            border
            border-[#E6D8C5]
            bg-white/90
            shadow-[0_22px_60px_rgba(72,48,28,0.10)]
          "
        >
          <div
            className="
              border-b
              border-[#E9DDCE]
              bg-gradient-to-l
              from-[#FFF5E4]
              to-white
              p-5
            "
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-black text-[#A36C22]">
                  הודעה מוקדמת
                </div>

                <h3 className="mt-1 text-xl font-black text-[#2D241D]">
                  Save The Date
                </h3>

                <p className="mt-1 text-sm font-bold text-[#8A7A6B]">
                  שליחת שריון תאריך בלבד, ללא אישורי הגעה.
                </p>
              </div>

              <div
                className="
                  flex
                  h-13
                  w-13
                  items-center
                  justify-center
                  rounded-[20px]
                  bg-[#F4E5CC]
                  text-2xl
                  shadow-sm
                "
              >
                💌
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <label className="mb-2 block text-sm font-black text-[#3A3028]">
                כותרת מתחת ל־Save The Date
              </label>

              <input
                value={saveTheDateTitle}
                onChange={(e) => setSaveTheDateTitle(e.target.value)}
                placeholder="לדוגמה: נועה ואיתי מתחתנים / בר המצווה של דניאל / אירוע השקה חגיגי"
                className="
                  w-full
                  rounded-[20px]
                  border
                  border-[#E5D6C2]
                  bg-[#FFFDF9]
                  px-4
                  py-3
                  text-sm
                  font-bold
                  text-[#2D241D]
                  outline-none
                  transition
                  placeholder:text-[#B3A391]
                  focus:border-[#C5964D]
                  focus:ring-4
                  focus:ring-[#D8B878]/20
                "
              />

              <p className="mt-2 text-xs font-bold leading-6 text-[#8A7A6B]">
                השדה הזה נכנס במקום המשתנה{" "}
                <span className="rounded-full bg-[#F5E8D4] px-2 py-1 text-[#9B6A2D]">
                  {"{כותרת סייב דה דייט}"}
                </span>
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-black text-[#3A3028]">
                תוכן הודעת Save The Date
              </label>

              <textarea
                value={saveTheDateMessage}
                onChange={(e) => setSaveTheDateMessage(e.target.value)}
                rows={9}
                className="
                  w-full
                  resize-none
                  rounded-[24px]
                  border
                  border-[#E5D6C2]
                  bg-[#FFFDF9]
                  px-4
                  py-4
                  text-sm
                  font-semibold
                  leading-7
                  text-[#2D241D]
                  outline-none
                  transition
                  focus:border-[#C5964D]
                  focus:ring-4
                  focus:ring-[#D8B878]/20
                "
              />
            </div>

            <MessagePreview title="תצוגה מקדימה" message={saveTheDatePreview} />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="
                  flex-1
                  rounded-[20px]
                  bg-gradient-to-l
                  from-[#A36C22]
                  via-[#C5964D]
                  to-[#8B5A22]
                  px-5
                  py-3
                  text-sm
                  font-black
                  text-white
                  shadow-[0_16px_32px_rgba(139,90,34,0.24)]
                  transition
                  hover:scale-[1.01]
                  active:scale-[0.99]
                "
              >
                שליחת Save The Date
              </button>

              <button
                type="button"
                className="
                  rounded-[20px]
                  border
                  border-[#E0CFB8]
                  bg-white
                  px-5
                  py-3
                  text-sm
                  font-black
                  text-[#8A6A3D]
                  shadow-sm
                  transition
                  hover:bg-[#FAF3E9]
                "
              >
                שמירת נוסח
              </button>
            </div>
          </div>
        </section>

        <section
          className="
            overflow-hidden
            rounded-[34px]
            border
            border-[#E6D8C5]
            bg-white/90
            shadow-[0_22px_60px_rgba(72,48,28,0.10)]
          "
        >
          <div
            className="
              border-b
              border-[#E9DDCE]
              bg-gradient-to-l
              from-[#FFF5E4]
              to-white
              p-5
            "
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-black text-[#A36C22]">
                  הזמנה דיגיטלית בלבד
                </div>

                <h3 className="mt-1 text-xl font-black text-[#2D241D]">
                  שליחת הזמנות ללא אישור הגעה
                </h3>

                <p className="mt-1 text-sm font-bold text-[#8A7A6B]">
                  שליחת קישור להזמנה או לאתר אישי בלי לפתוח RSVP.
                </p>
              </div>

              <div
                className="
                  flex
                  h-13
                  w-13
                  items-center
                  justify-center
                  rounded-[20px]
                  bg-[#F4E5CC]
                  text-2xl
                  shadow-sm
                "
              >
                ✨
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <label className="mb-2 block text-sm font-black text-[#3A3028]">
                תוכן הודעת הזמנה ללא RSVP
              </label>

              <textarea
                value={invitationOnlyMessage}
                onChange={(e) => setInvitationOnlyMessage(e.target.value)}
                rows={12}
                className="
                  w-full
                  resize-none
                  rounded-[24px]
                  border
                  border-[#E5D6C2]
                  bg-[#FFFDF9]
                  px-4
                  py-4
                  text-sm
                  font-semibold
                  leading-7
                  text-[#2D241D]
                  outline-none
                  transition
                  focus:border-[#C5964D]
                  focus:ring-4
                  focus:ring-[#D8B878]/20
                "
              />
            </div>

            <MessagePreview
              title="תצוגה מקדימה"
              message={invitationOnlyPreview}
            />

            <div className="rounded-[22px] border border-[#E7D8C3] bg-[#FFF8ED] p-4">
              <div className="text-sm font-black text-[#3A3028]">
                משתנים זמינים
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <VariableBadge label="{כותרת סייב דה דייט}" />
                <VariableBadge label="{שם האירוע}" />
                <VariableBadge label="{סוג האירוע}" />
                <VariableBadge label="{תאריך אירוע}" />
                <VariableBadge label="{מיקום האירוע}" />
                <VariableBadge label="{קישור להזמנה}" />
                <VariableBadge label="{קישור לאתר האירוע}" />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="
                  flex-1
                  rounded-[20px]
                  bg-gradient-to-l
                  from-[#A36C22]
                  via-[#C5964D]
                  to-[#8B5A22]
                  px-5
                  py-3
                  text-sm
                  font-black
                  text-white
                  shadow-[0_16px_32px_rgba(139,90,34,0.24)]
                  transition
                  hover:scale-[1.01]
                  active:scale-[0.99]
                "
              >
                שליחת הזמנות
              </button>

              <button
                type="button"
                className="
                  rounded-[20px]
                  border
                  border-[#E0CFB8]
                  bg-white
                  px-5
                  py-3
                  text-sm
                  font-black
                  text-[#8A6A3D]
                  shadow-sm
                  transition
                  hover:bg-[#FAF3E9]
                "
              >
                שמירת נוסח
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ================= Message Preview ================= */

function MessagePreview({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div
      className="
        overflow-hidden
        rounded-[26px]
        border
        border-[#E8D9C4]
        bg-[#F8F1E8]
      "
    >
      <div
        className="
          border-b
          border-[#E8D9C4]
          bg-white/70
          px-4
          py-3
          text-sm
          font-black
          text-[#8A6A3D]
        "
      >
        {title}
      </div>

      <pre
        className="
          whitespace-pre-wrap
          break-words
          px-4
          py-4
          text-right
          text-sm
          font-semibold
          leading-8
          text-[#2D241D]
        "
      >
        {message}
      </pre>
    </div>
  );
}

/* ================= Variable Badge ================= */

function VariableBadge({ label }: { label: string }) {
  return (
    <span
      className="
        rounded-full
        border
        border-[#E2D1B8]
        bg-white
        px-3
        py-1.5
        text-xs
        font-black
        text-[#9B6A2D]
        shadow-sm
      "
    >
      {label}
    </span>
  );
}