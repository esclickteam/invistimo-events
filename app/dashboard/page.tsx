"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import EditGuestModal from "../components/EditGuestModal";
import AddGuestModal from "../components/AddGuestModal";
import ImportExcelModal from "../components/ImportExcelModal";
import GuestsMobileList from "./components/GuestsMobileList";
import LiveGuestTableSelect from "./LiveGuestTableSelect";
import DemoToast from "../components/DemoToast";
import GuestGroupSelect from "@/app/components/groups/GuestGroupSelect";
import ManageGroupsModal from "@/app/components/groups/ManageGroupsModal";
import GuestsControls from "@/app/components/GuestsControls";
import { useGroupStore } from "@/store/groupStore";
import { useSeatingStore } from "@/store/seatingStore";
import CallRoundsModal from "../components/CallRoundsModal";
import type { QuickFilter } from "@/types/quickFilter";

type EventModel = {
  title?: string;
  date?: string;
  time?: string;
  location?: {
    address?: string;
    lat?: number | null;
    lng?: number | null;
  };
};

/* ============================================================
   טיפוס מוזמן
============================================================ */
type Guest = {
  id?: string;
  _id: string;
  name: string;
  phone: string;
  token: string;

  relation?: string;

   groupId?: string | null;

  tableId?: string | null;
  tableName?: string;
  tableNumber?: number;

  rsvp: "yes" | "no" | "pending";
  guestsCount: number;

  arrivedCount?: number;
  actualArrivedCount?: number;
  notes?: string;

  createdAt?: string;
  updatedAt?: string;
  respondedAt?: string;
  rsvpRespondedAt?: string;
  rsvpUpdatedAt?: string;
  lastResponseAt?: string;

  callRounds?: {
  roundNumber: number;

  // ישן — נשאר לתמיכה ברשומות קיימות
  status?: string;

  // חדש — מהמודאל החדש
  answerStatus?: "answered" | "no_answer" | null;
  resultStatus?:
    | "yes"
    | "no"
    | "will_reply"
    | "needs_correction"
    | null;

  amount?: number;

  notes?:
    | string
    | {
        text: string;
        createdAt?: string;
        createdBy?: string;
      }[];

  calledAt?: string;
  updatedAt?: string;
}[];
};

type SortKey = "name" | "rsvp" | "table" | "coming" | "invited";
type SortDir = "asc" | "desc";

function formatPhone(phone?: string) {
  if (!phone) return "";

  const digits = String(phone).replace(/\D/g, "");

  if (digits.startsWith("0")) return digits;

  if (digits.length === 9 && digits.startsWith("5")) {
    return "0" + digits;
  }

  return digits;
}

/* ============================================================
   תצוגת סטטוסים בלבד — הלוגיקה נשארת yes/no/pending
============================================================ */
const RSVP_STATUS_LABELS: Record<Guest["rsvp"], string> = {
  yes: "מגיע",
  no: "לא מגיע",
  pending: "בהמתנה",
};

const RSVP_STATUS_CLASSES: Record<Guest["rsvp"], string> = {
  yes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  no: "bg-rose-50 text-rose-700 border-rose-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

const RSVP_STATUS_DOT: Record<Guest["rsvp"], string> = {
  yes: "bg-emerald-500",
  no: "bg-rose-500",
  pending: "bg-amber-500",
};

function formatEventDate(date?: string) {
  if (!date) return "טרם הוגדר תאריך";

  const target = buildCountdownTarget(date, "00:00");

  if (target) {
    return target.toLocaleDateString("he-IL");
  }

  try {
    return new Date(date).toLocaleDateString("he-IL");
  } catch {
    return date;
  }
}

function resolveInvitationEventDateRaw(invitation: any) {
  /*
    הספירה לאחור ותאריך האירוע נלקחים אך ורק ממסמך invitations,
    מהשדה eventDate כמו שמוגדר בשרת/DB.
  */
  if (!invitation?.eventDate) return "";

  if (invitation.eventDate instanceof Date) {
    return invitation.eventDate.toISOString();
  }

  return String(invitation.eventDate).trim();
}

function resolveInvitationEventTimeRaw(invitation: any) {
  /*
    גם השעה נלקחת ממסמך invitations.
    השדה הראשי הוא eventTime.
  */
  if (!invitation?.eventTime) return "00:00";
  return String(invitation.eventTime).trim();
}

function calcPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}


function cleanText(value: any) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function isGenericEventTitle(value?: string) {
  const title = cleanText(value);

  return (
    !title ||
    title === "הזמנה חדשה" ||
    title === "אירוע חדש" ||
    title === "האירוע שלך"
  );
}

function buildCoupleTitle(source: any) {
  const bride =
    cleanText(source?.brideName) ||
    cleanText(source?.bride) ||
    cleanText(source?.brideFullName);

  const groom =
    cleanText(source?.groomName) ||
    cleanText(source?.groom) ||
    cleanText(source?.groomFullName);

  if (bride && groom) return `${bride} & ${groom}`;
  return "";
}

function resolveEventTitle(invitation: any, event: any) {
  const invitationTitle =
    cleanText(invitation?.eventName) ||
    cleanText(invitation?.eventTitle) ||
    cleanText(invitation?.invitationTitle) ||
    cleanText(invitation?.title) ||
    cleanText(invitation?.name) ||
    cleanText(invitation?.coupleName) ||
    cleanText(invitation?.coupleTitle) ||
    buildCoupleTitle(invitation);

  if (invitationTitle && !isGenericEventTitle(invitationTitle)) {
    return invitationTitle;
  }

  const eventTitle =
    cleanText(event?.eventName) ||
    cleanText(event?.eventTitle) ||
    cleanText(event?.title) ||
    cleanText(event?.name) ||
    cleanText(event?.coupleName) ||
    buildCoupleTitle(event);

  if (eventTitle && !isGenericEventTitle(eventTitle)) {
    return eventTitle;
  }

  return "האירוע שלך";
}

function getGuestActivityDate(guest: Guest) {
  return (
    guest.rsvpRespondedAt ||
    guest.respondedAt ||
    guest.rsvpUpdatedAt ||
    guest.lastResponseAt ||
    guest.updatedAt ||
    guest.createdAt ||
    ""
  );
}

