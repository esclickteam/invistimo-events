"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";

type StyleId = "classic" | "luxury" | "warm" | "light" | "family" | "formal" | "short" | "reminder";

const STYLES: { id: StyleId; label: string; text: string }[] = [
  {
    id: "classic",
    label: "קלאסי",
    text: `משפחה וחברים יקרים,
בהתרגשות גדולה אנחנו מזמינים אתכם לחגוג איתנו את היום המיוחד שלנו.
כל הפרטים מחכים לכם בהזמנה ❤️
[קישור להזמנה]`,
  },
  {
    id: "luxury",
    label: "יוקרתי",
    text: `שמחים להזמינכם לחגוג עמנו.
פרטי האירוע מופיעים בהזמנה הדיגיטלית:
[קישור להזמנה]
נשמח לראותכם.`,
  },
  {
    id: "warm",
    label: "מרגש",
    text: `אנחנו מתרגשים לספר לכם — אנחנו מתחתנים!
נשמח מאוד שתהיו חלק מהיום הזה.
להזמנה ולפרטים:
[קישור להזמנה]`,
  },
  {
    id: "light",
    label: "קליל",
    text: `אנחנו מתחתנים! 💍
נשמח מאוד לחגוג איתכם.
להזמנה ולפרטי האירוע:
[קישור להזמנה]`,
  },
  {
    id: "family",
    label: "משפחתי",
    text: `משפחה יקרה,
נשמח לראות אתכם בחתונה שלנו.
כל הפרטים — כולל אישור הגעה — בקישור:
[קישור להזמנה]
מחכים לכם באהבה.`,
  },
  {
    id: "formal",
    label: "רשמי",
    text: `שלום,
נשמח להזמינכם לחגוג עמנו את יום נישואינו.
פרטי האירוע מופיעים בקישור המצורף:
[קישור להזמנה]`,
  },
  {
    id: "short",
    label: "קצר במיוחד",
    text: `הזמנה לחתונה שלנו ❤️
[קישור להזמנה]`,
  },
  {
    id: "reminder",
    label: "תזכורת עדינה",
    text: `שלום,
רק תזכורת קצרה לגבי האירוע שלנו — אם עדיין לא הספקתם לאשר הגעה, אפשר דרך הקישור:
[קישור להזמנה]
תודה רבה.`,
  },
];

const EXTRA_EVENTS: { id: string; label: string; text: string }[] = [
  {
    id: "henna",
    label: "לחינה",
    text: `שמחים להזמינכם לחינה שלנו!
פרטי האירוע בקישור:
[קישור להזמנה]
נשמח לראותכם.`,
  },
  {
    id: "barmitzvah",
    label: "לבר / בת מצווה",
    text: `שמחים להזמינכם לחגוג איתנו את בר/בת המצווה.
כל הפרטים ואישור ההגעה בקישור:
[קישור להזמנה]`,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#DCC7A6] bg-white px-5 py-2.5 text-sm font-bold text-[#5E4735] transition hover:bg-[#FFF8EA] print:hidden"
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? "הועתק" : "העתיקו את הנוסח"}
    </button>
  );
}

export default function MessageTemplates() {
  const [active, setActive] = useState<StyleId>("classic");
  const current = STYLES.find((s) => s.id === active) ?? STYLES[0];

  return (
    <div
      id="message-templates"
      className="rounded-[28px] border border-[#E6D2AA] bg-[#FFFDF8] p-5 shadow-[0_14px_36px_rgba(58,39,20,0.06)] md:p-7"
    >
      <p className="text-xs font-black tracking-[0.12em] text-[#8A642E]">נוסחים להעתקה</p>
      <h3 className="mt-2 text-xl font-black text-[#2C241C] md:text-2xl">בחרו סגנון הודעה</h3>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-[#7A6042]">
        נוסחים אלה מיועדים להשראה או לשליחה ידנית ב־WhatsApp. הם אינם בהכרח תואמים לתבנית WhatsApp
        האוטומטית המאושרת של המערכת.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
              active === s.id
                ? "border-[#C7A56B] bg-[#FFF8EA] text-[#5E4735]"
                : "border-[#EADDC8] bg-white text-[#7A6042] hover:border-[#C7A56B]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-[22px] border border-[#E7D3B0] bg-white p-5">
        <p className="text-sm font-black text-[#7A5530]">{current.label}</p>
        <blockquote className="mt-3 whitespace-pre-wrap rounded-2xl border border-[#EADDC8] bg-[#FBF6EE] px-4 py-3 text-sm leading-7 text-[#3F3025] md:text-base">
          {current.text}
        </blockquote>
        <div className="mt-4">
          <CopyButton text={current.text} />
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {EXTRA_EVENTS.map((item) => (
          <div key={item.id} className="rounded-[22px] border border-[#EADDC8] bg-white/90 p-5">
            <p className="text-sm font-black text-[#2C241C]">{item.label}</p>
            <blockquote className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5C4A3A]">
              {item.text}
            </blockquote>
            <div className="mt-4">
              <CopyButton text={item.text} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
