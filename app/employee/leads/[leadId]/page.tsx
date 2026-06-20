"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type StaffMember = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  staffType?: string;
};

type LeadFile = {
  _id: string;

  fullName?: string;
  email?: string;
  phone?: string;

  eventDate?: string | Date;
  venueName?: string;
  city?: string;

  packageName?: string;
  totalPrice?: number;
  paidAmount?: number;
  balance?: number;

  status?: string;

  leadSource?: string;
  leadProvider?: string;
  leadStatus?: string;
  interestedService?: string;
  facebookLeadId?: string;
  campaignName?: string;
  adName?: string;
  formName?: string;
  source?: string;

  assignedStaffIds?: Array<string | StaffMember>;

  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type LeadMessage = {
  _id?: string;
  id?: string;
  customerFileId?: string;
  staffId?: string | StaffMember;
  direction?: "incoming" | "outgoing";
  channel?: "whatsapp";
  from?: string;
  to?: string;
  messageText?: string;
  provider?: string;
  providerMessageId?: string;
  status?: "pending" | "sent" | "delivered" | "read" | "failed" | "received";
  errorMessage?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type LeadResponse = {
  success?: boolean;
  lead?: LeadFile;
  error?: string;
  message?: string;
};

type LeadMessagesResponse = {
  success?: boolean;
  messages?: LeadMessage[];
  leadMessage?: LeadMessage;
  error?: string;
  message?: string;
};

type WhatsappTemplateKey = "lead_opening" | "reengagement" | "after_call";

type WhatsappTemplateOption = {
  key: WhatsappTemplateKey;
  label: string;
  templateName: string;
  description: string;
  preview: string;
};

const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "חדש" },
  { value: "contacted", label: "נוצר קשר" },
  { value: "quote_sent", label: "נשלחה הצעה" },
  { value: "converted", label: "נסגר כלקוח" },
  { value: "lost", label: "לא רלוונטי" },
];

const WHATSAPP_TEMPLATE_OPTIONS: WhatsappTemplateOption[] = [
  {
    key: "lead_opening",
    label: "פתיחה לליד חדש",
    templateName: "invistimo_lead_opening_agent",
    description:
      "מתאים לליד חדש שהשאיר פרטים ועדיין לא התחיל איתנו שיחה בוואטסאפ.",
    preview:
      "שלום, כאן {{employee_name}} מ-Invistimo 😊\n\nקיבלנו את הפרטים שהשארת לגבי השירות שלנו.\nאשמח לבדוק איתך כמה פרטים קצרים כדי להתאים לך הצעה לאירוע:\n\nמה סוג האירוע?\nמה תאריך האירוע?\nכמה רשומות/מוזמנים יש לך בערך?",
  },
  {
    key: "reengagement",
    label: "חידוש שיחה אחרי 24 שעות",
    templateName: "invistimo_reengagement_agent",
    description:
      "מתאים כאשר עברו יותר מ-24 שעות מאז שהלקוח ענה ואי אפשר לשלוח הודעה רגילה.",
    preview:
      "שלום, כאן {{employee_name}} מ-Invistimo 😊\n\nרציתי להמשיך איתך את השיחה לגבי השירותים שלנו לאירוע.\nאשמח לעזור לך בהמשך התהליך ולבדוק יחד מה הכי מתאים לך.",
  },
  {
    key: "after_call",
    label: "המשך אחרי שיחת טלפון",
    templateName: "invistimo_after_call_agent",
    description:
      "מתאים לאחר שיחה טלפונית עם הלקוח ורוצים להמשיך איתו בוואטסאפ.",
    preview:
      "שלום, כאן {{employee_name}} מ-Invistimo 😊\n\nבהמשך לשיחה שלנו, רציתי להמשיך איתך כאן לגבי השירותים שלנו לאירוע.\n\nאפשר לענות לי כאן ונמשיך בצורה מסודרת.",
  },
];

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function formatDate(value?: string | Date) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | Date) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTime(value?: string | Date) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value?: number) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getLeadStatusLabel(status?: string) {
  switch (status) {
    case "new":
      return "חדש";
    case "contacted":
      return "נוצר קשר";
    case "quote_sent":
      return "נשלחה הצעה";
    case "converted":
      return "נסגר כלקוח";
    case "lost":
      return "לא רלוונטי";
    default:
      return "חדש";
  }
}

