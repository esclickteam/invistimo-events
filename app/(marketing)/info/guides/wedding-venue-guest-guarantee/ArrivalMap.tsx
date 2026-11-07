"use client";

import { useMemo } from "react";
import { centralMapSequence, illustrateSequence, type ArrivalResult, type SeatMark } from "./calcLogic";

const LEGEND: { mark: SeatMark; label: string; hint: string }[] = [
  { mark: "prob-high", label: "צפי גבוה", hint: "סיכוי גבוה להגעה" },
  { mark: "prob-medium", label: "צפי בינוני", hint: "הגעה פחות ודאית" },
  { mark: "prob-low", label: "צפי נמוך", hint: "סיכוי נמוך להגעה" },
  { mark: "pad", label: "לא בתחזית", hint: "השלמה לשולחן האחרון" },
];

function peopleLabel(value: number) {
  return value.toLocaleString("he-IL");
}

function SeatGlyph({ mark, x, y, r }: { mark: SeatMark; x: number; y: number; r: number }) {
  if (mark === "prob-high") {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="#087F68" stroke="#065C4C" strokeWidth="1.15" />
        <circle cx={x} cy={y} r={Math.max(1.3, r * 0.28)} fill="#F4FFFB" />
      </g>
    );
  }
  if (mark === "prob-medium") {
    return <circle cx={x} cy={y} r={r} fill="#D6A329" stroke="#8A6810" strokeWidth="1.15" />;
  }
  if (mark === "prob-low") {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="#F4F2F6" stroke="#6F6A7C" strokeWidth="1.7" />
        <circle cx={x} cy={y} r={Math.max(1.2, r * 0.34)} fill="#6F6A7C" />
      </g>
    );
  }
  return <circle cx={x} cy={y} r={r * 0.82} fill="#E7E1D6" stroke="#D5CFC4" strokeWidth="1" />;
}

function TableFigure({ number, seats }: { number: number; seats: SeatMark[] }) {
  const size = 120;
  const center = size / 2;
  const orbit = 46;
  const count = Math.max(seats.length, 1);
  const chairRadius = Math.max(5.6, Math.min(7.6, (2 * Math.PI * orbit) / count / 2 - 1.6));
  return (
    <figure className="m-0" style={{ contentVisibility: "auto", containIntrinsicSize: "78px" }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="block h-[4.85rem] w-[4.85rem]" role="img" aria-label={`שולחן ${number}, המחשה`}>
        {seats.map((mark, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
          return <SeatGlyph key={`${mark}-${index}`} mark={mark} x={center + orbit * Math.cos(angle)} y={center + orbit * Math.sin(angle)} r={chairRadius} />;
        })}
        <circle cx={center} cy={center} r={13} fill="#FFFDF8" stroke="#C6A15A" strokeWidth="1.15" />
        <text x={center} y={center + 0.4} textAnchor="middle" dominantBaseline="central" fill="#42182F" fontSize="11" fontWeight="700" fontFamily="Heebo, Arial, sans-serif">
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
  const seats = Math.min(16, Math.max(4, Number(String(seatsValue).replace(/\D/g, "")) || 10));
  const sequence = useMemo(() => centralMapSequence(result), [result]);
  const picture = useMemo(() => illustrateSequence(sequence, seats), [sequence, seats]);
  const counts = new Map<SeatMark, number>();
  for (const seat of picture.tables.flat()) counts.set(seat, (counts.get(seat) || 0) + 1);
  const included = (counts.get("prob-high") || 0) + (counts.get("prob-medium") || 0) + (counts.get("prob-low") || 0);

  function stepSeats(delta: number) {
    onSeatsChange(String(Math.min(16, Math.max(4, seats + delta))));
  }

  return (
    <div className="mt-6 min-w-0 border border-[#E7D6BC] bg-[#FBF6EE] px-3 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-6 text-[#5E4735]">
          {picture.tables.length > 0
            ? `${peopleLabel(included)} מקומות בתחזית המרכזית · ${peopleLabel(picture.tables.length)} שולחנות · ${peopleLabel(picture.seats)} מקומות בשולחן`
            : "אין עדיין הערכה מרכזית לציור"}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#5E4735]" id="seat-illustration-label">מושבים בשולחן</span>
          <div dir="ltr" className="flex h-11 items-stretch border border-[#E4D3B8] bg-white">
            <button type="button" className="w-10 text-lg text-[#42182F]" aria-label="פחות מושבים בהמחשה" onClick={() => stepSeats(-1)}>−</button>
            <input inputMode="numeric" aria-labelledby="seat-illustration-label" className="w-12 border-x border-[#E4D3B8] bg-white text-center text-base font-semibold text-[#2C241C] outline-none" value={seatsValue} onChange={(event) => onSeatsChange(event.target.value.replace(/\D/g, ""))} />
            <button type="button" className="w-10 text-lg text-[#42182F]" aria-label="עוד מושבים בהמחשה" onClick={() => stepSeats(1)}>+</button>
          </div>
        </div>
      </div>

      {included === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[#5E4735]">ההערכה המרכזית היא 0, ולכן אין כיסאות צבועים.</p>
      ) : (
        <div
          className="mt-4 grid justify-start gap-x-3 gap-y-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(4.85rem, 4.85rem))" }}
        >
          {picture.tables.map((table, index) => (
            <TableFigure key={index} number={index + 1} seats={table} />
          ))}
        </div>
      )}

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
        {LEGEND.map((item) => (
          <li key={item.mark} className="flex items-center gap-2 text-sm text-[#3A2433]">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <SeatGlyph mark={item.mark} x={8} y={8} r={5.4} />
            </svg>
            <span className="font-semibold">{item.label}</span>
            <span className="font-black tabular-nums">{peopleLabel(counts.get(item.mark) || 0)}</span>
            <span className="text-[#5E4735]">{item.hint}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5E4735]">
        הצבעים ממחישים את רמת הסבירות להגעה לפי ההערכה המרכזית. זוהי תחזית לצורכי תכנון בלבד, ולא נתון על הגעה בפועל או שיבוץ לשולחנות.
      </p>
      {result.totalInvited > included ? (
        <p className="mt-2 text-sm leading-6 text-[#5E4735]">
          {peopleLabel(result.totalInvited - included)} מוזמנים אינם בתוך ההערכה המרכזית, ולכן אינם מצוירים כשולחנות נוספים.
        </p>
      ) : null}
    </div>
  );
}
