"use client";

import { useState, useEffect } from "react";
import EditGuestModal from "../components/EditGuestModal";
import AddGuestModal from "../components/AddGuestModal"; // 👈 הייבוא החדש

export default function DashboardPage() {
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("guest-list");
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const [openAddModal, setOpenAddModal] = useState(false); // 👈 ניהול מודאל הוספה
  const [invitationId, setInvitationId] = useState<string>(""); // 👈 מזהה ההזמנה הנוכחית

  // ============================================================
  //  טעינת מוזמנים
  // ============================================================
  async function loadGuests() {
    try {
      const res = await fetch("/api/guests");
      const data = await res.json();
      setGuests(data.guests || []);

      // ✅ במידה ויש הזמנה אחת עיקרית - שומר את ה־ID שלה
      if (data.invitationId) setInvitationId(data.invitationId);
    } catch (err) {
      console.error("❌ שגיאה בטעינת מוזמנים:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadGuests();
  }, []);

  const stats = {
    total: guests.length,
    coming: guests.filter((g) => g.rsvp === "yes").length,
    notComing: guests.filter((g) => g.rsvp === "no").length,
    noResponse: guests.filter((g) => g.rsvp === "pending").length,
  };

  // ============================================================
  //  פעולות
  // ============================================================

  const sendWhatsApp = (guest: any) => {
    const link = `https://invistimo.com/invite/${guest.shareId}`;
    const msg = `היי ${guest.name}! הנה ההזמנה לאירוע:\n${link}`;
    const url = `https://wa.me/${guest.phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const editGuest = (guest: any) => setSelectedGuest(guest);
  const seatGuest = (guest: any) => alert(`הושבה לשולחן: ${guest.name}`);

  // ============================================================
  //  רינדור
  // ============================================================
  return (
    <div className="p-10">
      <h1 className="text-4xl font-semibold mb-6">ניהול האירוע שלך</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b pb-3">
        <button
          onClick={() => setActiveTab("guest-list")}
          className={`pb-2 ${activeTab === "guest-list" ? "border-b-2 border-black" : "text-gray-500"}`}
        >
          רשימת מוזמנים
        </button>

        <button
          onClick={() => setActiveTab("seating")}
          className={`pb-2 ${activeTab === "seating" ? "border-b-2 border-black" : "text-gray-500"}`}
        >
          סידורי הושבה
        </button>

        <button
          onClick={() => setActiveTab("stats")}
          className={`pb-2 ${activeTab === "stats" ? "border-b-2 border-black" : "text-gray-500"}`}
        >
          סטטיסטיקות
        </button>

        <button
          onClick={() => (window.location.href = "/dashboard/create-invite")}
          className="ml-auto bg-black text-white px-6 py-2 rounded-full"
        >
          🎨 יצירת הזמנה
        </button>
      </div>

      {loading && <div>טוען...</div>}

      {/* ============================
          GUEST LIST TAB
      ============================ */}
      {activeTab === "guest-list" && !loading && (
        <div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <Box title="סה״כ מוזמנים" value={stats.total} />
            <Box title="מאשרים הגעה" value={stats.coming} color="green" />
            <Box title="לא מגיעים" value={stats.notComing} color="red" />
            <Box title="טרם השיבו" value={stats.noResponse} color="orange" />
          </div>

          <table className="w-full text-right border rounded-xl overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">שם</th>
                <th className="p-3">טלפון</th>
                <th className="p-3">סטטוס</th>
                <th className="p-3">מס׳ מגיעים</th>
                <th className="p-3">וואטסאפ</th>
                <th className="p-3">הושבה</th>
                <th className="p-3">עריכה</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g._id} className="border-b">
                  <td className="p-3">{g.name}</td>
                  <td className="p-3">{g.phone}</td>
                  <td className="p-3">
                    {g.rsvp === "yes" && <span className="text-green-600">מגיע</span>}
                    {g.rsvp === "no" && <span className="text-red-600">לא מגיע</span>}
                    {g.rsvp === "pending" && <span className="text-gray-500">ממתין</span>}
                  </td>
                  <td className="p-3">{g.guestsCount}</td>
                  <td className="p-3">
                    <button onClick={() => sendWhatsApp(g)} className="text-green-600 hover:underline">
                      שלח 📩
                    </button>
                  </td>
                  <td className="p-3">
                    <button onClick={() => seatGuest(g)} className="text-purple-600 hover:underline">
                      הושב 🪑
                    </button>
                  </td>
                  <td className="p-3">
                    <button onClick={() => editGuest(g)} className="text-blue-600 hover:underline">
                      ערוך
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add Guest Button */}
          <button
            onClick={() => setOpenAddModal(true)} // 👈 נפתח המודאל שלך
            className="mt-6 bg-black text-white px-6 py-3 rounded-full"
          >
            + הוספת מוזמן
          </button>
        </div>
      )}

      {/* ============================
          מודאלים
      ============================ */}
      {selectedGuest && (
        <EditGuestModal
          guest={selectedGuest}
          onClose={() => setSelectedGuest(null)}
          onSuccess={() => loadGuests()}
        />
      )}

      {openAddModal && (
        <AddGuestModal
          invitationId={invitationId}
          onClose={() => setOpenAddModal(false)}
          onSuccess={() => loadGuests()}
        />
      )}
    </div>
  );
}

/* ================================
   BOX COMPONENT
================================ */
function Box({ title, value, color }: any) {
  const colors: any = {
    green: "text-green-600",
    red: "text-red-600",
    orange: "text-orange-500",
  };
  return (
    <div className="border p-5 rounded-xl bg-white shadow-sm text-center">
      <div className="text-gray-500 text-sm mb-1">{title}</div>
      <div className={`text-3xl font-bold ${colors[color] || ""}`}>{value}</div>
    </div>
  );
}
