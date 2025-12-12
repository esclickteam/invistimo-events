"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import EditGuestModal from "../components/EditGuestModal";
import AddGuestModal from "../components/AddGuestModal";
import UpgradeToPremium from "../components/UpgradeToPremium";
import { RSVP_LABELS, RSVPStatus } from "@/lib/rsvp";


/* ============================================================
   טיפוס בסיסי למוזמן
=========================================================== */
type Guest = {
  _id: string;
  name: string;
  phone: string;
  token: string;
  rsvp: "yes" | "no" | "pending";
  guestsCount: number;
};

export default function DashboardPage() {
  const router = useRouter();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("guest-list");

  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [openAddModal, setOpenAddModal] = useState(false);

  const [invitation, setInvitation] = useState<any | null>(null);
  const [invitationId, setInvitationId] = useState<string>("");

  const [user, setUser] = useState<any | null>(null);

  /* ============================================================
     טוען משתמש
  ============================================================ */
  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) setUser(data.user);
    } catch (err) {
      console.error("❌ שגיאה בטעינת משתמש:", err);
    }
  }

  /* ============================================================
     טוען הזמנה
  ============================================================ */
  async function loadInvitation() {
    try {
      const res = await fetch("/api/invitations/my");
      const data = await res.json();

      if (data.success) {
        setInvitation(data.invitation || null);
        if (data.invitation?._id) {
          setInvitationId(data.invitation._id);
        }
      }
    } catch (err) {
      console.error("❌ שגיאה בטעינת הזמנה:", err);
    }
  }

  /* ============================================================
     טוען מוזמנים
  ============================================================ */
  async function loadGuests() {
    if (!invitationId) return;
    try {
      const res = await fetch(`/api/guests?invitation=${invitationId}`);
      const data = await res.json();
      setGuests(data.guests || []);
    } catch (err) {
      console.error("❌ שגיאה בטעינת מוזמנים:", err);
    }
  }

  /* ============================================================
     INIT
  ============================================================ */
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
     סטטיסטיקות
  ============================================================ */
  const stats = {
    total: guests.length,
    coming: guests.filter((g) => g.rsvp === "yes").length,
    notComing: guests.filter((g) => g.rsvp === "no").length,
    noResponse: guests.filter((g) => g.rsvp === "pending").length,
  };

  /* ============================================================
     שליחת וואטסאפ
  ============================================================ */
  const sendWhatsApp = (guest: Guest) => {
    const inviteLink = `https://invistimo.com/invite/rsvp/${invitation.shareId}?token=${guest.token}`;

    const message = `
היי ${guest.name}! 💛✨

הזמנה אישית מחכה לך 🎉
📩 קישור להזמנה:
${inviteLink}

נשמח לראותך ❤️
`;

    const normalizedPhone = guest.phone.replace(/\D/g, "").replace(/^0/, "");
    const phoneForWhatsapp = `972${normalizedPhone}`;
    const encodedMessage = encodeURIComponent(message);

    const base = /Android|iPhone|iPad/i.test(navigator.userAgent)
      ? "https://wa.me"
      : "https://web.whatsapp.com/send";

    window.open(
      `${base}?phone=${phoneForWhatsapp}&text=${encodedMessage}`,
      "_blank"
    );
  };

  /* ============================================================
     תצוגת דף
  ============================================================ */
  return (
    <div className="p-10">
      <h1 className="text-4xl font-semibold mb-6">ניהול האירוע שלך</h1>

      {/* 🔔 שדרוג */}
      {user?.plan === "basic" && (
        <div className="mb-10">
          <UpgradeToPremium paidAmount={user.paidAmount} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b pb-3">
        <button
          onClick={() => setActiveTab("guest-list")}
          className={activeTab === "guest-list" ? "border-b-2 border-black pb-2" : "text-gray-500 pb-2"}
        >
          רשימת מוזמנים
        </button>

        <button
          onClick={() =>
            invitationId
              ? router.push(`/dashboard/seating?invitation=${invitationId}`)
              : alert("לא נמצאה הזמנה")
          }
          className="pb-2 text-gray-700"
        >
          סידורי הושבה
        </button>
      </div>

      {loading && <div>טוען...</div>}

      {/* ============================
          NO INVITATION
      ============================ */}
      {!invitation && !loading && (
        <div className="flex flex-col items-center justify-center mt-32 space-y-6">
          <div className="text-2xl text-gray-700">
            עדיין לא יצרת הזמנה 🎉
          </div>

          <button
            onClick={() => router.push("/dashboard/create-invite")}
            className="bg-black text-white px-8 py-4 rounded-full text-lg"
          >
            ➕ צור הזמנה
          </button>
        </div>
      )}

      {/* ============================
          GUEST LIST
      ============================ */}
      {invitation && activeTab === "guest-list" && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">רשימת מוזמנים</h2>

            <button
              onClick={() => setOpenAddModal(true)}
              className="bg-black text-white px-6 py-3 rounded-full"
            >
              + הוספת מוזמן
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-10">
            <Box title="סה״כ מוזמנים" value={stats.total} />
            <Box title="מאשרים הגעה" value={stats.coming} color="green" />
            <Box title="לא מגיעים" value={stats.notComing} color="red" />
            <Box title="טרם השיבו" value={stats.noResponse} color="orange" />
          </div>

          {/* Empty guests */}
          {guests.length === 0 ? (
            <div className="flex flex-col items-center mt-20 space-y-6 text-gray-600">
              <div className="text-xl">עדיין לא הוספת אורחים להזמנה 🎉</div>
              <button
                onClick={() => setOpenAddModal(true)}
                className="bg-black text-white px-8 py-4 rounded-full"
              >
                ➕ הוסף אורח ראשון
              </button>
            </div>
          ) : (
            <table className="w-full text-right border rounded-xl overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3">שם</th>
                  <th className="p-3">טלפון</th>
                  <th className="p-3">סטטוס</th>
                  <th className="p-3">מס׳ מגיעים</th>
                  <th className="p-3">וואטסאפ</th>
                  <th className="p-3">עריכה</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g._id} className="border-b">
                    <td className="p-3">{g.name}</td>
                    <td className="p-3">{g.phone}</td>
                    <td className="p-3">{g.rsvp}</td>
                    <td className="p-3">{g.guestsCount}</td>
                    <td className="p-3">
                      <button
                        onClick={() => sendWhatsApp(g)}
                        className="text-green-600"
                      >
                        שלח 📩
                      </button>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setSelectedGuest(g)}
                        className="text-blue-600"
                      >
                        ערוך
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modals */}
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
   BOX
=========================================================== */
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
