"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import EditGuestModal from "../components/EditGuestModal";
import AddGuestModal from "../components/AddGuestModal";
import UpgradeToPremium from "../components/UpgradeToPremium";
import { RSVP_LABELS } from "@/lib/rsvp";

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
  notes?: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [openAddModal, setOpenAddModal] = useState(false);

  const [invitation, setInvitation] = useState<any | null>(null);
  const [invitationId, setInvitationId] = useState<string>("");

  const [user, setUser] = useState<any | null>(null);

  // ✅ חיפוש
  const [search, setSearch] = useState("");

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
    const res = await fetch("/api/invitations/my");
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
    const res = await fetch(`/api/guests?invitation=${invitationId}`);
    const data = await res.json();
    setGuests(data.guests || []);
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
    if (invitationId) loadGuests();
  }, [invitationId]);

  /* ============================================================
     Stats (על כל האורחים)
  ============================================================ */
  const stats = {
    totalGuests: guests.reduce((s, g) => s + g.guestsCount, 0),
    comingGuests: guests.reduce(
      (s, g) => s + (g.rsvp === "yes" ? g.guestsCount : 0),
      0
    ),
    notComing: guests.filter((g) => g.rsvp === "no").length,
    noResponse: guests.filter((g) => g.rsvp === "pending").length,
  };

  /* ============================================================
     ✅ פילטר חיפוש (שם/טלפון)
  ============================================================ */
  const displayGuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guests;

    const qDigits = q.replace(/\D/g, "");

    return guests.filter((g) => {
      const name = (g.name || "").toLowerCase();
      const phoneDigits = (g.phone || "").replace(/\D/g, "");

      const nameMatch = name.includes(q);
      const phoneMatch = qDigits ? phoneDigits.includes(qDigits) : false;

      return nameMatch || phoneMatch;
    });
  }, [guests, search]);

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

  if (loading) return null;

  /* ============================================================
     Render
  ============================================================ */
  return (
    <div className="p-10" dir="rtl">
      <h1 className="text-4xl font-semibold mb-6">ניהול האירוע שלך</h1>

      {user?.plan === "basic" && (
        <div className="mb-10">
          <UpgradeToPremium paidAmount={user.paidAmount} />
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">רשימת מוזמנים</h2>

        <div className="flex gap-3">
          {/* יצירת / עריכת הזמנה */}
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

          {/* 🪑 הושבה כללית */}
          {invitation && (
            <button
              onClick={() => router.push("/dashboard/seating")}
              className="bg-[#c9b48f] text-white px-6 py-3 rounded-full font-semibold"
            >
              🪑 הושבה
            </button>
          )}

          {/* 💬 שליחת הודעות */}
          {invitation && (
            <button
              onClick={() => router.push("/dashboard/messages")}
              className="
                flex items-center gap-2
                bg-green-600 text-white
                px-6 py-3
                rounded-full
                font-semibold
                hover:bg-green-700
                transition
              "
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        <Box title="סה״כ מוזמנים" value={stats.totalGuests} />
        <Box title="סה״כ מגיעים" value={stats.comingGuests} color="green" />
        <Box title="לא מגיעים" value={stats.notComing} color="red" />
        <Box title="טרם השיבו" value={stats.noResponse} color="orange" />
      </div>

      {/* ✅ Search bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
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
              title="נקה חיפוש"
            >
              ✕
            </button>
          )}
        </div>

        <div className="text-sm text-gray-500 min-w-[140px] text-left">
          מציג: <span className="font-semibold">{displayGuests.length}</span> /
          {guests.length}
        </div>
      </div>

      {/* Table */}
      <table className="w-full border rounded-xl overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-right">שם מלא</th>
            <th className="p-3 text-right">טלפון</th>
            <th className="p-3 text-right">קרבה</th>
            <th className="p-3 text-right">סטטוס</th>
            <th className="p-3 text-right">מוזמנים</th>
            <th className="p-3 text-right">מגיעים</th>
            <th className="p-3 text-right">מס' שולחן</th>
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
                  onClick={() => sendWhatsApp(g)}
                  title="שליחת אישור הגעה ב-WhatsApp"
                  className="text-green-600 hover:text-green-700 transition"
                >
                  💬
                </button>

                {/* ✅ הושבה אישית */}
                <button
                  onClick={() =>
                    router.push(`/dashboard/seating?from=personal&guestId=${g._id}`)
                  }
                  title="הושבה אישית לאורח"
                >
                  🪑
                </button>

                <button onClick={() => setSelectedGuest(g)} title="עריכה">
                  ✏️
                </button>
              </td>
            </tr>
          ))}

          {displayGuests.length === 0 && (
            <tr>
              <td colSpan={9} className="p-8 text-center text-gray-500">
                לא נמצאו תוצאות לחיפוש.
              </td>
            </tr>
          )}
        </tbody>
      </table>

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
          onSuccess={loadGuests}
        />
      )}
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
