"use client";

import { useMemo, useState } from "react";
import {
  forecastSequence,
  illustrateSequence,
  statusSequence,
  type ArrivalResult,
  type ForecastLevel,
  type SeatMark,
} from "./calcLogic";

const STATUS_LEGEND: { mark: SeatMark; label: string }[] = [
  { mark: "status-confirmed", label: "אישרו הגעה" },
  { mark: "status-declined", label: "סירבו" },
  { mark: "status-undecided", label: "מתלבטים" },
  { mark: "status-pending", label: "ממתינים" },
  { mark: "status-unclassified", label: "טרם סווגו" },
];

const FORECAST_LEGEND: { mark: SeatMark; label: string }[] = [
  { mark: "forecast-show", label: "אישור בתוך ההנחה" },
  { mark: "forecast-high", label: "צפי גבוה" },
  { mark: "forecast-undecided", label: "צפי ממתלבטים" },
  { mark: "forecast-pending", label: "צפי מממתינים" },
  { mark: "forecast-low", label: "צפי נמוך" },
  { mark: "forecast-outside", label: "מחוץ לתחזית המוצגת" },
];

function peopleLabel(value: number) {
  return value.toLocaleString("he-IL");
}

function SeatGlyph({ mark, x, y, r }: { mark: SeatMark; x: number; y: number; r: number }) {
  if (mark === "pad") {
    return <circle cx={x} cy={y} r={r * 0.72} fill="transparent" stroke="rgba(58,36,51,0.12)" strokeWidth="1" />;
  }
  if (mark === "status-confirmed" || mark === "forecast-show") {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="#087F68" stroke="#065C4C" strokeWidth="1.2" />
        <circle cx={x} cy={y} r={Math.max(1.5, r * 0.32)} fill="#F7FFFC" />
      </g>
    );
  }
  if (mark === "status-declined") {
    const arm = r * 0.42;
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="#A63D55" stroke="#6E2436" strokeWidth="1.2" />
        <path d={`M ${x - arm} ${y - arm} L ${x + arm} ${y + arm} M ${x + arm} ${y - arm} L ${x - arm} ${y + arm}`} stroke="#FFF8F6" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    );
  }
  if (mark === "status-undecided" || mark === "forecast-undecided") {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="#FFF5F8" stroke="#E77E9A" strokeWidth="1.9" />
        <circle cx={x} cy={y} r={Math.max(1.6, r * 0.38)} fill="none" stroke="#E77E9A" strokeWidth="1.35" />
      </g>
    );
  }
  if (mark === "status-pending") {
    return <circle cx={x} cy={y} r={r} fill="#D6A329" stroke="#8A6810" strokeWidth="1.2" />;
  }
  if (mark === "forecast-pending") {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="#FFF8E8" stroke="#D6A329" strokeWidth="1.7" />
        <path d={`M ${x - r * 0.2} ${y - r * 0.55} L ${x - r * 0.2} ${y + r * 0.55} M ${x + r * 0.2} ${y - r * 0.55} L ${x + r * 0.2} ${y + r * 0.55}`} stroke="#D6A329" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    );
  }
  if (mark === "forecast-high") {
    return <circle cx={x} cy={y} r={r} fill="#D6A329" stroke="#8A6810" strokeWidth="1.2" />;
  }
  if (mark === "status-unclassified") {
    return <circle cx={x} cy={y} r={r} fill="#F7F6F8" stroke="#8B8799" strokeWidth="1.7" strokeDasharray="2.2 1.4" />;
  }
  if (mark === "forecast-low") {
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill="#5E4B8A" stroke="#3A2C5C" strokeWidth="1.2" />
        <rect x={x - r * 0.28} y={y - r * 0.28} width={r * 0.56} height={r * 0.56} fill="#F6F3FB" />
      </g>
    );
  }
  return <circle cx={x} cy={y} r={r} fill="#FBF6EE" stroke="#B7B3C0" strokeWidth="1.6" />;
}

