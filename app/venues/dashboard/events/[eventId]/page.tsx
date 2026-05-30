"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import EventMenuTab from "./_components/EventMenuTab";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Edit3,
  Eye,
  FileText,
  FolderOpen,
  Link2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Receipt,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";

type PaymentRowStatus = "paid" | "partial" | "unpaid";

type EventStatus = "active" | "archived";
type EventPaymentStatus = "paid" | "refunded";
type VenueAccessStatus = "none" | "linked" | "disabled";
type SelectionEditMode = "untilDate" | "lockAfterSubmit";

type EventType =
  | "wedding"
  | "bar-mitzvah"
  | "bat-mitzvah"
  | "brit"
  | "brita"
  | "henna"
  | "other";

type EventDashboardData = {
  id: string;
  _id?: string;

  userId?: string;
  producerId?: string;
  assignedStaffIds?: string[];

  venueOwnerId?: string;
  venueHallId?: string;
  venueHallName?: string;
  venueLinkedAt?: string;
  venueAccessStatus?: VenueAccessStatus;

  venueClientUserId?: string;
venueClientInvitationId?: string;
venueClientPackageType?: string;
venueClientPaymentStatus?: string;
venueClientRecordsCount?: number;

  email: string;

  eventType: EventType;
  title: string;

  budgetTotal?: number;
  estimatedGuests?: number | null;
  estimatedGuestCount?: number | null;

  date: string;
  time?: string;

  location?: {
    address?: string;
    lat?: number;
    lng?: number;
  };

  giftCreditUrl?: string;

  maxGuests: number;

  paymentStatus: EventPaymentStatus;
  status: EventStatus;

  notes?: string;

  createdAt?: string;
  updatedAt?: string;
};

type EventStats = {
  rsvp: {
    enabled: boolean;
    recordsCount: number;
    confirmedRecords: number;
    declinedRecords: number;
    pendingRecords: number;
    confirmedGuestsAmount: number;
  };

  seating: {
    enabled: boolean;
    totalTables: number;
    seatedGuests: number;
    unseatedGuests: number;
    completed: boolean;
  };

  production: {
    managerName?: string;
    tasksTotal: number;
    tasksDone: number;
  };
};

type VenueHall = {
  id: string;
  name: string;
  subtitle?: string;
  capacity?: number;
  status?: string;
  image?: string;
};

type PaymentRow = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: PaymentRowStatus;
  note: string;
};

type TaskRow = {
  id: string;
  title: string;
  dueDate: string;
  status: "done" | "open" | "urgent";
};

type FileRow = {
  id: string;
  title: string;
  type: "pdf" | "image" | "excel";
  date: string;
  size: string;
};

type ActivityRow = {
  id: string;
  title: string;
  date: string;
  description: string;
};

type VenueMenuCategoryRule = {
  id: string;
  name: string;
  minChoices: number;
  maxChoices: number;
  dishesCount: number;
};

type VenueMenuTemplate = {
  id: string;
  _id?: string;
  name: string;
  type?: string;
  categories: number;
  dishes: number;
  status: "active" | "draft";
  description: string;
  categoryRules: VenueMenuCategoryRule[];
};

type AssignedMenuCategoryOverride = VenueMenuCategoryRule & {
  originalMinChoices: number;
  originalMaxChoices: number;
  eventMinChoices: number;
  eventMaxChoices: number;
  eventNote: string;
};

type KitchenReportStatus = "draft" | "submitted";

type KitchenReportDish = {
  id: string;
  dishId?: string;
  categoryId?: string;
  categoryTitle: string;
  dishName: string;
  plannedQuantity: number;
  actualServedQuantity: number;
  notes: string;
};

type KitchenSpecialNoteType =
  | "allergy"
  | "kosher"
  | "vegetarian"
  | "vegan"
  | "gluten_free"
  | "kids"
  | "other";

type KitchenSpecialNote = {
  id: string;
  type: KitchenSpecialNoteType;
  title: string;
  quantity: number;
  notes: string;
};

type AssignedMenu = {
  id: string;
  templateId: string;
  name: string;
  publicToken?: string;
  publicLink?: string;
  eventNote?: string;

  /*
    הגדרת עריכה לבעל האירוע בלבד.
    האולם עצמו תמיד יכול לערוך ולעדכן מתוך הדשבורד.
  */
  selectionEditMode?: SelectionEditMode;
  selectionEditableUntil?: string | null;
  lockedAt?: string | null;
  lockedReason?: string;

  sentToCouple: boolean;
  coupleSelected: boolean;
  approved: boolean;
  selectedAt?: string;
  submittedAt?: string;
  updatedAt?: string;

  selectedDishes?: {
    categoryId: string;
    categoryTitle: string;
    dishId: string;
    dishName: string;
  }[];

  customerNote?: string;
  submittedByName?: string;
  submittedByPhone?: string;

  kitchenReportStatus?: KitchenReportStatus;
  kitchenReportUpdatedAt?: string;
  kitchenReportSubmittedAt?: string;
  kitchenGeneralNotes?: string;
  kitchenDishes?: KitchenReportDish[];
  kitchenSpecialNotes?: KitchenSpecialNote[];

  categoryOverrides: AssignedMenuCategoryOverride[];
};

type MenuSmsState = {
  phone: string;
  message: string;
};

type VenueSeatingTemplateRow = {
  id: string;
  name: string;
  description?: string;
  tablesCount: number;
  createdAt?: string;
};

type ClientInviteState = {
  registrationLink: string;
  copyText: string;
};

type EventEditForm = {
  title: string;
  eventType: EventType;
  date: string;
  time: string;
  estimatedGuests: string;
  budgetTotal: string;
  venueHallId: string;
  venueHallName: string;
  notes: string;
};

const emptyStats: EventStats = {
  rsvp: {
    enabled: false,
    recordsCount: 0,
    confirmedRecords: 0,
    declinedRecords: 0,
    pendingRecords: 0,
    confirmedGuestsAmount: 0,
  },
  seating: {
    enabled: false,
    totalTables: 0,
    seatedGuests: 0,
    unseatedGuests: 0,
    completed: false,
  },
  production: {
    managerName: "",
    tasksTotal: 0,
    tasksDone: 0,
  },
};

const fallbackVenueMenuTemplates: VenueMenuTemplate[] = [];

function normalizeMenuTemplate(raw: any): VenueMenuTemplate {
  const rawCategories = Array.isArray(raw?.categories)
    ? raw.categories
    : Array.isArray(raw?.sections)
      ? raw.sections
      : [];

  const categoryRules = rawCategories.map((category: any, index: number) => {
    const dishes = Array.isArray(category?.dishes)
      ? category.dishes
      : Array.isArray(category?.items)
        ? category.items
        : [];

    return {
      id: String(category?._id || category?.id || `category-${index + 1}`),
      name: String(category?.name || category?.title || `קטגוריה ${index + 1}`),
      minChoices: toNumber(category?.minChoices ?? category?.minSelection ?? category?.requiredChoices, 1),
      maxChoices: toNumber(category?.maxChoices ?? category?.maxSelection ?? category?.chooseCount, 1),
      dishesCount: dishes.length || toNumber(category?.dishesCount, 0),
    };
  });

  const dishesCountFromCategories = categoryRules.reduce(
  (sum: number, category: VenueMenuCategoryRule) =>
    sum + toNumber(category.dishesCount, 0),
  0
);

  return {
    id: String(raw?._id || raw?.id || ""),
    _id: raw?._id ? String(raw._id) : undefined,
    name: String(raw?.name || raw?.title || "תפריט ללא שם"),
    type: raw?.type ? String(raw.type) : raw?.eventType ? String(raw.eventType) : "",
    categories: categoryRules.length || toNumber(raw?.categoriesCount, 0),
    dishes: dishesCountFromCategories || toNumber(raw?.dishesCount ?? raw?.dishes, 0),
    status: raw?.status === "draft" ? "draft" : "active",
    description: String(raw?.description || raw?.notes || ""),
    categoryRules,
  };
}

function normalizeKitchenDishes(raw: any): KitchenReportDish[] {
  const rows = Array.isArray(raw) ? raw : [];

  return rows.map((item: any, index: number) => ({
    id: String(item?.id || item?._id || item?.dishId || `kitchen-dish-${index + 1}`),
    dishId: item?.dishId ? String(item.dishId) : "",
    categoryId: item?.categoryId ? String(item.categoryId) : "",
    categoryTitle: String(item?.categoryTitle || item?.categoryName || "כללי"),
    dishName: String(item?.dishName || item?.name || "מנה ללא שם"),
    plannedQuantity: toNumber(item?.plannedQuantity, 0),
    actualServedQuantity: toNumber(item?.actualServedQuantity, 0),
    notes: String(item?.notes || ""),
  }));
}

function normalizeKitchenSpecialNotes(raw: any): KitchenSpecialNote[] {
  const rows = Array.isArray(raw) ? raw : [];

  return rows.map((item: any, index: number) => {
    const type = String(item?.type || "other");
    const validType: KitchenSpecialNoteType = [
      "allergy",
      "kosher",
      "vegetarian",
      "vegan",
      "gluten_free",
      "kids",
      "other",
    ].includes(type)
      ? (type as KitchenSpecialNoteType)
      : "other";

    return {
      id: String(item?.id || item?._id || `special-note-${index + 1}`),
      type: validType,
      title: String(item?.title || ""),
      quantity: toNumber(item?.quantity, 0),
      notes: String(item?.notes || ""),
    };
  });
}

function buildKitchenDishesFromSelectedMenu(menu: AssignedMenu | null): KitchenReportDish[] {
  if (!menu) return [];

  const existing = normalizeKitchenDishes(menu.kitchenDishes);
  if (existing.length) return existing;

  const selectedDishes = Array.isArray(menu.selectedDishes) ? menu.selectedDishes : [];

  if (selectedDishes.length) {
    return selectedDishes.map((dish, index) => ({
      id: `${dish.categoryId || "category"}-${dish.dishId || index}`,
      dishId: dish.dishId,
      categoryId: dish.categoryId,
      categoryTitle: dish.categoryTitle || "כללי",
      dishName: dish.dishName || "מנה ללא שם",
      plannedQuantity: 0,
      actualServedQuantity: 0,
      notes: "",
    }));
  }

  return menu.categoryOverrides.map((category, index) => ({
    id: `category-report-${category.id || index}`,
    dishId: "",
    categoryId: category.id,
    categoryTitle: category.name,
    dishName: category.name,
    plannedQuantity: 0,
    actualServedQuantity: 0,
    notes: "",
  }));
}

function kitchenSpecialTypeLabel(type: KitchenSpecialNoteType) {
  if (type === "allergy") return "אלרגיה / רגישות";
  if (type === "kosher") return "כשרות";
  if (type === "vegetarian") return "צמחוני";
  if (type === "vegan") return "טבעוני";
  if (type === "gluten_free") return "ללא גלוטן";
  if (type === "kids") return "ילדים";
  return "אחר";
}

