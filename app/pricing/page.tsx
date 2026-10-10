"use client";

import { useMemo, useState } from "react";
import {
  Armchair,
  AudioLines,
  Check,
  Crown,
  Gift,
  Headset,
  MessageCircle,
  MonitorCog,
  Palette,
  Phone,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import GuestRecordSlider from "@/app/pricing/GuestRecordSlider";
import {
  ADDON_LABELS,
  ADDON_ORDER,
  CALL_PACKAGES,
  EMPTY_ADDONS,
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
  type ServiceMode,
} from "@/lib/pricing/packageQuote";

const ADDON_ICONS: Record<AddonKey, LucideIcon> = {
  credit: Gift,
  seating: Armchair,
  system: MonitorCog,
  design: Palette,
};

const PACKAGE_ICONS: Record<PackageId, LucideIcon> = {
  messages: MessageCircle,
  voice: AudioLines,
  personal: Headset,
  hybrid: Sparkles,
};

const ctaClassName =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[22px] px-5 py-4 text-center text-base font-black leading-6 transition duration-200";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 fill-current">
      <path d="M20.5 3.5A11 11 0 0 0 2.1 16.8L1 23l6.4-1.1A11 11 0 0 0 12 23a11 11 0 0 0 8.5-19.5ZM12 21a9 9 0 0 1-4.6-1.3l-.3-.2-3.8.6.6-3.7-.2-.3A9 9 0 1 1 12 21Zm5-6.7c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.2-.3a.5.5 0 0 0 0-.5c0-.1-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.8 11.8 0 0 0 4.5 4 15 15 0 0 0 1.5.6 3.6 3.6 0 0 0 1.7.1 2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3Z" />
    </svg>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-[#5A3E25]">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF4E2] text-[#A86F2B]">
            <Check size={13} />
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
  selected,
  onSelect,
}: {
  pkg: PackageDefinition;
  records: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const quote = calculateQuote({ packageId: pkg.id, records, addons: EMPTY_ADDONS });
  const Icon = PACKAGE_ICONS[pkg.id];

  return (
    <article
      data-testid={`package-${pkg.id}`}
      className={`relative flex min-w-0 flex-col rounded-[32px] border bg-[#FFFDF9]/95 p-5 shadow-[0_22px_60px_rgba(91,64,35,0.1)] transition duration-300 sm:p-6 ${
        selected
          ? "border-[#C89545] ring-4 ring-[#D8B16A]/20"
          : "border-[#E5D3B8] hover:border-[#D7B98D]"
      }`}
    >
      {selected ? (
        <span className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#C89545] text-white shadow">
          <Check size={16} />
        </span>
      ) : null}

      <div className="flex items-start gap-3 pl-10">
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

      <div className="mt-5 rounded-[24px] border border-[#E8D9C7] bg-white/80 px-4 py-4 text-center">
        <p className="text-xs font-bold text-[#9C866D]">מחיר לרשומה</p>
        <p
          data-testid={`package-rate-${pkg.id}`}
          className="mt-1 text-3xl font-black tabular-nums text-[#3E2D20]"
        >
          {formatRate(quote.rate)}
        </p>
        <div className="mx-auto my-3 h-px w-16 bg-[#E8D9C7]" />
        <p className="text-xs font-bold text-[#9C866D]">מחיר החבילה</p>
        <p
          data-testid={`package-total-${pkg.id}`}
          className="mt-1 text-4xl font-black tabular-nums leading-none text-[#3E2D20]"
        >
          {formatIls(quote.servicePrice)}
        </p>
        <p className="mt-2 text-xs text-[#9C866D]">ל־{quote.records.toLocaleString("he-IL")} רשומות</p>
      </div>

      <button
        type="button"
        data-testid={`select-${pkg.id}`}
        aria-pressed={selected}
        onClick={onSelect}
        className={`${ctaClassName} mt-5 ${
          selected
            ? "bg-[#3E2D20] text-white"
            : "bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F] text-white shadow-[0_14px_28px_rgba(168,111,43,0.22)] hover:-translate-y-0.5"
        }`}
      >
        {selected ? "החבילה נבחרה" : "בחירת החבילה"}
      </button>

      <div className="mt-6 border-t border-[#E9D9C4] pt-5">
        <p className="mb-3 text-sm font-black text-[#3E2D20]">כלול בחבילה</p>
        <FeatureList items={pkg.features} />
      </div>
    </article>
  );
}

export default function PricingPage() {
  const [records, setRecords] = useState(200);
  const [recordText, setRecordText] = useState("200");
  const [service, setService] = useState<ServiceMode | null>(null);
  const [callPackage, setCallPackage] = useState<PackageId | null>(null);
  const [addons, setAddons] = useState<SelectedAddons>(EMPTY_ADDONS);

  const packageId: PackageId | null =
    service === "messages" ? "messages" : service === "calls" ? callPackage : null;

  const quote = useMemo(
    () => (packageId ? calculateQuote({ packageId, records, addons }) : null),
    [packageId, records, addons]
  );

  const visiblePackages =
    service === "messages"
      ? [PACKAGES.messages]
      : service === "calls"
        ? CALL_PACKAGES.map((id) => PACKAGES[id])
        : [];

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

  function chooseService(next: ServiceMode) {
    setService(next);
    if (next === "calls" && callPackage === "messages") setCallPackage(null);
  }

  function toggleAddon(key: AddonKey) {
    setAddons((current) => ({ ...current, [key]: !current[key] }));
  }

  const orderHint = !packageId
    ? "בחרו חבילה כדי לשלוח בקשה"
    : records <= 0
      ? "בחרו לפחות רשומה אחת כדי לשלוח בקשה"
      : "";

  const whatsappUrl = quote?.canOrder ? buildWhatsappUrl(quote) : "";

  return (
    <main dir="rtl" className="relative min-h-screen overflow-x-clip bg-[#F7EFE6] text-[#3E2D20]">
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_top,#fffaf4_0%,#f7efe6_42%,#efe2d2_100%)]" />
      <div className="pointer-events-none absolute -top-24 right-[7%] -z-20 h-72 w-72 rounded-full bg-[#DAB273]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[8%] left-[5%] -z-20 h-80 w-80 rounded-full bg-[#CDA37D]/16 blur-3xl" />

      <section className="relative z-10 px-4 pb-6 pt-28 text-center sm:px-8 lg:pt-32">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#D8B98D] bg-[#FFF8EE] shadow-[0_10px_30px_rgba(186,140,76,0.13)]">
            <Crown className="text-[#B88945]" size={26} />
          </div>

          <p className="font-serif text-[34px] tracking-[0.22em] text-[#8A6338] sm:text-[46px]">
            INVISTIMO
          </p>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-l from-transparent via-[#C9A46A] to-transparent" />
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#A07C52]">Smart Event Packages</p>

          <h1
            data-testid="pricing-title"
            className="mx-auto mt-7 max-w-3xl text-balance px-1 text-[1.7rem] font-black leading-[1.35] text-[#3E2D20] min-[380px]:text-4xl sm:text-5xl sm:leading-tight lg:text-6xl"
          >
            בחרו את החבילה שמתאימה לאירוע שלכם
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#7B6754]">
            בונים את החבילה לפי כמות הרשומות, סוג אישורי ההגעה והתוספות. המחיר מתעדכן מיד, וההזמנה נשלחת אלינו בוואטסאפ.
          </p>
        </div>
      </section>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-20 sm:px-8">
        <section className="rounded-[32px] border border-[#D9C0A0] bg-[#FFFDF9]/92 p-5 shadow-[0_22px_55px_rgba(91,64,35,0.1)] sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C89545] text-sm font-black text-white">
              1
            </span>
            <h2 className="text-xl font-black leading-snug text-[#3E2D20] sm:text-2xl">
              כמה רשומות מוזמנים יש לכם?
            </h2>
          </div>

          <div className="text-center">
            <p
              data-testid="record-display"
              className="text-6xl font-black tabular-nums leading-none text-[#3E2D20] sm:text-7xl"
              aria-live="polite"
            >
              {records.toLocaleString("he-IL")}
            </p>
            <p className="mt-2 text-sm font-bold text-[#A07C52]">רשומות מוזמנים</p>
          </div>

          <label className="mx-auto mt-6 block max-w-xs">
            <span className="mb-2 flex items-center justify-center gap-2 text-sm font-black text-[#5A3E25]">
              <Users size={16} className="text-[#B88945]" />
              הזנת מספר
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
              className="w-full rounded-[20px] border border-[#DDCBB3] bg-white px-4 py-4 text-center text-2xl font-black tabular-nums text-[#3E2D20] outline-none transition focus:border-[#C9A46A] focus:ring-4 focus:ring-[#D8B16A]/15"
            />
          </label>
          <p className="mt-3 text-center text-xs leading-5 text-[#9C866D]">
            כל מספר שלם בין 0 ל־1,000. אפשר גם לגרור את האורח על הציר.
          </p>

          <div className="mt-6">
            <GuestRecordSlider value={records} onChange={setRecordCount} />
          </div>
        </section>

        <section className="rounded-[32px] border border-[#D9C0A0] bg-[#FFFDF9]/92 p-5 shadow-[0_22px_55px_rgba(91,64,35,0.1)] sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C89545] text-sm font-black text-white">
              2
            </span>
            <h2 className="text-xl font-black leading-snug text-[#3E2D20] sm:text-2xl">
              איך תרצו לנהל את אישורי ההגעה?
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="סוג השירות">
            <button
              type="button"
              role="radio"
              aria-checked={service === "messages"}
              data-testid="service-messages"
              onClick={() => chooseService("messages")}
              className={`flex min-w-0 items-center gap-3 rounded-[24px] border px-4 py-4 text-right transition ${
                service === "messages"
                  ? "border-[#C89545] bg-[#FFF3DF] shadow-[0_12px_26px_rgba(168,111,43,0.12)]"
                  : "border-[#E8D9C7] bg-white hover:border-[#D7B98D]"
              }`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF8EE] text-[#A86F2B]">
                <MessageCircle size={22} />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-black text-[#3E2D20]">הודעות בלבד</span>
                <span className="mt-1 block text-sm leading-6 text-[#7B6754]">
                  הזמנה דיגיטלית ושני סבבי הודעות
                </span>
              </span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={service === "calls"}
              data-testid="service-calls"
              onClick={() => chooseService("calls")}
              className={`flex min-w-0 items-center gap-3 rounded-[24px] border px-4 py-4 text-right transition ${
                service === "calls"
                  ? "border-[#C89545] bg-[#FFF3DF] shadow-[0_12px_26px_rgba(168,111,43,0.12)]"
                  : "border-[#E8D9C7] bg-white hover:border-[#D7B98D]"
              }`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF8EE] text-[#A86F2B]">
                <Phone size={22} />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-black text-[#3E2D20]">שיחות ואישורי הגעה</span>
                <span className="mt-1 block text-sm leading-6 text-[#7B6754]">
                  שיחות מוקלטות, אנושיות או שילוב ביניהן
                </span>
              </span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {service ? (
              <motion.div
                key={service}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="mt-6"
              >
                <div
                  className={
                    visiblePackages.length === 1
                      ? "mx-auto grid max-w-xl grid-cols-1"
                      : "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
                  }
                >
                  {visiblePackages.map((pkg) => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      records={records}
                      selected={packageId === pkg.id}
                      onSelect={() => {
                        if (pkg.id === "messages") {
                          setService("messages");
                          return;
                        }
                        setService("calls");
                        setCallPackage(pkg.id);
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <p className="mt-5 text-center text-sm leading-6 text-[#9C866D]">
                בחרו הודעות או שיחות כדי לראות את החבילות והמחיר.
              </p>
            )}
          </AnimatePresence>
        </section>

        <AnimatePresence>
          {packageId ? (
            <motion.section
              key="addons"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="rounded-[32px] border border-[#D9C0A0] bg-[#FFFDF9]/92 p-5 shadow-[0_22px_55px_rgba(91,64,35,0.1)] sm:p-8"
            >
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

              <div className="space-y-3">
                {ADDON_ORDER.map((key) => {
                  const selected = addons[key];
                  const price = addonPrice(packageId, key);
                  const Icon = ADDON_ICONS[key];

                  return (
                    <button
                      key={key}
                      type="button"
                      data-testid={`addon-${key}`}
                      aria-pressed={selected}
                      onClick={() => toggleAddon(key)}
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
                        <span className="text-sm font-semibold leading-5 text-[#5A3E25]">
                          {ADDON_LABELS[key]}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-[#F7E9D3] px-3 py-1 text-xs font-black text-[#8A5A25]">
                        + ₪{price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>

        <section
          data-testid="quote-summary"
          className="rounded-[32px] border border-[#C89545] bg-[#FFFDF9] p-5 shadow-[0_24px_60px_rgba(168,111,43,0.14)] sm:p-8"
        >
          <h2 className="text-2xl font-black text-[#3E2D20] sm:text-3xl">החבילה שלכם</h2>

          {quote ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
              <dl className="min-w-0 space-y-3 text-sm sm:text-base">
                <div className="flex items-start justify-between gap-4 border-b border-[#F0E2D0] pb-3">
                  <dt className="text-[#7B6754]">שם החבילה</dt>
                  <dd className="text-left font-black text-[#3E2D20]">{quote.packageName}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-[#F0E2D0] pb-3">
                  <dt className="text-[#7B6754]">כמות רשומות</dt>
                  <dd data-testid="summary-records" className="font-black tabular-nums text-[#3E2D20]">
                    {quote.records.toLocaleString("he-IL")}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-[#F0E2D0] pb-3">
                  <dt className="text-[#7B6754]">סוג השירות</dt>
                  <dd className="max-w-[14rem] text-left font-black leading-6 text-[#3E2D20] sm:max-w-none">
                    {quote.summaryService}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-[#F0E2D0] pb-3">
                  <dt className="text-[#7B6754]">מחיר לרשומה</dt>
                  <dd data-testid="summary-rate" className="font-black tabular-nums text-[#3E2D20]">
                    {formatRate(quote.rate)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-[#F0E2D0] pb-3">
                  <dt className="text-[#7B6754]">מחיר החבילה</dt>
                  <dd data-testid="summary-service-price" className="font-black tabular-nums text-[#3E2D20]">
                    {formatIls(quote.servicePrice)}
                  </dd>
                </div>
                {quote.addons.map((addon) => (
                  <div
                    key={addon.key}
                    className="flex items-start justify-between gap-4 border-b border-[#F0E2D0] pb-3 last:border-b-0 last:pb-0"
                  >
                    <dt className="min-w-0 text-[#7B6754]">{addon.label}</dt>
                    <dd
                      data-testid={`summary-addon-${addon.key}`}
                      className="shrink-0 font-black text-[#3E2D20]"
                    >
                      {addon.selected ? formatIls(addon.price) : "לא"}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="min-w-0 rounded-[28px] bg-[#FFF8EE] px-4 py-5 text-center">
                <p className="text-sm font-bold text-[#9C866D]">סה״כ לתשלום</p>
                <p
                  data-testid="summary-total"
                  className="mt-2 text-4xl font-black tabular-nums leading-none text-[#3E2D20] sm:text-5xl"
                >
                  {formatIls(quote.total)}
                </p>
                <OrderButton href={whatsappUrl} disabled={!quote.canOrder} />
                {orderHint ? <p className="mt-3 text-xs leading-5 text-[#9C866D]">{orderHint}</p> : null}
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-sm leading-7 text-[#7B6754]">
                בחרו כמות רשומות וחבילה, והסיכום יתעדכן כאן בזמן אמת.
              </p>
              <div className="mt-5 max-w-md">
                <OrderButton href="" disabled />
                <p className="mt-3 text-xs leading-5 text-[#9C866D]">{orderHint}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function OrderButton({ href, disabled }: { href: string; disabled: boolean }) {
  if (!disabled && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="whatsapp-cta"
        className={`${ctaClassName} mt-5 bg-gradient-to-l from-[#A86F2B] via-[#C68F46] to-[#D8A85F] text-white shadow-[0_16px_32px_rgba(168,111,43,0.24)] hover:-translate-y-0.5`}
      >
        <WhatsAppIcon />
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
      <WhatsAppIcon />
      אני רוצה את החבילה
    </button>
  );
}
