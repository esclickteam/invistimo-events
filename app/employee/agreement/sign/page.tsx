"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

type FieldType = "text" | "date" | "signature";
type EmployeeAgreementStatus = "signed" | "approved" | "rejected";

type TemplateField = {
  id: string;
  label: string;
  type: FieldType;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  order: number;
};

type TemplatePage = {
  pageIndex: number;
  pageNumber: number;
  url: string;
  imageUrl: string;
  name: string;
  type: "image" | "pdf";
};

type AgreementTemplate = {
  _id: string;
  name?: string;
  fileUrl: string;
  pageCount: number;
  coordinateMode?: "percent" | "pixel";
  pages?: TemplatePage[];
  fields: TemplateField[];
};

type EmployeeAgreement = {
  _id: string;
  employeeId: string;
  businessId: string;
  signedFileUrl: string;
  status: EmployeeAgreementStatus;
  signedAt?: string;
  rejectionReason?: string;
};

const DEFAULT_FILE_URL = "/templates/employee-agreement-invistimo.pdf";
const DEFAULT_PAGE_COUNT = 11;

const LEGACY_PAGE_WIDTH = 700;
const LEGACY_PAGE_HEIGHT = 900;

function getUserId(user: any) {
  return String(user?._id || user?.id || "");
}

function getBusinessId(user: any) {
  return String(
    user?.businessId ||
      user?.employerId ||
      user?.companyId ||
      user?.createdByAdmin ||
      user?._id ||
      user?.id ||
      ""
  );
}

function toNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value || "";

  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeField(raw: any, index: number): TemplateField {
  const rawType = String(raw?.type || "text");
  const type: FieldType =
    rawType === "date" || rawType === "signature" ? rawType : "text";

  let width = toNumber(raw?.width, type === "signature" ? 24 : 22);
  let height = toNumber(raw?.height, type === "signature" ? 8 : 6);
  let x = toNumber(raw?.x, 38);
  let y = toNumber(raw?.y, 35);

  const pageIndex =
    raw?.pageIndex !== undefined
      ? Math.max(0, toNumber(raw.pageIndex, 0))
      : raw?.pageNumber !== undefined
        ? Math.max(0, toNumber(raw.pageNumber, 1) - 1)
        : 0;

  const looksLikeLegacyPixels =
    x > 100 || y > 100 || width > 100 || height > 100;

  if (looksLikeLegacyPixels) {
    x = (x / LEGACY_PAGE_WIDTH) * 100;
    y = (y / LEGACY_PAGE_HEIGHT) * 100;
    width = (width / LEGACY_PAGE_WIDTH) * 100;
    height = (height / LEGACY_PAGE_HEIGHT) * 100;
  }

  width = clamp(Number(width.toFixed(2)), 4, 85);
  height = clamp(Number(height.toFixed(2)), 3, 35);
  x = clamp(Number(x.toFixed(2)), 0, 100 - width);
  y = clamp(Number(y.toFixed(2)), 0, 100 - height);

  return {
    id: String(raw?.id || `${Date.now()}-${index}`),
    label: String(raw?.label || "שדה"),
    type,
    pageIndex,
    x,
    y,
    width,
    height,
    required: raw?.required !== undefined ? Boolean(raw.required) : true,
    order: toNumber(raw?.order, index + 1),
  };
}

function normalizePage(raw: any, index: number, template: any): TemplatePage {
  const pageNumber = Math.max(
    1,
    toNumber(
      raw?.pageNumber,
      raw?.pageIndex !== undefined ? raw.pageIndex + 1 : index + 1
    )
  );

  return {
    pageIndex: pageNumber - 1,
    pageNumber,
    url: String(raw?.url || template?.fileUrl || DEFAULT_FILE_URL),
    imageUrl: String(raw?.imageUrl || ""),
    name: String(raw?.name || `עמוד ${pageNumber}`),
    type: String(raw?.type || "image") === "pdf" ? "pdf" : "image",
  };
}

