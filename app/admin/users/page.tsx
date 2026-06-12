"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import * as XLSX from "xlsx";
import CreateUserModal from "./CreateUserModal";
import {
  Search,
  Users,
  CalendarDays,
  ChevronDown,
  UserRound,
  ShieldCheck,
  Crown,
  Phone,
  Pencil,
  Trash2,
  LogIn,
  X,
  Save,
  Sparkles,
  CreditCard,
  CheckCircle2,
  UserPlus,
  Loader2,
  ArrowUpCircle,
  PlusCircle,
  Banknote,
  ExternalLink,
} from "lucide-react";

/* =========================
   TYPES
========================= */
type AdminRole = "admin" | "user" | "producer" | "staff" | "client" | string;

type AdminUser = {
  _id: string;
  invitationId?: string;
  name?: string;
  email: string;
  role: AdminRole;

  plan?: string;
  packageName?: string;
  priceKey?: string;

  guests?: number;
  maxGuests?: number;
  smsLimit?: number;
  maxMessages?: number;

  includeCalls?: boolean;
  callsRounds?: number;
  callsAddonPrice?: number;

  includeCreditGifts?: boolean;
  creditGiftsAddonPrice?: number;

  includeDigitalSeating?: boolean;
  includeEventManagement?: boolean;
  includeCustomDesign?: boolean;

  paidAmount?: number;
  totalPaid?: number;
  createdAt?: string;
  eventDate?: string;

  assignedProducerId?: string | null;
  assignedStaffIds?: string[];

  assignedProducerEmail?: string;
  assignedStaffEmail?: string;

  callRoundsSchedule?: CallRoundsScheduleState;

  messageRounds?: AdminMessageRounds;
  venueSeatingService?: {
  enabled?: boolean;
  totalPrice?: number;
  depositAmount?: number;
  venuePaymentAmount?: number;
  staffPaymentAmount?: number;
  staffPaidFromVenue?: number;
  staffPaidFromFullAmount?: number;
  venuePaymentAfterStaff?: number;
  totalAfterStaff?: number;
};
};


type MessageRoundStatus = {
  key: string;
  label: string;
  done: boolean;
  blocked: boolean;
  sentAt?: string | null;
  scheduledAt?: string | null;
  channel?: "sms" | "whatsapp" | "calls" | string | null;
};

type AdminMessageRounds = {
  rsvp: MessageRoundStatus[];
  reminder: MessageRoundStatus[];
  thankyou: MessageRoundStatus[];
  calls?: MessageRoundStatus[];
};

type Assignee = {
  _id: string;
  name?: string;
  email?: string;
};

type AdminPricingPlan = {
  key: string;
  label: string;
  includeCalls?: boolean;
  includeCreditGifts?: boolean;
  includeDigitalSeating?: boolean;
  includeEventManagement?: boolean;
  includeCustomDesign?: boolean;
};

type AdminRecordOption = {
  key?: string;
  label: string;
  records: number;
  sms?: number;
  prices: Record<string, number>;
};

type EditFormState = {
  name: string;
  email: string;
  eventDate: string;
  assignedProducerId: string | null;
  assignedStaffIds: string[];
};

type UpgradeFormState = {
  plan: string;
  includeCalls: boolean;
  includeCreditGifts: boolean;
  includeDigitalSeating: boolean;
  includeEventManagement: boolean;
  includeCustomDesign: boolean;
};

type UpgradePaymentMode = "manual_paid" | "stripe";

/* =========================
   CONSTS
========================= */
const AUTO_REFRESH_MS = 10000;

const ADDONS = [
  {
    key: "includeCalls",
    label: "שירות שיחות",
    price: 0,
  },
  {
    key: "includeCreditGifts",
    label: "מתנות באשראי",
    price: 0,
  },
  {
    key: "includeDigitalSeating",
    label: "הושבה דיגיטלית",
    price: 0,
  },
  {
    key: "includeEventManagement",
    label: "מערכת ניהול אירוע",
    price: 0,
  },
  {
    key: "includeCustomDesign",
    label: "עיצוב בהתאמה אישית",
    price: 0,
  },
] as const;

/* =========================
   HELPERS
========================= */
function formatDate(value?: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("he-IL");
  } catch {
    return "—";
  }
}

