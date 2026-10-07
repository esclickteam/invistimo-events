"use client";

export type CallsTypeValue = "human" | "ivr";

type Props = {
  value: CallsTypeValue | "";
  onChange: (value: CallsTypeValue) => void;
  /** Unique radio name when multiple fields on one page */
  name?: string;
  required?: boolean;
  className?: string;
  title?: string;
  description?: string;
};

/**
 * Required call-package type selector shown when includeCalls / package includes calls.
 * human = מוקד אנושי · ivr = שיחות מוקלטות (IVR)
 */
export default function CallsTypeField({
  value,
  onChange,
  name = "callsType",
  required = true,
  className = "",
  title = "סוג השיחות",
  description = "חובה כאשר יש חבילת שיחות. הבחירה קובעת מוקד אנושי או שיחות מוקלטות (IVR).",
}: Props) {
  return (
    <section
      className={`rounded-[26px] border border-[#E7D8C6] bg-[#FFFDF8] p-5 ${className}`}
      data-testid="calls-type-field"
    >
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-black text-[#3A2A1C]">{title}</h3>
        {required ? (
          <span className="rounded-full bg-[#B97821]/15 px-2 py-0.5 text-[11px] font-black text-[#8A5A12]">
            חובה
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs font-bold leading-5 text-[#8A7867]">
        {description}
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label
          className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition ${
            value === "human"
              ? "border-[#B97821] bg-white shadow-sm"
              : "border-[#E7D8C6] bg-white"
          }`}
        >
          <input
            type="radio"
            name={name}
            checked={value === "human"}
            onChange={() => onChange("human")}
            className="accent-[#B97821]"
            required={required}
          />
          מוקד אנושי
        </label>

        <label
          className={`flex flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition ${
            value === "ivr"
              ? "border-[#B97821] bg-white shadow-sm"
              : "border-[#E7D8C6] bg-white"
          }`}
        >
          <input
            type="radio"
            name={name}
            checked={value === "ivr"}
            onChange={() => onChange("ivr")}
            className="accent-[#B97821]"
            required={required}
          />
          שיחות מוקלטות (IVR)
        </label>
      </div>

      {required && !value ? (
        <p className="mt-2 text-xs font-black text-[#B45309]">
          יש לבחור סוג שיחות לפני השמירה.
        </p>
      ) : null}
    </section>
  );
}

export function normalizeCallsTypeChoice(
  value: unknown
): CallsTypeValue | "" {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw === "ivr" || raw === "recorded" || raw === "recorded_ivr") {
    return "ivr";
  }
  if (raw === "human" || raw === "call_center" || raw === "callcenter") {
    return "human";
  }
  return "";
}
