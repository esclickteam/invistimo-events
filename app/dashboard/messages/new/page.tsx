"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import RsvpTab from "./tabs/RsvpTab";
import ReminderTab from "./tabs/ReminderTab";
import ThankYouTab from "./tabs/ThankYouTab";

/* ================= TYPES ================= */

type TabKey = "pre_rsvp" | "rsvp" | "reminder" | "thankyou";

type PreRsvpType = "save_the_date" | "invitation_only";
type SendTiming = "scheduled" | "immediate";

type MessageMeta = {
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

const EMPTY_META: MessageMeta = {
  invitationTitle: "",
  eventDate: "",
  eventLocation: "",
  eventType: "",
  giftCreditUrl: "",
  headerImageUrl: "",
  lat: undefined,
  lng: undefined,
};

const DEFAULT_SAVE_THE_DATE_TITLE = "";

const DEFAULT_SAVE_THE_DATE_MESSAGE = `Save The Date
{כותרת סייב דה דייט}

אנחנו מתרגשים להזמין אתכם לשריין את התאריך
{תאריך אירוע}

פרטים נוספים יישלחו בקרוב 🤍`;

const DEFAULT_INVITATION_ONLY_MESSAGE = `ההזמנה שלנו כבר כאן 🤍

אנחנו מתרגשים להזמין אתכם לקחת חלק באירוע שלנו:
{שם האירוע}

נשמח לראותכם בתאריך:
{תאריך אירוע}

במיקום:
{מיקום האירוע}

פרטים נוספים יישלחו בהמשך.
מחכים לחגוג איתכם ✨`;

/* ================= HELPERS ================= */

function formatEventDate(value: any): string {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return "";

    const parsed = new Date(trimmed);

    if (Number.isNaN(parsed.getTime())) {
      return trimmed;
    }

    return new Intl.DateTimeFormat("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parsed);
  }

  const d = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function getCurrentTemplate(type: PreRsvpType) {
  return type === "save_the_date"
    ? DEFAULT_SAVE_THE_DATE_MESSAGE
    : DEFAULT_INVITATION_ONLY_MESSAGE;
}

function replaceMessageVariables({
  message,
  saveTheDateTitle,
  meta,
}: {
  message: string;
  saveTheDateTitle?: string;
  meta: MessageMeta;
}) {
  const title = cleanString(saveTheDateTitle);
  const eventTitle = cleanString(meta.invitationTitle);
  const eventDate = cleanString(meta.eventDate);
  const eventLocation = cleanString(meta.eventLocation);

  return message
    .replaceAll("{כותרת סייב דה דייט}", title || "כותרת האירוע")
    .replaceAll("{שם האירוע}", eventTitle || "שם האירוע")
    .replaceAll("{תאריך אירוע}", eventDate || "תאריך האירוע")
    .replaceAll("{מיקום האירוע}", eventLocation || "מיקום האירוע")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getFilePreview(file: File | null) {
  if (!file) return "";
  return URL.createObjectURL(file);
}

/* ================= COMPONENT ================= */

export default function NewMessagesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pre_rsvp");

  const [meta, setMeta] = useState<MessageMeta>(EMPTY_META);
  const [invitationId, setInvitationId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/invitations/my", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();
        const invitation = data?.invitation;
        const event = invitation?.event;

        const userRole =
          data?.user?.role ||
          data?.currentUser?.role ||
          data?.authUser?.role ||
          invitation?.owner?.role ||
          "";

        setIsAdmin(
          userRole === "admin" ||
            userRole === "super_admin" ||
            userRole === "superadmin"
        );

        if (invitation) {
          setInvitationId(invitation._id || "");

          setMeta({
  invitationTitle: invitation.title || "",

  // לוקח קודם מהמודל invitations
  eventDate: formatEventDate(invitation.eventDate || event?.date),

  // לוקח קודם מהמודל invitations
  eventLocation:
    [
      invitation.location?.name || event?.location?.name,
      invitation.location?.address || event?.location?.address,
    ]
      .filter(Boolean)
      .join(", ") || "",

  eventType: invitation.eventType || event?.eventType || "",
  giftCreditUrl: invitation.giftCreditUrl || event?.giftCreditUrl || "",
  headerImageUrl:
    invitation.previewImage || invitation.headerImageUrl || "",
  lat: invitation.location?.lat ?? event?.location?.lat,
  lng: invitation.location?.lng ?? event?.location?.lng,
});

        }
      } catch (err) {
        console.error("❌ Failed to load invitation data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="
          min-h-screen
          bg-[#F8F4EE]
          flex
          items-center
          justify-center
          px-4
        "
      >
        <div
          className="
            flex
            flex-col
            items-center
            gap-4
            rounded-[32px]
            border
            border-[#E8DED0]
            bg-white/80
            px-10
            py-8
            shadow-[0_24px_70px_rgba(80,55,35,0.10)]
            backdrop-blur-xl
          "
        >
          <div
            className="
              h-11
              w-11
              rounded-full
              border-4
              border-[#E7D7BE]
              border-t-[#A77832]
              animate-spin
            "
          />

          <p className="text-sm font-extrabold text-[#7A6754]">
            טוען את מרכז ההודעות…
          </p>
        </div>
      </div>
    );
  }

  /* ================= RENDER ================= */

  return (
    <div
      dir="rtl"
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#F8F4EE]
        px-4
        pb-14
        pt-8
        md:px-8
        md:pt-12
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_top_right,rgba(183,135,62,0.18),transparent_34%),radial-gradient(circle_at_top_left,rgba(110,72,48,0.10),transparent_30%),linear-gradient(180deg,#FBF8F3_0%,#F6EFE6_100%)]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          right-[-120px]
          top-24
          h-[360px]
          w-[360px]
          rounded-full
          bg-[#E8D0A8]/30
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          left-[-150px]
          top-72
          h-[420px]
          w-[420px]
          rounded-full
          bg-[#B78A4B]/10
          blur-3xl
        "
      />

      <div className="relative z-10 mx-auto max-w-6xl space-y-8">
        <header className="text-center">
          <div
            className="
              mx-auto
              mb-5
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-[24px]
              border
              border-white/80
              bg-white/85
              text-3xl
              shadow-[0_18px_45px_rgba(89,64,38,0.13)]
              backdrop-blur-xl
            "
          >
            💌
          </div>

          <div
            className="
              mx-auto
              mb-3
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-[#E4D4BF]
              bg-white/70
              px-4
              py-2
              text-xs
              font-black
              text-[#9B6A2D]
              shadow-sm
            "
          >
            <span>ניהול הודעות לאורחים</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#C9A25C]" />
            <span>SMS / WhatsApp</span>
          </div>

          <h1
            className="
              text-4xl
              font-black
              tracking-tight
              text-[#2D241D]
              md:text-6xl
            "
          >
            שליחת הודעות
          </h1>

          <p
            className="
              mx-auto
              mt-4
              max-w-2xl
              text-sm
              font-medium
              leading-7
              text-[#7B6A5B]
              md:text-base
            "
          >
            שליחה חכמה של הודעות מוקדמות, אישורי הגעה, תזכורות והודעות תודה
            לפי סבבים, סטטוסים וקהל יעד רלוונטי.
          </p>
        </header>

        <section
          className="
            mx-auto
            max-w-6xl
            rounded-[30px]
            border
            border-white/80
            bg-white/75
            p-2
            shadow-[0_22px_70px_rgba(70,48,28,0.10)]
            backdrop-blur-xl
          "
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <TabButton
              label="טרום אישורי הגעה"
              description="Save The Date והזמנות"
              icon="💌"
              active={activeTab === "pre_rsvp"}
              onClick={() => setActiveTab("pre_rsvp")}
            />

            <TabButton
              label="אישור הגעה"
              description="שליחת סבבי RSVP"
              icon="✅"
              active={activeTab === "rsvp"}
              onClick={() => setActiveTab("rsvp")}
            />

            <TabButton
              label="תזכורת"
              description="תזכורת לפני האירוע"
              icon="🔔"
              active={activeTab === "reminder"}
              onClick={() => setActiveTab("reminder")}
            />

            <TabButton
              label="הודעת תודה"
              description="שליחה לאחר האירוע"
              icon="🎁"
              active={activeTab === "thankyou"}
              onClick={() => setActiveTab("thankyou")}
            />
          </div>
        </section>

        <main
          className="
            relative
            mx-auto
            max-w-6xl
            overflow-hidden
            rounded-[42px]
            border
            border-[#E6D8C5]
            bg-white/82
            shadow-[0_30px_90px_rgba(72,48,28,0.13)]
            backdrop-blur-xl
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              inset-x-0
              top-0
              h-32
              bg-gradient-to-b
              from-[#F5E8D4]/80
              to-transparent
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              right-0
              top-0
              h-full
              w-1
              bg-gradient-to-b
              from-[#C69A51]
              via-[#E7D3AA]
              to-transparent
            "
          />

          <div className="relative z-10">
            {activeTab === "pre_rsvp" && (
              <PreRsvpTab invitationId={invitationId} meta={meta} />
            )}

            {activeTab === "rsvp" && (
              <RsvpTab
                invitationId={invitationId}
                {...meta}
                isAdmin={isAdmin}
              />
            )}

            {activeTab === "reminder" && (
              <ReminderTab invitationId={invitationId} {...meta} />
            )}

            {activeTab === "thankyou" && (
              <ThankYouTab invitationId={invitationId} {...meta} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ================= Pre RSVP Tab ================= */

function PreRsvpTab({
  invitationId,
  meta,
}: {
  invitationId: string;
  meta: MessageMeta;
}) {
  const [activePreTab, setActivePreTab] =
    useState<PreRsvpType>("save_the_date");

  const [sendTiming, setSendTiming] = useState<SendTiming>("scheduled");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const [saveTheDateTitle, setSaveTheDateTitle] = useState(
    DEFAULT_SAVE_THE_DATE_TITLE
  );

  const [saveTheDateImage, setSaveTheDateImage] = useState("");
  const [invitationOnlyImage, setInvitationOnlyImage] = useState("");

  const [saveTheDateImageFile, setSaveTheDateImageFile] =
    useState<File | null>(null);
  const [invitationOnlyImageFile, setInvitationOnlyImageFile] =
    useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentMessage = getCurrentTemplate(activePreTab);

  const currentImage =
    activePreTab === "save_the_date" ? saveTheDateImage : invitationOnlyImage;

  const currentImageFile =
    activePreTab === "save_the_date"
      ? saveTheDateImageFile
      : invitationOnlyImageFile;

  const previewMessage = useMemo(() => {
    return replaceMessageVariables({
      message: currentMessage,
      saveTheDateTitle,
      meta,
    });
  }, [currentMessage, saveTheDateTitle, meta]);

  useEffect(() => {
    return () => {
      if (saveTheDateImage) URL.revokeObjectURL(saveTheDateImage);
      if (invitationOnlyImage) URL.revokeObjectURL(invitationOnlyImage);
    };
  }, [saveTheDateImage, invitationOnlyImage]);

  function handleImageChange(file: File | null) {
    const imageUrl = getFilePreview(file);

    if (activePreTab === "save_the_date") {
      if (saveTheDateImage) URL.revokeObjectURL(saveTheDateImage);
      setSaveTheDateImage(imageUrl);
      setSaveTheDateImageFile(file);
      return;
    }

    if (invitationOnlyImage) URL.revokeObjectURL(invitationOnlyImage);
    setInvitationOnlyImage(imageUrl);
    setInvitationOnlyImageFile(file);
  }

  function handleRemoveImage() {
    if (activePreTab === "save_the_date") {
      if (saveTheDateImage) URL.revokeObjectURL(saveTheDateImage);
      setSaveTheDateImage("");
      setSaveTheDateImageFile(null);
      return;
    }

    if (invitationOnlyImage) URL.revokeObjectURL(invitationOnlyImage);
    setInvitationOnlyImage("");
    setInvitationOnlyImageFile(null);
  }

  async function handleSubmit() {
    try {
      if (isSubmitting) return;

      const isSaveTheDate = activePreTab === "save_the_date";

      const cleanInvitationId = cleanString(invitationId);
      const cleanSaveTheDateTitle = cleanString(saveTheDateTitle);
      const cleanEventTitle = cleanString(meta.invitationTitle);
      const cleanEventDate = cleanString(meta.eventDate);
      const cleanEventLocation = cleanString(meta.eventLocation);

      if (!cleanInvitationId) {
        alert("לא נמצאה הזמנה פעילה לשליחה.");
        return;
      }

      if (sendTiming === "scheduled" && (!scheduledDate || !scheduledTime)) {
        alert("בחרי תאריך ושעה לשליחה מתוזמנת.");
        return;
      }

      if (isSaveTheDate && !cleanSaveTheDateTitle) {
        alert("יש להזין כותרת מתחת ל־Save The Date.");
        return;
      }

      if (!isSaveTheDate && !cleanEventTitle) {
        alert("חסר שם אירוע לשליחת ההזמנה.");
        return;
      }

      if (!cleanEventDate) {
        alert("חסר תאריך אירוע לשליחת ההודעה.");
        return;
      }

      if (!isSaveTheDate && !cleanEventLocation) {
        alert("חסר מיקום אירוע לשליחת ההזמנה.");
        return;
      }

      const templateName = isSaveTheDate
        ? "save_the_date_image_he"
        : "event_invitation_image_he";

      const templateVariables = isSaveTheDate
        ? {
            saveTheDateTitle: cleanSaveTheDateTitle,
            eventDate: cleanEventDate,
          }
        : {
            invitationTitle: cleanEventTitle,
            eventDate: cleanEventDate,
            eventLocation: cleanEventLocation,
          };

      const payload = {
        invitationId: cleanInvitationId,
        messageType: activePreTab,
        channel: "whatsapp",
        sendTiming,
        scheduledDate: sendTiming === "scheduled" ? scheduledDate : "",
        scheduledTime: sendTiming === "scheduled" ? scheduledTime : "",
        templateName,
        templateVariables,
        saveTheDateTitle: isSaveTheDate ? cleanSaveTheDateTitle : "",
        message: currentMessage,
        previewMessage,
        hasImage: Boolean(currentImageFile),
      };

      console.log("PRE RSVP SEND PAYLOAD:", payload);

      const formData = new FormData();

      formData.append("invitationId", payload.invitationId);
      formData.append("messageType", payload.messageType);
      formData.append("channel", payload.channel);
      formData.append("sendTiming", payload.sendTiming);
      formData.append("scheduledDate", payload.scheduledDate);
      formData.append("scheduledTime", payload.scheduledTime);
      formData.append("templateName", payload.templateName);
      formData.append(
        "templateVariables",
        JSON.stringify(payload.templateVariables)
      );
      formData.append("saveTheDateTitle", payload.saveTheDateTitle);
      formData.append("message", payload.message);
      formData.append("previewMessage", payload.previewMessage);

      if (currentImageFile) {
        formData.append("image", currentImageFile);
      }

      setIsSubmitting(true);

      const res = await fetch("/api/messages/pre-rsvp/whatsapp", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "שליחת הבקשה נכשלה");
      }

      alert(
        sendTiming === "scheduled"
          ? "הודעת הוואטסאפ תוזמנה בהצלחה."
          : "הודעת הוואטסאפ נשלחה לשליחה מיידית."
      );
    } catch (err: any) {
      console.error("❌ PRE RSVP WHATSAPP SUBMIT ERROR:", err);
      alert(err?.message || "שגיאה בשליחת הודעת וואטסאפ.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 p-5 md:p-8 lg:grid-cols-[460px_1fr]">
      <div>
        <div
          className="
            sticky
            top-6
            rounded-[34px]
            border
            border-[#E6D8C5]
            bg-[#FBF7EF]/90
            p-6
            shadow-[0_26px_70px_rgba(72,48,28,0.11)]
            backdrop-blur-xl
          "
        >
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black text-[#2D241D]">
                תצוגה מקדימה
              </h3>

              <p className="mt-1 text-sm font-bold text-[#8A7A6B]">
                כך תיראה הודעת הוואטסאפ
              </p>
            </div>

            <div
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-[18px]
                bg-[#F4E5CC]
                text-2xl
                shadow-sm
              "
            >
              ✨
            </div>
          </div>

          <PhonePreview
            title="INVISTIMO · WHATSAPP"
            message={previewMessage}
            imageUrl={currentImage}
          />

          <div className="mt-7 grid grid-cols-3 gap-3">
            <PreviewStat
              value={activePreTab === "save_the_date" ? "Save" : "Invite"}
              label="סוג הודעה"
            />
            <PreviewStat value="WA" label="ערוץ" />
            <PreviewStat
              value={sendTiming === "scheduled" ? "מתוזמן" : "מיידי"}
              label="שליחה"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Panel
          icon="💌"
          title="טרום אישורי הגעה"
          description="שליחה מוקדמת בוואטסאפ בלבד, ללא פתיחת RSVP"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PreSubTabButton
              active={activePreTab === "save_the_date"}
              icon="💌"
              title="Save The Date"
              description="שריון תאריך לפני פתיחת אישורי הגעה"
              onClick={() => setActivePreTab("save_the_date")}
            />

            <PreSubTabButton
              active={activePreTab === "invitation_only"}
              icon="✨"
              title="שליחת הזמנות"
              description="הזמנה כללית ללא אישור הגעה"
              onClick={() => setActivePreTab("invitation_only")}
            />
          </div>
        </Panel>

        <Panel
          icon="📩"
          title="ערוץ שליחה"
          description="הודעות טרום אישורי הגעה נשלחות בוואטסאפ בלבד"
        >
          <div
            className="
              rounded-[24px]
              border
              border-[#D6A64F]
              bg-[#FFF1D2]
              p-5
            "
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-black text-[#3A3028]">
                  WhatsApp
                </div>

                <div className="mt-1 text-sm font-bold text-[#8A7A6B]">
                  שליחה מוקדמת לאורחים ללא כפתורי אישור הגעה.
                </div>
              </div>

              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-[18px]
                  bg-white
                  text-2xl
                  shadow-sm
                "
              >
                🟢
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          icon="👥"
          title="קהל יעד"
          description="הקהל נקבע אוטומטית מרשימת האורחים"
        >
          <div className="rounded-[24px] border border-[#E7D8C3] bg-white p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MiniStat value="כל האורחים" label="ברירת מחדל" />
              <MiniStat value="WhatsApp" label="ערוץ שליחה" />
              <MiniStat value="ללא RSVP" label="לא משנה סטטוסים" />
            </div>
          </div>
        </Panel>

        <Panel
          icon="✍️"
          title={
            activePreTab === "save_the_date"
              ? "הגדרת הודעת Save The Date"
              : "הגדרת הודעת הזמנה"
          }
          description="תבנית WhatsApp קבועה"
        >
          <div className="space-y-5">
            {activePreTab === "save_the_date" && (
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
                    rounded-[22px]
                    border
                    border-[#E4D3BC]
                    bg-white
                    px-4
                    py-3
                    text-sm
                    font-bold
                    text-[#2D241D]
                    outline-none
                    transition
                    placeholder:text-[#B4A596]
                    focus:border-[#C5964D]
                    focus:ring-4
                    focus:ring-[#D8B878]/20
                  "
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-black text-[#3A3028]">
                תמונה להודעה
              </label>

              <div
                className="
                  rounded-[26px]
                  border
                  border-dashed
                  border-[#D6A64F]
                  bg-[#FFF8ED]
                  p-4
                  transition
                  hover:bg-[#FFF1D2]
                "
              >
                {currentImage ? (
                  <div className="space-y-3">
                    <img
                      src={currentImage}
                      alt="תמונה להודעה"
                      className="
                        h-48
                        w-full
                        rounded-[22px]
                        object-cover
                        shadow-sm
                      "
                    />

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <label
                        className="
                          flex
                          flex-1
                          cursor-pointer
                          items-center
                          justify-center
                          rounded-[18px]
                          bg-white
                          px-4
                          py-3
                          text-sm
                          font-black
                          text-[#8A6A3D]
                          shadow-sm
                          transition
                          hover:bg-[#FAF3E9]
                        "
                      >
                        החלפת תמונה
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleImageChange(e.target.files?.[0] || null)
                          }
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="
                          rounded-[18px]
                          border
                          border-[#E0CFB8]
                          bg-white
                          px-4
                          py-3
                          text-sm
                          font-black
                          text-[#8A6A3D]
                          shadow-sm
                          transition
                          hover:bg-[#FAF3E9]
                        "
                      >
                        הסרת תמונה
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    className="
                      flex
                      cursor-pointer
                      flex-col
                      items-center
                      justify-center
                      gap-3
                      px-5
                      py-6
                      text-center
                    "
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleImageChange(e.target.files?.[0] || null)
                      }
                    />

                    <div
                      className="
                        flex
                        h-14
                        w-14
                        items-center
                        justify-center
                        rounded-[20px]
                        bg-white
                        text-2xl
                        shadow-sm
                      "
                    >
                      🖼️
                    </div>

                    <div>
                      <div className="text-sm font-black text-[#3A3028]">
                        העלאת תמונה להודעת WhatsApp
                      </div>

                      <div className="mt-1 text-xs font-bold text-[#8A7A6B]">
                        התמונה תופיע מעל הטקסט בתצוגה המקדימה.
                      </div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-black text-[#3A3028]">
                תבנית ההודעה
              </label>

              <div
                className="
                  relative
                  overflow-hidden
                  rounded-[26px]
                  border
                  border-[#E4D3BC]
                  bg-[#F8F1E8]
                  px-4
                  py-4
                "
              >
                <div
                  className="
                    mb-3
                    inline-flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-[#E2D1B8]
                    bg-white
                    px-3
                    py-1.5
                    text-xs
                    font-black
                    text-[#8A6A3D]
                    shadow-sm
                  "
                >
                  🔒 תבנית קבועה
                </div>

                <pre
                  className="
                    whitespace-pre-wrap
                    break-words
                    text-right
                    text-sm
                    font-semibold
                    leading-8
                    text-[#3A3028]
                  "
                >
                  {previewMessage}
                </pre>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          icon="📥"
          title="שליחת הודעה"
          description="ברירת המחדל היא שליחה מתוזמנת בוואטסאפ"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SendTimingButton
                active={sendTiming === "immediate"}
                icon="🚀"
                title="שליחה מיידית"
                description="ההודעה תישלח עכשיו."
                onClick={() => setSendTiming("immediate")}
              />

              <SendTimingButton
                active={sendTiming === "scheduled"}
                icon="🗓️"
                title="שליחה מתוזמנת"
                description="האורחים יקבלו בזמן שתבחרי."
                onClick={() => setSendTiming("scheduled")}
              />
            </div>

            {sendTiming === "scheduled" && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-black text-[#8A6A3D]">
                    תאריך שליחה
                  </label>

                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="
                      w-full
                      rounded-[22px]
                      border
                      border-[#E4D3BC]
                      bg-white
                      px-4
                      py-3
                      text-sm
                      font-bold
                      text-[#2D241D]
                      outline-none
                      focus:border-[#C5964D]
                      focus:ring-4
                      focus:ring-[#D8B878]/20
                    "
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-[#8A6A3D]">
                    שעת שליחה
                  </label>

                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="
                      w-full
                      rounded-[22px]
                      border
                      border-[#E4D3BC]
                      bg-white
                      px-4
                      py-3
                      text-sm
                      font-bold
                      text-[#2D241D]
                      outline-none
                      focus:border-[#C5964D]
                      focus:ring-4
                      focus:ring-[#D8B878]/20
                    "
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="
                w-full
                rounded-[24px]
                bg-[#CBB78D]
                px-5
                py-4
                text-lg
                font-black
                text-white
                shadow-[0_16px_32px_rgba(139,90,34,0.20)]
                transition
                hover:scale-[1.01]
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-60
                disabled:hover:scale-100
              "
            >
              {isSubmitting
                ? "שולח בקשה..."
                : sendTiming === "scheduled"
                  ? "תזמן שליחה בוואטסאפ ⏱️"
                  : "שליחה מיידית בוואטסאפ 🚀"}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ================= UI Components ================= */

function Panel({
  icon,
  title,
  description,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      className="
        rounded-[34px]
        border
        border-[#E6D8C5]
        bg-[#FBF7EF]/88
        p-6
        shadow-[0_22px_60px_rgba(72,48,28,0.08)]
      "
    >
      <div className="mb-5 flex items-start gap-4">
        <div
          className="
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            rounded-[18px]
            bg-[#F4E5CC]
            text-2xl
            shadow-sm
          "
        >
          {icon}
        </div>

        <div>
          <h3 className="text-2xl font-black text-[#2D241D]">{title}</h3>
          <p className="mt-1 text-sm font-bold text-[#8A7A6B]">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function PreSubTabButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-[24px]
        border
        p-5
        text-right
        transition
        ${
          active
            ? "border-[#D6A64F] bg-[#FFF1D2] shadow-[0_14px_30px_rgba(139,90,34,0.12)]"
            : "border-[#E6D8C5] bg-white hover:bg-[#FFF8ED]"
        }
      `}
    >
      <div className="flex items-center gap-4">
        <span
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-[16px]
            bg-white
            text-xl
            shadow-sm
          "
        >
          {icon}
        </span>

        <div>
          <div className="text-base font-black text-[#2D241D]">{title}</div>
          <div className="mt-1 text-xs font-bold text-[#8A7A6B]">
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}

function SendTimingButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-[24px]
        border
        p-5
        text-right
        transition
        ${
          active
            ? "border-[#D6A64F] bg-[#FFF1D2]"
            : "border-[#E6D8C5] bg-white hover:bg-[#FFF8ED]"
        }
      `}
    >
      <div className="flex items-center gap-4">
        <span
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-[16px]
            bg-white
            text-xl
            shadow-sm
          "
        >
          {icon}
        </span>

        <div>
          <div className="text-base font-black text-[#2D241D]">{title}</div>
          <div className="mt-1 text-xs font-bold text-[#8A7A6B]">
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="
        rounded-[20px]
        border
        border-[#EFE4D5]
        bg-[#FFFDF9]
        px-4
        py-4
        text-center
        shadow-sm
      "
    >
      <div className="text-base font-black text-[#3A3028]">{value}</div>
      <div className="mt-1 text-xs font-black text-[#8A7A6B]">{label}</div>
    </div>
  );
}

function PhonePreview({
  title,
  message,
  imageUrl,
}: {
  title: string;
  message: string;
  imageUrl?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div
        className="
          mx-auto
          overflow-hidden
          rounded-[46px]
          border-[10px]
          border-black
          bg-[#EFE5D6]
          shadow-[0_26px_60px_rgba(0,0,0,0.18)]
        "
      >
        <div className="relative h-8 bg-[#EFE5D6]">
          <div
            className="
              absolute
              left-1/2
              top-0
              h-8
              w-28
              -translate-x-1/2
              rounded-b-[20px]
              bg-black
            "
          />
        </div>

        <div
          className="
            border-b
            border-[#D9CAB7]
            bg-[#E9DDCD]
            px-4
            py-3
            text-center
            text-[11px]
            font-black
            text-[#7A5F43]
          "
        >
          {title}
        </div>

        <div
          className="
            flex
            min-h-[430px]
            items-center
            justify-center
            px-6
            py-8
          "
        >
          <div
            className="
              w-full
              rounded-[18px]
              bg-white
              px-4
              py-5
              text-center
              shadow-[0_14px_35px_rgba(70,48,28,0.10)]
            "
          >
            {imageUrl && (
              <img
                src={imageUrl}
                alt="תמונה להודעה"
                className="
                  mb-4
                  h-36
                  w-full
                  rounded-[16px]
                  object-cover
                "
              />
            )}

            <pre
              className="
                whitespace-pre-wrap
                break-words
                text-center
                text-sm
                font-medium
                leading-8
                text-[#3A3028]
              "
            >
              {message}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="
        rounded-[18px]
        bg-white
        px-3
        py-3
        text-center
        shadow-[0_12px_30px_rgba(72,48,28,0.08)]
      "
    >
      <div className="text-base font-black text-[#3A3028]">{value}</div>
      <div className="mt-1 text-[11px] font-black text-[#8A7A6B]">{label}</div>
    </div>
  );
}

/* ================= Tab Button ================= */

function TabButton({
  label,
  description,
  icon,
  active,
  onClick,
}: {
  label: string;
  description: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group
        relative
        overflow-hidden
        rounded-[24px]
        px-5
        py-4
        text-right
        transition-all
        duration-300
        ${
          active
            ? `
              bg-gradient-to-br
              from-[#A36C22]
              via-[#C5964D]
              to-[#8B5A22]
              text-white
              shadow-[0_18px_38px_rgba(139,90,34,0.26)]
              scale-[1.01]
            `
            : `
              bg-[#F3EEE8]
              text-[#3A3028]
              hover:bg-[#EEE5DA]
              hover:shadow-[0_12px_28px_rgba(82,58,34,0.08)]
            `
        }
      `}
    >
      <div
        className="
          relative
          z-10
          flex
          items-center
          justify-between
          gap-4
        "
      >
        <div className="flex items-center gap-3">
          <span
            className={`
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-[18px]
              text-lg
              shadow-sm
              ${
                active
                  ? "bg-white/20 text-white"
                  : "bg-white text-[#A36C22]"
              }
            `}
          >
            {icon}
          </span>

          <div>
            <div
              className={`
                text-base
                font-black
                ${active ? "text-white" : "text-[#2E261F]"}
              `}
            >
              {label}
            </div>

            <div
              className={`
                mt-0.5
                text-xs
                font-bold
                ${active ? "text-white/75" : "text-[#8A7A6B]"}
              `}
            >
              {description}
            </div>
          </div>
        </div>

        {active && (
          <span
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-full
              bg-white
              text-sm
              font-black
              text-[#9B671F]
              shadow-sm
            "
          >
            ✓
          </span>
        )}
      </div>

      {active && (
        <>
          <div
            className="
              pointer-events-none
              absolute
              -left-10
              -top-10
              h-28
              w-28
              rounded-full
              bg-white/16
              blur-xl
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              inset-x-10
              bottom-0
              h-1
              rounded-full
              bg-[#F1DDA9]
            "
          />
        </>
      )}
    </button>
  );
}