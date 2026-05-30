"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  FileText,
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
  | "checkbox";

type ContractField = {
  id: string;
  type: ContractFieldType;
  label: string;
  required: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  signatureDataUrl?: string;
};

type PublicContract = {
  id: string;
  eventId: string;
  hallId: string;
  hallName: string;
  eventTitle: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  originalFileUrl: string;
  originalFileName: string;
  originalFileType: "pdf" | "image";
  fields: ContractField[];
  status: string;
  locked: boolean;
  signedAt?: string;
};

function todayForInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function ClientContractSignPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();

  const token = params?.token || "";
  const forceViewOnly = searchParams?.get("view") === "1";

  const [contract, setContract] = useState<PublicContract | null>(null);
  const [fields, setFields] = useState<ContractField[]>([]);

  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isViewOnly = forceViewOnly || Boolean(contract?.locked);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function fetchContract() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/client-contracts/sign/${encodeURIComponent(token)}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || "טעינת ההסכם נכשלה");
        }

        if (cancelled) return;

        setContract(data.contract);
        setFields(
          Array.isArray(data.contract?.fields)
            ? data.contract.fields.map((field: ContractField) => ({
                ...field,
                value:
                  field.value ||
                  (field.type === "date" ? todayForInput() : ""),
              }))
            : []
        );
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

  function updateField(fieldId: string, patch: Partial<ContractField>) {
    if (isViewOnly) return;

    setFields((prev) =>
      prev.map((field) => (field.id === fieldId ? { ...field, ...patch } : field))
    );
  }

  async function submitSignature() {
    if (!contract) return;

    setSigning(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/client-contracts/sign/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "חתימת ההסכם נכשלה");
      }

      setContract((current) =>
        current
          ? {
              ...current,
              locked: true,
              status: "signed",
              signedAt: new Date().toISOString(),
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
                  הסכם לחתימה
                </h1>

                <p className="mt-2 text-sm font-bold text-[#7f705d]">
                  {contract.clientName || "לקוח"} — יש למלא את השדות המסומנים ולחתום.
                </p>
              </div>
            </div>

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

        {contract.signedAt && (
          <div className="mb-4 rounded-2xl border border-emerald-100 bg-white p-4 text-sm font-black text-emerald-700">
            ההסכם נחתם בתאריך {formatDateTime(contract.signedAt)}
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-[1fr_330px]">
          <div className="overflow-hidden rounded-[30px] border border-[#eadfce] bg-white shadow-sm">
            <div className="border-b border-[#eadfce] bg-[#fbf5ea] px-4 py-3 text-sm font-black text-[#2b241c]">
              {contract.originalFileName || "הסכם"}
            </div>

            <div className="max-h-[850px] overflow-auto bg-[#f3eee5] p-4">
              <div className="relative mx-auto min-h-[760px] w-full max-w-[900px] overflow-hidden rounded-[22px] border border-[#dbcbb3] bg-white shadow-sm">
                {contract.originalFileType === "image" ? (
                  <img
                    src={contract.originalFileUrl}
                    alt="הסכם"
                    draggable={false}
                    className="block h-auto w-full select-none"
                  />
                ) : (
                  <iframe
                    src={contract.originalFileUrl}
                    title="contract-pdf"
                    className="h-[760px] w-full bg-white"
                  />
                )}

                <div className="absolute inset-0 z-10">
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      className="absolute overflow-hidden rounded-xl border-2 border-[#b98121] bg-white/90 p-1 shadow-sm backdrop-blur-sm"
                      style={{
                        right: `${field.x}%`,
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
                <InfoBox label="לקוח" value={contract.clientName || "לא הוגדר"} />
                <InfoBox label="אולם" value={contract.hallName || "לא הוגדר"} />
                <InfoBox label="אירוע" value={contract.eventTitle || "לא הוגדר"} />
              </div>
            </div>

            <div className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm">
              <h2 className="font-black">שדות למילוי</h2>

              <div className="mt-3 space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-black"
                  >
                    <span>{field.label}</span>
                    <span className="text-xs text-[#9b8a73]">
                      {field.required ? "חובה" : "רשות"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {!isViewOnly && (
              <button
                type="button"
                onClick={submitSignature}
                disabled={signing}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signing ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                {signing ? "שולח חתימה..." : "חתום ושלח"}
              </button>
            )}

            {isViewOnly && (
              <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-4 text-sm font-black leading-6 text-emerald-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  ההסכם נחתם וננעל.
                </div>
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

  function getPos(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: React.MouseEvent<HTMLCanvasElement>) {
    if (viewOnly) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    drawingRef.current = true;

    const pos = getPos(event);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#2b241c";
  }

  function draw(event: React.MouseEvent<HTMLCanvasElement>) {
    if (viewOnly || !drawingRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    const pos = getPos(event);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function end() {
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
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={end}
        onMouseLeave={end}
        className="h-full w-full cursor-crosshair rounded-lg bg-white"
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