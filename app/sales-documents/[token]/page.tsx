"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { sanitizePaymentTermsForCustomer, sanitizeDetailSectionsForCustomer } from "@/lib/salesDocumentTerms";

type DetailSection = {
  title: string;
  items: string[];
};

type PaymentSchedule = {
  immediateTotal?: number;
  eventDayTotal?: number;
  preEventServicesTotal?: number;
  eventServicesTotal?: number;
  eventServicesDeposit?: number;
  eventServicesBalance?: number;
  stripeAmount?: number;
  fullPaymentDiscount?: number;
  grossAmountBeforeDiscount?: number;
  grossAmountAfterDiscount?: number;
};

type PriceDisplaySettings = {
  showUpsellPrices?: boolean;
  showIndividualUpsellPrices?: boolean;
  showAddonsPrices?: boolean;
  priceDisplayMode?: string;
  mode?: string;
};

type SalesDocument = {
  _id?: string;
  type?: "quote" | "agreement";
  token?: string;
  url?: string;
  status?: "draft" | "sent" | "viewed" | "signed" | "expired" | string;
  createdAt?: string;
  signedAt?: string;

  client?: {
    fullName?: string;
    idNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
  };

  event?: {
    name?: string;
    date?: string;
    city?: string;
    venueName?: string;
  };

  quote?: {
    createdAt?: string;
    expiresAt?: string;
    validityDays?: number;
  };

  agreement?: {
    signatureFullName?: string;
    signatureIdNumber?: string;
    signatureAddress?: string;
    signaturePhone?: string;
    signatureDate?: string;
    signatureText?: string;
    signatureDataUrl?: string;
    acceptedTerms?: boolean;
    signedAt?: string;
  };

  selectedPackage?: {
    key?: string;
    title?: string;
    customerSummary?: string;
    includes?: string[];
    records?: number;
    price?: number;
  };

  upsells?: {
    key?: string;
    title?: string;
    description?: string;
    customerDetails?: DetailSection[];
    price?: number;
    givenFree?: boolean;
    staffCount?: number | null;
    paymentType?: string;
  }[];

  totals?: {
    grossAmount?: number;
    grossAmountBeforeDiscount?: number;
    grossAmountAfterDiscount?: number;
    discountAmount?: number;
    fullPaymentDiscount?: number;
    netAmount?: number;
    vatRate?: number;
    paymentMode?: "full" | "split" | string;
    stripeAmount?: number;
    paymentSchedule?: PaymentSchedule;
  };

  pricingDisplay?: PriceDisplaySettings;
  quoteDisplay?: PriceDisplaySettings;
  priceDisplay?: PriceDisplaySettings;

  customerDealSummary?: {
    showUpsellPrices?: boolean;
    showIndividualUpsellPrices?: boolean;
    showAddonsPrices?: boolean;
    priceDisplayMode?: string;
    mode?: string;
    [key: string]: unknown;
  };

  cancellationTerms?: DetailSection[];
  paymentTerms?: DetailSection[];

  signature?: {
    fullName?: string;
    idNumber?: string;
    address?: string;
    phone?: string;
    date?: string;
    signatureText?: string;
    signatureDataUrl?: string;
    acceptedTerms?: boolean;
    signedAt?: string;
  };
};

type ApiResponse = {
  success?: boolean;
  document?: SalesDocument;
  error?: string;
  message?: string;
  expired?: boolean;
  canSign?: boolean;
  readOnly?: boolean;
  documentUrl?: string;
};

type SalesDocumentUpsell = NonNullable<SalesDocument["upsells"]>[number];

type SelectedService = {
  kind: "package" | "upsell";
  key?: string;
  title: string;
  description?: string;
  price?: number;
  givenFree?: boolean;
  details?: DetailSection[];
};

const CREDIT_GIFTS_TITLE = "מתנות באשראי באמצעות ספק חיצוני RSVP";

const CREDIT_GIFTS_INCLUDED_TEXT =
  "מתנות באשראי באמצעות ספק חיצוני RSVP, כחלק מהחבילה וללא תוספת תשלום.";

