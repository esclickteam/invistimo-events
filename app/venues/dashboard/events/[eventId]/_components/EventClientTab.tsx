"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  Copy,
  Eye,
  FileText,
  GripVertical,
  IdCard,
  Link2,
  Lock,
  Mail,
  PenLine,
  Phone,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Type,
  Upload,
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

type ContractStatus =
  | "empty"
  | "draft"
  | "sent"
  | "viewed"
  | "signed"
  | "locked";

type ContractField = {
  id: string;
  type: ContractFieldType;
  label: string;
  required: boolean;

  /**
   * שומרים באחוזים כדי שהמיקום יישאר נכון גם במסכים שונים.
   */
  x: number;
  y: number;
  width: number;
  height: number;

  value?: string;
};

type UploadedContractFile = {
  file?: File;
  url: string;
  name: string;
  type: "pdf" | "image";
};

type EventClientTabProps = {
  eventId: string;
  hallId?: string;
  hallName?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  eventTitle?: string;
};

const FIELD_LABELS: Record<ContractFieldType, string> = {
  signature: "חתימה",
  date: "תאריך",
  text: "טקסט חופשי",
  fullName: "שם מלא",
  phone: "טלפון",
  email: "אימייל",
  idNumber: "תעודת זהות",
  checkbox: "אישור",
};

const FIELD_ICONS: Record<ContractFieldType, React.ReactNode> = {
  signature: <PenLine size={15} />,
  date: <CalendarDays size={15} />,
  text: <Type size={15} />,
  fullName: <UserRound size={15} />,
  phone: <Phone size={15} />,
  email: <Mail size={15} />,
  idNumber: <IdCard size={15} />,
  checkbox: <CheckSquare size={15} />,
};

function uid(prefix = "field") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function statusLabel(status: ContractStatus) {
  if (status === "empty") return "לא הועלה הסכם";
  if (status === "draft") return "טיוטה";
  if (status === "sent") return "נשלח לחתימה";
  if (status === "viewed") return "הלקוח צפה";
  if (status === "signed") return "נחתם";
  if (status === "locked") return "נעול לצפייה";
  return "לא ידוע";
}

