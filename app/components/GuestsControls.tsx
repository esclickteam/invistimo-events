"use client";

import { Dispatch, SetStateAction } from "react";

/* ============================================================
   Types
============================================================ */

type Group = { _id: string; name: string };
type QuickFilter = "all" | "yes" | "no" | "pending" | "noTable";

type Props = {
  /* 🔍 Search – תמיד קיים */
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;

  /* 🧩 Groups – אופציונלי (Client בלבד) */
  groups?: Group[];
  selectedGroupId?: string;
  setSelectedGroupId?: Dispatch<SetStateAction<string>>;
  onManageGroups?: () => void;

  /* ⚡ Quick filters – אופציונלי (Client בלבד) */
  quickFilter?: QuickFilter;
  setQuickFilter?: Dispatch<SetStateAction<QuickFilter>>;

  /* 🔢 Count */
  totalCount: number;
  displayCount: number;
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
}: Props) {
  const showGroups =
    groups &&
    setSelectedGroupId &&
    typeof selectedGroupId === "string" &&
    onManageGroups;

  const showFilters = quickFilter && setQuickFilter;

  return (
    <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:gap-3 md:flex-nowrap">
      {/* 🔍 Search */}
      <div className="w-full md:w-[360px] relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם או טלפון…"
          className="
            w-full border border-gray-300 rounded-full
            px-5 py-3 outline-none
            focus:ring-2 focus:ring-[#c9b48f]
            bg-white
          "
        />
        {search.trim() && (
          <button
            onClick={() => setSearch("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            aria-label="נקה חיפוש"
          >
            ✕
          </button>
        )}
      </div>

      {/* 🧩 Groups + ⚡ Filters (Client בלבד) */}
      {(showGroups || showFilters) && (
        <div className="flex items-center gap-2 whitespace-nowrap">
          {/* Groups */}
          {showGroups && (
            <>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="rounded-full border px-4 py-2 text-sm bg-white"
              >
                <option value="">כל הקבוצות</option>
                {groups.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <button
                onClick={onManageGroups}
                className="rounded-full border px-4 py-2 text-sm bg-white hover:bg-gray-50"
              >
                + הוספת קבוצה
              </button>
            </>
          )}

          {/* Quick filters */}
          {showFilters && (
            <>
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
                active={quickFilter === "pending"}
                onClick={() => setQuickFilter("pending")}
                label="ממתינים"
              />
              <FilterPill
                active={quickFilter === "no"}
                onClick={() => setQuickFilter("no")}
                label="לא מגיעים"
              />
              <FilterPill
                active={quickFilter === "noTable"}
                onClick={() => setQuickFilter("noTable")}
                label="בלי שולחן"
              />
            </>
          )}
        </div>
      )}

      {/* 🔢 Counter */}
      <div className="text-sm text-gray-500 whitespace-nowrap md:min-w-[120px]">
        מציג:{" "}
        <span className="font-semibold">{displayCount}</span> / {totalCount}
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
        px-4 py-2 rounded-full border text-sm font-medium
        select-none whitespace-nowrap transition-all
        ${
          active
            ? "bg-[#c9b48f] text-white border-[#c9b48f]"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
        }
      `}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
