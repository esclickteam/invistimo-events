"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

/* ================= TYPES ================= */

type PreRsvpUpsellMode =
  | "none"
  | "save_the_date_only"
  | "invitation_only"
  | "both";

type PreRsvpAccess = {
  enabled?: boolean;
  mode?: PreRsvpUpsellMode;
  saveTheDateEnabled?: boolean;
  invitationOnlyEnabled?: boolean;
  saveTheDateSentCount?: number;
  saveTheDateSentAt?: Date | string | null;
  invitationOnlySentCount?: number;
  invitationOnlySentAt?: Date | string | null;

  // תאימות לאחור למבנה הישן שהיה חסימה כללית אחת
  sentCount?: number;
  sentAt?: Date | string | null;
};

type PreRsvpMedia = {
  saveTheDateImageUrl?: string;
  saveTheDateImagePublicId?: string;
  invitationOnlyImageUrl?: string;
  invitationOnlyImagePublicId?: string;
};

type PreRsvpTabProps = {
  invitationId: string;
  invitationTitle: string;
  eventDate: string;
  eventLocation: string;
  eventType?: string;
  giftCreditUrl?: string;
  preRsvpMedia?: PreRsvpMedia;
  lat?: number;
  lng?: number;
  preRsvpMessages?: PreRsvpAccess | null;
};

type PreRsvpType = "save_the_date" | "invitation_only";
type SendTiming = "scheduled" | "immediate";

