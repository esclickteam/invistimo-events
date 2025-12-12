"use client";

import { useState, useEffect } from "react";
import EditGuestModal from "../components/EditGuestModal";
import AddGuestModal from "../components/AddGuestModal";
import UpgradeToPremium from "../components/UpgradeToPremium";

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
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "guest-list" | "stats" | "upgrade"
  >("guest-list");

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
      if (data.success) {
        setUser(data.user);
      }
    } catch (err) {
      console.error("❌ שגיאה בטעינת משתמש:", err);
    }
  }

  /* ============================================================
     טוען הזמנה של המשתמש
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
     טוען מוזמנים לפי invitationId
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
     פונקציה: שליחת וואטסאפ (בודד)
  ============================================================ */
  const sendWhatsApp = (guest: Guest) => {
    if (!invitation) return;

    const inviteLink = `https://invistimo.com/invite/rsvp/${invitation.shareId}?token=${guest.token}`;

    const message = `
היי ${guest.name}! 💛✨

הזמנה אישית מחכה לך 🎉

📩 קישור להזמנה:
${inviteLink}

נשמח לראותך! ❤️
אנא אשר/י הגעה בלחיצה על הכפתור שבהזמנה 👇
`;

    const normalizedPhone = guest.phone.replace(/\D/g, "").replace(/^0/, "");
    const phoneForWhatsapp = `972${normalizedPhone}`;
    const encodedMessage = encodeURIComponent(message);

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const whatsappBaseUrl = isMobile
      ? "https://wa.me"
      : "https://web.whatsapp.com/send";

    const whatsappUrl = `${whatsappBaseUrl}?phone=${phoneForWhatsapp}&text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  };

  /* ============================================================
     פונקציה: שליחה קולקטיבית
  ============================================================ */
  const sendAllWhatsApps = async () => {
    if (!invitation || !guests.length) {
      alert("אין מוזמנים לשליחה 📭");
      return;
    }

    const confirmSend = confirm(
      `האם לשלוח הודעה לכל ${guests.length} המוזמנים?`
    );
    if (!confirmSend) return;

    alert(
      "שליחה קבוצתית החלה – אל תסגרי את החלון עד לסיום. וואטסאפ ייפתח לכל מוזמן בהפרשים קצרים 🕊️"
    );

    let lastWindow: Window | null = null;

    for (let i = 0; i < guests.length; i++) {
      const g = guests[i];
      if (!g.phone) continue;

      const inviteLink = `https://invistimo.com/invite/rsvp/${invitation.shareId}?token=${g.token}`;

      const message = `
היי ${g.name}! 💛✨

הזמנה אישית מחכה לך 🎉

📩 קישור להזמנה:
${inviteLink}

נשמח לראותך! ❤️
אנא אשר/י הגעה בלחיצה על הכפתור שבהזמנה 👇
`;

      const normalizedPhone = g.phone.replace(/\D/g, "").replace(/^0/, "");
      const phoneForWhatsapp = `972${normalizedPhone}`;
      const encodedMessage = encodeURIComponent(message);

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const whatsappBaseUrl = isMobile
        ? "https://wa.me"
        : "https://web.whatsapp.com/send";

      const whatsappUrl = `${whatsappBaseUrl}?phone=${phoneForWhatsapp}&text=${encodedMessage}`;

      if (lastWindow && !lastWindow.closed) lastWindow.close();
      lastWindow = window.open(whatsappUrl, "_blank");

      await new Promise((res) => setTimeout(res, 3000));
    }

    if (lastWindow && !lastWindow.closed) lastWindow.close();
    alert("✅ כל ההודעות נשלחו בהצלחה!");
  };

  /* ============================================================
     תצוגת דף
  ============================================================ */
  return (
    <div className="p-10">
      <h1 className="text-4xl font-semibold mb-6">ניהול האירוע שלך</h1>

      {/* ======================
          TABS
      ====================== */}
      <div className="flex gap-6 mb-8 border-b pb-3">
        <button
          onClick={() => setActiveTab("guest-list")}
          className={`pb-2 ${
            activeTab === "guest-list"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          רשימת מוזמנים
        </button>

        <button
          onClick={() => {
            if (!invitationId) {
              alert("לא נמצאה הזמנה.");
              return;
            }
            window.location.href = `/dashboard/seating?invitation=${invitationId}`;
          }}
          className="pb-2 text-gray-700 hover:text-black"
        >
          סידורי הושבה
        </button>

        <button
          onClick={() => setActiveTab("stats")}
          className={`pb-2 ${
            activeTab === "stats"
              ? "border-b-2 border-black"
              : "text-gray-500"
          }`}
        >
          סטטיסטיקות
        </button>

        {user?.plan === "basic" && (
          <button
            onClick={() => setActiveTab("upgrade")}
            className={`pb-2 font-semibold flex items-center gap-2 ${
              activeTab === "upgrade"
                ? "border-b-2 border-black"
                : "text-[#c9a86a]"
            }`}
          >
            שדרוג חבילה
            <span className="text-xs bg-[#c9a86a] text-white px-2 py-0.5 rounded-full">
              מומלץ
            </span>
          </button>
        )}
      </div>

      {loading && <div>טוען...</div>}

      {!invitation && !loading && (
        <div className="text-center text-gray-600 text-xl mt-20">
          עדיין לא יצרת הזמנה 🎉
        </div>
      )}

      {/* ======================
          TAB: GUEST LIST
      ====================== */}
      {invitation && activeTab === "guest-list" && (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <Box title="סה״כ מוזמנים" value={stats.total} />
            <Box title="מאשרים הגעה" value={stats.coming} color="green" />
            <Box title="לא מגיעים" value={stats.notComing} color="red" />
            <Box title="טרם השיבו" value={stats.noResponse} color="orange" />
          </div>

          {guests.length > 0 && (
            <div className="mb-6">
              <button
                onClick={sendAllWhatsApps}
                className="bg-green-600 text-white px-6 py-3 rounded-full"
              >
                📩 שלח הודעה לכולם
              </button>
            </div>
          )}

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

          <button
            onClick={() => setOpenAddModal(true)}
            className="mt-6 bg-black text-white px-6 py-3 rounded-full"
          >
            + הוספת מוזמן
          </button>
        </div>
      )}

      {/* ======================
          TAB: STATS
      ====================== */}
      {activeTab === "stats" && (
        <div className="text-center text-xl mt-10">
          סטטיסטיקות מתקדמות יופיעו כאן 📊
        </div>
      )}

      {/* ======================
          TAB: UPGRADE
      ====================== */}
      {activeTab === "upgrade" && user?.plan === "basic" && (
        <div className="max-w-3xl mx-auto mt-10">
          <UpgradeToPremium paidAmount={user.paidAmount ?? 0} />
        </div>
      )}

      {/* ======================
          MODALS
      ====================== */}
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
   BOX COMPONENT
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
