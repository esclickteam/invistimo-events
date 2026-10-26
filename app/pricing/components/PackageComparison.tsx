"use client";

import { useState } from "react";
import { CheckStatusIcon } from "@/app/pricing/components/PricingIcons";
import { PACKAGES, type PackageId } from "@/lib/pricing/packageQuote";

type Cell =
  | { kind: "included"; text: string }
  | { kind: "addon"; text: string }
  | { kind: "excluded"; text: string }
  | { kind: "limit"; text: string };

type Row = {
  feature: string;
  cells: Record<PackageId, Cell>;
};

const PACKAGE_IDS: PackageId[] = ["messages", "voice", "personal", "hybrid"];

const ROWS: Row[] = [
  {
    feature: "הזמנה דיגיטלית",
    cells: {
      messages: { kind: "included", text: "כלול" },
      voice: { kind: "included", text: "כלול" },
      personal: { kind: "included", text: "כלול" },
      hybrid: { kind: "included", text: "כלול" },
    },
  },
  {
    feature: "Save the Date",
    cells: {
      messages: { kind: "limit", text: "לפי הגדרות חשבון" },
      voice: { kind: "limit", text: "לפי הגדרות חשבון" },
      personal: { kind: "limit", text: "לפי הגדרות חשבון" },
      hybrid: { kind: "limit", text: "לפי הגדרות חשבון" },
    },
  },
  {
    feature: "הודעות WhatsApp",
    cells: {
      messages: { kind: "limit", text: "2 סבבים" },
      voice: { kind: "limit", text: "2 סבבים" },
      personal: { kind: "limit", text: "2 סבבים" },
      hybrid: { kind: "limit", text: "2 סבבים" },
    },
  },
  {
    feature: "הודעות SMS",
    cells: {
      messages: { kind: "limit", text: "תזכורת + תודה" },
      voice: { kind: "limit", text: "תזכורת + תודה" },
      personal: { kind: "limit", text: "תזכורת + תודה" },
      hybrid: { kind: "limit", text: "תזכורת + תודה" },
    },
  },
  {
    feature: "סבבי אישורי הגעה",
    cells: {
      messages: { kind: "limit", text: "2 סבבי וואטסאפ" },
      voice: { kind: "limit", text: "הודעות + 3 שיחות" },
      personal: { kind: "limit", text: "הודעות + 3 שיחות" },
      hybrid: { kind: "limit", text: "הודעות + 3 שיחות" },
    },
  },
  {
    feature: "שיחות מוקלטות",
    cells: {
      messages: { kind: "excluded", text: "לא כלול" },
      voice: { kind: "limit", text: "3 סבבים" },
      personal: { kind: "excluded", text: "לא כלול" },
      hybrid: { kind: "limit", text: "2 סבבים" },
    },
  },
  {
    feature: "מוקד אנושי",
    cells: {
      messages: { kind: "excluded", text: "לא כלול" },
      voice: { kind: "excluded", text: "לא כלול" },
      personal: { kind: "limit", text: "3 סבבים" },
      hybrid: { kind: "limit", text: "סבב אחד" },
    },
  },
  {
    feature: "מספר ניסיונות חיוג",
    cells: {
      messages: { kind: "excluded", text: "לא רלוונטי" },
      voice: { kind: "limit", text: "לפי הגדרות הסבב" },
      personal: { kind: "limit", text: "לפי הגדרות הסבב" },
      hybrid: { kind: "limit", text: "לפי הגדרות הסבב" },
    },
  },
  {
    feature: "התאמה לטלפונים כשרים",
    cells: {
      messages: { kind: "limit", text: "SMS / תהליך נתמך" },
      voice: { kind: "limit", text: "SMS / תהליך נתמך" },
      personal: { kind: "limit", text: "SMS / תהליך נתמך" },
      hybrid: { kind: "limit", text: "SMS / תהליך נתמך" },
    },
  },
  {
    feature: "תזכורת לפני האירוע",
    cells: {
      messages: { kind: "included", text: "SMS + מספר שולחן" },
      voice: { kind: "included", text: "SMS + מספר שולחן" },
      personal: { kind: "included", text: "SMS + מספר שולחן" },
      hybrid: { kind: "included", text: "SMS + מספר שולחן" },
    },
  },
  {
    feature: "הודעת תודה",
    cells: {
      messages: { kind: "included", text: "SMS" },
      voice: { kind: "included", text: "SMS" },
      personal: { kind: "included", text: "SMS" },
      hybrid: { kind: "included", text: "SMS" },
    },
  },
  {
    feature: "קישור אישי לאורח",
    cells: {
      messages: { kind: "included", text: "כלול" },
      voice: { kind: "included", text: "כלול" },
      personal: { kind: "included", text: "כלול" },
      hybrid: { kind: "included", text: "כלול" },
    },
  },
  {
    feature: "ניהול רשימת מוזמנים",
    cells: {
      messages: { kind: "included", text: "כלול" },
      voice: { kind: "included", text: "כלול" },
      personal: { kind: "included", text: "כלול" },
      hybrid: { kind: "included", text: "כלול" },
    },
  },
  {
    feature: "דשבורד",
    cells: {
      messages: { kind: "included", text: "כלול" },
      voice: { kind: "included", text: "כלול + סטטוסים" },
      personal: { kind: "included", text: "כלול + סטטוסים" },
      hybrid: { kind: "included", text: "כלול + סטטוסים" },
    },
  },
  {
    feature: "סידורי הושבה",
    cells: {
      messages: { kind: "addon", text: "בתוספת 100 ₪" },
      voice: { kind: "addon", text: "בתוספת 100 ₪" },
      personal: { kind: "addon", text: "בתוספת 100 ₪" },
      hybrid: { kind: "addon", text: "בתוספת 100 ₪" },
    },
  },
  {
    feature: "מפת שולחנות",
    cells: {
      messages: { kind: "addon", text: "עם תוספת הושבה" },
      voice: { kind: "addon", text: "עם תוספת הושבה" },
      personal: { kind: "addon", text: "עם תוספת הושבה" },
      hybrid: { kind: "addon", text: "עם תוספת הושבה" },
    },
  },
  {
    feature: "הודעת מספר שולחן",
    cells: {
      messages: { kind: "limit", text: "בתזכורת כשיש הושבה" },
      voice: { kind: "limit", text: "בתזכורת כשיש הושבה" },
      personal: { kind: "limit", text: "בתזכורת כשיש הושבה" },
      hybrid: { kind: "limit", text: "בתזכורת כשיש הושבה" },
    },
  },
  {
    feature: "ניהול אירוע עצמאי",
    cells: {
      messages: { kind: "addon", text: "בתוספת תשלום" },
      voice: { kind: "addon", text: "בתוספת תשלום" },
      personal: { kind: "addon", text: "בתוספת תשלום" },
      hybrid: { kind: "addon", text: "בתוספת תשלום" },
    },
  },
  {
    feature: "שירותי LIVE",
    cells: {
      messages: { kind: "excluded", text: "מוצר נפרד" },
      voice: { kind: "excluded", text: "מוצר נפרד" },
      personal: { kind: "excluded", text: "מוצר נפרד" },
      hybrid: { kind: "excluded", text: "מוצר נפרד" },
    },
  },
  {
    feature: "מתנות באשראי",
    cells: {
      messages: { kind: "addon", text: "ספק חיצוני" },
      voice: { kind: "addon", text: "ספק חיצוני" },
      personal: { kind: "addon", text: "ספק חיצוני" },
      hybrid: { kind: "addon", text: "ספק חיצוני" },
    },
  },
  {
    feature: "עיצוב הזמנה אישי",
    cells: {
      messages: { kind: "addon", text: "בתוספת תשלום" },
      voice: { kind: "addon", text: "בתוספת תשלום" },
      personal: { kind: "addon", text: "בתוספת תשלום" },
      hybrid: { kind: "addon", text: "בתוספת תשלום" },
    },
  },
];