function normalizeTemplate(raw: any): AgreementTemplate {
  const pageCount = Math.max(
    1,
    toNumber(raw?.pageCount, DEFAULT_PAGE_COUNT)
  );

  const pages = Array.isArray(raw?.pages)
    ? raw.pages
        .map((page: any, index: number) => normalizePage(page, index, raw))
        .filter((page: TemplatePage) => page.pageNumber >= 1)
        .filter((page: TemplatePage) => page.pageNumber <= pageCount)
        .sort((a: TemplatePage, b: TemplatePage) => a.pageNumber - b.pageNumber)
    : [];

  const fields = Array.isArray(raw?.fields)
    ? raw.fields
        .map((field: any, index: number) => normalizeField(field, index))
        .sort((a: TemplateField, b: TemplateField) => a.order - b.order)
    : [];

  return {
    _id: String(raw?._id || raw?.id || ""),
    name: String(raw?.name || "תבנית הסכם עבודה"),
    fileUrl: String(raw?.fileUrl || DEFAULT_FILE_URL),
    pageCount,
    coordinateMode: raw?.coordinateMode === "pixel" ? "pixel" : "percent",
    pages,
    fields,
  };
}

function getFieldDisplayValue({
  field,
  values,
  signatures,
}: {
  field: TemplateField;
  values: Record<string, string>;
  signatures: Record<string, string>;
}) {
  if (field.type === "signature") {
    return signatures[field.id] || "";
  }

  const value = values[field.id] || "";

  if (field.type === "date") {
    return formatDate(value);
  }

  return value;
}