const CREDIT_GIFTS_DETAILS: DetailSection[] = [
  {
    title: CREDIT_GIFTS_TITLE,
    items: [
      "שירות מתנות באשראי מאפשר לאורחים להעביר מתנה באשראי באמצעות קישור ייעודי, שניתן לשלב בפרטי האירוע ובהודעות הנשלחות לאורחים.",
      "השירות מתבצע באמצעות ספק חיצוני בשם RSVP ואינו מופעל ישירות על ידי Invistimo.",
      "הפעלת השירות מותנית בהרשמה למערכת RSVP, מילוי הפרטים הנדרשים ואישור פתיחת משתמש על ידי הספק.",
      "אישור פתיחת המשתמש על ידי RSVP מתבצע עד 2 ימי עסקים ממועד השלמת ההרשמה, מילוי כלל הפרטים והעברת המסמכים הנדרשים, ככל שיידרשו.",
      "לאחר השלמת ההרשמה וקבלת הקישור מ־RSVP, יש להוסיף את הקישור בפרטי האירוע במערכת Invistimo ובשליחת ההודעות לאורחים.",
      "ללא הוספת הקישור בפרטי האירוע ו/או בהודעות הנשלחות לאורחים, השירות לא יוצג לאורחים ולא תהיה להם אפשרות לבצע מתנה באשראי דרך הקישור.",
      "בגין כל מתנה המשולמת באשראי נגבית עמלה בשיעור של 2.5% מסכום המתנה. העמלה משולמת על ידי האורח במעמד ביצוע התשלום.",
      "הכספים המתקבלים ממתנות באשראי מועברים לחשבון הבנק שהוגדר במערכת RSVP עד 5 ימי עסקים, בהתאם למדיניות הספק החיצוני.",
      "ניתן לבקש העברת זהב לצורך העברת כספים מהירה יותר, בעלות של 100 ₪, עד יום עסקים אחד, בכפוף לזמינות ולאישור הספק.",
      "Invistimo מאפשרת שילוב של קישור המתנות באשראי במערכת ובהודעות לאורחים. ניהול ההרשמה, אישור המשתמש, הסליקה, העמלות והעברת הכספים מתבצעים על ידי RSVP ובהתאם לתנאי השירות של הספק.",
    ],
  },
];

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hasCreditGiftsText(value: unknown) {
  return cleanStr(value).includes("מתנות באשראי");
}

function isCreditGiftsUpsell(upsell?: SalesDocumentUpsell) {
  const key = cleanStr(upsell?.key).toLowerCase();
  const title = cleanStr(upsell?.title);

  return (
    key === "creditgifts" ||
    key === "credit_gifts" ||
    key === "credit-gifts" ||
    hasCreditGiftsText(title)
  );
}

function getCreditGiftsPriceByPackage(packageKey?: string) {
  if (packageKey === "smart") return 100;
  if (packageKey === "easy") return 150;
  return 0;
}

function getCreditGiftsDescription(packageKey?: string) {
  if (packageKey === "seating") {
    return "מתנות באשראי באמצעות ספק חיצוני RSVP כלולות בחבילת מזמינים ומושיבים ללא תוספת תשלום.";
  }

  return "תוספת לקבלת מתנות באשראי באמצעות ספק חיצוני RSVP.";
}

function asNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return asNumber(value).toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string) {
  const str = cleanStr(value);

  if (!str) return "לא הוגדר";

  const parts = str.split("-").map((part) => Number(part));

  if (
    parts.length === 3 &&
    Number.isFinite(parts[0]) &&
    Number.isFinite(parts[1]) &&
    Number.isFinite(parts[2])
  ) {
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(
      "he-IL",
    );
  }

  const date = new Date(str);

  if (Number.isNaN(date.getTime())) {
    return str;
  }

  return date.toLocaleDateString("he-IL");
}

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getParamToken(params: ReturnType<typeof useParams>) {
  const value = params?.token;

  if (Array.isArray(value)) {
    return cleanStr(value[0]);
  }

  return cleanStr(value);
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "draft":
      return "טיוטה";
    case "sent":
      return "נשלח";
    case "viewed":
      return "נצפה";
    case "signed":
      return "נחתם";
    case "expired":
      return "פג תוקף";
    default:
      return status || "לא ידוע";
  }
}

function getDocumentTitle(type?: string) {
  if (type === "agreement") {
    return "הסכם ותנאי עסקה";
  }

  return "הצעת מחיר";
}

function getPaymentModeLabel(mode?: string) {
  if (mode === "full") return "תשלום מלא מראש";
  return "תשלום ראשוני ויתרה ביום האירוע";
}

function getBooleanOrUndefined(value: unknown) {
  if (typeof value === "boolean") return value;
  return undefined;
}

function getDisplayMode(document?: SalesDocument | null) {
  const modes = [
    cleanStr(document?.quoteDisplay?.priceDisplayMode),
    cleanStr(document?.quoteDisplay?.mode),
    cleanStr(document?.pricingDisplay?.priceDisplayMode),
    cleanStr(document?.pricingDisplay?.mode),
    cleanStr(document?.priceDisplay?.priceDisplayMode),
    cleanStr(document?.priceDisplay?.mode),
    cleanStr(document?.customerDealSummary?.priceDisplayMode),
    cleanStr(document?.customerDealSummary?.mode),
  ].filter(Boolean);

  return modes[0] || "";
}

