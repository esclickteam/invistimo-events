"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/* ============================================================
   SVG ציור שולחנות (עגול / מרובע / אבירים)
============================================================ */
const TableIcons = {
  round: ({ active }: { active: boolean }) => {
    const table = active ? "#2563eb" : "#3b82f6";
    const seat = active ? "#60a5fa" : "#93c5fd";
    const stroke = active ? "#1d4ed8" : "#2563eb";
    const circles = Array.from({ length: 10 }).map((_, i) => {
      const angle = (2 * Math.PI * i) / 10 - Math.PI / 2;
      const x = 40 + Math.cos(angle) * 26;
      const y = 40 + Math.sin(angle) * 26;
      return (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="4"
          fill={seat}
          stroke={stroke}
          strokeWidth="1"
        />
      );
    });
    return (
      <svg viewBox="0 0 80 80" className="w-[64px] h-[64px]">
        {circles}
        <circle cx="40" cy="40" r="18" fill={table} />
      </svg>
    );
  },

  square: ({ active }: { active: boolean }) => {
    const table = active ? "#2563eb" : "#3b82f6";
    const seat = active ? "#60a5fa" : "#93c5fd";
    const stroke = active ? "#1d4ed8" : "#2563eb";
    const seats = [
      // top
      [28, 10],
      [40, 10],
      [52, 10],
      // bottom
      [28, 70],
      [40, 70],
      [52, 70],
      // left
      [10, 28],
      [10, 40],
      [10, 52],
      // right
      [70, 28],
      [70, 40],
      [70, 52],
    ];
    return (
      <svg viewBox="0 0 80 80" className="w-[64px] h-[64px]">
        {seats.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="4"
            fill={seat}
            stroke={stroke}
            strokeWidth="1"
          />
        ))}
        <rect
          x="22"
          y="22"
          width="36"
          height="36"
          rx="6"
          fill={table}
          opacity="0.95"
        />
      </svg>
    );
  },

  banquet: ({ active }: { active: boolean }) => {
    const table = active ? "#2563eb" : "#3b82f6";
    const seat = active ? "#60a5fa" : "#93c5fd";
    const stroke = active ? "#1d4ed8" : "#2563eb";
    const rowTop = [20, 30, 40, 50, 60];
    const rowBottom = [20, 30, 40, 50, 60];
    return (
      <svg viewBox="0 0 80 80" className="w-[64px] h-[64px]">
        {rowTop.map((x, i) => (
          <circle
            key={`t-${i}`}
            cx={x}
            cy={14}
            r="4"
            fill={seat}
            stroke={stroke}
            strokeWidth="1"
          />
        ))}
        {rowBottom.map((x, i) => (
          <circle
            key={`b-${i}`}
            cx={x}
            cy={66}
            r="4"
            fill={seat}
            stroke={stroke}
            strokeWidth="1"
          />
        ))}
        <rect
          x="14"
          y="26"
          width="52"
          height="28"
          rx="10"
          fill={table}
          opacity="0.95"
        />
      </svg>
    );
  },
};

/* ============================================================
   רכיב AddTableDrawer
============================================================ */
export default function AddTableDrawer({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (data: { type: string; seats: number }) => void;
}) {
  const [type, setType] = useState("banquet");
  const [seats, setSeats] = useState(12);

  if (!open) return null;

  const handleSubmit = () => {
    onAdd({ type, seats });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 250 }}
        className="fixed top-0 right-0 h-full w-[340px] bg-white shadow-2xl z-[9999] border-l border-gray-200 flex flex-col"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            הוספת שולחן חדש
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-5 flex-1 overflow-y-auto">
          <p className="text-sm font-medium mb-2">בחר סוג שולחן:</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { id: "banquet", name: "אבירים" },
              { id: "square", name: "מרובע" },
              { id: "round", name: "עגול" },
            ].map((t) => {
              const Icon = TableIcons[t.id as keyof typeof TableIcons];
              const active = type === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`flex flex-col items-center gap-2 border rounded-lg p-2 hover:bg-gray-50 transition ${
                    active
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300"
                  }`}
                >
                  <Icon active={active} />
                  <span
                    className={`text-sm font-medium ${
                      active ? "text-blue-600" : "text-gray-700"
                    }`}
                  >
                    {t.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* כמות כסאות */}
          <label className="block text-sm font-medium mb-1">
            מספר כסאות:
          </label>
          <input
            type="number"
            min={2}
            max={40}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            className="w-full border rounded-md px-3 py-2 mb-6 text-center"
          />

          {/* כפתור הוספה */}
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-3 rounded-lg font-medium text-lg shadow"
          >
            ➕ הוסף שולחן
          </button>
        </div>
      </motion.div>

      {/* OVERLAY */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black z-[9998]"
      />
    </AnimatePresence>
  );
}