function getLeadStatusClass(status?: string) {
  switch (status) {
    case "new":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "contacted":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "quote_sent":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "converted":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "lost":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "lead":
      return "ליד";
    case "quote_sent":
      return "נשלחה הצעה";
    case "paid":
      return "שולם";
    case "active":
      return "פעיל";
    case "completed":
      return "הסתיים";
    case "cancelled":
      return "בוטל";
    default:
      return "לא הוגדר";
  }
}

function getLeadSourceLabel(source?: string, provider?: string) {
  const cleanSource = cleanText(source).toLowerCase();
  const cleanProvider = cleanText(provider).toLowerCase();

  if (cleanSource === "facebook" && cleanProvider === "make") {
    return "Facebook / Make";
  }

  if (cleanSource === "facebook") {
    return "Facebook";
  }

  if (cleanProvider === "make") {
    return "Make";
  }

  if (cleanSource) return source || "-";
  if (cleanProvider) return provider || "-";

  return "-";
}

function getMessageStatusLabel(status?: string) {
  switch (status) {
    case "pending":
      return "ממתינה";
    case "sent":
      return "נשלחה";
    case "delivered":
      return "נמסרה";
    case "read":
      return "נקראה";
    case "failed":
      return "נכשלה";
    case "received":
      return "התקבלה";
    default:
      return "לא ידוע";
  }
}

function getReadableWhatsappError(error?: string) {
  const clean = cleanText(error);

  if (!clean) return "";

  if (
    clean.includes("131047") ||
    clean.toLowerCase().includes("re-engagement")
  ) {
    return "לא ניתן לשלוח הודעה רגילה כרגע, כי עברו יותר מ-24 שעות מאז שהלקוח ענה. בחרי הודעה מוכנה מהרשימה ושלחי אותה ללקוח.";
  }

  return clean;
}

function initials(name?: string) {
  const cleanName = cleanText(name);

  if (!cleanName) return "ל";

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2);

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

function getAssignedStaffLabel(lead?: LeadFile | null) {
  const first = Array.isArray(lead?.assignedStaffIds)
    ? lead?.assignedStaffIds[0]
    : null;

  if (!first) return "לא משויך";

  if (typeof first === "string") return "משויך לעובד";

  return first.name || first.email || "עובד ללא שם";
}

function getFirstAssignedStaff(lead?: LeadFile | null) {
  const first = Array.isArray(lead?.assignedStaffIds)
    ? lead?.assignedStaffIds[0]
    : null;

  if (!first || typeof first === "string") return null;

  return first;
}

function normalizePhoneForTel(phone?: string) {
  const clean = cleanText(phone).replace(/[^\d+]/g, "");

  if (!clean) return "";

  return clean;
}

function normalizePhoneForWhatsapp(phone?: string) {
  const digits = cleanText(phone).replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("972")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `972${digits.slice(1)}`;
  }

  return digits;
}

function getMessageId(message: LeadMessage) {
  return String(
    message._id || message.id || `${message.createdAt}-${message.messageText}`
  );
}

function upsertMessageById(messages: LeadMessage[], nextMessage: LeadMessage) {
  const nextId = getMessageId(nextMessage);

  if (!nextId) return messages;

  const exists = messages.some((message) => getMessageId(message) === nextId);

  if (exists) {
    return messages.map((message) =>
      getMessageId(message) === nextId ? nextMessage : message
    );
  }

  return [...messages, nextMessage];
}

function replaceTemplateVariables(text: string, employeeName: string) {
  return text.replaceAll(
    "{{employee_name}}",
    employeeName || "נציגת השירות"
  );
}

