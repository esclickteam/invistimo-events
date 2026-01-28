"use client";

import { useState, useMemo } from "react";
import { useSeatingStore } from "@/store/seatingStore";

export default function GroupSidebar({ variant = "desktop" }) {
  const groups = useSeatingStore((s) => s.groups);
  const guests = useSeatingStore((s) => s.guests);
  const tables = useSeatingStore((s) => s.tables);

  const getGroupSize = useSeatingStore((s) => s.getGroupSize);
  const seatGroup = useSeatingStore((s) => s.seatGroup);
  const unseatGroup = useSeatingStore((s) => s.unseatGroup);

  const [openGroupId, setOpenGroupId] = useState(null);

  if (!Array.isArray(groups)) return null;

  return (
    <div
      className={
        "bg-white overflow-y-auto " +
        (variant === "desktop"
          ? "hidden md:block w-72 h-full border-l shadow-xl"
          : "") +
        (variant === "mobile" ? "block md:hidden w-full h-full" : "")
      }
    >
      <h2 className="text-lg font-bold p-4 border-b text-gray-800">
        👥 קבוצות
      </h2>

      <ul>
        {groups.map((group) => {
          const size = getGroupSize(group._id);
          const isOpen = openGroupId === group._id;
          const isSeated = Boolean(group.tableId);

          const groupGuests = guests.filter(
            (g) => g.groupId === group._id
          );

          // שולחנות עם מספיק מקום פנוי לקבוצה
          const availableTables = tables.filter((t) => {
            const capacity = t.seats || 0;
            const used = t.seatedGuests?.length || 0;
            return capacity - used >= size;
          });

          return (
            <li
              key={group._id}
              className="p-3 border-b flex flex-col gap-2"
            >
              {/* HEADER */}
              <button
                type="button"
                onClick={() =>
                  setOpenGroupId(isOpen ? null : group._id)
                }
                className="flex justify-between items-center text-left"
              >
                <div className="font-medium text-gray-800">
                  {group.name}
                </div>

                <span className="text-xs text-gray-500">
                  {size} אורחים
                </span>
              </button>

              {/* BODY */}
              {isOpen && (
                <>
                  {/* רשימת אורחים */}
                  <div className="bg-gray-50 rounded p-2 text-sm space-y-1">
                    {groupGuests.map((g) => (
                      <div
                        key={g._id}
                        className="flex justify-between text-gray-700"
                      >
                        <span>{g.name}</span>
                        {g.guestsCount && (
                          <span className="text-xs text-gray-400">
                            {g.guestsCount}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* דרופדאון הושבה */}
                  <div className="flex items-center gap-2 mt-2">
                    <select
                      className="border rounded px-2 py-1 text-sm flex-1"
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
                      <option value="">ללא שולחן</option>

                      {availableTables.map((t) => {
                        const free =
                          (t.seats || 0) -
                          (t.seatedGuests?.length || 0);

                        return (
                          <option key={t.id} value={t.id}>
                            {t.name} · פנוי {free}/{t.seats}
                          </option>
                        );
                      })}
                    </select>

                    {isSeated && (
                      <button
                        onClick={() => unseatGroup(group._id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                        title="בטל הושבה"
                      >
                        ❌
                      </button>
                    )}
                  </div>

                  <div className="text-xs mt-1">
                    {isSeated ? (
                      <span className="text-green-600">
                        משובץ
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        לא משובץ
                      </span>
                    )}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