function formatActivityDateTime(date?: string) {
  if (!date) return "לא ידוע";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "לא ידוע";

  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function DashboardPage() {
  type WorkMode = "regular" | "live";

  const [workMode, setWorkMode] = useState<WorkMode>(() => {
    if (typeof window === "undefined") return "regular";
    return (localStorage.getItem("workMode") as WorkMode) || "regular";
  });

  useEffect(() => {
    localStorage.setItem("workMode", workMode);
  }, [workMode]);

  const pathname = usePathname();
  const isDemo = pathname.startsWith("/try");

  const router = useRouter();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const groups = useGroupStore((s) => s.groups);
  const searchParams = useSearchParams();
  const eventIdFromUrl = searchParams.get("eventId");

  const invitationIdFromUrl =
    searchParams.get("invitationId") ||
    searchParams.get("venueClientInvitationId") ||
    "";

  const isVenueView = searchParams.get("venueView") === "1";
  const isLiveView = searchParams.get("live") === "1";

  const [user, setUser] = useState<any | null>(null);

  const setSeatingMode = useSeatingStore((s) => s.setSeatingMode);
  const seatingTables = useSeatingStore((s) => s.tables);
  const setSeatingTables = useSeatingStore((s: any) => s.setTables);

  const effectiveRole = useMemo(() => {
    if (user?.impersonationRole) {
      if (user.impersonationRole === "producer_staff") {
        return "producer";
      }

      return user.impersonationRole;
    }

    if (
      user?.role === "staff" &&
      user?.staffType === "producer_staff"
    ) {
      return "producer";
    }

    return user?.role;
  }, [user]);

  const canViewActualArrived =
    isVenueView ||
    effectiveRole === "producer" ||
    effectiveRole === "worker" ||
    effectiveRole === "venue_owner" ||
    user?.role === "venue_owner" ||
    user?.impersonated === true;

  const canShowActualArrived =
    canViewActualArrived && workMode === "live";

  useEffect(() => {
    if (!canViewActualArrived) {
      setSeatingMode("regular");
      return;
    }

    setSeatingMode(workMode === "live" ? "live" : "regular");
  }, [canViewActualArrived, workMode, setSeatingMode]);

  useEffect(() => {
    if (!isLiveView) return;

    setWorkMode("live");
    setSeatingMode("live");
  }, [isLiveView, setSeatingMode]);

  useEffect(() => {
    if (isDemo) return;
    if (!user) return;

    if (
      user.role === "producer" &&
      !eventIdFromUrl &&
      !user.impersonated
    ) {
      console.error("Producer dashboard loaded without eventId");
      router.replace("/events");
    }
  }, [user, eventIdFromUrl, router, isDemo]);

  const [selectedGuest, setSelectedGuest] =
    useState<Guest | null>(null);

  const [openAddModal, setOpenAddModal] = useState(false);
  const loadGroups = useGroupStore((s) => s.loadGroups);

  const handleGuestUpdated = async (updatedGuest: Guest) => {
    setGuests((prev) =>
      prev.map((g) => {
        if (String(g._id) !== String(updatedGuest._id)) return g;

        return {
          ...g,

          name: updatedGuest.name,
          phone: updatedGuest.phone,
          relation: updatedGuest.relation,
          rsvp: updatedGuest.rsvp,

          guestsCount: updatedGuest.guestsCount,

          arrivedCount:
            updatedGuest.arrivedCount ??
            (updatedGuest.rsvp === "yes"
              ? updatedGuest.guestsCount
              : 0),

          actualArrivedCount:
            updatedGuest.actualArrivedCount ?? g.actualArrivedCount,

          notes: updatedGuest.notes,
          groupId: updatedGuest.groupId,
          tableName: updatedGuest.tableName,
        };
      })
    );

    const seating = useSeatingStore.getState();

    seating.syncPlannedSeatsForGuest(
      updatedGuest._id,
      updatedGuest.guestsCount
    );

    seating.resetArrivedSeatsForGuest(updatedGuest._id);

    if (invitationId) {
      await loadGroups(invitationId);
    }
  };

  const [showImportModal, setShowImportModal] = useState(false);
  const [showDemoToast, setShowDemoToast] = useState(false);

  const handleDemoBlockedAction = () => {
    setShowDemoToast(true);
  };

  const [invitation, setInvitation] = useState<any | null>(null);
  const [invitationId, setInvitationId] = useState<string>("");

  const [event, setEvent] = useState<EventModel | null>(null);
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [openCallsGuest, setOpenCallsGuest] =
    useState<Guest | null>(null);

  const [search, setSearch] = useState("");

  const [quickFilter, setQuickFilter] =
    useState<QuickFilter>("all");

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  /* ============================================================
     Load user
  ============================================================ */
  async function loadUser() {
    const res = await fetch("/api/me", {
      credentials: "include",
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success) {
      setUser(data.user);
    }
  }

  /* ============================================================
     Load invitation
  ============================================================ */
  async function loadInvitation() {
    if (!user) return;

    if (isVenueView && invitationIdFromUrl) {
      setInvitation({
        _id: invitationIdFromUrl,
        id: invitationIdFromUrl,
        eventId: eventIdFromUrl || "",
        shareId: "",
      });

      setInvitationId(invitationIdFromUrl);
      return;
    }

    const url = eventIdFromUrl
      ? `/api/invitations/by-event/${eventIdFromUrl}`
      : "/api/invitations/my";

    try {
      const res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success || !data?.invitation) {
        setInvitation(null);
        setInvitationId("");
        return;
      }

      setInvitation(data.invitation);
      setInvitationId(data.invitation._id);
    } catch (error) {
      console.error("loadInvitation failed:", error);
      setInvitation(null);
      setInvitationId("");
    }
  }

  async function loadEvent() {
    if (!user) return;

    if (isVenueView) {
      setEvent(null);
      return;
    }

    const url = eventIdFromUrl
      ? `/api/events/${eventIdFromUrl}`
      : "/api/events";

    try {
      const res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success || !data?.event) {
        setEvent(null);
        return;
      }

      setEvent(data.event);
    } catch (error) {
      console.error("loadEvent failed:", error);
      setEvent(null);
    }
  }

  /* ============================================================
     Load guests
  ============================================================ */
  async function loadGuests() {
    if (!invitationId) return;

    const url = isVenueView
      ? `/api/guests?invitation=${encodeURIComponent(
          invitationId
        )}&venueView=1&eventId=${encodeURIComponent(eventIdFromUrl || "")}`
      : `/api/guests?invitation=${encodeURIComponent(invitationId)}`;

    console.log("LOAD GUESTS URL:", url);

    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    console.log("LOAD GUESTS RESPONSE:", data);

    if (!res.ok || data?.success === false) {
      setGuests([]);
      return;
    }

    setGuests(Array.isArray(data.guests) ? data.guests : []);
  }

  async function loadSeatingTables() {
    const eventId =
      eventIdFromUrl ||
      invitation?.eventId ||
      invitation?.event ||
      invitation?.event_id ||
      invitation?.eventDetails?._id;

    if (!eventId) {
      console.warn("No eventId found for seating tables", {
        eventIdFromUrl,
        invitation,
      });
      return;
    }

    try {
      const res = await fetch(
        `/api/seating/tables/${eventId}?invitationId=${encodeURIComponent(
          invitationId
        )}${isVenueView ? "&venueView=1" : ""}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await res.json().catch(() => ({}));

      console.log("SEATING TABLES RESPONSE:", data);

      if (!res.ok || !data.success) {
        console.warn("Failed to load seating tables", data);
        return;
      }

      setSeatingTables(data.tables || []);
    } catch (err) {
      console.error("Load seating tables error:", err);
    }
  }

  const handleExportExcel = async () => {
    if (isDemo) {
      handleDemoBlockedAction();
      return;
    }

    if (!invitationId) {
      alert("לא נמצא אירוע לייצוא");
      return;
    }

    try {
      const res = await fetch(
        `/api/guests/export?invitationId=${invitationId}&mode=${workMode}`,
        {
          credentials: "include",
        }
      );

      if (!res.ok) {
        alert("שגיאה בייצוא לאקסל");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      a.download =
        workMode === "live"
          ? "מוזמנים_הגיעו_בפועל.xlsx"
          : "מוזמנים.xlsx";

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export excel error:", err);
      alert("שגיאת שרת בייצוא");
    }
  };

    async function deleteAllGuests() {
    if (isDemo) {
      alert("מצב דמו – הפעולה לא נשמרת");
      return;
    }

    const canDeleteAllGuests =
  user?.role === "admin" ||
  user?.impersonationRole === "admin" ||
  user?.impersonatedByAdmin === true;

if (!canDeleteAllGuests) {
  alert("אין הרשאת אדמין למחיקת כל המוזמנים");
  return;
}

    if (!invitationId) {
      alert("לא נמצאה הזמנה למחיקה");
      return;
    }

    const firstConfirm = window.confirm(
      "האם למחוק את כל המוזמנים מהאירוע הזה?\nהפעולה תמחק את כל המוזמנים לצמיתות."
    );

    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "אישור סופי: כל המוזמנים יימחקו גם ממסד הנתונים. לא ניתן לשחזר את הפעולה."
    );

    if (!secondConfirm) return;

    try {
      const res = await fetch("/api/admin/guests/delete-all", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "שגיאה במחיקת כל המוזמנים");
        return;
      }

      setGuests([]);
      await loadGuests();

      alert(data.message || "כל המוזמנים נמחקו בהצלחה");
    } catch (err) {
      console.error("Delete all guests error:", err);
      alert("שגיאת שרת במחיקת כל המוזמנים");
    }
  }

  async function deleteGuest(guest: Guest) {
    if (isDemo) {
      alert("מצב דמו – הפעולה לא נשמרת");
      return;
    }

    const ok = window.confirm(
      `האם למחוק את המוזמן "${guest.name}"?\nהפעולה אינה ניתנת לביטול.`
    );

    if (!ok) return;

    try {
      const res = await fetch(`/api/guests/${guest._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        alert("❌ שגיאה במחיקת המוזמן");
        return;
      }

      await loadGuests();
    } catch (err) {
      console.error("Delete guest error:", err);
      alert("❌ שגיאת שרת");
    }
  }

  useEffect(() => {
    if (isDemo) return;
    loadUser();
  }, [isDemo]);

  useEffect(() => {
    if (isDemo) return;
    if (!user) return;

    async function initAfterUser() {
      setLoading(true);

      setEvent(null);
      setInvitation(null);
      setInvitationId("");

      await loadInvitation();
      await loadEvent();

      setLoading(false);
    }

    initAfterUser();
  }, [user, isDemo, isVenueView, invitationIdFromUrl, eventIdFromUrl]);

  useEffect(() => {
    if (isDemo) return;
    if (!user) return;

    if (user.impersonated) return;

    if (user.role !== "producer") return;
    if (!invitation?._id) return;

    const clientId = invitation.ownerId;
    if (!clientId) return;

    fetch("/api/producer/impersonate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
  }, [isDemo, user, invitation?._id]);

  useEffect(() => {
    if (!isDemo) return;

    setUser({ role: "user", plan: "premium" });

    setInvitation({
      _id: "demo",
      shareId: "demo",
      eventDate: new Date().toISOString(),
    });

    setInvitationId("demo");

    setGuests([
      {
        _id: "1",
        name: "אורן לוי",
        phone: "0501234567",
        token: "demo1",
        rsvp: "yes",
        guestsCount: 2,
        tableName: "5",
        relation: "משפחה",
      },
      {
        _id: "2",
        name: "נועה כהן",
        phone: "0529876543",
        token: "demo2",
        rsvp: "pending",
        guestsCount: 1,
        relation: "חברים",
      },
      {
        _id: "3",
        name: "דניאל לוי",
        phone: "0541112233",
        token: "demo3",
        rsvp: "yes",
        guestsCount: 3,
        tableName: "3",
        relation: "משפחה",
      },
      {
        _id: "4",
        name: "מאיה ישראלי",
        phone: "0534445566",
        token: "demo4",
        rsvp: "no",
        guestsCount: 1,
        relation: "חברים",
      },
      {
        _id: "5",
        name: "יוסי כהן",
        phone: "0507778899",
        token: "demo5",
        rsvp: "yes",
        guestsCount: 1,
        tableName: "1",
        relation: "עבודה",
      },
      {
        _id: "6",
        name: "שירה לוי",
        phone: "0523332211",
        token: "demo6",
        rsvp: "pending",
        guestsCount: 2,
        relation: "משפחה",
      },
      {
        _id: "7",
        name: "אלון פרץ",
        phone: "0549991122",
        token: "demo7",
        rsvp: "yes",
        guestsCount: 2,
        tableName: "2",
        relation: "חברים",
      },
      {
        _id: "8",
        name: "רוני אברהם",
        phone: "0506665544",
        token: "demo8",
        rsvp: "pending",
        guestsCount: 1,
        relation: "עבודה",
      },
      {
        _id: "9",
        name: "תמר כהן",
        phone: "0528887766",
        token: "demo9",
        rsvp: "yes",
        guestsCount: 1,
        tableName: "3",
        relation: "משפחה",
      },
      {
        _id: "10",
        name: "איתי רוזן",
        phone: "0532223344",
        token: "demo10",
        rsvp: "no",
        guestsCount: 2,
        relation: "חברים",
      },
    ]);

    setLoading(false);
  }, [isDemo]);

  useEffect(() => {
  if (isDemo) return;
  if (!invitationId) return;

  async function load() {
    await loadGuests();
    await loadSeatingTables();
    setLoading(false);
  }

  load();
}, [invitationId, isDemo, eventIdFromUrl, invitation]);

  useEffect(() => {
    if (isDemo) return;
    if (!invitationId) return;

    loadGroups(invitationId);
  }, [invitationId, isDemo, loadGroups]);

  useEffect(() => {
  if (isDemo) return;
  if (!invitationId) return;

  loadGuests();
  loadSeatingTables();

  const interval = setInterval(() => {
    console.log("🔄 polling guests + seating...");
    loadGuests();
    loadSeatingTables();
  }, 2000);

  return () => clearInterval(interval);
}, [invitationId, eventIdFromUrl, invitation, isVenueView]);

  const guestTableMap = useMemo(() => {
    const map = new Map<string, any>();

    (seatingTables || []).forEach((table: any) => {
      (table.seatedGuests || []).forEach((sg: any) => {
        if (sg?.guestId != null) {
          map.set(String(sg.guestId), table);
        }
      });
    });

    return map;
  }, [seatingTables]);

  /* ============================================================
     Stats
  ============================================================ */
  /* ============================================================
   Stats
   חישוב לפי כמות מוזמנים בפועל, לא לפי מספר רשומות
============================================================ */
const stats = useMemo(() => {
  const getGuestAmount = (guest: Guest) => {
    const amount = Number(guest.guestsCount || 0);
    return amount > 0 ? amount : 0;
  };

  const getComingAmount = (guest: Guest) => {
    /*
      אם יש arrivedCount — משתמשים בו.
      אם אין, אבל הסטטוס הוא yes — סופרים את guestsCount.
      ככה "מגיע" מייצג כמה אנשים אישרו הגעה בפועל.
    */
    if (guest.rsvp !== "yes") return 0;

    const arrived = Number(guest.arrivedCount ?? 0);

    if (arrived > 0) return arrived;

    return getGuestAmount(guest);
  };

  const totalInvited = guests.reduce(
    (sum, guest) => sum + getGuestAmount(guest),
    0
  );

  const totalComing = guests.reduce(
    (sum, guest) => sum + getComingAmount(guest),
    0
  );

  const totalActualArrived = guests.reduce(
    (sum, guest) => sum + Number(guest.actualArrivedCount || 0),
    0
  );

  const totalNo = guests.filter((guest) => guest.rsvp === "no").length;

const totalPending = guests.filter(
  (guest) => guest.rsvp === "pending"
).length;

  return {
    totalGuests: totalInvited,
    comingGuests: totalComing,
    actualArrivedGuests: totalActualArrived,
    notComing: totalNo,
    noResponse: totalPending,
  };
}, [guests]);

const rsvpVisualStats = useMemo(() => {
  const getGuestAmount = (guest: Guest) => {
    const amount = Number(guest.guestsCount || 0);
    return amount > 0 ? amount : 0;
  };

  const getComingAmount = (guest: Guest) => {
    if (guest.rsvp !== "yes") return 0;

    const arrived = Number(guest.arrivedCount ?? 0);

    if (arrived > 0) return arrived;

    return getGuestAmount(guest);
  };

  const coming = guests.reduce(
    (sum, guest) => sum + getComingAmount(guest),
    0
  );

  const notComing = guests.filter((guest) => guest.rsvp === "no").length;

const pending = guests.filter(
  (guest) => guest.rsvp === "pending"
).length;

  const total = coming + notComing + pending;

  return {
    coming,
    notComing,
    pending,
    total,
    comingPercent: calcPercent(coming, total),
    notComingPercent: calcPercent(notComing, total),
    pendingPercent: calcPercent(pending, total),
  };
}, [guests]);

  const recentActivityLogs = useMemo(() => {
    return [...guests]
      .map((guest) => {
        const date = getGuestActivityDate(guest);
        const timestamp = date ? new Date(date).getTime() : 0;

        const count =
          guest.rsvp === "yes"
            ? guest.arrivedCount || guest.guestsCount || 0
            : guest.guestsCount || 0;

        if (guest.rsvp === "yes") {
          return {
            id: guest._id,
            timestamp,
            icon: "✓",
            tone: "green" as const,
            title: `${guest.name} אישר/ה הגעה`,
            subtitle: `${count} מגיעים · ${formatActivityDateTime(date)}`,
          };
        }

        if (guest.rsvp === "no") {
          return {
            id: guest._id,
            timestamp,
            icon: "×",
            tone: "rose" as const,
            title: `${guest.name} סימן/ה שלא מגיע/ה`,
            subtitle: `${formatActivityDateTime(date)}`,
          };
        }

        return {
          id: guest._id,
          timestamp,
          icon: "⌛",
          tone: "gold" as const,
          title: `${guest.name} עדיין לא אישר/ה`,
          subtitle: `${guest.guestsCount || 0} מוזמנים · ${formatActivityDateTime(date)}`,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [guests]);


  /* ============================================================
     קישור אישי להזמנה
  ============================================================ */
  const getGuestInviteLink = (guest: Guest) => {
    if (!invitation?.shareId) return "";
    return `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;
  };

  /* ============================================================
     WhatsApp אישי
  ============================================================ */
  const sendWhatsApp = (guest: Guest) => {
    const inviteLink = getGuestInviteLink(guest);

    const message = `היי ${guest.name}! 💛\nהזמנה אישית מחכה לך 🎉\n${inviteLink}`;

    const cleanPhone =
      typeof guest.phone === "string"
        ? guest.phone.replace(/\D/g, "").replace(/^0/, "")
        : "";

    if (!cleanPhone) return;

    const phone = `972${cleanPhone}`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  type LatestCallRound = {
  roundNumber: number;
  answerStatus: "answered" | "no_answer" | null;
  resultStatus:
    | "yes"
    | "no"
    | "will_reply"
    | "needs_correction"
    | null;
};

function normalizeAnswerStatus(status?: string | null) {
  switch (status) {
    case "answered":
    case "ענה":
      return "answered";

    case "no_answer":
    case "לא ענה":
      return "no_answer";

    default:
      return null;
  }
}

function normalizeResultStatus(status?: string | null) {
  switch (status) {
    case "yes":
    case "מגיע":
      return "yes";

    case "no":
    case "לא מגיע":
      return "no";

    case "will_reply":
    case "ישיב בהודעה":
      return "will_reply";

    case "needs_correction":
    case "ממתין לתיקון":
      return "needs_correction";

    default:
      return null;
  }
}

function getLatestCallRound(guest: Guest): LatestCallRound | null {
  if (!Array.isArray(guest.callRounds) || guest.callRounds.length === 0) {
    return null;
  }

  const rounds = [...guest.callRounds]
    .filter((round) => {
      return (
        round?.answerStatus ||
        round?.resultStatus ||
        round?.status
      );
    })
    .sort(
      (a, b) =>
        Number(b.roundNumber || 0) - Number(a.roundNumber || 0)
    );

  const latest = rounds[0];

  if (!latest) return null;

  const answerStatus =
    normalizeAnswerStatus(latest.answerStatus) ||
    normalizeAnswerStatus(latest.status);

  const resultStatus =
    normalizeResultStatus(latest.resultStatus) ||
    normalizeResultStatus(latest.status);

  return {
    roundNumber: Number(latest.roundNumber || 0),
    answerStatus,
    resultStatus,
  };
}

function getGuestRsvp(guest: Guest) {
  return guest.rsvp || "pending";
}

  /* ============================================================
     פילטר + מיון + חיפוש
  ============================================================ */
  const displayGuests = useMemo(() => {
    let list = [...guests];

    if (quickFilter === "yes") {
  list = list.filter((g) => getGuestRsvp(g) === "yes");
}

if (quickFilter === "no") {
  list = list.filter((g) => getGuestRsvp(g) === "no");
}

if (quickFilter === "noTable") {
  list = list.filter((g) => !(g.tableName && g.tableName.trim()));
}

if (quickFilter === "pending") {
  list = list.filter((g) => getGuestRsvp(g) === "pending");
}

if (quickFilter === "call_answered") {
  list = list.filter((g) => {
    const latestRound = getLatestCallRound(g);

    return (
      latestRound?.answerStatus === "answered"
    );
  });
}

if (quickFilter === "call_no_answer") {
  list = list.filter((g) => {
    const latestRound = getLatestCallRound(g);

    return (
      getGuestRsvp(g) === "pending" &&
      latestRound?.answerStatus === "no_answer"
    );
  });
}

if (quickFilter === "call_answered_yes") {
  list = list.filter((g) => {
    const latestRound = getLatestCallRound(g);

    return (
      getGuestRsvp(g) === "yes" &&
      latestRound?.answerStatus === "answered" &&
      latestRound?.resultStatus === "yes"
    );
  });
}

if (quickFilter === "call_answered_no") {
  list = list.filter((g) => {
    const latestRound = getLatestCallRound(g);

    return (
      getGuestRsvp(g) === "no" &&
      latestRound?.answerStatus === "answered" &&
      latestRound?.resultStatus === "no"
    );
  });
}

if (quickFilter === "call_will_reply") {
  list = list.filter((g) => {
    const latestRound = getLatestCallRound(g);

    return (
      getGuestRsvp(g) === "pending" &&
      latestRound?.answerStatus === "answered" &&
      latestRound?.resultStatus === "will_reply"
    );
  });
}

if (quickFilter === "call_needs_correction") {
  list = list.filter((g) => {
    const latestRound = getLatestCallRound(g);

    return (
      getGuestRsvp(g) === "pending" &&
      latestRound?.answerStatus === "answered" &&
      latestRound?.resultStatus === "needs_correction"
    );
  });
}

    const q = search.trim().toLowerCase();

    if (q) {
      const qDigits = q.replace(/\D/g, "");

      list = list.filter((g) => {
        const name = (g.name || "").toLowerCase();
        const phoneDigits = (g.phone || "").replace(/\D/g, "");

        const nameMatch = name.includes(q);
        const phoneMatch = qDigits
          ? phoneDigits.includes(qDigits)
          : false;

        return nameMatch || phoneMatch;
      });
    }

    if (selectedGroupId) {
      list = list.filter((g) => g.groupId === selectedGroupId);
    }

    list.sort((a, b) => {
      let v1: any;
      let v2: any;

      switch (sortKey) {
        case "name":
          v1 = a.name || "";
          v2 = b.name || "";

          return (
            v1.localeCompare(v2, "he", { sensitivity: "base" }) *
            (sortDir === "asc" ? 1 : -1)
          );

        case "rsvp":
          v1 = a.rsvp || "";
          v2 = b.rsvp || "";
          break;

        case "table":
          v1 = a.tableNumber ?? a.tableName ?? "";
          v2 = b.tableNumber ?? b.tableName ?? "";
          break;

        case "coming":
          v1 = a.arrivedCount || 0;
          v2 = b.arrivedCount || 0;
          break;

        case "invited":
          v1 = a.guestsCount || 0;
          v2 = b.guestsCount || 0;
          break;

        default:
          return 0;
      }

      if (typeof v1 === "number" && typeof v2 === "number") {
        return (v1 - v2) * (sortDir === "asc" ? 1 : -1);
      }

      return (
        String(v1).localeCompare(String(v2), "he", {
          sensitivity: "base",
        }) * (sortDir === "asc" ? 1 : -1)
      );
    });

    return list;
  }, [
    guests,
    quickFilter,
    search,
    selectedGroupId,
    sortKey,
    sortDir,
  ]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }

    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const updateActualArrived = async (guestId: string, next: number) => {
    setGuests((prev) =>
      prev.map((g) =>
        g._id === guestId
          ? { ...g, actualArrivedCount: next }
          : g
      )
    );

    const res = await fetch(`/api/guests/${guestId}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualArrivedCount: next }),
    });

    if (!res.ok) {
      console.warn("actualArrivedCount failed – rollback");
      await loadGuests();
    }
  };

    const updateGuestTableLocally = (
    guestId: string,
    tableData: Partial<Guest>
  ) => {
    setGuests((prev) =>
      prev.map((guest) =>
        String(guest._id) === String(guestId)
          ? {
              ...guest,
              ...tableData,
            }
          : guest
      )
    );
  };

  if (loading) return null;

  console.log("USER FROM /api/me:", user);
  console.log("INVITATION:", invitation);

  const eventTitle = resolveEventTitle(invitation, event);

  const eventDate = resolveInvitationEventDateRaw(invitation);

  const eventTime = resolveInvitationEventTimeRaw(invitation);

  const resolveEventLocation = (invitation: any, event: any) => {
  const name =
    cleanText(invitation?.location?.name) ||
    cleanText(event?.location?.name) ||
    cleanText(invitation?.locationName) ||
    cleanText(event?.locationName) ||
    cleanText(invitation?.eventLocationName) ||
    cleanText(event?.eventLocationName) ||
    cleanText(invitation?.venueName) ||
    cleanText(event?.venueName) ||
    cleanText(invitation?.hallName) ||
    cleanText(event?.hallName);

  const address =
    cleanText(invitation?.location?.address) ||
    cleanText(event?.location?.address) ||
    cleanText(invitation?.eventLocationAddress) ||
    cleanText(event?.eventLocationAddress);

  if (name && address && name !== address) {
    return `${name}, ${address}`;
  }

  return name || address || "טרם הוגדר מיקום";
};

const eventLocation = resolveEventLocation(invitation, event);

const canOpenEventManagement =
  user?.accessModules?.eventProduction === true ||
  user?.includeEventManagement === true ||
  user?.selfManageEnabled === true;

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div
      className="
        min-h-screen
        bg-[#F6F1EA]
        px-4
        py-6
        md:px-8
        md:py-7
        max-w-full
        overflow-x-hidden
      "
      dir="rtl"
    >
      <main className="mx-auto w-full max-w-[1540px]">
      {isDemo && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm">
          <p className="text-sm leading-relaxed">
            🧪 <strong>מצב דמו פעיל</strong> – המערכת פתוחה לצפייה
            בדשבורד, סידורי הושבה והודעות. רוצים גישה מלאה לכל
            הפונקציות?{" "}
            <a
              href="https://www.invistimo.com/pricing"
              className="
                font-semibold
                text-amber-700
                underline
                underline-offset-2
                hover:text-amber-900
                transition
              "
            >
              הצטרפו עכשיו
            </a>
          </p>
        </div>
      )}

      {/* ===================== HERO זהב / לבן / ברונזה ===================== */}
      <section className="mb-6">
        <GoldenEventHero
          title={eventTitle}
          date={formatEventDate(eventDate)}
          eventDateRaw={eventDate}
          time={eventTime}
          location={eventLocation}
          responsePercent={rsvpVisualStats.comingPercent}
          workMode={workMode}
          canViewActualArrived={canViewActualArrived}
          setWorkMode={setWorkMode}
        />
      </section>

      {/* ===================== MAIN DASHBOARD LAYOUT ===================== */}
      <section
        className="
          grid
          grid-cols-1
          xl:grid-cols-[340px_minmax(0,1fr)]
          gap-5
          items-start
          mb-7
        "
      >
        {/* צד ימין: פרטי אירוע + פעילות אחרונה */}
        <aside className="grid grid-cols-1 gap-5 min-w-0">
          <GoldenEventDetailsCard
            title={eventTitle}
            date={formatEventDate(eventDate)}
            time={eventTime}
            location={eventLocation}
            onOpen={() => {
              if (!invitation) return;

              if (isDemo) {
                handleDemoBlockedAction();
                return;
              }

              router.push(`/dashboard/invitations/${invitationId}/edit`);
            }}
          />

          <GoldenRecentActivityCard logs={recentActivityLogs} />
        </aside>

        {/* צד שמאל: כפתורים, אחוזים, גרפים */}
        <section className="min-w-0">
          <GoldenActionButtons
  invitation={invitation}
  invitationId={invitationId}
  isDemo={isDemo}
  router={router}
  onDemoBlocked={handleDemoBlockedAction}
  onImport={() => setShowImportModal(true)}
  onExportExcel={handleExportExcel}
  canOpenEventManagement={canOpenEventManagement}
  eventId={eventIdFromUrl || invitation?.eventId || invitation?.event || invitation?.event_id || ""}
/>

          {/* תיוגים קיימים מהשרת */}
          <div className="mt-4 flex flex-wrap gap-3">
            {user?.includeCalls ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D9B46F]/40 bg-white/80 px-4 py-2 text-sm font-black text-[#8B5E34] shadow-sm">
                ☎️ כולל שירות שיחות אישורי הגעה (3 סבבים)
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 shadow-sm">
                ⚠️ ללא שירות שיחות טלפוניים
              </div>
            )}

            {user?.includeCreditGifts && (
              <>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 shadow-sm">
                  💳 כולל מתנות באשראי לאורחים
                </div>

                <a
                  href="https://ktzr.io/giftInvistimoSignup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-2 rounded-full bg-[#8B5E34] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#6F4726]"
                >
                  🔗 קישור הרשמה למתנות באשראי
                </a>
              </>
            )}
          </div>

          

          {/* אחוזים / סטטיסטיקות */}
          <section className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GoldenStatCard
              title="סה״כ מוזמנים"
              value={stats.totalGuests}
              icon="👥"
              tone="bronze"
              description="כלל המוזמנים"
            />

            <GoldenStatCard
              title="מגיע"
              value={stats.comingGuests}
              icon="✓"
              tone="green"
              description="אישרו הגעה"
            />

            <GoldenStatCard
              title="לא מגיע"
              value={stats.notComing}
              icon="×"
              tone="rose"
              description="סימנו שלא מגיעים"
            />

            <GoldenStatCard
              title="בהמתנה"
              value={stats.noResponse}
              icon="⌛"
              tone="gold"
              description="טרם השיבו"
            />

            {canShowActualArrived && (
              <GoldenStatCard
                title="מגיעים בפועל"
                value={stats.actualArrivedGuests}
                icon="●"
                tone="blue"
                description="נכנסו באירוע"
              />
            )}
          </section>

          {/* גרפים */}
          <section className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <GoldenStatusBarsCard
              coming={rsvpVisualStats.coming}
              notComing={rsvpVisualStats.notComing}
              pending={rsvpVisualStats.pending}
              total={rsvpVisualStats.total}
            />

            <GoldenDonutCard
              coming={rsvpVisualStats.coming}
              notComing={rsvpVisualStats.notComing}
              pending={rsvpVisualStats.pending}
              total={rsvpVisualStats.total}
            />
          </section>
        </section>
      </section>

      {/* ===================== CONTROLS ===================== */}
      <section className="mb-5">
                <GuestsControls
  search={search}
  setSearch={setSearch}
  groups={groups}
  selectedGroupId={selectedGroupId}
  setSelectedGroupId={setSelectedGroupId}
  onManageGroups={() => setOpenGroupModal(true)}
  quickFilter={quickFilter}
  setQuickFilter={setQuickFilter}
  totalCount={guests.length}
  displayCount={displayGuests.length}
  recordsLimit={Number(user?.guests || 0)}
  usedRecordsCount={guests.length}
  onExportExcel={handleExportExcel}
  onAddGuest={() => setOpenAddModal(true)}
  disabledAddGuest={!invitation}
/>
      </section>

      {/* ===================== DESKTOP TABLE ===================== */}
      <div
        className="
          hidden
          md:block
          w-full
          overflow-x-auto
          max-h-[70vh]
          overflow-y-auto
          rounded-[28px]
          border
          border-[#E7DED1]
          bg-white
          shadow-[0_18px_50px_rgba(30,27,46,0.07)]
        "
      >
        <table className="min-w-[1450px] w-full table-auto">
          <thead className="bg-[#F2EEE8] sticky top-0 z-10 whitespace-nowrap">
            <tr>
              <th
                className="p-4 text-right cursor-pointer select-none text-xs font-black text-[#5F564D]"
                onClick={() => toggleSort("name")}
              >
                שם מלא{sortArrow("name")}
              </th>

              <th className="p-4 text-right text-xs font-black text-[#5F564D]">
                טלפון
              </th>

              <th className="p-4 text-right text-xs font-black text-[#5F564D]">
                קרבה
              </th>

              <th className="p-4 text-right text-xs font-black text-[#5F564D]">
                קבוצה
              </th>

              <th
                className="p-4 text-right cursor-pointer select-none text-xs font-black text-[#5F564D]"
                onClick={() => toggleSort("rsvp")}
              >
                סטטוס{sortArrow("rsvp")}
              </th>

              <th
                className="p-4 text-right cursor-pointer select-none text-xs font-black text-[#5F564D]"
                onClick={() => toggleSort("invited")}
              >
                מוזמנים{sortArrow("invited")}
              </th>

              <th
                className="p-4 text-right cursor-pointer select-none text-xs font-black text-[#5F564D]"
                onClick={() => toggleSort("coming")}
              >
                מגיעים{sortArrow("coming")}
              </th>

              {canShowActualArrived && (
                <th className="p-4 text-right text-xs font-black text-[#5F564D]">
                  מגיעים בפועל
                </th>
              )}

              <th
                className="p-4 text-right cursor-pointer select-none text-xs font-black text-[#5F564D]"
                onClick={() => toggleSort("table")}
              >
                מס׳ שולחן{sortArrow("table")}
              </th>

{canShowActualArrived && (
                <th className="p-4 text-right text-xs font-black text-[#5F564D]">
                  שינוי שולחן
                </th>
              )}

              <th className="p-4 text-right text-xs font-black text-[#5F564D]">
                הערות
              </th>

              <th className="p-4 text-right text-xs font-black text-[#5F564D]">
                הזמנת אורח
              </th>

              <th className="p-4 text-right text-xs font-black text-[#5F564D]">
                פעולות
              </th>
            </tr>
          </thead>

          <tbody>
            {displayGuests.map((g) => (
              <tr
                key={g._id}
                className="
                  border-b
                  border-[#F0ECE6]
                  hover:bg-[#FBFAF7]
                  transition
                "
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#E9DDC8] to-[#F7F0E4] border border-[#E7DED1] flex items-center justify-center text-xs font-black text-[#8B6A2E]">
                      {g.name?.trim()?.slice(0, 1) || "?"}
                    </div>

                    <span className="font-bold text-[#1E1B2E]">
                      {g.name}
                    </span>
                  </div>
                </td>

                <td className="p-4 text-sm text-[#5F564D]">
                  {formatPhone(g.phone)}
                </td>

                <td className="p-4 text-sm text-[#5F564D]">
                  {g.relation?.trim() || "-"}
                </td>

                <td className="p-4">
                  <GuestGroupSelect
                    value={g.groupId}
                    onChange={async (groupId) => {
                      setGuests((prev) =>
                        prev.map((guest) =>
                          guest._id === g._id
                            ? { ...guest, groupId }
                            : guest
                        )
                      );

                      await fetch(`/api/guests/${g._id}`, {
                        method: "PUT",
                        credentials: "include",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ groupId }),
                      });

                      await loadGroups(invitationId);
                    }}
                  />
                </td>

                <td className="p-4">
                  <span
                    className={`
                      inline-flex
                      items-center
                      justify-center
                      gap-2
                      min-w-[92px]
                      rounded-full
                      border
                      px-3
                      py-1.5
                      text-xs
                      font-black
                      ${RSVP_STATUS_CLASSES[g.rsvp]}
                    `}
                  >
                    <span
                      className={`
                        h-2
                        w-2
                        rounded-full
                        ${RSVP_STATUS_DOT[g.rsvp]}
                      `}
                    />

                    {RSVP_STATUS_LABELS[g.rsvp]}
                  </span>
                </td>

                <td className="p-4 font-bold text-[#1E1B2E]">
                  {g.guestsCount}
                </td>

                <td className="p-4 font-black text-emerald-700">
                  {g.arrivedCount || 0}
                </td>

                {canShowActualArrived && (
                  <td className="p-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#E7DED1] bg-white px-2 py-1">
                      <button
                        onClick={() => {
                          const next = Math.max(
                            0,
                            (g.actualArrivedCount || 0) - 1
                          );

                          updateActualArrived(g._id, next);
                        }}
                        className="h-7 w-7 rounded-full bg-[#F7F4EF] hover:bg-[#EFE8DE] font-black"
                      >
                        −
                      </button>

                      <span className="min-w-[22px] text-center font-black text-[#1E1B2E]">
                        {g.actualArrivedCount || 0}
                      </span>

                      <button
                        onClick={() => {
                          const next = (g.actualArrivedCount || 0) + 1;
                          updateActualArrived(g._id, next);
                        }}
                        className="h-7 w-7 rounded-full bg-[#F7F4EF] hover:bg-[#EFE8DE] font-black"
                      >
                        +
                      </button>
                    </div>
                  </td>
                )}

                <td className="p-4 font-bold text-[#1E1B2E] whitespace-nowrap min-w-[120px]">
  <span className="inline-flex items-center whitespace-nowrap">
    {(() => {
      const guestKey = String(g.id ?? g._id ?? "");
      const tableFromStore =
        guestTableMap.get(guestKey) || null;

      const tableLabel =
        (tableFromStore && tableFromStore.name) ||
        (g.tableName
          ? g.tableName
          : g.tableNumber
            ? `שולחן ${g.tableNumber}`
            : null);

      return tableLabel || "-";
    })()}
  </span>
</td>

                {canShowActualArrived && (
                  <td className="p-4">
                    <LiveGuestTableSelect
  eventId={
    String(
      eventIdFromUrl ||
        invitation?.eventId ||
        invitation?.event ||
        invitation?.event_id ||
        invitation?.eventDetails?._id ||
        ""
    )
  }
  guest={g}
  tables={seatingTables || []}
  onUpdated={(tableData: Partial<Guest>) =>
    updateGuestTableLocally(g._id, tableData)
  }
  onTablesUpdated={(nextTables: any[]) => setSeatingTables(nextTables)}
  onRefresh={async () => {
    await loadGuests();
    await loadSeatingTables();
  }}
/>
                  </td>
                )}

                <td className="p-4 text-sm text-[#5F564D]">
                  {g.notes?.trim() || "-"}
                </td>

                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <button
                      title="פתיחת הזמנה"
                      onClick={() => {
                        const link = getGuestInviteLink(g);
                        if (!link) return;

                        window.open(
                          link,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                      className="hover:opacity-70 text-[#8b6a2e]"
                    >
                      🔗
                    </button>

                    <button
                      title="העתקת קישור"
                      onClick={async () => {
                        const link = getGuestInviteLink(g);
                        if (!link) return;

                        await navigator.clipboard.writeText(link);
                        alert("📋 הקישור הועתק");
                      }}
                      className="hover:opacity-70 text-gray-600"
                    >
                      📋
                    </button>
                  </div>
                </td>

                <td className="p-4">
                  <div className="flex gap-2">
                    <IconAction
                      title="מעקב סבבי שיחה"
                      onClick={() => setOpenCallsGuest(g)}
                    >
                      📞
                    </IconAction>

                    <IconAction
                      title="שליחת הודעת וואטסאפ אישית"
                      onClick={() => sendWhatsApp(g)}
                    >
                      💬
                    </IconAction>

                    <IconAction
                      title="עריכת מוזמן"
                      onClick={() => setSelectedGuest(g)}
                    >
                      ✏️
                    </IconAction>

                    <IconAction
                      title="מחיקת מוזמן"
                      onClick={() => deleteGuest(g)}
                      danger
                    >
                      🗑️
                    </IconAction>
                  </div>
                </td>
              </tr>
            ))}

            {displayGuests.length === 0 && (
              <tr>
                <td
                  colSpan={canShowActualArrived ? 13 : 11}
                  className="p-10 text-center text-gray-500"
                >
                  לא נמצאו תוצאות.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===================== MOBILE LIST ===================== */}
      <div className="md:hidden">
        <GuestsMobileList
          guests={displayGuests}
          onEdit={(g) => setSelectedGuest(g)}
          onDelete={(g) => deleteGuest(g)}
          onMessage={(g) =>
            router.push(
              isDemo
                ? `/try/dashboard/messages/new?guestId=${g._id}`
                : `/dashboard/messages/new?guestId=${g._id}`
            )
          }
          onSeat={(g) =>
            router.push(
              isDemo
                ? `/try/dashboard/seating?from=personal&guestId=${g._id}`
                : `/dashboard/seating?from=personal&guestId=${g._id}`
            )
          }
          onInviteLink={(g) => {
            const link = getGuestInviteLink(g);
            if (!link) return;

            window.open(link, "_blank", "noopener,noreferrer");
          }}
        />
      </div>

      {selectedGuest && (
        <EditGuestModal
          guest={selectedGuest}
          userRole={user?.role}
          onClose={() => setSelectedGuest(null)}
          onSuccess={handleGuestUpdated}
        />
      )}

      {openCallsGuest && (
        <CallRoundsModal
          guest={openCallsGuest}
          onClose={() => setOpenCallsGuest(null)}
          onUpdated={(updatedGuest: Guest) => {
            setGuests((prev) =>
              prev.map((g) =>
                g._id === updatedGuest._id ? updatedGuest : g
              )
            );
          }}
        />
      )}

      {openAddModal && (
        <AddGuestModal
          invitationId={invitationId}
          onClose={() => setOpenAddModal(false)}
          onSuccess={async (newGuest?: Guest) => {
            if (newGuest) {
              setGuests((prev) => [...prev, newGuest]);
              return;
            }

            await loadGuests();
          }}
        />
      )}

      {showImportModal && (
  <ImportExcelModal
    invitationId={invitationId}
    guestLimit={Number(user?.guests || 0)}
    user={user}
    onClose={() => setShowImportModal(false)}
    onSuccess={async () => {
      await Promise.all([
        loadGroups(invitationId),
        loadGuests(),
      ]);
    }}
  />
)}

      <DemoToast
        open={showDemoToast}
        onClose={() => setShowDemoToast(false)}
      />

      <ManageGroupsModal
        open={openGroupModal}
        onClose={() => setOpenGroupModal(false)}
        invitationId={invitationId}
      />
      </main>
    </div>
  );
}


/* ============================================================
   New Golden Dashboard UI helpers
============================================================ */
function GoldenEventHero({
  title,
  date: _date,
  eventDateRaw,
  time,
  location: _location,
  responsePercent: _responsePercent,
  workMode,
  canViewActualArrived,
  setWorkMode,
}: {
  title: string;
  date: string;
  eventDateRaw?: string;
  time: string;
  location: string;
  responsePercent: number;
  workMode: "regular" | "live";
  canViewActualArrived: boolean;
  setWorkMode: (mode: "regular" | "live") => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const countdown = useMemo(
    () => getEventCountdown(eventDateRaw, time, now),
    [eventDateRaw, time, now]
  );

  void _date;
  void _location;
  void _responsePercent;

  return (
    <div
      className="
        relative
        min-h-[214px]
        overflow-hidden
        rounded-[36px]
        border
        border-[#E3D0B8]
        bg-[#FFFDF9]
        shadow-[0_22px_70px_rgba(92,65,35,0.10)]
      "
    >
      {/* רקע קבוע לכרטיסייה העליונה: public/background1.png */}
      <div
        className="
          absolute
          inset-0
          bg-no-repeat
        "
        style={{
          backgroundImage: "url('/background1.png')",
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
        }}
      />

      {/* שכבת הגנה עדינה כדי שהכתב יישאר קריא */}
      <div
        className="
          absolute
          inset-0
          bg-gradient-to-l
          from-white/46
          via-white/18
          to-transparent
        "
      />

      <div className="absolute right-[46px] top-[42px] text-[42px] text-[#B8844F] opacity-80 rotate-[-10deg]">
        ✦
      </div>

      {countdown.isEventDay && (
        <>
          {/* 🎇 זיקוקים על כל הכרטיסייה העליונה ביום האירוע */}
          <CountdownFireworksCanvas />

          <div
            className="
              pointer-events-none
              absolute
              inset-0
              z-20
              bg-gradient-to-b
              from-white/10
              via-transparent
              to-white/16
            "
          />
        </>
      )}

      <div
        dir="ltr"
        className="
          relative
          z-30
          grid
          grid-cols-1
          xl:grid-cols-[360px_minmax(0,1fr)]
          items-center
          gap-7
          px-7
          py-7
          md:px-9
          min-h-[214px]
        "
      >
        {/* צד שמאל: מצב רגיל / LIVE בלבד */}
        <div
          dir="rtl"
          className="order-2 xl:order-1 justify-self-start self-center"
        >
          {canViewActualArrived && (
            <div className="flex w-fit items-center gap-2 rounded-full border border-[#E3D0B8] bg-white/85 p-1 shadow-sm backdrop-blur-[2px]">
              <button
                onClick={() => setWorkMode("regular")}
                className={`
                  px-5 py-2.5 rounded-full text-sm font-black transition
                  ${
                    workMode === "regular"
                      ? "bg-[#241A2E] text-white shadow"
                      : "text-[#7B6857] hover:bg-[#F8EFE3]"
                  }
                `}
              >
                מצב רגיל
              </button>

              <button
                onClick={() => setWorkMode("live")}
                className={`
                  px-5 py-2.5 rounded-full text-sm font-black transition
                  ${
                    workMode === "live"
                      ? "bg-[#B85C3A] text-white shadow"
                      : "text-[#7B6857] hover:bg-[#F8EFE3]"
                  }
                `}
              >
                LIVE
              </button>
            </div>
          )}
        </div>

        {/* צד ימין: רק שם האירוע + ספירה לאחור */}
        <div
          dir="rtl"
          className="
            order-1
            xl:order-2
            text-right
            justify-self-end
            self-center
            w-full
            max-w-[760px]
          "
        >
          <h1
            className="
              text-4xl
              md:text-5xl
              font-black
              text-[#241A14]
              tracking-tight
              drop-shadow-[0_2px_12px_rgba(255,255,255,0.96)]
            "
          >
            {title}
          </h1>

          <GoldenCountdown countdown={countdown} />
        </div>
      </div>
    </div>
  );
}

function GoldenActionButtons({
  invitation,
  invitationId,
  isDemo,
  router,
  onDemoBlocked,
  onImport,
  onExportExcel,
  canOpenEventManagement,
  eventId,
}: {
  invitation: any | null;
  invitationId: string;
  isDemo: boolean;
  router: any;
  onDemoBlocked: () => void;
  onImport: () => void;
  onExportExcel: () => void;
  canOpenEventManagement: boolean;
  eventId?: string;
}) {

    const [openInviteMenu, setOpenInviteMenu] = useState(false);

  return (
    <section>
  <div className="hidden md:flex flex-wrap gap-3 items-center">
    {/* 1️⃣ הזמנה - תת תפריט עריכה / צפייה */}
    <div className="relative">
      <GoldenActionButton
        label={invitation ? "הזמנה" : "יצירת הזמנה"}
        icon="✎"
        tone="dark"
        withChevron={!!invitation}
        onClick={() => {
          if (!invitation) {
            if (isDemo) {
              onDemoBlocked();
              return;
            }

            router.push("/dashboard/create-invite");
            return;
          }

          setOpenInviteMenu((prev) => !prev);
        }}
      />

      {invitation && openInviteMenu && (
        <>
          {/* שכבת סגירה בלחיצה מחוץ לתפריט */}
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpenInviteMenu(false)}
            aria-label="סגירת תפריט הזמנה"
          />

          <div
            className="
              absolute
              right-0
              top-[calc(100%+10px)]
              z-50
              w-[230px]
              overflow-hidden
              rounded-[22px]
              border
              border-[#E3D6C3]
              bg-white
              shadow-[0_18px_45px_rgba(36,26,46,0.16)]
            "
          >
            <button
              type="button"
              onClick={() => {
                setOpenInviteMenu(false);

                if (isDemo) {
                  onDemoBlocked();
                  return;
                }

                router.push(`/dashboard/edit-invite/${invitationId}`);
              }}
              className="
                flex
                w-full
                items-center
                justify-between
                gap-3
                px-5
                py-4
                text-right
                text-sm
                font-black
                text-[#241A14]
                transition
                hover:bg-[#FBF7F0]
              "
            >
              <span>עריכת הזמנה</span>
              <span className="text-[#B8844F]">✎</span>
            </button>

            <div className="h-px bg-[#EFE4D6]" />

            <button
              type="button"
              onClick={() => {
                setOpenInviteMenu(false);

                if (isDemo) {
                  onDemoBlocked();
                  return;
                }

                window.open(
                  `https://www.invistimo.com/invite/${invitation.shareId}`,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
              className="
                flex
                w-full
                items-center
                justify-between
                gap-3
                px-5
                py-4
                text-right
                text-sm
                font-black
                text-[#241A14]
                transition
                hover:bg-[#FBF7F0]
              "
            >
              <span>צפייה בהזמנה</span>
              <span className="text-[#241A14]">◉</span>
            </button>
          </div>
        </>
      )}
    </div>

    {/* 2️⃣ עריכת פרטי האירוע */}
    <GoldenActionButton
      label="עריכת פרטי האירוע"
      icon="✎"
      tone="light"
      disabled={!invitation}
      onClick={() => {
        if (!invitation) return;

        if (isDemo) {
          onDemoBlocked();
          return;
        }

        router.push(`/dashboard/invitations/${invitationId}/edit`);
      }}
    />

    {/* 3️⃣ ניהול אירוע - אפסייל */}
{canOpenEventManagement && (
  <GoldenActionButton
    label="ניהול אירוע"
    icon="◆"
    tone="gold"
    disabled={!invitation}
    onClick={() => {
      if (!invitation) return;

      if (isDemo) {
        onDemoBlocked();
        return;
      }

      const target = eventId
        ? `/events/production?eventId=${eventId}&tab=overview`
        : "/events/production?tab=overview";

      router.push(target);
    }}
  />
)}

    {/* 4️⃣ ייבוא מאקסל */}
    <GoldenActionButton
      label="ייבוא מאקסל"
      icon="▣"
      tone="excel"
      disabled={!invitation}
      onClick={onImport}
    />

    {/* 5️⃣ סידורי הושבה */}
    <GoldenActionButton
      label="סידורי הושבה"
      icon="♜"
      tone="gold"
      disabled={!invitation}
      onClick={() =>
        router.push(
          isDemo
            ? "/try/dashboard/seating"
            : "/dashboard/seating"
        )
      }
    />

    {/* 6️⃣ שליחת הודעות */}
    <GoldenActionButton
      label="שליחת הודעות"
      icon="↗"
      tone="green"
      disabled={!invitation}
      onClick={() =>
        router.push(
          isDemo
            ? "/try/dashboard/messages/new"
            : "/dashboard/messages/new"
        )
      }
    />
  </div>


      <div className="flex md:hidden flex-col gap-3">
        <button
          onClick={() => {
            if (isDemo) {
              onDemoBlocked();
              return;
            }
            router.push(
              invitation
                ? `/dashboard/edit-invite/${invitationId}`
                : "/dashboard/create-invite"
            );
          }}
          className="h-[54px] rounded-2xl font-black bg-[#241A2E] text-white"
        >
          <span className="text-[#D8A85F]">✎</span>{" "}
          {invitation ? "עריכת הזמנה" : "יצירת הזמנה"}
        </button>

        <button
          onClick={onImport}
          disabled={!invitation}
          className={`h-[54px] rounded-2xl font-black border ${
            invitation
              ? "bg-white border-[#E3D6C3] text-[#241A14]"
              : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
          }`}
        >
          <span className="text-emerald-600">▣</span> ייבוא מאקסל
        </button>

        
      </div>
    </section>
  );
}

function GoldenActionButton({
  label,
  icon,
  tone,
  disabled,
  withChevron,
  onClick,
}: {
  label: string;
  icon: string;
  tone: "dark" | "light" | "gold" | "green" | "excel";
  disabled?: boolean;
  withChevron?: boolean;
  onClick: () => void;
}) {
  const toneClass: Record<string, string> = {
    dark:
  "bg-gradient-to-l from-[#F2665E] via-[#FF7A6E] to-[#FF9A8A] text-white shadow-[0_12px_24px_rgba(242,102,94,0.24)] hover:shadow-[0_16px_30px_rgba(242,102,94,0.34)]",
    light: "bg-white border border-[#E3D6C3] text-[#241A14] shadow-[0_8px_20px_rgba(80,55,32,0.06)] hover:bg-[#FBF7F0]",
    gold: "bg-gradient-to-l from-[#B8844F] to-[#D9B46F] text-white shadow-[0_12px_24px_rgba(184,132,79,0.24)]",
    green: "bg-gradient-to-l from-[#007A47] to-[#10A66A] text-white shadow-[0_12px_24px_rgba(16,166,106,0.22)]",
    excel: "bg-white border border-[#E3D6C3] text-[#241A14] shadow-[0_8px_20px_rgba(80,55,32,0.06)] hover:bg-[#FBF7F0]",
  };

  const disabledClass =
    "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group
        h-[54px]
        min-w-[166px]
        rounded-[16px]
        px-6
        font-black
        text-sm
        flex
        items-center
        justify-center
        gap-3
        transition-all
        duration-200
        ${disabled ? disabledClass : toneClass[tone]}
        ${disabled ? "" : "hover:-translate-y-0.5"}
      `}
    >
      <span
        className={`text-xl leading-none ${
          tone === "dark"
            ? "text-[#D8A85F]"
            : tone === "excel"
              ? "text-emerald-600"
              : "text-current"
        }`}
      >
        {icon}
      </span>
      {label}
      {withChevron && <span className="text-current/80 text-sm">⌄</span>}
    </button>
  );
}


function buildCountdownTarget(eventDateRaw?: string, time?: string) {
  if (!eventDateRaw) return null;

  const raw = String(eventDateRaw).trim();

  const timeMatch = String(time || "").match(/(\d{1,2}):(\d{2})/);
  const hours = timeMatch ? Number(timeMatch[1]) : 0;
  const minutes = timeMatch ? Number(timeMatch[2]) : 0;

  // Timestamp from DB
  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw);
    const date = new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric);

    if (!Number.isNaN(date.getTime())) {
      date.setHours(hours, minutes, 0, 0);
      return date;
    }
  }

  // Israeli format: 7.5.2026 / 07/05/2026 / 07-05-2026
  const israeliDateMatch = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);

  if (israeliDateMatch) {
    const day = Number(israeliDateMatch[1]);
    const month = Number(israeliDateMatch[2]);
    const year = Number(israeliDateMatch[3]);

    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // ISO / Mongo date: 2026-05-17 or 2026-05-17T...
  const isoDatePart = raw.split("T")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDatePart)) {
    const [year, month, day] = isoDatePart.split("-").map(Number);
    const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(raw);

  if (Number.isNaN(fallback.getTime())) {
    return null;
  }

  fallback.setHours(hours, minutes, 0, 0);
  return fallback;
}

function getEventCountdown(
  eventDateRaw: string | undefined,
  time: string,
  now: number
) {
  const target = buildCountdownTarget(eventDateRaw, time);

  if (!target) {
    return {
  months: 0,
  weeks: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  isMissing: true,
  isEventDay: false,
  isPast: false,
};
  }

  const current = new Date(now);

  const sameCalendarDay =
    current.getFullYear() === target.getFullYear() &&
    current.getMonth() === target.getMonth() &&
    current.getDate() === target.getDate();

  let diff = Math.max(0, target.getTime() - now);

  const second = 1000;
  const hour = 60 * 60 * second;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;

  const months = Math.floor(diff / month);
  diff -= months * month;

  const weeks = Math.floor(diff / week);
  diff -= weeks * week;

  const days = Math.floor(diff / day);
  diff -= days * day;

  const hours = Math.floor(diff / hour);
diff -= hours * hour;

const minutes = Math.floor(diff / (60 * second));
diff -= minutes * 60 * second;

const seconds = Math.floor(diff / second);

return {
  months,
  weeks,
  days,
  hours,
  minutes,
  seconds,
  isMissing: false,
  isEventDay: sameCalendarDay,
  isPast: target.getTime() < now && !sameCalendarDay,
};
}


function CountdownFireworksCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const context = canvasElement.getContext("2d");
    if (!context) return;

    const canvas = canvasElement;
    const ctx = context;

    let w = 0;
    let h = 0;

    const particles: {
      x: number;
      y: number;
      r: number;
      c: string;
      vx: number;
      vy: number;
      g: number;
      a: number;
      fade: number;
    }[] = [];

    const colors = ["#ffcc70", "#ff758c", "#c9b48f", "#ffffff"];

    function hexToRgb(hex: string) {
      const bigint = parseInt(hex.slice(1), 16);

      return [
        (bigint >> 16) & 255,
        (bigint >> 8) & 255,
        bigint & 255,
      ].join(",");
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      w = rect.width;
      h = rect.height;

      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createBurst(x: number, y: number) {
      const count = 34;

      for (let i = 0; i < count; i++) {
        particles.push({
          x,
          y,
          r: Math.random() * 2.2 + 0.9,
          c: colors[(Math.random() * colors.length) | 0],
          vx: (Math.random() * 2 - 1) * (2.2 + Math.random() * 2.2),
          vy: -(2.0 + Math.random() * 3.2),
          g: 0.06 + Math.random() * 0.04,
          a: 1,
          fade: 0.012 + Math.random() * 0.012,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.a -= p.fade;

        if (p.a <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hexToRgb(p.c)},${p.a})`;
        ctx.fill();
      }

      rafRef.current = window.requestAnimationFrame(draw);
    }

    resize();

    intervalRef.current = window.setInterval(() => {
      createBurst(
        Math.random() * w,
        Math.random() * (h * 0.68) + h * 0.08
      );
    }, 520);

    draw();

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);

      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      aria-hidden="true"
    />
  );
}

function GoldenCountdown({
  countdown,
}: {
  countdown: {
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isMissing: boolean;
  isEventDay: boolean;
  isPast: boolean;
};
}) {
  if (countdown.isMissing) {
    return (
      <div className="mt-5 inline-flex rounded-2xl border border-[#E3D6C3] bg-white/82 px-5 py-3 text-sm font-black text-[#8A7A68] shadow-sm backdrop-blur-[2px]">
        טרם הוגדר תאריך לספירה לאחור
      </div>
    );
  }

  if (countdown.isEventDay) {
    return (
      <div
        dir="ltr"
        className="mt-5 grid grid-cols-2 sm:grid-cols-6 gap-2 max-w-[760px]"
      >
        <CountdownUnit label="חודשים" value={countdown.months} />
        <CountdownUnit label="שבועות" value={countdown.weeks} />
        <CountdownUnit label="ימים" value={countdown.days} />
        <CountdownUnit label="שעות" value={countdown.hours} />
        <CountdownUnit label="דקות" value={countdown.minutes} />
        <CountdownUnit label="שניות" value={countdown.seconds} isLive />
      </div>
    );
  }

  if (countdown.isPast) {
    return (
      <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-[#E3D6C3] bg-white/82 px-5 py-3 text-sm font-black text-[#8A7A68] shadow-sm backdrop-blur-[2px]">
        <span>✨</span>
        <span>האירוע הסתיים</span>
      </div>
    );
  }

  return (
  <div
    dir="ltr"
    className="mt-5 grid grid-cols-2 sm:grid-cols-6 gap-2 max-w-[760px]"
  >
    <CountdownUnit label="חודשים" value={countdown.months} />
    <CountdownUnit label="שבועות" value={countdown.weeks} />
    <CountdownUnit label="ימים" value={countdown.days} />
    <CountdownUnit label="שעות" value={countdown.hours} />
    <CountdownUnit label="דקות" value={countdown.minutes} />
    <CountdownUnit label="שניות" value={countdown.seconds} isLive />
  </div>
);
}

function CountdownUnit({
  label,
  value,
  isLive,
}: {
  label: string;
  value: number;
  isLive?: boolean;
}) {
  return (
    <div
      className={`
        relative
        overflow-hidden
        rounded-2xl
        border
        border-[#E3D6C3]
        bg-white/86
        px-3
        py-3
        text-center
        shadow-[0_10px_22px_rgba(80,55,32,0.08)]
        backdrop-blur-[2px]
        ${isLive ? "ring-1 ring-[#D9B46F]/40" : ""}
      `}
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-l from-[#B8844F] via-[#D9B46F] to-[#F2D9A6]" />

      <div className="text-2xl font-black text-[#241A14] leading-none tabular-nums">
        {String(value).padStart(2, "0")}
      </div>

      <div className="mt-1 text-[11px] font-bold text-[#8A7A68]">
        {label}
      </div>
    </div>
  );
}

function GoldenHeroDetail({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/70 border border-[#E3D6C3] px-4 py-3 shadow-sm min-w-0">
      <div className="h-9 w-9 rounded-xl bg-[#F8EFE3] text-[#9B6A35] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-[#9A8775] font-bold">{title}</div>
        <div className="text-sm font-black text-[#241A14] truncate">
          {value}
        </div>
      </div>
    </div>
  );
}

function GoldenStatCard({
  title,
  value,
  tone,
  icon,
  description,
}: {
  title: string;
  value: number;
  tone: "bronze" | "green" | "rose" | "gold" | "blue";
  icon: string;
  description: string;
}) {
  const styles = {
    bronze: {
      wrap: "bg-white border-[#E3D6C3]",
      value: "text-[#241A14]",
      icon: "bg-[#F3E6D3] text-[#8B5E34]",
    },
    green: {
      wrap: "bg-emerald-50 border-emerald-100",
      value: "text-emerald-700",
      icon: "bg-emerald-100 text-emerald-700",
    },
    rose: {
      wrap: "bg-rose-50 border-rose-100",
      value: "text-rose-700",
      icon: "bg-rose-100 text-rose-700",
    },
    gold: {
      wrap: "bg-amber-50 border-amber-100",
      value: "text-[#A76313]",
      icon: "bg-amber-100 text-[#A76313]",
    },
    blue: {
      wrap: "bg-sky-50 border-sky-100",
      value: "text-sky-700",
      icon: "bg-sky-100 text-sky-700",
    },
  };

  const s = styles[tone];

  return (
    <div
      className={`
        min-h-[132px]
        rounded-[26px]
        border
        ${s.wrap}
        p-5
        shadow-[0_14px_35px_rgba(80,55,32,0.055)]
        flex
        items-center
        justify-between
        gap-4
      `}
    >
      <div>
        <div className="text-[#7C6A58] text-sm font-black mb-2">
          {title}
        </div>
        <div className={`text-4xl font-black tracking-tight ${s.value}`}>
          {value}
        </div>
        <div className="text-xs text-[#9A8775] mt-2">{description}</div>
      </div>

      <div
        className={`h-14 w-14 rounded-2xl ${s.icon} flex items-center justify-center text-2xl font-black shadow-sm shrink-0`}
      >
        {icon}
      </div>
    </div>
  );
}

function GoldenStatusBarsCard({
  coming,
  notComing,
  pending,
  total,
}: {
  coming: number;
  notComing: number;
  pending: number;
  total: number;
}) {
  const comingPercent = calcPercent(coming, total);
  const pendingPercent = calcPercent(pending, total);
  const notComingPercent = calcPercent(notComing, total);

  return (
    <div className="h-[285px] overflow-hidden rounded-[28px] border border-[#E3D6C3] bg-white p-5 shadow-[0_14px_34px_rgba(80,55,32,0.055)]">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-black text-[#241A14]">
            אחוזי אישורי הגעה
          </h3>
          <p className="text-xs text-[#7C6A58] mt-1">
            מחושב לפי נתוני המוזמנים בפועל
          </p>
        </div>
        <span className="rounded-full bg-[#FFF5DF] text-[#8B5E24] px-4 py-1.5 text-sm font-black border border-[#E3D6C3]">
          {comingPercent}%
        </span>
      </div>

      <div className="space-y-5">
        <GoldenProgressRow
          label="מגיע"
          value={coming}
          percent={comingPercent}
          bar="bg-emerald-600"
        />
        <GoldenProgressRow
          label="בהמתנה"
          value={pending}
          percent={pendingPercent}
          bar="bg-amber-500"
        />
        <GoldenProgressRow
          label="לא מגיע"
          value={notComing}
          percent={notComingPercent}
          bar="bg-rose-500"
        />
      </div>
    </div>
  );
}

function GoldenProgressRow({
  label,
  value,
  percent,
  bar,
}: {
  label: string;
  value: number;
  percent: number;
  bar: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-black text-[#241A14] mb-2">
        <span>{label}</span>
        <span>
          {value} <span className="text-[#9A8775]">({percent}%)</span>
        </span>
      </div>
      <div className="h-3 rounded-full bg-[#F1E7DA] overflow-hidden">
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

function GoldenDonutCard({
  coming,
  notComing,
  pending,
  total,
}: {
  coming: number;
  notComing: number;
  pending: number;
  total: number;
}) {
  const comingPercent = calcPercent(coming, total);
  const pendingPercent = calcPercent(pending, total);
  const notComingPercent = calcPercent(notComing, total);
  const greenEnd = comingPercent;
  const orangeEnd = comingPercent + pendingPercent;

  return (
    <div className="h-[285px] overflow-hidden rounded-[28px] border border-[#E3D6C3] bg-white p-5 shadow-[0_14px_34px_rgba(80,55,32,0.055)]">
      <div className="mb-4">
        <h3 className="text-lg font-black text-[#241A14]">
          התפלגות מוזמנים לפי סטטוס
        </h3>
        <p className="text-xs text-[#7C6A58] mt-1">
          מגיע / לא מגיע / בהמתנה
        </p>
      </div>

      <div className="flex items-center justify-between gap-5">
        <div
          className="relative h-36 w-36 rounded-full shadow-inner shrink-0"
          style={{
            background: `conic-gradient(
              #059669 0% ${greenEnd}%,
              #F59E0B ${greenEnd}% ${orangeEnd}%,
              #F43F5E ${orangeEnd}% 100%
            )`,
          }}
        >
          <div className="absolute inset-5 rounded-full bg-white flex flex-col items-center justify-center">
            <div className="text-3xl font-black text-[#241A14]">{total}</div>
            <div className="text-[11px] text-[#7C6A58]">אורחים</div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <LegendRow
            color="bg-emerald-600"
            label="מגיע"
            value={coming}
            percent={comingPercent}
          />
          <LegendRow
            color="bg-amber-500"
            label="בהמתנה"
            value={pending}
            percent={pendingPercent}
          />
          <LegendRow
            color="bg-rose-500"
            label="לא מגיע"
            value={notComing}
            percent={notComingPercent}
          />
        </div>
      </div>
    </div>
  );
}

function GoldenEventDetailsCard({
  title,
  date,
  time,
  location,
  onOpen,
}: {
  title: string;
  date: string;
  time: string;
  location: string;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-[#E3D6C3] bg-white p-5 shadow-[0_14px_34px_rgba(80,55,32,0.055)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-[#241A14]">
          פרטי האירוע
        </h3>
        <span className="text-2xl text-[#B8844F]">✦</span>
      </div>

      <div className="space-y-3">
        <GoldenDetailRow icon="✦" label="שם האירוע" value={title} />
        <GoldenDetailRow icon="▦" label="תאריך" value={date} />
        <GoldenDetailRow icon="◷" label="שעה" value={time} />
        <GoldenDetailRow icon="●" label="מיקום" value={location} />
      </div>

      <button
        onClick={onOpen}
        className="mt-5 w-full rounded-2xl border border-[#E3D6C3] bg-[#FBF7F0] px-5 py-3 font-black text-[#241A14] transition hover:bg-[#F2E6D5]"
      >
        צפייה בפרטי האירוע
      </button>
    </div>
  );
}

function GoldenDetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-2xl bg-[#F8EFE3] text-[#9B6A35] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold text-[#9A8775] mb-0.5">
          {label}
        </div>
        <div className="text-sm font-black text-[#241A14] truncate">
          {value}
        </div>
      </div>
    </div>
  );
}

function GoldenRecentActivityCard({
  logs,
}: {
  logs: {
    id: string;
    timestamp: number;
    icon: string;
    tone: "green" | "gold" | "rose" | "bronze";
    title: string;
    subtitle: string;
  }[];
}) {
  return (
    <div className="rounded-[28px] border border-[#E3D6C3] bg-white p-5 shadow-[0_14px_34px_rgba(80,55,32,0.055)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-[#241A14]">
          פעילות אחרונה
        </h3>
        <span className="rounded-full bg-[#FFF5DF] px-3 py-1 text-xs font-black text-[#8B5E24] border border-[#E3D6C3]">
          חדש למעלה
        </span>
      </div>

      <div
  className="
    max-h-[170px]
    overflow-y-auto
    pr-1
    space-y-2
    scrollbar-thin
    scrollbar-thumb-[#D9B46F]
    scrollbar-track-[#F8EFE3]
  "
>
        {logs.length > 0 ? (
          logs.map((log) => (
            <GoldenActivityRow
              key={`${log.id}-${log.timestamp}`}
              icon={log.icon}
              tone={log.tone}
              title={log.title}
              time={log.subtitle}
            />
          ))
        ) : (
          <div className="rounded-2xl bg-[#FBF7F0] p-4 text-sm font-bold text-[#8A7A68]">
            עדיין אין פעילות להצגה.
          </div>
        )}
      </div>
    </div>
  );
}

function GoldenActivityRow({
  icon,
  tone,
  title,
  time,
}: {
  icon: string;
  tone: "green" | "gold" | "rose" | "bronze";
  title: string;
  time: string;
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    gold: "bg-amber-50 text-[#A76313]",
    rose: "bg-rose-50 text-rose-700",
    bronze: "bg-[#F8EFE3] text-[#8B5E34]",
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black ${tones[tone]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-black text-[#241A14] truncate">
          {title}
        </div>
        <div className="text-xs text-[#9A8775] mt-0.5">{time}</div>
      </div>
    </div>
  );
}

/* ============================================================
   HERO בדיוק כמו הסקיצה
============================================================ */
function PremiumEventHero({
  title,
  date,
  time,
  location,
  responsePercent,
  workMode,
  canViewActualArrived,
  setWorkMode,
}: {
  title: string;
  date: string;
  time: string;
  location: string;
  responsePercent: number;
  workMode: "regular" | "live";
  canViewActualArrived: boolean;
  setWorkMode: (mode: "regular" | "live") => void;
}) {
  const safePercent = Math.max(0, Math.min(100, responsePercent));

  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-[34px]
        border
        border-[#E9E1D6]
        bg-white
        shadow-[0_18px_55px_rgba(30,27,46,0.07)]
        min-h-[178px]
      "
    >
      <div
        className="
          absolute
          inset-0
          bg-[linear-gradient(90deg,rgba(236,253,245,0.92)_0%,rgba(255,255,255,0.98)_39%,#fff_100%)]
        "
      />

      <div className="absolute left-0 top-0 h-full w-[390px] overflow-hidden">
        <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-emerald-200/45 blur-3xl" />
        <div className="absolute left-8 top-5 text-[96px] opacity-85 rotate-[-17deg]">
          🌿
        </div>
        <div className="absolute left-[98px] top-[56px] text-[54px] opacity-90">
          ✿
        </div>
        <div className="absolute left-[32px] bottom-[26px] text-[34px] opacity-90 text-[#D9B46F]">
          ✦
        </div>
        <div className="absolute left-[210px] top-[62px] text-[18px] opacity-80 text-[#D9B46F]">
          ✦
        </div>
        <div className="absolute left-44 top-8 h-[1px] w-48 rotate-[-18deg] bg-gradient-to-l from-[#D9B46F] to-transparent" />
        <div className="absolute left-36 bottom-11 h-[1px] w-56 rotate-[12deg] bg-gradient-to-l from-[#D9B46F] to-transparent" />
      </div>

      <div className="absolute -right-28 -top-32 h-72 w-72 rounded-full border border-[#E9E1D6]/70" />
      <div className="absolute -right-32 -bottom-36 h-80 w-80 rounded-full bg-amber-50/70 blur-3xl" />

      <div
        className="
          relative
          grid
          grid-cols-1
          xl:grid-cols-[1fr_380px_520px]
          items-center
          gap-6
          px-7
          py-6
          md:px-9
        "
      >
        <div className="order-3 xl:order-1 flex items-center justify-start">
          {canViewActualArrived && (
            <div className="flex items-center gap-2 rounded-full bg-white/80 border border-[#E7DED1] p-1 shadow-sm">
              <button
                onClick={() => setWorkMode("regular")}
                className={`
                  px-5 py-2.5 rounded-full text-sm font-black transition
                  ${
                    workMode === "regular"
                      ? "bg-[#1E1B2E] text-white shadow"
                      : "text-[#7C746C] hover:bg-[#F7F4EF]"
                  }
                `}
              >
                מצב רגיל
              </button>

              <button
                onClick={() => setWorkMode("live")}
                className={`
                  px-5 py-2.5 rounded-full text-sm font-black transition
                  ${
                    workMode === "live"
                      ? "bg-rose-600 text-white shadow"
                      : "text-[#7C746C] hover:bg-[#F7F4EF]"
                  }
                `}
              >
                🔴 LIVE
              </button>
            </div>
          )}
        </div>

        <div className="order-2 xl:order-2 flex items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <div
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-emerald-200
                bg-emerald-50
                px-6
                py-2.5
                text-sm
                font-black
                text-emerald-700
              "
            >
              LIVE
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="text-xs font-bold text-[#8B8177]">
              האירוע פעיל
            </div>
          </div>

          <div className="hidden md:block h-24 w-px bg-[#E5DDD1]" />

          <div className="flex flex-col items-center gap-2">
            <div className="relative h-[94px] w-[94px] shrink-0">
              <div
                className="
                  absolute
                  inset-0
                  rounded-full
                  bg-[conic-gradient(#10B981_var(--p),#E9E1D6_0)]
                "
                style={{ ["--p" as any]: `${safePercent}%` }}
              />

              <div className="absolute inset-[8px] rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
                <div className="text-2xl font-black text-[#1E1B2E]">
                  {safePercent}%
                </div>
              </div>
            </div>

            <div className="text-xs font-bold text-[#8B8177]">
              אחוז היענות
            </div>
          </div>
        </div>

        <div className="order-1 xl:order-3 text-right">
          <div className="flex items-center justify-start gap-2 mb-2">
            <span className="text-3xl">🌿</span>
            <span className="rounded-full bg-white/75 border border-[#E7DED1] px-3 py-1 text-xs font-black text-[#8B6A2E]">
              פרטי האירוע
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-[#1E1B2E] tracking-tight">
            {title}
          </h1>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <HeroDetail icon="🕒" title="שעה" value={time} />
            <HeroDetail icon="📅" title="תאריך" value={date} />
            <HeroDetail icon="📍" title="מיקום" value={location} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroDetail({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/65 border border-[#E7DED1] px-4 py-3 shadow-sm min-w-0">
      <div className="h-9 w-9 rounded-xl bg-[#F7F4EF] flex items-center justify-center shrink-0">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[11px] text-[#9A9085] font-bold">
          {title}
        </div>

        <div className="text-sm font-black text-[#1E1B2E] truncate">
          {value}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   UI helpers
============================================================ */
function IconAction({
  children,
  title,
  onClick,
  danger,
}: {
  children: ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        h-9
        w-9
        rounded-xl
        border
        flex
        items-center
        justify-center
        transition
        hover:-translate-y-0.5
        hover:shadow-sm
        ${
          danger
            ? "border-rose-100 bg-rose-50 text-rose-700"
            : "border-[#E7DED1] bg-white text-[#5F564D] hover:bg-[#FBFAF7]"
        }
      `}
    >
      {children}
    </button>
  );
}

function AnalyticsLineCard({ percent }: { percent: number }) {
  const safePercent = Math.max(0, Math.min(100, percent));

  return (
    <div
      className="
        h-[255px]
        rounded-[28px]
        border
        border-[#E7DED1]
        bg-white
        p-5
        shadow-[0_14px_34px_rgba(30,27,46,0.055)]
        overflow-hidden
      "
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-black text-[#1E1B2E]">
            מגמת היענות RSVP
          </h3>

          <p className="text-xs text-[#7C746C] mt-1">
            אחוז האורחים שסימנו מגיע
          </p>
        </div>

        <span className="rounded-full bg-emerald-50 text-emerald-700 px-4 py-1.5 text-sm font-black border border-emerald-100">
          {safePercent}%
        </span>
      </div>

      <div className="h-[145px] relative">
        <div className="absolute inset-0 grid grid-rows-4">
          <div className="border-b border-[#F0ECE6]" />
          <div className="border-b border-[#F0ECE6]" />
          <div className="border-b border-[#F0ECE6]" />
          <div className="border-b border-[#F0ECE6]" />
        </div>

        <svg viewBox="0 0 500 145" className="relative h-full w-full">
          <defs>
            <linearGradient id="lineGradientSmall" x1="0" x2="1">
              <stop offset="0%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#16A34A" />
            </linearGradient>

            <linearGradient id="areaGradientSmall" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d="M20 118 C80 92, 118 82, 168 86 C226 90, 250 62, 305 56 C362 49, 415 42, 480 28"
            fill="none"
            stroke="url(#lineGradientSmall)"
            strokeWidth="6"
            strokeLinecap="round"
          />

          <path
            d="M20 118 C80 92, 118 82, 168 86 C226 90, 250 62, 305 56 C362 49, 415 42, 480 28 L480 140 L20 140 Z"
            fill="url(#areaGradientSmall)"
          />

          <circle cx="480" cy="28" r="7" fill="#16A34A" />
          <circle cx="480" cy="28" r="13" fill="#16A34A" opacity="0.14" />
        </svg>
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-[#9A9085]">
        <span>15/05</span>
        <span>22/05</span>
        <span>29/05</span>
        <span>05/06</span>
        <span>12/06</span>
        <span>19/06</span>
      </div>
    </div>
  );
}

function DonutCard({
  coming,
  notComing,
  pending,
  total,
}: {
  coming: number;
  notComing: number;
  pending: number;
  total: number;
}) {
  const comingPercent = calcPercent(coming, total);
  const pendingPercent = calcPercent(pending, total);
  const notComingPercent = calcPercent(notComing, total);

  const greenEnd = comingPercent;
  const orangeEnd = comingPercent + pendingPercent;

  return (
    <div
      className="
        h-[255px]
        rounded-[28px]
        border
        border-[#E7DED1]
        bg-white
        p-5
        shadow-[0_14px_34px_rgba(30,27,46,0.055)]
        overflow-hidden
      "
    >
      <div className="mb-4">
        <h3 className="text-lg font-black text-[#1E1B2E]">
          התפלגות מוזמנים לפי סטטוס
        </h3>

        <p className="text-xs text-[#7C746C] mt-1">
          מגיע / לא מגיע / בהמתנה
        </p>
      </div>

      <div className="flex items-center justify-between gap-5">
        <div
          className="
            relative
            h-32
            w-32
            rounded-full
            shadow-inner
            shrink-0
          "
          style={{
            background: `conic-gradient(
              #10B981 0% ${greenEnd}%,
              #F59E0B ${greenEnd}% ${orangeEnd}%,
              #F43F5E ${orangeEnd}% 100%
            )`,
          }}
        >
          <div className="absolute inset-5 rounded-full bg-white flex flex-col items-center justify-center">
            <div className="text-2xl font-black text-[#1E1B2E]">
              {total}
            </div>

            <div className="text-[11px] text-[#7C746C]">
              אורחים
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <LegendRow
            color="bg-emerald-500"
            label="מגיע"
            value={coming}
            percent={comingPercent}
          />

          <LegendRow
            color="bg-amber-500"
            label="בהמתנה"
            value={pending}
            percent={pendingPercent}
          />

          <LegendRow
            color="bg-rose-500"
            label="לא מגיע"
            value={notComing}
            percent={notComingPercent}
          />
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
  percent,
}: {
  color: string;
  label: string;
  value: number;
  percent: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-sm font-bold text-[#1E1B2E]">
          {label}
        </span>
      </div>

      <div className="text-sm font-black text-[#5F564D]">
        {value}{" "}
        <span className="text-[#9A9085]">
          ({percent}%)
        </span>
      </div>
    </div>
  );
}

function EventDetailsCard({
  title,
  date,
  time,
  location,
  onOpen,
}: {
  title: string;
  date: string;
  time: string;
  location: string;
  onOpen: () => void;
}) {
  return (
    <div
      className="
        rounded-[28px]
        border
        border-[#E7DED1]
        bg-white
        p-5
        shadow-[0_14px_34px_rgba(30,27,46,0.055)]
      "
    >
      <h3 className="text-lg font-black text-[#1E1B2E] mb-4">
        פרטי האירוע
      </h3>

      <div className="space-y-3">
        <DetailRow icon="✨" label="שם האירוע" value={title} />
        <DetailRow icon="📅" label="תאריך" value={date} />
        <DetailRow icon="🕒" label="שעה" value={time} />
        <DetailRow icon="📍" label="מיקום" value={location} />
      </div>

      <button
        onClick={onOpen}
        className="
          mt-5
          w-full
          rounded-2xl
          border
          border-[#E7DED1]
          bg-[#FBFAF7]
          px-5
          py-3
          font-black
          text-[#1E1B2E]
          hover:bg-[#F2EEE8]
          transition
        "
      >
        צפייה בפרטי האירוע
      </button>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-2xl bg-[#F7F4EF] flex items-center justify-center shrink-0">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-xs font-bold text-[#9A9085] mb-0.5">
          {label}
        </div>

        <div className="text-sm font-black text-[#1E1B2E] truncate">
          {value}
        </div>
      </div>
    </div>
  );
}

function RecentActivityCard() {
  return (
    <div
      className="
        rounded-[28px]
        border
        border-[#E7DED1]
        bg-white
        p-5
        shadow-[0_14px_34px_rgba(30,27,46,0.055)]
      "
    >
      <h3 className="text-lg font-black text-[#1E1B2E] mb-4">
        פעילות אחרונה
      </h3>

      <div className="space-y-3">
        <ActivityRow
          icon="✅"
          tone="green"
          title="אורח סימן מגיע"
          time="לפני 12 דקות"
        />

        <ActivityRow
          icon="💬"
          tone="blue"
          title="נשלחה הודעה למוזמנים"
          time="לפני 45 דקות"
        />

        <ActivityRow
          icon="🪑"
          tone="gold"
          title="עודכן סידור הושבה"
          time="לפני שעה"
        />

        <ActivityRow
          icon="⏳"
          tone="orange"
          title="מוזמנים עדיין בהמתנה"
          time="מתעדכן בזמן אמת"
        />
      </div>
    </div>
  );
}

function ActivityRow({
  icon,
  tone,
  title,
  time,
}: {
  icon: string;
  tone: "green" | "blue" | "gold" | "orange";
  title: string;
  time: string;
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-sky-50 text-sky-700",
    gold: "bg-amber-50 text-amber-700",
    orange: "bg-orange-50 text-orange-700",
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`
          h-10
          w-10
          rounded-2xl
          flex
          items-center
          justify-center
          ${tones[tone]}
        `}
      >
        {icon}
      </div>

      <div>
        <div className="text-sm font-black text-[#1E1B2E]">
          {title}
        </div>

        <div className="text-xs text-[#9A9085] mt-0.5">
          {time}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Box
============================================================ */
function Box({
  title,
  value,
  color,
  onClick,
  icon,
  description,
}: {
  title: string;
  value: number;
  color?: string;
  onClick?: () => void;
  icon?: string;
  description?: string;
}) {
  const styles: Record<
    string,
    {
      value: string;
      bg: string;
      iconBg: string;
      border: string;
    }
  > = {
    green: {
      value: "text-emerald-700",
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100",
      border: "border-emerald-100",
    },
    blue: {
      value: "text-sky-700",
      bg: "bg-sky-50",
      iconBg: "bg-sky-100",
      border: "border-sky-100",
    },
    red: {
      value: "text-rose-700",
      bg: "bg-rose-50",
      iconBg: "bg-rose-100",
      border: "border-rose-100",
    },
    orange: {
      value: "text-amber-700",
      bg: "bg-amber-50",
      iconBg: "bg-amber-100",
      border: "border-amber-100",
    },
    default: {
      value: "text-[#1E1B2E]",
      bg: "bg-white",
      iconBg: "bg-[#F7F4EF]",
      border: "border-[#E7DED1]",
    },
  };

  const s = styles[color || "default"] || styles.default;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;

        if (e.key === "Enter") onClick();

        if (e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        relative
        overflow-hidden
        rounded-[26px]
        border
        ${s.border}
        ${s.bg}
        p-5
        shadow-[0_14px_35px_rgba(30,27,46,0.055)]
        transition-all
        ${onClick ? "cursor-pointer hover:shadow-md active:scale-[0.99]" : ""}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9b48f] focus-visible:ring-offset-2
      `}
    >
      <div className="absolute -left-8 -top-8 h-20 w-20 rounded-full bg-white/50 blur-2xl" />

      <div className="relative flex items-center justify-between gap-4">
        <div>
          <div className="text-[#7C746C] text-sm font-bold mb-1">
            {title}
          </div>

          <div className={`text-4xl font-black tracking-tight ${s.value}`}>
            {value}
          </div>

          {description && (
            <div className="text-xs text-[#9A9085] mt-2">
              {description}
            </div>
          )}
        </div>

        <div
          className={`
            h-14
            w-14
            rounded-2xl
            ${s.iconBg}
            flex
            items-center
            justify-center
            text-2xl
            shadow-sm
          `}
        >
          {icon || "📊"}
        </div>
      </div>
    </div>
  );
}