"use client";

const ITEMS = [
  { type: "round", label: "🪑 שולחן" },
  { type: "stage", label: "🎤 במה" },
  { type: "chuppah", label: "💍 חופה" },
  { type: "exit", label: "🚪 יציאה" },
];

export default function ElementsToolbar() {
  return (
    <div className="absolute right-4 top-20 z-50 bg-white shadow-lg rounded-xl p-3 space-y-2">
      {ITEMS.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("element-type", item.type);
          }}
          className="cursor-grab px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
