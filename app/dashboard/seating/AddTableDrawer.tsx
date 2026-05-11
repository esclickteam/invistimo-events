"use client";

import { useMemo, useState } from "react";
import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Armchair, Users, Sparkles } from "lucide-react";

/* ============================================================
   TYPES
============================================================ */

type TableType = "round" | "square" | "banquet";

type AddTablePayload = {
  type: string;
  seats: number;
};

type AddTableDrawerProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (data: AddTablePayload) => void;
};

type TableOption = {
  id: TableType;
  name: string;
  subtitle: string;
};

/* ============================================================
   CONSTANTS
============================================================ */

const TABLE_TYPES: TableOption[] = [
  {
    id: "banquet",
    name: "אבירים",
    subtitle: "שולחן מלבני ארוך",
  },
  {
    id: "square",
    name: "מרובע",
    subtitle: "שולחן סטנדרטי",
  },
  {
    id: "round",
    name: "עגול",
    subtitle: "שולחן עגול",
  },
];

/* ============================================================
   UI HELPERS
============================================================ */

function SeatDot({
  active,
  className = "",
  style,
}: {
  active: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={style}
      className={`
        block h-[10px] w-[10px] rounded-[3px]
        border shadow-[0_1px_3px_rgba(90,60,30,0.12)]
        ${
          active
            ? "border-[#8B6532] bg-[#B98A45]"
            : "border-[#D9C3A2] bg-[#FFF9EF]"
        }
        ${className}
      `}
    />
  );
}

function TablePreview({
  type,
  active,
}: {
  type: TableType;
  active: boolean;
}) {
  if (type === "round") {
    return (
      <div className="relative mx-auto h-[86px] w-[86px]">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const x = 38 + Math.cos(angle) * 34;
          const y = 38 + Math.sin(angle) * 34;

          return (
            <SeatDot
              key={i}
              active={active}
              className="absolute"
              style={{
                right: `${x}px`,
                top: `${y}px`,
              }}
            />
          );
        })}

        <div
          className={`
            absolute left-1/2 top-1/2
            flex h-[48px] w-[48px]
            -translate-x-1/2 -translate-y-1/2
            items-center justify-center
            rounded-full border
            shadow-[0_8px_18px_rgba(80,50,20,0.08)]
            ${
              active
                ? "border-[#8B6532] bg-gradient-to-br from-[#FFF1CC] via-[#D8B36A] to-[#B98A45]"
                : "border-[#D6C0A2] bg-[#FFFDF8]"
            }
          `}
        >
          <span className="text-[10px] font-black text-[#5D4032]">עגול</span>
        </div>
      </div>
    );
  }

  if (type === "banquet") {
    return (
      <div className="relative mx-auto h-[86px] w-[104px]">
        <div className="absolute right-[8px] top-[9px] flex flex-col gap-[5px]">
          {Array.from({ length: 7 }).map((_, i) => (
            <SeatDot key={i} active={active} />
          ))}
        </div>

        <div className="absolute left-[8px] top-[9px] flex flex-col gap-[5px]">
          {Array.from({ length: 7 }).map((_, i) => (
            <SeatDot key={i} active={active} />
          ))}
        </div>

        <div
          className={`
            absolute left-1/2 top-1/2
            flex h-[68px] w-[48px]
            -translate-x-1/2 -translate-y-1/2
            items-center justify-center
            rounded-[17px] border
            shadow-[0_8px_18px_rgba(80,50,20,0.08)]
            ${
              active
                ? "border-[#8B6532] bg-gradient-to-b from-[#FFF1CC] via-[#D8B36A] to-[#B98A45]"
                : "border-[#D6C0A2] bg-[#FFFDF8]"
            }
          `}
        >
          <span className="rotate-90 text-[10px] font-black text-[#5D4032]">
            אבירים
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-[86px] w-[96px]">
      <div className="absolute right-[23px] top-0 flex gap-[6px]">
        <SeatDot active={active} />
        <SeatDot active={active} />
        <SeatDot active={active} />
      </div>

      <div className="absolute right-[23px] bottom-0 flex gap-[6px]">
        <SeatDot active={active} />
        <SeatDot active={active} />
        <SeatDot active={active} />
      </div>

      <div className="absolute right-0 top-[25px] flex flex-col gap-[6px]">
        <SeatDot active={active} />
        <SeatDot active={active} />
      </div>

      <div className="absolute left-0 top-[25px] flex flex-col gap-[6px]">
        <SeatDot active={active} />
        <SeatDot active={active} />
      </div>

      <div
        className={`
          absolute left-1/2 top-1/2
          flex h-[50px] w-[56px]
          -translate-x-1/2 -translate-y-1/2
          items-center justify-center
          rounded-[15px] border
          shadow-[0_8px_18px_rgba(80,50,20,0.08)]
          ${
            active
              ? "border-[#8B6532] bg-gradient-to-br from-[#FFF1CC] via-[#D8B36A] to-[#B98A45]"
              : "border-[#D6C0A2] bg-[#FFFDF8]"
          }
        `}
      >
        <span className="text-[10px] font-black text-[#5D4032]">מרובע</span>
      </div>
    </div>
  );
}

