"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";
import { useSeatingStore } from "@/store/seatingStore";

const tableTypes = [
  { id: "banquet", name: "אבירים", img: "/tables/banquet.png" },
  { id: "square", name: "מרובע", img: "/tables/square.png" },
  { id: "round", name: "עגול", img: "/tables/round.png" },
];

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

  const addTable = useSeatingStore((s) => s.addTable);

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

          <div className="flex justify-between mb-6">
            {tableTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`flex flex-col items-center gap-2 border rounded-lg p-2 w-[90px] hover:bg-gray-50 transition ${
                  type === t.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300"
                }`}
              >
                <Image
                  src={t.img}
                  alt={t.name}
                  width={70}
                  height={70}
                  className="object-contain"
                />
                <span
                  className={`text-sm ${
                    type === t.id ? "text-blue-600" : "text-gray-700"
                  }`}
                >
                  {t.name}
                </span>
              </button>
            ))}
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

          {/* צבע רקע */}
          <label className="block text-sm font-medium mb-1">
            צבע רקע (אופציונלי):
          </label>
          <input
            type="color"
            className="w-full h-10 border rounded mb-6"
            defaultValue="#ffffff"
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
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black z-[9998]"
      />
    </AnimatePresence>
  );
}
