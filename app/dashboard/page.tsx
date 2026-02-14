"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import EditGuestModal from "../components/EditGuestModal";
import AddGuestModal from "../components/AddGuestModal";
import { RSVP_LABELS } from "@/lib/rsvp";
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



import Link from "next/link";



type EventModel = {
  title?: string;
  date?: string; // YYYY-MM-DD
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

  /* ⭐ קבוצות */
  groupId?: string | null;

  tableName?: string;
  tableNumber?: number;

  rsvp: "yes" | "no" | "pending";
  guestsCount: number;

  arrivedCount?: number;
  actualArrivedCount?: number;
  notes?: string;

  /* 📞 סבבי שיחות */
  callRounds?: {
  roundNumber: number;
  status?: string; // ⭐️ חשוב
  notes?: string;
  calledAt?: string;
}[];
};


type SortKey = "name" | "rsvp" | "table" | "coming" | "invited";
type SortDir = "asc" | "desc";


function formatPhone(phone?: string) {
  if (!phone) return "";

  const digits = String(phone).replace(/\D/g, "");

  // אם כבר מתחיל ב־0 → לא לגעת
  if (digits.startsWith("0")) return digits;

  // מספר סלולרי ישראלי בלי 0 (9 ספרות שמתחיל ב־5)
  if (digits.length === 9 && digits.startsWith("5")) {
    return "0" + digits;
  }

  return digits;
}



