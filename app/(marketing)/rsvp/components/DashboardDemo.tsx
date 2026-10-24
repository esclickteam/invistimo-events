/** Static illustration of RSVP status — clearly labeled as sample data. */

export default function DashboardDemo() {
  return (
    <div
      dir="rtl"
      className="relative overflow-hidden rounded-[32px] border border-[#E6D2AA] bg-gradient-to-br from-[#FFFDF8] via-[#FFF8EA] to-[#F3E4C7] p-5 shadow-[0_28px_70px_rgba(91,63,32,0.12)] md:p-7"
      aria-label="המחשה של מצב אישורי הגעה במערכת"
    >
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E6D2AA] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#7A6042]">
        <span className="h-2 w-2 rounded-full bg-[#C7A56B]" />
        נתוני המחשה · לא נתוני לקוח אמיתיים
      </div>

      <h3 className="text-xl font-black text-[#35281F] md:text-2xl">מצב אישורי הגעה</h3>
      <p className="mt-1 text-sm font-semibold text-[#6D5B4A]">החתונה של מאיה ואיתי</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { value: "148", label: "אישרו הגעה", tone: "text-[#2F6B3C]" },
          { value: "27", label: "לא מגיעים", tone: "text-[#9B3B32]" },
          { value: "41", label: "עדיין לא השיבו", tone: "text-[#A06A1C]" },
          { value: "216", label: "מוזמנים", tone: "text-[#35281F]" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#EADCC8] bg-white/90 px-3 py-4 text-center"
          >
            <div className={`text-2xl font-black md:text-3xl ${item.tone}`}>{item.value}</div>
            <div className="mt-1 text-xs font-bold text-[#6D5B4A] md:text-sm">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[#EADCC8] bg-white/90 p-4">
        <div className="mb-2 flex items-center justify-between text-sm font-bold text-[#514033]">
          <span>התקדמות תשובות</span>
          <span className="text-[#A77A38]">68%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[#F0E4D2]" aria-hidden>
          <div className="h-full w-[68%] rounded-full bg-gradient-to-l from-[#C7A56B] to-[#A77A38]" />
        </div>
        <p className="mt-3 text-sm leading-6 text-[#6D5B4A]">
          175 מתוך 216 השיבו · 296 מגיעים צפויים לפי האישורים
        </p>
      </div>

      <ul className="mt-5 divide-y divide-[#F0E4D2] overflow-hidden rounded-2xl border border-[#EADCC8] bg-white/90">
        {[
          { name: "נועה כהן", status: "מגיעה · 2", tone: "bg-[#E8F5E9] text-[#2E7D32]" },
          { name: "אורן לוי", status: "ממתין לתשובה", tone: "bg-[#FFF4E0] text-[#B26A00]" },
          { name: "יעל אברהם", status: "לא מגיעה", tone: "bg-[#FCE8E6] text-[#C62828]" },
        ].map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <span className="font-bold text-[#35281F]">{row.name}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${row.tone}`}>
              {row.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
