"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import EditGuestModal from "../components/EditGuestModal";
import AddGuestModal from "../components/AddGuestModal";
import UpgradeToPremium from "../components/UpgradeToPremium";
import { RSVP_LABELS } from "@/lib/rsvp";
import ImportExcelModal from "../components/ImportExcelModal"; 
import EventCountdown from "../components/EventCountdown";
import GuestsMobileList from "./components/GuestsMobileList";
import { usePathname } from "next/navigation";
import DemoToast from "../components/DemoToast";
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
  _id: string;
  name: string;
  phone: string;
  token: string;

  relation?: string;
  tableName?: string;
  tableNumber?: number;

  rsvp: "yes" | "no" | "pending";
  guestsCount: number;

  arrivedCount?: number; // ✅ נוכחות בפועל

  notes?: string;
};
type QuickFilter = "all" | "yes" | "no" | "pending" | "noTable";
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

  const pathname = usePathname();
const isDemo = pathname.startsWith("/try");

  const router = useRouter();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDemoToast, setShowDemoToast] = useState(false);

  const handleDemoBlockedAction = () => {
  setShowDemoToast(true);
};


  const [invitation, setInvitation] = useState<any | null>(null);
  const [invitationId, setInvitationId] = useState<string>("");
  const [event, setEvent] = useState<EventModel | null>(null);


  const [user, setUser] = useState<any | null>(null);
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
    const res = await fetch("/api/me");
    const data = await res.json();
    if (data.success) setUser(data.user);
  }

  /* ============================================================
     Load invitation
  ============================================================ */
  async function loadInvitation() {
  const res = await fetch("/api/invitations/my", {
    credentials: "include", // ⭐️ קריטי
    cache: "no-store",
  });

  const data = await res.json();

  if (data.success && data.invitation) {
    setInvitation(data.invitation);
    setInvitationId(data.invitation._id);
  }
}

async function loadEvent() {
  const res = await fetch("/api/events", {
    credentials: "include",
    cache: "no-store",
  });

  const data = await res.json();

  if (data.success && data.event) {
    setEvent(data.event);
  } else {
    // ✅ איפוס – מונע “זליגה” בין יוזרים
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

  async function init() {
    setEvent(null); // ✅ איפוס חד-משמעי לפני טעינה
    await loadUser();
    await loadInvitation();
    await loadEvent();
    setLoading(false);
  }

  init();
}, [isDemo]);


useEffect(() => {
  // ⭐️ DEMO – טעינת נתוני דמו בלבד
  if (!isDemo) return;

  setUser({ plan: "premium" }); // או basic
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

  loadGuests();
}, [invitationId, isDemo]);

useEffect(() => {
  // ⭐️ DEMO – לא מפעילים polling בדמו
  if (isDemo) return;
  if (!invitationId) return;

  const interval = setInterval(() => {
    loadGuests();
  }, 5000); // כל 5 שניות

  return () => clearInterval(interval);
}, [invitationId, isDemo]);

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

  const totalNo = guests.filter((g) => g.rsvp === "no").length;
  const totalPending = guests.filter((g) => g.rsvp === "pending").length;

  return {
    totalGuests: totalInvited,   // 🟦 סה״כ מוזמנים
    comingGuests: totalArrived,  // 🟩 סה״כ מגיעים
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
    const phone = `972${guest.phone.replace(/\D/g, "").replace(/^0/, "")}`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  /* ============================================================
     ✅ פילטר + מיון + חיפוש
  ============================================================ */
  const displayGuests = useMemo(() => {
    let list = [...guests];

    // 1) Quick filter
    if (quickFilter === "yes") list = list.filter((g) => g.rsvp === "yes");
    if (quickFilter === "no") list = list.filter((g) => g.rsvp === "no");
    if (quickFilter === "pending") list = list.filter((g) => g.rsvp === "pending");
    if (quickFilter === "noTable")
      list = list.filter((g) => !(g.tableName && g.tableName.trim()));

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

    // 3) Sort
    const rsvpOrder: Record<Guest["rsvp"], number> = { yes: 0, pending: 1, no: 2 };

    const getValue = (g: Guest) => {
  if (sortKey === "name") return (g.name || "").toLowerCase();
  if (sortKey === "table") return (g.tableName || "").toLowerCase();
  if (sortKey === "rsvp") return rsvpOrder[g.rsvp];
  if (sortKey === "invited") return g.guestsCount || 0;
  // coming = נוכחות אמיתית
  return g.arrivedCount || 0;
};

    list.sort((a, b) => {
      const va = getValue(a) as any;
      const vb = getValue(b) as any;

      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb), "he")
        : String(vb).localeCompare(String(va), "he");
    });

    return list;
  }, [guests, quickFilter, search, sortKey, sortDir]);

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


       <h1 className="text-4xl font-semibold mb-6">
  ניהול האירוע שלך
