"use client";

import { useState, useEffect } from "react";
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
  tableNumber?: number;

  rsvp: "yes" | "no" | "pending";

  guestsCount: number;

  /** ⭐ הערות מה-RSVP */
  notes?: string[];
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
     Stats
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
     WhatsApp
  ============================================================ */
  const sendWhatsApp = (guest: Guest) => {
    const inviteLink = `https://invistimo.com/invite/rsvp/${invitation.shareId}?token=${guest.token}`;

    const message = `
היי ${guest.name}! 💛
הזמנה אישית מחכה לך 🎉
${inviteLink}
`;

    const phone = `972${guest.phone.replace(/\D/g, "").replace(/^0/, "")}`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

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

      {invitation && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">רשימת מוזמנים</h2>

            <div className="flex gap-3">
              {/* ⭐ כפתור הושבה ראשי */}
              <button
                onClick={() =>
                  router.push(`/dashboard/seating/${invitationId}`)
                }
                className="bg-[#c9b48f] text-white px-6 py-3 rounded-full font-semibold"
              >
                🪑 הושבה
              </button>

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

          {/* Table */}
          <table className="w-full border rounded-xl overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-right">שם</th>
                <th className="p-3 text-right">טלפון</th>
                <th className="p-3 text-right">סטטוס</th>
                <th className="p-3 text-right">מוזמנים</th>
                <th className="p-3 text-right">מגיעים</th>
                <th className="p-3 text-right">שולחן</th>
                <th className="p-3 text-right">הערות</th>
                <th className="p-3 text-right">פעולות</th>
              </tr>
            </thead>

            <tbody>
              {guests.map((g) => (
                <tr key={g._id} className="border-b">
                  <td className="p-3">{g.name}</td>
                  <td className="p-3">{g.phone}</td>
                  <td className="p-3">{RSVP_LABELS[g.rsvp]}</td>
                  <td className="p-3">{g.guestsCount}</td>
                  <td className="p-3 font-semibold">
                    {g.rsvp === "yes" ? g.guestsCount : 0}
                  </td>
                  <td className="p-3">{g.tableNumber ?? "-"}</td>

                  {/* ⭐ הערות */}
                  <td className="p-3 text-sm text-gray-700">
                    {g.notes?.length ? g.notes.join(", ") : "-"}
                  </td>

                  <td className="p-3 flex gap-3">
                    <button
                      onClick={() => sendWhatsApp(g)}
                      title="שליחת הודעה"
                    >
                      📩
                    </button>

                    {/* ⭐ הושבה אישית */}
                    <button
                      onClick={() =>
                        router.push(
                          `/dashboard/seating/${invitationId}?guestId=${g._id}`
                        )
                      }
                      title="הושבה לאורח"
                    >
                      🪑
                    </button>

                    <button onClick={() => setSelectedGuest(g)}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

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
