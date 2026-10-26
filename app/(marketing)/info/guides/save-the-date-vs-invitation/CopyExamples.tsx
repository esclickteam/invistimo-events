"use client";

import { useCallback, useState } from "react";

type Example = {
  id: string;
  title: string;
  tone: string;
  note?: string;
  text: string;
};

const EXAMPLES: Example[] = [
  {
    id: "std-classic",
    title: "Save the Date קלאסי",
    tone: "קלאסי",
    note: "נוסח ידני להעתקה · לא תבנית WhatsApp API",
    text: `Save the Date
מיה ואלון מתחתנים!
24.06.2027
נשמח שתשמרו את התאריך ❤️
פרטים נוספים בקרוב.`,
  },
  {
    id: "std-warm",
    title: "Save the Date מרגש",
    tone: "מרגש",
    note: "נוסח ידני להעתקה",
    text: `משפחה וחברים יקרים,
יש לנו בשורה מרגשת: מיה ואלון מתחתנים!
שמרו לנו את ה־24.06.2027 ביומן.
ההזמנה המלאה תגיע בהמשך 🤍`,
  },
  {
    id: "std-short",
    title: "Save the Date קצר",
    tone: "קצר",
    text: `מיה ואלון · Save the Date
24.06.2027
פרטים בקרוב ❤️`,
  },
  {
    id: "std-light",
    title: "Save the Date קליל",
    tone: "קליל",
    text: `היי!
אנחנו מתחתנים ב־24.06.2027 ✨
שמרו את התאריך — פרטים מדויקים נשלח בהמשך.`,
  },
  {
    id: "std-formal",
    title: "Save the Date רשמי",
    tone: "רשמי",
    text: `Save the Date
בשמחה מבשרים כי מיה ואלון נישאים ביום חמישי, 24 ביוני 2027.
הזמנה רשמית תישלח בהמשך.`,
  },
  {
    id: "std-en",
    title: "Save the Date באנגלית",
    tone: "English",
    note: "נוסח ידני לאורחים מחו״ל",
    text: `Save the Date
Maya & Alon are getting married!
June 24, 2027
Please save the date — formal invitation to follow.`,
  },
  {
    id: "invite-classic",
    title: "הזמנה מלאה קלאסית",
    tone: "הזמנה",
    note: "נוסח ידני · בהזמנה דיגיטלית הפרטים מופיעים גם בעמוד האישי",
    text: `מיה ואלון
שמחים להזמינכם לחגוג עמנו את יום נישואינו.
יום חמישי, 24 ביוני 2027
קבלת פנים: 19:00
חופה: 20:00
אולם הגפן, רחוב הדוגמה 12, תל אביב
נשמח לראותכם!`,
  },
  {
    id: "invite-warm",
    title: "הזמנה מלאה מרגשת",
    tone: "הזמנה",
    text: `משפחה וחברים אהובים,
ב־24 ביוני 2027 אנחנו מתחתנים — ואין לנו יותר מרגש מלחגוג אתכם.
קבלת פנים ב־19:00, חופה ב־20:00
באולם הגפן, תל אביב.
מחכים לכם בלב שלם 🤍`,
  },
  {
    id: "invite-wa",
    title: "הזמנה קצרה ל־WhatsApp",
    tone: "WhatsApp",
    note: "נוסח ידני · תבניות API מאושרות במערכת אינן ניתנות לעריכה חופשית מלאה",
    text: `מיה ואלון מזמינים אתכם לחתונה
24.06.2027 · קבלת פנים 19:00
פרטים ואישור הגעה בקישור האישי.`,
  },
  {
    id: "date-change",
    title: "הודעת שינוי תאריך",
    tone: "עדכון",
    text: `משפחה וחברים יקרים ❤️
רצינו לעדכן שתאריך החתונה שלנו השתנה.
התאריך החדש הוא 24.06.2027.
נשמח שתעדכנו את היומן, ופרטים נוספים יישלחו בהמשך.`,
  },
  {
    id: "invite-reminder",
    title: "הודעת תזכורת להזמנה",
    tone: "תזכורת",
    text: `היי,
רצינו להזכיר את ההזמנה לחתונה של מיה ואלון ב־24.06.2027.
אם עוד לא הספקתם לאשר הגעה — נשמח לעדכון בקישור האישי.`,
  },
  {
    id: "abroad",
    title: "הודעה לאורחים מחו״ל",
    tone: "English",
    text: `Dear family & friends,
We're getting married on June 24, 2027 in Tel Aviv.
Please save the date — a full invitation with venue details will follow.
We can't wait to celebrate with you!`,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-full border border-[#DCC7A6] bg-white px-4 py-2 text-xs font-bold text-[#5E4735] transition hover:bg-[#FFF8EA] print:hidden"
    >
      {copied ? "הועתק" : "העתקה"}
    </button>
  );
}

export default function CopyExamples() {
  const [names, setNames] = useState("מיה ואלון");
  const [date, setDate] = useState("24.06.2027");

  const personalized = EXAMPLES.map((ex) => ({
    ...ex,
    text: ex.text
      .replaceAll("מיה ואלון", names.trim() || "מיה ואלון")
      .replaceAll("Maya & Alon", names.includes("ו") ? "Maya & Alon" : names.trim() || "Maya & Alon")
      .replaceAll("We're getting married", names.trim() ? `${names.trim()} are getting married` : "We're getting married")
      .replaceAll("24.06.2027", date.trim() || "24.06.2027")
      .replaceAll("June 24, 2027", date.trim() || "June 24, 2027")
      .replaceAll("24 ביוני 2027", date.includes(".") ? "24 ביוני 2027" : date.trim() || "24 ביוני 2027"),
  }));

  return (
    <div className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_14px_36px_rgba(58,39,20,0.06)] md:p-7">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-bold text-[#7A6042]">
          שמות לדוגמה
          <input
            value={names}
            onChange={(e) => setNames(e.target.value)}
            className="rounded-xl border border-[#E6D2AA] bg-white px-3 py-2 text-sm font-semibold text-[#2C241C]"
          />
        </label>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-bold text-[#7A6042]">
          תאריך לדוגמה
          <input
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-[#E6D2AA] bg-white px-3 py-2 text-sm font-semibold text-[#2C241C]"
          />
        </label>
      </div>
      <p className="mt-3 text-sm leading-7 text-[#7A6042]">
        הנוסחים שלמטה מיועדים להעתקה ידנית או להשראה. תבניות WhatsApp מאושרות במערכת כפופות לנוסח שאושר —
        לא כל הודעה ניתנת לעריכה חופשית.
      </p>
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {personalized.map((ex) => (
          <li
            key={ex.id}
            className="flex flex-col rounded-[22px] border border-[#EADDC8] bg-white/90 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wide text-[#A77A38]">{ex.tone}</p>
                <h3 className="mt-1 text-base font-black text-[#2C241C]">{ex.title}</h3>
              </div>
              <CopyButton text={ex.text} />
            </div>
            {ex.note ? <p className="mt-2 text-[11px] font-semibold text-[#7A6042]">{ex.note}</p> : null}
            <pre className="mt-3 flex-1 whitespace-pre-wrap font-sans text-sm leading-7 text-[#3F3025]">
              {ex.text}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
