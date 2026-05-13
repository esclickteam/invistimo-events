"use client";

import { Dispatch, SetStateAction } from "react";
import type { QuickFilter } from "@/types/quickFilter";

/* ============================================================
   Types
============================================================ */

type Group = { _id: string; name: string };

type Props = {
  /* 🔍 Search */
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;

  /* 🧩 Groups */
  groups?: Group[];
  selectedGroupId?: string;
  setSelectedGroupId?: Dispatch<SetStateAction<string>>;
  onManageGroups?: () => void;

  /* ⚡ Quick filters (SOURCE OF TRUTH) */
  quickFilter: QuickFilter;
  setQuickFilter: Dispatch<SetStateAction<QuickFilter>>;

  /* 🔢 Count */
  totalCount: number;
  displayCount: number;

  /* ➕ Add guest */
  onAddGuest?: () => void;

  /* 📤 Export */
  onExportExcel?: () => void;
};

/* ============================================================
   Component
============================================================ */

export default function GuestsControls({
  search,
  setSearch,

  groups,
  selectedGroupId,
  setSelectedGroupId,
  onManageGroups,

  quickFilter,
  setQuickFilter,

  totalCount,
  displayCount,

  onAddGuest,
  onExportExcel,
}: Props) {
  const showGroups =
    groups &&
    setSelectedGroupId &&
    typeof selectedGroupId === "string" &&
    onManageGroups;

  // ⭐️ האם אנחנו בתוך עולם "ממתינים"
  const isPendingView =
    quickFilter === "pending" ||
    quickFilter === "call_answered" ||
    quickFilter === "call_no_answer" ||
    quickFilter === "call_will_reply";

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* ================= Search ================= */}
      <div className="w-full md:w-[360px] relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם או טלפון…"
          className="
            w-full
            border
            border-gray-300
            rounded-full
            px-5
            py-3
            outline-none
            focus:ring-2
            focus:ring-[#c9b48f]
            bg-white
          "
        />

        {search.trim() && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-gray-400
              hover:text-gray-700
            "
            aria-label="נקה חיפוש"
          >
            ✕
          </button>
        )}
      </div>

      {/* ================= Groups + Main Tabs + Actions ================= */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* צד ימין – קבוצות + פילטרים */}
        <div className="flex flex-wrap items-center gap-2">
          {showGroups && (
            <>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="
                  rounded-full
                  border
                  border-gray-300
                  px-4
                  py-2
                  text-sm
                  bg-white
                  outline-none
                  hover:bg-gray-50
                  focus:ring-2
                  focus:ring-[#c9b48f]
                "
              >
                <option value="">כל הקבוצות</option>

                {groups.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={onManageGroups}
                className="
                  rounded-full
                  border
                  border-gray-300
                  px-4
                  py-2
                  text-sm
                  bg-white
                  hover:bg-gray-50
                  transition
                  whitespace-nowrap
                "
              >
                + הוספת קבוצה
              </button>
            </>
          )}

          {onAddGuest && (
            <button
              type="button"
              onClick={onAddGuest}
              className="
                rounded-full
                border
                border-[#c9b48f]
                bg-[#c9b48f]
                px-5
                py-2
                text-sm
                font-semibold
                text-white
                shadow-sm
                hover:bg-[#b89f78]
                hover:border-[#b89f78]
                transition
                whitespace-nowrap
              "
            >
              + הוספת מוזמן
            </button>
          )}

          <FilterPill
            active={quickFilter === "all"}
            onClick={() => setQuickFilter("all")}
            label="הכל"
          />

          <FilterPill
            active={quickFilter === "yes"}
            onClick={() => setQuickFilter("yes")}
            label="מגיעים"
          />

          <FilterPill
            active={quickFilter === "no"}
            onClick={() => setQuickFilter("no")}
            label="לא מגיעים"
          />

          <FilterPill
            active={isPendingView}
            onClick={() => setQuickFilter("pending")}
            label="ממתינים"
          />

          <FilterPill
            active={quickFilter === "noTable"}
            onClick={() => setQuickFilter("noTable")}
            label="בלי שולחן"
          />
        </div>

        {/* צד שמאל – פעולות */}
        {onExportExcel && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportExcel}
              className="
                rounded-full
                border
                border-gray-300
                px-4
                py-2
                text-sm
                bg-white
                hover:bg-gray-50
                transition
                whitespace-nowrap
              "
            >
              ייצוא לאקסל
            </button>
          </div>
        )}
      </div>

      {/* ================= Pending Sub Tabs ================= */}
      {isPendingView && (
        <div className="flex gap-2 ps-1 flex-wrap">
          <FilterPill
            active={quickFilter === "call_answered"}
            onClick={() => setQuickFilter("call_answered")}
            label="ענה לשיחה"
          />

          <FilterPill
            active={quickFilter === "call_no_answer"}
            onClick={() => setQuickFilter("call_no_answer")}
            label="לא ענה"
          />

          <FilterPill
            active={quickFilter === "call_will_reply"}
            onClick={() => setQuickFilter("call_will_reply")}
            label="ישיב בהודעה"
          />
        </div>
      )}

      {/* ================= Counter ================= */}
      <div className="text-sm text-gray-500 whitespace-nowrap">
        מציג: <span className="font-semibold">{displayCount}</span> /{" "}
        {totalCount}
      </div>
    </div>
  );
}

/* ============================================================
   Filter pill
============================================================ */

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-4
        py-2
        rounded-full
        border
        text-sm
        font-medium
        select-none
        whitespace-nowrap
        transition-all
        ${
          active
            ? "bg-[#c9b48f] text-white border-[#c9b48f] shadow-sm"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
        }
      `}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}