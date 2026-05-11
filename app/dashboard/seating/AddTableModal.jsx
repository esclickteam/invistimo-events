"use client";

import { useMemo, useState } from "react";

const TABLE_TYPES = [
  {
    id: "round",
    name: "עגול",
    description: "שולחן עגול לאירועים",
  },
  {
    id: "square",
    name: "מרובע",
    description: "שולחן מרובע / רגיל",
  },
  {
    id: "banquet",
    name: "אבירים",
    description: "שולחן מלבני ארוך",
  },
];

function NumberField({ label, value, setValue, min = 0, max = 200, hint }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-black text-[#2F241D]">{label}</label>
        {hint && <span className="text-[11px] font-semibold text-[#9A7E6A]">{hint}</span>}
      </div>

      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isNaN(next)) return;
          setValue(Math.max(min, Math.min(max, next)));
        }}
        className="
          h-12 w-full rounded-2xl
          border border-[#D6A678]
          bg-white px-4
          text-center text-lg font-black text-[#2F241D]
          outline-none
          transition
          focus:border-[#B98A45]
          focus:ring-2 focus:ring-[#D6A678]/25
        "
      />
    </div>
  );
}

function SeatDot({ active = false, className = "" }) {
  return (
    <span
      className={`
        block h-[9px] w-[9px] rounded-[3px]
        border
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

function TablePreview({ type, selected }) {
  if (type === "round") {
    return (
      <div className="relative mx-auto h-[82px] w-[82px]">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const x = 36 + Math.cos(angle) * 34;
          const y = 36 + Math.sin(angle) * 34;

          return (
            <SeatDot
              key={i}
              active={selected}
              className="absolute"
              style={{ right: `${x}px`, top: `${y}px` }}
            />
          );
        })}

        <div
          className={`
            absolute left-1/2 top-1/2
            flex h-[46px] w-[46px]
            -translate-x-1/2 -translate-y-1/2
            items-center justify-center
            rounded-full border
            ${
              selected
                ? "border-[#8B6532] bg-gradient-to-br from-[#B98A45] to-[#FFF0C8]"
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
      <div className="relative mx-auto h-[82px] w-[100px]">
        <div className="absolute right-[8px] top-[10px] flex flex-col gap-[5px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <SeatDot key={i} active={selected} />
          ))}
        </div>

        <div className="absolute left-[8px] top-[10px] flex flex-col gap-[5px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <SeatDot key={i} active={selected} />
          ))}
        </div>

        <div
          className={`
            absolute left-1/2 top-1/2
            flex h-[64px] w-[46px]
            -translate-x-1/2 -translate-y-1/2
            items-center justify-center
            rounded-[16px] border
            ${
              selected
                ? "border-[#8B6532] bg-gradient-to-b from-[#FFF0C8] to-[#B98A45]"
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
    <div className="relative mx-auto h-[82px] w-[92px]">
      <div className="absolute right-[22px] top-0 flex gap-[6px]">
        <SeatDot active={selected} />
        <SeatDot active={selected} />
        <SeatDot active={selected} />
      </div>

      <div className="absolute right-[22px] bottom-0 flex gap-[6px]">
        <SeatDot active={selected} />
        <SeatDot active={selected} />
        <SeatDot active={selected} />
      </div>

      <div className="absolute right-0 top-[24px] flex flex-col gap-[6px]">
        <SeatDot active={selected} />
        <SeatDot active={selected} />
      </div>

      <div className="absolute left-0 top-[24px] flex flex-col gap-[6px]">
        <SeatDot active={selected} />
        <SeatDot active={selected} />
      </div>

      <div
        className={`
          absolute left-1/2 top-1/2
          flex h-[48px] w-[54px]
          -translate-x-1/2 -translate-y-1/2
          items-center justify-center
          rounded-[14px] border
          ${
            selected
              ? "border-[#8B6532] bg-gradient-to-br from-[#B98A45] to-[#FFF0C8]"
              : "border-[#D6C0A2] bg-[#FFFDF8]"
          }
        `}
      >
        <span className="text-[10px] font-black text-[#5D4032]">מרובע</span>
      </div>
    </div>
  );
}

export default function AddTableModal({ onClose, onAdd }) {
  const [type, setType] = useState("round");
  const [tableCount, setTableCount] = useState(1);
  const [seats, setSeats] = useState(12);
  const [reserveSeats, setReserveSeats] = useState(0);
  const [error, setError] = useState("");

  const selectedType = useMemo(
    () => TABLE_TYPES.find((item) => item.id === type) || TABLE_TYPES[0],
    [type]
  );

  const totalRegularSeats = tableCount * seats;
  const totalReserveSeats = tableCount * reserveSeats;
  const totalWithReserve = totalRegularSeats + totalReserveSeats;

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
        reserveSeats,
        totalSeatsWithReserve: seats + reserveSeats,
      });
    }

    onClose?.();
  };

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/45 px-4
        backdrop-blur-[2px]
      "
      dir="rtl"
    >
      <div
        className="
          w-[560px] max-w-[96vw]
          overflow-hidden rounded-[32px]
          border border-[#E2CDBB]
          bg-[#FBF7F2]
          shadow-[0_28px_80px_rgba(46,30,20,0.25)]
        "
      >
        {/* Header */}
        <div
          className="
            flex items-center justify-between
            border-b border-[#EAD8CC]
            bg-gradient-to-l from-[#FFF7EE] via-white to-[#F2E1D2]
            px-6 py-5
          "
        >
          <div>
            <h2 className="text-xl font-black text-[#2F241D]">
              הוספת שולחנות
            </h2>
            <p className="mt-1 text-xs font-semibold text-[#8B6F5A]">
              בחרי סוג שולחן, כמות שולחנות, מספר אורחים ורזרבה
            </p>
          </div>

          <button
            onClick={onClose}
            className="
              flex h-10 w-10 items-center justify-center
              rounded-full border border-[#E2CDBB]
              bg-white text-xl leading-none
              text-[#8B6F5A]
              transition hover:bg-[#FFF4E8] hover:text-[#2F241D]
            "
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* סוג שולחן */}
          <div>
            <label className="mb-3 block text-sm font-black text-[#2F241D]">
              סוג שולחן
            </label>

            <div className="grid grid-cols-3 gap-3">
              {TABLE_TYPES.map((item) => {
                const selected = type === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id)}
                    className={`
                      rounded-[24px] border p-3
                      text-center transition-all
                      ${
                        selected
                          ? "border-[#B98A45] bg-[#FFF3D8] shadow-[0_10px_26px_rgba(185,138,69,0.18)]"
                          : "border-[#E2CDBB] bg-white hover:border-[#D6A678] hover:bg-[#FFF9F3]"
                      }
                    `}
                  >
                    <TablePreview type={item.id} selected={selected} />

                    <div className="mt-2 text-sm font-black text-[#2F241D]">
                      {item.name}
                    </div>

                    <div className="mt-0.5 text-[10px] font-semibold text-[#8B6F5A]">
                      {item.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* כמות / אורחים / רזרבה */}
          <div className="grid grid-cols-3 gap-3">
            <NumberField
              label="כמות שולחנות"
              value={tableCount}
              setValue={setTableCount}
              min={1}
              max={100}
              hint="כמה ליצור"
            />

            <NumberField
              label="אורחים בכל שולחן"
              value={seats}
              setValue={setSeats}
              min={2}
              max={50}
              hint="מקומות רגילים"
            />

            <NumberField
              label="כיסאות רזרבה"
              value={reserveSeats}
              setValue={setReserveSeats}
              min={0}
              max={20}
              hint="לא חובה"
            />
          </div>

          {/* סיכום */}
          <div
            className="
              rounded-3xl border border-[#E2CDBB]
              bg-white px-4 py-4
            "
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-[#2F241D]">
                  סיכום הוספה
                </div>
                <div className="mt-1 text-xs font-semibold text-[#8B6F5A]">
                  {selectedType.name} · {tableCount} שולחנות
                </div>
              </div>

              <div
                className="
                  rounded-full bg-[#FFF0D2]
                  px-3 py-1 text-xs font-black text-[#8B6532]
                "
              >
                {totalWithReserve} מקומות סה״כ
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-[#FFF8EF] p-3">
                <div className="text-[10px] font-bold text-[#8B6F5A]">
                  שולחנות
                </div>
                <div className="text-lg font-black text-[#2F241D]">
                  {tableCount}
                </div>
              </div>

              <div className="rounded-2xl bg-[#EAFBF0] p-3">
                <div className="text-[10px] font-bold text-[#137A3D]">
                  אורחים
                </div>
                <div className="text-lg font-black text-[#137A3D]">
                  {totalRegularSeats}
                </div>
              </div>

              <div className="rounded-2xl bg-[#FFF0D2] p-3">
                <div className="text-[10px] font-bold text-[#8B6532]">
                  רזרבה
                </div>
                <div className="text-lg font-black text-[#8B6532]">
                  {totalReserveSeats}
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

        {/* Footer */}
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
            הוסף {tableCount} {tableCount === 1 ? "שולחן" : "שולחנות"}
          </button>
        </div>
      </div>
    </div>
  );
}