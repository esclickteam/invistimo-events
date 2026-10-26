"use client";

type SeatStatus = "filled" | "empty" | "reserve";

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function RoundTable({
  label,
  seated,
  capacity,
  size = 168,
}: {
  label: string;
  seated: number;
  capacity: number;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const tableR = size * 0.28;
  const seatR = size * 0.42;
  const seats: SeatStatus[] = Array.from({ length: capacity }, (_, i) =>
    i < seated ? "filled" : "empty"
  );

  return (
    <figure className="flex flex-col items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${seated} מתוך ${capacity} משובצים`}
        className="overflow-visible"
      >
        <circle
          cx={cx}
          cy={cy}
          r={tableR}
          fill="#FFF8EA"
          stroke="#C7A56B"
          strokeWidth={2.5}
        />
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-[#2C241C]"
          style={{ fontSize: 11, fontWeight: 800 }}
        >
          {label}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          className="fill-[#8A642E]"
          style={{ fontSize: 10, fontWeight: 700 }}
        >
          {seated}/{capacity}
        </text>
        {seats.map((status, i) => {
          const angle = (360 / capacity) * i;
          const p = polar(cx, cy, seatR, angle);
          const fill = status === "filled" ? "#5A4333" : "#F3E6D0";
          const stroke = status === "filled" ? "#3A2B22" : "#DCC7A6";
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={size * 0.055}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.5}
            />
          );
        })}
      </svg>
      <figcaption className="text-center text-sm font-bold text-[#5E4735]">
        {seated === capacity
          ? "שולחן מלא — בלי מקום לתוספת"
          : `${capacity - seated} מקומות פנויים בשולחן`}
      </figcaption>
    </figure>
  );
}

export function TableFillComparison() {
  return (
    <div
      className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 md:p-8"
      aria-label="המחשת מילוי שולחנות"
    >
      <p className="text-center text-xs font-black tracking-[0.12em] text-[#8A642E]">
        המחשה · שולחנות בקיבולת 10
      </p>
      <div className="mt-6 flex flex-wrap items-start justify-center gap-8 md:gap-14">
        <RoundTable label="שולחן א׳" seated={10} capacity={10} />
        <RoundTable label="שולחן ב׳" seated={8} capacity={10} />
      </div>
      <p className="mx-auto mt-6 max-w-xl text-center text-sm leading-7 text-[#5C4A3A]">
        שני השולחנות תקפים מבחינת קיבולת. ההבדל הוא בגמישות לשינויים ובנוחות הקבוצה — לא
        ב«חובה» למלא עד הסוף.
      </p>
    </div>
  );
}

const MAP_TABLES = [
  { id: 1, label: "משפחת הכלה", seated: 9, capacity: 10, x: 18, y: 28 },
  { id: 2, label: "משפחת החתן", seated: 10, capacity: 10, x: 50, y: 22 },
  { id: 3, label: "חברים", seated: 8, capacity: 10, x: 82, y: 28 },
  { id: 4, label: "עבודה", seated: 7, capacity: 10, x: 28, y: 68 },
  { id: 5, label: "צבא", seated: 9, capacity: 10, x: 62, y: 72 },
  { id: 6, label: "רזרבה", seated: 0, capacity: 10, x: 88, y: 70 },
] as const;

export function SeatingMapIllustration() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] shadow-[0_18px_40px_rgba(58,39,20,0.08)]">
      <div className="border-b border-[#EFE2CC] px-5 py-4 md:px-6">
        <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">
          המחשה · מפת שולחנות לפי קבוצות
        </p>
        <p className="mt-1 text-sm font-semibold text-[#5C4A3A]">
          דוגמה לתכנון — לא נתוני לקוח אמיתיים
        </p>
      </div>
      <div className="relative aspect-[16/10] w-full bg-[radial-gradient(circle_at_50%_40%,#FFF8EA_0%,#F7EFE0_55%,#EFE2CC_100%)]">
        <div
          className="absolute inset-[8%] rounded-[20px] border border-dashed border-[#D4B887]/80"
          aria-hidden
        />
        {MAP_TABLES.map((t) => (
          <div
            key={t.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
          >
            <div
              className={`flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-full border-2 text-center shadow-sm md:h-24 md:w-24 ${
                t.seated === 0
                  ? "border-[#C7A56B] border-dashed bg-white/70"
                  : "border-[#C7A56B] bg-[#FFFDF8]"
              }`}
            >
              <span className="text-[10px] font-black text-[#8A642E] md:text-xs">
                שולחן {t.id}
              </span>
              <span className="mt-0.5 max-w-[4.2rem] truncate text-[9px] font-bold text-[#5E4735] md:text-[10px]">
                {t.label}
              </span>
              <span className="mt-0.5 text-[11px] font-black tabular-nums text-[#2C241C] md:text-sm">
                {t.seated}/{t.capacity}
              </span>
            </div>
          </div>
        ))}
      </div>
      <ul className="grid gap-2 border-t border-[#EFE2CC] px-5 py-4 text-sm text-[#5C4A3A] sm:grid-cols-2 md:px-6">
        <li>
          <span className="font-black text-[#2C241C]">שולחנות 1–5:</span> קבוצות משובצות
        </li>
        <li>
          <span className="font-black text-[#2C241C]">שולחן 6:</span> רזרבה — רק אם אושרה
          להפעלה
        </li>
      </ul>
    </div>
  );
}

