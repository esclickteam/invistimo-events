"use client";

import { useMemo } from "react";
import { useSeatingStore } from "@/store/seatingStore";

export default function GuestSeatingPanel({ guestId, onClose }) {
  const guests = useSeatingStore((s) => s.guests);
  const groups = useSeatingStore((s) => s.groups);
  const tables = useSeatingStore((s) => s.tables);

  const assignGuestBlock = useSeatingStore((s) => s.assignGuestBlock);
  const removeFromSeat = useSeatingStore((s) => s.removeFromSeat);
  const seatGroup = useSeatingStore((s) => s.seatGroup);
  const unseatGroup = useSeatingStore((s) => s.unseatGroup);
  const getGroupSize = useSeatingStore((s) => s.getGroupSize);

  /* ===============================
     אורח + קבוצה
  =============================== */
  const guest = useMemo(
    () => guests.find((g) => String(g.id ?? g._id) === String(guestId)),
    [guests, guestId]
  );

  const group = useMemo(
    () =>
      guest?.groupId
        ? groups.find((gr) => String(gr._id) === String(guest.groupId))
        : null,
    [groups, guest]
  );

  if (!guest) return null;

  const guestTableId = guest.tableId || "";
  const groupSize = group ? getGroupSize(group._id) : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[#FFF7F2] rounded-2xl w-full max-w-3xl shadow-xl">
        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="text-lg font-bold text-gray-800">
            הקצאת שולחן
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* הקצאת שולחן לאורח */}
          <div className="bg-white rounded-xl p-4 border">
            <div className="text-sm text-gray-600 mb-2">
              בחר שולחן
            </div>

            <select
              className="w-full border rounded px-3 py-2"
              value={guestTableId}
              onChange={(e) => {
                const tableId = e.target.value;

                if (!tableId) {
                  removeFromSeat(guest.id ?? guest._id);
                } else {
                  assignGuestBlock({
                    guestId: guest.id ?? guest._id,
                    tableId,
                  });
                }
              }}
            >
              <option value="">ללא שולחן</option>

              {tables.map((t) => {
                const capacity = t.seats || 0;
                const used = t.seatedGuests?.length || 0;
                const free = capacity - used;

                return (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={free < 1}
                  >
                    {t.name} · {used}/{capacity}
                  </option>
                );
              })}
            </select>
          </div>

          {/* פרטי אורח */}
          <div className="bg-white rounded-xl p-4 border space-y-3">
            <div>
              <div className="text-xs text-gray-500">שם</div>
              <div className="font-medium">{guest.name}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">טלפון</div>
              <div>{guest.phone || "-"}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">מוזמנים</div>
              <div>{guest.guestsCount ?? 1}</div>
            </div>
          </div>
        </div>

        {/* קבוצה */}
        {group && (
          <div className="border-t p-6 bg-[#FFF3EC]">
            <div className="font-medium text-gray-700 mb-2">
              שייך לקבוצה: {group.name}
            </div>

            <select
              className="w-full border rounded px-3 py-2"
              value={group.tableId || ""}
              onChange={(e) => {
                const tableId = e.target.value;
                if (!tableId) {
                  unseatGroup(group._id);
                } else {
                  seatGroup(group._id, tableId);
                }
              }}
            >
              <option value="">ללא שולחן (קבוצה)</option>

              {tables.map((t) => {
                const capacity = t.seats || 0;
                const used = t.seatedGuests?.length || 0;
                const free = capacity - used;

                return (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={free < groupSize}
                  >
                    {t.name} · פנוי {free}/{capacity}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
