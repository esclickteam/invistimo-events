"use client";

import { useMemo } from "react";
import { useSeatingStore } from "@/store/seatingStore";

export default function GroupSidebar({ variant = "desktop" }) {
  const groups = useSeatingStore((s) => s.groups);
  const tables = useSeatingStore((s) => s.tables);
  const getGroupSize = useSeatingStore((s) => s.getGroupSize);
  const seatGroup = useSeatingStore((s) => s.seatGroup);
  const unseatGroup = useSeatingStore((s) => s.unseatGroup);

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
          const isSeated = Boolean(group.tableId);

          return (
            <li
              key={group._id}
              className="p-3 border-b flex flex-col gap-2"
            >
              <div className="flex justify-between items-center">
                <div className="font-medium text-gray-800">
                  {group.name}
                </div>

                <span className="text-xs text-gray-500">
                  {size} מקומות
                </span>
              </div>

              <div className="flex items-center gap-2">
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

                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
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

              <div className="text-xs">
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
