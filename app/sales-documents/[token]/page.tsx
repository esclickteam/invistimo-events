"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";

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
    netAmount?: number;
    vatRate?: number;
    paymentMode?: string;
    paymentSchedule?: PaymentSchedule;
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
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#c9944a]" />
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
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
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-bold text-[#3f3327] outline-none transition placeholder:text-[#b6a38d] focus:border-[#c9944a] focus:ring-4 focus:ring-[#c9944a]/15"
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

    ctx.scale(ratio, ratio);
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

    ctx.clearRect(0, 0, rect.width, rect.height);
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
  const token = useMemo(() => cleanStr(params?.token), [params]);

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
          cleanStr(data.document.client?.fullName),
      );
      setSignatureIdNumber(
        cleanStr(data.document.signature?.idNumber) ||
          cleanStr(data.document.client?.idNumber),
      );
      setSignatureAddress(
        cleanStr(data.document.signature?.address) ||
          cleanStr(data.document.client?.address),
      );
      setSignaturePhone(
        cleanStr(data.document.signature?.phone) ||
          cleanStr(data.document.client?.phone),
      );
      setSignatureDate(
        cleanStr(data.document.signature?.date) || todayInputValue(),
      );
      setSignatureText(cleanStr(data.document.signature?.signatureText));
      setSignatureDataUrl(cleanStr(data.document.signature?.signatureDataUrl));
      setAcceptedTerms(Boolean(data.document.signature?.acceptedTerms));
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

  const selectedServices = useMemo(() => {
    const services: {
      title: string;
      description?: string;
      price?: number;
      givenFree?: boolean;
      details?: DetailSection[];
    }[] = [];

    if (document?.selectedPackage?.title) {
      services.push({
        title: document.selectedPackage.title,
        description: document.selectedPackage.customerSummary,
        price: document.selectedPackage.price,
        details: [
          {
            title: "מה כלול בחבילה",
            items: document.selectedPackage.includes || [],
          },
        ],
      });
    }

    (document?.upsells || []).forEach((upsell) => {
      services.push({
        title: upsell.title || "תוספת שירות",
        description: upsell.description,
        price: upsell.price,
        givenFree: upsell.givenFree,
        details: upsell.customerDetails || [],
      });
    });

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
    } catch (error) {
      setSignError(
        error instanceof Error ? error.message : "שגיאה בשמירת החתימה",
      );
    } finally {
      setSigning(false);
    }
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
                <Field label="תעודת זהות" value={document.client?.idNumber} />
                <Field
                  label="שם האירוע"
                  value={document.event?.name || "אירוע"}
                />
                <Field label="תאריך אירוע" value={formatDate(document.event?.date)} />
                <Field label="עיר" value={document.event?.city} />
                <Field label="שם האולם" value={document.event?.venueName} />
              </div>
            </SectionCard>

            <SectionCard title="תאריכי מסמך">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label={isAgreement ? "תאריך עסקה" : "תאריך הצעה"}
                  value={formatDate(document.quote?.createdAt || document.createdAt)}
                />
                {isQuote ? (
                  <Field
                    label="ההצעה תקפה עד"
                    value={`${formatDate(document.quote?.expiresAt)} בהתאם לזמינות`}
                  />
                ) : (
                  <Field
                    label="תאריך חתימה"
                    value={
                      document.signature?.signedAt
                        ? formatDate(document.signature.signedAt)
                        : "טרם נחתם"
                    }
                  />
                )}
                <Field label="מספר רשומות" value={document.selectedPackage?.records} />
              </div>
            </SectionCard>

            <SectionCard title="השירותים הכלולים בעסקה">
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

                        <div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#3f3327] ring-1 ring-[#eadfce]">
                          {service.givenFree ? "ללא עלות" : money(service.price)}
                        </div>
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
              <DetailSections sections={document.paymentTerms} />
            </SectionCard>

            <SectionCard title="תנאי ביטול">
              <DetailSections sections={document.cancellationTerms} />
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
                        value={document.signature?.fullName}
                      />
                      <Field
                        label="תעודת זהות"
                        value={document.signature?.idNumber}
                      />
                      <Field label="כתובת" value={document.signature?.address} />
                      <Field label="טלפון" value={document.signature?.phone} />
                      <Field
                        label="תאריך חתימה"
                        value={formatDate(document.signature?.date)}
                      />
                      <Field
                        label="נחתם בתאריך"
                        value={formatDate(document.signature?.signedAt)}
                      />
                    </div>

                    {document.signature?.signatureDataUrl ? (
                      <div>
                        <p className="mb-2 text-sm font-black text-[#3f3327]">
                          חתימה
                        </p>
                        <div className="rounded-3xl border border-[#eadfce] bg-white p-4">
                          <img
                            src={document.signature.signatureDataUrl}
                            alt="חתימת לקוח"
                            className="max-h-40 w-full object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <Field
                        label="חתימה"
                        value={document.signature?.signatureText}
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextInput
                        label="שם מלא"
                        value={signatureFullName}
                        onChange={setSignatureFullName}
                        required
                      />

                      <TextInput
                        label="תעודת זהות"
                        value={signatureIdNumber}
                        onChange={setSignatureIdNumber}
                        required
                      />

                      <TextInput
                        label="כתובת"
                        value={signatureAddress}
                        onChange={setSignatureAddress}
                        required
                      />

                      <TextInput
                        label="טלפון"
                        value={signaturePhone}
                        onChange={setSignaturePhone}
                        required
                      />

                      <TextInput
                        label="תאריך חתימה"
                        value={signatureDate}
                        onChange={setSignatureDate}
                        type="date"
                        required
                      />

                      <TextInput
                        label="חתימה מוקלדת"
                        value={signatureText}
                        onChange={setSignatureText}
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
                    {money(document.totals?.grossAmount)}
                  </p>
                </div>

                <div className="grid gap-3">
                  <Field
                    label="מחיר חבילה"
                    value={money(document.selectedPackage?.price)}
                  />

                  <Field
                    label="תשלום במועד ביצוע העסקה"
                    value={money(paymentSchedule.immediateTotal)}
                  />

                  <Field
                    label="יתרה ליום האירוע"
                    value={money(paymentSchedule.eventDayTotal)}
                  />

                  <Field
                    label="שירותים דיגיטליים / לפני האירוע"
                    value={money(paymentSchedule.preEventServicesTotal)}
                  />

                  <Field
                    label="שירותי יום האירוע"
                    value={money(paymentSchedule.eventServicesTotal)}
                  />
                </div>

                {asNumber(paymentSchedule.eventServicesTotal) > 0 ? (
                  <div className="rounded-[24px] border border-[#eadfce] bg-[#fff7ec] p-4 text-sm font-bold leading-7 text-[#6d5840]">
                    שירותי יום האירוע מחולקים ל־50% תשלום ראשוני לשריון
                    התאריך והצוות, ו־50% יתרה ביום האירוע.
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="סטטוס המסמך">
              <div className="space-y-3">
                <Field label="סוג מסמך" value={getDocumentTitle(document.type)} />
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