function normalizeAssignedMenu(raw: any): AssignedMenu | null {
  if (!raw) return null;

  const rawOverrides = Array.isArray(raw?.categoryOverrides)
    ? raw.categoryOverrides
    : Array.isArray(raw?.selectionRules)
      ? raw.selectionRules
      : [];

  return {
    id: String(raw?._id || raw?.id || ""),
    templateId: String(raw?.templateId || raw?.menuTemplateId || raw?.sourceMenuId || ""),
    name: String(raw?.name || raw?.menuName || "תפריט אירוע"),
    publicToken: raw?.publicToken
      ? String(raw.publicToken)
      : raw?.token
        ? String(raw.token)
        : raw?.selectionToken
          ? String(raw.selectionToken)
          : undefined,
    publicLink: raw?.publicLink ? String(raw.publicLink) : raw?.selectionLink ? String(raw.selectionLink) : undefined,
    eventNote: String(raw?.eventNote || raw?.note || ""),

    selectionEditMode:
      raw?.selectionEditMode === "lockAfterSubmit" ? "lockAfterSubmit" : "untilDate",
    selectionEditableUntil: raw?.selectionEditableUntil
      ? String(raw.selectionEditableUntil)
      : null,
    lockedAt: raw?.lockedAt ? String(raw.lockedAt) : null,
    lockedReason: String(raw?.lockedReason || ""),

    sentToCouple: Boolean(raw?.sentToCouple || raw?.smsSentAt || raw?.sentAt),
    coupleSelected: Boolean(
      raw?.coupleSelected ||
        raw?.submittedAt ||
        raw?.selectedAt ||
        (Array.isArray(raw?.selectedDishes) && raw.selectedDishes.length > 0)
    ),
    approved: Boolean(raw?.approved || raw?.approvedAt),
    selectedAt: raw?.selectedAt ? String(raw.selectedAt) : undefined,
    submittedAt: raw?.submittedAt ? String(raw.submittedAt) : undefined,
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,

    selectedDishes: Array.isArray(raw?.selectedDishes)
      ? raw.selectedDishes.map((item: any) => ({
          categoryId: String(item?.categoryId || ""),
          categoryTitle: String(item?.categoryTitle || ""),
          dishId: String(item?.dishId || ""),
          dishName: String(item?.dishName || ""),
        }))
      : [],

    customerNote: String(raw?.customerNote || ""),
    submittedByName: String(raw?.submittedByName || ""),
    submittedByPhone: String(raw?.submittedByPhone || ""),

    kitchenReportStatus:
      raw?.kitchenReportStatus === "submitted" ? "submitted" : "draft",
    kitchenReportUpdatedAt: raw?.kitchenReportUpdatedAt
      ? String(raw.kitchenReportUpdatedAt)
      : undefined,
    kitchenReportSubmittedAt: raw?.kitchenReportSubmittedAt
      ? String(raw.kitchenReportSubmittedAt)
      : undefined,
    kitchenGeneralNotes: String(raw?.kitchenGeneralNotes || ""),
    kitchenDishes: normalizeKitchenDishes(raw?.kitchenDishes),
    kitchenSpecialNotes: normalizeKitchenSpecialNotes(raw?.kitchenSpecialNotes),

    categoryOverrides: rawOverrides.map((category: any, index: number) => ({
      id: String(category?._id || category?.id || `category-${index + 1}`),
      name: String(category?.name || category?.title || `קטגוריה ${index + 1}`),
      minChoices: toNumber(category?.minChoices ?? category?.originalMinChoices, 1),
      maxChoices: toNumber(category?.maxChoices ?? category?.originalMaxChoices, 1),
      dishesCount: toNumber(category?.dishesCount, 0),
      originalMinChoices: toNumber(category?.originalMinChoices ?? category?.minChoices, 1),
      originalMaxChoices: toNumber(category?.originalMaxChoices ?? category?.maxChoices, 1),
      eventMinChoices: toNumber(category?.eventMinChoices ?? category?.minChoices, 1),
      eventMaxChoices: toNumber(category?.eventMaxChoices ?? category?.maxChoices, 1),
      eventNote: String(category?.eventNote || ""),
    })),
  };
}

function buildAssignedMenuFromTemplate(
  template: VenueMenuTemplate,
  eventNote = ""
): AssignedMenu {
  return {
    id: `event-menu-${Date.now()}`,
    templateId: template.id,
    name: template.name,
    eventNote,
    selectionEditMode: "untilDate",
    selectionEditableUntil: null,
    lockedAt: null,
    lockedReason: "",
    sentToCouple: false,
    coupleSelected: false,
    approved: false,
    selectedDishes: [],
    customerNote: "",
    submittedByName: "",
    submittedByPhone: "",
    kitchenReportStatus: "draft",
    kitchenReportUpdatedAt: "",
    kitchenReportSubmittedAt: "",
    kitchenGeneralNotes: "",
    kitchenDishes: [],
    kitchenSpecialNotes: [],
    categoryOverrides: template.categoryRules.map((category) => ({
      ...category,
      originalMinChoices: category.minChoices,
      originalMaxChoices: category.maxChoices,
      eventMinChoices: category.minChoices,
      eventMaxChoices: category.maxChoices,
      eventNote: "",
    })),
  };
}