function formatDateInput(value?: string) {
  if (!value) return "";

  try {
    return new Date(value).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function formatMoney(value?: number) {
  return `${Number(value || 0).toLocaleString("he-IL")} ₪`;
}

type VenueSeatingServiceForm = {
  enabled: boolean;
  totalPrice: number;
  depositAmount: number;
  venuePaymentAmount: number;
  staffPaymentAmount: number;
};

type CallRoundScheduleItem = {
  roundNumber: number;
  title: string;
  scheduledAt: string;
  status: "draft" | "scheduled" | "done" | "cancelled" | string;
  notes: string;
};

type CallRoundsScheduleState = {
  enabled: boolean;
  rounds: CallRoundScheduleItem[];
};

function roundMoney(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function safeNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function getVenueSeatingServiceInitial(user?: AdminUser): VenueSeatingServiceForm {
  return {
    enabled: Boolean(user?.venueSeatingService?.enabled),
    totalPrice: safeNumber(user?.venueSeatingService?.totalPrice),
    depositAmount: safeNumber(user?.venueSeatingService?.depositAmount),
    venuePaymentAmount: safeNumber(user?.venueSeatingService?.venuePaymentAmount),
    staffPaymentAmount: safeNumber(user?.venueSeatingService?.staffPaymentAmount),
  };
}

function calculateVenueSeatingService(service: VenueSeatingServiceForm) {
  const totalPrice = safeNumber(service.totalPrice);
  const depositAmount = Math.min(safeNumber(service.depositAmount), totalPrice);
  const venuePaymentAmount = Math.min(
    safeNumber(service.venuePaymentAmount),
    totalPrice
  );
  const staffPaymentAmount = Math.min(
    safeNumber(service.staffPaymentAmount),
    totalPrice
  );

  const staffPaidFromVenue = Math.min(staffPaymentAmount, venuePaymentAmount);

  const staffPaidFromFullAmount = Math.max(
    staffPaymentAmount - venuePaymentAmount,
    0
  );

  const venuePaymentAfterStaff = Math.max(
    venuePaymentAmount - staffPaymentAmount,
    0
  );

  const totalAfterStaff = Math.max(totalPrice - staffPaymentAmount, 0);

  return {
    enabled: Boolean(service.enabled),
    totalPrice,
    depositAmount,
    venuePaymentAmount,
    staffPaymentAmount,
    staffPaidFromVenue,
    staffPaidFromFullAmount,
    venuePaymentAfterStaff,
    totalAfterStaff,
  };
}

function normalizeText(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function getPlanKey(user: AdminUser) {
  return user.priceKey || user.plan || user.packageName || "";
}

function getPlanInfo(planKey?: string, pricingPlans?: AdminPricingPlan[]) {
  if (!planKey) return null;

  return (
    pricingPlans?.find((p) => p.key === planKey) ||
    pricingPlans?.find((p) => p.label === planKey) ||
    null
  );
}

function getPlanLabel(user: AdminUser, pricingPlans?: AdminPricingPlan[]) {
  const planKey = getPlanKey(user);
  const plan = getPlanInfo(planKey, pricingPlans);

  return plan?.label || user.packageName || user.plan || user.priceKey || "—";
}

function getUserRecords(user: AdminUser) {
  return Number(user.maxGuests || user.guests || 0);
}

function getUserSmsLimit(user: AdminUser) {
  return Number(user.smsLimit || user.maxMessages || 0);
}

function getRecordOptionForUser(
  user: AdminUser,
  recordOptions?: AdminRecordOption[]
) {
  const records = getUserRecords(user);

  if (!recordOptions?.length) return null;

  const sortedOptions = [...recordOptions].sort(
    (a, b) => Number(a.records) - Number(b.records)
  );

  const exact = sortedOptions.find(
    (option) => Number(option.records) === records
  );

  if (exact) return exact;

  const lowerOptions = sortedOptions.filter(
    (option) => Number(option.records) < records
  );

  return lowerOptions[lowerOptions.length - 1] || sortedOptions[0];
}

function getPriceForRecordOption(
  planKey: string,
  recordOption?: AdminRecordOption | null
) {
  if (!planKey || !recordOption) return 0;

  return Number(recordOption.prices?.[planKey] || 0);
}

function getPriceByPlanAndRecords(
  planKey: string,
  records: number,
  recordOptions?: AdminRecordOption[]
) {
  if (!planKey || !records || !recordOptions?.length) return 0;

  const option =
    recordOptions.find((item) => Number(item.records) === Number(records)) ||
    recordOptions.find((item) => Number(item.records) >= Number(records)) ||
    recordOptions[recordOptions.length - 1];

  return getPriceForRecordOption(planKey, option);
}

function getCallsStatus(user: AdminUser) {
  if (!user.includeCalls) return "לא פעיל";

  if (
    typeof user.callsAddonPrice === "number" &&
    user.callsAddonPrice > 0
  ) {
    return `פעיל · ${formatMoney(user.callsAddonPrice)}`;
  }

  return "פעיל";
}

function getRoleLabel(role: AdminRole) {
  const labels: Record<string, string> = {
    admin: "אדמין",
    user: "משתמש",
    producer: "מפיק",
    staff: "עובד",
    client: "לקוח",
  };

  return labels[role] || role || "—";
}

function getAddonValue(user: AdminUser, key: (typeof ADDONS)[number]["key"]) {
  return Boolean(user[key]);
}

function getUserTotalPaid(user: AdminUser) {
  return Number(user.totalPaid || user.paidAmount || 0);
}

function getPurchasedItems(
  user: AdminUser,
  pricingPlans?: AdminPricingPlan[],
  recordOptions?: AdminRecordOption[]
) {
  const records = getUserRecords(user);
  const recordOption = getRecordOptionForUser(user, recordOptions);

  return [
    {
      label: "חבילה",
      value: getPlanLabel(user, pricingPlans),
      active: true,
    },
    {
      label: "כמות רשומות / אורחים",
      value: recordOption?.label || String(records || 0),
      active: true,
    },
    {
      label: "כמות הודעות SMS",
      value: String(getUserSmsLimit(user) || recordOption?.sms || 0),
      active: true,
    },
    {
      label: "שירות שיחות",
      value: getCallsStatus(user),
      active: Boolean(user.includeCalls),
    },
    {
      label: "מתנות באשראי",
      value: user.includeCreditGifts ? "פעיל" : "לא פעיל",
      active: Boolean(user.includeCreditGifts),
    },
    {
      label: "הושבה דיגיטלית",
      value: user.includeDigitalSeating ? "פעיל" : "לא פעיל",
      active: Boolean(user.includeDigitalSeating),
    },
    {
      label: "מערכת ניהול אירוע",
      value: user.includeEventManagement ? "פעיל" : "לא פעיל",
      active: Boolean(user.includeEventManagement),
    },
    {
      label: "עיצוב בהתאמה אישית",
      value: user.includeCustomDesign ? "פעיל" : "לא פעיל",
      active: Boolean(user.includeCustomDesign),
    },
    {
  label: "שירות הושבה באולם",
  value: user.venueSeatingService?.enabled
    ? `נרכש · ${formatMoney(user.venueSeatingService.totalPrice)}`
    : "לא נרכש",
  active: Boolean(user.venueSeatingService?.enabled),
},
  ];
}

function getDefaultMessageRounds(): AdminMessageRounds {
  return {
    rsvp: [1, 2, 3].map((round) => ({
      key: `rsvp_${round}`,
      label: `אישורי הגעה סבב ${round}`,
      done: false,
      blocked: false,
      sentAt: null,
      scheduledAt: null,
    })),
    reminder: [
      {
        key: "reminder",
        label: "סבב תזכורת",
        done: false,
        blocked: false,
        sentAt: null,
        scheduledAt: null,
      },
    ],
    thankyou: [
      {
        key: "thankyou",
        label: "סבב תודה",
        done: false,
        blocked: false,
        sentAt: null,
        scheduledAt: null,
      },
    ],
    calls: [1, 2, 3].map((round) => ({
      key: `call_round_${round}`,
      label: `סבב שיחות ${round}`,
      done: false,
      blocked: false,
      sentAt: null,
      scheduledAt: null,
      channel: "calls",
    })),
  };
}

function formatDateTimeInput(value?: string | null) {
  if (!value) return "";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

function normalizeDateTimeLocalForSave(value?: string | null) {
  if (!value) return "";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString();
  } catch {
    return "";
  }
}

function getInitialCallRoundsSchedule(user?: AdminUser): CallRoundsScheduleState {
  return {
    enabled: Boolean(user?.callRoundsSchedule?.enabled || user?.includeCalls),
    rounds: [1, 2, 3].map((roundNumber) => {
      const existing = user?.callRoundsSchedule?.rounds?.find(
        (item) => Number(item.roundNumber) === roundNumber
      );

      return {
        roundNumber,
        title: existing?.title || `סבב שיחות ${roundNumber}`,
        scheduledAt: formatDateTimeInput(existing?.scheduledAt || ""),
        status: existing?.status || (existing?.scheduledAt ? "scheduled" : "draft"),
        notes: existing?.notes || "",
      };
    }),
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return null;

  try {
    return new Date(value).toLocaleString("he-IL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return null;
  }
}

function formatDateTimeWithWeekday(value?: string | null) {
  if (!value) return null;

  try {
    const date = new Date(value);

    const weekday = date.toLocaleDateString("he-IL", {
      weekday: "long",
    });

    const dateText = date.toLocaleDateString("he-IL", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });

    const timeText = date.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${weekday} · ${dateText}, ${timeText}`;
  } catch {
    return null;
  }
}

function getChannelLabel(channel?: string | null) {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "sms") return "SMS";
  if (channel === "calls") return "שיחות";
  return "";
}

function mergeRoundStatus(
  base: MessageRoundStatus,
  incoming?: Partial<MessageRoundStatus> | null
): MessageRoundStatus {
  return {
    ...base,
    ...(incoming || {}),
    done: Boolean(incoming?.done || incoming?.sentAt || base.done),
    blocked: Boolean(incoming?.blocked || base.blocked),
    sentAt: incoming?.sentAt || base.sentAt || null,
    scheduledAt: incoming?.scheduledAt || base.scheduledAt || null,
    channel: incoming?.channel || base.channel || null,
  };
}


type WhatsappReportRecipient = {
  id: string;
  name: string;
  phone: string;
  status: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string;
  attempts?: number;
  messageId?: string;
};

type WhatsappReportRound = {
  key: string;
  title: string;
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
  recipients: WhatsappReportRecipient[];
};

function getWhatsappStatusLabel(status?: string) {
  const normalized = String(status || "").toLowerCase();

  const labels: Record<string, string> = {
    read: "נקרא",
    delivered: "נמסר",
    sent: "נשלח",
    failed: "נכשל",
    pending: "ממתין",
    queued: "בתור",
    processing: "בתהליך",
    accepted: "התקבל לשליחה",
  };

  return labels[normalized] || status || "—";
}

function getWhatsappStatusClass(status?: string) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "failed") {
    return "border-red-200 bg-red-50 text-red-600";
  }

  if (normalized === "read") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "delivered") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (normalized === "sent") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-[#EFE2D1] bg-[#F6F1EA] text-[#7B6754]";
}

function normalizeWhatsappRecipient(
  raw: any,
  index: number
): WhatsappReportRecipient {
  const providerStatus = String(raw?.providerStatus || "").toLowerCase();
  const baseStatus = String(raw?.status || "").toLowerCase();

  const status =
    providerStatus === "read"
      ? "read"
      : providerStatus === "delivered"
        ? "delivered"
        : providerStatus === "failed" || baseStatus === "failed"
          ? "failed"
          : providerStatus === "sent" || baseStatus === "sent"
            ? "sent"
            : baseStatus ||
              raw?.messageStatus ||
              raw?.whatsappStatus ||
              raw?.deliveryStatus ||
              (raw?.readAt
                ? "read"
                : raw?.deliveredAt
                  ? "delivered"
                  : raw?.failedAt
                    ? "failed"
                    : raw?.sentAt
                      ? "sent"
                      : "pending");

  return {
    id: String(
      raw?._id ||
        raw?.id ||
        raw?.messageId ||
        raw?.whatsappMessageId ||
        raw?.admin?.wamid ||
        index
    ),
    name: String(
      raw?.name ||
        raw?.guestName ||
        raw?.fullName ||
        raw?.recipientName ||
        ""
    ),
    phone: String(
      raw?.phone ||
        raw?.to ||
        raw?.recipientPhone ||
        raw?.phoneNumber ||
        ""
    ),
    status: String(status || "pending"),
    sentAt: raw?.sentAt || raw?.createdAt || raw?.timestamp || null,
    deliveredAt: raw?.deliveredAt || null,
    readAt: raw?.readAt || null,
    failedAt: raw?.failedAt || null,
    errorMessage: String(
      raw?.failure?.text ||
        raw?.errorMessage ||
        raw?.failureReason ||
        raw?.error ||
        raw?.reason ||
        raw?.admin?.errorMessage ||
        raw?.admin?.lastError ||
        ""
    ),
    attempts: Number(raw?.attempts || raw?.retryCount || raw?.tries || 0),
    messageId: String(
      raw?.messageId ||
        raw?.whatsappMessageId ||
        raw?.wamid ||
        raw?.admin?.wamid ||
        ""
    ),
  };
}


function countWhatsappStatus(recipients: WhatsappReportRecipient[], status: string) {
  return recipients.filter((item) => String(item.status || "").toLowerCase() === status).length;
}

function normalizeWhatsappRound(raw: any, index: number): WhatsappReportRound {
  const recipientsSource =
    raw?.recipients ||
    raw?.items ||
    raw?.messages ||
    raw?.guests ||
    raw?.logs ||
    [];

  const recipients = Array.isArray(recipientsSource)
    ? recipientsSource.map((item, itemIndex) =>
        normalizeWhatsappRecipient(item, itemIndex)
      )
    : [];

  const summary = raw?.summary || {};

  const total = Number(
    summary.total ?? raw?.total ?? raw?.totalCount ?? raw?.count ?? recipients.length ?? 0
  );

  const sent = Number(
    summary.sent ?? raw?.sent ?? raw?.sentCount ?? countWhatsappStatus(recipients, "sent")
  );

  const delivered = Number(
    summary.delivered ??
      raw?.delivered ??
      raw?.deliveredCount ??
      countWhatsappStatus(recipients, "delivered")
  );

  const read = Number(
    summary.read ?? raw?.read ?? raw?.readCount ?? countWhatsappStatus(recipients, "read")
  );

  const failed = Number(
    summary.failed ??
      raw?.failed ??
      raw?.failedCount ??
      countWhatsappStatus(recipients, "failed")
  );

  const pending = Number(
    summary.pending ??
      raw?.pending ??
      raw?.pendingCount ??
      Math.max(total - sent - delivered - read - failed, 0)
  );

  return {
    key: String(raw?.key || raw?.roundKey || raw?._id || raw?.id || `round-${index + 1}`),
    title: String(raw?.title || raw?.label || raw?.name || `סבב ${index + 1}`),
    total,
    sent,
    delivered,
    read,
    failed,
    pending,
    recipients,
  };
}


function normalizeWhatsappReportPayload(payload: any): WhatsappReportRound[] {
  const data = payload?.data || payload?.report || payload;

  const roundsSource =
    data?.rounds ||
    data?.reports ||
    data?.items ||
    data?.messageRounds ||
    data?.whatsappRounds ||
    [];

  if (Array.isArray(roundsSource) && roundsSource.length) {
    return roundsSource.map((round, index) => normalizeWhatsappRound(round, index));
  }

  if (Array.isArray(data?.recipients) || Array.isArray(data?.messages) || Array.isArray(data?.logs)) {
    return [normalizeWhatsappRound(data, 0)];
  }

  return [];
}

function formatExcelDate(value?: string | null) {
  if (!value) return "";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("he-IL");
  } catch {
    return "";
  }
}

function exportWhatsappRoundToExcel(round: WhatsappReportRound, user?: AdminUser) {
  const workbook = XLSX.utils.book_new();

  const recipientRows = round.recipients.map((item, index) => ({
    "מס׳": index + 1,
    "שם אורח": item.name,
    "טלפון": item.phone,
    "סטטוס": getWhatsappStatusLabel(item.status),
    "נשלח בתאריך": formatExcelDate(item.sentAt),
    "נמסר בתאריך": formatExcelDate(item.deliveredAt),
    "נקרא בתאריך": formatExcelDate(item.readAt),
    "נכשל בתאריך": formatExcelDate(item.failedAt),
    "סיבת כישלון": item.errorMessage || "",
    "ניסיונות": item.attempts || 0,
    "מזהה הודעה": item.messageId || "",
  }));

  const summaryRows = [
    { "נתון": "לקוח", "ערך": user?.name || user?.email || "" },
    { "נתון": "סבב", "ערך": round.title },
    { "נתון": "סה״כ", "ערך": round.total },
    { "נתון": "נשלחו", "ערך": round.sent },
    { "נתון": "נמסרו", "ערך": round.delivered },
    { "נתון": "נקראו", "ערך": round.read },
    { "נתון": "נכשלו", "ערך": round.failed },
    { "נתון": "ממתינים", "ערך": round.pending },
  ];

  const recipientsSheet = XLSX.utils.json_to_sheet(recipientRows);
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);

  recipientsSheet["!cols"] = [
    { wch: 8 },
    { wch: 24 },
    { wch: 18 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 45 },
    { wch: 10 },
    { wch: 36 },
  ];

  summarySheet["!cols"] = [
    { wch: 22 },
    { wch: 35 },
  ];

  /*
    חשוב:
    מוסיפים קודם את "כל האורחים",
    כדי שזה יהיה הגיליון הראשון שנפתח באקסל.
  */
  XLSX.utils.book_append_sheet(workbook, recipientsSheet, "כל האורחים");
  XLSX.utils.book_append_sheet(workbook, summarySheet, "סיכום");

  const safeTitle = round.title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 40);
  const safeName = String(user?.name || user?.email || "client")
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 40);

  XLSX.writeFile(workbook, `whatsapp-report-${safeName}-${safeTitle}.xlsx`);
}

async function fetchWhatsappRoundReport(invitationId: string) {
  const encodedInvitationId = encodeURIComponent(invitationId);

  try {
    const res = await fetch(
      `/api/whatsapp/round-report/${encodedInvitationId}`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );

    const data = await res.json().catch(() => null);

    if (!res.ok || data?.success === false) {
      throw new Error(
        data?.message ||
          data?.error ||
          `טעינת דוח WhatsApp נכשלה - HTTP ${res.status}`
      );
    }

    const rounds = normalizeWhatsappReportPayload(data);

    if (!rounds.length) {
      throw new Error("לא נמצאו נתוני דוח בתשובת השרת");
    }

    return rounds;
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : "טעינת דוח WhatsApp נכשלה"
    );
  }
}


function normalizeAdminMessageRounds(user: AdminUser): AdminMessageRounds {
  const defaults = getDefaultMessageRounds();
  const incoming = user.messageRounds;

  if (!incoming) return defaults;

  const rsvp = defaults.rsvp.map((baseRound) => {
    const found =
      incoming.rsvp?.find((item) => item.key === baseRound.key) ||
      incoming.rsvp?.find((item) => item.label === baseRound.label);

    return mergeRoundStatus(baseRound, found);
  });

  const reminder = defaults.reminder.map((baseRound) => {
    const found =
      incoming.reminder?.find((item) => item.key === baseRound.key) ||
      incoming.reminder?.find((item) => item.key === "reminder") ||
      incoming.reminder?.[0];

    return mergeRoundStatus(baseRound, found);
  });

  const thankyou = defaults.thankyou.map((baseRound) => {
    const found =
      incoming.thankyou?.find((item) => item.key === baseRound.key) ||
      incoming.thankyou?.find((item) => item.key === "thankyou") ||
      incoming.thankyou?.find((item) => item.key === "thank_you") ||
      incoming.thankyou?.find((item) => item.key === "thankYou") ||
      incoming.thankyou?.find((item) => item.key === "thanks") ||
      incoming.thankyou?.find((item) => item.key === "thank-you") ||
      incoming.thankyou?.[0];

    return mergeRoundStatus(baseRound, found);
  });

  const calls = defaults.calls?.map((baseRound) => {
    const found =
      incoming.calls?.find((item) => item.key === baseRound.key) ||
      incoming.calls?.find((item) => item.label === baseRound.label);

    return mergeRoundStatus(baseRound, found);
  });

  return {
    rsvp,
    reminder,
    thankyou,
    calls,
  };
}

/* =========================
   PAGE
========================= */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pricingPlans, setPricingPlans] = useState<AdminPricingPlan[]>([]);
  const [recordOptions, setRecordOptions] = useState<AdminRecordOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [openCreate, setOpenCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [upgradingUser, setUpgradingUser] = useState<AdminUser | null>(null);
  const [eventScheduleUser, setEventScheduleUser] = useState<AdminUser | null>(null);

  const [producers, setProducers] = useState<Assignee[]>([]);
  const [staff, setStaff] = useState<Assignee[]>([]);

  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("future");
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);

  async function loadUsers(showLoader = true) {
    try {
      if (showLoader) setLoading(true);

      const res = await fetch("/api/admin/users", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (data.success) {
        const loadedUsers = data.users || [];

        setUsers(loadedUsers);

        // חשוב: רענון סבבי הודעות לא סוגר את מודל העריכה.
        // אם המודל פתוח, מעדכנים את המשתמש הפתוח עם הנתונים החדשים מהשרת.
        setEditingUser((current) => {
          if (!current) return current;

          return (
            loadedUsers.find((item: AdminUser) => item._id === current._id) ||
            current
          );
        });

        setUpgradingUser((current) => {
          if (!current) return current;

          return (
            loadedUsers.find((item: AdminUser) => item._id === current._id) ||
            current
          );
        });

        setEventScheduleUser((current) => {
          if (!current) return current;

          return (
            loadedUsers.find((item: AdminUser) => item._id === current._id) ||
            current
          );
        });
      }
    } catch (err) {
      console.error("Failed loading users:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function loadPackages() {
    try {
      const res = await fetch("/api/admin/packages", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.success) {
        setPricingPlans([]);
        setRecordOptions([]);
        return;
      }

      setPricingPlans(Array.isArray(data.plans) ? data.plans : []);
      setRecordOptions(
        Array.isArray(data.recordOptions) ? data.recordOptions : []
      );
    } catch (err) {
      console.error("Failed loading admin packages:", err);
      setPricingPlans([]);
      setRecordOptions([]);
    }
  }

  async function loadAssignees() {
    try {
      const res = await fetch("/api/admin/assignees", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (data.success) {
        setProducers(data.producers || []);
        setStaff(data.staff || []);
      }
    } catch (err) {
      console.error("Failed loading assignees:", err);
    }
  }

  async function impersonateUser(userId: string) {
    setImpersonating(userId);

    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (!data.success) {
        alert("כניסה בהתחזות נכשלה");
        return;
      }

      if (data.role === "producer") {
        window.location.href = "/producer/dashboard";
      } else if (data.role === "staff") {
        window.location.href = "/producer-staff/dashboard";
      } else {
        window.location.href = "/dashboard";
      }
    } finally {
      setImpersonating(null);
    }
  }

  async function removeUser(userId: string) {
    const confirmed = confirm("האם למחוק את המשתמש לצמיתות?");

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!data.success) {
        alert("מחיקת המשתמש נכשלה");
        return;
      }

      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (error) {
      console.error(error);
      alert("אירעה שגיאה במחיקה");
    }
  }

  function openEventSchedule(user: AdminUser) {
    setEventScheduleUser(user);
  }


  useEffect(() => {
    const stored = sessionStorage.getItem("adminHiddenUsers");

    if (stored) {
      try {
        setHiddenUserIds(JSON.parse(stored));
      } catch {
        setHiddenUserIds([]);
      }
    }

    loadUsers(true);
    loadPackages();
    loadAssignees();

    const intervalId = window.setInterval(() => {
      loadUsers(false);
      loadPackages();
    }, AUTO_REFRESH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return users
      .filter((u) => !hiddenUserIds.includes(u._id))
      .filter((u) => {
        const q = normalizeText(search);

        const matchesSearch =
          !q ||
          normalizeText(u.name).includes(q) ||
          normalizeText(u.email).includes(q) ||
          normalizeText(getPlanLabel(u, pricingPlans)).includes(q);

        const matchesRole = roleFilter === "all" || u.role === roleFilter;

        let matchesEvent = true;

        if (eventFilter === "future") {
          matchesEvent = !!u.eventDate && new Date(u.eventDate) >= today;
        }

        if (eventFilter === "past") {
          matchesEvent = !!u.eventDate && new Date(u.eventDate) < today;
        }

        if (eventFilter === "noDate") {
          matchesEvent = !u.eventDate;
        }

        return matchesSearch && matchesRole && matchesEvent;
      });
  }, [
    users,
    hiddenUserIds,
    search,
    roleFilter,
    eventFilter,
    pricingPlans,
  ]);

  const stats = useMemo(() => {
    return {
      total: filteredUsers.length,
      calls: filteredUsers.filter((u) => u.includeCalls).length,
      future: filteredUsers.filter(
        (u) => u.eventDate && new Date(u.eventDate) >= new Date()
      ).length,
    };
  }, [filteredUsers]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[#6B5A48]">
        <Loader2 className="ml-2 animate-spin" size={22} />
        טוען משתמשים…
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F4F1] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section
          className="
            rounded-[32px]
            border border-[#E7D8C6]
            bg-gradient-to-br from-[#FFFDF8] to-[#F3E7D8]
            p-5 md:p-7
            shadow-[0_18px_55px_rgba(60,43,25,0.08)]
          "
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div
                className="
                  mb-3 inline-flex items-center gap-2
                  rounded-full
                  bg-white/70
                  px-4 py-2
                  text-xs font-black
                  text-[#8A6A43]
                  ring-1 ring-[#E7D8C6]
                "
              >
                <ShieldCheck size={15} />
                Admin Panel
              </div>

              <h1 className="text-3xl font-black text-[#352618] md:text-5xl">
                ניהול משתמשים
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#7B6754]">
                ניהול לקוחות, חבילות, הרשאות, מטפלים, שדרוגים וכניסה בהתחזות.
              </p>
            </div>

            <button
              onClick={() => setOpenCreate(true)}
              className="
                flex h-12 items-center justify-center gap-2
                rounded-2xl
                bg-[#24190F]
                px-5
                text-sm font-black
                text-white
                shadow-[0_12px_30px_rgba(36,25,15,0.22)]
                transition
                hover:bg-black
              "
            >
              <UserPlus size={18} />
              יצירת משתמש
            </button>
          </div>
        </section>

        <section
          className="
            rounded-[28px]
            border border-[#E7D8C6]
            bg-white
            p-4 md:p-5
            shadow-[0_14px_40px_rgba(60,43,25,0.06)]
          "
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_180px]">
            <div
              className="
                flex h-12 items-center gap-3
                rounded-2xl
                border border-[#E7D8C6]
                bg-[#FFFDF8]
                px-4
              "
            >
              <Search size={18} className="text-[#9A7A52]" />
              <input
                type="text"
                placeholder="חיפוש לפי שם, אימייל או חבילה..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="
                  w-full bg-transparent
                  text-sm font-semibold
                  text-[#3A2A1C]
                  outline-none
                  placeholder:text-[#B6A28C]
                "
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="
                h-12 rounded-2xl
                border border-[#E7D8C6]
                bg-[#FFFDF8]
                px-4
                text-sm font-bold
                text-[#3A2A1C]
                outline-none
              "
            >
              <option value="all">כל המשתמשים</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="producer">Producer</option>
              <option value="staff">Staff</option>
              <option value="client">Client</option>
            </select>

            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="
                h-12 rounded-2xl
                border border-[#E7D8C6]
                bg-[#FFFDF8]
                px-4
                text-sm font-bold
                text-[#3A2A1C]
                outline-none
              "
            >
              <option value="future">אירועים עתידיים</option>
              <option value="past">אירועים שעברו</option>
              <option value="noDate">ללא תאריך</option>
              <option value="all">הכל</option>
            </select>

            <div
              className="
                flex h-12 items-center justify-center
                rounded-2xl
                bg-[#F6EBDD]
                px-4
                text-sm font-black
                text-[#8A5A24]
              "
            >
              נמצאו {stats.total} משתמשים
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoCard
            title="משתמשים מוצגים"
            value={String(stats.total)}
            icon={<Users size={22} />}
          />

          <InfoCard
            title="שירות שיחות פעיל"
            value={String(stats.calls)}
            icon={<Phone size={22} />}
          />

          <InfoCard
            title="אירועים עתידיים"
            value={String(stats.future)}
            icon={<CalendarDays size={22} />}
          />
        </section>

        <section
          className="
            hidden overflow-visible rounded-[28px]
            border border-[#E7D8C6]
            bg-white
            shadow-[0_18px_55px_rgba(60,43,25,0.07)]
            xl:block
          "
        >
          <table className="min-w-full text-right">
            <thead className="bg-[#FFF9EF] text-xs font-black text-[#7B6754]">
              <tr>
                <th className="p-4">שם</th>
                <th className="p-4">אימייל</th>
                <th className="p-4">תפקיד</th>
                <th className="p-4">חבילה</th>
                <th className="p-4">רשומות</th>
                <th className="p-4">תאריך אירוע</th>
                <th className="p-4">מפיק מטפל</th>
                <th className="p-4">עובד מטפל</th>
                <th className="p-4">שירות שיחות</th>
                <th className="p-4">פעולות</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EFE2D1]">
              {filteredUsers.map((u) => (
                <tr
  key={u._id}

  className={`relative text-sm hover:bg-[#FFFDF8] ${
  openActionsId === u._id ? "z-10" : "z-0"
}`}
>
                  <td className="p-4 font-black text-[#3A2A1C]">
                    {u.name || "—"}
                  </td>

                  <td className="p-4 text-[#6B5A48]">{u.email}</td>

                  <td className="p-4">
                    <RoleBadge role={u.role} />
                  </td>

                  <td className="p-4 font-bold text-[#6B5A48]">
                    {getPlanLabel(u, pricingPlans)}
                  </td>

                  <td className="p-4 font-black text-[#3A2A1C]">
                    {getUserRecords(u)}
                  </td>

                  <td className="p-4 text-[#6B5A48]">
                    {formatDate(u.eventDate)}
                  </td>

                  <td className="p-4 text-[#6B5A48]">
                    {producers.find((p) => p._id === u.assignedProducerId)
                      ?.name || "—"}
                  </td>

                  <td className="p-4 text-[#6B5A48]">
                    {staff.find((s) => s._id === u.assignedStaffIds?.[0])
                      ?.name || "—"}
                  </td>

                  <td className="p-4">
                    <StatusBadge active={Boolean(u.includeCalls)}>
                      {getCallsStatus(u)}
                    </StatusBadge>
                  </td>

                  <td className="relative overflow-visible p-4">

                    <UserActionsDropdown
                      user={u}
                      open={openActionsId === u._id}
                      onToggle={() =>
                        setOpenActionsId(openActionsId === u._id ? null : u._id)
                      }
                      onClose={() => setOpenActionsId(null)}
                      onEventSchedule={() => openEventSchedule(u)}
                      onEdit={() => setEditingUser(u)}
                      onUpgrade={() => setUpgradingUser(u)}
                      onImpersonate={() => impersonateUser(u._id)}
                      onDelete={() => removeUser(u._id)}
                      isImpersonating={impersonating === u._id}
                    />
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#7B6754]">
                    לא נמצאו משתמשים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:hidden">
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              className="
                rounded-[26px]
                border border-[#E7D8C6]
                bg-white
                p-4
                shadow-[0_14px_40px_rgba(60,43,25,0.06)]
              "
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-black text-[#3A2A1C]">
                    {u.name || "—"}
                  </div>

                  <div className="mt-1 text-sm font-semibold text-[#7B6754]">
                    {u.email}
                  </div>
                </div>

                <RoleBadge role={u.role} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <MiniDetail
                  label="חבילה"
                  value={getPlanLabel(u, pricingPlans)}
                />
                <MiniDetail
                  label="רשומות"
                  value={String(getUserRecords(u))}
                />
                <MiniDetail
                  label="תאריך אירוע"
                  value={formatDate(u.eventDate)}
                />
                <MiniDetail label="שיחות" value={getCallsStatus(u)} />
              </div>

              <div className="mt-4">
                <UserActionsDropdown
                  user={u}
                  open={openActionsId === u._id}
                  onToggle={() =>
                    setOpenActionsId(openActionsId === u._id ? null : u._id)
                  }
                  onClose={() => setOpenActionsId(null)}
                  onEventSchedule={() => openEventSchedule(u)}
                  onEdit={() => setEditingUser(u)}
                  onUpgrade={() => setUpgradingUser(u)}
                  onImpersonate={() => impersonateUser(u._id)}
                  onDelete={() => removeUser(u._id)}
                  isImpersonating={impersonating === u._id}
                  fullWidth
                />
              </div>
            </div>
          ))}
        </section>
      </div>

      {openCreate && (
        <CreateUserModal
          onClose={() => {
            setOpenCreate(false);
            loadUsers(false);
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          pricingPlans={pricingPlans}
          recordOptions={recordOptions}
          producers={producers}
          staff={staff}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            loadUsers(false);
          }}
          onRoundsChanged={() => {
            loadUsers(false);
          }}
        />
        
      )}


      {eventScheduleUser && (
        <EventScheduleModal
          user={eventScheduleUser}
          onClose={() => setEventScheduleUser(null)}
        />
      )}

      {upgradingUser && (
        <UpgradeUserModal
          user={upgradingUser}
          pricingPlans={pricingPlans}
          recordOptions={recordOptions}
          onClose={() => setUpgradingUser(null)}
          onSaved={() => {
            setUpgradingUser(null);
            loadUsers(false);
          }}
        />
      )}
    </div>
  );
}

function VenueSeatingServiceFields({
  title,
  description,
  value,
  onChange,
  purchasedMode = false,
}: {
  title: string;
  description: string;
  value: VenueSeatingServiceForm;
  onChange: (next: VenueSeatingServiceForm) => void;
  purchasedMode?: boolean;
}) {
  const calculated = calculateVenueSeatingService(value);

  function setTotalPrice(rawValue: string) {
    const totalPrice = safeNumber(rawValue);
    const depositAmount = roundMoney(totalPrice / 2);
    const venuePaymentAmount = roundMoney(totalPrice - depositAmount);

    onChange({
      ...value,
      totalPrice,
      depositAmount,
      venuePaymentAmount,
      staffPaymentAmount: Math.min(value.staffPaymentAmount, totalPrice),
    });
  }

  function setDepositAmount(rawValue: string) {
    const depositAmount = Math.min(safeNumber(rawValue), value.totalPrice);

    onChange({
      ...value,
      depositAmount,
      venuePaymentAmount: roundMoney(value.totalPrice - depositAmount),
    });
  }

  function setVenuePaymentAmount(rawValue: string) {
    const venuePaymentAmount = Math.min(safeNumber(rawValue), value.totalPrice);

    onChange({
      ...value,
      venuePaymentAmount,
      depositAmount: roundMoney(value.totalPrice - venuePaymentAmount),
    });
  }

  function setStaffPaymentAmount(rawValue: string) {
    onChange({
      ...value,
      staffPaymentAmount: Math.min(safeNumber(rawValue), value.totalPrice),
    });
  }

  function toggleEnabled() {
    const nextEnabled = !value.enabled;

    if (!nextEnabled) {
      onChange({
        enabled: false,
        totalPrice: 0,
        depositAmount: 0,
        venuePaymentAmount: 0,
        staffPaymentAmount: 0,
      });
      return;
    }

    const depositAmount = roundMoney(value.totalPrice / 2);

    onChange({
      ...value,
      enabled: true,
      depositAmount,
      venuePaymentAmount: roundMoney(value.totalPrice - depositAmount),
    });
  }

  return (
    <section
      className="
        rounded-[26px]
        border border-[#E7D8C6]
        bg-white
        p-5
      "
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#3A2A1C]">{title}</h3>
          <p className="mt-1 text-xs font-bold text-[#8A7867]">
            {description}
          </p>
        </div>

        {purchasedMode && value.enabled && (
          <span className="rounded-full bg-[#EAF8EF] px-3 py-1 text-xs font-black text-[#1F9A55]">
            נרכש
          </span>
        )}
      </div>

      <label
        className="
          mb-5 flex cursor-pointer items-center justify-between gap-3
          rounded-2xl
          border border-[#EFE2D1]
          bg-[#FFFDF8]
          px-4 py-3
        "
      >
        <div>
          <div className="font-black text-[#3A2A1C]">
            {value.enabled ? "שירות הושבה באולם פעיל" : "הוסף שירות הושבה באולם"}
          </div>

          <div className="mt-1 text-xs font-bold text-[#8A7867]">
            אם מסמנים שירות, ברירת המחדל היא 50% מקדמה ו־50% תשלום באולם.
          </div>
        </div>

        <input
          type="checkbox"
          checked={value.enabled}
          onChange={toggleEnabled}
          className="h-5 w-5 accent-[#B97821]"
        />
      </label>

      {value.enabled && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              label="סך הכל שירות"
              type="number"
              value={String(value.totalPrice)}
              onChange={setTotalPrice}
            />

            <InputField
              label="תשלום לאנשי צוות"
              type="number"
              value={String(value.staffPaymentAmount)}
              onChange={setStaffPaymentAmount}
            />

            <InputField
              label="סך מקדמה"
              type="number"
              value={String(value.depositAmount)}
              onChange={setDepositAmount}
            />

            <InputField
              label="סך תשלום באולם"
              type="number"
              value={String(value.venuePaymentAmount)}
              onChange={setVenuePaymentAmount}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SummaryBox
              label="מקדמה להכנסות החודש"
              value={formatMoney(calculated.depositAmount)}
            />

            <SummaryBox
              label="תשלום באולם לפני צוות"
              value={formatMoney(calculated.venuePaymentAmount)}
            />

            <SummaryBox
              label="ירד מתוך התשלום באולם"
              value={formatMoney(calculated.staffPaidFromVenue)}
            />

            <SummaryBox
              label="ירד מהסכום המלא כי לא הספיק באולם"
              value={formatMoney(calculated.staffPaidFromFullAmount)}
            />

            <SummaryBox
              label="נשאר מהתשלום באולם אחרי צוות"
              value={formatMoney(calculated.venuePaymentAfterStaff)}
            />

            <SummaryBox
              label="סך הכל אחרי תשלום צוות"
              value={formatMoney(calculated.totalAfterStaff)}
              highlight
            />
          </div>

          <div className="rounded-2xl border border-[#E8C98D] bg-[#FFF7E8] px-4 py-3 text-sm font-bold leading-7 text-[#8A5A24]">
            המקדמה נקלטת בחודש הרכישה ומתווספת להכנסות החודשיות באדמין.
            תשלום לאנשי צוות יורד קודם מהתשלום באולם. אם אין מספיק באולם,
            היתרה יורדת מהסכום המלא ומתעדכנת בהתאם.
          </div>
        </div>
      )}
    </section>
  );
}

function CallRoundsScheduleFields({
  value,
  onChange,
}: {
  value: CallRoundsScheduleState;
  onChange: (next: CallRoundsScheduleState) => void;
}) {
  function updateEnabled(enabled: boolean) {
    onChange({
      ...value,
      enabled,
      rounds: value.rounds.map((round) => ({
        ...round,
        status: enabled && round.scheduledAt ? "scheduled" : round.status,
      })),
    });
  }

  function updateRound(
    roundNumber: number,
    field: "scheduledAt" | "notes",
    fieldValue: string
  ) {
    onChange({
      ...value,
      rounds: value.rounds.map((round) =>
        round.roundNumber === roundNumber
          ? {
              ...round,
              [field]: fieldValue,
              status:
                field === "scheduledAt" && fieldValue
                  ? "scheduled"
                  : field === "scheduledAt" && !fieldValue
                    ? "draft"
                    : round.status,
            }
          : round
      ),
    });
  }

  return (
    <section
      className="
        rounded-[26px]
        border border-[#E7D8C6]
        bg-white
        p-5
      "
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#3A2A1C]">
            לו״ז סבבי שיחות
          </h3>

          <p className="mt-1 text-xs font-bold text-[#8A7867]">
            כאן מגדירים תאריך ושעה לסבבי השיחות של הלקוח. השמירה מתבצעת על המשתמש.
          </p>
        </div>

        {value.enabled && (
          <span className="rounded-full bg-[#FFF2D8] px-3 py-1 text-xs font-black text-[#9A651B]">
            פעיל
          </span>
        )}
      </div>

      <label
        className="
          mb-5 flex cursor-pointer items-center justify-between gap-3
          rounded-2xl
          border border-[#EFE2D1]
          bg-[#FFFDF8]
          px-4 py-3
        "
      >
        <div>
          <div className="font-black text-[#3A2A1C]">
            {value.enabled ? "לו״ז סבבי שיחות פעיל" : "הפעל לו״ז סבבי שיחות"}
          </div>

          <div className="mt-1 text-xs font-bold text-[#8A7867]">
            ניתן להשאיר סבב ריק אם עדיין אין תאריך סופי.
          </div>
        </div>

        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => updateEnabled(e.target.checked)}
          className="h-5 w-5 accent-[#B97821]"
        />
      </label>

      {value.enabled && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {value.rounds.map((round) => (
            <div
              key={round.roundNumber}
              className="rounded-2xl border border-[#EFE2D1] bg-[#FFFDF8] p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="font-black text-[#3A2A1C]">
                  סבב שיחות {round.roundNumber}
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-black ${
                    round.scheduledAt
                      ? "bg-[#EAF8EF] text-[#1F9A55]"
                      : "bg-[#F6F1EA] text-[#7B6754]"
                  }`}
                >
                  {round.scheduledAt ? "מתוזמן" : "לא נקבע"}
                </span>
              </div>

              <input
                type="datetime-local"
                value={round.scheduledAt}
                onChange={(e) =>
                  updateRound(round.roundNumber, "scheduledAt", e.target.value)
                }
                className="
                  h-12 w-full rounded-2xl
                  border border-[#E7D8C6]
                  bg-white px-4
                  text-sm font-bold
                  text-[#3A2A1C]
                  outline-none
                "
              />

              <textarea
                value={round.notes}
                onChange={(e) => updateRound(round.roundNumber, "notes", e.target.value)}
                placeholder="הערות לסבב..."
                className="
                  mt-3 min-h-[82px] w-full resize-none rounded-2xl
                  border border-[#E7D8C6]
                  bg-white px-4 py-3
                  text-sm font-bold
                  text-[#3A2A1C]
                  outline-none
                  placeholder:text-[#B6A28C]
                "
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* =========================
   EDIT USER MODAL
========================= */
function EditUserModal({
  user,
  pricingPlans,
  recordOptions,
  producers,
  staff,
  onClose,
  onSaved,
  onRoundsChanged,
}: {
  user: AdminUser;
  pricingPlans: AdminPricingPlan[];
  recordOptions: AdminRecordOption[];
  producers: Assignee[];
  staff: Assignee[];
  onClose: () => void;
  onSaved: () => void;
  onRoundsChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const [deletingInvitation, setDeletingInvitation] = useState(false);

  const [venueSeatingService, setVenueSeatingService] =
  useState<VenueSeatingServiceForm>(getVenueSeatingServiceInitial(user));

  const [callRoundsSchedule, setCallRoundsSchedule] =
    useState<CallRoundsScheduleState>(getInitialCallRoundsSchedule(user));

  const [form, setForm] = useState<EditFormState>({
    name: user.name || "",
    email: user.email || "",
    eventDate: formatDateInput(user.eventDate),
    assignedProducerId: user.assignedProducerId || null,
    assignedStaffIds: user.assignedStaffIds || [],
  });

  async function saveChanges() {
  try {
    setSaving(true);

    const payload = {
      name: form.name,
      email: form.email,
      eventDate: form.eventDate,
      venueSeatingService: calculateVenueSeatingService(venueSeatingService),
      callRoundsSchedule: {
        ...callRoundsSchedule,
        rounds: callRoundsSchedule.rounds.map((round) => ({
          ...round,
          scheduledAt: round.scheduledAt
            ? normalizeDateTimeLocalForSave(round.scheduledAt)
            : "",
        })),
      },
    };

    console.log("SAVE USER PAYLOAD:", payload);

    const userRes = await fetch(`/api/admin/users/${user._id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const userData = await userRes.json().catch(() => null);

    console.log("SAVE USER RESPONSE:", userData);

    if (!userRes.ok || userData?.success === false) {
      alert(userData?.error || "שמירת פרטי המשתמש נכשלה");
      return;
    }

    const assigneesRes = await fetch(`/api/admin/users/${user._id}/assignees`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assignedProducerId: form.assignedProducerId,
        assignedStaffIds: form.assignedStaffIds,
      }),
    });

    const assigneesData = await assigneesRes.json().catch(() => null);

    if (!assigneesRes.ok || assigneesData?.success === false) {
      alert(assigneesData?.error || "שמירת המטפלים נכשלה");
      return;
    }

    onSaved();
  } catch (err) {
    console.error(err);
    alert("שמירת השינויים נכשלה");
  } finally {
    setSaving(false);
  }
}

  async function deleteInvitationForUser() {
  if (!user.invitationId) {
    alert("לא נמצאה הזמנה למחיקה למשתמש הזה");
    return;
  }

  const confirmed = confirm(
    `האם למחוק את ההזמנה של ${user.name || user.email}?\n\nהפעולה תמחק את ההזמנה ואת כל המוזמנים והקבוצות המשויכים אליה.`
  );

  if (!confirmed) return;

  const secondConfirm = confirm(
    "אישור סופי: ההזמנה תימחק לצמיתות ולא ניתן יהיה לשחזר אותה.\n\nהמשתמש והאירוע לא יימחקו."
  );

  if (!secondConfirm) return;

  try {
    setDeletingInvitation(true);

    const res = await fetch("/api/admin/invitations/delete", {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user._id,
        invitationId: user.invitationId,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || data?.success === false) {
      alert(data?.message || "מחיקת ההזמנה נכשלה");
      return;
    }

    alert(data?.message || "ההזמנה נמחקה בהצלחה");

    onSaved();
  } catch (err) {
    console.error(err);
    alert("אירעה שגיאה במחיקת ההזמנה");
  } finally {
    setDeletingInvitation(false);
  }
}

  return (
    <ModalShell
      title="עריכת משתמש"
      subtitle="עריכת פרטי לקוח, הרשאות ומטפלים"
      onClose={onClose}
    >
      <div className="space-y-7">
        <section
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-[#FFFDF8]
            p-5
          "
        >
          <div className="mb-4 flex items-center gap-2">
            <CreditCard size={20} className="text-[#B97821]" />
            <h3 className="text-lg font-black text-[#3A2A1C]">
              מה הלקוח רכש
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {getPurchasedItems(user, pricingPlans, recordOptions).map(
              (item) => (
                <div
                  key={item.label}
                  className="
                    flex items-center justify-between gap-3
                    rounded-2xl
                    border border-[#EFE2D1]
                    bg-white
                    px-4 py-3
                    text-sm
                  "
                >
                  <span className="font-bold text-[#7B6754]">
                    {item.label}
                  </span>

                  <span
                    className={`font-black ${
                      item.active ? "text-[#3A2A1C]" : "text-[#9B9187]"
                    }`}
                  >
                    {item.value}
                  </span>
                </div>
              )
            )}
          </div>

          <div
            className="
              mt-4 flex items-center justify-between
              rounded-2xl
              bg-[#FFF2D8]
              px-4 py-3
            "
          >
            <span className="font-black text-[#7B6754]">סה״כ ששולם</span>
            <span className="text-2xl font-black text-[#B97821]">
              {formatMoney(getUserTotalPaid(user))}
            </span>
          </div>
        </section>

<VenueSeatingServiceFields
  title="שירות הושבה באולם"
  description={
    venueSeatingService.enabled
      ? "הלקוח רכש שירות הושבה באולם. ניתן לערוך סכומים ותשלום צוות."
      : "הלקוח עדיין לא רכש. ניתן להוסיף לו שירות הושבה באולם."
  }
  value={venueSeatingService}
  onChange={setVenueSeatingService}
  purchasedMode
/>

<CallRoundsScheduleFields
  value={callRoundsSchedule}
  onChange={setCallRoundsSchedule}
/>

        <AdminMessageRoundsPanel
          user={user}
          onChanged={onRoundsChanged}
        />

        <section
  className="
    rounded-[26px]
    border border-red-200
    bg-red-50
    p-5
  "
>
  <div className="mb-4 flex items-center gap-2">
    <Trash2 size={20} className="text-red-600" />

    <h3 className="text-lg font-black text-red-700">
  מחיקת הזמנה
</h3>
</div>

<p className="text-sm font-bold leading-7 text-red-700">
  פעולה זו תמחק את ההזמנה של המשתמש ואת כל המוזמנים והקבוצות המשויכים אליה.
  הפעולה לא מוחקת את המשתמש, לא מוחקת את האירוע ולא ניתנת לשחזור.
</p>

<button
  type="button"
  onClick={deleteInvitationForUser}
  disabled={deletingInvitation || !user.invitationId}
  className="
    mt-4
    flex h-11 items-center justify-center gap-2
    rounded-2xl
    bg-red-600
    px-5
    text-sm font-black
    text-white
    shadow-sm
    transition
    hover:bg-red-700
    disabled:cursor-not-allowed
    disabled:opacity-50
  "
>
  {deletingInvitation ? (
    <>
      <Loader2 className="animate-spin" size={17} />
      מוחק הזמנה...
    </>
  ) : (
    <>
      <Trash2 size={17} />
      מחיקת ההזמנה
    </>
  )}
</button>
</section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <InputField
            label="שם מלא"
            value={form.name}
            onChange={(value) => setForm((p) => ({ ...p, name: value }))}
          />

          <InputField
            label="אימייל"
            type="email"
            value={form.email}
            onChange={(value) => setForm((p) => ({ ...p, email: value }))}
          />

          <InputField
            label="תאריך אירוע"
            type="date"
            value={form.eventDate}
            onChange={(value) => setForm((p) => ({ ...p, eventDate: value }))}
          />
        </section>

        <section className="border-t border-[#EFE2D1] pt-6">
          <h3 className="mb-4 text-lg font-black text-[#3A2A1C]">מטפלים</h3>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-black text-[#6B5A48]">
                מפיק מטפל
              </span>

              <select
                className="
                  h-12 w-full rounded-2xl
                  border border-[#E7D8C6]
                  bg-white px-4
                  text-sm font-bold
                  outline-none
                "
                value={form.assignedProducerId ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    assignedProducerId: e.target.value || null,
                  }))
                }
              >
                <option value="">ללא מפיק</option>

                {producers.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name || p.email}
                  </option>
                ))}
              </select>
            </label>

            <label>
  <span className="mb-2 block text-sm font-black text-[#6B5A48]">
    עובד מטפל
  </span>

  <select
    className="
      h-12 w-full rounded-2xl
      border border-[#E7D8C6]
      bg-white px-4
      text-sm font-bold
      text-[#3A2A1C]
      outline-none
    "
    value={form.assignedStaffIds?.[0] || ""}
    onChange={(e) =>
      setForm((p) => ({
        ...p,
        assignedStaffIds: e.target.value ? [e.target.value] : [],
      }))
    }
  >
    <option value="">ללא עובד מטפל</option>

    {staff.map((s) => (
      <option key={s._id} value={s._id}>
        {s.name || s.email}
      </option>
    ))}
  </select>
</label>

          </div>
        </section>
      </div>

      <ModalFooter>
        <button
          onClick={onClose}
          className="h-12 rounded-2xl bg-[#ECE7E1] px-6 font-black text-[#6B5A48]"
        >
          ביטול
        </button>

        <button
          onClick={saveChanges}
          disabled={saving}
          className="
            flex h-12 items-center justify-center gap-2
            rounded-2xl bg-black px-7
            font-black text-white
            disabled:opacity-50
          "
        >
          {saving ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          שמור שינויים
        </button>
      </ModalFooter>
    </ModalShell>
  );
}


/* =========================
   EVENT SCHEDULE MODAL
========================= */
function EventScheduleModal({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const rounds = normalizeAdminMessageRounds(user);

  const scheduleItems = [
    ...rounds.rsvp.map((round) => ({
      ...round,
      group: "אישורי הגעה",
      icon: "💬",
    })),
    ...(rounds.calls || []).map((round) => ({
      ...round,
      group: "סבבי שיחות",
      icon: "📞",
    })),
    ...rounds.reminder.map((round) => ({
      ...round,
      group: "תזכורות",
      icon: "🔔",
    })),
    ...rounds.thankyou.map((round) => ({
      ...round,
      group: "תודה",
      icon: "💛",
    })),
  ];

  const sortedItems = [...scheduleItems].sort((a, b) => {
    const aDate = a.scheduledAt || a.sentAt || "";
    const bDate = b.scheduledAt || b.sentAt || "";

    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;

    return new Date(aDate).getTime() - new Date(bDate).getTime();
  });

  const plannedCount = scheduleItems.filter((item) => item.scheduledAt && !item.done).length;
  const sentCount = scheduleItems.filter((item) => item.done).length;
  const blockedCount = scheduleItems.filter((item) => item.blocked).length;

  return (
    <ModalShell
      title='לו"ז אירוע'
      subtitle="צפייה מהירה בלו״ז הסבבים של הלקוח בלי לצאת מניהול המשתמשים"
      onClose={onClose}
    >
      <div className="space-y-6">
        <section
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-[#FFFDF8]
            p-5
          "
        >
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={20} className="text-[#B97821]" />
            <h3 className="text-lg font-black text-[#3A2A1C]">
              פרטי האירוע
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ScheduleInfoBox label="לקוח" value={user.name || user.email || "—"} />
            <ScheduleInfoBox label="אימייל" value={user.email || "—"} />
            <ScheduleInfoBox label="תאריך אירוע" value={formatDate(user.eventDate)} />
            <ScheduleInfoBox label="חבילה" value={user.packageName || user.plan || user.priceKey || "—"} />
            <ScheduleInfoBox label="רשומות / אורחים" value={String(getUserRecords(user) || "—")} />
            <ScheduleInfoBox label="שירות שיחות" value={getCallsStatus(user)} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <ScheduleStatCard label="מתוזמנים" value={String(plannedCount)} />
          <ScheduleStatCard label="בוצעו" value={String(sentCount)} />
          <ScheduleStatCard label="חסומים" value={String(blockedCount)} />
        </section>

        <section
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-white
            p-5
          "
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-[#3A2A1C]">
                לו״ז סבבים
              </h3>
              <p className="mt-1 text-xs font-bold text-[#8A7867]">
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {sortedItems.map((item) => {

              const scheduledAtText = formatDateTimeWithWeekday(item.scheduledAt);
const sentAtText = formatDateTimeWithWeekday(item.sentAt);

              return (
                <div
                  key={`${item.group}-${item.key}`}
                  className="
                    flex flex-col gap-3
                    rounded-2xl
                    border border-[#EFE2D1]
                    bg-[#FFFDF8]
                    px-4 py-3
                    md:flex-row
                    md:items-center
                    md:justify-between
                  "
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="
                        flex h-10 w-10 shrink-0 items-center justify-center
                        rounded-2xl
                        bg-[#FFF2D8]
                        text-lg
                      "
                    >
                      {item.icon}
                    </div>

                    <div>
                      <div className="text-xs font-black text-[#B97821]">
                        {item.group}
                      </div>
                      <div className="mt-1 font-black text-[#3A2A1C]">
                        {item.label}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                        <span
                          className={`rounded-full px-3 py-1 ${
                            item.done
                              ? "bg-[#EAF8EF] text-[#1F9A55]"
                              : "bg-[#F6F1EA] text-[#7B6754]"
                          }`}
                        >
                          {item.done ? "בוצע" : "טרם בוצע"}
                        </span>

                        {item.blocked && (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">
                            חסום
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-[190px] rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#6B5A48]">

                    {sentAtText ? (
  <span>
    נשלח
    {getChannelLabel(item.channel) ? ` · ${getChannelLabel(item.channel)}` : ""}
    {" · "}
    {sentAtText}
  </span>
) : scheduledAtText ? (
  <span>
    מתוזמן
    {getChannelLabel(item.channel) ? ` · ${getChannelLabel(item.channel)}` : ""}
    {" · "}
    {scheduledAtText}
  </span>
) : (
  <span>אין תזמון</span>
)}

                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="h-12 rounded-2xl bg-[#24190F] px-7 font-black text-white"
        >
          סגירה
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

function ScheduleInfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#EFE2D1] bg-white px-4 py-3">
      <div className="text-xs font-black text-[#8A7867]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#3A2A1C]">{value}</div>
    </div>
  );
}

function ScheduleStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#E7D8C6] bg-[#FFF7E8] p-4">
      <div className="text-xs font-black text-[#8A5A24]">{label}</div>
      <div className="mt-1 text-2xl font-black text-[#B97821]">{value}</div>
    </div>
  );
}

/* =========================
   MESSAGE ROUNDS PANEL
========================= */
function AdminMessageRoundsPanel({
  user,
  onChanged,
}: {
  user: AdminUser;
  onChanged: () => void;
}) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [showWhatsappRoundReport, setShowWhatsappRoundReport] = useState(false);

  const rounds = normalizeAdminMessageRounds(user);

  async function updateRound(action: "reset" | "block" | "unblock", key: string) {
    const confirmText =
      action === "reset"
        ? "לפתוח מחדש את הסבב הזה?"
        : action === "block"
          ? "לחסום את הסבב הזה?"
          : "לבטל חסימה לסבב הזה?";

    if (!confirm(confirmText)) return;

    try {
      setLoadingKey(`${action}-${key}`);

      const res = await fetch(`/api/admin/users/${user._id}/message-rounds`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          key,
          invitationId: user.invitationId,
        }),
      });

      const data = await res.json().catch(() => null);

      console.log("message round response:", data);

      if (data?.debug) {
        alert(
          `matched: ${data.debug.matchedCount}\n` +
            `modified: ${data.debug.modifiedCount}\n` +
            `receivedInvitationId: ${data.debug.receivedInvitationId}\n` +
            `updatedInvitationId: ${data.debug.updatedInvitationId}`
        );
      }

      if (!res.ok || data?.success === false) {
        alert("עדכון הסבב נכשל");
        return;
      }

      onChanged();
    } catch (err) {
      console.error(err);
      alert("שגיאה בעדכון הסבב");
    } finally {
      setLoadingKey(null);
    }
  }

  const sections = [
    {
      title: "אישורי הגעה",
      subtitle: "לפי סבב, בלי קשר אם נשלח ב־WhatsApp או SMS",
      items: rounds.rsvp,
    },
    {
      title: "סבב תזכורת",
      subtitle: "תזכורת / מספר שולחן",
      items: rounds.reminder,
    },
    {
      title: "סבב תודה",
      subtitle: "הודעת תודה לאחר האירוע",
      items: rounds.thankyou,
    },
  ];

  return (
    <section
      className="
        rounded-[26px]
        border border-[#E7D8C6]
        bg-white
        p-5
      "
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#3A2A1C]">
            סבבי הודעות
          </h3>

          <p className="mt-1 text-xs font-bold text-[#8A7867]">
            אישורי הגעה סבב 1–3, תזכורת ותודה — כולל סטטוס, חסימה ופתיחה מחדש.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!user.invitationId) {
              alert("לא נמצאה הזמנה למשתמש הזה");
              return;
            }

            setShowWhatsappRoundReport(true);
          }}
          className="
            inline-flex
            w-fit
            items-center
            justify-center
            gap-2
            rounded-full
            border
            border-[#D9B46F]/60
            bg-[#FFFDF8]
            px-5
            py-2.5
            text-sm
            font-black
            text-[#6B451E]
            shadow-sm
            transition
            hover:-translate-y-0.5
            hover:bg-[#FFF8E6]
            hover:shadow-md
          "
        >
          📊 דוח WhatsApp לסבבים
        </button>
      </div>

      <div className="space-y-5">
        {sections.map((section) => (
          <div
            key={section.title}
            className="
              rounded-2xl
              border border-[#EFE2D1]
              bg-[#FFFDF8]
              p-4
            "
          >
            <div className="mb-3">
              <div className="font-black text-[#3A2A1C]">
                {section.title}
              </div>

              <div className="mt-1 text-xs font-bold text-[#8A7867]">
                {section.subtitle}
              </div>
            </div>

            <div className="space-y-3">
              {section.items.map((round) => {
                const isLoading =
                  loadingKey === `reset-${round.key}` ||
                  loadingKey === `block-${round.key}` ||
                  loadingKey === `unblock-${round.key}`;

                const sentAtText = formatDateTime(round.sentAt);
                const scheduledAtText = formatDateTime(round.scheduledAt);

                return (
                  <div
                    key={round.key}
                    className="
                      flex flex-col gap-3
                      rounded-2xl
                      border border-[#EFE2D1]
                      bg-white
                      px-4 py-3
                      md:flex-row
                      md:items-center
                      md:justify-between
                    "
                  >
                    <div>
                      <div className="font-black text-[#3A2A1C]">
                        {round.label}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                        <span
                          className={`
                            rounded-full px-3 py-1
                            ${
                              round.done
                                ? "bg-[#EAF8EF] text-[#1F9A55]"
                                : "bg-[#F6F1EA] text-[#7B6754]"
                            }
                          `}
                        >
                          {round.done ? "בוצע" : "טרם בוצע"}
                        </span>

                        {round.blocked && (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">
                            חסום
                          </span>
                        )}

                        {scheduledAtText && !round.done && (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-600">
                            מתוזמן · {scheduledAtText}
                          </span>
                        )}

                        {sentAtText && round.done && (
                          <span className="rounded-full bg-[#FFF2D8] px-3 py-1 text-[#9A651B]">
                            נשלח · {sentAtText}
                          </span>
                        )}

                        {round.channel && (
                          <span className="rounded-full bg-[#F3ECE4] px-3 py-1 text-[#7B6754]">
                            {getChannelLabel(round.channel)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:w-[240px]">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => updateRound("reset", round.key)}
                        className="
                          h-9 rounded-full
                          bg-[#B97821]
                          px-4
                          text-xs font-black
                          text-white
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                      >
                        פתיחה מחדש
                      </button>

                      {round.blocked ? (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => updateRound("unblock", round.key)}
                          className="
                            h-9 rounded-full
                            bg-[#2F3742]
                            px-4
                            text-xs font-black
                            text-white
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          בטל חסימה
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => updateRound("block", round.key)}
                          className="
                            h-9 rounded-full
                            bg-red-600
                            px-4
                            text-xs font-black
                            text-white
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                        >
                          חסימה
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {section.items.length === 0 && (
                <div className="rounded-2xl border border-[#EFE2D1] bg-white px-4 py-5 text-center text-sm font-bold text-[#8A7867]">
                  אין סבבים להצגה.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showWhatsappRoundReport && user.invitationId && (
        <AdminWhatsappRoundReportModal
          user={user}
          invitationId={user.invitationId}
          onClose={() => setShowWhatsappRoundReport(false)}
        />
      )}
    </section>
  );
}


function AdminWhatsappRoundReportModal({
  user,
  invitationId,
  onClose,
}: {
  user: AdminUser;
  invitationId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rounds, setRounds] = useState<WhatsappReportRound[]>([]);
  const [selectedRoundKey, setSelectedRoundKey] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        setLoading(true);
        setError("");

        const loadedRounds = await fetchWhatsappRoundReport(invitationId);

        if (!active) return;

        setRounds(loadedRounds);
        setSelectedRoundKey((current) => current || loadedRounds[0]?.key || "");
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "טעינת הדוח נכשלה");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReport();

    return () => {
      active = false;
    };
  }, [invitationId]);

  const selectedRound = useMemo(() => {
    return rounds.find((round) => round.key === selectedRoundKey) || rounds[0] || null;
  }, [rounds, selectedRoundKey]);

  const filteredRecipients = useMemo(() => {
    if (!selectedRound) return [];

    const q = normalizeText(search);

    return selectedRound.recipients.filter((item) => {
      if (!q) return true;

      return (
        normalizeText(item.name).includes(q) ||
        normalizeText(item.phone).includes(q) ||
        normalizeText(getWhatsappStatusLabel(item.status)).includes(q) ||
        normalizeText(item.errorMessage).includes(q) ||
        normalizeText(item.messageId).includes(q)
      );
    });
  }, [selectedRound, search]);

  return (
    <div
      dir="rtl"
      className="
        fixed inset-0 z-[10050]
        flex items-start justify-center
        overflow-y-auto
        bg-black/45
        px-2 py-3
        backdrop-blur-sm
        sm:px-4 sm:py-6
      "
      onClick={onClose}
    >
      <div
        className="
          relative
          flex
          max-h-[calc(100dvh-24px)]
          w-full
          max-w-5xl
          flex-col
          overflow-hidden
          rounded-[26px]
          border border-[#E7D8C6]
          bg-white
          shadow-[0_28px_90px_rgba(0,0,0,0.25)]
          sm:max-h-[calc(100dvh-48px)]
          sm:rounded-[34px]
        "
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="
            shrink-0
            border-b border-[#EFE2D1]
            bg-gradient-to-br from-[#FFFDF8] to-[#F8EFE3]
            px-4 py-4
            sm:px-6 sm:py-5
          "
        >
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="
                flex h-11 w-11 shrink-0 items-center justify-center
                rounded-full
                bg-white
                text-[#6B5138]
                shadow-sm
                transition
                hover:bg-[#F1E5D6]
              "
            >
              <X size={20} />
            </button>

            <div className="min-w-0 text-right">
              <h2 className="break-words text-2xl font-black text-[#3A2A1C] sm:text-3xl">
                דוח WhatsApp לסבבים
              </h2>
              <p className="mt-1 text-sm font-bold leading-6 text-[#8A7867]">
                {user.name || user.email || "לקוח"} · צפייה בסטטוסים וייצוא לאקסל
              </p>
            </div>
          </div>
        </header>

        <main
          className="
            flex-1
            overflow-y-auto
            overscroll-contain
            px-4 py-4
            sm:px-6 sm:py-5
          "
        >
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center text-[#6B5A48]">
              <Loader2 className="ml-2 animate-spin" size={22} />
              טוען דוח WhatsApp…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-sm font-bold leading-7 text-red-700">
              {error}
            </div>
          ) : !selectedRound ? (
            <div className="rounded-2xl border border-[#EFE2D1] bg-[#FFFDF8] px-4 py-5 text-center text-sm font-bold text-[#8A7867]">
              אין נתוני דוח להצגה.
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-[24px] border border-[#E7D8C6] bg-[#FFFDF8] p-4">
                <div className="mb-3 text-sm font-black text-[#7B6754]">סבבים</div>

                <div className="flex gap-3 overflow-x-auto pb-2">
                  {rounds.map((round) => (
                    <button
                      key={round.key}
                      type="button"
                      onClick={() => setSelectedRoundKey(round.key)}
                      className={`
                        min-w-[220px]
                        shrink-0
                        rounded-[22px]
                        border
                        px-4 py-3
                        text-right
                        transition
                        ${
                          selectedRound.key === round.key
                            ? "border-[#D7A34D] bg-white shadow-sm"
                            : "border-[#EFE2D1] bg-white/60 hover:bg-white"
                        }
                      `}
                    >
                      <div className="text-base font-black text-[#3A2A1C]">
                        {round.title}
                      </div>
                      <div className="mt-1 text-xs font-black text-[#8A7867]">
                        סה״כ {round.total} · נכשלו {round.failed}
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-[#E7D8C6] bg-white p-4">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-black text-[#3A2A1C]">
                      {selectedRound.title}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-[#8A7867]">
                      מוצגות {filteredRecipients.length} מתוך {selectedRound.recipients.length} רשומות
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => exportWhatsappRoundToExcel(selectedRound, user)}
                    className="
                      flex h-11 w-full items-center justify-center gap-2
                      rounded-2xl
                      bg-[#1F7A4D]
                      px-5
                      text-sm font-black
                      text-white
                      shadow-sm
                      transition
                      hover:bg-[#17663F]
                      md:w-auto
                    "
                  >
                    📥 ייצוא דוח לאקסל
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                  <WhatsappStatBox label='סה״כ' value={selectedRound.total} />
                  <WhatsappStatBox label="נשלחו" value={selectedRound.sent} />
                  <WhatsappStatBox label="נמסרו" value={selectedRound.delivered} />
                  <WhatsappStatBox label="נקראו" value={selectedRound.read} />
                  <WhatsappStatBox label="נכשלו" value={selectedRound.failed} danger />
                  <WhatsappStatBox label="ממתינים" value={selectedRound.pending} />
                </div>
              </section>

              <section className="rounded-[24px] border border-[#E7D8C6] bg-white p-4">
                <label className="mb-4 block">
                  <span className="mb-2 block text-sm font-black text-[#6B5A48]">
                    חיפוש לפי שם, טלפון, סטטוס או שגיאה
                  </span>
                  <div className="flex h-12 items-center gap-3 rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-4">
                    <Search size={18} className="text-[#9A7A52]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="לדוגמה: גיא / 050 / נכשל"
                      className="w-full bg-transparent text-sm font-bold text-[#3A2A1C] outline-none placeholder:text-[#B6A28C]"
                    />
                  </div>
                </label>

                <div className="overflow-x-auto rounded-[22px] border border-[#EFE2D1]">
                  <table className="min-w-[760px] w-full text-right text-sm">
                    <thead className="bg-[#F5EFE6] text-xs font-black text-[#7B6754]">
                      <tr>
                        <th className="p-4">אורח</th>
                        <th className="p-4">טלפון</th>
                        <th className="p-4">סטטוס</th>
                        <th className="p-4">נשלח</th>
                        <th className="p-4">נמסר</th>
                        <th className="p-4">נקרא</th>
                        <th className="p-4">שגיאה</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#EFE2D1] bg-white">
                      {filteredRecipients.map((item) => (
                        <tr key={item.id} className="hover:bg-[#FFFDF8]">
                          <td className="p-4 font-black text-[#3A2A1C]">
                            {item.name || "—"}
                          </td>
                          <td className="p-4 font-bold text-[#6B5A48]" dir="ltr">
                            {item.phone || "—"}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getWhatsappStatusClass(item.status)}`}
                            >
                              {getWhatsappStatusLabel(item.status)}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-[#6B5A48]">
                            {formatDateTime(item.sentAt) || "—"}
                          </td>
                          <td className="p-4 font-bold text-[#6B5A48]">
                            {formatDateTime(item.deliveredAt) || "—"}
                          </td>
                          <td className="p-4 font-bold text-[#6B5A48]">
                            {formatDateTime(item.readAt) || "—"}
                          </td>
                          <td className="max-w-[240px] p-4 text-xs font-bold leading-6 text-red-600">
                            {item.errorMessage || "—"}
                          </td>
                        </tr>
                      ))}

                      {filteredRecipients.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center font-bold text-[#8A7867]">
                            לא נמצאו רשומות לפי החיפוש.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function WhatsappStatBox({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border p-4 ${
        danger
          ? "border-red-200 bg-red-50"
          : "border-[#EFE2D1] bg-[#FFFDF8]"
      }`}
    >
      <div className={`text-xs font-black ${danger ? "text-red-500" : "text-[#7B6754]"}`}>
        {label}
      </div>
      <div className={`mt-1 text-2xl font-black ${danger ? "text-red-600" : "text-[#24190F]"}`}>
        {Number(value || 0).toLocaleString("he-IL")}
      </div>
    </div>
  );
}

/* =========================
   UPGRADE MODAL
========================= */
function UpgradeUserModal({
  user,
  pricingPlans,
  recordOptions,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  pricingPlans: AdminPricingPlan[];
  recordOptions: AdminRecordOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const [paymentMode, setPaymentMode] =
    useState<UpgradePaymentMode>("manual_paid");

  const currentPlanKey = user.priceKey || user.plan || "";
  const currentRecords = getUserRecords(user);
  const currentRecordOption = getRecordOptionForUser(user, recordOptions);

  const currentPlan =
    pricingPlans.find((plan) => plan.key === currentPlanKey) || null;

  const [form, setForm] = useState<UpgradeFormState>({
    plan: currentPlanKey || pricingPlans[0]?.key || "",
    includeCalls: Boolean(user.includeCalls),
    includeCreditGifts: Boolean(user.includeCreditGifts),
    includeDigitalSeating: Boolean(user.includeDigitalSeating),
    includeEventManagement: Boolean(user.includeEventManagement),
    includeCustomDesign: Boolean(user.includeCustomDesign),
  });

  const [selectedRecords, setSelectedRecords] = useState<number>(
    currentRecordOption?.records || currentRecords || 0
  );

  const initialExtraRecords = Math.max(
    0,
    currentRecords - Number(currentRecordOption?.records || currentRecords || 0)
  );

  const [extraRecords, setExtraRecords] = useState(initialExtraRecords);
  const [extraRecordsAmount, setExtraRecordsAmount] = useState(0);
  const [manualTotalToPay, setManualTotalToPay] = useState(0);

  const [venueSeatingService, setVenueSeatingService] =
  useState<VenueSeatingServiceForm>(getVenueSeatingServiceInitial(user));

  const [callRoundsSchedule, setCallRoundsSchedule] =
    useState<CallRoundsScheduleState>(getInitialCallRoundsSchedule(user));

  const selectedPlan =
    pricingPlans.find((plan) => plan.key === form.plan) || null;

  const selectedRecordOption =
    recordOptions.find(
      (option) => Number(option.records) === Number(selectedRecords)
    ) || null;

  const currentPackagePrice = getPriceForRecordOption(
    currentPlanKey,
    currentRecordOption
  );

  const selectedPackagePrice = getPriceForRecordOption(
    form.plan,
    selectedRecordOption
  );

  const packageDiff = Math.max(
    0,
    selectedPackagePrice - currentPackagePrice
  );

  const addonsDiff = ADDONS.reduce((sum, addon) => {
    const isSelected = Boolean(form[addon.key]);
    const alreadyOwned = getAddonValue(user, addon.key);

    if (!isSelected || alreadyOwned) return sum;

    return sum + addon.price;
  }, 0);

 const venueSeatingCalculated =
  calculateVenueSeatingService(venueSeatingService);

const venueSeatingDepositToPay =
  venueSeatingCalculated.enabled &&
  !user.venueSeatingService?.enabled
    ? venueSeatingCalculated.depositAmount
    : 0;

const extraRecordsTotalAmount =
  Number(extraRecords || 0) * Number(extraRecordsAmount || 0);

const calculatedTotalToPay =
  packageDiff +
  addonsDiff +
  extraRecordsTotalAmount +
  venueSeatingDepositToPay;

  useEffect(() => {
    setManualTotalToPay(calculatedTotalToPay);
  }, [calculatedTotalToPay]);

  const finalRecords =
    Number(selectedRecords || 0) + Number(extraRecords || 0);

  const finalSmsLimit = Number(
    selectedRecordOption?.sms || user.smsLimit || user.maxMessages || 0
  );

  const canSubmit =
    Boolean(form.plan) &&
    Boolean(selectedRecords) &&
    manualTotalToPay >= 0;

  async function saveManualPaidUpgrade() {
  const res = await fetch(`/api/admin/users/${user._id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan: form.plan,
      priceKey: form.plan,
      packageName: selectedPlan?.label || form.plan,

      guests: finalRecords,
      maxGuests: finalRecords,
      smsLimit: finalSmsLimit,
      maxMessages: finalSmsLimit,

      includeCalls: form.includeCalls,
      includeCreditGifts: form.includeCreditGifts,
      includeDigitalSeating: form.includeDigitalSeating,
      includeEventManagement: form.includeEventManagement,
      includeCustomDesign: form.includeCustomDesign,

      /*
        ✅ הרשאות מודולים:
        rsvpSeating = אישורי הגעה / הושבה
        eventProduction = מערכת ניהול אירוע
      */
      accessModules: {
        rsvpSeating: Boolean(form.includeDigitalSeating),
        eventProduction: Boolean(form.includeEventManagement),
      },

      extraRecords,
      extraRecordsAmount: extraRecordsTotalAmount,
      extraRecordsPricePerRecord: Number(extraRecordsAmount || 0),

      upgradeAmount: manualTotalToPay,
      upgradePaymentStatus: "paid",
      upgradePaymentMethod: "manual_admin",

      venueSeatingService: calculateVenueSeatingService(venueSeatingService),
      venueSeatingDepositAmount: venueSeatingDepositToPay,
      callRoundsSchedule,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || data?.success === false) {
    throw new Error("MANUAL_UPGRADE_FAILED");
  }
}

  async function createStripeUpgradeCheckout() {
  const res = await fetch(`/api/admin/users/${user._id}/upgrade-stripe`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: manualTotalToPay,

      plan: form.plan,
      priceKey: form.plan,
      packageName: selectedPlan?.label || form.plan,

      guests: finalRecords,
      maxGuests: finalRecords,
      smsLimit: finalSmsLimit,
      maxMessages: finalSmsLimit,

      includeCalls: form.includeCalls,
      includeCreditGifts: form.includeCreditGifts,
      includeDigitalSeating: form.includeDigitalSeating,
      includeEventManagement: form.includeEventManagement,
      includeCustomDesign: form.includeCustomDesign,

      /*
        ✅ הרשאות מודולים:
        rsvpSeating = אישורי הגעה / הושבה
        eventProduction = מערכת ניהול אירוע
      */
      accessModules: {
        rsvpSeating: Boolean(form.includeDigitalSeating),
        eventProduction: Boolean(form.includeEventManagement),
      },

      extraRecords,
      extraRecordsAmount: extraRecordsTotalAmount,
      extraRecordsPricePerRecord: Number(extraRecordsAmount || 0),

      venueSeatingService: calculateVenueSeatingService(venueSeatingService),
      venueSeatingDepositAmount: venueSeatingDepositToPay,
      callRoundsSchedule,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || data?.success === false) {
    throw new Error("STRIPE_CHECKOUT_FAILED");
  }

  const checkoutUrl = data?.url || data?.checkoutUrl;

  if (!checkoutUrl) {
    throw new Error("MISSING_STRIPE_URL");
  }

  window.location.href = checkoutUrl;
}

  async function saveUpgrade() {
    if (!canSubmit) {
      alert("חסר מידע לשדרוג");
      return;
    }

    try {
      setSaving(true);

      if (paymentMode === "manual_paid") {
        await saveManualPaidUpgrade();
        onSaved();
        return;
      }

      await createStripeUpgradeCheckout();
    } catch (err) {
      console.error(err);

      if (paymentMode === "stripe") {
        alert("יצירת תשלום Stripe נכשלה");
      } else {
        alert("שמירת השדרוג נכשלה");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!pricingPlans.length || !recordOptions.length) {
    return (
      <ModalShell
        title="שדרוג משתמש"
        subtitle="חסרים נתוני חבילות מהשרת"
        onClose={onClose}
      >
        <div
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-[#FFFDF8]
            p-6
            text-center
            text-sm font-bold
            text-[#7B6754]
          "
        >
          לא נמצאו חבילות או מדרגות רשומות מהשרת. צריך לוודא ש־
          <span dir="ltr"> /api/admin/packages </span>
          מחזיר plans ו־recordOptions.
        </div>

        <ModalFooter>
          <button
            onClick={onClose}
            className="h-12 rounded-2xl bg-[#ECE7E1] px-6 font-black text-[#6B5A48]"
          >
            סגירה
          </button>
        </ModalFooter>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title="שדרוג משתמש"
      subtitle="שינוי חבילה, שינוי כמות רשומות, אפסיילים ותשלום הפרש"
      onClose={onClose}
    >
      <div className="space-y-7">
        <section
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-[#FFFDF8]
            p-5
          "
        >
          <div className="mb-4 flex items-center gap-2">
            <Crown size={20} className="text-[#B97821]" />

            <h3 className="text-lg font-black text-[#3A2A1C]">
              חבילה ורשומות
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SummaryBox
              label="מצב נוכחי"
              value={`${currentPlan?.label || getPlanLabel(user, pricingPlans)} · ${
                currentRecords || 0
              } רשומות`}
            />

            <SummaryBox
              label="מחיר מצב נוכחי"
              value={formatMoney(currentPackagePrice)}
            />

            <label>
              <span className="mb-2 block text-sm font-black text-[#6B5A48]">
                שינוי חבילה
              </span>

              <select
                value={form.plan}
                onChange={(e) => {
                  const nextPlan = pricingPlans.find(
                    (item) => item.key === e.target.value
                  );

                  setForm((prev) => ({
                    ...prev,
                    plan: e.target.value,
                    includeCalls:
                      Boolean(nextPlan?.includeCalls) || prev.includeCalls,
                    includeCreditGifts:
                      Boolean(nextPlan?.includeCreditGifts) ||
                      prev.includeCreditGifts,
                    includeDigitalSeating:
                      Boolean(nextPlan?.includeDigitalSeating) ||
                      prev.includeDigitalSeating,
                    includeEventManagement:
                      Boolean(nextPlan?.includeEventManagement) ||
                      prev.includeEventManagement,
                    includeCustomDesign:
                      Boolean(nextPlan?.includeCustomDesign) ||
                      prev.includeCustomDesign,
                  }));
                }}
                className="
                  h-12 w-full rounded-2xl
                  border border-[#E7D8C6]
                  bg-white px-4
                  text-sm font-black
                  outline-none
                "
              >
                {pricingPlans.map((plan) => (
                  <option key={plan.key} value={plan.key}>
                    {plan.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-black text-[#6B5A48]">
                שינוי כמות רשומות
              </span>

              <select
                value={selectedRecords}
                onChange={(e) => setSelectedRecords(Number(e.target.value))}
                className="
                  h-12 w-full rounded-2xl
                  border border-[#E7D8C6]
                  bg-white px-4
                  text-sm font-black
                  outline-none
                "
              >
                {recordOptions.map((option) => (
                  <option key={option.records} value={option.records}>
                    {option.label || `עד ${option.records} רשומות`} ·{" "}
                    {formatMoney(option.prices?.[form.plan] || 0)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="mt-3 text-xs font-bold text-[#8A7867]">
            אפשר לשדרג רק חבילה בלי להגדיל רשומות, או להגדיל רשומות בלי לשנות
            חבילה.
          </p>
        </section>

        <section
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-white
            p-5
          "
        >
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-[#B97821]" />

            <h3 className="text-lg font-black text-[#3A2A1C]">
              אפסיילים והרשאות
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {ADDONS.map((addon) => {
              const alreadyOwned = getAddonValue(user, addon.key);

              return (
                <label
                  key={addon.key}
                  className="
                    flex cursor-pointer items-center justify-between gap-3
                    rounded-2xl
                    border border-[#EFE2D1]
                    bg-[#FFFDF8]
                    px-4 py-3
                  "
                >
                  <div>
                    <div className="font-black text-[#3A2A1C]">
                      {addon.label}
                    </div>

                    <div className="mt-1 text-xs font-bold text-[#8A7867]">
                      {alreadyOwned
                        ? "כבר קיים ללקוח"
                        : addon.price > 0
                          ? `תוספת ${formatMoney(addon.price)}`
                          : "ללא מחיר מוגדר"}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={Boolean(form[addon.key])}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        [addon.key]: e.target.checked,
                      }))
                    }
                    className="h-5 w-5 accent-[#B97821]"
                  />
                </label>
              );
            })}
          </div>
        </section>

<VenueSeatingServiceFields
  title="שירות הושבה באולם"
  description={
    user.venueSeatingService?.enabled
      ? "הלקוח כבר רכש שירות הושבה באולם. ניתן לראות ולעדכן את הסכומים."
      : "אפשר להוסיף ללקוח שירות הושבה באולם כחלק מהשדרוג."
  }
  value={venueSeatingService}
  onChange={setVenueSeatingService}
  purchasedMode
/>

<CallRoundsScheduleFields
  value={callRoundsSchedule}
  onChange={setCallRoundsSchedule}
/>

        <section
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-white
            p-5
          "
        >
          <div className="mb-4 flex items-center gap-2">
            <PlusCircle size={20} className="text-[#B97821]" />

            <h3 className="text-lg font-black text-[#3A2A1C]">
              הוספת רשומות ידנית בתשלום
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <InputField
              label="כמות רשומות נוספות"
              type="number"
              value={String(extraRecords)}
              onChange={(value) =>
                setExtraRecords(Number(value || 0))
              }
            />

            <InputField
                label="מחיר לרשומה נוספת"

              type="number"
              value={String(extraRecordsAmount)}
              onChange={(value) =>
                setExtraRecordsAmount(Number(value || 0))
              }
            />

            <SummaryBox
              label="סה״כ רשומות אחרי עדכון"
              value={String(finalRecords)}
            />
          </div>

          <p className="mt-3 text-xs font-bold text-[#8A7867]">
            זה מיועד למקרה שאת רוצה לתת מעבר למדרגת הרשומות הרשמית ולתמחר
            ידנית.
          </p>
        </section>

        <section
          className="
            rounded-[26px]
            border border-[#E8C98D]
            bg-[#FFF7E8]
            p-5
          "
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <SummaryBox
              label="הפרש חבילה/רשומות"
              value={formatMoney(packageDiff)}
            />

            <SummaryBox
              label="הפרש אפסיילים"
              value={formatMoney(addonsDiff)}
            />

            <SummaryBox
  label="רשומות ידניות"
  value={formatMoney(extraRecordsTotalAmount)}
/>

<SummaryBox
  label="מקדמת הושבה באולם"
  value={formatMoney(venueSeatingDepositToPay)}
/>

            <div
              className="
                rounded-2xl
                border border-[#E8C98D]
                bg-[#FFF2D8]
                px-4 py-3
              "
            >
              <div className="text-xs font-black text-[#8A7867]">
                סה״כ לתשלום עכשיו
              </div>

              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={manualTotalToPay}
                  onChange={(e) =>
                    setManualTotalToPay(Number(e.target.value || 0))
                  }
                  className="
                    h-11 w-full
                    rounded-xl
                    border border-[#E8C98D]
                    bg-white
                    px-3
                    text-xl font-black
                    text-[#B97821]
                    outline-none
                  "
                />

                <span className="text-lg font-black text-[#B97821]">
                  ₪
                </span>
              </div>

              <div className="mt-2 text-xs font-bold text-[#8A7867]">
                מחושב אוטומטית לפי הבחירות, אבל ניתן לעריכה ידנית.
              </div>
            </div>
          </div>
        </section>

        <section
          className="
            rounded-[26px]
            border border-[#E7D8C6]
            bg-white
            p-5
          "
        >
          <div className="mb-4 flex items-center gap-2">
            <Banknote size={20} className="text-[#B97821]" />

            <h3 className="text-lg font-black text-[#3A2A1C]">
              אופן תשלום ההפרש
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label
              className={`
                flex cursor-pointer items-center justify-between gap-3
                rounded-2xl border px-4 py-4
                ${
                  paymentMode === "manual_paid"
                    ? "border-[#B97821] bg-[#FFF7E8]"
                    : "border-[#EFE2D1] bg-[#FFFDF8]"
                }
              `}
            >
              <div>
                <div className="font-black text-[#3A2A1C]">
                  סומן כשולם
                </div>

                <div className="mt-1 text-xs font-bold text-[#8A7867]">
                  יעדכן את המשתמש מיד וייצור תשלום באדמין.
                </div>
              </div>

              <input
                type="radio"
                checked={paymentMode === "manual_paid"}
                onChange={() => setPaymentMode("manual_paid")}
                className="h-5 w-5 accent-[#B97821]"
              />
            </label>

            <label
              className={`
                flex cursor-pointer items-center justify-between gap-3
                rounded-2xl border px-4 py-4
                ${
                  paymentMode === "stripe"
                    ? "border-[#B97821] bg-[#FFF7E8]"
                    : "border-[#EFE2D1] bg-[#FFFDF8]"
                }
              `}
            >
              <div>
                <div className="font-black text-[#3A2A1C]">
                  לשלם דרך Stripe
                </div>

                <div className="mt-1 text-xs font-bold text-[#8A7867]">
                  יפתח Checkout עם הסכום שהגדרת, והמשתמש יתעדכן אחרי תשלום.
                </div>
              </div>

              <input
                type="radio"
                checked={paymentMode === "stripe"}
                onChange={() => setPaymentMode("stripe")}
                className="h-5 w-5 accent-[#B97821]"
              />
            </label>
          </div>
        </section>
      </div>

      <ModalFooter>
        <button
          onClick={onClose}
          className="h-12 rounded-2xl bg-[#ECE7E1] px-6 font-black text-[#6B5A48]"
        >
          ביטול
        </button>

        <button
          onClick={saveUpgrade}
          disabled={saving || !canSubmit}
          className="
            flex h-12 items-center justify-center gap-2
            rounded-2xl bg-black px-7
            font-black text-white
            disabled:opacity-50
          "
        >
          {saving ? (
            <Loader2 className="animate-spin" size={18} />
          ) : paymentMode === "stripe" ? (
            <ExternalLink size={18} />
          ) : (
            <ArrowUpCircle size={18} />
          )}

          {paymentMode === "stripe" ? "מעבר לתשלום Stripe" : "שמור שדרוג"}
        </button>
      </ModalFooter>
    </ModalShell>
  );
}

/* =========================
   UI COMPONENTS
========================= */
function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      dir="rtl"
      className="
        fixed inset-0 z-[9999]
        flex items-start justify-center
        overflow-y-auto
        bg-black/45
        px-3 py-4
        backdrop-blur-sm
        md:px-6 md:py-8
      "
      onClick={onClose}
    >
      <div
        className="
          relative
          flex
          max-h-[calc(100dvh-32px)]
          w-full
          max-w-5xl
          flex-col
          overflow-hidden
          rounded-[28px]
          border border-[#E7D8C6]
          bg-white
          shadow-[0_28px_90px_rgba(0,0,0,0.24)]
          md:max-h-[calc(100dvh-64px)]
          md:rounded-[36px]
        "
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="
            sticky top-0 z-20
            flex shrink-0 items-start justify-between gap-4
            border-b border-[#EFE2D1]
            bg-gradient-to-br from-[#FFFDF8]/95 to-[#F8EFE3]/95
            p-4
            backdrop-blur
            md:p-6
          "
        >
          <div className="min-w-0 flex-1 text-right">
            <h2 className="break-words text-2xl font-black text-[#3A2A1C] md:text-3xl">
              {title}
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#8A7867]">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex h-11 w-11 shrink-0 items-center justify-center
              rounded-full
              bg-white
              text-[#6B5138]
              shadow-sm
              transition
              hover:bg-[#F1E5D6]
            "
          >
            <X size={20} />
          </button>
        </header>

        <main
          className="
            flex-1
            overflow-y-auto
            overscroll-contain
            px-4 py-5
            md:px-6 md:py-6
          "
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <footer
      className="
        sticky bottom-0 z-20 mt-8
        -mx-4
        flex flex-col-reverse gap-3
        border-t border-[#EFE2D1]
        bg-white/95
        px-4 py-4
        backdrop-blur
        md:-mx-6 md:flex-row md:justify-end md:px-6
      "
    >
      {children}
    </footer>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-black text-[#6B5A48]">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-12 w-full rounded-2xl
          border border-[#E7D8C6]
          bg-white px-4
          text-sm font-bold
          text-[#3A2A1C]
          outline-none
          transition
          focus:border-[#C8944E]
        "
      />
    </label>
  );
}

function InfoCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div
      className="
        rounded-[26px]
        border border-[#E7D8C6]
        bg-white
        p-5
        shadow-[0_14px_40px_rgba(60,43,25,0.06)]
      "
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-black text-[#3A2A1C]">{title}</div>
        <div className="text-[#B97821]">{icon}</div>
      </div>

      <div className="text-3xl font-black text-[#B97821]">{value}</div>
    </div>
  );
}

function MiniDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#FFF9EF] px-4 py-3">
      <div className="text-xs font-black text-[#8A7867]">{label}</div>
      <div className="mt-1 font-black text-[#3A2A1C]">{value}</div>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`
        rounded-2xl
        border
        px-4 py-3
        ${
          highlight
            ? "border-[#E8C98D] bg-[#FFF2D8]"
            : "border-[#EFE2D1] bg-white"
        }
      `}
    >
      <div className="text-xs font-black text-[#8A7867]">{label}</div>
      <div className="mt-1 text-xl font-black text-[#B97821]">{value}</div>
    </div>
  );
}

function RoleBadge({ role }: { role: AdminRole }) {
  return (
    <span
      className="
        inline-flex items-center gap-1
        rounded-full
        bg-[#F6F1EA]
        px-3 py-1
        text-xs font-black
        text-[#6B5A48]
      "
    >
      <UserRound size={13} />
      {getRoleLabel(role)}
    </span>
  );
}

function StatusBadge({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        rounded-full
        px-3 py-1
        text-xs font-black
        ${
          active
            ? "bg-[#EAF8EF] text-[#1F9A55]"
            : "bg-[#F6F1EA] text-[#7B6754]"
        }
      `}
    >
      {active && <CheckCircle2 size={13} />}
      {children}
    </span>
  );
}


function UserActionsDropdown({
  user,
  open,
  onToggle,
  onClose,
  onEventSchedule,
  onEdit,
  onUpgrade,
  onImpersonate,
  onDelete,
  isImpersonating,
  fullWidth = false,
}: {
  user: AdminUser;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEventSchedule: () => void;
  onEdit: () => void;
  onUpgrade: () => void;
  onImpersonate: () => void;
  onDelete: () => void;
  isImpersonating?: boolean;
  fullWidth?: boolean;
}) {
  function runAction(action: () => void) {
    onClose();
    action();
  }

  return (
    <div
      className={`relative ${
  fullWidth ? "w-full" : "w-full sm:w-[190px]"
}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="
          inline-flex h-10 w-full items-center justify-center gap-2
          rounded-full
          bg-[#24190F]
          px-4
          text-sm font-black
          text-white
          shadow-[0_10px_24px_rgba(36,25,15,0.18)]
          transition
          hover:bg-black
        "
      >
        פעולות
        <ChevronDown
          size={16}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="
            mt-2
            w-full
            min-w-0
            overflow-hidden
            rounded-2xl
            border border-[#E7D8C6]
            bg-white
            shadow-[0_18px_45px_rgba(36,25,15,0.16)]
            sm:absolute sm:left-0 sm:top-[calc(100%+8px)] sm:z-50 sm:mt-0 sm:min-w-[210px]
          "
        >
          {user.role !== "admin" && (
  <DropdownAction
    icon={
      isImpersonating ? (
        <Loader2 className="animate-spin" size={16} />
      ) : (
        <LogIn size={16} />
      )
    }
    label="התחזות"
    tone="blue"
    onClick={() => runAction(onImpersonate)}
  />
)}

<DropdownAction
  icon={<Pencil size={16} />}
  label="עריכה"
  onClick={() => runAction(onEdit)}
/>

<DropdownAction
  icon={<ArrowUpCircle size={16} />}
  label="שדרוג"
  tone="gold"
  onClick={() => runAction(onUpgrade)}
/>

<DropdownAction
  icon={<CalendarDays size={16} />}
  label='לו"ז אירוע'
  onClick={() => runAction(onEventSchedule)}
/>

{user.role !== "admin" && (
  <DropdownAction
    icon={<Trash2 size={16} />}
    label="מחק"
    tone="red"
    onClick={() => runAction(onDelete)}
  />
)}

        </div>
      )}
    </div>
  );
}

function DropdownAction({
  icon,
  label,
  onClick,
  tone = "dark",
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "dark" | "blue" | "red" | "gold";
}) {
  const tones = {
    dark: "text-[#2F3742] hover:bg-[#FFF9EF]",
    blue: "text-[#2563EB] hover:bg-blue-50",
    red: "text-red-600 hover:bg-red-50",
    gold: "text-[#B97821] hover:bg-[#FFF7E8]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex w-full items-center justify-between gap-3
        px-4 py-3
        text-right
        text-sm font-black
        transition
        ${tones[tone]}
      `}
    >
      <span>{label}</span>
      {icon}
    </button>
  );
}

function ActionButton({
  children,
  icon,
  tone = "dark",
  onClick,
}: {
  children: ReactNode;
  icon: ReactNode;
  tone?: "dark" | "blue" | "red" | "gold";
  onClick: () => void;
}) {
  const tones = {
    dark: "bg-[#2F3742] text-white hover:bg-[#1F2630]",
    blue: "bg-[#2563EB] text-white hover:bg-[#1E4FC4]",
    red: "bg-[#E73535] text-white hover:bg-[#C62828]",
    gold: "bg-[#B97821] text-white hover:bg-[#996016]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex h-9 w-full items-center justify-center gap-1.5
        rounded-full
        px-3
        text-xs font-black
        transition
        ${tones[tone]}
      `}
    >
      {icon}
      {children}
    </button>
  );
}