function InfoCard({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <div
        className={`mt-2 min-h-[1.4rem] break-words text-sm ${
          strong ? "font-black text-slate-950" : "font-bold text-slate-700"
        }`}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${className}`}
    >
      {children}
    </span>
  );
}

export default function EmployeeLeadDetailsPage() {
  const params = useParams<{ leadId: string }>();
  const router = useRouter();

  const leadId = String(params?.leadId || "");

  const [lead, setLead] = useState<LeadFile | null>(null);
  const [leadStatus, setLeadStatus] = useState("new");

  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] =
    useState<WhatsappTemplateKey>("lead_opening");
  const [messagesError, setMessagesError] = useState("");
  const [messageSuccess, setMessageSuccess] = useState("");
  const [liveChatConnected, setLiveChatConnected] = useState(false);
  const [liveChatError, setLiveChatError] = useState("");

  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const assignedStaff = useMemo(() => {
    return getFirstAssignedStaff(lead);
  }, [lead]);

  const employeeName = useMemo(() => {
    return (
      cleanText(assignedStaff?.name) ||
      cleanText(assignedStaff?.email) ||
      "נציגת השירות"
    );
  }, [assignedStaff?.email, assignedStaff?.name]);

  const selectedTemplate = useMemo(() => {
    return (
      WHATSAPP_TEMPLATE_OPTIONS.find(
        (option) => option.key === selectedTemplateKey
      ) || WHATSAPP_TEMPLATE_OPTIONS[0]
    );
  }, [selectedTemplateKey]);

  const selectedTemplatePreview = useMemo(() => {
    return replaceTemplateVariables(selectedTemplate.preview, employeeName);
  }, [employeeName, selectedTemplate.preview]);

  const whatsappNumber = useMemo(() => {
    return normalizePhoneForWhatsapp(lead?.phone);
  }, [lead?.phone]);

  const telNumber = useMemo(() => {
    return normalizePhoneForTel(lead?.phone);
  }, [lead?.phone]);

  const sourceLabel = useMemo(() => {
    return getLeadSourceLabel(lead?.leadSource, lead?.leadProvider);
  }, [lead?.leadSource, lead?.leadProvider]);

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      const container = messagesScrollRef.current;

      if (!container) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    });
  }, []);

  const loadLead = useCallback(async () => {
    if (!leadId) return;

    try {
      setLoading(true);
      setError("");
      setSaveMessage("");

      const res = await fetch(`/api/employee/leads/${leadId}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await res.json().catch(() => null)) as LeadResponse | null;

      if (!res.ok || !data?.success || !data.lead) {
        throw new Error(data?.message || data?.error || "שגיאה בטעינת הליד");
      }

      setLead(data.lead);
      setLeadStatus(data.lead.leadStatus || "new");
    } catch (err) {
      console.error("LOAD EMPLOYEE LEAD FAILED:", err);
      setError(err instanceof Error ? err.message : "שגיאה בטעינת הליד");
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const loadMessages = useCallback(async () => {
    if (!leadId) return;

    try {
      setMessagesLoading(true);
      setMessagesError("");

      const res = await fetch(`/api/employee/leads/${leadId}/messages`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await res.json().catch(
        () => null
      )) as LeadMessagesResponse | null;

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.message || data?.error || "שגיאה בטעינת הודעות הליד"
        );
      }

      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      console.error("LOAD LEAD MESSAGES FAILED:", err);
      setMessagesError(
        err instanceof Error ? err.message : "שגיאה בטעינת הודעות הליד"
      );
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void loadLead();
    void loadMessages();
  }, [loadLead, loadMessages]);

  useEffect(() => {
    if (!messagesLoading) {
      scrollMessagesToBottom("auto");
    }
  }, [messagesLoading, scrollMessagesToBottom]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollMessagesToBottom("smooth");
    }
  }, [messages.length, scrollMessagesToBottom]);

  useEffect(() => {
    if (!leadId) return;

    setLiveChatConnected(false);
    setLiveChatError("");

    const eventSource = new EventSource(
      `/api/employee/leads/${leadId}/messages/stream`,
      {
        withCredentials: true,
      }
    );

    eventSource.addEventListener("connected", () => {
      setLiveChatConnected(true);
      setLiveChatError("");
    });

    eventSource.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data) as {
          success?: boolean;
          message?: LeadMessage;
        };

        if (!data?.success || !data.message) return;

        const nextMessage: LeadMessage = data.message;

        setMessages((prev) => upsertMessageById(prev, nextMessage));
      } catch (err) {
        console.error("LIVE CHAT MESSAGE PARSE ERROR:", err);
      }
    });

    eventSource.addEventListener("stream_warning", (event) => {
      try {
        const data = JSON.parse(event.data) as { message?: string };
        setLiveChatError(data?.message || "");
      } catch {
        setLiveChatError("");
      }
    });

    eventSource.addEventListener("stream_error", (event) => {
      setLiveChatConnected(false);

      try {
        const data = JSON.parse(event.data) as { message?: string };
        setLiveChatError(data?.message || "חיבור הצ׳אט בזמן אמת נכשל");
      } catch {
        setLiveChatError("חיבור הצ׳אט בזמן אמת נכשל");
      }
    });

    eventSource.addEventListener("stream_closed", () => {
      setLiveChatConnected(false);
    });

    eventSource.onerror = () => {
      setLiveChatConnected(false);
    };

    return () => {
      setLiveChatConnected(false);
      eventSource.close();
    };
  }, [leadId]);

  async function saveLead() {
    if (!leadId || saving) return;

    try {
      setSaving(true);
      setError("");
      setSaveMessage("");

      const res = await fetch(`/api/employee/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          leadStatus,
        }),
      });

      const data = (await res.json().catch(() => null)) as LeadResponse | null;

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || data?.error || "שגיאה בשמירת הליד");
      }

      if (data.lead) {
        setLead(data.lead);
        setLeadStatus(data.lead.leadStatus || "new");
      }

      setSaveMessage("הליד נשמר בהצלחה");
    } catch (err) {
      console.error("SAVE EMPLOYEE LEAD FAILED:", err);
      setError(err instanceof Error ? err.message : "שגיאה בשמירת הליד");
    } finally {
      setSaving(false);
    }
  }

  async function sendWhatsappTemplate() {
    if (!leadId || sendingTemplate || !selectedTemplate) return;

    try {
      setSendingTemplate(true);
      setMessagesError("");
      setMessageSuccess("");

      const res = await fetch(`/api/employee/leads/${leadId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          templateKey: selectedTemplate.key,
          templateName: selectedTemplate.templateName,
          templateLabel: selectedTemplate.label,
          templateVariables: {
            employee_name: employeeName,
          },
        }),
      });

      const data = (await res.json().catch(
        () => null
      )) as LeadMessagesResponse | null;

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.message || data?.error || "שליחת ההודעה המוכנה נכשלה"
        );
      }

      setMessageSuccess("ההודעה המוכנה נשלחה בהצלחה");

      if (data.leadMessage) {
        setMessages((prev) =>
          upsertMessageById(prev, data.leadMessage as LeadMessage)
        );
      } else {
        await loadMessages();
      }

      scrollMessagesToBottom("smooth");
    } catch (err) {
      console.error("SEND WHATSAPP TEMPLATE FAILED:", err);
      setMessagesError(
        getReadableWhatsappError(
          err instanceof Error ? err.message : "שליחת ההודעה המוכנה נכשלה"
        )
      );

      await loadMessages();
      scrollMessagesToBottom("smooth");
    } finally {
      setSendingTemplate(false);
    }
  }

  async function sendWhatsappMessage() {
    const text = messageText.trim();

    if (!leadId || sendingMessage || !text) return;

    try {
      setSendingMessage(true);
      setMessagesError("");
      setMessageSuccess("");

      const res = await fetch(`/api/employee/leads/${leadId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          messageText: text,
        }),
      });

      const data = (await res.json().catch(
        () => null
      )) as LeadMessagesResponse | null;

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.message || data?.error || "שליחת הודעת WhatsApp נכשלה"
        );
      }

      setMessageText("");
      setMessageSuccess("ההודעה נשלחה בהצלחה");

      if (data.leadMessage) {
        setMessages((prev) =>
          upsertMessageById(prev, data.leadMessage as LeadMessage)
        );
      } else {
        await loadMessages();
      }

      scrollMessagesToBottom("smooth");
    } catch (err) {
      console.error("SEND WHATSAPP MESSAGE FAILED:", err);
      setMessagesError(
        getReadableWhatsappError(
          err instanceof Error ? err.message : "שליחת הודעת WhatsApp נכשלה"
        )
      );

      await loadMessages();
      scrollMessagesToBottom("smooth");
    } finally {
      setSendingMessage(false);
    }
  }

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 p-5 text-slate-950">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
          <p className="mt-4 text-sm font-black text-slate-700">
            טוען ליד...
          </p>
        </div>
      </main>
    );
  }

  if (error && !lead) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 p-5 text-slate-950">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <p className="text-lg font-black text-red-700">{error}</p>

          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/employee/leads")}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              חזרה ללידים שלי
            </button>

            <button
              type="button"
              onClick={loadLead}
              className="rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-700"
            >
              נסה שוב
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[1380px] space-y-6">
        <section className="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] bg-slate-950 text-xl font-black text-white">
                {initials(lead?.fullName)}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className={getLeadStatusClass(leadStatus)}>
                    {getLeadStatusLabel(leadStatus)}
                  </Pill>

                  <Pill className="border-blue-200 bg-blue-50 text-blue-700">
                    {sourceLabel}
                  </Pill>

                  <Pill className="border-slate-200 bg-slate-50 text-slate-600">
                    {getStatusLabel(lead?.status)}
                  </Pill>
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  {lead?.fullName || "ליד ללא שם"}
                </h1>

                <p className="mt-2 text-sm font-bold text-slate-500">
                  תיק ליד: {lead?._id?.slice(-6)} · נוצר:{" "}
                  {formatDateTime(lead?.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/employee/leads"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                חזרה ללידים שלי
              </Link>

              <Link
                href="/employee"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                דשבורד עובד
              </Link>

              {telNumber ? (
                <a
                  href={`tel:${telNumber}`}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  התקשר עכשיו
                </a>
              ) : null}

              {whatsappNumber ? (
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700"
                >
                  פתיחה ב־WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <InfoCard label="טלפון" value={lead?.phone || "-"} strong />
          <InfoCard label="מייל" value={lead?.email || "-"} />
          <InfoCard label="תאריך אירוע" value={formatDate(lead?.eventDate)} />

          <InfoCard
            label="שירות מעניין"
            value={lead?.interestedService || lead?.packageName || "-"}
            strong
          />

          <InfoCard label="אולם / מקום" value={lead?.venueName || "-"} />
          <InfoCard label="עיר" value={lead?.city || "-"} />

          <InfoCard label="מקור ליד" value={sourceLabel} />
          <InfoCard label="קמפיין" value={lead?.campaignName || "-"} />
          <InfoCard label="מודעה" value={lead?.adName || "-"} />

          <InfoCard label="טופס" value={lead?.formName || "-"} />
          <InfoCard
            label="Facebook Lead ID"
            value={lead?.facebookLeadId || "-"}
          />
          <InfoCard label="משויך לעובד" value={getAssignedStaffLabel(lead)} />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-2xl font-black">טיפול בליד</h2>

          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
            כאן העובד מעדכן את סטטוס הטיפול בליד. כל שמירה מעדכנת את תיק הלקוח
            באדמין.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block">
              <span className="text-xs font-black text-slate-500">
                סטטוס ליד
              </span>

              <select
                value={leadStatus}
                onChange={(event) => setLeadStatus(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                {LEAD_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={saveLead}
              disabled={saving}
              className="h-12 rounded-2xl bg-slate-950 px-8 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "שומר..." : "שמור טיפול בליד"}
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
              {error}
            </div>
          ) : null}

          {saveMessage ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
              {saveMessage}
            </div>
          ) : null}
        </section>

        <section className="sticky top-4 z-10 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex h-[calc(100vh-2rem)] min-h-[760px] flex-col overflow-hidden rounded-[1.7rem] border border-slate-200 bg-slate-50">
            <div className="shrink-0 border-b border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black">צ׳אט WhatsApp</h2>

                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                    הודעות שנשלחות כאן נשמרות בתיק הליד. תגובות נכנסות יופיעו
                    בזמן אמת לאחר שה־Webhook של 360dialog שומר אותן במערכת.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex h-10 items-center rounded-2xl border px-4 text-xs font-black ${
                      liveChatConnected
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {liveChatConnected
                      ? "צ׳אט בזמן אמת פעיל"
                      : "מתחבר לצ׳אט..."}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      void loadMessages();
                    }}
                    disabled={messagesLoading}
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {messagesLoading ? "טוען..." : "רענון צ׳אט"}
                  </button>
                </div>
              </div>

              {liveChatError ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-black leading-6 text-amber-700">
                  {liveChatError}
                </div>
              ) : null}

              {messagesError ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black leading-7 text-red-700">
                  {messagesError}
                </div>
              ) : null}

              {messageSuccess ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
                  {messageSuccess}
                </div>
              ) : null}
            </div>

            <div
              ref={messagesScrollRef}
              className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_45%,#eef2f7_100%)] p-4 sm:p-6"
            >
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center text-sm font-black text-slate-500">
                  טוען הודעות...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="text-base font-black text-slate-800">
                    אין הודעות עדיין
                  </p>
                  <p className="mt-2 max-w-md text-sm font-semibold leading-7 text-slate-500">
                    כתבי הודעה למטה כדי לפתוח תיעוד שיחה מול הליד.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pb-2">
                  {messages.map((message) => {
                    const isOutgoing = message.direction === "outgoing";
                    const isFailed = message.status === "failed";

                    return (
                      <div
                        key={getMessageId(message)}
                        className={`flex ${
                          isOutgoing ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[78%] rounded-[1.25rem] px-4 py-3 shadow-sm ${
                            isOutgoing
                              ? isFailed
                                ? "border border-red-200 bg-red-50 text-red-800"
                                : "bg-slate-950 text-white"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm font-bold leading-6">
                            {message.messageText || ""}
                          </p>

                          <div
                            className={`mt-2 flex flex-wrap items-center gap-2 text-[11px] font-black ${
                              isOutgoing
                                ? isFailed
                                  ? "text-red-600"
                                  : "text-slate-300"
                                : "text-emerald-700"
                            }`}
                          >
                            <span>
                              {isOutgoing ? "נשלח מהמערכת" : "התקבל מהלקוח"}
                            </span>
                            <span>·</span>
                            <span>{formatTime(message.createdAt)}</span>
                            <span>·</span>
                            <span>{getMessageStatusLabel(message.status)}</span>
                          </div>

                          {message.errorMessage ? (
                            <p className="mt-2 text-xs font-black leading-5 text-red-600">
                              {getReadableWhatsappError(message.errorMessage)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white p-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-emerald-950">
                        הודעה מאושרת
                      </h3>

                      <p className="mt-1 text-xs font-bold leading-5 text-emerald-800">
                        מתאימה גם כאשר עברו יותר מ־24 שעות מאז שהלקוח ענה.
                      </p>
                    </div>

                    <Pill className="border-emerald-200 bg-white text-emerald-700">
                      תבנית מאושרת
                    </Pill>
                  </div>

                  <div className="mt-3 grid gap-3 xl:grid-cols-[0.8fr_1.2fr] xl:items-start">
                    <label className="block">
                      <span className="text-xs font-black text-slate-600">
                        בחירת הודעה מוכנה
                      </span>

                      <select
                        value={selectedTemplateKey}
                        onChange={(event) => {
                          setSelectedTemplateKey(
                            event.target.value as WhatsappTemplateKey
                          );
                          setMessageSuccess("");
                          setMessagesError("");
                        }}
                        className="mt-2 h-12 w-full rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-black text-slate-950 outline-none transition focus:border-emerald-400"
                      >
                        {WHATSAPP_TEMPLATE_OPTIONS.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={sendWhatsappTemplate}
                        disabled={sendingTemplate}
                        className="mt-3 h-12 w-full rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {sendingTemplate
                          ? "שולח הודעה מוכנה..."
                          : "שליחת הודעה מוכנה"}
                      </button>
                    </label>

                    <div className="rounded-2xl border border-emerald-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-slate-900">
                          {selectedTemplate.label}
                        </p>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                          שם עובד: {employeeName}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                        {selectedTemplate.description}
                      </p>

                      <div className="mt-2 max-h-[140px] overflow-y-auto rounded-2xl bg-slate-50 p-3">
                        <p className="mb-2 text-xs font-black text-slate-500">
                          תצוגה מקדימה
                        </p>
                        <p className="whitespace-pre-wrap text-xs font-bold leading-6 text-slate-900">
                          {selectedTemplatePreview}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4">
                  <h3 className="text-lg font-black">הודעה רגילה</h3>

                  <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                    ניתן לשלוח הודעה רגילה רק לאחר שהלקוח ענה ב־WhatsApp ב־24
                    השעות האחרונות.
                  </p>

                  <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_auto] xl:items-end">
                    <label className="block">
                      <span className="text-xs font-black text-slate-500">
                        כתיבת הודעה לליד
                      </span>

                      <textarea
                        value={messageText}
                        onChange={(event) => {
                          setMessageText(event.target.value);
                          setMessageSuccess("");
                          setMessagesError("");
                        }}
                        rows={5}
                        placeholder="כתבי הודעה לליד..."
                        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={sendWhatsappMessage}
                      disabled={sendingMessage || !messageText.trim()}
                      className="h-12 rounded-2xl bg-green-600 px-6 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendingMessage ? "שולח..." : "שליחה"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <InfoCard label="סכום עסקה" value={formatMoney(lead?.totalPrice)} />
          <InfoCard label="שולם" value={formatMoney(lead?.paidAmount)} />
          <InfoCard label="יתרה" value={formatMoney(lead?.balance)} />
        </section>
      </div>
    </main>
  );
}