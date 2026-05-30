"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Layers,
  Loader2,
  Lock,
  PenLine,
  Send,
  Type,
  UserRound,
} from "lucide-react";

type ContractFieldType =
  | "signature"
  | "date"
  | "text"
  | "fullName"
  | "phone"
  | "email"
  | "idNumber"
  | "checkbox"
  | "venueNote";

type ContractField = {
  id: string;
  type: ContractFieldType;
  label: string;
  required: boolean;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  signatureDataUrl?: string;
};

type ContractPage = {
  pageNumber: number;
  url: string;
  name: string;
  type: "pdf" | "image";
};

type PublicContract = {
  id: string;
  eventId: string;
  hallId: string;
  hallName: string;
  eventTitle: string;
  title: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  originalFileUrl: string;
  originalFileName: string;
  originalFileType: "pdf" | "image";
  pageCount: number;
  pages: ContractPage[];
  fields: ContractField[];
  status: string;
  locked: boolean;
  signedAt?: string | null;
  digitalSignatureText?: string;
};

function todayForInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getFieldDefaultValue(field: ContractField) {
  if (field.value) return field.value;

  if (field.type === "date") return todayForInput();
  if (field.type === "checkbox") return "false";

  if (field.type === "fullName") return "";
  if (field.type === "email") return "";
  if (field.type === "phone") return "";
  if (field.type === "idNumber") return "";

  return "";
}

async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }

  return pdfjsLib;
}

