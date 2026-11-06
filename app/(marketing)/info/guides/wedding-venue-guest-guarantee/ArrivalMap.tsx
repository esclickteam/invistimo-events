"use client";

import { useMemo, useState } from "react";
import { illustrateChairs, type ArrivalResult, type ChairKind } from "./calcLogic";

const CHAIR_STYLE: Record<ChairKind, { fill: string; stroke: string; sw: number }> = {
  confirmed: { fill: "#8E3A4B", stroke: "#5C2431", sw: 1.15 },
  high: { fill: "#C6A15A", stroke: "#8C7040", sw: 1 },
  undecided: { fill: "#C98998", stroke: "#8E5C6A", sw: 1 },
  low: { fill: "#7A5A78", stroke: "#4E384C", sw: 1 },
  commitment: { fill: "transparent", stroke: "#8C7040", sw: 1.45 },
  empty: { fill: "transparent", stroke: "rgba(58,36,51,0.22)", sw: 1 },
};

const LEGEND: { kind: ChairKind; label: string }[] = [
  { kind: "confirmed", label: "אישור בפועל" },
  { kind: "high", label: "צפי גבוה" },
  { kind: "undecided", label: "מתלבטים" },
  { kind: "low", label: "צפי נמוך" },
  { kind: "commitment", label: "התחייבות" },
];

function peopleCount(result: ArrivalResult) {
  return result.chairs.confirmed + result.chairs.high + result.chairs.undecided + result.chairs.low;
}

function TableFigure({ number, seats }: { number: number; seats: ChairKind[] }) {
  const size = 100;
  const center = size / 2;
  const orbit = 34;
  const count = Math.max(seats.length, 1);
  const chairRadius = Math.max(3.2, Math.min(5.4, (2 * Math.PI * orbit) / count / 2 - 1.15));

  return (
    <figure className="arrival-table m-0" style={{ contentVisibility: "auto", containIntrinsicSize: "76px" }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block h-[4.75rem] w-[4.75rem]" role="img" aria-label={`שולחן ${number}, המחשה`}>
        {seats.map((kind, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
          const x = center + orbit * Math.cos(angle);
          const y = center + orbit * Math.sin(angle);
          const style = CHAIR_STYLE[kind];
          return (
            <circle
              key={`${kind}-${index}`}
              className="arrival-chair"
              cx={x}
              cy={y}
              r={chairRadius}
              fill={style.fill}
              stroke={style.stroke}
              strokeWidth={style.sw}
            />
          );
        })}
        <circle cx={center} cy={center} r={16.5} fill="#FFFDF8" stroke="#C6A15A" strokeWidth="1.15" />
        <text
          x={center}
          y={center + 0.5}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#42182F"
          fontSize="11"
          fontWeight="700"
          fontFamily="Heebo, Arial, sans-serif"
        >
          {number}
        </text>
      </svg>
    </figure>
  );
}

export default function ArrivalMap({
  result,
  seatsValue,
  onSeatsChange,
}: {
  result: ArrivalResult;
  seatsValue: string;
  onSeatsChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const picture = useMemo(() => {
    const parsed = Number(String(seatsValue).replace(/[^\d.]/g, ""));
    return illustrateChairs(result.chairs, Number.isFinite(parsed) ? parsed : 10);
  }, [result.chairs, seatsValue]);
  const arriving = peopleCount(result);
  const seats = Math.min(16, Math.max(4, Number(String(seatsValue).replace(/[^\d.]/g, "")) || 10));

  function stepSeats(delta: number) {
    onSeatsChange(String(Math.min(16, Math.max(4, seats + delta))));
  }

  return (
    <div className="min-w-0">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .arrival-chair { transition: fill 280ms ease, stroke 280ms ease; }
          .arrival-table { animation: arrival-table-in 240ms ease; }
        }
        @keyframes arrival-table-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#3A2433]">המחשת שולחנות</p>
          <p className="mt-1 text-sm leading-6 text-[#5E4735]">
            {arriving > 0 ? `${picture.tables.length} שולחנות בהמחשה` : "עדיין אין צפי להצגה"}
            {" · "}
            {picture.seats} מושבים בשולחן
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center border border-[#D9C4A4] bg-white px-4 text-sm font-bold text-[#5E4735] transition-colors hover:border-[#A68448]"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "הסתרת המפה" : "הצגת המפה"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 bg-[#FBF6EE] px-3 py-4 sm:px-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-sm leading-6 text-[#5E4735]">
              {arriving > 0
                ? "הכיסאות מציגים את התחזית. אישור שהתקבל מסומן בנפרד. זו לא סקיצת הושבה."
                : "השולחן הריק הוא דוגמה לצורה. הוא לא אורח ולא מקום באולם."}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#5E4735]" id="seat-illustration-label">
                מושבים בציור
              </span>
              <div dir="ltr" className="flex h-11 items-stretch border border-[#E4D3B8] bg-white">
                <button type="button" className="w-10 text-lg text-[#42182F]" aria-label="פחות מושבים בהמחשה" onClick={() => stepSeats(-1)}>
                  −
                </button>
                <input
                  inputMode="numeric"
                  aria-labelledby="seat-illustration-label"
                  className="w-12 border-x border-[#E4D3B8] bg-white text-center text-base font-semibold text-[#2C241C] outline-none"
                  value={seatsValue}
                  onChange={(event) => onSeatsChange(event.target.value)}
                />
                <button type="button" className="w-10 text-lg text-[#42182F]" aria-label="עוד מושבים בהמחשה" onClick={() => stepSeats(1)}>
                  +
                </button>
              </div>
            </div>
          </div>
          <div
            className="grid justify-center gap-x-3 gap-y-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(4.75rem, 4.75rem))" }}
          >
            {(showAll ? picture.tables : picture.tables.slice(0, 8)).map((seatsOnTable, index) => (
              <TableFigure key={index} number={index + 1} seats={seatsOnTable} />
            ))}
          </div>
          {picture.tables.length > 8 ? (
            <button
              type="button"
              className="mt-4 inline-flex min-h-11 items-center border border-[#D9C4A4] bg-white px-4 text-sm font-bold text-[#5E4735]"
              aria-expanded={showAll}
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? "הצגת פחות שולחנות" : `הצגת כל ${picture.tables.length} השולחנות`}
            </button>
          ) : null}
          {picture.truncated > 0 ? (
            <p className="mt-3 text-sm leading-6 text-[#5E4735]">
              הציור מציג את {(picture.drawnPeople + picture.drawnCommitment).toLocaleString("he-IL")} המושבים הראשונים.
              עוד {picture.truncated.toLocaleString("he-IL")} נשארים בחישוב.
            </p>
          ) : null}
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {LEGEND.map((item) => (
              <li key={item.kind} className="flex items-center gap-2 text-sm font-semibold text-[#3A2433]">
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                  <circle
                    cx="8"
                    cy="8"
                    r="5.2"
                    fill={CHAIR_STYLE[item.kind].fill}
                    stroke={CHAIR_STYLE[item.kind].stroke}
                    strokeWidth="1.4"
                  />
                </svg>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