function NumberInput({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const normalizeValue = () => {
    if (Number.isNaN(value)) {
      onChange(min);
      return;
    }

    if (value < min) {
      onChange(min);
      return;
    }

    if (value > max) {
      onChange(max);
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-[13px] font-black text-[#2F241D]">
          {label}
        </label>

        {hint && (
          <span className="text-[10px] font-semibold text-[#9A7E6A]">
            {hint}
          </span>
        )}
      </div>

      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;

          if (raw === "") {
            onChange(0);
            return;
          }

          const next = Number(raw);

          if (Number.isNaN(next)) return;

          /*
            חשוב:
            לא עושים כאן min/max בזמן הקלדה.
            אחרת אי אפשר להקליד 11 / 12 / 13,
            כי 1 מיד הופך ל-2 ואז נהיה 22/23.
          */
          onChange(next);
        }}
        onBlur={normalizeValue}
        className="
          h-11 w-full rounded-2xl
          border border-[#D6A678]
          bg-white px-4
          text-center text-lg font-black text-[#2F241D]
          outline-none transition
          focus:border-[#B98A45]
          focus:ring-2 focus:ring-[#D6A678]/25
        "
      />
    </div>
  );
}

/* ============================================================
   AddTableDrawer
============================================================ */

export default function AddTableDrawer({
  open,
  onClose,
  onAdd,
}: AddTableDrawerProps) {
  const [type, setType] = useState<TableType>("square");
  const [tableCount, setTableCount] = useState(1);
  const [seats, setSeats] = useState(12);
  const [error, setError] = useState("");

  const selectedTable = useMemo(
    () => TABLE_TYPES.find((item) => item.id === type) || TABLE_TYPES[1],
    [type]
  );

  const safeTableCount = Math.max(0, tableCount || 0);
  const safeSeats = Math.max(0, seats || 0);

  const regularSeatsTotal = safeTableCount * safeSeats;

  const handleAdd = () => {
    if (typeof onAdd !== "function") {
      console.error("❌ onAdd is NOT a function!", onAdd);
      return;
    }

    if (tableCount < 1) {
      setError("יש להזין לפחות שולחן אחד");
      return;
    }

    if (seats < 2) {
      setError("יש להזין לפחות 2 אורחים בכל שולחן");
      return;
    }

    setError("");

    for (let i = 0; i < tableCount; i += 1) {
      onAdd({
        type,
        seats,
      });
    }

    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {/* OVERLAY */}
      <motion.div
        className="fixed inset-0 z-[9998] bg-black/45 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* MODAL */}
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
      >
        <div
          className="
            w-full max-w-[620px]
            overflow-hidden rounded-[34px]
            border border-[#E2CDBB]
            bg-[#FBF7F2]
            shadow-[0_30px_90px_rgba(46,30,20,0.28)]
          "
          dir="rtl"
        >
          {/* HEADER */}
          <div
            className="
              flex items-center justify-between gap-4
              border-b border-[#EAD8CC]
              bg-gradient-to-l from-[#FFF7EE] via-white to-[#F2E1D2]
              px-6 py-5
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex h-12 w-12 items-center justify-center
                  rounded-2xl border border-[#D6A678]
                  bg-[#FFF8EF]
                  text-[#9A5A26]
                  shadow-sm
                "
              >
                <Armchair size={22} />
              </div>

              <div>
                <h2 className="text-xl font-black text-[#2F241D]">
                  הוספת שולחנות
                </h2>
                <p className="mt-1 text-xs font-semibold text-[#8B6F5A]">
                  בחרי סוג, כמות שולחנות וכמות אורחים
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="
                flex h-10 w-10 items-center justify-center
                rounded-full border border-[#E2CDBB]
                bg-white text-[#8B6F5A]
                transition hover:bg-[#FFF4E8] hover:text-[#2F241D]
              "
            >
              <X size={20} />
            </button>
          </div>

          {/* CONTENT */}
          <div className="space-y-5 px-6 py-5">
            {/* TABLE TYPE */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-[#2F241D]">
                    סוג שולחן
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-[#8B6F5A]">
                    העיצוב תואם למפת ההושבה החדשה
                  </div>
                </div>

                <span
                  className="
                    rounded-full bg-[#FFF0D2]
                    px-3 py-1 text-xs font-black text-[#8B6532]
                  "
                >
                  {selectedTable.name}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {TABLE_TYPES.map((item) => {
                  const active = type === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id)}
                      className={`
                        rounded-[26px] border p-3
                        text-center transition-all
                        ${
                          active
                            ? "border-[#B98A45] bg-[#FFF2D8] shadow-[0_12px_28px_rgba(185,138,69,0.20)]"
                            : "border-[#E2CDBB] bg-white hover:border-[#D6A678] hover:bg-[#FFF9F3]"
                        }
                      `}
                    >
                      <TablePreview type={item.id} active={active} />

                      <div className="mt-2 text-sm font-black text-[#2F241D]">
                        {item.name}
                      </div>

                      <div className="mt-0.5 text-[10px] font-semibold text-[#8B6F5A]">
                        {item.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FIELDS */}
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="כמות שולחנות"
                hint="כמה ליצור"
                value={tableCount}
                min={1}
                max={100}
                onChange={setTableCount}
              />

              <NumberInput
                label="אורחים בכל שולחן"
                hint="מקומות רגילים"
                value={seats}
                min={2}
                max={60}
                onChange={setSeats}
              />
            </div>

            {/* SUMMARY */}
            <div
              className="
                rounded-3xl border border-[#E2CDBB]
                bg-white px-4 py-4
                shadow-[0_8px_20px_rgba(80,50,20,0.05)]
              "
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={17} className="text-[#B98A45]" />

                  <div>
                    <div className="text-sm font-black text-[#2F241D]">
                      סיכום הוספה
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-[#8B6F5A]">
                      {selectedTable.name} · {safeTableCount}{" "}
                      {safeTableCount === 1 ? "שולחן" : "שולחנות"}
                    </div>
                  </div>
                </div>

                <div
                  className="
                    rounded-full bg-[#FFF0D2]
                    px-3 py-1 text-xs font-black text-[#8B6532]
                  "
                >
                  {regularSeatsTotal} מקומות סה״כ
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl bg-[#FFF8EF] p-3">
                  <div className="text-[10px] font-bold text-[#8B6F5A]">
                    שולחנות
                  </div>
                  <div className="text-lg font-black text-[#2F241D]">
                    {safeTableCount}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#EAFBF0] p-3">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-[#137A3D]">
                    <Users size={12} />
                    אורחים
                  </div>
                  <div className="text-lg font-black text-[#137A3D]">
                    {regularSeatsTotal}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div
                className="
                  rounded-2xl border border-red-200
                  bg-red-50 px-4 py-3
                  text-center text-sm font-bold text-red-700
                "
              >
                {error}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div
            className="
              flex items-center justify-between gap-3
              border-t border-[#EAD8CC]
              bg-white px-6 py-4
            "
          >
            <button
              onClick={onClose}
              className="
                rounded-2xl border border-[#E2CDBB]
                bg-[#F7F2EC]
                px-5 py-2.5
                text-sm font-bold text-[#5D4032]
                transition hover:bg-[#EFE4DA]
              "
            >
              ביטול
            </button>

            <button
              onClick={handleAdd}
              className="
                rounded-2xl
                bg-[#2F241D]
                px-7 py-2.5
                text-sm font-black text-white
                shadow-sm transition
                hover:bg-[#1E1712]
                active:scale-[0.98]
              "
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={16} />
                הוסף {safeTableCount}{" "}
                {safeTableCount === 1 ? "שולחן" : "שולחנות"}
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}