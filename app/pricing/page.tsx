"use client";

import { useEffect, useMemo, useState } from "react";
import { Frank_Ruhl_Libre } from "next/font/google";
import { Check, Users } from "lucide-react";
import GuestRecordSlider from "@/app/pricing/GuestRecordSlider";
import AnimatedPrice from "@/app/pricing/components/AnimatedPrice";
import InfoTooltip from "@/app/pricing/components/InfoTooltip";
import RevealOnScroll from "@/app/pricing/components/RevealOnScroll";
import {
  EventManageIcon,
  HumanDeskIcon,
  InvitationIcon,
  RecordedCallIcon,
  ReminderIcon,
  SeatingIcon,
  SmsIcon,
  WhatsAppBrandIcon,
  WhatsAppIcon,
} from "@/app/pricing/components/PricingIcons";
import ServiceLinks from "@/components/marketing/ServiceLinks";
import {
  ADDON_LABELS,
  ADDON_ORDER,
  CALL_PACKAGES,
  EMPTY_ADDONS,
  EXAMPLE_RECORD_COUNT,
  PACKAGES,
  addonPrice,
  applyRecordDraft,
  buildWhatsappUrl,
  calculateQuote,
  clampRecords,
  commitRecordDraft,
  formatIls,
  formatRate,
  type AddonKey,
  type PackageDefinition,
  type PackageId,
  type SelectedAddons,
} from "@/lib/pricing/packageQuote";
const display = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["500", "700"],
  display: "swap",
  variable: "--font-pricing-display",
});

const ADDON_META: Record<
  AddonKey,
  { Icon: typeof SeatingIcon; blurb: string; external?: boolean }
> = {
  credit: {
    Icon: InvitationIcon,
    blurb: "מתנות דרך ספק חיצוני — תשלום נפרד מול הספק.",
    external: true,
  },
  seating: {
    Icon: SeatingIcon,
    blurb: "מפת שולחנות ושיבוץ אורחים המחוברים לאישורי ההגעה.",
  },
  system: {
    Icon: EventManageIcon,
    blurb: "מערכת עצמאית למעקב וניהול האירוע מעבר לאישורים.",
  },
  design: {
    Icon: InvitationIcon,
    blurb: "עיצוב הזמנה בהתאמה אישית מעבר לתבניות הקיימות.",
  },
};

const PACKAGE_ICONS: Record<PackageId, typeof WhatsAppIcon> = {
  messages: WhatsAppIcon,
  voice: RecordedCallIcon,
  personal: HumanDeskIcon,
  hybrid: ReminderIcon,
};

const PACKAGE_AUDIENCE: Record<PackageId, string> = {
  messages: "למי שרוצה להתחיל פשוט, יפה ומסודר — בהודעות בלבד.",
  voice: "למי שמחפש מעקב רחב יותר עם שיחות מוקלטות בנוסף להודעות.",
  personal: "למי שצריך מוקד אנושי לטיפול במקרים מורכבים יותר.",
  hybrid: "למי שרוצה שילוב של שיחות מוקלטות וסבב אנושי אחד.",
};