export default function ClientContractSignPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();

  const token = params?.token || "";
  const forceViewOnly = searchParams?.get("view") === "1";

  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [contract, setContract] = useState<PublicContract | null>(null);
  const [fields, setFields] = useState<ContractField[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [mobileStepIndex, setMobileStepIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isViewOnly = forceViewOnly || Boolean(contract?.locked);

  const activePageData = useMemo(() => {
    if (!contract?.pages?.length) return null;

    return (
      contract.pages.find((page) => page.pageNumber === activePage) ||
      contract.pages[0] ||
      null
    );
  }, [contract, activePage]);

  const activePageFields = useMemo(
    () => fields.filter((field) => field.pageNumber === activePage),
    [fields, activePage]
  );

  const fillableFields = useMemo(() => {
    return fields
      .filter((field) => field.type !== "venueNote")
      .sort((a, b) => {
        if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });
  }, [fields]);

  const currentMobileField = fillableFields[mobileStepIndex] || null;

  const mobileProgressText =
    fillableFields.length > 0
      ? `${Math.min(mobileStepIndex + 1, fillableFields.length)} מתוך ${
          fillableFields.length
        }`
      : "0 מתוך 0";

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function fetchContract() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/client-contracts/sign/${encodeURIComponent(token)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || "טעינת ההסכם נכשלה");
        }

        if (cancelled) return;

        const nextContract: PublicContract = data.contract;

        const normalizedPages =
          Array.isArray(nextContract.pages) && nextContract.pages.length
            ? nextContract.pages
            : [
                {
                  pageNumber: 1,
                  url: nextContract.originalFileUrl,
                  name: nextContract.originalFileName || "הסכם",
                  type: nextContract.originalFileType,
                },
              ];

        const finalContract: PublicContract = {
          ...nextContract,
          pages: normalizedPages,
          pageCount: normalizedPages.length,
        };

        setContract(finalContract);

        setFields(
          Array.isArray(finalContract.fields)
            ? finalContract.fields.map((field) => ({
                ...field,
                pageNumber: Math.max(1, Number(field.pageNumber || 1)),
                value: getFieldDefaultValue(field),
                signatureDataUrl: field.signatureDataUrl || "",
              }))
            : []
        );

        setActivePage(1);
        setMobileStepIndex(0);
      } catch (err) {
        console.error("GET contract page failed:", err);

        if (!cancelled) {
          setError(err instanceof Error ? err.message : "טעינת ההסכם נכשלה");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchContract();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!fillableFields.length || isViewOnly) return;

    setMobileStepIndex(0);

    requestAnimationFrame(() => {
      scrollToField(fillableFields[0]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?.id, fillableFields.length]);

  function updateField(fieldId: string, patch: Partial<ContractField>) {
    if (isViewOnly) return;

    setFields((prev) =>
      prev.map((field) => (field.id === fieldId ? { ...field, ...patch } : field))
    );
  }

  function scrollToField(field: ContractField | null) {
    if (!field) return;

    setActivePage(field.pageNumber);

    requestAnimationFrame(() => {
      fieldRefs.current[field.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    });
  }

  function goToMobileStep(nextIndex: number) {
    if (!fillableFields.length) return;

    const safeIndex = Math.min(Math.max(nextIndex, 0), fillableFields.length - 1);

    setMobileStepIndex(safeIndex);
    scrollToField(fillableFields[safeIndex] || null);
  }

  function goToNextMobileField() {
    if (!fillableFields.length) return;
    if (mobileStepIndex >= fillableFields.length - 1) return;

    goToMobileStep(mobileStepIndex + 1);
  }

  function goToPreviousMobileField() {
    if (!fillableFields.length) return;
    if (mobileStepIndex <= 0) return;

    goToMobileStep(mobileStepIndex - 1);
  }

  function isMobileFieldActive(fieldId: string) {
    return currentMobileField?.id === fieldId;
  }

  async function submitSignature() {
    if (!contract) return;

    setSigning(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch(
        `/api/client-contracts/sign/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "חתימת ההסכם נכשלה");
      }

      const signedAt = data?.contract?.signedAt || new Date().toISOString();
      const digitalSignatureText =
        data?.contract?.digitalSignatureText ||
        `נחתם דיגיטלית בתאריך ${formatDateTime(signedAt)}`;

      setContract((current) =>
        current
          ? {
              ...current,
              locked: true,
              status: "signed",
              signedAt,
              digitalSignatureText,
            }
          : current
      );

      setSuccessMessage("ההסכם נחתם בהצלחה וננעל לצפייה בלבד");
    } catch (err) {
      console.error("POST sign contract failed:", err);
      setError(err instanceof Error ? err.message : "חתימת ההסכם נכשלה");
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f8f6f2] p-6 text-[#2b241c]">
        <div className="mx-auto mt-20 flex max-w-md flex-col items-center rounded-[28px] border border-[#eadfce] bg-white p-8 text-center shadow-sm">
          <Loader2 className="animate-spin text-[#b98121]" size={34} />
          <h1 className="mt-4 text-xl font-black">טוען הסכם...</h1>
        </div>
      </main>
    );
  }

  if (error && !contract) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f8f6f2] p-6 text-[#2b241c]">
        <div className="mx-auto mt-20 max-w-lg rounded-[28px] border border-rose-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-rose-50 text-rose-600">
            <Lock size={28} />
          </div>

          <h1 className="mt-4 text-xl font-black text-rose-700">{error}</h1>
        </div>
      </main>
    );
  }

  if (!contract) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1500px] px-4 py-5">
        <header className="mb-5 rounded-[32px] border border-[#eadfce] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-[#f4ead9] text-[#b98121]">
                <FileText size={28} />
              </div>

              <div>
                <div className="text-xs font-black text-[#9b8a73]">
                  {contract.hallName || "אולם"} · {contract.eventTitle || "אירוע"}
                </div>

                <h1 className="mt-1 text-2xl font-black md:text-4xl">
                  {contract.title || "הסכם לחתימה"}
                </h1>

                <p className="mt-2 text-sm font-bold text-[#7f705d]">
                  {isViewOnly
                    ? "ההסכם נחתם ונעול לצפייה בלבד."
                    : "יש למלא את השדות המסומנים ולחתום."}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 lg:items-end">
              <div
                className={[
                  "inline-flex h-11 w-fit items-center gap-2 rounded-full border px-4 text-sm font-black",
                  isViewOnly
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700",
                ].join(" ")}
              >
                {isViewOnly ? <Lock size={16} /> : <PenLine size={16} />}
                {isViewOnly ? "צפייה בלבד" : "ממתין לחתימה"}
              </div>

              {isViewOnly && contract.signedAt && (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                  <CheckCircle2 size={14} />
                  נחתם דיגיטלית · {formatDateTime(contract.signedAt)}
                </div>
              )}
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-black text-rose-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
            {successMessage}
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="overflow-hidden rounded-[30px] border border-[#eadfce] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#eadfce] bg-[#fbf5ea] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm font-black text-[#2b241c]">
                {activePageData?.name || contract.originalFileName || "הסכם"}
              </div>

              {contract.pages.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {contract.pages.map((page) => (
                    <button
                      key={page.pageNumber}
                      type="button"
                      onClick={() => setActivePage(page.pageNumber)}
                      className={[
                        "inline-flex h-9 items-center gap-2 rounded-2xl border px-3 text-xs font-black transition",
                        activePage === page.pageNumber
                          ? "border-[#b98121] bg-[#b98121] text-white"
                          : "border-[#eadfce] bg-white text-[#6f6252] hover:bg-[#fffdf8]",
                      ].join(" ")}
                    >
                      <Layers size={13} />
                      עמוד {page.pageNumber}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="max-h-[850px] overflow-auto bg-[#f3eee5] p-4">
              <div className="relative mx-auto w-full max-w-[900px] overflow-visible rounded-[22px] border border-[#dbcbb3] bg-white shadow-sm">
                {activePageData?.type === "image" ? (
                  <img
                    src={activePageData.url}
                    alt={`עמוד ${activePage}`}
                    draggable={false}
                    className="block h-auto w-full select-none rounded-[22px]"
                  />
                ) : (
                  <PdfPageCanvas
                    url={activePageData?.url || ""}
                    pageNumber={activePage}
                  />
                )}

                {isViewOnly && contract.signedAt && (
                  <div className="absolute bottom-4 left-4 z-20 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 text-xs font-black leading-5 text-emerald-700 shadow-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} />
                      נחתם דיגיטלית
                    </div>
                    <div>{formatDateTime(contract.signedAt)}</div>
                  </div>
                )}

                <div className="pointer-events-none absolute inset-0 z-10">
                  {activePageFields.map((field) => (
                    <div
                      key={field.id}
                      ref={(node) => {
                        fieldRefs.current[field.id] = node;
                      }}
                      className={[
                        "pointer-events-auto absolute overflow-hidden rounded-xl border-2 bg-white/90 p-1 shadow-sm backdrop-blur-sm transition",
                        field.type === "venueNote"
                          ? "border-amber-300 bg-amber-50/95 text-[#5a3f12]"
                          : isMobileFieldActive(field.id)
                            ? "border-[#b98121] ring-4 ring-[#b98121]/25"
                            : "border-[#b98121]",
                      ].join(" ")}
                      style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        width: `${field.width}%`,
                        height: `${field.height}%`,
                      }}
                    >
                      <ContractFieldInput
                        field={field}
                        viewOnly={isViewOnly}
                        onChange={(patch) => updateField(field.id, patch)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-[#f4ead9] text-[#b98121]">
                  <UserRound size={20} />
                </div>

                <div>
                  <h2 className="font-black">פרטי ההסכם</h2>
                  <p className="text-xs font-bold text-[#8a7b68]">
                    פרטים כלליים לחתימה
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <InfoBox label="אולם" value={contract.hallName || "לא הוגדר"} />
                <InfoBox label="אירוע" value={contract.eventTitle || "לא הוגדר"} />
                <InfoBox
                  label="סטטוס"
                  value={isViewOnly ? "נחתם ונעול לצפייה" : "ממתין לחתימה"}
                />

                {contract.signedAt && (
                  <InfoBox
                    label="חתימה דיגיטלית"
                    value={`נחתם דיגיטלית · ${formatDateTime(contract.signedAt)}`}
                  />
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm">
              <h2 className="font-black">שדות למילוי</h2>

              <div className="mt-3 space-y-2">
                {fields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => {
                      const index = fillableFields.findIndex((item) => item.id === field.id);
                      if (index >= 0) goToMobileStep(index);
                      setActivePage(field.pageNumber);
                    }}
                    className={[
                      "flex w-full items-center justify-between rounded-2xl border p-3 text-sm font-black transition",
                      currentMobileField?.id === field.id
                        ? "border-[#b98121] bg-[#fff8eb] text-[#9f6f1a]"
                        : "border-[#eadfce] bg-[#fffdf8]",
                    ].join(" ")}
                  >
                    <span>{field.label}</span>
                    <span className="text-xs text-[#9b8a73]">
                      עמוד {field.pageNumber} ·{" "}
                      {field.type === "venueNote"
                        ? "הערה"
                        : field.required
                          ? "חובה"
                          : "רשות"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {!isViewOnly && fillableFields.length > 0 && (
              <div className="sticky bottom-3 z-30 rounded-[26px] border border-[#eadfce] bg-white p-4 shadow-xl xl:hidden">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-[#9b8a73]">
                      מילוי הסכם
                    </div>

                    <div className="text-base font-black text-[#2b241c]">
                      {currentMobileField?.label || "שדה לחתימה"}
                    </div>
                  </div>

                  <div className="rounded-full bg-[#f4ead9] px-3 py-2 text-xs font-black text-[#9f6f1a]">
                    {mobileProgressText}
                  </div>
                </div>

                <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#f3eee5]">
                  <div
                    className="h-full rounded-full bg-[#b98121] transition-all"
                    style={{
                      width: `${
                        fillableFields.length
                          ? ((mobileStepIndex + 1) / fillableFields.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={goToPreviousMobileField}
                    disabled={mobileStepIndex === 0}
                    className="h-12 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    חזור
                  </button>

                  <button
                    type="button"
                    onClick={goToNextMobileField}
                    disabled={mobileStepIndex >= fillableFields.length - 1}
                    className="h-12 rounded-2xl bg-[#b98121] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    המשך
                  </button>
                </div>

                {mobileStepIndex >= fillableFields.length - 1 && (
                  <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center text-xs font-black text-emerald-700">
                    סיימת לעבור על כל השדות. עכשיו אפשר ללחוץ על חתום ושלח.
                  </div>
                )}
              </div>
            )}

            {!isViewOnly && (
              <button
                type="button"
                onClick={submitSignature}
                disabled={signing}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signing ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                {signing ? "שולח חתימה..." : "חתום ושלח"}
              </button>
            )}

            {isViewOnly && (
              <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-4 text-sm font-black leading-6 text-emerald-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  ההסכם נחתם וננעל.
                </div>

                {contract.signedAt && (
                  <div className="mt-1">
                    נחתם דיגיטלית · {formatDateTime(contract.signedAt)}
                  </div>
                )}

                <div className="mt-1">ניתן לצפות בו בלבד.</div>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

function ContractFieldInput({
  field,
  viewOnly,
  onChange,
}: {
  field: ContractField;
  viewOnly: boolean;
  onChange: (patch: Partial<ContractField>) => void;
}) {
  if (field.type === "venueNote") {
    return (
      <div className="flex h-full w-full items-center justify-center whitespace-pre-wrap p-1 text-center text-[11px] font-black leading-4 text-[#5a3f12]">
        {field.value || field.label || "הערת אולם"}
      </div>
    );
  }

  if (field.type === "signature") {
    return (
      <SignatureBox
        value={field.signatureDataUrl || ""}
        viewOnly={viewOnly}
        onChange={(signatureDataUrl) => onChange({ signatureDataUrl })}
      />
    );
  }

  if (field.type === "date") {
    return (
      <div className="flex h-full items-center gap-1">
        <CalendarDays size={14} className="text-[#b98121]" />
        <input
          type="date"
          value={field.value || todayForInput()}
          disabled={viewOnly}
          onChange={(event) => onChange({ value: event.target.value })}
          className="h-full w-full bg-transparent text-xs font-black outline-none disabled:text-[#2b241c]"
        />
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex h-full cursor-pointer items-center justify-center gap-2 text-xs font-black">
        <input
          type="checkbox"
          disabled={viewOnly}
          checked={field.value === "true"}
          onChange={(event) =>
            onChange({ value: event.target.checked ? "true" : "false" })
          }
          className="h-4 w-4 accent-[#b98121]"
        />
        {field.label}
      </label>
    );
  }

  return (
    <div className="flex h-full items-center gap-1">
      <Type size={14} className="text-[#b98121]" />
      <input
        value={field.value || ""}
        disabled={viewOnly}
        placeholder={field.label}
        autoComplete={
          field.type === "fullName"
            ? "name"
            : field.type === "email"
              ? "email"
              : field.type === "phone"
                ? "tel"
                : "off"
        }
        inputMode={
          field.type === "email"
            ? "email"
            : field.type === "phone"
              ? "tel"
              : "text"
        }
        type={field.type === "email" ? "email" : "text"}
        onChange={(event) => onChange({ value: event.target.value })}
        className="h-full w-full bg-transparent text-xs font-black outline-none placeholder:text-[#9b8a73] disabled:text-[#2b241c]"
      />
    </div>
  );
}

function SignatureBox({
  value,
  viewOnly,
  onChange,
}: {
  value: string;
  viewOnly: boolean;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();

    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };

    image.src = value;
  }, [value]);

  function getMousePos(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function getTouchPos(event: React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const touch = event.touches[0];

    if (!canvas || !touch) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    return {
      x: ((touch.clientX - rect.left) / rect.width) * canvas.width,
      y: ((touch.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function beginPath(x: number, y: number) {
    if (viewOnly) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    drawingRef.current = true;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#2b241c";
  }

  function continuePath(x: number, y: number) {
    if (viewOnly || !drawingRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function finishPath() {
    if (viewOnly) return;

    const canvas = canvasRef.current;

    drawingRef.current = false;

    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  }

  function clearSignature() {
    if (viewOnly) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        width={500}
        height={160}
        onMouseDown={(event) => {
          const pos = getMousePos(event);
          beginPath(pos.x, pos.y);
        }}
        onMouseMove={(event) => {
          const pos = getMousePos(event);
          continuePath(pos.x, pos.y);
        }}
        onMouseUp={finishPath}
        onMouseLeave={finishPath}
        onTouchStart={(event) => {
          event.preventDefault();
          const pos = getTouchPos(event);
          beginPath(pos.x, pos.y);
        }}
        onTouchMove={(event) => {
          event.preventDefault();
          const pos = getTouchPos(event);
          continuePath(pos.x, pos.y);
        }}
        onTouchEnd={finishPath}
        className="h-full w-full cursor-crosshair touch-none rounded-lg bg-white"
      />

      {!value && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-black text-[#9b8a73]">
          חתימה
        </div>
      )}

      {!viewOnly && value && (
        <button
          type="button"
          onClick={clearSignature}
          className="absolute left-1 top-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-rose-600 shadow-sm"
        >
          נקה
        </button>
      )}
    </div>
  );
}

function PdfPageCanvas({
  url,
  pageNumber,
}: {
  url: string;
  pageNumber: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [height, setHeight] = useState(760);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { promise: Promise<unknown>; cancel: () => void } | null = null;

    async function renderPage() {
      const canvas = canvasRef.current;
      if (!canvas || !url) return;

      setLoading(true);

      try {
        const pdfjsLib = await loadPdfJs();

        const loadingTask = pdfjsLib.getDocument({
          url,
        });

        const pdf = await loadingTask.promise;

        if (cancelled) return;

        if (pageNumber > pdf.numPages) {
          setLoading(false);
          return;
        }

        const page = await pdf.getPage(pageNumber);

        if (cancelled) return;

        const containerWidth = canvas.parentElement?.clientWidth || 900;
        const originalViewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / originalViewport.width;
        const viewport = page.getViewport({ scale });

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        setHeight(Math.floor(viewport.height));

        context.clearRect(0, 0, canvas.width, canvas.height);

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;

        if (!cancelled) {
          setLoading(false);
        }
      } catch (error: unknown) {
        const errorName =
          typeof error === "object" && error && "name" in error
            ? String((error as { name?: unknown }).name)
            : "";

        if (errorName !== "RenderingCancelledException") {
          console.error("PDF page render failed:", error);
        }

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;

      try {
        renderTask?.cancel?.();
      } catch {
        // ignore
      }
    };
  }, [url, pageNumber]);

  return (
    <div className="relative w-full bg-white" style={{ minHeight: height }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white text-sm font-black text-[#8a7b68]">
          טוען עמוד...
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="block h-auto w-full select-none rounded-[22px] bg-white"
      />
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="text-xs font-black text-[#9b8a73]">{label}</div>
      <div className="mt-1 break-words text-sm font-black text-[#2b241c]">
        {value}
      </div>
    </div>
  );
}