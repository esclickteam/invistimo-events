const STEPS = [
  { title: "בוחרים חבילה", text: "מספר רשומות, מסלול ותוספות במחשבון." },
  { title: "פונים לצוות ומשלימים מול נציג", text: "שולחים ב־WhatsApp את החבילה ומספר הרשומות, או פונים ביצירת קשר. ההזמנה מושלמת מול נציג — אין תשלום עצמאי באתר." },
  { title: "מגדירים את פרטי האירוע", text: "תאריך, מקום ופרטים שיופיעו לאורחים." },
  { title: "מוסיפים רשימת מוזמנים", text: "רשומות קשר עם טלפון לפי כללי החבילה." },
  { title: "מעלים או יוצרים הזמנה", text: "הזמנה דיגיטלית מהמערכת או קובץ מוכן." },
  { title: "מגדירים את תהליך אישורי ההגעה", text: "סבבי הודעות ו/או שיחות לפי החבילה." },
  { title: "עוקבים אחר התשובות", text: "בדשבורד ובסטטוסים בזמן אמת." },
  { title: "מבצעים הושבה, אם נרכשה", text: "מפת שולחנות ושיבוץ לפי האישורים." },
  { title: "נערכים ליום האירוע", text: "תזכורות, מספר שולחן והודעת תודה לפי ההגדרות." },
  { title: "משתמשים בשירותים הנוספים", text: "רק מה שנרכש בפועל — כולל LIVE אם הוזמן בנפרד." },
];

export default function ProcessTimeline() {
  return (
    <ol className="relative space-y-0">
      <div
        className="pricing-timeline-line pointer-events-none absolute bottom-3 top-3 right-[1.15rem] w-0.5 sm:right-[1.35rem]"
        aria-hidden="true"
      />
      {STEPS.map((step, index) => (
        <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
          <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D4B06E] bg-[#FFF8EE] text-sm font-black text-[#8A4E19] shadow-[0_8px_18px_rgba(168,111,43,0.12)] sm:h-11 sm:w-11">
            {index + 1}
          </span>
          <div className="min-w-0 rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3 sm:px-5">
            <h3 className="text-base font-black text-[#35281F] sm:text-lg">{step.title}</h3>
            <p className="mt-1 text-sm leading-6 text-[#5C4A3A]">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
