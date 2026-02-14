"use client";

/* ================= TYPES ================= */

export type FilterType = "all" | "pending" | "withTable";

type Props = {
  value: FilterType;
  onChange: (value: FilterType) => void;

  totalCount?: number;
  pendingCount?: number;
  withTableCount?: number;

  readOnly?: boolean; // <--- הוסף פרופ קריאה בלבד
};

/* ================= COMPONENT ================= */

export default function AudienceFilterSelector({
  value,
  onChange,
  totalCount,
  pendingCount,
  withTableCount,
  readOnly = false, // ברירת מחדל: false
}: Props) {
  return (
    <section>
      <h3 className="font-semibold mb-2">👥 קהל יעד</h3>

      <select
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value as FilterType)} // אם קריאה בלבד, לא מעדכן
        disabled={readOnly} // הופך ל-disabled אם קריאה בלבד
        className="w-full border rounded-xl p-3 text-sm"
      >
        <option value="all">
          לכל המוזמנים
          {typeof totalCount === "number" ? ` (${totalCount})` : ""}
        </option>

        <option value="pending">
          למי שטרם ענה
          {typeof pendingCount === "number" ? ` (${pendingCount})` : ""}
        </option>

        <option value="withTable">
          למי שיש מספר שולחן
          {typeof withTableCount === "number" ? ` (${withTableCount})` : ""}
        </option>
      </select>

      <p className="text-xs text-gray-500 mt-1">
        הפילטר קובע אילו אורחים ייכללו בשליחה
      </p>
    </section>
  );
}
