"use client";

import type { Dispatch, SetStateAction } from "react";
import type { QuickFilter } from "@/types/quickFilter";

type Group = {
  _id: string;
  name: string;
};

type Props = {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;

  groups: Group[];
  selectedGroupId: string;
  setSelectedGroupId: Dispatch<SetStateAction<string>>;

  onManageGroups: () => void;

  quickFilter: QuickFilter;
  setQuickFilter: Dispatch<SetStateAction<QuickFilter>>;

  totalCount: number;
  displayCount: number;

  /**
   * מגבלת רשומות מהחבילה.
   * מגיע מהשדה user.guests.
   */
  recordsLimit?: number;

  /**
   * כמה רשומות כבר קיימות בפועל.
   * בדרך כלל זה guests.length.
   */
  usedRecordsCount?: number;

  onExportExcel: () => Promise<void> | void;

  onAddGuest: () => void;
  disabledAddGuest?: boolean;
};

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
  recordsLimit = 0,
  usedRecordsCount,
  onExportExcel,
  onAddGuest,
  disabledAddGuest = false,
}: Props) {
  const filters: {
    key: QuickFilter;
    label: string;
  }[] = [
    { key: "all", label: "הכל" },
    { key: "yes", label: "מגיעים" },
    { key: "no", label: "לא מגיעים" },
    { key: "pending", label: "בהמתנה" },
    { key: "noTable", label: "בלי שולחן" },
  ];

  const pendingCallFilters: {
    key: QuickFilter;
    label: string;
  }[] = [
    { key: "pending", label: "כל הממתינים" },
    { key: "call_answered", label: "ענה" },
    { key: "call_no_answer", label: "לא ענה" },
    { key: "call_will_reply", label: "ישיב בהודעה" },
  ];

  const isPendingFilterOpen =
    quickFilter === "pending" ||
    quickFilter === "call_answered" ||
    quickFilter === "call_no_answer" ||
    quickFilter === "call_will_reply";

  const safeRecordsLimit = Number(recordsLimit || 0);
  const safeUsedRecordsCount = Number(
    usedRecordsCount ?? totalCount ?? 0
  );

  const remainingRecords =
    safeRecordsLimit > 0
      ? Math.max(0, safeRecordsLimit - safeUsedRecordsCount)
      : null;

  return (
    <section
      dir="rtl"
      className="
        relative
        overflow-hidden
        rounded-[32px]
        border
        border-[#D8C4A5]
        bg-gradient-to-br
        from-[#FFFDF8]
        via-[#FFF9EE]
        to-[#F4E7D2]
        p-5
        shadow-[0_18px_55px_rgba(91,63,31,0.13)]
      "
    >
      <div
        className="
          pointer-events-none
          absolute
          -left-20
          -top-24
          h-48
          w-48
          rounded-full
          bg-[#D9B46F]/25
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          -right-24
          -bottom-24
          h-56
          w-56
          rounded-full
          bg-[#B8844F]/15
          blur-3xl
        "
      />

      <div className="relative z-10">
        <div
          className="
            mb-5
            flex
            flex-col
            gap-4
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
          <div>
            <h2 className="text-xl font-black text-[#241A14]">
              רשימת מוזמנים
            </h2>

            <div className="mt-1 flex flex-col gap-1">
              <p className="text-sm font-semibold text-[#8A7B69]">
                מוצגים {displayCount} מתוך {totalCount} מוזמנים
              </p>

              {safeRecordsLimit > 0 && (
                <p className="text-sm font-black text-[#8B5E34]">
                  יתרת רשומות להעלאה:{" "}
                  <span className="text-[#241A14]">
                    {remainingRecords}
                  </span>{" "}
                  מתוך{" "}
                  <span className="text-[#241A14]">
                    {safeRecordsLimit}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {safeRecordsLimit > 0 && (
              <div
                className="
                  inline-flex
                  h-[42px]
                  items-center
                  rounded-full
                  border
                  border-[#D9B46F]/45
                  bg-[#FFF8ED]
                  px-5
                  text-sm
                  font-black
                  text-[#8B5E34]
                  shadow-sm
                "
              >
                נשארו {remainingRecords} רשומות
              </div>
            )}

            <button
              type="button"
              onClick={onExportExcel}
              className="
                h-[42px]
                w-fit
                rounded-full
                border
                border-[#D8C4A5]
                bg-white/85
                px-5
                text-sm
                font-black
                text-[#6B5437]
                shadow-sm
                transition
                hover:bg-[#FFF7EA]
                hover:shadow-md
              "
            >
              ייצוא לאקסל
            </button>
          </div>
        </div>

        <div
          className="
            grid
            grid-cols-1
            gap-3
            xl:grid-cols-[minmax(360px,1fr)_220px_190px]
            xl:items-center
          "
        >
          <div
            className="
              flex
              min-h-[58px]
              items-center
              gap-3
              rounded-[22px]
              border
              border-[#D8C4A5]
              bg-white
              px-4
              shadow-[0_10px_25px_rgba(91,63,31,0.08)]
            "
          >
            <span className="text-lg text-[#B8844F]">⌕</span>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="חיפוש לפי שם או טלפון..."
              className="
                h-full
                min-w-0
                flex-1
                bg-transparent
                text-sm
                font-bold
                text-[#241A14]
                outline-none
                placeholder:text-[#B0A79D]
              "
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="
                  rounded-full
                  bg-[#F4EEE5]
                  px-3
                  py-1
                  text-xs
                  font-black
                  text-[#7B6857]
                  transition
                  hover:bg-[#E9DDC8]
                "
              >
                נקה
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onAddGuest}
            disabled={disabledAddGuest}
            className={`
              h-[58px]
              rounded-[22px]
              px-6
              text-sm
              font-black
              shadow-[0_14px_30px_rgba(184,132,79,0.28)]
              transition
              ${
                disabledAddGuest
                  ? "cursor-not-allowed bg-gray-200 text-gray-400 shadow-none"
                  : "bg-gradient-to-l from-[#B8844F] via-[#D4A762] to-[#E7C98D] text-white hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(184,132,79,0.38)]"
              }
            `}
          >
            + הוספת מוזמן
          </button>

          <select
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
            className="
              h-[58px]
              rounded-[22px]
              border
              border-[#D8C4A5]
              bg-white
              px-4
              text-sm
              font-black
              text-[#241A14]
              shadow-[0_10px_25px_rgba(91,63,31,0.06)]
              outline-none
            "
          >
            <option value="">כל הקבוצות</option>

            {groups.map((group) => (
              <option key={group._id} value={group._id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {filters.map((filter) => {
            const active =
              quickFilter === filter.key ||
              (filter.key === "pending" && isPendingFilterOpen);

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setQuickFilter(filter.key)}
                className={`
                  h-[40px]
                  rounded-full
                  border
                  px-5
                  text-sm
                  font-black
                  transition
                  ${
                    active
                      ? "border-[#B8844F] bg-[#B8844F] text-white shadow-[0_10px_20px_rgba(184,132,79,0.24)]"
                      : "border-[#E3D6C3] bg-white/80 text-[#6B5B4A] hover:bg-[#FFF7EA]"
                  }
                `}
              >
                {filter.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onManageGroups}
            className="
              h-[40px]
              rounded-full
              border
              border-[#D8C4A5]
              bg-white/80
              px-5
              text-sm
              font-black
              text-[#6B5437]
              transition
              hover:bg-[#FFF7EA]
            "
          >
            + הוספת קבוצה
          </button>
        </div>

        {isPendingFilterOpen && (
          <div
            className="
              mt-3
              flex
              flex-wrap
              items-center
              gap-2
              rounded-[24px]
              border
              border-[#E3D6C3]
              bg-white/55
              p-2
              shadow-[0_10px_25px_rgba(91,63,31,0.06)]
            "
          >
            {pendingCallFilters.map((filter) => {
              const active = quickFilter === filter.key;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setQuickFilter(filter.key)}
                  className={`
                    h-[36px]
                    rounded-full
                    border
                    px-4
                    text-xs
                    font-black
                    transition
                    ${
                      active
                        ? "border-[#B8844F] bg-[#B8844F] text-white shadow-[0_10px_20px_rgba(184,132,79,0.2)]"
                        : "border-[#E3D6C3] bg-white text-[#6B5B4A] hover:bg-[#FFF7EA]"
                    }
                  `}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}