</h1>

{user?.createdByProducer === true && (
  <div className="flex flex-wrap gap-3 mb-6">
    <Link
      href="/events/production"
      className="border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-100 transition"
    >
      🎬 הפקת אירוע
    </Link>

    <Link
      href="/events/live"
      className="border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-100 transition"
    >
      🎛️ ניהול אירוע
    </Link>
  </div>
)}


    {/* תיוג שירות שיחות */}
{user?.plan === "premium" && (
  <div className="mb-8">
    {user.includeCalls ? (
      <div className="inline-flex items-center gap-2 bg-[#e6f7f1] text-[#138b55] px-4 py-2 rounded-full text-sm font-medium shadow-sm">
        ☎️ כולל שירות שיחות אישורי הגעה (3 סבבים)
      </div>
    ) : (
      <div className="inline-flex items-center gap-2 bg-[#fff7e6] text-[#b67c00] px-4 py-2 rounded-full text-sm font-medium shadow-sm">
        ⚠️ ללא שירות שיחות טלפוניים
      </div>
    )}
  </div>
)}

{/* תיוג מתנות באשראי */}
{user?.plan === "premium" && user.includeCreditGifts && (
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



  

    {/* ⬇⬇⬇ ספירה לאחור + עריכת פרטי אירוע ⬇⬇⬇ */}
    {event && (
  <div className="flex items-center justify-between mb-4">
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



{/* ⬇⬇⬇ רק עכשיו – שורת רשימת מוזמנים ⬇⬇⬇ */}
<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
  <h2 className="text-2xl font-semibold">
    רשימת מוזמנים
  </h2>

  {/* ===================== דסקטופ בלבד ===================== */}
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
  className="border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-100"
>
  {invitation ? "✏️ עריכת הזמנה" : "➕ יצירת הזמנה"}
</button>


    <button
  onClick={() => {
    router.push(
      isDemo
        ? "/try/dashboard/seating"
        : invitation
        ? "/dashboard/seating"
        : "/dashboard/create-invite"
    );
  }}
  className="bg-[#c9b48f] text-white px-6 py-3 rounded-full font-semibold"
>
  🪑 סידורי הושבה
</button>


    
  <>
    {/* 👁️ צפייה בהזמנה */}
    {invitation && (
  <button
    onClick={() => {
      if (isDemo) {
        handleDemoBlockedAction();
      } else {
        window.open(
          `https://www.invistimo.com/invite/${invitation.shareId}`,
          "_blank",
          "noopener,noreferrer"
        );
      }
    }}
    className="border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-100 flex items-center gap-2"
  >
    👁️ צפייה בהזמנה
  </button>
)}

    {/* 🛠️ עריכת פרטי האירוע */}
    <button
  onClick={() => {
    if (isDemo) {
      handleDemoBlockedAction();
    } else {
      router.push("/dashboard/event");
    }
  }}
  className="border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-100"
>
  🛠️ עריכת פרטי האירוע
</button>


  </>


   
      <button
  onClick={() => {
  router.push(
    isDemo ? "/try/dashboard/messages" : "/dashboard/messages"
  );
}}

  className="bg-green-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-700 transition"
>
  💬 שליחת הודעות
</button>


    

    <button
  onClick={() => {
    setOpenAddModal(true);
  }}
  className="bg-black text-white px-6 py-3 rounded-full"
>
  + הוספת מוזמן
</button>



    <button
      onClick={() => setShowImportModal(true)}
      className="border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-100"
      title="ייבוא רשימת מוזמנים מאקסל"
    >
      📥 ייבוא מאקסל
    </button>
  </div>

  {/* ===================== מובייל בלבד ===================== */}
  <div className="flex md:hidden flex-col gap-3">

  {/* ✏️ יצירת / עריכת הזמנה – ראשון */}
  <button
    onClick={() => {
      if (isDemo) {
        handleDemoBlockedAction(); // 🧪 Toast דמו
      } else {
        router.push(
          invitation
            ? `/dashboard/edit-invite/${invitationId}`
            : "/dashboard/create-invite"
        );
      }
    }}
    className="border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-100"
  >
    {invitation ? "✏️ עריכת הזמנה" : "➕ יצירת הזמנה"}
  </button>

  {/* ➕ הוספת מוזמן – שני */}
  <button
    onClick={() => setOpenAddModal(true)}
    className="bg-black text-white px-6 py-3 rounded-full"
  >
    + הוספת מוזמן
  </button>

  {/* 📥 ייבוא מאקסל – שלישי */}
  <button
    onClick={() => setShowImportModal(true)}
    className="border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-100"
  >
    📥 ייבוא מאקסל
  </button>

</div>

  
</div>



      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">

        <Box title="סה״כ מוזמנים" value={stats.totalGuests} />
        <Box title="סה״כ מגיעים" value={stats.comingGuests} color="green" />
        <Box title="לא מגיעים" value={stats.notComing} color="red" />
        <Box title="טרם השיבו" value={stats.noResponse} color="orange" />
      </div>

      {/* ✅ Controls row (search + filters) */}
<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
  
  {/* Search */}
  <div className="w-full md:max-w-[520px] relative">
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="חיפוש לפי שם או טלפון…"
      className="
        w-full border border-gray-300 rounded-full
        px-5 py-3 outline-none
        focus:ring-2 focus:ring-[#c9b48f]
        bg-white
      "
    />
    {search.trim() && (
      <button
        onClick={() => setSearch("")}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
      >
        ✕
      </button>
    )}
  </div>


        {/* Quick filters */}
<div
  className="
    grid grid-cols-3 gap-2
    md:flex md:flex-wrap md:gap-2 md:justify-start
  "
>
  <FilterPill
    active={quickFilter === "all"}
    onClick={() => setQuickFilter("all")}
    label="הכל"
  />

  <FilterPill
    active={quickFilter === "yes"}
    onClick={() => setQuickFilter("yes")}
    label="מגיעים"
  />

  <FilterPill
    active={quickFilter === "pending"}
    onClick={() => setQuickFilter("pending")}
    label="ממתינים"
  />

  {/* שורה שנייה – ממורכז */}
  <div className="col-span-3 flex justify-center gap-2 md:contents">
    <FilterPill
      active={quickFilter === "no"}
      onClick={() => setQuickFilter("no")}
      label="לא מגיעים"
    />
    <FilterPill
      active={quickFilter === "noTable"}
      onClick={() => setQuickFilter("noTable")}
      label="בלי שולחן"
    />
  </div>
</div>





        {/* Count */}
        <div className="text-sm text-gray-500 text-center md:text-left md:min-w-[140px]">

          מציג: <span className="font-semibold">{displayGuests.length}</span> / {guests.length}
        </div>
      </div>

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
          <td className="p-3">{RSVP_LABELS[g.rsvp]}</td>
          <td className="p-3">{g.guestsCount}</td>

          <td className="p-3 font-semibold">
  {g.arrivedCount || 0}
</td>

          <td className="p-3">
  {g.tableName
    ? g.tableName
    : g.tableNumber
    ? `שולחן ${g.tableNumber}`
    : "-"}
</td>

          <td className="p-3 text-sm text-gray-700">
            {g.notes?.trim() || "-"}
          </td>

          <td className="p-3 flex gap-3">
            
            <button
  onClick={() =>
    router.push(
      isDemo
        ? `/try/dashboard/messages?guestId=${g._id}`
        : `/dashboard/messages?guestId=${g._id}`
    )
  }
>
  💬
</button>

<button
  onClick={() =>
    router.push(
      isDemo
        ? `/try/dashboard/seating?from=personal&guestId=${g._id}`
        : `/dashboard/seating?from=personal&guestId=${g._id}`
    )
  }
>
  🪑
</button>

            <button onClick={() => setSelectedGuest(g)}>
              ✏️
            </button>

            <button
              onClick={() => deleteGuest(g)}
              className="text-red-600"
            >
              🗑️
            </button>
          </td>
        </tr>
      ))}

      {displayGuests.length === 0 && (
        <tr>
          <td colSpan={9} className="p-8 text-center text-gray-500">
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
    userRole={user?.role === "admin" ? "admin" : "guest"}

    onClose={() => setSelectedGuest(null)}
    onSuccess={loadGuests}
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
      onClick={onClick}
      className={`px-4 py-2 rounded-full border text-sm transition ${
        active
          ? "bg-[#c9b48f] text-white border-[#c9b48f]"
          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
      }`}
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
}: {
  title: string;
  value: number;
  color?: string;
}) {
  const colors: Record<string, string> = {
    green: "text-green-600",
    red: "text-red-600",
    orange: "text-orange-500",
  };

  return (
    <div className="border p-5 rounded-xl bg-white shadow-sm text-center">
      <div className="text-gray-500 text-sm mb-1">{title}</div>
      <div className={`text-3xl font-bold ${colors[color || ""] || ""}`}>
        {value}
      </div>
    </div>
  );
}