const SCENARIOS = [
  { pct: 0, arrive: 300, note: "כולם מגיעים" },
  { pct: 3, arrive: 291, note: "אי־הגעה נמוכה" },
  { pct: 10, arrive: 270, note: "תרחיש תכנון נפוץ" },
] as const;

export function ArrivalScenariosChart() {
  return (
    <div className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 md:p-7">
      <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">
        דוגמה · 300 מאשרי הגעה
      </p>
      <p className="mt-2 text-sm leading-7 text-[#5C4A3A]">
        אותו מספר מאשרים — תרחישי הגעה שונים. אף אחד מהם אינו «האמת» לכל חתונה.
      </p>
      <ul className="mt-6 space-y-4">
        {SCENARIOS.map((s) => {
          const widthPct = Math.round((s.arrive / 300) * 100);
          return (
            <li key={s.pct}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-bold text-[#5E4735]">
                  אי־הגעה משוערת {s.pct}% · {s.note}
                </span>
                <span className="font-black tabular-nums text-[#2C241C]">
                  {s.arrive} מגיעים
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#EFE2CC]">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-[#5A4333] to-[#C7A56B]"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 rounded-2xl border border-[#E7D3B0] bg-[#FBF6EE] px-4 py-3 text-sm font-semibold leading-7 text-[#5C4A3A]">
        גם אם מעריכים 270 מגיעים — תכננו קיבולת שיכולה לקלוט את כל 300 המאשרים, אלא אם יש
        הסכם רזרבות מאושר שמאפשר זאת במפורש.
      </p>
    </div>
  );
}

/** Demo occupancy cards matching Invistimo-style seated/capacity display */
export function OccupancyDemoCards() {
  const rows = [
    { name: "שולחן 1", seated: 8, capacity: 10 },
    { name: "שולחן 2", seated: 10, capacity: 10 },
    { name: "שולחן 3", seated: 9, capacity: 12 },
  ] as const;
  const seatedTotal = rows.reduce((s, r) => s + r.seated, 0);
  const capacityTotal = rows.reduce((s, r) => s + r.capacity, 0);
  const unassigned = 14;

  return (
    <div className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">
            המחשה · תצוגת קיבולת בסגנון המערכת
          </p>
          <p className="mt-1 text-sm font-semibold text-[#5C4A3A]">
            מספרים להמחשה בלבד — לא נתוני לקוחות
          </p>
        </div>
        <dl className="flex gap-4 text-center text-xs">
          <div>
            <dt className="font-bold text-[#8A642E]">משובצים</dt>
            <dd className="text-lg font-black tabular-nums text-[#2C241C]">{seatedTotal}</dd>
          </div>
          <div>
            <dt className="font-bold text-[#8A642E]">קיבולת</dt>
            <dd className="text-lg font-black tabular-nums text-[#2C241C]">{capacityTotal}</dd>
          </div>
          <div>
            <dt className="font-bold text-[#8A642E]">פנויים</dt>
            <dd className="text-lg font-black tabular-nums text-[#2C241C]">
              {capacityTotal - seatedTotal}
            </dd>
          </div>
        </dl>
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {rows.map((r) => {
          const full = r.seated >= r.capacity;
          const pct = Math.round((r.seated / r.capacity) * 100);
          return (
            <li
              key={r.name}
              className={`rounded-2xl border px-4 py-4 ${
                full ? "border-[#C7A56B] bg-[#FFF8EA]" : "border-[#EADDC8] bg-white"
              }`}
            >
              <p className="text-sm font-black text-[#2C241C]">{r.name}</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-[#35281F]">
                {r.seated}
                <span className="text-base font-bold text-[#8A642E]"> / {r.capacity}</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EFE2CC]">
                <div
                  className={`h-full rounded-full ${full ? "bg-[#5A4333]" : "bg-[#C7A56B]"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-bold text-[#7A6042]">
                {full ? "מלא" : `${r.capacity - r.seated} פנויים`}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 rounded-2xl border border-dashed border-[#DCC7A6] bg-white/80 px-4 py-3 text-sm font-semibold text-[#5C4A3A]">
        אורחים שטרם שובצו (המחשה): {unassigned}
      </p>
    </div>
  );
}