const ctaClassName =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[22px] px-5 py-4 text-center text-base font-black leading-6 transition duration-200";

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-[#5A3E25]">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF4E2] text-[#A86F2B]">
            <Check size={13} aria-hidden="true" />
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PackageCard({
  pkg,
  records,
  addons,
  selected,
  priceFlash,
  onSelect,
}: {
  pkg: PackageDefinition;
  records: number;
  addons: SelectedAddons;
  selected: boolean;
  priceFlash: boolean;
  onSelect: () => void;
}) {
  const quote = calculateQuote({ packageId: pkg.id, records, addons });
  const Icon = PACKAGE_ICONS[pkg.id];
  const href = quote.canOrder ? buildWhatsappUrl(quote) : "";
  const selectedAddons = quote.addons.filter((addon) => addon.selected);
  const previewFeatures = pkg.features.slice(0, 6);
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      data-testid={`package-${pkg.id}`}
      className={`pricing-package-card relative flex min-w-0 flex-col rounded-[32px] border border-[#E5D3B8] bg-[#FFFDF9]/95 p-5 shadow-[0_22px_60px_rgba(91,64,35,0.1)] sm:p-6 ${
        selected ? "is-selected" : ""
      } ${priceFlash ? "is-price-flash" : ""}`}
    >
      {selected ? (
        <span className="absolute -top-3 left-5 rounded-full bg-[#3E2D20] px-3 py-1 text-[11px] font-black text-[#F7E9D3]">
          נבחר
        </span>
      ) : null}

      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E5D1B7] bg-[#FFF8EE] text-[#A86F2B]">
          <Icon size={22} />
        </span>
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-[#FFF4E2] px-3 py-1 text-[11px] font-black text-[#9A672B]">
            {pkg.badge}
          </span>
          <h3 className="mt-2 text-2xl font-black leading-tight text-[#8A4E19] sm:text-[1.7rem]">
            {pkg.name}
          </h3>
          <p className="mt-1 text-sm font-bold text-[#A07C52]">{pkg.hebrewName}</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#7B6754] sm:leading-7">{pkg.description}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-[#8A5A25]">{PACKAGE_AUDIENCE[pkg.id]}</p>

      <div className="mt-5 rounded-[24px] border border-[#E8D9C7] bg-white/80 px-4 py-4 text-center">
        <p className="text-xs font-bold text-[#9C866D]">מחיר לרשומה</p>
        <AnimatedPrice
          data-testid={`package-rate-${pkg.id}`}
          value={formatRate(quote.rate)}
          className="mt-1 text-3xl font-black text-[#3E2D20]"
        />
        <div className="mx-auto my-3 h-px w-16 bg-[#E8D9C7]" />
        <p className="text-xs font-bold text-[#9C866D]">מחיר החבילה</p>
        <AnimatedPrice
          data-testid={`package-service-${pkg.id}`}
          value={formatIls(quote.servicePrice)}
          className="mt-1 text-2xl font-black leading-none text-[#3E2D20]"
        />
        {selectedAddons.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs font-bold leading-5 text-[#7B6754]">
            {selectedAddons.map((addon) => (
              <li key={addon.key} className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-right">{addon.label}</span>
                <span className="shrink-0 tabular-nums">{formatIls(addon.price)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mx-auto my-3 h-px w-16 bg-[#E8D9C7]" />
        <p className="text-xs font-bold text-[#9C866D]">סה״כ לתשלום</p>
        <AnimatedPrice
          data-testid={`package-total-${pkg.id}`}
          value={formatIls(quote.total)}
          className="mt-1 text-4xl font-black leading-none text-[#3E2D20]"
        />
        <p className="mt-2 text-xs text-[#9C866D]">
          ל־{quote.records.toLocaleString("he-IL")} רשומות
        </p>
      </div>

      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[18px] border px-4 text-sm font-black transition ${
          selected
            ? "border-[#C89545] bg-[#FFF3DF] text-[#8A4E19]"
            : "border-[#E5D3B8] bg-white text-[#5A3E25] hover:border-[#D7B98D]"
        }`}
      >
        {selected ? "החבילה מסומנת לסיכום" : "סמנו חבילה זו לסיכום"}
      </button>

      <OrderButton href={href} disabled={!quote.canOrder} packageId={pkg.id} />

      <div className="mt-6 border-t border-[#E9D9C4] pt-5">
        <p className="mb-3 text-sm font-black text-[#3E2D20]">כלול בחבילה</p>
        <FeatureList items={expanded ? pkg.features : previewFeatures} />
        {pkg.features.length > previewFeatures.length ? (
          <button
            type="button"
            className="mt-3 text-sm font-black text-[#8A4E19] underline-offset-4 hover:underline"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? "הסתר פירוט" : "כל השירותים בחבילה"}
          </button>
        ) : null}
        {pkg.id === "messages" ? (
          <p className="mt-3 text-xs leading-5 text-[#9C866D]">
            שיחות מוקלטות או אנושיות אינן כלולות — זמינות בחבילות השיחה או בייעוץ.
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function PricingPage() {
  const [records, setRecords] = useState(EXAMPLE_RECORD_COUNT);
  const [recordText, setRecordText] = useState(String(EXAMPLE_RECORD_COUNT));
  const [calculatorInView, setCalculatorInView] = useState(true);
  const [addons, setAddons] = useState<SelectedAddons>(EMPTY_ADDONS);
  const [selectedPackage, setSelectedPackage] = useState<PackageId | null>(null);
  const [priceFlash, setPriceFlash] = useState(false);

  const packages = useMemo(
    () => [PACKAGES.messages, ...CALL_PACKAGES.map((id) => PACKAGES[id])],
    []
  );

  const selectedQuote = selectedPackage
    ? calculateQuote({ packageId: selectedPackage, records, addons })
    : null;

  function setRecordCount(next: number) {
    const safe = clampRecords(next);
    setRecords(safe);
    setRecordText(String(safe));
  }

  function onRecordTextChange(raw: string) {
    const draft = applyRecordDraft(raw);
    setRecordText(draft.text);
    if (draft.records !== null) setRecords(draft.records);
  }

  function onRecordBlur() {
    const committed = commitRecordDraft(recordText);
    setRecords(committed);
    setRecordText(String(committed));
  }

  function toggleAddon(key: AddonKey) {
    setAddons((current) => ({ ...current, [key]: !current[key] }));
  }

  function flashPrices() {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    setPriceFlash(true);
    window.setTimeout(() => setPriceFlash(false), 420);
  }

  useEffect(() => {
    const node = document.getElementById("pricing-calculator");
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCalculatorInView(entry.isIntersecting),
      { rootMargin: "0px 0px -72px 0px", threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <main
      dir="rtl"
      className={`pricing-page relative min-h-screen overflow-x-clip bg-[#F7EFE6] text-[#3E2D20] md:pb-0 ${display.variable} ${calculatorInView ? "pb-6" : "pb-24"}`}
    >
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_top,#fffaf4_0%,#f7efe6_42%,#efe2d2_100%)]" />
      <div className="pointer-events-none absolute -top-24 right-[7%] -z-20 h-72 w-72 rounded-full bg-[#DAB273]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[8%] left-[5%] -z-20 h-80 w-80 rounded-full bg-[#CDA37D]/16 blur-3xl" />

      <section className="relative z-10 px-4 pb-1 pt-5 sm:px-8 sm:pt-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black tracking-[0.14em] text-[#8A6338]">Invistimo</p>
          <h1
            data-testid="pricing-title"
            className={`${display.className} mt-2 text-balance text-[1.85rem] font-bold leading-[1.25] text-[#3E2D20] sm:text-4xl sm:leading-tight`}
          >
            חבילות ומחירים
          </h1>
          <p className="mt-2 text-base font-bold leading-7 text-[#8A4E19] sm:text-lg sm:leading-8">
            בחרו את כמות הרשומות וגלו את החבילה המתאימה לאירוע שלכם.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-[#7B6754] sm:text-base sm:leading-8">
            המחיר משתנה לפי מספר הרשומות, סוג החבילה והתוספות, ומוצג כאן לפני הפנייה. בוחרים
            חבילה, פונים לצוות ב־WhatsApp או ביצירת קשר, ומשלימים את ההזמנה מול נציג.
          </p>
        </div>
      </section>

      <div
        id="pricing-calculator"
        className="relative z-10 mx-auto flex w-full max-w-6xl scroll-mt-24 flex-col gap-4 px-4 pb-8 pt-2 sm:gap-5 sm:px-8 sm:pt-3"
      >
        <RevealOnScroll>
          <section className="rounded-[28px] border border-[#D9C0A0] bg-[#FFFDF9]/92 p-4 shadow-[0_18px_44px_rgba(91,64,35,0.1)] sm:p-5">
            <div className="mb-1 flex flex-wrap items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C89545] text-sm font-black text-white">
                1
              </span>
              <h2 className={`${display.className} text-lg font-bold leading-snug text-[#3E2D20] sm:text-2xl`}>
                כמה רשומות מוזמנים יש לכם?
              </h2>
            </div>
            <p className="mb-3 mr-0 text-sm leading-6 text-[#7B6754] sm:mr-10">
              מספר הרשומות אינו בהכרח מספר האורחים.{" "}
              <span className="inline-flex items-center gap-1 font-bold text-[#8A5A25]">
                רשומה
                <InfoTooltip label="רשומה">
                  שורת שליחה ברשימת המוזמנים. רשומה אחת יכולה לכסות אורח יחיד, זוג או משפחה — לפי
                  אופן ניהול ההזמנה וכללי החבילה הפעילים.
                </InfoTooltip>
              </span>{" "}
              היא יחידת הקשר להזמנה ולשליחה.
            </p>

            <GuestRecordSlider
              value={records}
              onChange={setRecordCount}
              onDragEnd={flashPrices}
            />

            <label className="mx-auto mt-3 block max-w-[14rem]">
              <span className="mb-1.5 flex items-center justify-center gap-2 text-xs font-black text-[#5A3E25]">
                <Users size={14} className="text-[#B88945]" aria-hidden="true" />
                הזנת מספר מדויק
                <InfoTooltip label="סבב אישורי הגעה">
                  סבב הוא פנייה מסודרת לרשימה — למשל סבב וואטסאפ או סבב שיחות — לפי מה שכלול בחבילה.
                </InfoTooltip>
              </span>
              <input
                data-testid="record-input"
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="done"
                aria-label="מספר רשומות מוזמנים"
                value={recordText}
                onChange={(event) => onRecordTextChange(event.target.value)}
                onBlur={onRecordBlur}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                dir="ltr"
                className="w-full rounded-[16px] border border-[#DDCBB3] bg-white px-3 py-2.5 text-center text-xl font-black tabular-nums text-[#3E2D20] outline-none transition focus:border-[#C9A46A] focus:ring-4 focus:ring-[#D8B16A]/15"
              />
            </label>
          </section>
        </RevealOnScroll>

        <RevealOnScroll>
          <section className="rounded-[32px] border border-[#D9C0A0] bg-[#FFFDF9]/92 p-5 shadow-[0_22px_55px_rgba(91,64,35,0.1)] sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C89545] text-sm font-black text-white">
                2
              </span>
              <h2 className="text-xl font-black leading-snug text-[#3E2D20] sm:text-2xl">
                בחרו חבילה
              </h2>
            </div>
            <p className="mb-4 text-sm leading-6 text-[#7B6754]">
              „אני רוצה את החבילה” פותח WhatsApp עם שם החבילה ומספר הרשומות שנבחר. ההזמנה מושלמת
              מול נציג.
            </p>
            {records <= 0 ? (
              <p className="mb-4 text-sm leading-6 text-[#9C866D]">
                בחרו לפחות רשומה אחת כדי לשלוח בקשה.
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  records={records}
                  addons={addons}
                  selected={selectedPackage === pkg.id}
                  priceFlash={priceFlash}
                  onSelect={() => setSelectedPackage(pkg.id)}
                />
              ))}
            </div>

            {selectedQuote ? (
              <div
                data-testid="selection-summary"
                className="mt-6 rounded-[24px] border border-[#D4B06E] bg-gradient-to-l from-[#FFF8EA] via-[#FFFDF9] to-[#F7E8CA] p-5"
              >
                <p className="text-sm font-black text-[#8A4E19]">סיכום הבחירה</p>
                <p className="mt-2 text-base leading-7 text-[#5A3E25]">
                  {selectedQuote.packageName} · {selectedQuote.records.toLocaleString("he-IL")}{" "}
                  רשומות · סה״כ{" "}
                  <span className="font-black tabular-nums">{formatIls(selectedQuote.total)}</span>
                </p>
                {selectedQuote.canOrder ? (
                  <a
                    href={buildWhatsappUrl(selectedQuote)}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-package-id={selectedQuote.packageId}
                    data-placement="package_summary"
                    className="pricing-gold-cta mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] px-6 py-3 text-sm font-black text-white"
                  >
                    <WhatsAppBrandIcon />
                    אני רוצה את החבילה
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-[#9C866D]">
                בחרו כרטיס חבילה כדי לראות סיכום בחירה מרוכז. המחירים בכל הכרטיסים מתעדכנים בזמן אמת.
              </p>
            )}
          </section>
        </RevealOnScroll>

        <RevealOnScroll>
          <section className="rounded-[32px] border border-[#D9C0A0] bg-[#FFFDF9]/92 p-5 shadow-[0_22px_55px_rgba(91,64,35,0.1)] sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C89545] text-sm font-black text-white">
                  3
                </span>
                <h2 className="text-xl font-black leading-snug text-[#3E2D20] sm:text-2xl">
                  תוספות אפשריות
                </h2>
              </div>
              <span className="shrink-0 rounded-full bg-[#FFF4E2] px-3 py-1 text-xs font-bold text-[#A86F2B]">
                לפי בחירה
              </span>
            </div>

            <p className="mb-4 flex flex-wrap items-center gap-2 text-sm leading-6 text-[#7B6754]">
              שירותי LIVE ואתגרים ביום האירוע הם מוצרים נפרדים ולא מסומנים כאן אוטומטית.
              <InfoTooltip label="שירות LIVE">
                LIVE / Wedding Challenges נמכרים בנפרד מחבילות אישורי ההגעה. אפשר לברר בעמוד יצירת
                הקשר או באזור השירותים הנוספים למטה.
              </InfoTooltip>
            </p>

            <div className="space-y-3">
              {ADDON_ORDER.map((key) => {
                const selected = addons[key];
                const { Icon, blurb, external } = ADDON_META[key];
                const messagesPrice = addonPrice("messages", key);
                const callsPrice = addonPrice("voice", key);

                return (
                  <button
                    key={key}
                    type="button"
                    data-testid={`addon-${key}`}
                    aria-pressed={selected}
                    onClick={() => {
                      toggleAddon(key);
                      flashPrices();
                    }}
                    className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-right transition ${
                      selected
                        ? "border-[#C89545] bg-[#FFF3DF] shadow-[0_12px_26px_rgba(168,111,43,0.12)]"
                        : "border-[#E8D9C7] bg-white/70 hover:border-[#D7B98D] hover:bg-[#FFF8EE]"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                          selected
                            ? "border-[#C89545] bg-[#C89545] text-white"
                            : "border-[#E5D1B7] bg-[#FFFDF9] text-[#A86F2B]"
                        }`}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-5 text-[#5A3E25]">
                          {ADDON_LABELS[key]}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[#7B6754]">{blurb}</span>
                        {external ? (
                          <span className="mt-1 block text-[11px] font-bold text-[#9C866D]">
                            ספק חיצוני
                          </span>
                        ) : null}
                        <span className="mt-1 block text-xs font-black leading-5 text-[#8A5A25] [overflow-wrap:anywhere]">
                          {messagesPrice === callsPrice
                            ? `+ ₪${messagesPrice}`
                            : `הודעות ₪${messagesPrice} · שיחות ₪${callsPrice}`}
                        </span>
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                        selected ? "bg-[#C89545] text-white" : "bg-[#F7E9D3] text-[#8A5A25]"
                      }`}
                    >
                      {selected ? "נוסף" : "להוסיף"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </RevealOnScroll>
      </div>

      <div className="px-4 pb-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 text-sm text-[#7B6754]">
          <span className="inline-flex items-center gap-2">
            <SmsIcon size={16} className="text-[#A86F2B]" /> SMS ותזכורות
          </span>
          <span className="inline-flex items-center gap-2">
            <RecordedCallIcon size={16} className="text-[#A86F2B]" /> שיחה מוקלטת
            <InfoTooltip label="שיחה מוקלטת">
              מענה טלפוני מובנה לפי האפשרויות שהוגדרו בחבילה — לא שיחה עם נציג אנושי.
            </InfoTooltip>
          </span>
          <span className="inline-flex items-center gap-2">
            <SeatingIcon size={16} className="text-[#A86F2B]" /> הושבה כתוספת
          </span>
        </div>
      </div>

      <ServiceLinks current="/pricing" />

      {calculatorInView ? null : (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5D3B8] bg-[#FFFDF9]/95 p-3 backdrop-blur md:hidden">
          <a
            href="#pricing-calculator"
            className="pricing-gold-cta flex min-h-12 w-full items-center justify-center rounded-[18px] text-sm font-black text-white"
          >
            חזרה למחשבון
          </a>
        </div>
      )}
    </main>
  );
}

function OrderButton({
  href,
  disabled,
  packageId,
}: {
  href: string;
  disabled: boolean;
  packageId: PackageId;
}) {
  if (!disabled && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="whatsapp-cta"
        data-package-id={packageId}
        data-placement="package_card"
        className={`${ctaClassName} pricing-gold-cta mt-5 text-white`}
      >
        <WhatsAppBrandIcon />
        אני רוצה את החבילה
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled
      data-testid="whatsapp-cta"
      className={`${ctaClassName} mt-5 cursor-not-allowed bg-[#E7D8C4] text-[#8C7763]`}
    >
      <WhatsAppBrandIcon />
      אני רוצה את החבילה
    </button>
  );
}
