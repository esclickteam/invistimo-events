"use client";

import { useMemo } from "react";
import {
  illustrateChairs,
  type ArrivalResult,
  type ChairKind,
} from "./calcLogic";

const CHAIR_STYLE: Record<ChairKind, { fill: string; stroke: string; sw: number }> = {
  confirmed: { fill: "#8E3A4B", stroke: "#5C2431", sw: 1 },
  high: { fill: "#C6A15A", stroke: "#8C7040", sw: 1 },
  undecided: { fill: "#C98998", stroke: "#8E5C6A", sw: 1 },
  low: { fill: "#7A5A78", stroke: "#4E384C", sw: 1 },
  commitment: { fill: "transparent", stroke: "#F3E6C8", sw: 1.7 },
  empty: { fill: "transparent", stroke: "rgba(243,230,200,0.38)", sw: 1 },
};

const LEGEND: { kind: ChairKind; label: string }[] = [
  { kind: "confirmed", label: "אישור שהתקבל" },
  { kind: "high", label: "צפי גבוה" },
  { kind: "undecided", label: "מתלבטים" },
  { kind: "low", label: "צפי נמוך" },
  { kind: "commitment", label: "התחייבות לאולם" },
];

function peopleCount(result: ArrivalResult) {
  return result.chairs.confirmed + result.chairs.high + result.chairs.undecided + result.chairs.low;
}

function TableFigure({ number, seats }: { number: number; seats: ChairKind[] }) {
  const size = 132;
  const center = size / 2;
  const orbit = 48;
  const count = Math.max(seats.length, 1);
  const chairRadius = Math.max(3.4, Math.min(6.2, (2 * Math.PI * orbit) / count / 2 - 1.2));

  return (
    <figure
      className="m-0 min-w-0"
      style={{ contentVisibility: "auto", containIntrinsicSize: "148px" }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full" role="img" aria-label={`שולחן ${number}, המחשה`}>
        {seats.map((kind, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
          const x = center + orbit * Math.cos(angle);
          const y = center + orbit * Math.sin(angle);
          const style = CHAIR_STYLE[kind];
          return (
            <g key={`${kind}-${index}`}>
              <circle
                className="arrival-chair"
                cx={x}
                cy={y}
                r={chairRadius}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={style.sw}
              />
              {kind === "confirmed" && chairRadius >= 4.6 ? (
                <circle cx={x} cy={y} r={1.5} fill="#F7F1E6" />
              ) : null}
            </g>
          );
        })}
        <circle cx={center} cy={center} r={28} fill="#F7F1E6" stroke="#C6A15A" strokeWidth="1.25" />
        <text
          x={center}
          y={center + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#3A2433"
          fontSize="16"
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
  const picture = useMemo(() => {
    const parsed = Number(String(seatsValue).replace(/[^\d.]/g, ""));
    return illustrateChairs(result.chairs, Number.isFinite(parsed) ? parsed : 10);
  }, [result.chairs, seatsValue]);
  const arriving = peopleCount(result);
  const hasPeople = arriving > 0;

  return (
    <div className="mt-5 border border-[#E7D6BC] bg-[#FFFDF8]">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .arrival-chair { transition: fill 280ms ease, stroke 280ms ease; }
        }
      `}</style>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E7D6BC] px-4 py-3">
        <div>
          <p className="text-sm font-black tracking-[0.12em] text-[#7A5530]">המחשת הגעה</p>
          <p className="mt-1 text-sm leading-6 text-[#5C4A3A]">
            {picture.tables.length} שולחנות · {picture.seats} מושבים בשולחן
          </p>
        </div>
        <label className="grid gap-1 text-xs font-bold text-[#5E4735]">
          מושבים בהמחשה
          <input
            inputMode="numeric"
            aria-label="מספר מושבים בשולחן להמחשה"
            className="h-10 w-20 rounded-none border border-[#E4D3B8] bg-white px-2 text-center text-base font-semibold text-[#2C241C] outline-none focus:border-[#A68448]"
            value={seatsValue}
            onChange={(event) => onSeatsChange(event.target.value)}
          />
        </label>
      </div>

      <div className="bg-[#3A2433] px-3 py-4 sm:px-4">
        <p className="mb-3 text-center text-sm leading-6 text-[#F6EFE4]">
          {hasPeople ? (
            result.isRange ? (
              <>
                המפה מציגה את ההערכה המרכזית, {result.rangeMid.toLocaleString("he-IL")}, מתוך טווח{" "}
                {result.rangeLow.toLocaleString("he-IL")}–{result.rangeHigh.toLocaleString("he-IL")}.
                {result.confirmedReceived > 0
                  ? ` ${result.confirmedReceived.toLocaleString("he-IL")} אישורים שהתקבלו מסומנים בנפרד מהתחזית.`
                  : " אין כאן אישורי הגעה שהתקבלו."}
              </>
            ) : (
              <>ההערכה המרכזית וקצות הטווח נפגשים ב־{result.rangeMid.toLocaleString("he-IL")}. זו עדיין תחזית, לא ספירה באולם.</>
            )
          ) : result.chairs.commitment > 0 ? (
            <>אין צפי הגעה להצגה. המפה מסמנת רק מושבים של ההתחייבות שהוזנה.</>
          ) : (
            <>אין עדיין מוזמנים להצגה. השולחן הריק הוא דוגמה לצורת ההמחשה.</>
          )}
        </p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-3 min-[520px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-3">
          {picture.tables.map((seats, index) => (
            <TableFigure key={index} number={index + 1} seats={seats} />
          ))}
        </div>
        {picture.truncated > 0 ? (
          <p className="mt-3 text-center text-xs leading-5 text-[#E7D3B0]">
            ההמחשה מציגה את {picture.drawnPeople + picture.drawnCommitment} המושבים הראשונים. יתר
            {" "}
            {picture.truncated.toLocaleString("he-IL")} נשארים בחישוב שמעל.
          </p>
        ) : null}
      </div>

      <ul className="grid gap-2 px-4 py-3 sm:grid-cols-2">
        {LEGEND.map((item) => (
          <li key={item.kind} className="flex items-center gap-2 text-sm font-semibold text-[#3A2433]">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle
                cx="8"
                cy="8"
                r="5.5"
                fill={CHAIR_STYLE[item.kind].fill}
                stroke={item.kind === "commitment" ? "#3A2433" : CHAIR_STYLE[item.kind].stroke}
                strokeWidth="1.4"
              />
            </svg>
            {item.label}
          </li>
        ))}
      </ul>
      <p className="border-t border-[#E7D6BC] px-4 py-3 text-xs leading-5 text-[#7A6042]">
        כיסא ריק הוא מקום פנוי בציור, לא אורח. שינוי מספר המושבים משנה רק את הציור, לא את מספר האורחים.
        ההמחשה סטטיסטית בלבד ואינה סקיצת הושבה.
      </p>
    </div>
  );
}