function SignatureCanvas({
  value,
  onChange,
}: {
  value?: string;
  onChange: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasSignatureRef = useRef(false);

  function getPoint(event: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    if ("touches" in event) {
      const touch = event.touches[0] || event.changedTouches[0];
      if (!touch) return null;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDrawing(event: React.MouseEvent | React.TouchEvent) {
    event.preventDefault();

    const canvas = canvasRef.current;
    const point = getPoint(event);
    if (!canvas || !point) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawingRef.current = true;
    hasSignatureRef.current = true;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(event: React.MouseEvent | React.TouchEvent) {
    event.preventDefault();

    if (!drawingRef.current) return;

    const canvas = canvasRef.current;
    const point = getPoint(event);
    if (!canvas || !point) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (!drawingRef.current) return;

    drawingRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas || !hasSignatureRef.current) return;

    onChange(canvas.toDataURL("image/png"));
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignatureRef.current = false;
    onChange("");
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
  }, []);

  return (
    <div className="mt-5">
      <div className="rounded-[24px] border-2 border-dashed border-slate-300 bg-white p-3">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="h-56 w-full touch-none rounded-[18px] bg-slate-50"
        />
      </div>

      {value && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-black text-emerald-700">
          חתימה נקלטה
        </div>
      )}

      <button
        type="button"
        onClick={clearSignature}
        className="mt-3 h-10 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50"
      >
        ניקוי חתימה
      </button>
    </div>
  );
}

function TemplateImagePreview({
  template,
  fields,
  values,
  signatures,
  currentFieldId,
}: {
  template: AgreementTemplate;
  fields: TemplateField[];
  values: Record<string, string>;
  signatures: Record<string, string>;
  currentFieldId?: string;
}) {
  const pages = template.pages || [];

  return (
    <div className="h-[74vh] overflow-y-auto overflow-x-hidden bg-slate-100 p-4">
      <div className="mx-auto flex w-full max-w-[920px] flex-col gap-7">
        {pages.map((page) => {
          const pageFields = fields.filter(
            (field) => field.pageIndex === page.pageIndex
          );

          return (
            <div key={page.pageIndex} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="text-sm font-black text-slate-700">
                  עמוד {page.pageNumber}
                </div>

                <div className="text-xs font-black text-slate-500">
                  {pageFields.length} שדות
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                <img
                  src={page.imageUrl}
                  alt={`עמוד ${page.pageNumber}`}
                  draggable={false}
                  className="block h-auto w-full select-none rounded-[22px] bg-white"
                />

                <div className="pointer-events-none absolute inset-0 z-10">
                  {pageFields.map((field) => {
                    const selected = currentFieldId === field.id;
                    const displayValue = getFieldDisplayValue({
                      field,
                      values,
                      signatures,
                    });

                    return (
                      <div
                        key={field.id}
                        className={[
                          "absolute flex items-center justify-center overflow-hidden rounded-xl border-2 px-2 text-center text-xs font-black shadow-sm",
                          selected
                            ? "border-violet-600 bg-violet-100/80 text-violet-900"
                            : "border-violet-300 bg-white/70 text-slate-700",
                        ].join(" ")}
                        style={{
                          left: `${field.x}%`,
                          top: `${field.y}%`,
                          width: `${field.width}%`,
                          height: `${field.height}%`,
                        }}
                      >
                        {field.type === "signature" && displayValue ? (
                          <img
                            src={displayValue}
                            alt="חתימה"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="truncate">
                            {displayValue || field.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SignedAgreementSuccess({ signedUrl }: { signedUrl: string }) {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
          ✓
        </div>

        <h1 className="mt-5 text-2xl font-black">ההסכם נחתם בהצלחה</h1>

        <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
          ההסכם נשמר במערכת ויופיע לאדמין לאישור וצפייה.
        </p>

        <a
          href={signedUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white transition hover:bg-emerald-700"
        >
          צפייה בהסכם החתום
        </a>
      </div>
    </main>
  );
}

function ExistingSignedAgreement({ agreement }: { agreement: EmployeeAgreement }) {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
          הסכם עבודה
        </div>

        <h1 className="mt-4 text-2xl font-black">כבר קיים הסכם חתום</h1>

        <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
          לאחר שליחת ההסכם לא ניתן לערוך אותו, אלא אם האדמין דוחה אותו.
        </p>

        <a
          href={agreement.signedFileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-violet-600 px-6 text-sm font-black text-white transition hover:bg-violet-700"
        >
          צפייה בהסכם החתום
        </a>
      </div>
    </main>
  );
}

function AgreementSignContent() {
  const { user } = useAuth();

  const employeeId = getUserId(user);
  const businessId = getBusinessId(user);

  const [template, setTemplate] = useState<AgreementTemplate | null>(null);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [stepIndex, setStepIndex] = useState(0);

  const [values, setValues] = useState<Record<string, string>>({});
  const [signatures, setSignatures] = useState<Record<string, string>>({});

  const [confirmed, setConfirmed] = useState(false);
  const [previewWasOpened, setPreviewWasOpened] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [existingAgreement, setExistingAgreement] =
    useState<EmployeeAgreement | null>(null);

  const [successUrl, setSuccessUrl] = useState("");
  const [error, setError] = useState("");

  const currentField = fields[stepIndex] || null;
  const isConfirmStep = stepIndex >= fields.length;

  const templateHasImages = Boolean(
    template?.pages?.some((page) => Boolean(page.imageUrl))
  );

  const progressPercent = useMemo(() => {
    const total = fields.length + 1;
    return Math.round(((stepIndex + 1) / total) * 100);
  }, [fields.length, stepIndex]);

  function clearCreatedPreview() {
    setPreviewUrl("");
  }

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      if (!employeeId || !businessId) {
        setError("לא נמצא עובד מחובר. צריך להתחבר מחדש למערכת.");
        return;
      }

      const templateParams = new URLSearchParams({ businessId });

      const [templateRes, agreementRes] = await Promise.all([
        fetch(`/api/employee-agreement-templates/current?${templateParams}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(
          `/api/employee-agreements/current?employeeId=${employeeId}&businessId=${businessId}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        ),
      ]);

      const templateData = await templateRes.json().catch(() => null);
      const agreementData = await agreementRes.json().catch(() => null);

      if (!templateRes.ok || !templateData?.success) {
        throw new Error(templateData?.error || "שגיאה בטעינת תבנית ההסכם");
      }

      const loadedTemplate = templateData.template || null;

      if (!loadedTemplate) {
        throw new Error("לא קיימת תבנית הסכם פעילה. יש להגדיר תבנית באדמין.");
      }

      const normalizedTemplate = normalizeTemplate(loadedTemplate);
      const sortedFields = normalizedTemplate.fields;

      if (sortedFields.length === 0) {
        throw new Error("בתבנית ההסכם לא הוגדרו שדות למילוי.");
      }

      setTemplate(normalizedTemplate);
      setFields(sortedFields);

      if (agreementRes.ok && agreementData?.agreement) {
        setExistingAgreement(agreementData.agreement);
      } else {
        setExistingAgreement(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת ההסכם");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [employeeId, businessId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function updateValue(fieldId: string, value: string) {
    setPreviewWasOpened(false);
    setConfirmed(false);
    clearCreatedPreview();

    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function updateSignature(fieldId: string, value: string) {
    setPreviewWasOpened(false);
    setConfirmed(false);
    clearCreatedPreview();

    setSignatures((prev) => ({ ...prev, [fieldId]: value }));
  }

  function validateField(field: TemplateField) {
    setError("");

    if (!field.required) return true;

    if (field.type === "signature") {
      if (!signatures[field.id]) {
        setError(`יש למלא את השדה: ${field.label}`);
        return false;
      }

      return true;
    }

    if (!String(values[field.id] || "").trim()) {
      setError(`יש למלא את השדה: ${field.label}`);
      return false;
    }

    return true;
  }

  function validateAll() {
    setError("");

    for (const field of fields) {
      if (!field.required) continue;

      if (field.type === "signature" && !signatures[field.id]) {
        setError(`חסר שדה חובה: ${field.label}`);
        return false;
      }

      if (field.type !== "signature" && !String(values[field.id] || "").trim()) {
        setError(`חסר שדה חובה: ${field.label}`);
        return false;
      }
    }

    return true;
  }

  function goNext() {
    if (isConfirmStep) {
      void submitAgreement();
      return;
    }

    if (!currentField) return;

    if (!validateField(currentField)) return;

    setStepIndex((prev) => Math.min(prev + 1, fields.length));
  }

  function goBack() {
    setError("");

    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
      return;
    }

    window.history.back();
  }

  async function createPreview() {
    try {
      if (!template) return;

      if (!validateAll()) return;

      setPreviewing(true);
      setError("");

      const res = await fetch("/api/employee-agreements/preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          values,
          signatures,
          validateRequired: true,
        }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "שגיאה ביצירת תצוגה מקדימה");
        }

        throw new Error("שגיאה ביצירת תצוגה מקדימה");
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      setPreviewUrl(blobUrl);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setPreviewWasOpened(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "שגיאה ביצירת תצוגה מקדימה להסכם."
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function submitAgreement() {
    try {
      if (!validateAll()) return;

      if (!previewWasOpened) {
        setError("לפני השליחה יש ללחוץ על צפייה בהסכם לפני שליחה.");
        return;
      }

      if (!confirmed) {
        setError("יש לאשר שהפרטים נכונים לפני שליחה.");
        return;
      }

      setSubmitting(true);
      setError("");

      const res = await fetch("/api/employee-agreements/sign", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          businessId,
          values,
          signatures,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בשליחת ההסכם");
      }

      setSuccessUrl(data.signedFileUrl || data.agreement?.signedFileUrl || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשליחת ההסכם");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-3xl bg-white p-6 text-sm font-black text-slate-700 shadow-sm">
          טוען הסכם...
        </div>
      </main>
    );
  }

  if (successUrl) {
    return <SignedAgreementSuccess signedUrl={successUrl} />;
  }

  if (existingAgreement?.signedFileUrl && existingAgreement.status !== "rejected") {
    return <ExistingSignedAgreement agreement={existingAgreement} />;
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="order-2 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm lg:order-1">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div>
              <h2 className="text-lg font-black">תצוגת הסכם עבודה</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                התצוגה מתעדכנת לפי השדות שאת ממלאת.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void createPreview()}
              disabled={previewing || submitting}
              className="shrink-0 rounded-2xl bg-violet-600 px-4 py-2 text-xs font-black text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              {previewing ? "יוצר..." : "צפייה בהסכם לפני שליחה"}
            </button>
          </div>

          {previewUrl ? (
            <iframe
              src={previewUrl}
              className="h-[74vh] w-full"
              title="תצוגה מקדימה להסכם עבודה"
            />
          ) : template && templateHasImages ? (
            <TemplateImagePreview
              template={template}
              fields={fields}
              values={values}
              signatures={signatures}
              currentFieldId={currentField?.id}
            />
          ) : (
            <iframe
              src={template?.fileUrl || DEFAULT_FILE_URL}
              className="h-[74vh] w-full"
              title="תבנית הסכם עבודה"
            />
          )}
        </section>

        <section className="order-1 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm lg:order-2 lg:sticky lg:top-5 lg:self-start">
          <div className="mb-4 inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
            חתימה דיגיטלית
          </div>

          <h1 className="text-2xl font-black">חתימה על הסכם עבודה</h1>

          <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
            מלאי את השדות לפי הסדר שהוגדר בתבנית. בכל שלב לחצי הבא.
          </p>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
              <span>
                שדה {Math.min(stepIndex + 1, fields.length + 1)} מתוך{" "}
                {fields.length + 1}
              </span>
              <span>{progressPercent}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-600 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-6 rounded-[28px] bg-slate-50 p-5">
            {!isConfirmStep && currentField ? (
              <>
                <h2 className="text-xl font-black">{currentField.label}</h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  {currentField.required ? "שדה חובה" : "שדה רשות"}
                </p>

                {currentField.type === "signature" ? (
                  <SignatureCanvas
                    value={signatures[currentField.id]}
                    onChange={(dataUrl) =>
                      updateSignature(currentField.id, dataUrl)
                    }
                  />
                ) : (
                  <input
                    type={currentField.type === "date" ? "date" : "text"}
                    value={values[currentField.id] || ""}
                    onChange={(event) =>
                      updateValue(currentField.id, event.target.value)
                    }
                    placeholder={`מילוי ${currentField.label}`}
                    className="mt-5 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                )}
              </>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-black">אישור ושליחה</h2>

                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-black leading-6 text-amber-800">
                  לפני השליחה חובה לצפות בהסכם. לאחר השליחה לא ניתן לערוך את
                  הפרטים או החתימה, אלא אם האדמין דוחה את ההסכם.
                </div>

                <button
                  type="button"
                  onClick={() => void createPreview()}
                  disabled={previewing || submitting}
                  className="flex h-12 w-full items-center justify-center rounded-2xl bg-violet-600 px-5 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {previewing ? "יוצר תצוגה..." : "צפייה בהסכם לפני שליחה"}
                </button>

                {previewWasOpened && (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black leading-6 text-emerald-700">
                    התצוגה נפתחה. אם הכול תקין, סמני אישור ושלחי.
                  </div>
                )}

                <label className="flex cursor-pointer items-start gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-sm font-bold leading-6 text-slate-700">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={!previewWasOpened}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    className="mt-1 h-5 w-5 disabled:opacity-40"
                  />
                  <span>
                    צפיתי בהסכם לפני השליחה, קראתי והבנתי את תנאיו, וכל הפרטים
                    שמילאתי נכונים.
                  </span>
                </label>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-black leading-6 text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={submitting || previewing}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {stepIndex === 0 ? "חזרה" : "הקודם"}
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={submitting || previewing}
              className="h-11 rounded-2xl bg-violet-600 px-7 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              {submitting
                ? "שולח..."
                : isConfirmStep
                  ? "שליחת הסכם חתום"
                  : "הבא"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AgreementSignPage() {
  return (
    <Suspense
      fallback={
        <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="rounded-3xl bg-white p-6 text-sm font-black text-slate-700 shadow-sm">
            טוען...
          </div>
        </main>
      }
    >
      <AgreementSignContent />
    </Suspense>
  );
}