function shouldShowUpsellPrices(document?: SalesDocument | null) {
  const mode = getDisplayMode(document);

  if (
    [
      "totalOnly",
      "total_only",
      "packageOnly",
      "package_only",
      "summaryOnly",
      "summary_only",
      "hideUpsells",
      "hide_upsells",
      "packageTotalOnly",
      "package_total_only",
    ].includes(mode)
  ) {
    return false;
  }

  if (
    [
      "detailed",
      "details",
      "showUpsells",
      "show_upsells",
      "showAddons",
      "show_addons",
      "showUpsellPrices",
      "show_upsell_prices",
    ].includes(mode)
  ) {
    return true;
  }

  const values = [
    getBooleanOrUndefined(document?.quoteDisplay?.showUpsellPrices),
    getBooleanOrUndefined(document?.quoteDisplay?.showIndividualUpsellPrices),
    getBooleanOrUndefined(document?.quoteDisplay?.showAddonsPrices),
    getBooleanOrUndefined(document?.pricingDisplay?.showUpsellPrices),
    getBooleanOrUndefined(document?.pricingDisplay?.showIndividualUpsellPrices),
    getBooleanOrUndefined(document?.pricingDisplay?.showAddonsPrices),
    getBooleanOrUndefined(document?.priceDisplay?.showUpsellPrices),
    getBooleanOrUndefined(document?.priceDisplay?.showIndividualUpsellPrices),
    getBooleanOrUndefined(document?.priceDisplay?.showAddonsPrices),
    getBooleanOrUndefined(document?.customerDealSummary?.showUpsellPrices),
    getBooleanOrUndefined(
      document?.customerDealSummary?.showIndividualUpsellPrices,
    ),
    getBooleanOrUndefined(document?.customerDealSummary?.showAddonsPrices),
  ];

  const explicit = values.find((value) => typeof value === "boolean");

  if (typeof explicit === "boolean") return explicit;

  return true;
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-black text-[#3f3327]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyLine({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d8c5aa] bg-[#fffaf3] px-4 py-3 text-sm font-bold text-[#8a765f]">
      {label}
    </div>
  );
}

