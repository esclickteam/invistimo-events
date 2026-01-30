"use client";

export default function ArrivalControl({
  value = 0,
  isLive = false,
  onChange,
}) {
  if (!isLive) {
    return <span className="font-semibold">{value}</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(-1)}
        disabled={value <= 0}
        className="w-8 h-8 rounded-full border"
      >
        −
      </button>

      <div className="min-w-[50px] text-center font-bold text-green-700">
        {value}
      </div>

      <button
        onClick={() => onChange(+1)}
        className="w-8 h-8 rounded-full bg-green-600 text-white"
      >
        +
      </button>
    </div>
  );
}
