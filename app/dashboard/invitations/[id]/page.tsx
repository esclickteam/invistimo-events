"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function InvitationDashboardPage({ params }: any) {
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const resolved = await params;
      setInvitationId(resolved.id);

      const res = await fetch(`/api/invitations/${resolved.id}`);
      const data = await res.json();
      setGuests(data?.invitation?.guests || []);
      setLoading(false);
    }
    load();
  }, [params]);

  async function deleteGuest(id: string) {
    if (!confirm("למחוק את האורח?")) return;
    await fetch(`/api/guests/${id}`, { method: "DELETE" });
    setGuests((prev) => prev.filter((g) => g._id !== id));
  }

  function sendWhatsappInvite(guest: any) {
    const link = `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${guest._id}`;
    const message =
      `היי ${guest.name}! 🎉\nהוזמנת לאירוע שלנו.\n` +
      `נא לאשר הגעה כאן:\n${link}`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${guest.phone}?text=${encoded}`);
  }

  function openEditModal(guest: any) {
    alert("Modal עריכה ייפתח כאן"); // כאן נוסיף מודאל אמיתי בהמשך
  }

  function openSeatingModal(guest: any) {
    alert("Modal הושבה ייפתח כאן");
  }

  if (loading) return <div className="p-10 text-xl">טוען...</div>;

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">רשימת האורחים לאירוע</h1>

      <table className="w-full border rounded-xl overflow-hidden">
        <thead className="bg-gray-100 text-right">
          <tr>
            <th className="p-3">שם</th>
            <th className="p-3">טלפון</th>
            <th className="p-3">סטטוס</th>
            <th className="p-3">כמות</th>
            <th className="p-3">פעולות</th>
          </tr>
        </thead>

        <tbody>
          {guests.map((g) => (
            <tr key={g._id} className="border-b text-right">
              <td className="p-3">{g.name}</td>
              <td className="p-3">{g.phone}</td>

              <td className="p-3">
                {g.rsvp === "yes" && <span className="text-green-600">מגיע</span>}
                {g.rsvp === "no" && <span className="text-red-600">לא מגיע</span>}
                {g.rsvp === "pending" && (
                  <span className="text-gray-500">לא השיב</span>
                )}
              </td>

              <td className="p-3">{g.guestsCount || "-"}</td>

              <td className="p-3 flex gap-3 justify-end">

                {/* עריכה */}
                <button
                  onClick={() => openEditModal(g)}
                  className="text-blue-600 hover:underline"
                >
                  ערוך
                </button>

                {/* הושבה */}
                <button
                  onClick={() => openSeatingModal(g)}
                  className="text-orange-600 hover:underline"
                >
                  הושבה
                </button>

                {/* שליחת הזמנה */}
                <button
                  onClick={() => sendWhatsappInvite(g)}
                  className="text-green-600 hover:underline"
                >
                  שלח הזמנה
                </button>

                {/* מחיקה */}
                <button
                  onClick={() => deleteGuest(g._id)}
                  className="text-red-600 hover:underline"
                >
                  מחיקה
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* כפתור הוספת אורח */}
      <div className="mt-6">
        <button
          onClick={() => alert("Modal הוספת אורח")}
          className="bg-black text-white px-6 py-3 rounded-full"
        >
          + הוספת אורח
        </button>
      </div>
    </div>
  );
}