function TableFigure({ number, seats }: { number: number; seats: SeatMark[] }) {
  const size = 128;
  const center = size / 2;
  const orbit = 48;
  const count = Math.max(seats.length, 1);
  const chairRadius = Math.max(6.2, Math.min(8.2, (2 * Math.PI * orbit) / count / 2 - 1.8));

  return (
    <figure className="arrival-table m-0" style={{ contentVisibility: "auto", containIntrinsicSize: "92px" }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block h-[5.35rem] w-[5.35rem] sm:h-[5.75rem] sm:w-[5.75rem]" role="img" aria-label={`שולחן ${number}, המחשה`}>
        {seats.map((mark, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
          return (
            <SeatGlyph
              key={`${mark}-${index}`}
              mark={mark}
              x={center + orbit * Math.cos(angle)}
              y={center + orbit * Math.sin(angle)}
              r={chairRadius}
            />
          );
        })}
        <circle cx={center} cy={center} r={15} fill="#FFFDF8" stroke="#C6A15A" strokeWidth="1.2" />
        <text x={center} y={center + 0.5} textAnchor="middle" dominantBaseline="central" fill="#42182F" fontSize="12" fontWeight="700" fontFamily="Heebo, Arial, sans-serif">
          {number}
        </text>
      </svg>
    </figure>
  );
}

function countMarks(seats: SeatMark[]) {
  const counts = new Map<SeatMark, number>();
  for (const seat of seats) {
    if (seat === "pad") continue;
    counts.set(seat, (counts.get(seat) || 0) + 1);
  }
  return counts;
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
  const [mode, setMode] = useState<"status" | "forecast">("status");
  const [level, setLevel] = useState<ForecastLevel>("mid");
  const seats = Math.min(16, Math.max(4, Number(String(seatsValue).replace(/\D/g, "")) || 10));
  const sequence = useMemo(
    () => (mode === "status" ? statusSequence(result) : forecastSequence(result, level)),
    [mode, result, level]
  );
  const picture = useMemo(() => illustrateSequence(sequence, seats), [sequence, seats]);
  const visibleTables = showAll ? picture.tables : picture.tables.slice(0, 8);
  const fullCounts = countMarks(sequence);
  const visibleCounts = countMarks(visibleTables.flat());
  const fullPeople = sequence.length;
  const visiblePeople = [...visibleCounts.values()].reduce((sum, count) => sum + count, 0);
  const hiddenPeople = Math.max(0, fullPeople - visiblePeople);
  const legend = mode === "status" ? STATUS_LEGEND : FORECAST_LEGEND;
  const levelView = result.forecastViews[level];
  const blocked = mode === "forecast" && !result.forecastReady;
  const statusBlocked = mode === "status" && !result.statusRoster.balanced;

  function stepSeats(delta: number) {
    onSeatsChange(String(Math.min(16, Math.max(4, seats + delta))));
  }

  const title = mode === "status" ? "מפת סטטוס המוזמנים" : "מפת הגעה משוערת";
  const headline =
    mode === "status"
      ? `${peopleLabel(result.totalInvited)} מוזמנים ברשימה`
      : `${peopleLabel(levelView.total)} צפויים להגיע`;

  return (
    <div className="min-w-0">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .arrival-table { animation: arrival-table-in 220ms ease; }
        }
        @keyframes arrival-table-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
      <div className="flex flex-wrap gap-2" role="group" aria-label="סוג המפה">
        <button type="button" aria-pressed={mode === "status"} className={mode === "status" ? "min-h-11 border border-[#42182F] bg-[#42182F] px-4 text-sm font-bold text-white" : "min-h-11 border border-[#D9C4A4] bg-white px-4 text-sm font-bold text-[#5E4735]"} onClick={() => setMode("status")}>
          סטטוס מוזמנים
        </button>
        <button type="button" aria-pressed={mode === "forecast"} className={mode === "forecast" ? "min-h-11 border border-[#42182F] bg-[#42182F] px-4 text-sm font-bold text-white" : "min-h-11 border border-[#D9C4A4] bg-white px-4 text-sm font-bold text-[#5E4735]"} onClick={() => setMode("forecast")}>
          תחזית הגעה
        </button>
      </div>

      <div className="mt-4 overflow-hidden border border-[#E7D6BC] bg-[#FBF6EE]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E7D6BC] px-4 py-4">
          <div>
            <p className="text-xl font-black text-[#42182F]">{title}</p>
            <p className="mt-1 text-sm leading-6 text-[#5E4735]">
              {headline}
              {picture.tables.length > 0 ? ` · ${peopleLabel(picture.tables.length)} שולחנות · ${peopleLabel(picture.seats)} מקומות בשולחן` : ""}
            </p>
          </div>
          <button type="button" className="inline-flex min-h-11 items-center border border-[#D9C4A4] bg-white px-4 text-sm font-bold text-[#5E4735]" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
            {open ? "הסתרת המפה" : "הצגת המפה"}
          </button>
        </div>

        {open ? (
          <div className="px-3 py-4 sm:px-4">
            <p className="max-w-xl text-sm leading-6 text-[#5E4735]">כל כיסא מייצג מקום בהמחשה סטטיסטית בלבד, ולא שיבוץ אורח לשולחן אמיתי.</p>
            {mode === "forecast" ? (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="איזו תחזית לצייר">
                {(
                  [
                    ["low", "תחזית נמוכה"],
                    ["mid", "תחזית מרכזית"],
                    ["high", "תחזית גבוהה"],
                  ] as const
                ).map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={level === id} className={level === id ? "min-h-10 border border-[#8C7040] bg-[#FFF8E8] px-3 text-sm font-bold text-[#3A2433]" : "min-h-10 border border-[#E4D3B8] bg-white px-3 text-sm font-bold text-[#5E4735]"} onClick={() => setLevel(id)}>
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#3A2433]">
              {mode === "status"
                ? "הצבעים כאן הם הסטטוס שהוזן. הם אינם התחזית."
                : "הצבעים כאן הם הערכה סטטיסטית. הם אינם משנים את הסטטוס המקורי."}
            </p>
            {mode === "forecast" && result.undecidedReceived > 0 ? (
              <p className="mt-2 text-sm font-bold leading-6 text-[#42182F]">
                {peopleLabel(result.undecidedReceived)} מתלבטים בפועל · כ־{peopleLabel(levelView.undecided)} צפויים להגיע לפי הנחת התחזית
              </p>
            ) : null}

            {blocked || statusBlocked ? (
              <p className="mt-4 border-r-2 border-[#8E3A4B] pr-3 text-sm leading-6 text-[#6E3038]" role="alert">
                {result.warnings[0] || "אי אפשר לצייר את הרשימה לפני שהסטטוסים מסתכמים למספר המוזמנים."}
              </p>
            ) : fullPeople === 0 ? (
              <p className="mt-4 text-sm leading-6 text-[#5E4735]">עדיין אין מוזמנים לציור.</p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm leading-6 text-[#5E4735]">
                    {hiddenPeople > 0
                      ? `על המסך ${peopleLabel(visiblePeople)} מתוך ${peopleLabel(fullPeople)}. ${peopleLabel(hiddenPeople)} אינם מוצגים כרגע.`
                      : `מוצגים כל ${peopleLabel(fullPeople)} המקומות.`}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#5E4735]" id="seat-illustration-label">מושבים בציור</span>
                    <div dir="ltr" className="flex h-11 items-stretch border border-[#E4D3B8] bg-white">
                      <button type="button" className="w-10 text-lg text-[#42182F]" aria-label="פחות מושבים בהמחשה" onClick={() => stepSeats(-1)}>−</button>
                      <input inputMode="numeric" aria-labelledby="seat-illustration-label" className="w-12 border-x border-[#E4D3B8] bg-white text-center text-base font-semibold text-[#2C241C] outline-none" value={seatsValue} onChange={(event) => onSeatsChange(event.target.value.replace(/\D/g, ""))} />
                      <button type="button" className="w-10 text-lg text-[#42182F]" aria-label="עוד מושבים בהמחשה" onClick={() => stepSeats(1)}>+</button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_15.5rem]">
                  <div>
                    <div className="grid justify-center gap-x-3 gap-y-4 sm:justify-start" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(5.35rem, 5.35rem))" }}>
                      {visibleTables.map((table, index) => (
                        <TableFigure key={`${mode}-${level}-${index}`} number={index + 1} seats={table} />
                      ))}
                    </div>
                    {picture.tables.length > 8 ? (
                      <button type="button" className="mt-4 inline-flex min-h-11 items-center border border-[#D9C4A4] bg-white px-4 text-sm font-bold text-[#5E4735]" aria-expanded={showAll} onClick={() => setShowAll((current) => !current)}>
                        {showAll ? "הצגת פחות שולחנות" : `הצגת כל ${peopleLabel(picture.tables.length)} השולחנות`}
                      </button>
                    ) : null}
                  </div>
                  <div className="border border-[#E7D6BC] bg-[#FFFDF8] px-3 py-3">
                    <p className="text-sm font-black text-[#3A2433]">מקרא · בכל הרשימה</p>
                    <ul className="mt-3 space-y-2">
                      {legend.map((item) => (
                        <li key={item.mark} className="flex items-center justify-between gap-3 text-sm text-[#3A2433]">
                          <span className="flex items-center gap-2 font-semibold">
                            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                              <SeatGlyph mark={item.mark} x={9} y={9} r={6.2} />
                            </svg>
                            {item.label}
                          </span>
                          <span className="font-black tabular-nums">{peopleLabel(fullCounts.get(item.mark) || 0)}</span>
                        </li>
                      ))}
                    </ul>
                    {hiddenPeople > 0 ? (
                      <p className="mt-3 border-t border-[#F0E4D0] pt-3 text-xs leading-5 text-[#5E4735]">
                        בשולחנות הגלויים: {legend.map((item) => `${item.label} ${peopleLabel(visibleCounts.get(item.mark) || 0)}`).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </>
            )}

            <div className="mt-4 border border-dashed border-[#8C7040] bg-[#FFFDF8] px-3 py-3">
              <p className="text-sm font-bold text-[#3A2433]">
                {result.contractMissing
                  ? "לא הוזנה התחייבות לאולם"
                  : `התחייבות לאולם — ${peopleLabel(result.venueMin || 0)} מנות`}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#5E4735]">
                {result.contractMissing
                  ? "ההתחייבות היא נתון חוזי. בלי מספר מההסכם אין כאן המלצה לחתימה."
                  : result.unusedMeals != null && result.unusedMeals > 0
                    ? `הפער מול התחזית המרכזית הוא ${peopleLabel(result.unusedMeals)} מנות. זהו פער מספרי, לא מסקנה שכל המנות האלה יחויבו בלי שימוש.`
                    : "המספר החוזי מוצג להשוואה. הוא אינו צבע של כיסא ואינו סטטוס של אורח."}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