function DetailSections({ sections }: { sections?: DetailSection[] }) {
  if (!sections || sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div
          key={section.title}
          className="rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-4"
        >
          <h3 className="text-base font-black text-[#3f3327]">
            {section.title}
          </h3>

          <ul className="mt-3 space-y-2">
            {(section.items || []).map((item) => (
              <li
                key={item}
                className="flex gap-2 text-sm font-semibold leading-7 text-[#5d4c3b]"
              >
                <span className="mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff3df] text-[#b47a3b]">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] px-4 py-3">
      <p className="text-xs font-black text-[#9b805f]">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-[#3f3327]">
        {value || "לא הוגדר"}
      </p>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#3f3327]">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>

      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-bold text-[#3f3327] outline-none transition placeholder:text-[#b6a38d] focus:border-[#c9944a] focus:ring-4 focus:ring-[#c9944a]/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

function SignatureCanvas({
  onChange,
  disabled,
  initialValue,
}: {
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
  initialValue?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(!initialValue);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || 600;
    const height = 190;
    const ratio = window.devicePixelRatio || 1;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#3f3327";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    if (initialValue?.startsWith("data:image/")) {
      const image = new Image();
      image.onload = () => {
        ctx.drawImage(image, 0, 0, width, height);
        setIsEmpty(false);
      };
      image.src = initialValue;
    }
  }, [initialValue]);

  useEffect(() => {
    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [resizeCanvas]);

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);

    const point = getPoint(event);

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled || !drawingRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    const point = getPoint(event);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    setIsEmpty(false);
  }

  function stopDrawing() {
    if (disabled || !drawingRef.current) return;

    drawingRef.current = false;

    const canvas = canvasRef.current;

    if (!canvas) return;

    onChange(canvas.toDataURL("image/png"));
  }

  function clearCanvas() {
    const canvas = canvasRef.current;

    if (!canvas || disabled) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    setIsEmpty(true);
    onChange("");
  }

  return (
    <div>
      <div className="overflow-hidden rounded-3xl border border-[#eadfce] bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          className={`block touch-none ${
            disabled ? "cursor-not-allowed opacity-70" : "cursor-crosshair"
          }`}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-[#8a765f]">
          {isEmpty ? "חתמי עם העכבר / האצבע בתוך המסגרת" : "חתימה נקלטה"}
        </p>

        {!disabled ? (
          <button
            type="button"
            onClick={clearCanvas}
            className="rounded-full border border-[#eadfce] bg-white px-4 py-2 text-xs font-black text-[#7b6145] transition hover:bg-[#fff7ec]"
          >
            נקה חתימה
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function SalesDocumentPage() {
  const params = useParams();
  const token = useMemo(() => getParamToken(params), [params]);

  const [document, setDocument] = useState<SalesDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expired, setExpired] = useState(false);
  const [canSign, setCanSign] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  const [signatureFullName, setSignatureFullName] = useState("");
  const [signatureIdNumber, setSignatureIdNumber] = useState("");
  const [signatureAddress, setSignatureAddress] = useState("");
  const [signaturePhone, setSignaturePhone] = useState("");
  const [signatureDate, setSignatureDate] = useState(todayInputValue);
  const [signatureText, setSignatureText] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [signSuccess, setSignSuccess] = useState("");

  const isAgreement = document?.type === "agreement";
  const isQuote = document?.type === "quote";
  const isSigned = document?.status === "signed";

  const paymentSchedule = document?.totals?.paymentSchedule || {};
  const paymentMode = cleanStr(document?.totals?.paymentMode) || "split";
  const showUpsellPrices = shouldShowUpsellPrices(document);

  const grossAmount =
    asNumber(document?.totals?.grossAmountAfterDiscount) ||
    asNumber(document?.totals?.grossAmount) ||
    asNumber(paymentSchedule.grossAmountAfterDiscount);

  const grossBeforeDiscount =
    asNumber(document?.totals?.grossAmountBeforeDiscount) ||
    asNumber(paymentSchedule.grossAmountBeforeDiscount);

  const discountAmount =
    asNumber(document?.totals?.discountAmount) ||
    asNumber(document?.totals?.fullPaymentDiscount) ||
    asNumber(paymentSchedule.fullPaymentDiscount);

  const amountToPayNow =
    asNumber(document?.totals?.stripeAmount) ||
    asNumber(paymentSchedule.stripeAmount) ||
    asNumber(paymentSchedule.immediateTotal);

  const customerPaymentTerms = useMemo(
    () => sanitizePaymentTermsForCustomer(document?.paymentTerms),
    [document?.paymentTerms],
  );

  const customerCancellationTerms = useMemo(
    () => sanitizeDetailSectionsForCustomer(document?.cancellationTerms),
    [document?.cancellationTerms],
  );

  const loadDocument = useCallback(async () => {
    if (!token) {
      setLoadError("קישור לא תקין");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError("");

      const response = await fetch(`/api/sales-documents/${token}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: ApiResponse = await response.json().catch(() => ({}));

      if (!response.ok || !data.success || !data.document) {
        throw new Error(data.error || data.message || "שגיאה בטעינת המסמך");
      }

      setDocument(data.document);
      setExpired(Boolean(data.expired));
      setCanSign(Boolean(data.canSign));
      setReadOnly(Boolean(data.readOnly));

      setSignatureFullName(
        cleanStr(data.document.signature?.fullName) ||
          cleanStr(data.document.agreement?.signatureFullName) ||
          cleanStr(data.document.client?.fullName),
      );

      setSignatureIdNumber(
        cleanStr(data.document.signature?.idNumber) ||
          cleanStr(data.document.agreement?.signatureIdNumber) ||
          cleanStr(data.document.client?.idNumber),
      );

      setSignatureAddress(
        cleanStr(data.document.signature?.address) ||
          cleanStr(data.document.agreement?.signatureAddress) ||
          cleanStr(data.document.client?.address),
      );

      setSignaturePhone(
        cleanStr(data.document.signature?.phone) ||
          cleanStr(data.document.agreement?.signaturePhone) ||
          cleanStr(data.document.client?.phone),
      );

      setSignatureDate(
        cleanStr(data.document.signature?.date) ||
          cleanStr(data.document.agreement?.signatureDate) ||
          todayInputValue(),
      );

      setSignatureText(
        cleanStr(data.document.signature?.signatureText) ||
          cleanStr(data.document.agreement?.signatureText),
      );

      setSignatureDataUrl(
        cleanStr(data.document.signature?.signatureDataUrl) ||
          cleanStr(data.document.agreement?.signatureDataUrl),
      );

      setAcceptedTerms(
        Boolean(data.document.signature?.acceptedTerms) ||
          Boolean(data.document.agreement?.acceptedTerms),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "שגיאה בטעינת המסמך",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const selectedServices = useMemo<SelectedService[]>(() => {
    const services: SelectedService[] = [];
    const packageKey = cleanStr(document?.selectedPackage?.key);

    if (document?.selectedPackage?.title) {
      const originalIncludes = document.selectedPackage.includes || [];
      const packageIncludes =
        packageKey === "seating" &&
        !originalIncludes.some((item) => hasCreditGiftsText(item))
          ? [...originalIncludes, CREDIT_GIFTS_INCLUDED_TEXT]
          : originalIncludes;

      const packageDescription =
        packageKey === "seating" &&
        !hasCreditGiftsText(document.selectedPackage.customerSummary)
          ? `${document.selectedPackage.customerSummary || ""} ${getCreditGiftsDescription(packageKey)}`.trim()
          : document.selectedPackage.customerSummary;

      const packageDetails: DetailSection[] = [
        {
          title: "מה כלול בחבילה",
          items: packageIncludes,
        },
      ];

      if (packageKey === "seating") {
        const hasCreditGiftsDetails = packageDetails.some((section) =>
          hasCreditGiftsText(section.title) ||
          (section.items || []).some((item) => hasCreditGiftsText(item)),
        );

        if (!hasCreditGiftsDetails) {
          packageDetails.push(...CREDIT_GIFTS_DETAILS);
        }
      }

      services.push({
        kind: "package",
        key: packageKey,
        title: document.selectedPackage.title,
        description: packageDescription,
        price: document.selectedPackage.price,
        details: packageDetails,
      });
    }

    const hasCreditGiftsService = (document?.upsells || []).some((upsell) =>
      isCreditGiftsUpsell(upsell),
    );

    (document?.upsells || []).forEach((upsell) => {
      const isCreditGifts = isCreditGiftsUpsell(upsell);
      const upsellDetails = upsell.customerDetails || [];
      services.push({
        kind: "upsell",
        key: isCreditGifts ? "creditGifts" : cleanStr(upsell.key),
        title: isCreditGifts ? CREDIT_GIFTS_TITLE : upsell.title || "תוספת שירות",
        description: isCreditGifts
          ? upsell.description || getCreditGiftsDescription(packageKey)
          : upsell.description,
        price:
          isCreditGifts &&
          (typeof upsell.price !== "number" || !Number.isFinite(upsell.price))
            ? getCreditGiftsPriceByPackage(packageKey)
            : upsell.price,
        givenFree: Boolean(upsell.givenFree),
        details: isCreditGifts ? CREDIT_GIFTS_DETAILS : upsellDetails,
      });
    });

    if (packageKey === "seating" && !hasCreditGiftsService) {
      services.push({
        kind: "upsell",
        key: "creditGifts",
        title: CREDIT_GIFTS_TITLE,
        description: getCreditGiftsDescription(packageKey),
        price: 0,
        givenFree: false,
        details: CREDIT_GIFTS_DETAILS,
      });
    }

    return services;
  }, [document]);

  const submitDisabled =
    signing ||
    !canSign ||
    readOnly ||
    isSigned ||
    expired ||
    !signatureFullName.trim() ||
    !signatureIdNumber.trim() ||
    !signatureAddress.trim() ||
    !signaturePhone.trim() ||
    !signatureDate.trim() ||
    (!signatureText.trim() && !signatureDataUrl.trim()) ||
    !acceptedTerms;

  async function handleSign() {
    if (submitDisabled || !token) return;

    try {
      setSigning(true);
      setSignError("");
      setSignSuccess("");

      const response = await fetch(`/api/sales-documents/${token}/sign`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: signatureFullName.trim(),
          idNumber: signatureIdNumber.trim(),
          address: signatureAddress.trim(),
          phone: signaturePhone.trim(),
          date: signatureDate,
          signatureText: signatureText.trim(),
          signatureDataUrl,
          acceptedTerms,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "שגיאה בשמירת החתימה");
      }

      setDocument(data.document);
      setCanSign(false);
      setReadOnly(true);
      setSignSuccess("ההסכם נחתם ונשמר בהצלחה");

      if (typeof window !== "undefined") {
        const nextPath = new URLSearchParams(window.location.search).get("next");

        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            {
              type: "invistimo-agreement-signed",
              token,
            },
            window.location.origin,
          );
        } else if (nextPath && nextPath.startsWith("/set-password")) {
          window.location.assign(nextPath);
        }
      }
    } catch (error) {
      setSignError(
        error instanceof Error ? error.message : "שגיאה בשמירת החתימה",
      );
    } finally {
      setSigning(false);
    }
  }

  function getServicePriceText(service: SelectedService) {
    if (service.kind === "package" && !showUpsellPrices) {
      return money(grossAmount);
    }

    if (service.givenFree) {
      return "ללא עלות";
    }

    if (!showUpsellPrices && service.kind === "upsell") {
      return "כלול במחיר הכולל";
    }

    return money(service.price);
  }

  function getServicePriceLabel(service: SelectedService) {
    if (service.kind === "package" && !showUpsellPrices) {
      return "מחיר חבילה כולל";
    }

    if (!showUpsellPrices && service.kind === "upsell") {
      return "כלול";
    }

    return "מחיר";
  }

  function shouldShowServicePriceCard(service: SelectedService) {
    if (!showUpsellPrices) return false;
    if (service.givenFree) return true;
    if (service.key === "creditGifts" && service.price === 0) return true;
    return typeof service.price === "number" && Number.isFinite(service.price) && service.price > 0;
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#fff7ec] px-4 py-10 text-[#3f3327]"
      >
        <div className="mx-auto max-w-5xl rounded-[32px] border border-[#eadfce] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#eadfce] border-t-[#c9944a]" />
          <p className="mt-4 text-lg font-black">טוען מסמך...</p>
        </div>
      </main>
    );
  }

  if (loadError || !document) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#fff7ec] px-4 py-10 text-[#3f3327]"
      >
        <div className="mx-auto max-w-3xl rounded-[32px] border border-red-200 bg-white p-8 text-center shadow-sm">
          <img
            src="/invistimo-logo.png"
            alt="Invistimo"
            className="mx-auto h-14 w-auto object-contain"
          />
          <h1 className="mt-6 text-2xl font-black text-red-700">
            לא ניתן לפתוח את המסמך
          </h1>
          <p className="mt-3 text-sm font-bold text-[#7b6a58]">
            {loadError || "המסמך לא נמצא או שהקישור אינו תקין."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[radial-gradient(circle_at_top,#fff2dc_0,#fff7ec_35%,#fffdf8_100%)] px-4 py-8 text-[#3f3327] sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[34px] border border-[#eadfce] bg-white/90 p-5 shadow-sm backdrop-blur sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="order-2 sm:order-1">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[#d6b47c] bg-[#fff7ec] px-4 py-2 text-xs font-black text-[#8a5c20]">
                  {getDocumentTitle(document.type)}
                </span>

                <span
                  className={`rounded-full border px-4 py-2 text-xs font-black ${
                    document.status === "signed"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : document.status === "expired" || expired
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-[#eadfce] bg-white text-[#7b6a58]"
                  }`}
                >
                  סטטוס: {getStatusLabel(document.status)}
                </span>

                <span className="rounded-full border border-[#eadfce] bg-white px-4 py-2 text-xs font-black text-[#7b6a58]">
                  {getPaymentModeLabel(paymentMode)}
                </span>

                {isQuote ? (
                  <span className="rounded-full border border-[#eadfce] bg-white px-4 py-2 text-xs font-black text-[#7b6a58]">
                    צפייה בלבד
                  </span>
                ) : null}
              </div>



              <h1 className="mt-5 text-3xl font-black tracking-tight text-[#3f3327] sm:text-4xl">
                {isAgreement ? "הסכם פרטי עסקה ותנאי שירות" : "הצעת מחיר"}
              </h1>

              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[#7b6a58]">
                {isAgreement
                  ? "בעמוד זה מופיעים פרטי העסקה, השירותים שנבחרו, תנאי התשלום ותנאי הביטול. בסיום העמוד ניתן למלא פרטים ולחתום דיגיטלית."
                  : "בעמוד זה מופיעים פרטי הצעת המחיר, השירותים שנבחרו, תנאי התשלום ותנאי הביטול. הצעה זו לצפייה בלבד."}
              </p>
            </div>

            <div className="order-1 flex justify-start sm:order-2 sm:justify-end">
              <img
                src="/invistimo-logo.png"
                alt="Invistimo"
                className="h-16 w-auto object-contain"
              />
            </div>
          </div>
        </header>

        {expired || document.status === "expired" ? (
          <div className="mt-6 rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm font-bold leading-7 text-red-700">
            ההצעה אינה בתוקף. ניתן ליצור קשר עם Invistimo לקבלת הצעה עדכנית
            בהתאם לזמינות.
          </div>
        ) : null}

        {signSuccess ? (
          <div className="mt-6 rounded-[28px] border border-green-200 bg-green-50 p-5 text-sm font-bold leading-7 text-green-700">
            {signSuccess}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <SectionCard title="פרטי הלקוח והאירוע">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="שם לקוח" value={document.client?.fullName} />
                <Field label="טלפון" value={document.client?.phone} />
                <Field label="מייל" value={document.client?.email} />
                <Field
                  label="שם האירוע"
                  value={document.event?.name || "אירוע"}
                />
                <Field
                  label="תאריך אירוע"
                  value={formatDate(document.event?.date)}
                />
                <Field label="עיר" value={document.event?.city} />
                <Field label="שם האולם" value={document.event?.venueName} />
              </div>
            </SectionCard>

            <SectionCard title="תאריכי מסמך">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label={isAgreement ? "תאריך עסקה" : "תאריך הצעה"}
                  value={formatDate(
                    document.quote?.createdAt || document.createdAt,
                  )}
                />

                {isQuote ? (
                  <Field
                    label="ההצעה תקפה עד"
                    value={`${formatDate(
                      document.quote?.expiresAt,
                    )} בהתאם לזמינות`}
                  />
                ) : (
                  <Field
                    label="תאריך חתימה"
                    value={
                      document.signature?.signedAt ||
                      document.agreement?.signedAt
                        ? formatDate(
                            document.signature?.signedAt ||
                              document.agreement?.signedAt,
                          )
                        : "טרם נחתם"
                    }
                  />
                )}

                <Field
                  label="מספר רשומות"
                  value={document.selectedPackage?.records}
                />
              </div>
            </SectionCard>

            <SectionCard title="השירותים הכלולים בעסקה">
              {!showUpsellPrices ? (
                <div className="mb-4 rounded-[24px] border border-[#eadfce] bg-[#fff7ec] p-4 text-sm font-bold leading-7 text-[#6d5840]">
                  המחיר בהצעה זו מוצג כמחיר חבילה כולל. מחירי התוספות אינם
                  מוצגים בנפרד.
                </div>
              ) : null}

              {selectedServices.length > 0 ? (
                <div className="space-y-4">
                  {selectedServices.map((service, index) => (
                    <div
                      key={`${service.title}-${index}`}
                      className="rounded-[28px] border border-[#eadfce] bg-[#fffdf9] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-lg font-black text-[#3f3327]">
                            {service.title}
                          </h3>

                          {service.description ? (
                            <p className="mt-2 text-sm font-semibold leading-7 text-[#7b6a58]">
                              {service.description}
                            </p>
                          ) : null}
                        </div>

                        {shouldShowServicePriceCard(service) ? (
                          <div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#3f3327] ring-1 ring-[#eadfce]">
                            <p className="text-[11px] font-black text-[#9b805f]">
                              {getServicePriceLabel(service)}
                            </p>
                            <p className="mt-1">{getServicePriceText(service)}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4">
                        <DetailSections sections={service.details} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyLine label="לא הוגדרו שירותים במסמך." />
              )}
            </SectionCard>

            <SectionCard title="תנאי תשלום">
              <DetailSections sections={customerPaymentTerms} />
            </SectionCard>

            <SectionCard title="תנאי ביטול">
              <DetailSections sections={customerCancellationTerms} />
            </SectionCard>

            {isAgreement ? (
              <SectionCard title="חתימה ואישור תנאי עסקה">
                {isSigned ? (
                  <div className="space-y-5">
                    <div className="rounded-[28px] border border-green-200 bg-green-50 p-5 text-sm font-black leading-7 text-green-700">
                      ההסכם נחתם ונשמר במערכת.
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="שם מלא"
                        value={
                          document.signature?.fullName ||
                          document.agreement?.signatureFullName
                        }
                      />
                      <Field
                        label="תעודת זהות"
                        value={
                          document.signature?.idNumber ||
                          document.agreement?.signatureIdNumber
                        }
                      />
                      <Field
                        label="כתובת"
                        value={
                          document.signature?.address ||
                          document.agreement?.signatureAddress
                        }
                      />
                      <Field
                        label="טלפון"
                        value={
                          document.signature?.phone ||
                          document.agreement?.signaturePhone
                        }
                      />
                      <Field
                        label="תאריך חתימה"
                        value={formatDate(
                          document.signature?.date ||
                            document.agreement?.signatureDate,
                        )}
                      />
                      <Field
                        label="נחתם בתאריך"
                        value={formatDate(
                          document.signature?.signedAt ||
                            document.agreement?.signedAt,
                        )}
                      />
                    </div>

                    {document.signature?.signatureDataUrl ||
                    document.agreement?.signatureDataUrl ? (
                      <div>
                        <p className="mb-2 text-sm font-black text-[#3f3327]">
                          חתימה
                        </p>
                        <div className="rounded-3xl border border-[#eadfce] bg-white p-4">
                          <img
                            src={
                              document.signature?.signatureDataUrl ||
                              document.agreement?.signatureDataUrl
                            }
                            alt="חתימת לקוח"
                            className="max-h-40 w-full object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <Field
                        label="חתימה"
                        value={
                          document.signature?.signatureText ||
                          document.agreement?.signatureText
                        }
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdf9] p-4 text-sm font-bold leading-7 text-[#6d5840]">
                      יש למלא את הפרטים האישיים, לאשר את תנאי העסקה ולחתום.
                      החתימה נשמרת במערכת יחד עם פרטי ההסכם.
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextInput
                        label="שם מלא"
                        value={signatureFullName}
                        onChange={setSignatureFullName}
                        disabled={!canSign || readOnly || expired}
                        required
                      />

                      <TextInput
                        label="תעודת זהות"
                        value={signatureIdNumber}
                        onChange={setSignatureIdNumber}
                        disabled={!canSign || readOnly || expired}
                        required
                      />

                      <TextInput
                        label="כתובת"
                        value={signatureAddress}
                        onChange={setSignatureAddress}
                        disabled={!canSign || readOnly || expired}
                        required
                      />

                      <TextInput
                        label="טלפון"
                        value={signaturePhone}
                        onChange={setSignaturePhone}
                        disabled={!canSign || readOnly || expired}
                        required
                      />

                      <TextInput
                        label="תאריך חתימה"
                        value={signatureDate}
                        onChange={setSignatureDate}
                        type="date"
                        disabled={!canSign || readOnly || expired}
                        required
                      />

                      <TextInput
                        label="חתימה מוקלדת"
                        value={signatureText}
                        onChange={setSignatureText}
                        disabled={!canSign || readOnly || expired}
                        placeholder="הקלדת שם מלא כחתימה"
                      />
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-black text-[#3f3327]">
                        חתימה ידנית
                      </p>

                      <SignatureCanvas
                        onChange={setSignatureDataUrl}
                        initialValue={signatureDataUrl}
                        disabled={!canSign || readOnly || expired}
                      />
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-[24px] border border-[#eadfce] bg-[#fffdf9] p-4">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        disabled={!canSign || readOnly || expired}
                        onChange={(event) =>
                          setAcceptedTerms(event.target.checked)
                        }
                        className="mt-1 h-5 w-5 accent-[#9b6a30]"
                      />

                      <span className="text-sm font-bold leading-7 text-[#5d4c3b]">
                        אני מאשר/ת שקראתי את פרטי העסקה, השירותים, תנאי התשלום
                        ותנאי הביטול, ואני מסכים/ה להתקשר בעסקה בהתאם לתנאים
                        המפורטים בעמוד זה.
                      </span>
                    </label>

                    {signError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                        {signError}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      disabled={submitDisabled}
                      onClick={handleSign}
                      className="h-14 w-full rounded-2xl bg-[#3f3327] px-5 text-base font-black text-white shadow-lg shadow-black/10 transition hover:bg-[#2f251c] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {signing ? "שומר חתימה..." : "חתימה ואישור העסקה"}
                    </button>

                    <p className="text-center text-xs font-bold leading-6 text-[#8a765f]">
                      לאחר החתימה המסמך יישמר במערכת ולא ניתן יהיה לערוך אותו
                      מהקישור.
                    </p>
                  </div>
                )}
              </SectionCard>
            ) : null}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <SectionCard title="סיכום מחיר">
              <div className="space-y-3">
                <div className="rounded-[24px] bg-[#3f3327] p-5 text-white">
                  <p className="text-sm font-bold text-white/75">
                    מחיר סופי כולל מע״מ
                  </p>
                  <p className="mt-2 text-4xl font-black">
                    {money(grossAmount)}
                  </p>
                </div>

                {discountAmount > 0 ? (
                  <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-7 text-emerald-800">
                    ניתנה הנחת תשלום מלא בסך {money(discountAmount)}.
                    {grossBeforeDiscount > 0
                      ? ` מחיר לפני הנחה: ${money(grossBeforeDiscount)}.`
                      : ""}
                  </div>
                ) : null}

                <div className="grid gap-3">
                  {showUpsellPrices &&
                  typeof document.selectedPackage?.price === "number" &&
                  Number.isFinite(document.selectedPackage.price) &&
                  document.selectedPackage.price > 0 ? (
                    <Field
                      label="מחיר חבילה"
                      value={money(document.selectedPackage.price)}
                    />
                  ) : null}

                  <Field
                    label="סוג תשלום"
                    value={getPaymentModeLabel(paymentMode)}
                  />

                  <Field label="לתשלום עכשיו" value={money(amountToPayNow)} />

                  <Field
                    label="תשלום במועד ביצוע העסקה"
                    value={money(paymentSchedule.immediateTotal)}
                  />

                  <Field
                    label="יתרה ליום האירוע"
                    value={money(paymentSchedule.eventDayTotal)}
                  />

                  {showUpsellPrices ? (
                    <>
                      <Field
                        label="שירותים דיגיטליים / לפני האירוע"
                        value={money(paymentSchedule.preEventServicesTotal)}
                      />

                      <Field
                        label="שירותי יום האירוע"
                        value={money(paymentSchedule.eventServicesTotal)}
                      />
                    </>
                  ) : null}
                </div>

                {paymentMode === "split" &&
                asNumber(paymentSchedule.eventServicesTotal) > 0 ? (
                  <div className="rounded-[24px] border border-[#eadfce] bg-[#fff7ec] p-4 text-sm font-bold leading-7 text-[#6d5840]">
                    שירותי יום האירוע מחולקים ל־50% תשלום ראשוני לשריון
                    התאריך והצוות, ו־50% יתרה ביום האירוע.
                  </div>
                ) : null}

                {paymentMode === "full" ? (
                  <div className="rounded-[24px] border border-[#eadfce] bg-[#fff7ec] p-4 text-sm font-bold leading-7 text-[#6d5840]">
                    נבחר תשלום מלא מראש. התשלום מתבצע במלואו בהתאם לסכום הסופי
                    לאחר ההנחה.
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="סטטוס המסמך">
              <div className="space-y-3">
                <Field
                  label="סוג מסמך"
                  value={getDocumentTitle(document.type)}
                />
                <Field label="סטטוס" value={getStatusLabel(document.status)} />

                {isQuote ? (
                  <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdf9] p-4 text-sm font-bold leading-7 text-[#6d5840]">
                    ההצעה תקפה עד {formatDate(document.quote?.expiresAt)} בהתאם
                    לזמינות. לאחר מועד זה יש לקבל הצעה חדשה.
                  </div>
                ) : null}

                {isAgreement && !isSigned ? (
                  <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdf9] p-4 text-sm font-bold leading-7 text-[#6d5840]">
                    יש לעבור על כל פרטי העסקה, למלא פרטים אישיים ולחתום בתחתית
                    העמוד.
                  </div>
                ) : null}

                {isSigned ? (
                  <div className="rounded-[24px] border border-green-200 bg-green-50 p-4 text-sm font-bold leading-7 text-green-700">
                    ההסכם חתום ונשמר במערכת.
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </main>
  );
}