type RoundTableMarkProps = {
  label: string;
  seats: number;
  filled: number;
  onClick?: () => void;
  flash?: boolean;
  tone?: "dark" | "light";
};

export default function RoundTableMark({
  label,
  seats,
  filled,
  onClick,
  flash = false,
  tone = "dark",
}: RoundTableMarkProps) {
  const occupied = Math.max(0, Math.min(seats, filled));
  const dark = tone === "dark";
  const ink = dark || occupied > 0 ? "#F5EEE8" : "#42182F";
  const cloth = dark ? (occupied > 0 ? "#842B4C" : "#42182F") : occupied > 0 ? "#42182F" : "#FFF8F0";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`שולחן ${label}, ${occupied} מתוך ${seats}`}
      className={`relative block aspect-square w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C5A582] ${
        flash ? "hall-seat-flash" : ""
      }`}
    >
      <svg
        viewBox="0 0 160 160"
        className="h-full w-full overflow-visible [&_rect]:transition-colors [&_rect]:duration-500 motion-reduce:[&_rect]:transition-none"
        aria-hidden
      >
        <ellipse cx="80" cy="96" rx="48" ry="13" fill={dark ? "rgba(0,0,0,0.28)" : "rgba(66,24,47,0.12)"} />
        {Array.from({ length: seats }, (_, index) => {
          const taken = index < occupied;
          const seat = taken ? (dark ? "#C5A582" : "#842B4C") : dark ? "#F5EEE8" : "#FFF8F0";
          const back = taken ? (dark ? "#E8D9C8" : "#42182F") : dark ? "#C5A582" : "#DCC7B0";
          return (
            <g key={index} transform={`rotate(${(index / seats) * 360} 80 80)`}>
              <rect x="72.5" y="16" width="15" height="5" rx="1.6" fill={back} />
              <rect x="69" y="21.5" width="22" height="15" rx="2.4" fill={seat} stroke="#C5A582" strokeWidth="0.8" />
            </g>
          );
        })}
        <circle cx="80" cy="80" r="33" fill={cloth} stroke="#C5A582" strokeWidth="2.4" />
        <circle cx="80" cy="80" r="26" fill="none" stroke={ink} strokeOpacity="0.22" strokeWidth="1" />
        <circle cx="80" cy="80" r="4.5" fill="none" stroke="#C5A582" strokeWidth="1.2" />
        <text
          x="80"
          y="76"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={ink}
          fontSize="18"
          fontWeight="800"
          style={{ fontFamily: "inherit" }}
        >
          {label}
        </text>
        <text
          x="80"
          y="91"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={ink}
          fontSize="9"
          fontWeight="700"
          opacity="0.9"
          style={{ fontFamily: "inherit" }}
        >
          {occupied}/{seats}
        </text>
      </svg>
    </button>
  );
}
