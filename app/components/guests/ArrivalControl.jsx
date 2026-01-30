"use client";

export default function ArrivalControl({
  value = 0,
  isLive = false,
  onChange,
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* כיתוב */}
      <div className="text-xs text-gray-500">
        הגיעו בפועל
      </div>

      {/* מספר */}
      <div className="text-lg font-semibold text-green-700">
        {value}
      </div>

      {/* שליטה */}
      {isLive && (
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => onChange(-1)}
            disabled={value <= 0}
            className="w-8 h-8 rounded-full border text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          >
            −
          </button>

          <button
            onClick={() => onChange(+1)}
            className="w-8 h-8 rounded-full bg-green-600 text-white hover:bg-green-700"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