function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(value?: string) {
  if (!value) return "לא הוגדר";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function formatDateTime(value?: string) {
  if (!value) return "לא הוגדר";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function eventStatusLabel(status?: EventStatus) {
  if (status === "active") return "פעיל";
  if (status === "archived") return "בארכיון";
  return "פעיל";
}

function eventStatusTone(status?: EventStatus): "green" | "amber" | "rose" | "gray" | "gold" {
  if (status === "archived") return "gray";
  return "green";
}

function eventTypeLabel(type?: EventType | string) {
  if (type === "wedding") return "חתונה";
  if (type === "bar-mitzvah") return "בר מצווה";
  if (type === "bat-mitzvah") return "בת מצווה";
  if (type === "brit") return "ברית";
  if (type === "brita") return "בריתה";
  if (type === "henna") return "חינה";
  if (type === "other") return "אחר";
  return type || "לא הוגדר";
}

function paymentStatusLabel(status: PaymentRowStatus) {
  if (status === "paid") return "שולם";
  if (status === "partial") return "חלקי";
  return "פתוח";
}

function paymentStatusClass(status: PaymentRowStatus) {
  if (status === "paid") return "bg-emerald-50 text-emerald-700";
  if (status === "partial") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function taskStatusClass(status: TaskRow["status"]) {
  if (status === "done") return "bg-emerald-50 text-emerald-700";
  if (status === "urgent") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function taskStatusLabel(status: TaskRow["status"]) {
  if (status === "done") return "בוצע";
  if (status === "urgent") return "דחוף";
  return "פתוח";
}

export default function VenueEventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId || "";

  const [eventData, setEventData] = useState<EventDashboardData | null>(null);
  const [eventStats, setEventStats] = useState<EventStats>(emptyStats);
  const [hallData, setHallData] = useState<VenueHall | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingEvent, setSavingEvent] = useState(false);
  const [serverError, setServerError] = useState("");

  const [activeTab, setActiveTab] = useState("overview");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [menuSelectOpen, setMenuSelectOpen] = useState(false);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [assignedMenu, setAssignedMenu] = useState<AssignedMenu | null>(null);
  const [venueMenuTemplates, setVenueMenuTemplates] =
    useState<VenueMenuTemplate[]>(fallbackVenueMenuTemplates);
  const [menusLoading, setMenusLoading] = useState(false);
  const [menuSaving, setMenuSaving] = useState(false);
  const [menuSendingSms, setMenuSendingSms] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [selectedMenuDraft, setSelectedMenuDraft] =
    useState<AssignedMenu | null>(null);
  const [menuSms, setMenuSms] = useState<MenuSmsState>({
    phone: "",
    message: "",
  });

  const [seatingTemplates, setSeatingTemplates] = useState<VenueSeatingTemplateRow[]>([]);
  const [selectedSeatingTemplateId, setSelectedSeatingTemplateId] = useState("");
  const [clientInviteLoading, setClientInviteLoading] = useState(false);
  const [clientInviteError, setClientInviteError] = useState("");
  const [clientInvite, setClientInvite] = useState<ClientInviteState | null>(null);

  const hallId = eventData?.venueHallId || "";
  const hallName = hallData?.name || eventData?.venueHallName || "אולם";
  const clientName = eventData?.email || "לא הוגדר";
  const eventTitle = eventData?.title || "אירוע ללא שם";

  const guestsCount =
    eventStats.rsvp.enabled && eventStats.rsvp.confirmedGuestsAmount > 0
      ? eventStats.rsvp.confirmedGuestsAmount
      : eventData?.estimatedGuestCount ||
        eventData?.estimatedGuests ||
        eventData?.maxGuests ||
        0;

  const fetchEvent = async () => {
    if (!eventId) return;

    setLoading(true);
    setServerError("");

    try {
      const res = await fetch(`/api/venues/dashboard/events/${eventId}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינת פרטי האירוע נכשלה");
      }

      setEventData(data.event || null);
      setHallData(data.hall || null);
      setEventStats(data.stats || emptyStats);
    } catch (error) {
      console.error("GET event details failed:", error);
      setServerError(
        error instanceof Error ? error.message : "טעינת פרטי האירוע נכשלה"
      );
      setEventData(null);
      setHallData(null);
      setEventStats(emptyStats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  fetchEvent();

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [eventId]);


  useEffect(() => {
    if (!hallId) {
      setSeatingTemplates([]);
      setSelectedSeatingTemplateId("");
      return;
    }

    let cancelled = false;

    async function fetchSeatingTemplates() {
      try {
        const res = await fetch(
          `/api/venues/dashboard/seating-templates?hallId=${encodeURIComponent(hallId)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || data?.error || "טעינת תבניות ההושבה נכשלה");
        }

        const templates = Array.isArray(data?.templates)
          ? data.templates.map((template: any) => ({
              id: String(template._id || template.id || ""),
              name: String(template.name || "תבנית ללא שם"),
              description: String(template.description || ""),
              tablesCount: Array.isArray(template.tables) ? template.tables.length : 0,
              createdAt: template.createdAt ? String(template.createdAt) : "",
            }))
          : [];

        if (cancelled) return;

        setSeatingTemplates(templates);

        if (!selectedSeatingTemplateId && templates[0]?.id) {
          setSelectedSeatingTemplateId(templates[0].id);
        }
      } catch (error) {
        console.error("GET seating templates failed:", error);

        if (!cancelled) {
          setSeatingTemplates([]);
        }
      }
    }

    fetchSeatingTemplates();

    return () => {
      cancelled = true;
    };
  }, [hallId, selectedSeatingTemplateId]);

  useEffect(() => {
    if (!hallId) {
      setVenueMenuTemplates([]);
      return;
    }

    let cancelled = false;

    async function fetchVenueMenus() {
      setMenusLoading(true);
      setMenuError("");

      try {
        const res = await fetch(
          `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/menus`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || data?.error || "טעינת תפריטי האולם נכשלה");
        }

        const rawMenus = Array.isArray(data?.menus)
          ? data.menus
          : Array.isArray(data?.templates)
            ? data.templates
            : Array.isArray(data)
              ? data
              : [];

        const activeMenus = rawMenus
          .map(normalizeMenuTemplate)
          .filter((menu: VenueMenuTemplate) => menu.id && menu.status === "active");

        if (!cancelled) {
          setVenueMenuTemplates(activeMenus);
        }
      } catch (error) {
        console.error("GET venue menus failed:", error);

        if (!cancelled) {
          setVenueMenuTemplates([]);
          setMenuError(error instanceof Error ? error.message : "טעינת תפריטי האולם נכשלה");
        }
      } finally {
        if (!cancelled) {
          setMenusLoading(false);
        }
      }
    }

    fetchVenueMenus();

    return () => {
      cancelled = true;
    };
  }, [hallId]);

  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;

    async function fetchAssignedEventMenu() {
      try {
        const res = await fetch(
          `/api/venues/dashboard/events/${encodeURIComponent(eventId)}/menu`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await res.json().catch(() => ({}));

        if (res.status === 404) {
          if (!cancelled) setAssignedMenu(null);
          return;
        }

        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || data?.error || "טעינת תפריט האירוע נכשלה");
        }

        const menu = normalizeAssignedMenu(data?.eventMenu || data?.menu || data?.assignedMenu);

        if (!cancelled) {
          setAssignedMenu(menu);
        }
      } catch (error) {
        console.error("GET assigned event menu failed:", error);
      }
    }

    fetchAssignedEventMenu();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const financial = useMemo(() => {
    const commitment = toNumber(eventData?.budgetTotal, 0);
    const totalPaid = eventData?.paymentStatus === "paid" ? commitment : 0;
    const estimatedBalance = Math.max(0, commitment - totalPaid);
    const paidPercentage =
      commitment > 0 ? Math.round((totalPaid / commitment) * 100) : 0;

    return {
      commitment,
      deposit: totalPaid,
      totalPaid,
      estimatedBalance,
      nextPayment: estimatedBalance,
      expectedAfterEvent: estimatedBalance,
      paidPercentage,
    };
  }, [eventData]);

  const payments = useMemo<PaymentRow[]>(() => {
    if (!eventData) return [];

    const rows: PaymentRow[] = [];

    if (financial.commitment > 0) {
      rows.push({
        id: "event-payment",
        title:
          eventData.paymentStatus === "paid"
            ? "תשלום אירוע שולם"
            : "תשלום אירוע הוחזר",
        amount: financial.commitment,
        dueDate: formatDate(eventData.date),
        status: eventData.paymentStatus === "paid" ? "paid" : "unpaid",
        note:
          eventData.paymentStatus === "paid"
            ? "לפי סטטוס התשלום באירוע"
            : "הסטטוס במערכת הוא refunded",
      });
    }

    return rows;
  }, [eventData, financial]);

  const tasks = useMemo<TaskRow[]>(() => {
    const total = eventStats.production.tasksTotal || 0;
    const done = eventStats.production.tasksDone || 0;
    const open = Math.max(0, total - done);

    if (!total) return [];

    return [
      {
        id: "production-tasks",
        title: `משימות הפקה פתוחות: ${open}`,
        dueDate: "מתוך מערכת ניהול האירוע",
        status: open === 0 ? "done" : "open",
      },
    ];
  }, [eventStats]);

  const files = useMemo<FileRow[]>(() => {
    return [];
  }, []);

  const activities = useMemo<ActivityRow[]>(() => {
    if (!eventData) return [];

    const rows: ActivityRow[] = [];

    if (eventData.createdAt) {
      rows.push({
        id: "created",
        title: "אירוע נוצר במערכת",
        date: formatDateTime(eventData.createdAt),
        description: "האירוע נשמר במודל Event של Invistimo.",
      });
    }

    if (eventData.venueLinkedAt) {
      rows.push({
        id: "venue-linked",
        title: "האירוע שויך לאולם",
        date: formatDateTime(eventData.venueLinkedAt),
        description: `האירוע שויך לאולם ${hallName}.`,
      });
    }

    if (eventData.updatedAt && eventData.updatedAt !== eventData.createdAt) {
      rows.push({
        id: "updated",
        title: "אירוע עודכן",
        date: formatDateTime(eventData.updatedAt),
        description: "פרטי האירוע עודכנו לאחרונה.",
      });
    }

    return rows;
  }, [eventData, hallName]);

  const progress = useMemo(() => {
    const paymentProgress =
      financial.commitment > 0 ? Math.min(100, financial.paidPercentage) : 0;

    const seatingProgress = eventStats.seating.enabled
      ? eventStats.seating.completed
        ? 100
        : eventStats.seating.seatedGuests > 0 && guestsCount > 0
          ? Math.min(99, Math.round((eventStats.seating.seatedGuests / guestsCount) * 100))
          : 25
      : 0;

    const menuProgress = assignedMenu ? 65 : 0;

    const productionProgress =
      eventStats.production.tasksTotal > 0
        ? Math.round(
            (eventStats.production.tasksDone / eventStats.production.tasksTotal) * 100
          )
        : eventData?.status === "active"
          ? 35
          : 0;

    const total = Math.round(
      (paymentProgress + seatingProgress + menuProgress + productionProgress) / 4
    );

    return {
      payments: paymentProgress,
      seating: seatingProgress,
      menu: menuProgress,
      production: productionProgress,
      total,
    };
  }, [assignedMenu, eventData, eventStats, financial, guestsCount]);

  const chooseMenuForEvent = (template: VenueMenuTemplate) => {
    setSelectedMenuDraft(buildAssignedMenuFromTemplate(template));
  };

  const updateSelectedMenuDraftCategory = (
    categoryId: string,
    field: "eventChoices" | "eventNote",
    value: string
  ) => {
    setSelectedMenuDraft((current) => {
      if (!current) return current;

      return {
        ...current,
        categoryOverrides: current.categoryOverrides.map((category) => {
          if (category.id !== categoryId) return category;

          if (field === "eventNote") {
            return { ...category, eventNote: value };
          }

          const parsed = Math.max(0, toNumber(value, 0));

          return {
            ...category,
            eventMinChoices: parsed,
            eventMaxChoices: parsed,
          };
        }),
      };
    });
  };

  const updateSelectedMenuDraftPolicy = (
    patch: Partial<Pick<AssignedMenu, "selectionEditMode" | "selectionEditableUntil">>
  ) => {
    setSelectedMenuDraft((current) => {
      if (!current) return current;

      const nextSelectionEditMode =
        patch.selectionEditMode || current.selectionEditMode || "untilDate";

      return {
        ...current,
        ...patch,
        selectionEditMode: nextSelectionEditMode,
        selectionEditableUntil:
          nextSelectionEditMode === "lockAfterSubmit"
            ? null
            : patch.selectionEditableUntil !== undefined
              ? patch.selectionEditableUntil
              : current.selectionEditableUntil || null,
      };
    });
  };

  const saveSelectedMenuForEvent = async () => {
    if (!eventId || !selectedMenuDraft) return;

    setMenuSaving(true);
    setMenuError("");

    try {
      const invalidCategory = selectedMenuDraft.categoryOverrides.find(
        (category) => category.eventMaxChoices < category.eventMinChoices
      );

      if (invalidCategory) {
        throw new Error(`בקטגוריה ${invalidCategory.name} כמות הבחירה לא תקינה`);
      }

      const res = await fetch(
        `/api/venues/dashboard/events/${encodeURIComponent(eventId)}/menu`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            hallId,
            templateId: selectedMenuDraft.templateId,
            eventNote: selectedMenuDraft.eventNote || "",
            selectionEditMode: selectedMenuDraft.selectionEditMode || "untilDate",
            selectionEditableUntil: selectedMenuDraft.selectionEditableUntil || null,
            kitchenReportStatus: selectedMenuDraft.kitchenReportStatus || "draft",
            kitchenReportUpdatedAt: selectedMenuDraft.kitchenReportUpdatedAt || "",
            kitchenReportSubmittedAt: selectedMenuDraft.kitchenReportSubmittedAt || "",
            kitchenGeneralNotes: selectedMenuDraft.kitchenGeneralNotes || "",
            kitchenDishes: selectedMenuDraft.kitchenDishes || [],
            kitchenSpecialNotes: selectedMenuDraft.kitchenSpecialNotes || [],
            categoryOverrides: selectedMenuDraft.categoryOverrides.map((category) => ({
              categoryId: category.id,
              name: category.name,
              originalMinChoices: category.originalMinChoices,
              originalMaxChoices: category.originalMaxChoices,
              eventMinChoices: category.eventMinChoices,
              eventMaxChoices: category.eventMaxChoices,
              eventNote: category.eventNote,
            })),
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "שמירת התפריט לאירוע נכשלה");
      }

      const savedMenu =
        normalizeAssignedMenu(data?.eventMenu || data?.menu || data?.assignedMenu) ||
        selectedMenuDraft;

      setAssignedMenu(savedMenu);
      setSelectedMenuDraft(null);
      setMenuSelectOpen(false);
      setActiveTab("menu");
    } catch (error) {
      console.error("POST event menu failed:", error);
      setMenuError(error instanceof Error ? error.message : "שמירת התפריט לאירוע נכשלה");
    } finally {
      setMenuSaving(false);
    }
  };

  const updateAssignedMenuCategory = (
    categoryId: string,
    field: "eventChoices" | "eventNote",
    value: string
  ) => {
    setAssignedMenu((current) => {
      if (!current) return current;

      return {
        ...current,
        categoryOverrides: current.categoryOverrides.map((category) => {
          if (category.id !== categoryId) return category;

          if (field === "eventNote") {
            return { ...category, eventNote: value };
          }

          const parsed = Math.max(0, toNumber(value, 0));

          return {
            ...category,
            eventMinChoices: parsed,
            eventMaxChoices: parsed,
          };
        }),
      };
    });
  };

  const updateAssignedMenuPolicy = (
    patch: Partial<Pick<AssignedMenu, "selectionEditMode" | "selectionEditableUntil">>
  ) => {
    setAssignedMenu((current) => {
      if (!current) return current;

      const nextSelectionEditMode =
        patch.selectionEditMode || current.selectionEditMode || "untilDate";

      return {
        ...current,
        ...patch,
        selectionEditMode: nextSelectionEditMode,
        selectionEditableUntil:
          nextSelectionEditMode === "lockAfterSubmit"
            ? null
            : patch.selectionEditableUntil !== undefined
              ? patch.selectionEditableUntil
              : current.selectionEditableUntil || null,
      };
    });
  };

  const saveAssignedMenuChanges = async () => {
    if (!eventId || !assignedMenu) return;

    setMenuSaving(true);
    setMenuError("");

    try {
      const invalidCategory = assignedMenu.categoryOverrides.find(
        (category) => category.eventMaxChoices < category.eventMinChoices
      );

      if (invalidCategory) {
        throw new Error(`בקטגוריה ${invalidCategory.name} כמות הבחירה לא תקינה`);
      }

      const res = await fetch(
        `/api/venues/dashboard/events/${encodeURIComponent(eventId)}/menu`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            eventNote: assignedMenu.eventNote || "",
            selectionEditMode: assignedMenu.selectionEditMode || "untilDate",
            selectionEditableUntil: assignedMenu.selectionEditableUntil || null,
            kitchenReportStatus: assignedMenu.kitchenReportStatus || "draft",
            kitchenReportUpdatedAt: assignedMenu.kitchenReportUpdatedAt || "",
            kitchenReportSubmittedAt: assignedMenu.kitchenReportSubmittedAt || "",
            kitchenGeneralNotes: assignedMenu.kitchenGeneralNotes || "",
            kitchenDishes: assignedMenu.kitchenDishes || [],
            kitchenSpecialNotes: assignedMenu.kitchenSpecialNotes || [],
            categoryOverrides: assignedMenu.categoryOverrides.map((category) => ({
              categoryId: category.id,
              name: category.name,
              originalMinChoices: category.originalMinChoices,
              originalMaxChoices: category.originalMaxChoices,
              eventMinChoices: category.eventMinChoices,
              eventMaxChoices: category.eventMaxChoices,
              eventNote: category.eventNote,
            })),
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "עדכון תפריט האירוע נכשל");
      }

      const updatedMenu =
        normalizeAssignedMenu(data?.eventMenu || data?.menu || data?.assignedMenu) ||
        assignedMenu;

      setAssignedMenu(updatedMenu);
      alert("תפריט האירוע עודכן");
    } catch (error) {
      console.error("PATCH event menu failed:", error);
      setMenuError(error instanceof Error ? error.message : "עדכון תפריט האירוע נכשל");
    } finally {
      setMenuSaving(false);
    }
  };

  const saveKitchenReportChanges = async (
    payload: Pick<
      AssignedMenu,
      | "kitchenReportStatus"
      | "kitchenGeneralNotes"
      | "kitchenDishes"
      | "kitchenSpecialNotes"
    >
  ) => {
    if (!eventId || !assignedMenu) return;

    setMenuSaving(true);
    setMenuError("");

    try {
      const now = new Date().toISOString();

      const nextMenu: AssignedMenu = {
        ...assignedMenu,
        kitchenReportStatus: payload.kitchenReportStatus || "draft",
        kitchenGeneralNotes: payload.kitchenGeneralNotes || "",
        kitchenDishes: payload.kitchenDishes || [],
        kitchenSpecialNotes: payload.kitchenSpecialNotes || [],
        kitchenReportUpdatedAt: now,
        kitchenReportSubmittedAt:
          payload.kitchenReportStatus === "submitted"
            ? now
            : assignedMenu.kitchenReportSubmittedAt || "",
      };

      const res = await fetch(
        `/api/venues/dashboard/events/${encodeURIComponent(eventId)}/menu`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            eventNote: nextMenu.eventNote || "",
            selectionEditMode: nextMenu.selectionEditMode || "untilDate",
            selectionEditableUntil: nextMenu.selectionEditableUntil || null,

            categoryOverrides: nextMenu.categoryOverrides.map((category) => ({
              categoryId: category.id,
              name: category.name,
              originalMinChoices: category.originalMinChoices,
              originalMaxChoices: category.originalMaxChoices,
              eventMinChoices: category.eventMinChoices,
              eventMaxChoices: category.eventMaxChoices,
              eventNote: category.eventNote,
            })),

            kitchenReportStatus: nextMenu.kitchenReportStatus,
            kitchenReportUpdatedAt: nextMenu.kitchenReportUpdatedAt,
            kitchenReportSubmittedAt: nextMenu.kitchenReportSubmittedAt,
            kitchenGeneralNotes: nextMenu.kitchenGeneralNotes,
            kitchenDishes: nextMenu.kitchenDishes,
            kitchenSpecialNotes: nextMenu.kitchenSpecialNotes,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "שמירת דוח המטבח נכשלה");
      }

      const updatedMenu =
        normalizeAssignedMenu(data?.eventMenu || data?.menu || data?.assignedMenu) ||
        nextMenu;

      setAssignedMenu(updatedMenu);
    } catch (error) {
      console.error("PATCH kitchen report failed:", error);
      setMenuError(error instanceof Error ? error.message : "שמירת דוח המטבח נכשלה");
    } finally {
      setMenuSaving(false);
    }
  };

  const openSendMenuSms = () => {
  if (!assignedMenu) return;

  const link =
    assignedMenu.publicLink ||
    `${window.location.origin}/menus/choose/${assignedMenu.publicToken || eventId}`;

  setMenuSms({
    phone: "",
    message: `שלום, מצורף קישור לבחירת מנות לאירוע שלכם ב-Invistimo: ${link}`,
  });

  setSendMenuOpen(true);
};