function statusOf(cell: Cell): "included" | "addon" | "excluded" {
  if (cell.kind === "included") return "included";
  if (cell.kind === "addon") return "addon";
  if (cell.kind === "excluded") return "excluded";
  return "included";
}

function CellView({ cell }: { cell: Cell }) {
  const status = statusOf(cell);
  const label =
    cell.kind === "included"
      ? "כלול"
      : cell.kind === "addon"
        ? "בתוספת תשלום"
        : cell.kind === "excluded"
          ? "לא כלול"
          : "מגבלת שירות";

  return (
    <span className="inline-flex items-start gap-2 text-sm leading-5 text-[#5C4A3A]">
      <CheckStatusIcon status={status === "included" && cell.kind === "limit" ? "included" : status} />
      <span>
        <span className="sr-only">{label}: </span>
        {cell.text}
      </span>
    </span>
  );
}

export default function PackageComparison() {
  const [active, setActive] = useState<PackageId>("messages");

  return (
    <div>
      {/* Mobile: package tabs + feature list */}
      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-3" role="tablist" aria-label="בחירת חבילה להשוואה">
          {PACKAGE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active === id}
              onClick={() => setActive(id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                active === id
                  ? "bg-[#3E2D20] text-[#F7E9D3]"
                  : "border border-[#E5D3B8] bg-white text-[#5A3E25]"
              }`}
            >
              {PACKAGES[id].hebrewName}
            </button>
          ))}
        </div>
        <ul className="space-y-3">
          {ROWS.map((row) => (
            <li
              key={row.feature}
              className="rounded-2xl border border-[#E6D2AA] bg-white px-4 py-3"
            >
              <p className="text-sm font-black text-[#35281F]">{row.feature}</p>
              <div className="mt-2">
                <CellView cell={row.cells[active]} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[54rem] border-collapse text-right text-sm">
          <caption className="mb-3 text-right text-base font-black text-[#35281F]">
            השוואה לפי תכולת החבילות במחשבון — הסכום מופיע אחרי בחירת רשומות ותוספות
          </caption>
          <thead>
            <tr>
              <th className="border border-[#E6D2AA] bg-[#F7F1E8] px-3 py-3 font-black text-[#35281F]">
                שירות
              </th>
              {PACKAGE_IDS.map((id) => (
                <th
                  key={id}
                  scope="col"
                  className="border border-[#E6D2AA] bg-[#F7F1E8] px-3 py-3 font-black text-[#35281F]"
                >
                  <span className="block">{PACKAGES[id].hebrewName}</span>
                  <span className="mt-1 block text-xs font-bold text-[#8A5A25]">{PACKAGES[id].name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.feature}>
                <th
                  scope="row"
                  className="border border-[#E6D2AA] bg-[#FFFDF9] px-3 py-3 font-black text-[#35281F]"
                >
                  {row.feature}
                </th>
                {PACKAGE_IDS.map((id) => (
                  <td key={id} className="border border-[#E6D2AA] px-3 py-3 align-top">
                    <CellView cell={row.cells[id]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
