"use client";

import { useSeatingStore } from "@/store/seatingStore";

const ITEMS = [
  { type: "round", label: "🪑 שולחן", seats: 12 },
  { type: "stage", label: "🎤 במה", elementType: "stage" },
  { type: "chuppah", label: "💍 חופה", elementType: "chuppah" },
  { type: "exit", label: "🚪 יציאה", elementType: "exit" },
];

export default function ElementsToolbar() {
  const addTable = useSeatingStore((s) => s.addTable);

  return (
    <div className="absolute right-4 top-20 z-50 bg-white shadow-lg rounded-xl p-3 space-y-2">
      {ITEMS.map((item) => (
        <button
          key={item.type}
          type="button"
          onClick={() => {
            // שולחן רגיל
            if (item.type === "round") {
              addTable("round", item.seats);
              return;
            }

            // אלמנטים (במה / חופה / יציאה)
            addTable("element", 0, {
              elementType: item.elementType,
            });
          }}
          className="w-full text-right px-4 py-2 bg-gray-100 rounded-lg
                     text-sm hover:bg-gray-200 active:bg-gray-300 transition"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
