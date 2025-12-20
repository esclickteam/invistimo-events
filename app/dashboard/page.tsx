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

  rsvp: "yes" | "no" | "pending";
  guestsCount: number;

  arrivedCount?: number; // ✅ נוכחות בפועל

  notes?: string;
};
type QuickFilter = "all" | "yes" | "no" | "pending" | "noTable";
type SortKey = "name" | "rsvp" | "table" | "coming" | "invited";
type SortDir = "asc" | "desc";

export default function DashboardPage() {
  const router = useRouter();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);


  const [invitation, setInvitation] = useState<any | null>(null);
  const [invitationId, setInvitationId] = useState<string>("");

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
    async function init() {
      await loadUser();
      await loadInvitation();
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
  if (!invitationId) return;
  loadGuests();
}, [invitationId]);

  /* ============================================================
     Stats (על כל האורחים)
  ============================================================ */
  const stats = {
  totalGuests: guests.reduce((s, g) => s + g.guestsCount, 0),
  comingGuests: guests
    .filter((g) => g.rsvp === "yes")
    .reduce((s, g) => s + g.guestsCount, 0),
  notComing: guests.filter((g) => g.rsvp === "no").length,
  noResponse: guests.filter((g) => g.rsvp === "pending").length,
};

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
console.log("INVITATION:", invitation);

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div className="px-4 py-6 md:p-10 max-w-full overflow-x-hidden" dir="rtl">

       <h1 className="text-4xl font-semibold mb-6">
      ניהול האירוע שלך
    </h1>

    {user?.plan === "basic" && (
      <div className="mb-10">
        <UpgradeToPremium paidAmount={user.paidAmount} />
      </div>
    )}

    {/* ⬇⬇⬇ ספירה לאחור + עריכת פרטי אירוע ⬇⬇⬇ */}
    {invitation && (
  <div className="flex items-center justify-between mb-10">
    <div className="text-lg font-semibold">
      {invitation.eventDate ? (
        <EventCountdown invitation={invitation} />
      ) : (
        <span className="text-gray-500">
          📅 טרם הוגדר תאריך לאירוע
        </span>
      )}
    </div>

    <button
  onClick={() => router.push("/dashboard/event")}
  className="
    hidden md:inline-flex
    text-sm font-semibold
    text-[#8f7a67]
    hover:underline
    whitespace-nowrap
  "
>
  ✏️ עריכת פרטי האירוע
</button>
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
      onClick={() =>
        router.push(
          invitation
            ? `/dashboard/edit-invite/${invitationId}`
            : "/dashboard/create-invite"
        )
      }
      className="border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-100"
    >
      {invitation ? "✏️ עריכת הזמנה" : "➕ יצירת הזמנה"}
    </button>

    {invitation && (
      <button
        onClick={() => router.push("/dashboard/seating")}
        className="bg-[#c9b48f] text-white px-6 py-3 rounded-full font-semibold"
      >
        🪑סידורי הושבה
      </button>
    )}

    {invitation && (
      <a
        href={`https://www.invistimo.com/invite/${invitation.shareId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-100 flex items-center gap-2"
        title="צפייה בהזמנה כפי שהאורחים רואים"
      >
        👁️ צפייה בהזמנה
      </a>
    )}

    {invitation && (
      <button
        onClick={() => router.push("/dashboard/messages")}
        className="bg-green-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-green-700 transition"
      >
        💬 שליחת הודעות
      </button>
    )}

    <button
      onClick={() => setOpenAddModal(true)}
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
    <button
      onClick={() => setOpenAddModal(true)}
      className="bg-black text-white px-6 py-3 rounded-full"
    >
      + הוספת מוזמן
    </button>

    <button
      onClick={() =>
        router.push(
          invitation
            ? `/dashboard/edit-invite/${invitationId}`
            : "/dashboard/create-invite"
        )
      }
      className="border border-gray-300 px-6 py-3 rounded-full hover:bg-gray-100"
    >
      ✏️ עריכת הזמנה
    </button>

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
          <td className="p-3">{g.phone}</td>
          <td className="p-3">{g.relation?.trim() || "-"}</td>
          <td className="p-3">{RSVP_LABELS[g.rsvp]}</td>
          <td className="p-3">{g.guestsCount}</td>
          <td className="p-3 font-semibold">
            {g.rsvp === "yes" ? g.guestsCount : 0}
          </td>
          <td className="p-3">{g.tableName ?? "-"}</td>
          <td className="p-3 text-sm text-gray-700">
            {g.notes?.trim() || "-"}
          </td>

          <td className="p-3 flex gap-3">
            <button
              onClick={() =>
                router.push(`/dashboard/messages?guestId=${g._id}`)
              }
              className="text-green-600"
            >
              💬
            </button>

            <button
              onClick={() =>
                router.push(
                  `/dashboard/seating?from=personal&guestId=${g._id}`
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
      router.push(`/dashboard/messages?guestId=${g._id}`)
    }
    onSeat={(g) =>
      router.push(
        `/dashboard/seating?from=personal&guestId=${g._id}`
      )
    }
  />
</div>




      {selectedGuest && (
  <EditGuestModal
    guest={selectedGuest}
    onClose={() => setSelectedGuest(null)}
    onSuccess={loadGuests}
  />
)}

{openAddModal && (
  <AddGuestModal
    invitationId={invitationId}
    onClose={() => setOpenAddModal(false)}
    onSuccess={loadGuests}    // ⭐️ חובה
  />
)}

{showImportModal && (
  <ImportExcelModal
    invitationId={invitationId}
    onClose={() => setShowImportModal(false)}
    onSuccess={loadGuests}
  />
)}



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
