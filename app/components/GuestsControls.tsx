"use client";

import { Dispatch, SetStateAction, useState } from "react";
import type { QuickFilter } from "@/types/quickFilter";

/* ============================================================
   Types
============================================================ */

type Group = { _id: string; name: string };

type PendingCallFilter =
  | "call_answered"
  | "call_no_answer"
  | "call_confirmed";

type Props = {
  /* 🔍 Search */
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;

  /* 🧩 Groups */
  groups?: Group[];
  selectedGroupId?: string;
  setSelectedGroupId?: Dispatch<SetStateAction<string>>;
  onManageGroups?: () => void;

  /* ⚡ Main quick filters */
  quickFilter: QuickFilter;
  setQuickFilter: Dispatch<SetStateAction<QuickFilter>>;

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

  // ⭐️ תת־פילטר פנימי לממתינים
  const [pendingCallFilter, setPendingCallFilter] =
    useState<PendingCallFilter>("call_no_answer");

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* ================= Search ================= */}
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

      {/* ================= Groups + Main Tabs ================= */}
      <div className="flex flex-wrap items-center gap-2">
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

        {/* Main filters */}
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
          active={quickFilter === "pending"}
          onClick={() => setQuickFilter("pending")}
          label="ממתינים"
        />

        <FilterPill
          active={quickFilter === "noTable"}
          onClick={() => setQuickFilter("noTable")}
          label="בלי שולחן"
        />
      </div>

      {/* ================= Pending Sub Tabs ================= */}
      {quickFilter === "pending" && (
        <div className="flex gap-2 ps-1">
          <FilterPill
            active={pendingCallFilter === "call_answered"}
            onClick={() => setPendingCallFilter("call_answered")}
            label="ענה לשיחה"
          />

          <FilterPill
            active={pendingCallFilter === "call_no_answer"}
            onClick={() => setPendingCallFilter("call_no_answer")}
            label="לא ענה"
          />

          <FilterPill
            active={pendingCallFilter === "call_confirmed"}
            onClick={() => setPendingCallFilter("call_confirmed")}
            label="אישר בשיחה"
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
        px-4 py-2 rounded-full border text-sm font-medium
        select-none whitespace-nowrap transition-all
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
