"use client";

import {
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import EditGuestModal from "../components/EditGuestModal";
import AddGuestModal from "../components/AddGuestModal";
import ImportExcelModal from "../components/ImportExcelModal";
import EventCountdown from "../components/EventCountdown";
import GuestsMobileList from "./components/GuestsMobileList";
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

  tableName?: string;
  tableNumber?: number;

  rsvp: "yes" | "no" | "pending";
  guestsCount: number;

  arrivedCount?: number;
  actualArrivedCount?: number;
  notes?: string;

  callRounds?: {
    roundNumber: number;
    status?: string;
    notes?: string;
    calledAt?: string;
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

  try {
    return new Date(date).toLocaleDateString("he-IL");
  } catch {
    return date;
  }
}

function calcPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
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

  const [user, setUser] = useState<any | null>(null);

  const setSeatingMode = useSeatingStore((s) => s.setSeatingMode);
  const seatingTables = useSeatingStore((s) => s.tables);

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
    effectiveRole === "producer" ||
    effectiveRole === "worker" ||
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

    const url = eventIdFromUrl
      ? `/api/invitations/by-event/${eventIdFromUrl}`
      : "/api/invitations/my";

    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success && data.invitation) {
      setInvitation(data.invitation);
      setInvitationId(data.invitation._id);
    } else {
      setInvitation(null);
      setInvitationId("");
    }
  }

  async function loadEvent() {
    if (!user) return;

    const url = eventIdFromUrl
      ? `/api/events/${eventIdFromUrl}`
      : "/api/events";

    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
    });

    const data = await res.json();

    if (data.success && data.event) {
      setEvent(data.event);
    } else {
      setEvent(null);
    }
  }

  /* ============================================================
     Load guests
  ============================================================ */
  async function loadGuests() {
    if (!invitationId) return;

    const res = await fetch(
      `/api/guests?invitation=${invitationId}`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );

    const data = await res.json();
    setGuests(data.guests || []);
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
  }, [user, isDemo]);

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
      setLoading(false);
    }

    load();
  }, [invitationId, isDemo]);

  useEffect(() => {
    if (isDemo) return;
    if (!invitationId) return;

    loadGroups(invitationId);
  }, [invitationId, isDemo, loadGroups]);

  useEffect(() => {
    if (isDemo) return;
    if (!invitationId) return;

    loadGuests();

    const interval = setInterval(() => {
      console.log("🔄 polling guests...");
      loadGuests();
    }, 2000);

    return () => clearInterval(interval);
  }, [invitationId]);

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
  const stats = useMemo(() => {
    const totalInvited = guests.reduce(
      (s, g) => s + (g.guestsCount || 0),
      0
    );

    const totalArrived = guests.reduce(
      (s, g) => s + (g.arrivedCount || 0),
      0
    );

    const totalActualArrived = guests.reduce(
      (s, g) => s + (g.actualArrivedCount || 0),
      0
    );

    const totalNo = guests.filter((g) => g.rsvp === "no").length;
    const totalPending = guests.filter((g) => g.rsvp === "pending").length;

    return {
      totalGuests: totalInvited,
      comingGuests: totalArrived,
      actualArrivedGuests: totalActualArrived,
      notComing: totalNo,
      noResponse: totalPending,
    };
  }, [guests]);

  const rsvpVisualStats = useMemo(() => {
    const coming = guests.filter((g) => g.rsvp === "yes").length;
    const notComing = guests.filter((g) => g.rsvp === "no").length;
    const pending = guests.filter((g) => g.rsvp === "pending").length;
    const total = guests.length;

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

  function normalizeCallStatus(status?: string) {
    switch (status) {
      case "answered":
      case "ענה":
        return "answered";

      case "no_answer":
      case "לא ענה":
        return "no_answer";

      case "will_reply":
      case "ישיב בהודעה":
        return "will_reply";

      default:
        return null;
    }
  }

  function getGuestCallStatus(
    guest: Guest
  ): "answered" | "no_answer" | "will_reply" | null {
    if (!Array.isArray(guest.callRounds) || guest.callRounds.length === 0) {
      return null;
    }

    const lastWithStatus = [...guest.callRounds]
      .reverse()
      .find((r) => r.status);

    return normalizeCallStatus(lastWithStatus?.status);
  }

  /* ============================================================
     פילטר + מיון + חיפוש
  ============================================================ */
  const displayGuests = useMemo(() => {
    let list = [...guests];

    if (quickFilter === "yes") {
      list = list.filter((g) => g.rsvp === "yes");
    }

    if (quickFilter === "no") {
      list = list.filter((g) => g.rsvp === "no");
    }

    if (quickFilter === "noTable") {
      list = list.filter((g) => !(g.tableName && g.tableName.trim()));
    }

    if (quickFilter === "pending") {
      list = list.filter((g) => {
        const isReallyPending =
          g.rsvp === "pending" &&
          (g.arrivedCount ?? 0) === 0 &&
          (g.actualArrivedCount ?? 0) === 0;

        if (!isReallyPending) return false;

        const status = getGuestCallStatus(g);

        return status === null || status === "will_reply";
      });
    }

    if (quickFilter === "call_answered") {
      list = list.filter(
        (g) => getGuestCallStatus(g) === "answered"
      );
    }

    if (quickFilter === "call_no_answer") {
      list = list.filter(
        (g) => getGuestCallStatus(g) === "no_answer"
      );
    }

    if (quickFilter === "call_will_reply") {
      list = list.filter(
        (g) => getGuestCallStatus(g) === "will_reply"
      );
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

  if (loading) return null;

  console.log("USER FROM /api/me:", user);
  console.log("INVITATION:", invitation);

  const eventTitle =
    event?.title ||
    invitation?.title ||
    invitation?.eventName ||
    "האירוע שלך";

  const eventDate =
    event?.date ||
    invitation?.eventDate ||
    invitation?.date ||
    "";

  const eventTime =
    event?.time ||
    invitation?.eventTime ||
    invitation?.time ||
    "טרם הוגדרה שעה";

  const eventLocation =
    event?.location?.address ||
    invitation?.location?.address ||
    invitation?.eventLocation ||
    invitation?.location ||
    "טרם הוגדר מיקום";

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div
      className="
        min-h-screen
        bg-[#F7F4EF]
        px-4
        py-6
        md:p-8
        max-w-full
        overflow-x-hidden
      "
      dir="rtl"
    >
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

      {/* ===================== HERO בדיוק כמו הסקיצה ===================== */}
      <section className="mb-5">
        <PremiumEventHero
          title={eventTitle}
          date={formatEventDate(eventDate)}
          time={eventTime}
          location={eventLocation}
          responsePercent={rsvpVisualStats.comingPercent}
          workMode={workMode}
          canViewActualArrived={canViewActualArrived}
          setWorkMode={setWorkMode}
        />
      </section>

      {/* ===================== ACTION BUTTONS כמו הסקיצה - בלי AI ובלי שינוי סדר ===================== */}
<section className="mb-6">
  <div
    className="
      hidden
      md:flex
      flex-wrap
      gap-3
      items-center
    "
  >
    {/* 1️⃣ עריכת / יצירת הזמנה */}
    <button
      onClick={() => {
        if (isDemo) {
          handleDemoBlockedAction();
          return;
        }

        router.push(
          invitation
            ? `/dashboard/edit-invite/${invitationId}`
            : "/dashboard/create-invite"
        );
      }}
      className="
        group
        h-[54px]
        min-w-[180px]
        rounded-[16px]
        px-6
        font-black
        text-sm
        flex
        items-center
        justify-center
        gap-3
        bg-[#1E1B2E]
        text-white
        shadow-[0_12px_24px_rgba(30,27,46,0.22)]
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:bg-[#141222]
      "
    >
      <span className="text-xl text-[#D9B46F] leading-none">✎</span>
      {invitation ? "עריכת הזמנה" : "יצירת הזמנה"}
    </button>

    {/* 2️⃣ עריכת פרטי האירוע */}
    <button
      onClick={() => {
        if (!invitation) return;

        if (isDemo) {
          handleDemoBlockedAction();
          return;
        }

        router.push("/dashboard/event");
      }}
      disabled={!invitation}
      className={`
        group
        h-[54px]
        min-w-[190px]
        rounded-[16px]
        px-6
        font-black
        text-sm
        flex
        items-center
        justify-center
        gap-3
        border
        transition-all
        duration-200
        ${
          invitation
            ? `
              bg-white
              border-[#E7DED1]
              text-[#1E1B2E]
              shadow-[0_8px_20px_rgba(30,27,46,0.06)]
              hover:-translate-y-0.5
              hover:bg-[#FBFAF7]
            `
            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
        }
      `}
    >
      <span className="text-xl text-[#1E1B2E] leading-none">✎</span>
      עריכת פרטי האירוע
    </button>

    {/* 3️⃣ צפייה בהזמנה */}
    {invitation && (
      <button
        onClick={() =>
          isDemo
            ? handleDemoBlockedAction()
            : window.open(
                `https://www.invistimo.com/invite/${invitation.shareId}`,
                "_blank",
                "noopener,noreferrer"
              )
        }
        className="
          group
          h-[54px]
          min-w-[170px]
          rounded-[16px]
          px-6
          font-black
          text-sm
          flex
          items-center
          justify-center
          gap-3
          border
          bg-white
          border-[#E7DED1]
          text-[#1E1B2E]
          shadow-[0_8px_20px_rgba(30,27,46,0.06)]
          transition-all
          duration-200
          hover:-translate-y-0.5
          hover:bg-[#FBFAF7]
        "
      >
        <span className="text-xl text-[#1E1B2E] leading-none">◉</span>
        צפייה בהזמנה
      </button>
    )}

    {/* 4️⃣ הוספת מוזמן */}
    <button
      onClick={() => setOpenAddModal(true)}
      disabled={!invitation}
      className={`
        group
        h-[54px]
        min-w-[170px]
        rounded-[16px]
        px-6
        font-black
        text-sm
        flex
        items-center
        justify-center
        gap-3
        border
        transition-all
        duration-200
        ${
          invitation
            ? `
              bg-white
              border-[#E7DED1]
              text-[#1E1B2E]
              shadow-[0_8px_20px_rgba(30,27,46,0.06)]
              hover:-translate-y-0.5
              hover:bg-[#FBFAF7]
            `
            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
        }
      `}
    >
      <span className="text-xl text-[#1E1B2E] leading-none">♙</span>
      הוספת מוזמן
    </button>

    {/* 5️⃣ ייבוא מאקסל */}
    <button
      onClick={() => setShowImportModal(true)}
      disabled={!invitation}
      className={`
        group
        h-[54px]
        min-w-[170px]
        rounded-[16px]
        px-6
        font-black
        text-sm
        flex
        items-center
        justify-center
        gap-3
        border
        transition-all
        duration-200
        ${
          invitation
            ? `
              bg-white
              border-[#E7DED1]
              text-[#1E1B2E]
              shadow-[0_8px_20px_rgba(30,27,46,0.06)]
              hover:-translate-y-0.5
              hover:bg-[#FBFAF7]
            `
            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
        }
      `}
    >
      <span className="text-xl text-emerald-600 leading-none">▣</span>
      ייבוא מאקסל
    </button>

    {/* 6️⃣ סידורי הושבה */}
    <button
      onClick={() =>
        router.push(
          isDemo
            ? "/try/dashboard/seating"
            : "/dashboard/seating"
        )
      }
      disabled={!invitation}
      className={`
        group
        h-[54px]
        min-w-[170px]
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
        ${
          invitation
            ? `
              bg-gradient-to-l
              from-[#C19B52]
              to-[#D9BE7A]
              text-white
              shadow-[0_12px_24px_rgba(193,155,82,0.24)]
              hover:-translate-y-0.5
            `
            : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
        }
      `}
    >
      <span className="text-xl text-white leading-none">♜</span>
      סידורי הושבה
      <span className="text-white/80 text-sm">⌄</span>
    </button>

    {/* 7️⃣ שליחת הודעות */}
    <button
      onClick={() =>
        router.push(
          isDemo
            ? "/try/dashboard/messages/new"
            : "/dashboard/messages/new"
        )
      }
      disabled={!invitation}
      className={`
        group
        h-[54px]
        min-w-[170px]
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
        ${
          invitation
            ? `
              bg-gradient-to-l
              from-[#007A47]
              to-[#10A66A]
              text-white
              shadow-[0_12px_24px_rgba(16,166,106,0.22)]
              hover:-translate-y-0.5
            `
            : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
        }
      `}
    >
      <span className="text-xl text-white leading-none">↗</span>
      שליחת הודעות
    </button>
  </div>

  {/* מובייל - בלי שינוי לוגיקה */}
  <div className="flex md:hidden flex-col gap-3">
    <button
      onClick={() => {
        if (isDemo) {
          handleDemoBlockedAction();
          return;
        }

        router.push(
          invitation
            ? `/dashboard/edit-invite/${invitationId}`
            : "/dashboard/create-invite"
        );
      }}
      className="
        h-[54px]
        rounded-2xl
        font-black
        bg-[#1E1B2E]
        text-white
      "
    >
      <span className="text-[#D9B46F]">✎</span>{" "}
      {invitation ? "עריכת הזמנה" : "יצירת הזמנה"}
    </button>

    <button
      onClick={() => setOpenAddModal(true)}
      disabled={!invitation}
      className={`
        h-[54px]
        rounded-2xl
        font-black
        border
        ${
          invitation
            ? "bg-white border-[#E7DED1] text-[#1E1B2E]"
            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
        }
      `}
    >
      ♙ הוספת מוזמן
    </button>

    <button
      onClick={() => setShowImportModal(true)}
      disabled={!invitation}
      className={`
        h-[54px]
        rounded-2xl
        font-black
        border
        ${
          invitation
            ? "bg-white border-[#E7DED1] text-[#1E1B2E]"
            : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
        }
      `}
    >
      <span className="text-emerald-600">▣</span> ייבוא מאקסל
    </button>

    <button
      onClick={() =>
        router.push(
          isDemo
            ? "/try/dashboard/messages/new"
            : "/dashboard/messages/new"
        )
      }
      disabled={!invitation}
      className={`
        h-[54px]
        rounded-2xl
        font-black
        ${
          invitation
            ? "bg-gradient-to-l from-[#007A47] to-[#10A66A] text-white"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }
      `}
    >
      ↗ שליחת הודעות
    </button>
  </div>
</section>

      {/* ===================== SERVICE TAGS ===================== */}
      <section className="mb-6 flex flex-wrap gap-3">
        {user?.includeCalls ? (
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
            ☎️ כולל שירות שיחות אישורי הגעה (3 סבבים)
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
            ⚠️ ללא שירות שיחות טלפוניים
          </div>
        )}

        {user?.includeCreditGifts && (
          <>
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
              💳 כולל מתנות באשראי לאורחים
            </div>

            <a
              href="https://ktzr.io/giftInvistimoSignup"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 w-fit bg-[#138b55] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#0f6f45] transition"
            >
              🔗 קישור הרשמה למתנות באשראי
            </a>
          </>
        )}
      </section>

      {/* ===================== COUNTDOWN ===================== */}
      {event && (
        <section className="mb-6">
          <div className="rounded-2xl border border-[#E7DED1] bg-white/80 px-5 py-4 shadow-sm">
            <div className="text-lg font-semibold">
              {event.date ? (
                <EventCountdown event={event} />
              ) : (
                <span className="text-gray-500">
                  📅 טרם הוגדר תאריך לאירוע
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===================== STATS ===================== */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Box
          title="סה״כ מוזמנים"
          value={stats.totalGuests}
          icon="👥"
          description="כלל המוזמנים"
        />

        <Box
          title="מגיע"
          value={stats.comingGuests}
          color="green"
          icon="✅"
          description="אישרו הגעה"
        />

        {canShowActualArrived && (
          <Box
            title="מגיעים בפועל"
            value={stats.actualArrivedGuests}
            color="blue"
            icon="📍"
            description="נכנסו באירוע"
          />
        )}

        <Box
          title="לא מגיע"
          value={stats.notComing}
          color="red"
          icon="✖️"
          description="סימנו שלא מגיעים"
        />

        <Box
          title="בהמתנה"
          value={stats.noResponse}
          color="orange"
          icon="⏳"
          description="עוד לא השיבו"
        />
      </section>

      {/* ===================== ANALYTICS — כרטיסיות ימין, גרפים שמאל ===================== */}
      <section
        dir="ltr"
        className="
          grid
          grid-cols-1
          xl:grid-cols-[minmax(0,1fr)_340px]
          gap-5
          mb-7
          items-start
        "
      >
        <div
          dir="rtl"
          className="
            grid
            grid-cols-1
            lg:grid-cols-2
            gap-5
            items-start
            min-w-0
          "
        >
          <AnalyticsLineCard percent={rsvpVisualStats.comingPercent} />

          <DonutCard
            coming={rsvpVisualStats.coming}
            notComing={rsvpVisualStats.notComing}
            pending={rsvpVisualStats.pending}
            total={rsvpVisualStats.total}
          />
        </div>

        <aside
          dir="rtl"
          className="
            grid
            grid-cols-1
            gap-5
            min-w-0
          "
        >
          <EventDetailsCard
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

              router.push("/dashboard/event");
            }}
          />

          <RecentActivityCard />
        </aside>
      </section>

      {/* ===================== CONTROLS ===================== */}
      <section className="mb-5 rounded-[24px] border border-[#E7DED1] bg-white/85 p-4 shadow-sm">
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
          onExportExcel={handleExportExcel}
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

                <td className="p-4 font-bold text-[#1E1B2E]">
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
                </td>

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
                      title="שליחת הודעה"
                      onClick={() =>
                        router.push(
                          isDemo
                            ? `/try/dashboard/messages/new?guestId=${g._id}`
                            : `/dashboard/messages/new?guestId=${g._id}`
                        )
                      }
                    >
                      💬
                    </IconAction>

                    <IconAction
                      title="מעקב סבבי שיחה"
                      onClick={() => setOpenCallsGuest(g)}
                    >
                      📞
                    </IconAction>

                    <IconAction
                      title="שליחת וואטסאפ אישי"
                      onClick={() => sendWhatsApp(g)}
                    >
                      🟢
                    </IconAction>

                    <IconAction
                      title="סידור הושבה"
                      onClick={() =>
                        router.push(
                          isDemo
                            ? `/try/dashboard/seating?from=personal&guestId=${g._id}`
                            : `/dashboard/seating?from=personal&guestId=${g._id}`
                        )
                      }
                    >
                      🪑
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
                  colSpan={canShowActualArrived ? 12 : 11}
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