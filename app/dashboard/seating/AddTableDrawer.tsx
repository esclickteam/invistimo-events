"use client";

import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: { type: "banquet" | "square" | "round"; seats: number }) => void;
};

function Tile({
  active,
  title,
  subtitle,
  onClick,
  preview,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
  preview: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-xl border p-3 text-right transition",
        active
          ? "border-blue-500 bg-blue-50 shadow-sm"
          : "border-gray-200 bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <div className="font-semibold text-gray-900">{title}</div>
          <div className="text-xs text-gray-500">{subtitle}</div>
        </div>
        <div className="shrink-0">{preview}</div>
      </div>
    </button>
  );
}

function PreviewSquare() {
  return (
    <div className="relative w-16 h-16 rounded-md border-2 border-blue-400 bg-white">
      {Array.from({ length: 3 }).map((_, i) => (
        <span key={i} className="absolute -top-2 left-1/2 -translate-x-1/2 translate-y-0 flex gap-1">
          <span className="w-2 h-2 rounded-sm bg-gray-300 border border-gray-400" />
          <span className="w-2 h-2 rounded-sm bg-gray-300 border border-gray-400" />
          <span className="w-2 h-2 rounded-sm bg-gray-300 border border-gray-400" />
        </span>
      ))}
      <span className="absolute inset-0 rounded-md" />
    </div>
  );
}

function PreviewRound() {
  return (
    <div className="relative w-16 h-16 rounded-full border-2 border-blue-400 bg-white" />
  );
}

function PreviewBanquet() {
  return (
    <div className="relative w-20 h-12 rounded-md border-2 border-blue-400 bg-white" />
  );
}

export default function AddTableDrawer({ open, onClose, onAdd }: Props) {
  const [type, setType] = useState<"banquet" | "square" | "round">("banquet");
  const [seats, setSeats] = useState<number>(12);

  const clampedSeats = useMemo(() => {
    const n = Number.isFinite(seats) ? seats : 0;
    return Math.max(1, Math.min(60, Math.floor(n)));
  }, [seats]);

  if (!open) return null;

  return (
    <>
      {/* overlay */}
      <div
        className="fixed inset-0 z-[80] bg-black/20"
        onClick={onClose}
      />

      {/* drawer */}
      <aside className="fixed right-0 top-0 z-[90] h-dvh w-[360px] bg-white shadow-2xl border-l border-gray-200 flex flex-col">
        {/* header like screenshot */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center text-2xl leading-none"
            aria-label="Close"
            type="button"
          >
            ✕
          </button>

          <div className="flex items-center gap-2 text-gray-500">
            {/* אייקונים “כמו” בתמונה – רק ויזואלית */}
            <button className="w-10 h-10 rounded-lg hover:bg-gray-100">≡</button>
            <button className="w-10 h-10 rounded-lg hover:bg-gray-100">⤓</button>
            <button className="w-10 h-10 rounded-lg hover:bg-gray-100">🔒</button>
            <button className="w-10 h-10 rounded-lg hover:bg-gray-100">↻</button>
            <button className="w-10 h-10 rounded-lg hover:bg-gray-100">💾</button>
          </div>
        </div>

        <div className="p-4 overflow-auto">
          <h2 className="text-xl font-bold text-gray-900 text-right">הוספת שולחן:</h2>

          <div className="mt-4 grid gap-3">
            <Tile
              active={type === "banquet"}
              title="שולחן מלבני"
              subtitle="כיסאות משני הצדדים"
              onClick={() => setType("banquet")}
              preview={<PreviewBanquet />}
            />
            <Tile
              active={type === "square"}
              title="שולחן מרובע"
              subtitle="כיסאות סביב כל הצדדים"
              onClick={() => setType("square")}
              preview={<PreviewSquare />}
            />
            <Tile
              active={type === "round"}
              title="שולחן עגול"
              subtitle="כיסאות מסביב"
              onClick={() => setType("round")}
              preview={<PreviewRound />}
            />
          </div>

          {/* מספר אורחים */}
          <div className="mt-6 border-t pt-5">
            <div className="text-right font-semibold text-gray-900">מספר אורחים:</div>

            <div className="mt-3 flex items-center gap-2 justify-end">
              <button
                type="button"
                className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 text-xl"
                onClick={() => setSeats((s) => Math.max(1, (s || 1) - 1))}
              >
                −
              </button>

              <input
                value={clampedSeats}
                onChange={(e) => setSeats(Number(e.target.value))}
                className="w-24 h-10 rounded-lg border border-gray-200 text-center text-lg"
                inputMode="numeric"
              />

              <button
                type="button"
                className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 text-xl"
                onClick={() => setSeats((s) => Math.min(60, (s || 0) + 1))}
              >
                +
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500 text-right">
              * הגודל של השולחן ייגזר אוטומטית לפי מספר האורחים שתבחרי.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onAdd({ type, seats: clampedSeats })}
            className="mt-6 w-full h-12 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold"
          >
            הוסף שולחן
          </button>
        </div>
      </aside>
    </>
  );
}
