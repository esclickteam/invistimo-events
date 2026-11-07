"use client";

import { useMemo, useState } from "react";
import { illustrateChairs, type ArrivalResult, type ChairKind } from "./calcLogic";

const LEGEND: { kind: ChairKind; label: string }[] = [
  { kind: "confirmed", label: "אישור בפועל" },
  { kind: "high", label: "צפי גבוה" },
  { kind: "undecided", label: "מתלבטים" },
  { kind: "low", label: "צפי נמוך" },
  { kind: "commitment", label: "התחייבות לאולם" },
];

function ChairGlyph({ kind, x, y, r }: { kind: ChairKind; x: number; y: number; r: number }) {
  if (kind === "confirmed") {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="#2A0E18" stroke="#2A0E18" strokeWidth="1.2" />
        <circle cx={x} cy={y} r={Math.max(1.5, r * 0.34)} fill="#FFF8EE" />
      </g>
    );
  }
  if (kind === "high") {
    return <circle cx={x} cy={y} r={r} fill="#E2B34D" stroke="#6E5314" strokeWidth="1.3" />;
  }
  if (kind === "undecided") {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="#F8E4EA" stroke="#8E3A4B" strokeWidth="1.8" />
        <circle cx={x} cy={y} r={Math.max(1.6, r * 0.42)} fill="none" stroke="#8E3A4B" strokeWidth="1.35" />
      </g>
    );
  }
  if (kind === "low") {
    return <circle cx={x} cy={y} r={r} fill="#FBF6EE" stroke="#241820" strokeWidth="1.9" />;
  }
  if (kind === "commitment") {
    return (
      <rect
        x={x - r}
        y={y - r * 0.7}
        width={r * 2}
        height={r * 1.4}
        rx="1.2"
        fill="#FFFDF8"
        stroke="#6E5420"
        strokeWidth="1.6"
        strokeDasharray="2.4 1.3"
      />
    );
  }
  return <circle cx={x} cy={y} r={r} fill="transparent" stroke="rgba(58,36,51,0.18)" strokeWidth="1" />;
}

function peopleCount(result: ArrivalResult) {
  return result.chairs.confirmed + result.chairs.high + result.chairs.undecided + result.chairs.low;
}

function TableFigure({ number, seats }: { number: number; seats: ChairKind[] }) {
  const size = 128;
  const center = size / 2;
  const orbit = 48;
  const count = Math.max(seats.length, 1);
  const chairRadius = Math.max(6.4, Math.min(8.4, (2 * Math.PI * orbit) / count / 2 - 1.8));

  return (
    <figure className="arrival-table m-0" style={{ contentVisibility: "auto", containIntrinsicSize: "88px" }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block h-[5.5rem] w-[5.5rem]" role="img" aria-label={`שולחן ${number}, המחשה`}>
        {seats.map((kind, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
          const x = center + orbit * Math.cos(angle);
          const y = center + orbit * Math.sin(angle);
          return <ChairGlyph key={`${kind}-${index}`} kind={kind} x={x} y={y} r={chairRadius} />;
        })}
        <circle cx={center} cy={center} r={15} fill="#FFFDF8" stroke="#C6A15A" strokeWidth="1.2" />
        <text
          x={center}
          y={center + 0.5}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#42182F"
          fontSize="12"
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
  const contractGap = result.chairs.commitment;

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
        <div className="mt-4 overflow-hidden bg-[#FBF6EE] px-3 py-4 sm:px-4">
          <p className="max-w-md text-sm leading-6 text-[#5E4735]">
            כל כיסא מייצג מקום בהמחשה סטטיסטית בלבד, ולא שיבוץ אורח לשולחן אמיתי.
          </p>
          <div className="mb-4 mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-sm leading-6 text-[#5E4735]">
              {arriving > 0
                ? "המילוי, הטבעת והנקודה הפנימית מבדילים בין סוגי הצפי. ההתחייבות לאולם אינה כיסא."
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
                  onChange={(event) => onSeatsChange(event.target.value.replace(/\D/g, ""))}
                />
                <button type="button" className="w-10 text-lg text-[#42182F]" aria-label="עוד מושבים בהמחשה" onClick={() => stepSeats(1)}>
                  +
                </button>
              </div>
            </div>
          </div>
          <div
            className="grid justify-center gap-x-4 gap-y-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(5.5rem, 5.5rem))" }}
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
              הציור מציג את {picture.drawnPeople.toLocaleString("he-IL")} המקומות הראשונים בתחזית.
              עוד {picture.truncated.toLocaleString("he-IL")} נשארים בחישוב.
            </p>
          ) : null}
          <div className="mt-4 border border-dashed border-[#6E5420] bg-[#FFFDF8] px-3 py-3">
            <p className="text-sm font-bold text-[#3A2433]">השוואת התחייבות</p>
            {result.contractMissing ? (
              <p className="mt-1 text-sm leading-6 text-[#5E4735]">
                לא הוזנה התחייבות חוזית. המפה מציגה את התחזית בלבד, בלי שכבת השוואה.
              </p>
            ) : (
              <p className="mt-1 text-sm leading-6 text-[#5E4735]">
                צפויים להגיע: {result.rangeMid.toLocaleString("he-IL")} מקומות בהמחשה. ההתחייבות שהוזנה:{" "}
                {(result.venueMin || 0).toLocaleString("he-IL")} מנות. המסגרת המקווקוות מסמנת את ההשוואה לחוזה, לא אורח
                מסוים.
                {contractGap > 0
                  ? ` ההתחייבות גבוהה מהתחזית המרכזית ב־${contractGap.toLocaleString("he-IL")} מנות.`
                  : ""}
              </p>
            )}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {LEGEND.map((item) => (
              <li key={item.kind} className="flex items-center gap-2 text-sm font-semibold text-[#3A2433]">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <ChairGlyph kind={item.kind} x={9} y={9} r={6} />
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