export default function DashboardPage() {

  type WorkMode = "regular" | "live";

 const [workMode, setWorkMode] = useState<WorkMode>(() => {
   if (typeof window === "undefined") return "regular";
   return (localStorage.getItem("workMode") as WorkMode) || "regular";
 });

 // ✅ ⬇️⬇️⬇️ זה המקום המדויק
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
  // התחזות תמיד קובעת
  if (user?.impersonationRole) {
    if (user.impersonationRole === "producer_staff") {
      return "producer";
    }
    return user.impersonationRole;
  }

  // staff רגיל
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
  user?.impersonated === true; // ⭐ אדמין בהתחזות



  const canShowActualArrived =
  canViewActualArrived && workMode === "live";



useEffect(() => {
  if (!canViewActualArrived) {
    setSeatingMode("planning");
    return;
  }

  setSeatingMode(workMode === "live" ? "live" : "planning");
}, [canViewActualArrived, workMode, setSeatingMode]);





  useEffect(() => {
  if (isDemo) return;
  if (!user) return;

  // ⭐️ אל תחסום producer בהתחזות
  if (
    user.role === "producer" &&
    !eventIdFromUrl &&
    !user.impersonated
  ) {
    console.error("Producer dashboard loaded without eventId");
    router.replace("/events");
  }
}, [user, eventIdFromUrl, router, isDemo]);



  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [openAddModal, setOpenAddModal] = useState(false);
  const loadGroups = useGroupStore((s) => s.loadGroups);


  const handleGuestUpdated = async (updatedGuest: Guest) => {
  setGuests((prev) =>
    prev.map((g) => {
      if (String(g._id) !== String(updatedGuest._id)) return g;

      return {
        ...g,

        // שדות בסיס
        name: updatedGuest.name,
        phone: updatedGuest.phone,
        relation: updatedGuest.relation,
        rsvp: updatedGuest.rsvp,

        // ⭐ הקריטי – כמות מוזמנים
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

  // ⭐⭐ זה מה שהיה חסר – סנכרון ההושבה
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

  const canManageEvent = Boolean(invitationId);

  const [event, setEvent] = useState<EventModel | null>(null);
const [openGroupModal, setOpenGroupModal] = useState(false);
const [selectedGroupId, setSelectedGroupId] = useState("");

const [openCallsGuest, setOpenCallsGuest] = useState<Guest | null>(null);




  // ✅ חיפוש
  const [search, setSearch] = useState("");

  // ✅ סינון מהיר
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");





  // ✅ מיון
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

  const url =
  eventIdFromUrl
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

  const url =
  eventIdFromUrl
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
      credentials: "include", // ⭐️ חובה עם cookies
      cache: "no-store",      // ⭐️ מונע קאש בין מכשירים
    }
  );

  const data = await res.json();
  setGuests(data.guests || []);
}

const handleExportExcel = async () => {
  // 🔒 חסימה בדמו
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
      `/api/guests/export?invitationId=${invitationId}`,
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
    a.download = "מוזמנים.xlsx";
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
  // ⭐️ DEMO – חסימת מחיקה בדמו
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

    // ✅ הוסיפי את השורה הזו
    setLoading(false);
  }

  initAfterUser();
}, [user, isDemo]);

useEffect(() => {
  if (isDemo) return;
  if (!user) return;

  // ⭐️ אם כבר התחזינו – לא לגעת
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
  // ⭐️ DEMO – טעינת נתוני דמו בלבד
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
  // ⭐️ DEMO – לא טוענים אורחים מהשרת בדמו
  if (isDemo) return;
  if (!invitationId) return;

  async function load() {
    await loadGuests();
    setLoading(false); // ✅ סוגרים loading רק אחרי שהאורחים מוכנים
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

  // ❌ במצב LIVE לא עושים polling
  if (workMode === "live") return;

  const interval = setInterval(() => {
    loadGuests();
  }, 5000);

  return () => clearInterval(interval);
}, [invitationId, isDemo, workMode]);



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
     Stats (על כל האורחים)
  ============================================================ */
  const stats = useMemo(() => {
  // 🟦 מוזמנים – קבועים
  const totalInvited = guests.reduce(
    (s, g) => s + (g.guestsCount || 0),
    0
  );

  // 🟩 מגיעים בפועל – אך ורק arrivedCount
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
  actualArrivedGuests: totalActualArrived, // ⭐ חדש
  notComing: totalNo,
  noResponse: totalPending,
};
}, [guests]);


  /* ============================================================
     WhatsApp (אישי – אישור הגעה בלבד)
  ============================================================ */
  const sendWhatsApp = (guest: Guest) => {
    const inviteLink = `https://invistimo.com/invite/rsvp/${invitation.shareId}?token=${guest.token}`;
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
    return null; // ⭐ לא התקשרו עדיין
  }

  const lastWithStatus = [...guest.callRounds]
    .reverse()
    .find((r) => r.status);

  return normalizeCallStatus(lastWithStatus?.status);
}




  /* ============================================================
     ✅ פילטר + מיון + חיפוש
  ============================================================ */
  const displayGuests = useMemo(() => {
  let list = [...guests];

  // 1) Quick filter
  if (quickFilter === "yes") list = list.filter((g) => g.rsvp === "yes");
  if (quickFilter === "no") list = list.filter((g) => g.rsvp === "no");

 

  if (quickFilter === "noTable") {
    list = list.filter((g) => !(g.tableName && g.tableName.trim()));
  }

// 📞 Call filters
if (quickFilter === "pending") {
  list = list.filter((g) => {
    // תנאי בסיס: באמת ממתין
    const isReallyPending =
      g.rsvp === "pending" &&
      (g.arrivedCount ?? 0) === 0 &&
      (g.actualArrivedCount ?? 0) === 0;

    if (!isReallyPending) return false;

    // סינון שיחות (ברירת מחדל)
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



  // 2) Search (name / phone)
  const q = search.trim().toLowerCase();
  if (q) {
    const qDigits = q.replace(/\D/g, "");
    list = list.filter((g) => {
      const name = (g.name || "").toLowerCase();
      const phoneDigits = (g.phone || "").replace(/\D/g, "");
      const nameMatch = name.includes(q);
      const phoneMatch = qDigits ? phoneDigits.includes(qDigits) : false;
      return nameMatch || phoneMatch;
    });
  }

  // ⭐ פילטר לפי קבוצה
  if (selectedGroupId) {
    list = list.filter((g) => g.groupId === selectedGroupId);
  }

  // 3) Sort
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


  // ⚠️ שאר המיון נשאר כמו שהוא (לא נגעתי)
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

  const showActionButtons = true;

  const updateActualArrived = async (guestId: string, next: number) => {
  // ✅ optimistic UI
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

  // ❌ רק אם השרת נכשל – טוענים מחדש
  if (!res.ok) {
    console.warn("actualArrivedCount failed – rollback");
    await loadGuests();
  }
};




  if (loading) return null;
  console.log("USER FROM /api/me:", user);
console.log("INVITATION:", invitation);

  /* ============================================================
     Render
  ============================================================ */
  return (
  <div className="px-4 py-6 md:p-10 max-w-full overflow-x-hidden" dir="rtl">
    {isDemo && (
      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900">
        <p className="text-sm leading-relaxed">
          🧪 <strong>מצב דמו פעיל</strong> –  
          המערכת פתוחה לצפייה בדשבורד, סידורי הושבה והודעות.  
          רוצים גישה מלאה לכל הפונקציות?{" "}
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


       {showActionButtons && (


        
  <>
    {/* ===================== ניהול האירוע ===================== */}
    <h1 className="text-3xl font-semibold mb-1">
      ניהול האירוע
    </h1>
    <p className="text-gray-500 mb-6">
      הוספת מוזמנים, שליחת הודעות וסידורי הושבה
    </p>

    {canViewActualArrived && (
  <div className="mb-6 flex items-center gap-3">
    <span className="text-sm text-gray-500">מצב עבודה:</span>

    <button
      onClick={() => setWorkMode("regular")}
      className={`
        px-4 py-2 rounded-full text-sm font-medium border
        ${workMode === "regular"
          ? "bg-black text-white border-black"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}
      `}
    >
      🧑‍💻 מצב רגיל
    </button>

    <button
      onClick={() => setWorkMode("live")}
      className={`
        px-4 py-2 rounded-full text-sm font-medium border
        ${workMode === "live"
          ? "bg-red-600 text-white border-red-600"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}
      `}
    >
      🔴 LIVE
    </button>
  </div>
)}



    

    {/* תיוג שירות שיחות */}
    {user?.includeCalls ? (
  <div className="mb-8">
    <div className="inline-flex items-center gap-2 bg-[#e6f7f1] text-[#138b55] px-4 py-2 rounded-full text-sm font-medium shadow-sm">
      ☎️ כולל שירות שיחות אישורי הגעה (3 סבבים)
    </div>
  </div>
) : (
  <div className="mb-8">
    <div className="inline-flex items-center gap-2 bg-[#fff7e6] text-[#b67c00] px-4 py-2 rounded-full text-sm font-medium shadow-sm">
      ⚠️ ללא שירות שיחות טלפוניים
    </div>
  </div>
)}



    {/* תיוג מתנות באשראי */}
    {user?.includeCreditGifts && (
  <div className="mb-8 flex flex-col gap-2">
    <div className="inline-flex items-center gap-2 bg-[#e6f7f1] text-[#138b55] px-4 py-2 rounded-full text-sm font-medium shadow-sm">
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

    <div className="text-xs text-gray-500">
      שתפו את הקישור עם האורחים כדי לאפשר מתנות באשראי
    </div>
  </div>
)}


    {/* ספירה לאחור */}
    {event && (
      <div className="flex items-center justify-between mb-6">
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
    )}

    {/* ===================== רשימת מוזמנים ===================== */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
      <h2 className="text-2xl font-semibold">
        רשימת מוזמנים
      </h2>

      {/* דסקטופ */}
      <div className="hidden md:flex flex-wrap gap-3">
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
          className="bg-white border border-gray-300 text-gray-800 px-6 py-3 rounded-full hover:bg-gray-50"
        >
          {invitation ? "✏️ עריכת הזמנה" : "➕ יצירת הזמנה"}
        </button>

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
            className="bg-white border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-50 flex items-center gap-2"
          >
            👁️ צפייה בהזמנה
          </button>
        )}

        <button
          onClick={() => setOpenAddModal(true)}
          className="bg-black text-white px-6 py-3 rounded-full font-semibold"
        >
          + הוספת מוזמן
        </button>

        <button
          onClick={() => setShowImportModal(true)}
          className="bg-white border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-50"
        >
          📥 ייבוא מאקסל
        </button>

        <button
          onClick={() =>
            router.push(isDemo ? "/try/dashboard/messages" : "/dashboard/messages")
          }
          className="bg-green-600 text-white px-8 py-3 rounded-full font-semibold"
        >
          💬 שליחת הודעות
        </button>



        <button
  onClick={() => {
    if (isDemo) {
      handleDemoBlockedAction();
      return;
    }

    router.push("/dashboard/seating");
  }}
  className="bg-[#c9b48f] text-white px-6 py-3 rounded-full font-semibold"
>
  🪑 סידורי הושבה
</button>

        <button
          onClick={() =>
            isDemo
              ? handleDemoBlockedAction()
              : router.push("/dashboard/event")
          }
          className="bg-white border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-50"
        >
          🛠️ עריכת פרטי האירוע
        </button>
      </div>

      {/* מובייל */}
      <div className="flex md:hidden flex-col gap-3">
       

        <button
          onClick={() => setOpenAddModal(true)}
          className="bg-black text-white px-6 py-3 rounded-full"
        >
          + הוספת מוזמן
        </button>

        <button
          onClick={() => setShowImportModal(true)}
          className="border border-gray-300 px-6 py-3 rounded-full"
        >
          📥 ייבוא מאקסל
        </button>
      </div>
    </div>
  </>
)}





      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
  <Box title="סה״כ מוזמנים" value={stats.totalGuests} />
  <Box title="סה״כ מגיעים" value={stats.comingGuests} color="green" />

  {canShowActualArrived && (

  <Box title="מגיעים בפועל" value={stats.actualArrivedGuests} color="blue" />
)}

  <Box title="לא מגיעים" value={stats.notComing} color="red" />
  <Box title="טרם השיבו" value={stats.noResponse} color="orange" />
</div>


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


      {/* ===================== DESKTOP TABLE ===================== */}
<div className="hidden md:block w-full overflow-x-auto">
  <table className="min-w-[900px] w-full border rounded-xl overflow-hidden bg-white">
    <thead className="bg-gray-100">
      <tr>
        <th
          className="p-3 text-right cursor-pointer select-none"
          onClick={() => toggleSort("name")}
        >
          שם מלא{sortArrow("name")}
        </th>

        <th className="p-3 text-right">טלפון</th>
        <th className="p-3 text-right">קרבה</th>

        <th className="p-3 text-right">קבוצה</th>

        <th
          className="p-3 text-right cursor-pointer select-none"
          onClick={() => toggleSort("rsvp")}
        >
          סטטוס{sortArrow("rsvp")}
        </th>

        <th
          className="p-3 text-right cursor-pointer select-none"
          onClick={() => toggleSort("invited")}
        >
          מוזמנים{sortArrow("invited")}
        </th>

        <th
          className="p-3 text-right cursor-pointer select-none"
          onClick={() => toggleSort("coming")}
        >
          מגיעים{sortArrow("coming")}
        </th>

        {canShowActualArrived && (

  <th className="p-3 text-right">מגיעים בפועל</th>
)}



        <th
          className="p-3 text-right cursor-pointer select-none"
          onClick={() => toggleSort("table")}
        >
          מס' שולחן{sortArrow("table")}
        </th>

        <th className="p-3 text-right">הערות</th>
        <th className="p-3 text-right">פעולות</th>
      </tr>
    </thead>

    <tbody>
      {displayGuests.map((g) => (
        <tr key={g._id} className="border-b">
          <td className="p-3">{g.name}</td>
          <td className="p-3">{formatPhone(g.phone)}</td>
          <td className="p-3">{g.relation?.trim() || "-"}</td>

          <td className="p-3">
  <GuestGroupSelect
  value={g.groupId}
  onChange={async (groupId) => {
    // UI
    setGuests((prev) =>
      prev.map((guest) =>
        guest._id === g._id
          ? { ...guest, groupId }
          : guest
      )
    );

    // DB
    await fetch(`/api/guests/${g._id}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ groupId }),
    });

    // ⭐️ חובה
    await loadGroups(invitationId);
  }}
/>


</td>

          <td className="p-3">{RSVP_LABELS[g.rsvp]}</td>
          <td className="p-3">{g.guestsCount}</td>

          <td className="p-3 font-semibold">
  {g.arrivedCount || 0}
</td>

{canShowActualArrived && (



  <td className="p-3">
    <div className="flex items-center gap-2">

      <button
  onClick={() => {
    const next = Math.max(0, (g.actualArrivedCount || 0) - 1);
    updateActualArrived(g._id, next);
  }}
>
  −
</button>

      <span className="font-semibold">
        {g.actualArrivedCount || 0}
      </span>

      <button
  onClick={() => {
    const next = (g.actualArrivedCount || 0) + 1;
    updateActualArrived(g._id, next);
  }}
>
  +
</button>


    </div>
  </td>
)}

<td className="p-3">
  {(() => {
    const guestKey = String(g.id ?? g._id ?? "");
const tableFromStore = guestTableMap.get(guestKey) || null;


    const tableLabel =
      (tableFromStore &&
        ( tableFromStore.name)) ||
      (g.tableName
        ? g.tableName
        : g.tableNumber
        ? `שולחן ${g.tableNumber}`
        : null);

    return tableLabel || "-";
  })()}
</td>



          <td className="p-3 text-sm text-gray-700">
            {g.notes?.trim() || "-"}
          </td>

          <td className="p-3 flex gap-3">

  {/* הודעה */}
  <button
    onClick={() =>
      router.push(
        isDemo
          ? `/try/dashboard/messages?guestId=${g._id}`
          : `/dashboard/messages?guestId=${g._id}`
      )
    }
    title="שליחת הודעה"
  >
    💬
  </button>

  {/* 📞 מעקב סבבי שיחה */}
  <button
    onClick={() => setOpenCallsGuest(g)}
    title="מעקב סבבי שיחה"
  >
    📞
  </button>

  {/* הושבה */}
  <button
    onClick={() =>
      router.push(
        isDemo
          ? `/try/dashboard/seating?from=personal&guestId=${g._id}`
          : `/dashboard/seating?from=personal&guestId=${g._id}`
      )
    }
    title="סידור הושבה"
  >
    🪑
  </button>

  {/* עריכה */}
  <button
    onClick={() => setSelectedGuest(g)}
    title="עריכת מוזמן"
  >
    ✏️
  </button>

  {/* מחיקה */}
  <button
    onClick={() => deleteGuest(g)}
    className="text-red-600"
    title="מחיקת מוזמן"
  >
    🗑️
  </button>

</td>

          
        </tr>
      ))}

      {displayGuests.length === 0 && (
        <tr>
          <td
  colSpan={canShowActualArrived ? 10 : 9}



  className="p-8 text-center text-gray-500"
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
      ? `/try/dashboard/messages?guestId=${g._id}`
      : `/dashboard/messages?guestId=${g._id}`
  )
}
onSeat={(g) =>
  router.push(
    isDemo
      ? `/try/dashboard/seating?from=personal&guestId=${g._id}`
      : `/dashboard/seating?from=personal&guestId=${g._id}`
  )
}
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
    // ✅ עובד גם בדמו וגם בפרוד – כולל הפעם הראשונה
    setGuests((prev) => [...prev, newGuest]);
    return;
  }

  // fallback (אם מסיבה כלשהי לא חזר guest)
  await loadGuests();
}}

  />
)}

{showImportModal && (
  <ImportExcelModal
    invitationId={invitationId}
    onClose={() => setShowImportModal(false)}
    onSuccess={loadGuests}
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
   UI helpers
============================================================ */
function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full border text-sm font-medium
        select-none whitespace-nowrap
        transition-all duration-150
        active:scale-95
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9b48f] focus-visible:ring-offset-2
        ${
          active
            ? "bg-[#c9b48f] text-white border-[#c9b48f] shadow-sm"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
        }
      `}
      aria-pressed={active}
    >
      {label}
    </button>
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
}: {
  title: string;
  value: number;
  color?: string;
  onClick?: () => void;
}) {
  const colors: Record<string, string> = {
  green: "text-green-600",
  blue: "text-blue-600",
  red: "text-red-600",
  orange: "text-orange-500",
};

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
        border p-5 rounded-xl bg-white text-center
        shadow-sm transition-all
        ${onClick ? "cursor-pointer hover:shadow-md active:scale-[0.99]" : ""}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9b48f] focus-visible:ring-offset-2
      `}
    >
      <div className="text-gray-500 text-sm mb-1">{title}</div>
      <div className={`text-3xl font-bold ${colors[color || ""] || ""}`}>
        {value}
      </div>
    </div>
  );
}