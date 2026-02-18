"use client";

/* ================= TYPES ================= */

export type FilterType = "all" | "pending" | "withTable";

type Props = {
  value: FilterType;
  onChange: (value: FilterType) => void;

  totalCount?: number;
  pendingCount?: number;
  withTableCount?: number;

  readOnly?: boolean;

  allowedFilters?: FilterType[]; // ⭐ חדש
};

/* ================= COMPONENT ================= */

export default function AudienceFilterSelector({
  value,
  onChange,
  totalCount,
  pendingCount,
  withTableCount,
  readOnly = false,
  allowedFilters = ["all", "pending", "withTable"], // ברירת מחדל – הכל
}: Props) {
  return (
    <section>
      <h3 className="font-semibold mb-2">👥 קהל יעד</h3>

      <select
        value={value}
        onChange={(e) =>
          !readOnly && onChange(e.target.value as FilterType)
        }
        disabled={readOnly}
        className="w-full border rounded-xl p-3 text-sm"
      >
        {allowedFilters.includes("all") && (
          <option value="all">
            לכל המוזמנים
            {typeof totalCount === "number" ? ` (${totalCount})` : ""}
          </option>
        )}

        {allowedFilters.includes("pending") && (
          <option value="pending">
            למי שטרם ענה
            {typeof pendingCount === "number" ? ` (${pendingCount})` : ""}
          </option>
        )}

        {allowedFilters.includes("withTable") && (
          <option value="withTable">
            למי שיש מספר שולחן
            {typeof withTableCount === "number"
              ? ` (${withTableCount})`
              : ""}
          </option>
        )}
      </select>

      <p className="text-xs text-gray-500 mt-1">
        הפילטר קובע אילו אורחים ייכללו בשליחה
      </p>
    </section>
  );
}