/* ================= DEFAULTS ================= */

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

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function getHighQualityCloudinaryImageUrl(value: unknown) {
  const url = cleanString(value);

  if (!url) return "";

  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  const [beforeUpload, afterUpload] = url.split("/upload/");

  if (!beforeUpload || !afterUpload) return url;

  const cleanedAfterUpload = afterUpload
    .replace(/^q_100,f_png\//, "")
    .replace(/^f_png,q_100\//, "")
    .replace(/^q_100[^/]*\//, "")
    .replace(/^f_png[^/]*\//, "")
    .replace(/^f_auto,q_auto[^/]*\//, "")
    .replace(/^q_auto,f_auto[^/]*\//, "")
    .replace(/^q_auto[^/]*\//, "")
    .replace(/^f_auto[^/]*\//, "")
    .replace(/^c_fill[^/]*\//, "")
    .replace(/^c_fit[^/]*\//, "")
    .replace(/^c_pad[^/]*\//, "")
    .replace(/^w_\d+[^/]*\//, "")
    .replace(/^h_\d+[^/]*\//, "");

  return `${beforeUpload}/upload/q_100,f_png/${cleanedAfterUpload}`;
}

function normalizePreviewText(value: string) {
  return value.replace(/\n{3,}/g, "\n\n").trim();
}

function replaceMessageVariables({
  message,
  saveTheDateTitle,
  invitationTitle,
  eventDate,
  eventLocation,
}: {
  message: string;
  saveTheDateTitle?: string;
  invitationTitle?: string;
  eventDate?: string;
  eventLocation?: string;
}) {
  const customTitle = cleanString(saveTheDateTitle);
  const title = cleanString(invitationTitle);
  const date = cleanString(eventDate);
  const location = cleanString(eventLocation);

  return normalizePreviewText(
    message
      .replaceAll("{כותרת סייב דה דייט}", customTitle || "כותרת האירוע")
      .replaceAll("{שם האירוע}", title || "שם האירוע")
      .replaceAll("{תאריך אירוע}", date || "תאריך האירוע")
      .replaceAll("{מיקום האירוע}", location || "מיקום האירוע")
  );
}

function createImagePreview(file: File | null) {
  if (!file) return "";
  return URL.createObjectURL(file);
}

function getCurrentTemplate(mode: PreRsvpType) {
  return mode === "save_the_date"
    ? DEFAULT_SAVE_THE_DATE_MESSAGE
    : DEFAULT_INVITATION_ONLY_MESSAGE;
}

function getModeTitle(mode: PreRsvpType) {
  return mode === "save_the_date" ? "Save The Date" : "שליחת הזמנות";
}

function getPreRsvpAccess(preRsvpMessages?: PreRsvpAccess | null) {
  /*
    אם הקומפוננטה עדיין לא קיבלה הרשאות מהשרת,
    משאירים תאימות לאחור ולא שוברים את המסך הקיים.
    ברגע שהפרונט יעביר preRsvpMessages מה-User,
    ההרשאות ייאכפו לפי המצב שנשמר ביוזר.
  */
  if (!preRsvpMessages) {
    return {
      enabled: true,
      mode: "both" as PreRsvpUpsellMode,
      saveTheDateEnabled: true,
      invitationOnlyEnabled: true,
      saveTheDateUsed: false,
      invitationOnlyUsed: false,
      legacyUsed: false,
    };
  }

  const mode = cleanString(preRsvpMessages.mode) as PreRsvpUpsellMode;
  const safeMode: PreRsvpUpsellMode =
    mode === "save_the_date_only" ||
    mode === "invitation_only" ||
    mode === "both"
      ? mode
      : "none";

  const enabled = Boolean(preRsvpMessages.enabled) && safeMode !== "none";

  const saveTheDateEnabled = Boolean(
    preRsvpMessages.saveTheDateEnabled ||
      safeMode === "save_the_date_only" ||
      safeMode === "both"
  );

  const invitationOnlyEnabled = Boolean(
    preRsvpMessages.invitationOnlyEnabled ||
      safeMode === "invitation_only" ||
      safeMode === "both"
  );

  const legacyUsed =
    Number(preRsvpMessages.sentCount || 0) >= 1 ||
    Boolean(preRsvpMessages.sentAt);

  const saveTheDateUsed =
    Number(preRsvpMessages.saveTheDateSentCount || 0) >= 1 ||
    Boolean(preRsvpMessages.saveTheDateSentAt);

  const invitationOnlyUsed =
    Number(preRsvpMessages.invitationOnlySentCount || 0) >= 1 ||
    Boolean(preRsvpMessages.invitationOnlySentAt);

  return {
    enabled,
    mode: safeMode,
    saveTheDateEnabled: enabled && saveTheDateEnabled,
    invitationOnlyEnabled: enabled && invitationOnlyEnabled,
    saveTheDateUsed: legacyUsed || saveTheDateUsed,
    invitationOnlyUsed: legacyUsed || invitationOnlyUsed,
    legacyUsed,
  };
}

function canUsePreRsvpMode({
  mode,
  access,
}: {
  mode: PreRsvpType;
  access: ReturnType<typeof getPreRsvpAccess>;
}) {
  if (!access.enabled) return false;

  if (mode === "save_the_date") {
    return access.saveTheDateEnabled && !access.saveTheDateUsed;
  }

  return access.invitationOnlyEnabled && !access.invitationOnlyUsed;
}

function getPreRsvpLockedReason({
  mode,
  access,
}: {
  mode: PreRsvpType;
  access: ReturnType<typeof getPreRsvpAccess>;
}) {
  if (!access.enabled) {
    return "השירות לא פתוח בחבילה הנוכחית.";
  }

  if (mode === "save_the_date") {
    if (!access.saveTheDateEnabled) {
      return "Save The Date לא פתוח בחבילה שנבחרה.";
    }

    if (access.saveTheDateUsed) {
      return "Save The Date כבר נשלח בפועל ולכן נעול לשימוש חוזר.";
    }
  }

  if (mode === "invitation_only") {
    if (!access.invitationOnlyEnabled) {
      return "שליחת הזמנה מוקדמת לא פתוחה בחבילה שנבחרה.";
    }

    if (access.invitationOnlyUsed) {
      return "שליחת הזמנה מוקדמת כבר נשלחה בפועל ולכן נעולה לשימוש חוזר.";
    }
  }

  return "";
}

function getFirstAvailablePreRsvpMode(
  access: ReturnType<typeof getPreRsvpAccess>
): PreRsvpType {
  if (canUsePreRsvpMode({ mode: "save_the_date", access })) {
    return "save_the_date";
  }

  if (canUsePreRsvpMode({ mode: "invitation_only", access })) {
    return "invitation_only";
  }

  if (access.saveTheDateEnabled) return "save_the_date";
  if (access.invitationOnlyEnabled) return "invitation_only";

  return "save_the_date";
}

/* ================= COMPONENT ================= */

export default function PreRsvpTab({
  invitationId,
  invitationTitle,
  eventDate,
  eventLocation,
  preRsvpMedia,
  preRsvpMessages,
}: PreRsvpTabProps) {
  const [activeMode, setActiveMode] = useState<PreRsvpType>("save_the_date");

  const preRsvpAccess = useMemo(
    () => getPreRsvpAccess(preRsvpMessages),
    [preRsvpMessages]
  );

  const activeModeAvailable = useMemo(
    () => canUsePreRsvpMode({ mode: activeMode, access: preRsvpAccess }),
    [activeMode, preRsvpAccess]
  );

  const activeModeLockedReason = useMemo(
    () => getPreRsvpLockedReason({ mode: activeMode, access: preRsvpAccess }),
    [activeMode, preRsvpAccess]
  );

  const [sendTiming, setSendTiming] = useState<SendTiming>("scheduled");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const [saveTheDateTitle, setSaveTheDateTitle] = useState("");

  const [saveTheDateImage, setSaveTheDateImage] = useState("");
  const [invitationOnlyImage, setInvitationOnlyImage] = useState("");

  const [saveTheDateImageFile, setSaveTheDateImageFile] =
    useState<File | null>(null);
  const [invitationOnlyImageFile, setInvitationOnlyImageFile] =
    useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savedSaveTheDateImageUrl, setSavedSaveTheDateImageUrl] = useState("");
  const [savedInvitationOnlyImageUrl, setSavedInvitationOnlyImageUrl] =
    useState("");

  const currentTemplate = getCurrentTemplate(activeMode);

  const currentImage =
    activeMode === "save_the_date" ? saveTheDateImage : invitationOnlyImage;

  const currentImageFile =
    activeMode === "save_the_date"
      ? saveTheDateImageFile
      : invitationOnlyImageFile;

  const currentSavedImageUrl = getHighQualityCloudinaryImageUrl(
    activeMode === "save_the_date"
      ? savedSaveTheDateImageUrl
      : savedInvitationOnlyImageUrl
  );

  const displayImage = currentImage || currentSavedImageUrl;

  const previewMessage = useMemo(() => {
    return replaceMessageVariables({
      message: currentTemplate,
      saveTheDateTitle,
      invitationTitle,
      eventDate,
      eventLocation,
    });
  }, [
    currentTemplate,
    saveTheDateTitle,
    invitationTitle,
    eventDate,
    eventLocation,
  ]);

  useEffect(() => {
    setSavedSaveTheDateImageUrl(
      getHighQualityCloudinaryImageUrl(preRsvpMedia?.saveTheDateImageUrl)
    );
    setSavedInvitationOnlyImageUrl(
      getHighQualityCloudinaryImageUrl(preRsvpMedia?.invitationOnlyImageUrl)
    );
  }, [
    preRsvpMedia?.saveTheDateImageUrl,
    preRsvpMedia?.invitationOnlyImageUrl,
  ]);

  useEffect(() => {
    if (activeModeAvailable) return;

    const nextMode = getFirstAvailablePreRsvpMode(preRsvpAccess);

    if (nextMode !== activeMode) {
      setActiveMode(nextMode);
    }
  }, [activeMode, activeModeAvailable, preRsvpAccess]);

  useEffect(() => {
    return () => {
      if (saveTheDateImage) URL.revokeObjectURL(saveTheDateImage);
      if (invitationOnlyImage) URL.revokeObjectURL(invitationOnlyImage);
    };
  }, [saveTheDateImage, invitationOnlyImage]);

  async function handleImageChange(file: File | null) {
    if (!file) return;

    const localPreview = createImagePreview(file);

    if (activeMode === "save_the_date") {
      if (saveTheDateImage && saveTheDateImage.startsWith("blob:")) {
        URL.revokeObjectURL(saveTheDateImage);
      }
      setSaveTheDateImage(localPreview);
      setSaveTheDateImageFile(file);
    } else {
      if (invitationOnlyImage && invitationOnlyImage.startsWith("blob:")) {
        URL.revokeObjectURL(invitationOnlyImage);
      }
      setInvitationOnlyImage(localPreview);
      setInvitationOnlyImageFile(file);
    }

    try {
      const cleanInvitationId = cleanString(invitationId);

      if (!cleanInvitationId) {
        throw new Error("לא נמצאה הזמנה פעילה לשמירת התמונה.");
      }

      const formData = new FormData();

      formData.append("invitationId", cleanInvitationId);
      formData.append("messageType", activeMode);
      formData.append("image", file);

      const res = await fetch("/api/messages/pre-rsvp/media", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "שמירת התמונה נכשלה.");
      }

      const savedImageUrl = getHighQualityCloudinaryImageUrl(data?.imageUrl);

      if (!savedImageUrl) {
        throw new Error("התמונה נשמרה אבל לא התקבל קישור תקין.");
      }

      if (activeMode === "save_the_date") {
        if (localPreview.startsWith("blob:")) {
          URL.revokeObjectURL(localPreview);
        }
        setSaveTheDateImage("");
        setSaveTheDateImageFile(null);
        setSavedSaveTheDateImageUrl(savedImageUrl);
      } else {
        if (localPreview.startsWith("blob:")) {
          URL.revokeObjectURL(localPreview);
        }
        setInvitationOnlyImage("");
        setInvitationOnlyImageFile(null);
        setSavedInvitationOnlyImageUrl(savedImageUrl);
      }
    } catch (err: any) {
      console.error("❌ PRE RSVP IMAGE SAVE ERROR:", err);
      alert(err?.message || "שגיאה בשמירת התמונה.");

      if (activeMode === "save_the_date") {
        if (localPreview.startsWith("blob:")) {
          URL.revokeObjectURL(localPreview);
        }
        setSaveTheDateImage("");
        setSaveTheDateImageFile(null);
      } else {
        if (localPreview.startsWith("blob:")) {
          URL.revokeObjectURL(localPreview);
        }
        setInvitationOnlyImage("");
        setInvitationOnlyImageFile(null);
      }
    }
  }

  async function handleRemoveImage() {
    const wasSaveTheDate = activeMode === "save_the_date";
    const previousSavedImageUrl = wasSaveTheDate
      ? savedSaveTheDateImageUrl
      : savedInvitationOnlyImageUrl;

    try {
      const cleanInvitationId = cleanString(invitationId);

      if (!cleanInvitationId) {
        throw new Error("לא נמצאה הזמנה פעילה להסרת התמונה.");
      }

      if (wasSaveTheDate) {
        if (saveTheDateImage && saveTheDateImage.startsWith("blob:")) {
          URL.revokeObjectURL(saveTheDateImage);
        }
        setSaveTheDateImage("");
        setSaveTheDateImageFile(null);
        setSavedSaveTheDateImageUrl("");
      } else {
        if (invitationOnlyImage && invitationOnlyImage.startsWith("blob:")) {
          URL.revokeObjectURL(invitationOnlyImage);
        }
        setInvitationOnlyImage("");
        setInvitationOnlyImageFile(null);
        setSavedInvitationOnlyImageUrl("");
      }

      const res = await fetch("/api/messages/pre-rsvp/media", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationId: cleanInvitationId,
          messageType: activeMode,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || "הסרת התמונה נכשלה.");
      }
    } catch (err: any) {
      console.error("❌ PRE RSVP IMAGE REMOVE ERROR:", err);
      alert(err?.message || "שגיאה בהסרת התמונה.");

      if (wasSaveTheDate) {
        setSavedSaveTheDateImageUrl(previousSavedImageUrl);
      } else {
        setSavedInvitationOnlyImageUrl(previousSavedImageUrl);
      }
    }
  }

  async function handleSubmit() {
    try {
      if (isSubmitting) return;

      if (!activeModeAvailable) {
        alert(activeModeLockedReason || "האפשרות הזו לא זמינה בחבילה הנוכחית.");
        return;
      }

      const isSaveTheDate = activeMode === "save_the_date";

      const cleanInvitationId = cleanString(invitationId);
      const cleanSaveTheDateTitle = cleanString(saveTheDateTitle);
      const cleanInvitationTitle = cleanString(invitationTitle);
      const cleanEventDate = cleanString(eventDate);
      const cleanEventLocation = cleanString(eventLocation);

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

      if (!isSaveTheDate && !cleanInvitationTitle) {
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

      if (!currentImageFile && !currentSavedImageUrl) {
        alert(
          isSaveTheDate
            ? "יש להעלות תמונה ייעודית ל־Save The Date לפני השליחה."
            : "יש להעלות תמונה ייעודית להזמנה מוקדמת לפני השליחה."
        );
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
            invitationTitle: cleanInvitationTitle,
            eventDate: cleanEventDate,
            eventLocation: cleanEventLocation,
          };

      const formData = new FormData();

      formData.append("invitationId", cleanInvitationId);
      formData.append("messageType", activeMode);
      formData.append("channel", "whatsapp");
      formData.append("sendTiming", sendTiming);
      formData.append("scheduledDate", sendTiming === "scheduled" ? scheduledDate : "");
      formData.append("scheduledTime", sendTiming === "scheduled" ? scheduledTime : "");
      formData.append("templateName", templateName);
      formData.append("templateVariables", JSON.stringify(templateVariables));
      formData.append("saveTheDateTitle", isSaveTheDate ? cleanSaveTheDateTitle : "");
      formData.append("invitationTitle", isSaveTheDate ? "" : cleanInvitationTitle);
      formData.append("eventDate", cleanEventDate);
      formData.append("eventLocation", isSaveTheDate ? "" : cleanEventLocation);
      formData.append("message", currentTemplate);
      formData.append("previewMessage", previewMessage);

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

      const savedImageUrl = getHighQualityCloudinaryImageUrl(data?.imageUrl || "");

      if (savedImageUrl) {
        if (activeMode === "save_the_date") {
          if (saveTheDateImage && saveTheDateImage.startsWith("blob:")) {
            URL.revokeObjectURL(saveTheDateImage);
          }
          setSaveTheDateImage(savedImageUrl);
          setSaveTheDateImageFile(null);
        } else {
          if (invitationOnlyImage && invitationOnlyImage.startsWith("blob:")) {
            URL.revokeObjectURL(invitationOnlyImage);
          }
          setInvitationOnlyImage(savedImageUrl);
          setInvitationOnlyImageFile(null);
        }
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
    <div className="grid grid-cols-1 gap-6 p-5 md:p-8 xl:grid-cols-[460px_1fr]">
      {/* ================= Preview Side - RIGHT IN RTL ================= */}
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

            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#F4E5CC] text-2xl shadow-sm">
              ✨
            </div>
          </div>

          <PhonePreview
            title="INVISTIMO · WHATSAPP"
            message={previewMessage}
            imageUrl={displayImage}
          />

          <div className="mt-7 grid grid-cols-3 gap-3">
            <PreviewStat value={getModeTitle(activeMode)} label="סוג הודעה" />
            <PreviewStat value="WA" label="ערוץ" />
            <PreviewStat
              value={sendTiming === "scheduled" ? "מתוזמן" : "מיידי"}
              label="שליחה"
            />
          </div>
        </div>
      </div>

      {/* ================= Settings Side - LEFT IN RTL ================= */}
      <div className="space-y-6">
        <Panel
          icon="💌"
          title="טרום אישורי הגעה"
          description="שליחה מוקדמת בוואטסאפ בלבד, ללא פתיחת RSVP וללא שינוי סטטוסים."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SubTabButton
              active={activeMode === "save_the_date"}
              disabled={
                !canUsePreRsvpMode({
                  mode: "save_the_date",
                  access: preRsvpAccess,
                })
              }
              icon="💌"
              title="Save The Date"
              description={
                getPreRsvpLockedReason({
                  mode: "save_the_date",
                  access: preRsvpAccess,
                }) || "שריון תאריך לפני שליחת ההזמנה"
              }
              onClick={() => setActiveMode("save_the_date")}
            />

            <SubTabButton
              active={activeMode === "invitation_only"}
              disabled={
                !canUsePreRsvpMode({
                  mode: "invitation_only",
                  access: preRsvpAccess,
                })
              }
              icon="✨"
              title="שליחת הזמנות"
              description={
                getPreRsvpLockedReason({
                  mode: "invitation_only",
                  access: preRsvpAccess,
                }) || "הזמנה כללית ללא אישור הגעה"
              }
              onClick={() => setActiveMode("invitation_only")}
            />
          </div>

          {!activeModeAvailable && activeModeLockedReason && (
            <div className="mt-4 rounded-[24px] border border-[#E0CFB8] bg-white px-4 py-4 text-sm font-bold leading-7 text-[#8A6A3D]">
              🔒 {activeModeLockedReason}
            </div>
          )}
        </Panel>

        <Panel
          icon="📩"
          title="ערוץ שליחה"
          description="הודעות טרום אישורי הגעה נשלחות בוואטסאפ בלבד."
        >
          <div className="rounded-[24px] border border-[#D6A64F] bg-[#FFF1D2] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-black text-[#3A3028]">
                  WhatsApp
                </div>

                <div className="mt-1 text-sm font-bold text-[#8A7A6B]">
                  הודעה מוקדמת לאורחים, בלי כפתורי אישור הגעה.
                </div>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-2xl shadow-sm">
                🟢
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          icon="👥"
          title="קהל יעד"
          description="הקהל נקבע אוטומטית לפי רשימת האורחים באירוע."
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
            activeMode === "save_the_date"
              ? "הגדרת הודעת Save The Date"
              : "הגדרת הודעת הזמנה"
          }
          description="תבנית WhatsApp קבועה."
        >
          <div className="space-y-5">
            {activeMode === "save_the_date" && (
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

              <div className="rounded-[26px] border border-dashed border-[#D6A64F] bg-[#FFF8ED] p-4 transition hover:bg-[#FFF1D2]">
                {displayImage ? (
                  <div className="space-y-3">
                    <img
                      src={displayImage}
                      alt="תמונה להודעה"
                      className="h-48 w-full rounded-[22px] object-cover shadow-sm"
                    />

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <label className="flex flex-1 cursor-pointer items-center justify-center rounded-[18px] bg-white px-4 py-3 text-sm font-black text-[#8A6A3D] shadow-sm transition hover:bg-[#FAF3E9]">
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
                        className="rounded-[18px] border border-[#E0CFB8] bg-white px-4 py-3 text-sm font-black text-[#8A6A3D] shadow-sm transition hover:bg-[#FAF3E9]"
                      >
                        הסרת תמונה
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-3 px-5 py-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleImageChange(e.target.files?.[0] || null)
                      }
                    />

                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white text-2xl shadow-sm">
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
          description="ברירת המחדל היא שליחה מתוזמנת בוואטסאפ."
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
              disabled={isSubmitting || !activeModeAvailable}
              className={`
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
                ${isSubmitting || !activeModeAvailable ? "cursor-not-allowed opacity-55 hover:scale-100" : ""}
              `}
            >
              {isSubmitting
                ? "שולח בקשה..."
                : !activeModeAvailable
                  ? "השליחה הזאת לא פתוחה בחבילה"
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

/* ================= UI COMPONENTS ================= */

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

          <p className="mt-1 text-sm font-bold leading-6 text-[#8A7A6B]">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function SubTabButton({
  active,
  disabled = false,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
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
        ${disabled ? "cursor-not-allowed opacity-55 hover:bg-white" : ""}
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

          <div className="mt-1 text-xs font-bold leading-5 text-[#8A7A6B]">
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

          <div className="mt-1 text-xs font-bold leading-5 text-[#8A7A6B]">
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
    max-h-[360px]
    w-full
    rounded-[16px]
    object-contain
    bg-white
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
      <div className="text-sm font-black text-[#3A3028]">{value}</div>

      <div className="mt-1 text-[11px] font-black text-[#8A7A6B]">
        {label}
      </div>
    </div>
  );
}