function statusClass(status: ContractStatus) {
  if (status === "empty") return "bg-slate-100 text-slate-600 border-slate-200";
  if (status === "draft") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "sent") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "viewed") return "bg-purple-50 text-purple-700 border-purple-200";
  if (status === "signed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "locked") return "bg-neutral-100 text-neutral-700 border-neutral-300";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function EventClientTab({
  eventId,
  hallId = "",
  hallName = "אולם",
  clientName = "לקוח האירוע",
  clientPhone = "",
  clientEmail = "",
  eventTitle = "אירוע",
}: EventClientTabProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [contractFile, setContractFile] =
    useState<UploadedContractFile | null>(null);

  const [contractId, setContractId] = useState("");
  const [fields, setFields] = useState<ContractField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const [status, setStatus] = useState<ContractStatus>("empty");
  const [signingLink, setSigningLink] = useState("");
  const [viewLink, setViewLink] = useState("");

  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [error, setError] = useState("");

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) || null,
    [fields, selectedFieldId]
  );

  const isLocked = status === "signed" || status === "locked";

  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;

    async function fetchExistingContract() {
      setLoadingExisting(true);
      setError("");

      try {
        const res = await fetch(
          `/api/venues/dashboard/events/${encodeURIComponent(eventId)}/client-contract`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        if (res.status === 404) {
          if (!cancelled) {
            setStatus("empty");
          }
          return;
        }

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || data?.error || "טעינת ההסכם נכשלה");
        }

        const contract = data?.contract || data?.clientContract || null;

        if (!contract || cancelled) return;

        setContractId(String(contract._id || contract.id || ""));
        setStatus((contract.status || "draft") as ContractStatus);

        setSigningLink(String(contract.signingLink || ""));
        setViewLink(String(contract.viewLink || contract.signedViewLink || ""));

        setFields(
          Array.isArray(contract.fields)
            ? contract.fields.map((field: any) => ({
                id: String(field.id || uid()),
                type: String(field.type || "text") as ContractFieldType,
                label: String(field.label || FIELD_LABELS.text),
                required: Boolean(field.required),
                x: Number(field.x || 0),
                y: Number(field.y || 0),
                width: Number(field.width || 20),
                height: Number(field.height || 6),
                value: String(field.value || ""),
              }))
            : []
        );

        if (contract.originalFileUrl) {
          const fileType = String(contract.originalFileType || "").includes("pdf")
            ? "pdf"
            : "image";

          setContractFile({
            url: String(contract.originalFileUrl),
            name: String(contract.originalFileName || "הסכם לקוח"),
            type: fileType,
          });
        }
      } catch (err) {
        console.error("GET client contract failed:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "טעינת ההסכם נכשלה");
        }
      } finally {
        if (!cancelled) {
          setLoadingExisting(false);
        }
      }
    }

    fetchExistingContract();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  function handleUploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      alert("ניתן להעלות רק PDF או תמונה");
      event.target.value = "";
      return;
    }

    const url = URL.createObjectURL(file);

    setContractFile({
      file,
      url,
      name: file.name,
      type: isPdf ? "pdf" : "image",
    });

    setContractId("");
    setFields([]);
    setSelectedFieldId(null);
    setSigningLink("");
    setViewLink("");
    setStatus("draft");
    setError("");
  }

  function addField(type: ContractFieldType) {
    if (!contractFile) {
      alert("קודם צריך להעלות קובץ הסכם");
      return;
    }

    if (isLocked) return;

    const width =
      type === "signature"
        ? 24
        : type === "checkbox"
          ? 8
          : type === "date"
            ? 15
            : 22;

    const height = type === "signature" ? 8 : type === "checkbox" ? 6 : 6;

    const nextField: ContractField = {
      id: uid(),
      type,
      label: FIELD_LABELS[type],
      required: type !== "text",
      x: 38,
      y: 35,
      width,
      height,
      value: "",
    };

    setFields((prev) => [...prev, nextField]);
    setSelectedFieldId(nextField.id);
  }

  function updateField(fieldId: string, patch: Partial<ContractField>) {
    if (isLocked) return;

    setFields((prev) =>
      prev.map((field) => (field.id === fieldId ? { ...field, ...patch } : field))
    );
  }

  function removeField(fieldId: string) {
    if (isLocked) return;

    setFields((prev) => prev.filter((field) => field.id !== fieldId));

    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  }

  function startDrag(event: React.MouseEvent<HTMLDivElement>, field: ContractField) {
    if (isLocked) return;

    event.preventDefault();
    event.stopPropagation();

    const editor = editorRef.current;
    if (!editor) return;

    setSelectedFieldId(field.id);

    const rect = editor.getBoundingClientRect();

    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startX = field.x;
    const startY = field.y;

    function onMouseMove(moveEvent: MouseEvent) {
      const dx = ((moveEvent.clientX - startClientX) / rect.width) * 100;
      const dy = ((moveEvent.clientY - startClientY) / rect.height) * 100;

      const nextX = clamp(startX + dx, 0, 100 - field.width);
      const nextY = clamp(startY + dy, 0, 100 - field.height);

      setFields((prev) =>
        prev.map((item) =>
          item.id === field.id
            ? {
                ...item,
                x: Number(nextX.toFixed(2)),
                y: Number(nextY.toFixed(2)),
              }
            : item
        )
      );
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function getFieldPreview(field: ContractField) {
    if (field.type === "signature") return "חתימת הלקוח";
    if (field.type === "date") return "dd/mm/yyyy";
    if (field.type === "checkbox") return "✓";
    if (field.type === "fullName") return clientName || "שם מלא";
    if (field.type === "phone") return clientPhone || "טלפון";
    if (field.type === "email") return clientEmail || "אימייל";
    if (field.type === "idNumber") return "ת.ז";
    return field.label || "טקסט";
  }

  async function saveContract() {
    if (!eventId) {
      alert("לא נמצא מזהה אירוע");
      return;
    }

    if (!contractFile) {
      alert("צריך להעלות קובץ הסכם");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const formData = new FormData();

      if (contractFile.file) {
        formData.append("file", contractFile.file);
      }

      formData.append("contractId", contractId);
      formData.append("eventId", eventId);
      formData.append("hallId", hallId);
      formData.append("hallName", hallName);
      formData.append("eventTitle", eventTitle);
      formData.append("clientName", clientName);
      formData.append("clientPhone", clientPhone);
      formData.append("clientEmail", clientEmail);
      formData.append("fields", JSON.stringify(fields));

      const res = await fetch(
        `/api/venues/dashboard/events/${encodeURIComponent(eventId)}/client-contract`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "שמירת ההסכם נכשלה");
      }

      const contract = data?.contract || data?.clientContract || null;

      setContractId(String(contract?._id || contract?.id || data?.contractId || contractId));
      setSigningLink(String(data?.signingLink || contract?.signingLink || signingLink));
      setViewLink(String(data?.viewLink || contract?.viewLink || viewLink));
      setStatus((contract?.status || "draft") as ContractStatus);

      alert("ההסכם נשמר בהצלחה");
    } catch (err) {
      console.error("POST client contract failed:", err);
      setError(err instanceof Error ? err.message : "שמירת ההסכם נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function sendSmsToClient() {
    if (!eventId) {
      alert("לא נמצא מזהה אירוע");
      return;
    }

    if (!contractFile) {
      alert("צריך להעלות הסכם לפני שליחה");
      return;
    }

    if (!fields.length) {
      alert("צריך להוסיף לפחות שדה אחד להסכם");
      return;
    }

    if (!clientPhone.trim()) {
      alert("אין מספר טלפון ללקוח");
      return;
    }

    setSendingSms(true);
    setError("");

    try {
      const res = await fetch(
        `/api/venues/dashboard/events/${encodeURIComponent(eventId)}/client-contract/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            contractId,
            eventId,
            hallId,
            hallName,
            eventTitle,
            clientName,
            clientPhone,
            clientEmail,
            fields,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "שליחת ההסכם נכשלה");
      }

      setContractId(String(data?.contractId || data?.contract?._id || contractId));
      setSigningLink(String(data?.signingLink || data?.contract?.signingLink || ""));
      setViewLink(String(data?.viewLink || data?.contract?.viewLink || viewLink));
      setStatus("sent");

      alert("ההסכם נשלח ללקוח ב-SMS");
    } catch (err) {
      console.error("POST send contract sms failed:", err);
      setError(err instanceof Error ? err.message : "שליחת ההסכם נכשלה");
    } finally {
      setSendingSms(false);
    }
  }

  async function copyText(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      alert("הקישור הועתק");
    } catch {
      alert(value);
    }
  }

  return (
    <section dir="rtl" className="space-y-5">
      <div className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-[#f4ead9] text-[#b98121]">
              <FileText size={24} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-[#2b241c]">
                לקוח והסכם חתימה
              </h2>

              <p className="mt-1 text-sm font-bold leading-6 text-[#7f705d]">
                העלאת הסכם, מיקום שדות חתימה, שליחה ללקוח ב-SMS ונעילה לאחר חתימה.
              </p>
            </div>
          </div>

          <div
            className={[
              "inline-flex h-10 w-fit items-center gap-2 rounded-full border px-4 text-sm font-black",
              statusClass(status),
            ].join(" ")}
          >
            {isLocked ? <Lock size={16} /> : <ShieldCheck size={16} />}
            {statusLabel(status)}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-black text-rose-700">
            {error}
          </div>
        )}

        {loadingExisting ? (
          <div className="rounded-[28px] border border-[#eadfce] bg-[#fffdf8] p-8 text-center text-sm font-black text-[#7f705d]">
            טוען הסכם לקוח...
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
            <div className="rounded-[28px] border border-[#eadfce] bg-[#fffdf8] p-4">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#2b241c]">
                    עורך הסכם
                  </h3>
                  <p className="mt-1 text-xs font-bold text-[#8a7b68]">
                    העלי PDF או תמונה, ואז מקמי שדות על ההסכם.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={handleUploadFile}
                    disabled={isLocked}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLocked}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload size={17} />
                    העלאת הסכם
                  </button>

                  <button
                    type="button"
                    onClick={saveContract}
                    disabled={!contractFile || saving || isLocked}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] transition hover:bg-[#f4ead9] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={17} />
                    {saving ? "שומר..." : "שמור"}
                  </button>

                  <button
                    type="button"
                    onClick={sendSmsToClient}
                    disabled={!contractFile || sendingSms || isLocked}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={17} />
                    {sendingSms ? "שולח..." : "שלח SMS"}
                  </button>
                </div>
              </div>

              {!contractFile ? (
                <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[#eadfce] bg-white p-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f4ead9] text-[#b98121]">
                    <Upload size={30} />
                  </div>

                  <h3 className="text-xl font-black text-[#2b241c]">
                    עדיין לא הועלה הסכם
                  </h3>

                  <p className="mt-2 max-w-xl text-sm font-bold leading-7 text-[#7f705d]">
                    האולם יכול להעלות כאן הסכם PDF או תמונה, למקם עליו שדות
                    חתימה, תאריך וטקסט חופשי, ואז לשלוח ללקוח קישור אישי לחתימה.
                  </p>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
                  >
                    <Upload size={18} />
                    בחר קובץ הסכם
                  </button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[28px] border border-[#eadfce] bg-white">
                  <div className="flex flex-col gap-2 border-b border-[#eadfce] bg-[#fbf5ea] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText size={17} className="shrink-0 text-[#b98121]" />
                      <span className="truncate text-sm font-black text-[#2b241c]">
                        {contractFile.name}
                      </span>
                    </div>

                    <div className="text-xs font-black text-[#8a7b68]">
                      {contractFile.type === "pdf" ? "PDF" : "תמונה"} ·{" "}
                      {fields.length} שדות
                    </div>
                  </div>

                  <div className="max-h-[820px] overflow-auto bg-[#f3eee5] p-4">
                    <div
                      ref={editorRef}
                      onClick={() => setSelectedFieldId(null)}
                      className="relative mx-auto min-h-[760px] w-full max-w-[880px] overflow-hidden rounded-[22px] border border-[#dbcbb3] bg-white shadow-sm"
                    >
                      {contractFile.type === "image" ? (
                        <img
                          src={contractFile.url}
                          alt="הסכם"
                          draggable={false}
                          className="block h-auto w-full select-none"
                        />
                      ) : (
                        <iframe
                          src={contractFile.url}
                          title="contract-pdf"
                          className="h-[760px] w-full bg-white"
                        />
                      )}

                      <div className="absolute inset-0 z-10">
                        {fields.map((field) => {
                          const selected = selectedFieldId === field.id;

                          return (
                            <div
                              key={field.id}
                              onMouseDown={(event) => startDrag(event, field)}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedFieldId(field.id);
                              }}
                              className={[
                                "group absolute flex items-center justify-center overflow-hidden rounded-xl border-2 bg-white/85 text-center text-xs font-black shadow-sm backdrop-blur-sm transition",
                                isLocked ? "cursor-default" : "cursor-move",
                                selected
                                  ? "border-[#b98121] ring-4 ring-[#b98121]/15"
                                  : "border-[#d9bd83] hover:border-[#b98121]",
                              ].join(" ")}
                              style={{
                                right: `${field.x}%`,
                                top: `${field.y}%`,
                                width: `${field.width}%`,
                                height: `${field.height}%`,
                              }}
                            >
                              <span className="absolute right-1 top-1 text-[#b98121]/70">
                                <GripVertical size={13} />
                              </span>

                              <div className="flex max-w-full items-center gap-1 truncate px-2 text-[#2b241c]">
                                <span className="text-[#b98121]">
                                  {FIELD_ICONS[field.type]}
                                </span>
                                <span className="truncate">
                                  {getFieldPreview(field)}
                                </span>
                              </div>

                              {!isLocked && (
                                <button
                                  type="button"
                                  onMouseDown={(event) => event.stopPropagation()}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    removeField(field.id);
                                  }}
                                  className="absolute -left-2 -top-2 hidden h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-md group-hover:flex"
                                  title="מחיקת שדה"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <SideBox
                title="פרטי לקוח"
                icon={<UserRound size={18} />}
                subtitle="פרטים שיופיעו וישמשו לשליחה"
              >
                <div className="space-y-3">
                  <InfoBox label="שם לקוח" value={clientName || "לא הוגדר"} />
                  <InfoBox label="טלפון" value={clientPhone || "לא הוגדר"} />
                  <InfoBox label="אימייל" value={clientEmail || "לא הוגדר"} />
                  <InfoBox label="אירוע" value={eventTitle || "לא הוגדר"} />
                </div>
              </SideBox>

              <SideBox
                title="הוספת שדות"
                icon={<PenLine size={18} />}
                subtitle="לחיצה מוסיפה שדה למסמך"
              >
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      "signature",
                      "date",
                      "text",
                      "fullName",
                      "phone",
                      "email",
                      "idNumber",
                      "checkbox",
                    ] as ContractFieldType[]
                  ).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addField(type)}
                      disabled={!contractFile || isLocked}
                      className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#6f6252] transition hover:border-[#d9bd83] hover:bg-[#fbf5ea] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="text-[#b98121]">{FIELD_ICONS[type]}</span>
                      {FIELD_LABELS[type]}
                    </button>
                  ))}
                </div>
              </SideBox>

              <SideBox
                title="עריכת שדה"
                icon={<Type size={18} />}
                subtitle="בחרי שדה מהמסמך כדי לערוך"
              >
                {!selectedField ? (
                  <div className="rounded-2xl border border-dashed border-[#eadfce] bg-[#fffdf8] p-5 text-center text-sm font-black text-[#8a7b68]">
                    לא נבחר שדה
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-black text-[#8a7b68]">
                        שם השדה
                      </label>
                      <input
                        value={selectedField.label}
                        disabled={isLocked}
                        onChange={(event) =>
                          updateField(selectedField.id, {
                            label: event.target.value,
                          })
                        }
                        className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#2b241c] outline-none transition focus:border-[#b98121] disabled:opacity-60"
                      />
                    </div>

                    <label className="flex h-12 cursor-pointer items-center justify-between rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#2b241c]">
                      <span>שדה חובה</span>
                      <input
                        type="checkbox"
                        checked={selectedField.required}
                        disabled={isLocked}
                        onChange={(event) =>
                          updateField(selectedField.id, {
                            required: event.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[#b98121]"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-black text-[#8a7b68]">
                          רוחב %
                        </label>
                        <input
                          type="number"
                          value={selectedField.width}
                          disabled={isLocked}
                          onChange={(event) =>
                            updateField(selectedField.id, {
                              width: clamp(Number(event.target.value), 4, 85),
                            })
                          }
                          className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#2b241c] outline-none transition focus:border-[#b98121] disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-black text-[#8a7b68]">
                          גובה %
                        </label>
                        <input
                          type="number"
                          value={selectedField.height}
                          disabled={isLocked}
                          onChange={(event) =>
                            updateField(selectedField.id, {
                              height: clamp(Number(event.target.value), 3, 35),
                            })
                          }
                          className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#2b241c] outline-none transition focus:border-[#b98121] disabled:opacity-60"
                        />
                      </div>
                    </div>

                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => removeField(selectedField.id)}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 text-sm font-black text-rose-700 transition hover:bg-rose-100"
                      >
                        <Trash2 size={16} />
                        מחיקת שדה
                      </button>
                    )}
                  </div>
                )}
              </SideBox>

              <SideBox
                title="קישורים"
                icon={<Link2 size={18} />}
                subtitle="לאחר שמירה/שליחה יוצגו הקישורים"
              >
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={!signingLink}
                    onClick={() => copyText(signingLink)}
                    className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <PenLine size={16} className="text-[#b98121]" />
                      קישור חתימה ללקוח
                    </span>
                    <Copy size={15} />
                  </button>

                  <button
                    type="button"
                    disabled={!viewLink}
                    onClick={() => copyText(viewLink)}
                    className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <Eye size={16} className="text-[#b98121]" />
                      צפייה בהסכם חתום
                    </span>
                    <Copy size={15} />
                  </button>
                </div>

                {isLocked && (
                  <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-black leading-6 text-emerald-700">
                    ההסכם ננעל לאחר חתימה. הלקוח והאולם יכולים לצפות בלבד.
                  </div>
                )}
              </SideBox>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

function SideBox({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>

        <div>
          <h3 className="font-black text-[#2b241c]">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-xs font-bold leading-5 text-[#8a7b68]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {children}
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