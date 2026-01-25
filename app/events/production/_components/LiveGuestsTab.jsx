"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AddGuestModal from "@/app/components/AddGuestModal";
import { useSeatingStore } from "@/store/seatingStore";

/* =========================
   Helpers
========================= */
function formatPhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) return digits;
  if (digits.length === 9 && digits.startsWith("5")) return "0" + digits;
  return digits;
}

function rsvpLabel(rsvp) {
  const map = { yes: "מגיע", pending: "ממתין", no: "לא מגיע" };
  return map[rsvp] || "-";
}

function confirmedCountForGuest(g) {
  return g?.rsvp === "yes" ? Number(g.guestsCount || 0) : 0;
}

/* =========================
   Component
========================= */
export default function LiveGuestsTab({ invitationId }) {
  const router = useRouter();

  const tables = useSeatingStore((s) => s.tables);
  const guests = useSeatingStore((s) => s.guests);
  const setGuests = useSeatingStore((s) => s.setGuests);
  const updateGuestArrived = useSeatingStore((s) => s.updateGuestArrived);
  const syncArrivedSeats = useSeatingStore((s) => s.syncArrivedSeats);

  const [openAddModal, setOpenAddModal] = useState(false);
  const [editGuest, setEditGuest] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =========================
     🔥 LOAD GUESTS (THE FIX)
  ========================= */
  useEffect(() => {
    if (!invitationId) return;

    setLoading(true);

    fetch(`/api/invitations/${invitationId}/guests`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.guests)) {
          setGuests(data.guests);
        }
      })
      .finally(() => setLoading(false));
  }, [invitationId, setGuests]);

  /* =========================
     Arrived + / -
  ========================= */
  function changeArrived(guest, delta) {
    const prev = Number(guest.arrivedCount || 0);
    const next = Math.max(0, prev + delta);
    if (prev === next) return;

    const updated = guests.map((g) =>
      g._id === guest._id ? { ...g, arrivedCount: next } : g
    );
    setGuests(updated);

    updateGuestArrived(guest._id, next);
    syncArrivedSeats(guest._id, next);

    fetch("/api/live-guests/arrived", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitationGuestId: guest._id,
        arrivedCount: next,
      }),
    }).catch(() => {});
  }

  /* =========================
     Stats
  ========================= */
  const stats = useMemo(() => {
    return {
      confirmed: guests.reduce(
        (s, g) => s + confirmedCountForGuest(g),
        0
      ),
      arrived: guests.reduce(
        (s, g) => s + Number(g.arrivedCount || 0),
        0
      ),
    };
  }, [guests]);

  const guestTableMap = useMemo(() => {
    const map = new Map();
    tables?.forEach((t) =>
      t.seatedGuests?.forEach((sg) => {
        if (sg?.guestId) map.set(String(sg.guestId), t);
      })
    );
    return map;
  }, [tables]);

  if (loading) {
    return <div className="p-6 text-center">טוען אורחים…</div>;
  }

  return (
    <div className="flex flex-col gap-6 pb-24" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Stat title="אישרו הגעה" value={stats.confirmed} />
        <Stat title="הגיעו בפועל" value={stats.arrived} color="green" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white border rounded-xl">
        <table className="min-w-[1200px] w-full">
          <thead className="bg-gray-100">
            <tr>
              <th>שם</th>
              <th>טלפון</th>
              <th>קרבה</th>
              <th>סטטוס</th>
              <th>אישרו</th>
              <th>הגיעו בפועל</th>
              <th>שולחן</th>
              <th>הערות</th>
              <th>פעולות</th>
            </tr>
          </thead>

          <tbody>
            {guests.map((g) => {
              const table = guestTableMap.get(String(g._id));
              return (
                <tr key={g._id} className="border-t">
                  <td>{g.name}</td>
                  <td>{formatPhone(g.phone)}</td>
                  <td>{g.relation || "-"}</td>
                  <td>{rsvpLabel(g.rsvp)}</td>
                  <td>{confirmedCountForGuest(g)}</td>

                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => changeArrived(g, -1)}
                        disabled={g.arrivedCount <= 0}
                      >
                        −
                      </button>
                      <strong>{g.arrivedCount || 0}</strong>
                      <button onClick={() => changeArrived(g, +1)}>+</button>
                    </div>
                  </td>

                  <td>{table?.name || "-"}</td>
                  <td>{g.notes || "-"}</td>

                  <td className="flex gap-2">
                    <button
                      onClick={() =>
                        router.push(
                          `/events/production?tab=live-seating&focusGuestId=${g._id}`
                        )
                      }
                    >
                      🪑
                    </button>
                    <button onClick={() => setEditGuest(g)}>✏️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add guest */}
      {openAddModal && (
        <AddGuestModal
          invitationId={invitationId}
          onClose={() => setOpenAddModal(false)}
          onSuccess={(g) => {
            setGuests([...guests, g]);
            setOpenAddModal(false);
          }}
        />
      )}

      <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end">
        <button
          onClick={() => setOpenAddModal(true)}
          className="px-6 py-3 bg-black text-white rounded"
        >
          + הוספת מוזמן
        </button>
      </div>
    </div>
  );
}

/* =========================
   UI helpers
========================= */
function Stat({ title, value, color }) {
  return (
    <div className="border p-4 rounded-xl text-center bg-white">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`text-3xl font-bold ${color === "green" ? "text-green-600" : ""}`}>
        {value}
      </div>
    </div>
  );
}