const sendMenuSmsToCouple = async () => {
  if (!assignedMenu) return;

  if (!menuSms.phone.trim()) {
    alert("חובה להזין מספר טלפון לשליחת SMS");
    return;
  }

  setMenuSendingSms(true);
  setMenuError("");

  try {
    const link =
      assignedMenu.publicLink ||
      `${window.location.origin}/menus/choose/${assignedMenu.publicToken || eventId}`;

    const cleanPhone = menuSms.phone.trim();
    const cleanMessage = menuSms.message.trim();

    const res = await fetch("/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        phone: cleanPhone,
        to: cleanPhone,
        recipient: cleanPhone,
        recipients: [cleanPhone],
        phones: [cleanPhone],

        message: cleanMessage,
        text: cleanMessage,
        content: cleanMessage,

        eventId,
        hallId,
        type: "event_menu_selection",
        selectionLink: link,
        provider: "4free",
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || data?.error || "שליחת ה-SMS נכשלה");
    }

    setAssignedMenu((current) =>
      current
        ? {
            ...current,
            sentToCouple: true,
          }
        : current
    );

    setSendMenuOpen(false);
    alert("הקישור לבחירת מנות נשלח ב-SMS");
  } catch (error) {
    console.error("POST send menu sms failed:", error);
    setMenuError(error instanceof Error ? error.message : "שליחת ה-SMS נכשלה");
  } finally {
    setMenuSendingSms(false);
  }
};

  const updateEvent = async (form: EventEditForm) => {
    if (!eventData) return;

    setSavingEvent(true);
    setServerError("");

    try {
      const res = await fetch(`/api/venues/dashboard/events/${eventData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          eventType: form.eventType,
          date: form.date,
          time: form.time,
          estimatedGuests: toNumber(form.estimatedGuests, 0),
          estimatedGuestCount: toNumber(form.estimatedGuests, 0),
          budgetTotal: toNumber(form.budgetTotal, 0),
          venueHallId: form.venueHallId,
          venueHallName: form.venueHallName,
          notes: form.notes,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "עדכון האירוע נכשל");
      }

      if (data.event) {
        setEventData(data.event);
      } else {
        await fetchEvent();
      }

      if (data.stats) {
        setEventStats(data.stats);
      }

      if (data.hall) {
        setHallData(data.hall);
      }

      setEditOpen(false);
    } catch (error) {
      console.error("PATCH event details failed:", error);
      setServerError(error instanceof Error ? error.message : "עדכון האירוע נכשל");
    } finally {
      setSavingEvent(false);
    }
  };

  const createClientInvite = async () => {
    if (!eventData?.id) {
      alert("לא נמצא מזהה אירוע");
      return;
    }

    if (!selectedSeatingTemplateId) {
      alert("חובה לבחור תבנית הושבה לפני יצירת קישור הרשמה");
      setActiveTab("client-invite");
      return;
    }

    setClientInviteLoading(true);
    setClientInviteError("");

    try {
      const res = await fetch(
        `/api/venues/dashboard/events/${eventData.id}/client-invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            seatingTemplateId: selectedSeatingTemplateId,
            packageType: "seating_only",
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.message || data?.error || "יצירת קישור הרשמה ללקוח נכשלה"
        );
      }

      const registrationLink = String(data?.registrationLink || "");
      const copyText = String(
        data?.copyText ||
          `שלום, האולם פתח עבורך גישה ל-Invistimo לניהול האירוע שלך. להרשמה: ${registrationLink}`
      );

      setClientInvite({
        registrationLink,
        copyText,
      });

      setActiveTab("client-invite");

      if (registrationLink && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(registrationLink).catch(() => undefined);
      }
    } catch (error) {
      console.error("POST client invite failed:", error);
      setClientInviteError(
        error instanceof Error ? error.message : "יצירת קישור הרשמה ללקוח נכשלה"
      );
    } finally {
      setClientInviteLoading(false);
    }
  };

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f8f6f2] p-10 text-[#2b241c]">
        <div className="mx-auto max-w-xl rounded-[28px] border border-[#eadfce] bg-white p-8 text-center shadow-sm">
          <div className="text-lg font-black">טוען פרטי אירוע...</div>
          <div className="mt-2 text-sm font-bold text-[#8a7b68]">
            הנתונים נטענים מהשרת לפי מזהה האירוע.
          </div>
        </div>
      </main>
    );
  }

  if (serverError || !eventData) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f8f6f2] p-10 text-[#2b241c]">
        <div className="mx-auto max-w-xl rounded-[28px] border border-rose-100 bg-white p-8 text-center shadow-sm">
          <div className="text-lg font-black text-rose-700">
            {serverError || "האירוע לא נמצא"}
          </div>

          <Link
            href="/venues/dashboard"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white"
          >
            חזרה לדשבורד
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1820px] px-4 py-5 md:px-7">
        <header className="mb-5 rounded-[32px] border border-[#eadfce] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#9b8a73]">
                <span>אירועים</span>
                <span>›</span>
                <span>{hallName}</span>
                <span>›</span>
                <span>#{eventData.id}</span>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f4ead9] text-[#b98121]">
                  <CalendarDays size={32} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                      {eventTitle}
                    </h1>

                    <span className="rounded-full bg-[#fff4dc] px-3 py-1 text-xs font-black text-[#b98121]">
                      {eventStatusLabel(eventData.status)}
                    </span>

                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-black",
                        eventStats.seating.enabled
                          ? eventStats.seating.completed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      {eventStats.seating.enabled
                        ? eventStats.seating.completed
                          ? "הושבה הושלמה"
                          : "הושבה בתהליך"
                        : "לא הופעלה הושבה"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-bold text-[#7f705d]">
                    <span>{formatDate(eventData.date)}</span>
                    <span>•</span>
                    <span>{eventData.time || "לא הוגדרה שעה"}</span>
                    <span>•</span>
                    <span>{hallName}</span>
                    <span>•</span>
                    <span>{guestsCount} אורחים</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={
                  hallId
                    ? `/venues/dashboard/halls/${hallId}/calendar`
                    : "/venues/dashboard"
                }
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
              >
                <ArrowRight size={17} />
                חזרה ליומן
              </Link>

              <button
                type="button"
                onClick={() => setActionsOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
              >
                <MoreHorizontal size={17} />
                פעולות נוספות
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("client-invite")}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] transition hover:bg-[#f4ead9]"
              >
                <Link2 size={17} />
                פתיחת לקוח Invistimo
              </button>

              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
              >
                <Edit3 size={17} />
                עריכת אירוע
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <HeroMetric
            title="תקציב האירוע"
            value={formatCurrency(financial.commitment)}
            subtitle="budgetTotal מתוך Event"
            icon={<CircleDollarSign size={22} />}
          />

          <HeroMetric
            title="סטטוס תשלום"
            value={eventData.paymentStatus === "paid" ? "שולם" : "הוחזר"}
            subtitle="paymentStatus מתוך Event"
            icon={<WalletCards size={22} />}
            success={eventData.paymentStatus === "paid"}
            danger={eventData.paymentStatus === "refunded"}
          />

          <HeroMetric
            title="אחוז תשלום"
            value={`${financial.paidPercentage}%`}
            subtitle="לפי סטטוס התשלום"
            icon={<CreditCard size={22} />}
          />

          <HeroMetric
            title="אישרו הגעה"
            value={`${eventStats.rsvp.confirmedGuestsAmount || 0}`}
            subtitle={
              eventStats.rsvp.enabled
                ? `${eventStats.rsvp.confirmedRecords} רשומות אישרו`
                : "אישורי הגעה לא הופעלו"
            }
            icon={<UsersRound size={22} />}
            success={eventStats.rsvp.enabled}
          />

          <HeroMetric
            title="הושבו"
            value={`${eventStats.seating.seatedGuests || 0}`}
            subtitle={
              eventStats.seating.enabled
                ? `${eventStats.seating.totalTables} שולחנות`
                : "הושבה לא הופעלה"
            }
            icon={<CalendarDays size={22} />}
            success={eventStats.seating.completed}
          />
        </section>

        <section className="mt-5 rounded-[30px] border border-[#eadfce] bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-6">
            <StatusTile
              label="סטטוס אירוע"
              value={eventStatusLabel(eventData.status)}
              tone={eventStatusTone(eventData.status)}
            />

            <StatusTile
              label="סטטוס הושבה"
              value={
                eventStats.seating.enabled
                  ? eventStats.seating.completed
                    ? "הושלמה"
                    : "בתהליך"
                  : "לא הופעלה"
              }
              tone={
                eventStats.seating.enabled
                  ? eventStats.seating.completed
                    ? "green"
                    : "amber"
                  : "gray"
              }
            />

            <StatusTile
              label="סטטוס תפריט"
              value={assignedMenu ? "תפריט נבחר" : "חסר תפריט"}
              tone={assignedMenu ? "green" : "rose"}
            />

            <StatusTile
              label="סטטוס תשלום"
              value={eventData.paymentStatus === "paid" ? "שולם" : "הוחזר"}
              tone={eventData.paymentStatus === "paid" ? "green" : "rose"}
            />

            <StatusTile
              label="אישורי הגעה"
              value={
                eventStats.rsvp.enabled
                  ? `${eventStats.rsvp.confirmedGuestsAmount} מגיעים`
                  : "לא הופעל"
              }
              tone={eventStats.rsvp.enabled ? "green" : "gray"}
            />

            <StatusTile
              label="מנהל אירוע"
              value={eventStats.production.managerName || "לא הוגדר"}
              tone={eventStats.production.managerName ? "green" : "gold"}
            />
          </div>
        </section>

        <nav className="mt-5 overflow-x-auto rounded-[26px] border border-[#eadfce] bg-white shadow-sm">
          <div className="flex min-w-[1150px]">
            {[
              { id: "overview", label: "סקירה כללית", icon: Sparkles },
              { id: "details", label: "פרטי אירוע", icon: CalendarDays },
              { id: "client", label: "לקוח", icon: UsersRound },
              { id: "client-invite", label: "פתיחת לקוח", icon: Link2 },
              { id: "payments", label: "תשלומים", icon: CreditCard },
              { id: "menu", label: "תפריט", icon: Utensils },
              { id: "seating", label: "הושבה", icon: UsersRound },
              { id: "rsvp", label: "אישורי הגעה", icon: CheckCircle2 },
              { id: "staff", label: "צוות וספקים", icon: ShieldCheck },
              { id: "tasks", label: "משימות", icon: CheckCircle2 },
              { id: "files", label: "קבצים", icon: FolderOpen },
            ].map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "flex h-14 flex-1 items-center justify-center gap-2 border-l border-[#eadfce] px-4 text-sm font-black transition",
                    activeTab === tab.id
                      ? "bg-[#b98121] text-white"
                      : "bg-white text-[#6f6252] hover:bg-[#fbf5ea] hover:text-[#b98121]",
                  ].join(" ")}
                >
                  <Icon size={17} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        <section className="mt-5 grid gap-5 xl:grid-cols-[310px_1fr]">
          <aside className="space-y-5">
            <SideCard title="התקדמות האירוע" icon={<CheckCircle2 size={18} />}>
              <div className="space-y-4">
                {[
                  {
                    label: "יצירת אירוע",
                    date: eventData.createdAt
                      ? formatDateTime(eventData.createdAt)
                      : "בוצע",
                    done: true,
                  },
                  {
                    label: "שיוך לאולם",
                    date:
                      eventData.venueAccessStatus === "linked"
                        ? eventData.venueHallName || hallName
                        : "לא משויך",
                    done: eventData.venueAccessStatus === "linked",
                  },
                  {
                    label: "פרטי אירוע",
                    date: eventData.title ? "הוזנו" : "חסר",
                    done: Boolean(eventData.title),
                  },
                  {
                    label: "אישורי הגעה",
                    date: eventStats.rsvp.enabled
                      ? `${eventStats.rsvp.confirmedGuestsAmount} מגיעים`
                      : "לא הופעל",
                    done: eventStats.rsvp.enabled,
                  },
                  {
                    label: "הושבה",
                    date: eventStats.seating.enabled
                      ? `${eventStats.seating.seatedGuests} הושבו`
                      : "לא הופעלה",
                    done: eventStats.seating.completed,
                  },
                  {
                    label: "תפריט",
                    date: assignedMenu ? assignedMenu.name : "טרם נבחר",
                    done: Boolean(assignedMenu),
                  },
                ].map((step) => (
                  <div key={step.label} className="flex items-start gap-3">
                    <div
                      className={[
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black",
                        step.done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-[#eadfce] bg-white text-[#b8a88e]",
                      ].join(" ")}
                    >
                      {step.done ? "✓" : ""}
                    </div>
                    <div>
                      <div className="text-sm font-black text-[#2b241c]">
                        {step.label}
                      </div>
                      <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                        {step.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-black text-[#8a7b68]">
                  <span>השלמה כללית</span>
                  <span>{progress.total}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#eee6d9]">
                  <div
                    className="h-full rounded-full bg-[#b98121]"
                    style={{ width: `${progress.total}%` }}
                  />
                </div>
              </div>
            </SideCard>

            <SideCard title="פרטי לקוח" icon={<UsersRound size={18} />}>
              <div className="space-y-3">
                <InfoLine label="אימייל לקוח" value={clientName} />
                <InfoLine label="בעל האירוע" value={eventData.userId || "לא הוגדר"} />
                <InfoLine label="מפיק" value={eventData.producerId || "לא הוגדר"} />
                <InfoLine label="מקור" value="Event" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="h-10 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]">
                  שיחה
                </button>
                <button className="h-10 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]">
                  מייל
                </button>
              </div>
            </SideCard>

            <SideCard title="תקציר פיננסי" icon={<WalletCards size={18} />}>
              <div className="space-y-3">
                <InfoLine
                  label="תקציב"
                  value={formatCurrency(financial.commitment)}
                />
                <InfoLine
                  label="סטטוס"
                  value={eventData.paymentStatus === "paid" ? "שולם" : "הוחזר"}
                  danger={eventData.paymentStatus === "refunded"}
                />
                <InfoLine
                  label="יתרה משוערת"
                  value={formatCurrency(financial.estimatedBalance)}
                  danger={financial.estimatedBalance > 0}
                />
              </div>

              <button
                type="button"
                onClick={() => setPaymentOpen(true)}
                className="mt-4 h-11 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
              >
                צפייה בתשלומים
              </button>
            </SideCard>
          </aside>

          <div className="space-y-5">
            {activeTab === "overview" && (
              <>
                <section className="grid gap-5 xl:grid-cols-3">
                  <MainCard title="פרטי האירוע" icon={<CalendarDays size={19} />}>
                    <div className="space-y-3">
                      <InfoLine
                        label="סוג אירוע"
                        value={eventTypeLabel(eventData.eventType)}
                      />
                      <InfoLine label="אולם" value={hallName} />
                      <InfoLine label="תאריך" value={formatDate(eventData.date)} />
                      <InfoLine label="שעה" value={eventData.time || "לא הוגדר"} />
                      <InfoLine label="מיקום" value={eventData.location?.address || "לא הוגדר"} />
                      <InfoLine label="כמות אורחים" value={`${guestsCount}`} />
                      <InfoLine
                        label="מנהל אירוע"
                        value={eventStats.production.managerName || "לא הוגדר"}
                      />
                    </div>
                  </MainCard>

                  <MainCard title="אישורי הגעה" icon={<CheckCircle2 size={19} />}>
                    <div className="grid grid-cols-2 gap-3">
                      <FinanceMini
                        label="מגיעים"
                        value={`${eventStats.rsvp.confirmedGuestsAmount}`}
                        success={eventStats.rsvp.confirmedGuestsAmount > 0}
                      />
                      <FinanceMini
                        label="רשומות שאישרו"
                        value={`${eventStats.rsvp.confirmedRecords}`}
                      />
                      <FinanceMini
                        label="רשומות שלא מגיעות"
                        value={`${eventStats.rsvp.declinedRecords}`}
                        danger={eventStats.rsvp.declinedRecords > 0}
                      />
                      <FinanceMini
                        label="ממתינים"
                        value={`${eventStats.rsvp.pendingRecords}`}
                      />
                    </div>

                    {!eventStats.rsvp.enabled && (
                      <div className="mt-4">
                        <EmptyBox text="לא נמצאו אישורי הגעה מחוברים לאירוע הזה." />
                      </div>
                    )}
                  </MainCard>

                  <MainCard title="הושבה" icon={<UsersRound size={19} />}>
                    <div className="grid grid-cols-2 gap-3">
                      <FinanceMini
                        label="שולחנות"
                        value={`${eventStats.seating.totalTables}`}
                      />
                      <FinanceMini
                        label="הושבו"
                        value={`${eventStats.seating.seatedGuests}`}
                        success={eventStats.seating.seatedGuests > 0}
                      />
                      <FinanceMini
                        label="לא הושבו"
                        value={`${eventStats.seating.unseatedGuests}`}
                        danger={eventStats.seating.unseatedGuests > 0}
                      />
                      <FinanceMini
                        label="סטטוס"
                        value={eventStats.seating.completed ? "הושלם" : "בתהליך"}
                      />
                    </div>

                    {!eventStats.seating.enabled && (
                      <div className="mt-4">
                        <EmptyBox text="לא נמצאה הושבה מחוברת לאירוע הזה." />
                      </div>
                    )}
                  </MainCard>
                </section>

                <section className="grid gap-5 xl:grid-cols-3">
                  <MainCard title="סיכום פיננסי" icon={<Receipt size={19} />}>
                    <div className="grid grid-cols-2 gap-3">
                      <FinanceMini
                        label="תקציב"
                        value={formatCurrency(financial.commitment)}
                      />
                      <FinanceMini
                        label="שולם"
                        value={formatCurrency(financial.totalPaid)}
                        success={financial.totalPaid > 0}
                      />
                      <FinanceMini
                        label="יתרה"
                        value={formatCurrency(financial.estimatedBalance)}
                        danger={financial.estimatedBalance > 0}
                      />
                      <FinanceMini
                        label="אחוז תשלום"
                        value={`${financial.paidPercentage}%`}
                      />
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs font-black text-[#8a7b68]">
                        <span>אחוז תשלום</span>
                        <span>{financial.paidPercentage}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#eee6d9]">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${financial.paidPercentage}%` }}
                        />
                      </div>
                    </div>
                  </MainCard>

                  <MainCard title="סטטוס והתקדמות" icon={<Sparkles size={19} />}>
                    <div className="space-y-3">
                      <ProgressRow label="תשלומים" value={progress.payments} />
                      <ProgressRow label="הושבה" value={progress.seating} />
                      <ProgressRow label="תפריט" value={progress.menu} />
                      <ProgressRow label="משימות הפקה" value={progress.production} />
                    </div>

                    <button
                      type="button"
                      onClick={() => setNoteOpen(true)}
                      className="mt-4 h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
                    >
                      צפייה בהערות
                    </button>
                  </MainCard>

                  <MainCard title="פעילות אחרונה" icon={<Clock3 size={19} />}>
                    <div className="space-y-3">
                      {activities.length ? (
                        activities.map((activity) => (
                          <ActivityItem key={activity.id} activity={activity} />
                        ))
                      ) : (
                        <EmptyBox text="אין פעילות מתועדת עדיין." />
                      )}
                    </div>
                  </MainCard>
                </section>

                <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <MainCard title="קבצים ומסמכים" icon={<FolderOpen size={19} />}>
                    <div className="space-y-3">
                      {files.length ? (
                        files.map((file) => <FileItem key={file.id} file={file} />)
                      ) : (
                        <EmptyBox text="עדיין לא הועלו קבצים לאירוע הזה." />
                      )}
                    </div>
                  </MainCard>

                  <MainCard title="הערות פנימיות" icon={<MessageCircle size={19} />}>
                    {eventData.notes ? (
                      <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
                        <p className="text-sm font-bold leading-7 text-[#7f705d]">
                          {eventData.notes}
                        </p>
                        <div className="mt-3 text-xs font-black text-[#9b8a73]">
                          הערה מתוך Event
                        </div>
                      </div>
                    ) : (
                      <EmptyBox text="אין הערות פנימיות לאירוע הזה." />
                    )}

                    <button
                      type="button"
                      onClick={() => setNoteOpen(true)}
                      className="mt-4 h-11 w-full rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252]"
                    >
                      צפייה בהערות
                    </button>
                  </MainCard>
                </section>
              </>
            )}

            {activeTab === "details" && (
              <MainCard title="פרטי אירוע" icon={<CalendarDays size={19} />}>
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoLine label="שם אירוע" value={eventTitle} />
                  <InfoLine label="סוג אירוע" value={eventTypeLabel(eventData.eventType)} />
                  <InfoLine label="תאריך" value={formatDate(eventData.date)} />
                  <InfoLine label="שעה" value={eventData.time || "לא הוגדר"} />
                  <InfoLine label="מיקום" value={eventData.location?.address || "לא הוגדר"} />
                  <InfoLine label="כמות משוערת" value={`${guestsCount}`} />
                  <InfoLine label="אולם" value={hallName} />
                  <InfoLine
                    label="סטטוס שיוך לאולם"
                    value={eventData.venueAccessStatus || "none"}
                  />
                </div>
              </MainCard>
            )}

            {activeTab === "client-invite" && (
              <ClientInviteTab
                eventId={eventId}
                hallId={hallId}
                hallName={hallName}
                clientName={clientName}
                eventTitle={eventTitle}
                seatingTemplates={seatingTemplates}
                selectedSeatingTemplateId={selectedSeatingTemplateId}
                onSelectSeatingTemplate={setSelectedSeatingTemplateId}
                clientInvite={clientInvite}
                clientInviteError={clientInviteError}
                loading={clientInviteLoading}
                onCreateInvite={createClientInvite}
              />
            )}

            {activeTab === "rsvp" && (
  <MainCard title="אישורי הגעה" icon={<CheckCircle2 size={19} />}>
    <div className="grid gap-4 md:grid-cols-5">
      <FinanceMini
        label="סה״כ רשומות"
        value={`${eventStats.rsvp.recordsCount}`}
      />
      <FinanceMini
        label="אישרו"
        value={`${eventStats.rsvp.confirmedRecords}`}
        success={eventStats.rsvp.confirmedRecords > 0}
      />
      <FinanceMini
        label="לא מגיעים"
        value={`${eventStats.rsvp.declinedRecords}`}
        danger={eventStats.rsvp.declinedRecords > 0}
      />
      <FinanceMini
        label="ממתינים"
        value={`${eventStats.rsvp.pendingRecords}`}
      />
      <FinanceMini
        label="כמות מגיעים"
        value={`${eventStats.rsvp.confirmedGuestsAmount}`}
        success={eventStats.rsvp.confirmedGuestsAmount > 0}
      />
    </div>

    {!eventStats.rsvp.enabled && (
      <div className="mt-5">
        <EmptyBox text="אין עדיין חיבור לאישורי הגעה עבור האירוע הזה." />
      </div>
    )}

    {eventData.venueClientInvitationId ? (
      <div className="mt-5 rounded-[28px] border border-[#eadfce] bg-[#fffdf8] p-5">
        <div className="mb-4">
          <h3 className="text-lg font-black text-[#2b241c]">
            ניהול רשימת המוזמנים של הלקוח
          </h3>

          <p className="mt-1 text-sm font-bold leading-6 text-[#7f705d]">
            כאן האולם נכנס לאותה רשימת מוזמנים בדיוק שהלקוח רואה. כל אישור הגעה,
            שינוי סטטוס, שיוך לשולחן ומצב לייב ייטען מאותה הזמנה.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={`/dashboard?eventId=${encodeURIComponent(
              eventData.id
            )}&invitationId=${encodeURIComponent(
              eventData.venueClientInvitationId
            )}&venueView=1`}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
          >
            <Eye size={17} />
            פתיחת רשימת מוזמנים
          </Link>

          <Link
            href={`/dashboard?eventId=${encodeURIComponent(
              eventData.id
            )}&invitationId=${encodeURIComponent(
              eventData.venueClientInvitationId
            )}&venueView=1&live=1`}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1f1b17] px-5 text-sm font-black text-white shadow-sm transition hover:bg-black"
          >
            <Sparkles size={17} />
            פתיחת מצב לייב
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoPill
            label="מזהה אירוע"
            value={eventData.id || "לא הוגדר"}
          />
          <InfoPill
            label="מזהה הזמנה"
            value={eventData.venueClientInvitationId || "לא הוגדר"}
          />
          <InfoPill
            label="רשומות לקוח"
            value={`${eventData.venueClientRecordsCount || 0}`}
          />
        </div>
      </div>
    ) : (
      <div className="mt-5 rounded-[28px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-5">
        <div className="text-base font-black text-[#2b241c]">
          עדיין אין הזמנת לקוח מחוברת לאישורי ההגעה
        </div>

        <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
          כדי שהאולם יוכל לראות את רשימת המוזמנים ואישורי ההגעה, הלקוח צריך
          להירשם מהקישור של האולם ולסיים בחירת חבילה. לאחר מכן יווצר
          <span className="font-black"> venueClientInvitationId </span>
          והכפתורים יופיעו כאן.
        </p>

        <button
          type="button"
          onClick={() => setActiveTab("client-invite")}
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
        >
          <Link2 size={17} />
          מעבר לפתיחת לקוח
        </button>
      </div>
    )}
  </MainCard>
)}

            {activeTab === "seating" && (
  <MainCard title="הושבה" icon={<UsersRound size={19} />}>
    <div className="grid gap-4 md:grid-cols-4">
      <FinanceMini
        label="שולחנות"
        value={`${eventStats.seating.totalTables}`}
      />
      <FinanceMini
        label="הושבו"
        value={`${eventStats.seating.seatedGuests}`}
        success={eventStats.seating.seatedGuests > 0}
      />
      <FinanceMini
        label="לא הושבו"
        value={`${eventStats.seating.unseatedGuests}`}
        danger={eventStats.seating.unseatedGuests > 0}
      />
      <FinanceMini
        label="סטטוס"
        value={eventStats.seating.completed ? "הושלם" : "בתהליך"}
      />
    </div>

    {!eventStats.seating.enabled && (
      <div className="mt-5">
        <EmptyBox text="אין עדיין חיבור להושבה עבור האירוע הזה." />
      </div>
    )}

    {eventData.venueClientInvitationId ? (
      <div className="mt-5 rounded-[28px] border border-[#eadfce] bg-[#fffdf8] p-5">
        <div className="mb-4">
          <h3 className="text-lg font-black text-[#2b241c]">
            ניהול הושבת הלקוח
          </h3>
          <p className="mt-1 text-sm font-bold leading-6 text-[#7f705d]">
            כאן האולם נכנס לאותה הושבה בדיוק שהלקוח רואה ועורך. כל שינוי שהלקוח עושה נשמר באותו מסמך, והאולם יכול לראות ולנהל את זה גם בלייב ביום האירוע.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={`/dashboard/seating?eventId=${encodeURIComponent(
              eventData.id
            )}&invitationId=${encodeURIComponent(
              eventData.venueClientInvitationId
            )}&venueView=1`}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
          >
            <Eye size={17} />
            פתיחת הושבה
          </Link>

          <Link
            href={`/dashboard/seating?eventId=${encodeURIComponent(
              eventData.id
            )}&invitationId=${encodeURIComponent(
              eventData.venueClientInvitationId
            )}&venueView=1&live=1`}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1f1b17] px-5 text-sm font-black text-white shadow-sm transition hover:bg-black"
          >
            <Sparkles size={17} />
            ניהול הושבה בלייב
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoPill
            label="מזהה אירוע"
            value={eventData.id || "לא הוגדר"}
          />
          <InfoPill
            label="מזהה הזמנה"
            value={eventData.venueClientInvitationId || "לא הוגדר"}
          />
          <InfoPill
            label="חבילת לקוח"
            value={eventData.venueClientPackageType || "לא הוגדר"}
          />
        </div>
      </div>
    ) : (
      <div className="mt-5 rounded-[28px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-5">
        <div className="text-base font-black text-[#2b241c]">
          עדיין אין הזמנת לקוח מחוברת להושבה
        </div>
        <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
          כדי שהאולם יוכל לראות ולנהל את ההושבה, הלקוח צריך להירשם מהקישור של האולם ולסיים בחירת חבילה. לאחר מכן יווצר 
          <span className="font-black"> venueClientInvitationId </span>
          והכפתורים יופיעו כאן.
        </p>

        <button
          type="button"
          onClick={() => setActiveTab("client-invite")}
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
        >
          <Link2 size={17} />
          מעבר לפתיחת לקוח
        </button>
      </div>
    )}
  </MainCard>
)}

            {activeTab === "menu" && (
              <EventMenuTab
                eventId={eventId}
                hallId={hallId}
                assignedMenu={assignedMenu}
                templates={venueMenuTemplates}
                menusLoading={menusLoading}
                menuError={menuError}
                menuSaving={menuSaving}
                onChooseMenu={() => {
                  setSelectedMenuDraft(null);
                  setMenuSelectOpen(true);
                }}
                onSendToCouple={openSendMenuSms}
                onUpdateEventNote={(value) =>
                  setAssignedMenu((current) =>
                    current ? { ...current, eventNote: value } : current
                  )
                }
                onUpdateCategory={updateAssignedMenuCategory}
                onUpdateSelectionPolicy={updateAssignedMenuPolicy}
                onSaveChanges={saveAssignedMenuChanges}
                onSaveKitchenReport={saveKitchenReportChanges}
              />
            )}

            {activeTab !== "overview" &&
              activeTab !== "details" &&
              activeTab !== "client-invite" &&
              activeTab !== "rsvp" &&
              activeTab !== "seating" &&
              activeTab !== "menu" && (
                <MainCard title={tabTitle(activeTab)} icon={<Sparkles size={19} />}>
                  <div className="rounded-3xl border border-dashed border-[#d9bd83] bg-[#fffaf0] p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#b98121]">
                      <Sparkles size={26} />
                    </div>
                    <h2 className="mt-4 text-xl font-black text-[#2b241c]">
                      {tabTitle(activeTab)}
                    </h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-[#7f705d]">
                      כאן ייכנס המסך המלא של הטאב הזה מתוך מערכת Event.
                    </p>
                  </div>
                </MainCard>
              )}
          </div>
        </section>
      </div>

      {actionsOpen && (
        <Modal title="פעולות נוספות" onClose={() => setActionsOpen(false)}>
          <div className="grid gap-3">
            <ActionButton icon={<FileText size={17} />} label="הפקת חוזה" />
            <ActionButton icon={<Mail size={17} />} label="שליחת עדכון ללקוח" />
            <ActionButton icon={<Bell size={17} />} label="יצירת תזכורת" />
            <ActionButton icon={<FolderOpen size={17} />} label="העלאת קובץ" />
          </div>
        </Modal>
      )}

      {editOpen && (
        <EventEditModal
          event={eventData}
          saving={savingEvent}
          onClose={() => setEditOpen(false)}
          onSave={updateEvent}
        />
      )}

      {paymentOpen && (
        <Modal title="ניהול תשלומים" onClose={() => setPaymentOpen(false)}>
          <div className="space-y-3">
            <InfoLine
              label="תקציב האירוע"
              value={formatCurrency(financial.commitment)}
            />
            <InfoLine
              label="סטטוס תשלום"
              value={eventData.paymentStatus === "paid" ? "שולם" : "הוחזר"}
              danger={eventData.paymentStatus === "refunded"}
            />
            <InfoLine
              label="יתרה משוערת"
              value={formatCurrency(financial.estimatedBalance)}
              danger={financial.estimatedBalance > 0}
            />
            <button
              type="button"
              onClick={() => {
                setPaymentOpen(false);
                setEditOpen(true);
              }}
              className="mt-2 h-11 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              עדכון תקציב
            </button>
          </div>
        </Modal>
      )}

      {noteOpen && (
        <Modal title="הערות האירוע" onClose={() => setNoteOpen(false)}>
          <textarea
            value={eventData.notes || ""}
            readOnly
            placeholder="אין הערות לאירוע הזה."
            className="min-h-[140px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
          />
          <button
            type="button"
            onClick={() => {
              setNoteOpen(false);
              setEditOpen(true);
            }}
            className="mt-3 h-11 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
          >
            עריכת הערות
          </button>
        </Modal>
      )}

      {menuSelectOpen && (
        <Modal
          title="בחירת תפריט לאירוע"
          onClose={() => {
            setMenuSelectOpen(false);
            setSelectedMenuDraft(null);
          }}
          wide
        >
          <div className="mb-4 rounded-2xl border border-[#eadfce] bg-[#fff8eb] p-4 text-sm font-bold leading-7 text-[#7f705d]">
            התפריטים נטענים מתוך התפריטים המעודכנים שהאולם הגדיר. אחרי בחירת תפריט אפשר לשנות רק לאירוע הזה את כמות הבחירות בכל קטגוריה ולהוסיף הערות ספציפיות לאירוע, בלי לשנות את תפריט המקור של האולם.
          </div>

          {menuError && (
            <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-black text-rose-700">
              {menuError}
            </div>
          )}

          {!selectedMenuDraft ? (
            <>
              {menusLoading && (
                <div className="rounded-[24px] border border-[#eadfce] bg-white p-6 text-center text-sm font-black text-[#8a7b68]">
                  טוען תפריטים מעודכנים של האולם...
                </div>
              )}

              {!menusLoading && venueMenuTemplates.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-6 text-center">
                  <div className="text-lg font-black text-[#2b241c]">
                    לא נמצאו תפריטים פעילים לאולם הזה
                  </div>
                  <p className="mt-2 text-sm font-bold text-[#7f705d]">
                    צריך להגדיר קודם תפריט פעיל בניהול תפריטי האולם.
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                {venueMenuTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => chooseMenuForEvent(template)}
                    className="rounded-[26px] border border-[#eadfce] bg-[#fffdf8] p-4 text-right transition hover:-translate-y-1 hover:border-[#d9bd83] hover:bg-[#fff8eb] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
                        <Utensils size={23} />
                      </div>

                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                        פעיל
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-black text-[#2b241c]">
                      {template.name}
                    </h3>
                    <p className="mt-2 text-sm font-bold leading-6 text-[#7f705d]">
                      {template.description || "תפריט אולם מעודכן"}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <InfoPill label="קטגוריות" value={`${template.categories}`} />
                      <InfoPill label="מנות" value={`${template.dishes}`} />
                    </div>

                    <div className="mt-4 rounded-2xl bg-[#b98121] px-4 py-3 text-center text-sm font-black text-white">
                      בחירה והתאמה לאירוע
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-5">
              <div className="rounded-[26px] border border-[#eadfce] bg-[#fffdf8] p-5">
                <div className="text-xs font-black text-[#b98121]">
                  תפריט שנבחר מהאולם
                </div>
                <h3 className="mt-1 text-2xl font-black text-[#2b241c]">
                  {selectedMenuDraft.name}
                </h3>

                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-black text-[#8a7b68]">
                    הערה לאירוע הספציפי הזה
                  </span>
                  <textarea
                    value={selectedMenuDraft.eventNote || ""}
                    onChange={(event) =>
                      setSelectedMenuDraft((current) =>
                        current
                          ? { ...current, eventNote: event.target.value }
                          : current
                      )
                    }
                    placeholder="לדוגמה: לזוג הזה לאפשר 2 עיקריות במקום 1 / לא להציג מנה מסוימת / הערת אלרגנים"
                    className="min-h-[92px] w-full rounded-2xl border border-[#eadfce] bg-white p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
                  />
                </label>

                <MenuEditPolicyBox
                  selectionEditMode={selectedMenuDraft.selectionEditMode || "untilDate"}
                  selectionEditableUntil={selectedMenuDraft.selectionEditableUntil || ""}
                  lockedAt={selectedMenuDraft.lockedAt || null}
                  lockedReason={selectedMenuDraft.lockedReason || ""}
                  onChangeMode={(value) =>
                    updateSelectedMenuDraftPolicy({ selectionEditMode: value })
                  }
                  onChangeEditableUntil={(value) =>
                    updateSelectedMenuDraftPolicy({ selectionEditableUntil: value })
                  }
                />
              </div>

              <div className="rounded-[26px] border border-[#eadfce] bg-white p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-[#2b241c]">
                      התאמת כמויות בחירה לאירוע הזה בלבד
                    </h3>
                    <p className="mt-1 text-sm font-bold text-[#7f705d]">
                      אם בתפריט המקור מוגדר 1 מתוך 3, כאן אפשר לשנות ל-2 מתוך 3 רק לאירוע הזה.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedMenuDraft.categoryOverrides.map((category) => (
                    <div
                      key={category.id}
                      className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="text-base font-black text-[#2b241c]">
                            {category.name}
                          </div>
                          <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                            במקור: בחירה {category.originalMaxChoices} מתוך {category.dishesCount || "המוגדרות"}
                          </div>
                        </div>

                        <div className="w-full sm:w-[220px]">
                          <InputEdit
                            label="כמה לבחירה"
                            type="number"
                            value={String(category.eventMaxChoices)}
                            onChange={(value) =>
                              updateSelectedMenuDraftCategory(
                                category.id,
                                "eventChoices",
                                value
                              )
                            }
                          />
                        </div>
                      </div>

                      <label className="mt-3 block">
                        <span className="mb-1 block text-xs font-black text-[#8a7b68]">
                          הערה לקטגוריה באירוע הזה
                        </span>
                        <input
                          value={category.eventNote}
                          onChange={(event) =>
                            updateSelectedMenuDraftCategory(
                              category.id,
                              "eventNote",
                              event.target.value
                            )
                          }
                          placeholder="הערה פנימית/הנחיה לבעל האירוע"
                          className="h-11 w-full rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[#eadfce] pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedMenuDraft(null)}
                  className="h-11 rounded-2xl border border-[#eadfce] bg-white px-6 text-sm font-black text-[#6f6252]"
                >
                  חזרה לבחירת תפריט
                </button>

                <button
                  type="button"
                  disabled={menuSaving}
                  onClick={saveSelectedMenuForEvent}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-6 text-sm font-black text-white disabled:opacity-60"
                >
                  <Save size={17} />
                  {menuSaving ? "שומר..." : "שמירה והפקת קישור אישי"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {sendMenuOpen && (
        <Modal
          title="שליחת SMS עם קישור בחירת מנות"
          onClose={() => setSendMenuOpen(false)}
        >
          <div className="space-y-3">
            {menuError && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-black text-rose-700">
                {menuError}
              </div>
            )}

            <InfoLine
              label="תפריט"
              value={assignedMenu?.name || "לא נבחר תפריט"}
            />
            <InfoLine
              label="קישור אישי"
              value={
                assignedMenu?.publicLink ||
                `${typeof window !== "undefined" ? window.location.origin : "https://www.invistimo.com"}/menus/choose/${assignedMenu?.publicToken || eventId}`
              }
            />

            <InputEdit
              label="מספר טלפון לשליחת SMS"
              value={menuSms.phone}
              onChange={(value) =>
                setMenuSms((current) => ({ ...current, phone: value }))
              }
              placeholder="לדוגמה: 0501234567"
            />

            <label className="block">
              <span className="mb-1 block text-xs font-black text-[#8a7b68]">
                הודעת SMS
              </span>
              <textarea
                value={menuSms.message}
                onChange={(event) =>
                  setMenuSms((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                className="min-h-[115px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
              />
            </label>

            <button
              type="button"
              disabled={menuSendingSms}
              onClick={sendMenuSmsToCouple}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white disabled:opacity-60"
            >
              <Send size={17} />
              {menuSendingSms ? "שולח דרך 4free..." : "שליחת SMS דרך 4free"}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function EventEditModal({
  event,
  saving,
  onClose,
  onSave,
}: {
  event: EventDashboardData;
  saving: boolean;
  onClose: () => void;
  onSave: (form: EventEditForm) => void;
}) {
  const [form, setForm] = useState<EventEditForm>({
    title: event.title || "",
    eventType: event.eventType || "wedding",
    date: event.date || "",
    time: event.time || "",
    estimatedGuests:
      event.estimatedGuestCount || event.estimatedGuests
        ? String(event.estimatedGuestCount || event.estimatedGuests)
        : "",
    budgetTotal: event.budgetTotal ? String(event.budgetTotal) : "",
    venueHallId: event.venueHallId || "",
    venueHallName: event.venueHallName || "",
    notes: event.notes || "",
  });

  const updateField = <K extends keyof EventEditForm>(
    key: K,
    value: EventEditForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = (submitEvent: React.FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();

    if (!form.date) {
      alert("חובה להזין תאריך");
      return;
    }

    onSave(form);
  };

  return (
    <Modal title="עריכת אירוע" onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-2">
          <InputEdit
            label="שם האירוע"
            value={form.title}
            onChange={(value) => updateField("title", value)}
          />

          <label>
            <span className="mb-1 block text-xs font-black text-[#8a7b68]">
              סוג אירוע
            </span>
            <select
              value={form.eventType}
              onChange={(event) =>
                updateField("eventType", event.target.value as EventType)
              }
              className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
            >
              <option value="wedding">חתונה</option>
              <option value="bar-mitzvah">בר מצווה</option>
              <option value="bat-mitzvah">בת מצווה</option>
              <option value="brit">ברית</option>
              <option value="brita">בריתה</option>
              <option value="henna">חינה</option>
              <option value="other">אחר</option>
            </select>
          </label>

          <InputEdit
            label="תאריך"
            type="date"
            value={form.date}
            onChange={(value) => updateField("date", value)}
          />

          <InputEdit
            label="שעה"
            type="time"
            value={form.time}
            onChange={(value) => updateField("time", value)}
          />

          <InputEdit
            label="כמות אורחים משוערת"
            type="number"
            value={form.estimatedGuests}
            onChange={(value) => updateField("estimatedGuests", value)}
          />

          <InputEdit
            label="תקציב / מחיר אירוע"
            type="number"
            value={form.budgetTotal}
            onChange={(value) => updateField("budgetTotal", value)}
          />

          <InputEdit
            label="מזהה אולם"
            value={form.venueHallId}
            onChange={(value) => updateField("venueHallId", value)}
          />

          <InputEdit
            label="שם אולם"
            value={form.venueHallName}
            onChange={(value) => updateField("venueHallName", value)}
          />

          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-black text-[#8a7b68]">
              הערות
            </span>
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className="min-h-[120px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-[#eadfce] pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-2xl border border-[#eadfce] bg-white px-6 text-sm font-black text-[#6f6252]"
          >
            ביטול
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-6 text-sm font-black text-white disabled:opacity-60"
          >
            <Save size={17} />
            {saving ? "שומר..." : "שמירת שינויים"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ClientInviteTab({
  eventId,
  hallId,
  hallName,
  clientName,
  eventTitle,
  seatingTemplates,
  selectedSeatingTemplateId,
  onSelectSeatingTemplate,
  clientInvite,
  clientInviteError,
  loading,
  onCreateInvite,
}: {
  eventId: string;
  hallId: string;
  hallName: string;
  clientName: string;
  eventTitle: string;
  seatingTemplates: VenueSeatingTemplateRow[];
  selectedSeatingTemplateId: string;
  onSelectSeatingTemplate: (templateId: string) => void;
  clientInvite: ClientInviteState | null;
  clientInviteError: string;
  loading: boolean;
  onCreateInvite: () => void;
}) {
  const selectedTemplate = seatingTemplates.find(
    (template) => template.id === selectedSeatingTemplateId
  );

  const copyLink = async () => {
    if (!clientInvite?.registrationLink) return;

    try {
      await navigator.clipboard.writeText(clientInvite.registrationLink);
      alert("הקישור הועתק");
    } catch {
      alert("לא הצלחתי להעתיק אוטומטית. אפשר להעתיק ידנית מהשדה.");
    }
  };

  const copyMessage = async () => {
    if (!clientInvite?.copyText) return;

    try {
      await navigator.clipboard.writeText(clientInvite.copyText);
      alert("ההודעה הועתקה");
    } catch {
      alert("לא הצלחתי להעתיק אוטומטית. אפשר להעתיק ידנית מהשדה.");
    }
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <MainCard title="שליחת קישור הרשמה ללקוח Invistimo" icon={<Link2 size={19} />}>
        <div className="rounded-[28px] border border-[#eadfce] bg-[#fffdf8] p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <InfoLine label="אירוע" value={eventTitle} />
            <InfoLine label="אולם" value={hallName} />
            <InfoLine label="לקוח" value={clientName} />
            <InfoLine label="מזהה אירוע" value={eventId || "לא הוגדר"} />
          </div>
        </div>

        <div className="mt-5 rounded-[28px] border border-[#eadfce] bg-white p-5">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-[#4c3724]">
              בחירת תבנית הושבה שהאולם הכין מראש
            </span>

            <select
              value={selectedSeatingTemplateId}
              onChange={(event) => onSelectSeatingTemplate(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#2b241c] outline-none focus:border-[#b98121]"
            >
              <option value="">בחרי תבנית הושבה</option>
              {seatingTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · {template.tablesCount} שולחנות
                </option>
              ))}
            </select>
          </label>

          {!hallId && (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-700">
              לא נמצא אולם משויך לאירוע. צריך לשייך את האירוע לאולם לפני שליחת קישור ללקוח.
            </div>
          )}

          {hallId && seatingTemplates.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-[#d9bd83] bg-[#fff8eb] p-4 text-sm font-bold leading-6 text-[#7f705d]">
              עדיין אין תבניות הושבה לאולם הזה. קודם צרי תבנית בדף תבניות ההושבה של האולם, ואז חזרי לכאן ושלחי קישור ללקוח.
            </div>
          )}

          {selectedTemplate && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <InfoPill label="תבנית" value={selectedTemplate.name} />
              <InfoPill label="שולחנות" value={`${selectedTemplate.tablesCount}`} />
              <InfoPill label="אולם" value={hallName} />
            </div>
          )}

          <div className="mt-5 rounded-2xl bg-[#fff8eb] p-4 text-sm font-bold leading-7 text-[#7f705d]">
            הקישור שיישלח ללקוח כולל את התבנית שבחרת כאן. לאחר הרשמה הלקוח יבחר חבילה:
            הושבה בלבד ללא תשלום, או חבילות בתשלום דרך Stripe.
          </div>

          {clientInviteError && (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-black text-rose-700">
              {clientInviteError}
            </div>
          )}

          <button
            type="button"
            onClick={onCreateInvite}
            disabled={loading || !hallId || !selectedSeatingTemplateId}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={17} />
            {loading ? "יוצר קישור..." : "צור קישור הרשמה ללקוח"}
          </button>
        </div>

        {clientInvite?.registrationLink && (
          <div className="mt-5 rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
            <div className="text-sm font-black text-emerald-700">
              קישור הרשמה נוצר בהצלחה
            </div>

            <div className="mt-3 break-all rounded-2xl border border-emerald-100 bg-white p-4 text-sm font-black leading-6 text-[#2b241c]">
              {clientInvite.registrationLink}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={copyLink}
                className="h-11 rounded-2xl border border-emerald-200 bg-white text-sm font-black text-emerald-700"
              >
                העתקת קישור
              </button>

              <button
                type="button"
                onClick={copyMessage}
                className="h-11 rounded-2xl bg-emerald-700 text-sm font-black text-white"
              >
                העתקת הודעה מלאה
              </button>
            </div>
          </div>
        )}
      </MainCard>

      <MainCard title="מה הלקוח יקבל?" icon={<Sparkles size={19} />}>
        <div className="space-y-3">
          <StatusLine label="הרשמה ל-User רגיל של Invistimo" done />
          <StatusLine label="בחירת חבילה מיוחדת ללקוחות אולם" done />
          <StatusLine label="פתיחה עם תבנית ההושבה שבחר האולם" done={Boolean(selectedTemplate)} />
          <StatusLine label="הושבה בלבד ללא תשלום נוסף" done />
          <StatusLine label="חבילות בתשלום עוברות ל-Stripe" done />
        </div>

        <div className="mt-5 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4 text-sm font-bold leading-7 text-[#7f705d]">
          אחרי שהלקוח יסיים הרשמה ובחירת חבילה, הוא ייכנס לדשבורד שלו. האולם יוכל לראות את ההתקדמות דרך האירוע המשויך.
        </div>
      </MainCard>
    </section>
  );
}


function formatDateTimeInputValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function MenuEditPolicyBox({
  selectionEditMode,
  selectionEditableUntil,
  lockedAt,
  lockedReason,
  onChangeMode,
  onChangeEditableUntil,
}: {
  selectionEditMode: SelectionEditMode;
  selectionEditableUntil?: string | null;
  lockedAt?: string | null;
  lockedReason?: string;
  onChangeMode: (value: SelectionEditMode) => void;
  onChangeEditableUntil: (value: string) => void;
}) {
  const isUntilDate = selectionEditMode === "untilDate";

  return (
    <div className="mt-4 rounded-[24px] border border-[#eadfce] bg-white p-4">
      <div className="text-sm font-black text-[#2b241c]">
        אפשרות עריכה לבעל האירוע
      </div>
      <p className="mt-1 text-xs font-bold leading-5 text-[#7f705d]">
        ההגבלה הזאת חלה רק על בעל האירוע בקישור האישי. האולם יכול לערוך ולעדכן תמיד מתוך הדשבורד.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onChangeMode("untilDate")}
          className={[
            "rounded-2xl border p-4 text-right transition",
            isUntilDate
              ? "border-[#b98121] bg-[#fff8eb] text-[#8c5f19]"
              : "border-[#eadfce] bg-[#fffdf8] text-[#6f6252] hover:bg-[#fff8eb]",
          ].join(" ")}
        >
          <div className="text-sm font-black">ניתן לעדכן עד תאריך</div>
          <div className="mt-1 text-xs font-bold leading-5">
            אחרי התאריך שהאולם הגדיר, בעל האירוע יראה את התפריט לצפייה בלבד.
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChangeMode("lockAfterSubmit")}
          className={[
            "rounded-2xl border p-4 text-right transition",
            !isUntilDate
              ? "border-[#b98121] bg-[#fff8eb] text-[#8c5f19]"
              : "border-[#eadfce] bg-[#fffdf8] text-[#6f6252] hover:bg-[#fff8eb]",
          ].join(" ")}
        >
          <div className="text-sm font-black">ננעל לאחר בחירה ראשונה</div>
          <div className="mt-1 text-xs font-bold leading-5">
            אחרי שבעל האירוע שומר פעם אחת, הוא יוכל לראות את התפריט בלבד.
          </div>
        </button>
      </div>

      {isUntilDate ? (
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-black text-[#8a7b68]">
            ניתן לעדכן עד תאריך ושעה
          </span>
          <input
            type="datetime-local"
            value={formatDateTimeInputValue(selectionEditableUntil)}
            onChange={(event) => onChangeEditableUntil(event.target.value)}
            className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
          />
        </label>
      ) : null}

      {lockedAt ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-black leading-5 text-amber-700">
          התפריט נעול לבעל האירוע לצפייה בלבד.
          {lockedReason ? ` סיבה: ${lockedReason}` : ""}
        </div>
      ) : null}
    </div>
  );
}

function StatusLine({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-3">
      <span className="text-sm font-black text-[#2b241c]">{label}</span>
      <span
        className={[
          "rounded-full px-3 py-1 text-xs font-black",
          done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
        ].join(" ")}
      >
        {done ? "בוצע" : "ממתין"}
      </span>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-white px-3 py-2">
      <div className="text-[11px] font-black text-[#8a7b68]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#2b241c]">{value}</div>
    </div>
  );
}

function tabTitle(tab: string) {
  if (tab === "details") return "פרטי אירוע";
  if (tab === "client") return "לקוח";
  if (tab === "client-invite") return "פתיחת לקוח Invistimo";
  if (tab === "payments") return "תשלומים";
  if (tab === "menu") return "תפריט";
  if (tab === "seating") return "הושבה";
  if (tab === "rsvp") return "אישורי הגעה";
  if (tab === "staff") return "צוות וספקים";
  if (tab === "tasks") return "משימות";
  if (tab === "files") return "קבצים";
  return "סקירה כללית";
}

function HeroMetric({
  title,
  value,
  subtitle,
  icon,
  success,
  danger,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[26px] border border-[#eadfce] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>
      </div>

      <div className="mt-5 text-sm font-black text-[#8a7b68]">{title}</div>
      <div
        className={[
          "mt-1 text-2xl font-black",
          success ? "text-emerald-700" : danger ? "text-rose-700" : "text-[#2b241c]",
        ].join(" ")}
      >
        {value}
      </div>
      <div className="mt-1 text-xs font-bold text-[#9b8a73]">{subtitle}</div>
    </div>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "rose" | "gray" | "gold";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "rose"
          ? "bg-rose-50 text-rose-700"
          : tone === "gold"
            ? "bg-[#fff4dc] text-[#b98121]"
            : "bg-slate-100 text-slate-600";

  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
      <div className="text-xs font-black text-[#8a7b68]">{label}</div>
      <div
        className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-black ${toneClass}`}
      >
        {value}
      </div>
    </div>
  );
}

function SideCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>
        <h2 className="text-base font-black text-[#2b241c]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MainCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>
        <h2 className="text-lg font-black text-[#2b241c]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoLine({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-2">
      <span className="text-xs font-black text-[#8a7b68]">{label}</span>
      <span
        className={[
          "text-sm font-black",
          danger ? "text-rose-700" : "text-[#2b241c]",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function FinanceMini({
  label,
  value,
  success,
  danger,
}: {
  label: string;
  value: string;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
      <div className="text-xs font-black text-[#8a7b68]">{label}</div>
      <div
        className={[
          "mt-2 text-lg font-black",
          success ? "text-emerald-700" : danger ? "text-rose-700" : "text-[#2b241c]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-black text-[#8a7b68]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#eee6d9]">
        <div className="h-full rounded-full bg-[#b98121]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function PaymentItem({ payment }: { payment: PaymentRow }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-[#2b241c]">{payment.title}</div>
          <div className="mt-1 text-xs font-bold text-[#8a7b68]">
            {payment.dueDate} · {payment.note}
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${paymentStatusClass(
            payment.status
          )}`}
        >
          {paymentStatusLabel(payment.status)}
        </span>
      </div>
      <div className="mt-2 text-lg font-black text-[#2b241c]">
        {formatCurrency(payment.amount)}
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: TaskRow }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div>
        <div className="text-sm font-black text-[#2b241c]">{task.title}</div>
        <div className="mt-1 text-xs font-bold text-[#8a7b68]">{task.dueDate}</div>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-black ${taskStatusClass(
          task.status
        )}`}
      >
        {taskStatusLabel(task.status)}
      </span>
    </div>
  );
}

function ActivityItem({ activity }: { activity: ActivityRow }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="text-sm font-black text-[#2b241c]">{activity.title}</div>
      <div className="mt-1 text-xs font-bold text-[#8a7b68]">{activity.date}</div>
      <div className="mt-2 text-xs font-bold leading-5 text-[#7f705d]">
        {activity.description}
      </div>
    </div>
  );
}

function FileItem({ file }: { file: FileRow }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#b98121]">
          <FileText size={18} />
        </div>
        <div>
          <div className="text-sm font-black text-[#2b241c]">{file.title}</div>
          <div className="mt-1 text-xs font-bold text-[#8a7b68]">
            {file.date} · {file.size}
          </div>
        </div>
      </div>
      <button type="button" className="text-sm font-black text-[#b98121]">
        פתיחה
      </button>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex h-12 items-center gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
    >
      {icon}
      {label}
    </button>
  );
}

function InputEdit({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date" | "time";
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#8a7b68]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
      />
    </label>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d9bd83] bg-[#fffaf0] p-4 text-center text-sm font-bold leading-6 text-[#7f705d]">
      {text}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
      <div
        className={[
          "max-h-[92vh] w-full overflow-y-auto rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-2xl",
          wide ? "max-w-6xl" : "max-w-xl",
        ].join(" ")}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-[#2b241c]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-[#6f6252]"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}