"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Copy,
  Eye,
  FileText,
  GripVertical,
  IdCard,
  Link2,
  Lock,
  Mail,
  MessageSquareText,
  PenLine,
  Phone,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
  Trash2,
  Type,
  Upload,
  UserRound,
  X,
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
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string;
  signatureDataUrl?: string;
};

type ContractPage = {
  pageNumber: number;
  url: string;
  imageUrl?: string;
  name: string;
  type: "pdf" | "image";
};

type UploadedContractFile = {
  file?: File;
  files?: File[];
  url: string;
  imageUrl?: string;
  name: string;
  type: "pdf" | "image";
  pageCount: number;
  pages: ContractPage[];
};

type ContractListItem = {
  id: string;
  title: string;
  status: ContractStatus;
  originalFileName?: string;
  pageCount?: number;
  signingLink?: string;
  viewLink?: string;
  signedAt?: string;
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
  venueNote: "הערת אולם",
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
  venueNote: <MessageSquareText size={15} />,
};

function uid(prefix = "field") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeStatus(value: unknown): ContractStatus {
  const status = String(value || "draft");

  if (
    status === "empty" ||
    status === "draft" ||
    status === "sent" ||
    status === "viewed" ||
    status === "signed" ||
    status === "locked"
  ) {
    return status;
  }

  return "draft";
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

function formatSignedDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
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

async function getPdfPageCount(file: File) {
  try {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
    });

    const pdf = await loadingTask.promise;

    return Math.max(1, Number(pdf.numPages || 1));
  } catch (error) {
    console.error("PDF page count failed:", error);
    return 1;
  }
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pageEditorRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [contractId, setContractId] = useState("");
  const [contractTitle, setContractTitle] = useState("הסכם לקוח");

  const [contractFile, setContractFile] =
    useState<UploadedContractFile | null>(null);

  const [fields, setFields] = useState<ContractField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(1);

  const [status, setStatus] = useState<ContractStatus>("empty");
  const [signedAt, setSignedAt] = useState("");
  const [signingLink, setSigningLink] = useState("");
  const [viewLink, setViewLink] = useState("");

  const [smsPhone, setSmsPhone] = useState(clientPhone || "");

  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) || null,
    [fields, selectedFieldId]
  );

  const isLocked = status === "signed" || status === "locked";

  useEffect(() => {
    if (!eventId) return;

    fetchExistingContracts();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    setSmsPhone(clientPhone || "");
  }, [clientPhone]);

  async function fetchExistingContracts(nextContractId?: string) {
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
        resetToEmpty();
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "טעינת ההסכמים נכשלה");
      }

      const rawContracts = Array.isArray(data?.contracts)
        ? data.contracts
        : data?.contract
          ? [data.contract]
          : [];

      const nextContracts: ContractListItem[] = rawContracts.map((contract: any) => ({
        id: String(contract._id || contract.id || ""),
        title: String(contract.title || contract.contractTitle || "הסכם לקוח"),
        status: normalizeStatus(contract.status),
        originalFileName: String(contract.originalFileName || ""),
        pageCount: Number(contract.pageCount || 1),
        signingLink: String(contract.signingLink || ""),
        viewLink: String(contract.viewLink || contract.signedViewLink || ""),
        signedAt: contract.signedAt ? String(contract.signedAt) : "",
      }));

      setContracts(nextContracts);

      const selectedId = nextContractId || contractId || nextContracts[0]?.id || "";

      const selectedRaw =
        rawContracts.find(
          (contract: any) => String(contract._id || contract.id) === selectedId
        ) || rawContracts[0];

      if (selectedRaw) {
        loadContractToState(selectedRaw);
      } else {
        resetToEmpty();
      }
    } catch (err) {
      console.error("GET client contracts failed:", err);
      setError(err instanceof Error ? err.message : "טעינת ההסכמים נכשלה");
    } finally {
      setLoadingExisting(false);
    }
  }

  function loadContractToState(contract: any) {
    const nextId = String(contract._id || contract.id || "");
    const nextStatus = normalizeStatus(contract.status);

    const fileType = String(contract.originalFileType || "").includes("image")
      ? "image"
      : "pdf";

    const pageCount = Math.max(1, Number(contract.pageCount || 1));
    const pagesFromServer = Array.isArray(contract.pages) ? contract.pages : [];

    const pages: ContractPage[] =
      pagesFromServer.length > 0
        ? pagesFromServer.map((page: any, index: number) => ({
            pageNumber: Number(page.pageNumber || index + 1),
            url: String(page.url || contract.originalFileUrl || ""),
            imageUrl: String(page.imageUrl || page.url || contract.originalFileUrl || ""),
            name: String(page.name || page.fileName || `עמוד ${index + 1}`),
            type: String(page.type || "image").includes("image") ? "image" : "pdf",
          }))
        : Array.from({ length: pageCount }).map((_, index) => ({
            pageNumber: index + 1,
            url: String(contract.originalFileUrl || ""),
            imageUrl: String(contract.originalFileUrl || ""),
            name: `${contract.originalFileName || "הסכם"} - עמוד ${index + 1}`,
            type: fileType,
          }));

    setContractId(nextId);
    setContractTitle(String(contract.title || contract.contractTitle || "הסכם לקוח"));
    setStatus(nextStatus);
    setSignedAt(contract.signedAt ? String(contract.signedAt) : "");
    setSigningLink(String(contract.signingLink || ""));
    setViewLink(String(contract.viewLink || contract.signedViewLink || ""));
    setActivePage(1);
    setSelectedFieldId(null);

    setFields(
      Array.isArray(contract.fields)
        ? contract.fields.map((field: any) => ({
            id: String(field.id || uid()),
            type: String(field.type || "text") as ContractFieldType,
            label: String(field.label || FIELD_LABELS.text),
            required: Boolean(field.required),
            pageNumber: Math.max(1, Number(field.pageNumber || 1)),
            x: Number(field.x || 0),
            y: Number(field.y || 0),
            width: Number(field.width || 20),
            height: Number(field.height || 6),
            value: String(field.value || ""),
            signatureDataUrl: String(field.signatureDataUrl || ""),
          }))
        : []
    );

    if (contract.originalFileUrl) {
      setContractFile({
        url: String(contract.originalFileUrl),
        imageUrl: String(pages[0]?.imageUrl || contract.originalFileUrl || ""),
        name: String(contract.originalFileName || "הסכם לקוח"),
        type: fileType,
        pageCount,
        pages,
      });
    } else {
      setContractFile(null);
    }
  }

  function resetToEmpty() {
    setContractId("");
    setContractTitle("הסכם לקוח");
    setContractFile(null);
    setFields([]);
    setSelectedFieldId(null);
    setActivePage(1);
    setStatus("empty");
    setSignedAt("");
    setSigningLink("");
    setViewLink("");
  }

  function createNewContract() {
    resetToEmpty();
    setContractTitle(`הסכם נוסף ${contracts.length + 1}`);
    setStatus("empty");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSelectContract(nextId: string) {
    if (!nextId) {
      createNewContract();
      return;
    }

    const selected = contracts.find((contract) => contract.id === nextId);
    if (!selected) return;

    fetchExistingContracts(selected.id);
  }

  async function handleUploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;

    const pdfFiles = selectedFiles.filter((file) => file.type === "application/pdf");
    const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));

    if (pdfFiles.length > 1 || (pdfFiles.length && selectedFiles.length > 1)) {
      alert("ניתן להעלות PDF אחד בלבד, או כמה תמונות כעמודים");
      event.target.value = "";
      return;
    }

    if (!pdfFiles.length && imageFiles.length !== selectedFiles.length) {
      alert("ניתן להעלות רק PDF או תמונות");
      event.target.value = "";
      return;
    }

    setUploadingFile(true);
    setError("");

    try {
      if (pdfFiles.length === 1) {
        const file = pdfFiles[0];
        const url = URL.createObjectURL(file);
        const pageCount = await getPdfPageCount(file);

        setContractFile({
          file,
          url,
          imageUrl: "",
          name: file.name,
          type: "pdf",
          pageCount,
          pages: Array.from({ length: pageCount }).map((_, index) => ({
            pageNumber: index + 1,
            url,
            imageUrl: "",
            name: `${file.name} - עמוד ${index + 1}`,
            type: "pdf",
          })),
        });
      } else {
        const pages = imageFiles.map((file, index) => {
          const url = URL.createObjectURL(file);

          return {
            pageNumber: index + 1,
            url,
            imageUrl: url,
            name: file.name,
            type: "image" as const,
          };
        });

        setContractFile({
          files: imageFiles,
          url: pages[0]?.url || "",
          imageUrl: pages[0]?.imageUrl || "",
          name:
            imageFiles.length === 1
              ? imageFiles[0].name
              : `${imageFiles.length} עמודים בתמונות`,
          type: "image",
          pageCount: pages.length,
          pages,
        });
      }

      setContractId("");
      setFields([]);
      setSelectedFieldId(null);
      setSigningLink("");
      setViewLink("");
      setSignedAt("");
      setActivePage(1);
      setStatus("draft");
    } catch (err) {
      console.error("Upload contract file failed:", err);
      setError(err instanceof Error ? err.message : "טעינת הקובץ נכשלה");
    } finally {
      setUploadingFile(false);
    }
  }

  function updatePdfPageCount(nextCount: number) {
    if (!contractFile || contractFile.type !== "pdf" || isLocked) return;

    const safeCount = clamp(Math.round(nextCount || 1), 1, 50);

    setContractFile((current) => {
      if (!current) return current;

      return {
        ...current,
        pageCount: safeCount,
        pages: Array.from({ length: safeCount }).map((_, index) => ({
          pageNumber: index + 1,
          url: current.url,
          imageUrl: current.pages[index]?.imageUrl || "",
          name: `${current.name} - עמוד ${index + 1}`,
          type: "pdf",
        })),
      };
    });

    setFields((prev) => prev.filter((field) => field.pageNumber <= safeCount));
    setActivePage((current) => clamp(current, 1, safeCount));
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
        : type === "venueNote"
          ? 28
          : type === "checkbox"
            ? 8
            : type === "date"
              ? 15
              : 22;

    const height =
      type === "signature"
        ? 8
        : type === "venueNote"
          ? 10
          : type === "checkbox"
            ? 6
            : 6;

    const nextField: ContractField = {
      id: uid(),
      type,
      label: FIELD_LABELS[type],
      required: type !== "text" && type !== "venueNote",
      pageNumber: activePage,
      x: 38,
      y: 35,
      width,
      height,
      value: type === "venueNote" ? "הערת אולם" : "",
    };

    setFields((prev) => [...prev, nextField]);
    setSelectedFieldId(nextField.id);

    requestAnimationFrame(() => {
      pageEditorRefs.current[activePage]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
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

    const editor = pageEditorRefs.current[field.pageNumber];
    if (!editor) return;

    setSelectedFieldId(field.id);
    setActivePage(field.pageNumber);

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

  function startResize(event: React.MouseEvent<HTMLButtonElement>, field: ContractField) {
    if (isLocked) return;

    event.preventDefault();
    event.stopPropagation();

    const editor = pageEditorRefs.current[field.pageNumber];
    if (!editor) return;

    setSelectedFieldId(field.id);
    setActivePage(field.pageNumber);

    const rect = editor.getBoundingClientRect();

    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startWidth = field.width;
    const startHeight = field.height;

    function onMouseMove(moveEvent: MouseEvent) {
      const dx = ((moveEvent.clientX - startClientX) / rect.width) * 100;
      const dy = ((moveEvent.clientY - startClientY) / rect.height) * 100;

      const maxWidth = 100 - field.x;
      const maxHeight = 100 - field.y;

      const nextWidth = clamp(startWidth + dx, 4, maxWidth);
      const nextHeight = clamp(startHeight + dy, 3, maxHeight);

      setFields((prev) =>
        prev.map((item) =>
          item.id === field.id
            ? {
                ...item,
                width: Number(nextWidth.toFixed(2)),
                height: Number(nextHeight.toFixed(2)),
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

  function moveFieldToPage(fieldId: string, pageNumber: number) {
    updateField(fieldId, { pageNumber });
    setActivePage(pageNumber);

    requestAnimationFrame(() => {
      pageEditorRefs.current[pageNumber]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function getFieldPreview(field: ContractField) {
    if (field.type === "signature") return "חתימת הלקוח";
    if (field.type === "date") return "dd/mm/yyyy";
    if (field.type === "checkbox") return "✓";
    if (field.type === "venueNote") return field.value || field.label || "הערת אולם";
    if (field.type === "fullName") return "שם מלא";
    if (field.type === "phone") return "טלפון";
    if (field.type === "email") return "אימייל";
    if (field.type === "idNumber") return "ת.ז";
    return field.label || "טקסט";
  }

  function scrollToPage(pageNumber: number) {
    setActivePage(pageNumber);
    setSelectedFieldId(null);

    requestAnimationFrame(() => {
      pageEditorRefs.current[pageNumber]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
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

      if (contractFile.type === "pdf" && contractFile.file) {
        formData.append("file", contractFile.file);
      }

      if (contractFile.type === "image" && contractFile.files?.length) {
        contractFile.files.forEach((file) => {
          formData.append("files", file);
        });
      }

      formData.append("contractId", contractId);
      formData.append("title", contractTitle);
      formData.append("eventId", eventId);
      formData.append("hallId", hallId);
      formData.append("hallName", hallName);
      formData.append("eventTitle", eventTitle);
      formData.append("clientName", clientName);
      formData.append("clientPhone", clientPhone);
      formData.append("clientEmail", clientEmail);
      formData.append("pageCount", String(contractFile.pageCount));
      formData.append("pages", JSON.stringify(contractFile.pages));
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
      const nextContractId = String(
        contract?._id || contract?.id || data?.contractId || contractId
      );

      setContractId(nextContractId);
      setSigningLink(String(data?.signingLink || contract?.signingLink || signingLink));
      setViewLink(String(data?.viewLink || contract?.viewLink || viewLink));
      setSignedAt(contract?.signedAt ? String(contract.signedAt) : signedAt);
      setStatus(normalizeStatus(contract?.status || "draft"));

      await fetchExistingContracts(nextContractId);

      alert("ההסכם נשמר בהצלחה");
    } catch (err) {
      console.error("POST client contract failed:", err);
      setError(err instanceof Error ? err.message : "שמירת ההסכם נכשלה");
    } finally {
      setSaving(false);
    }
  }

  function buildContractSmsMessage(link: string) {
    const cleanHallName = hallName || "האולם";
    const cleanEventTitle = eventTitle || "האירוע";

    return `${cleanHallName}: הסכם לחתימה עבור ${cleanEventTitle}. לחתימה: ${link}`;
  }

  async function sendSmsToClient() {
    if (!eventId) {
      alert("לא נמצא מזהה אירוע");
      return;
    }

    if (!contractId) {
      alert("צריך לשמור את ההסכם לפני שליחה");
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

    const cleanSmsPhone = smsPhone.trim().replace(/\s+/g, "").replace(/-/g, "");

    if (!cleanSmsPhone) {
      alert("יש להזין מספר טלפון לשליחת קישור החתימה");
      return;
    }

    if (!signingLink) {
      alert("לא נמצא קישור חתימה. שמרי את ההסכם שוב ואז שלחי SMS.");
      return;
    }

    const smsMessage = buildContractSmsMessage(signingLink);

    setSendingSms(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          phone: cleanSmsPhone,
          to: cleanSmsPhone,
          recipient: cleanSmsPhone,
          recipients: [cleanSmsPhone],
          phones: [cleanSmsPhone],

          message: smsMessage,
          text: smsMessage,
          content: smsMessage,

          eventId,
          hallId,
          contractId,
          type: "client_contract_signature",
          signingLink,
          contractSigningLink: signingLink,
          provider: "4free",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "שליחת ה-SMS נכשלה");
      }

      setStatus("sent");
      setSuccessMessage("קישור החתימה נשלח ללקוח ב-SMS");
      alert("קישור החתימה נשלח ללקוח ב-SMS");
    } catch (err) {
      console.error("POST send contract sms failed:", err);
      setError(err instanceof Error ? err.message : "שליחת ה-SMS נכשלה");
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
                לקוח והסכמי חתימה
              </h2>

              <p className="mt-1 text-sm font-bold leading-6 text-[#7f705d]">
                העלאת הסכמים, מיקום שדות והערות לפי עמוד, שליחה ללקוח ב-SMS ונעילה לאחר חתימה.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 xl:items-end">
            <div
              className={[
                "inline-flex h-10 w-fit items-center gap-2 rounded-full border px-4 text-sm font-black",
                statusClass(status),
              ].join(" ")}
            >
              {isLocked ? <Lock size={16} /> : <ShieldCheck size={16} />}
              {statusLabel(status)}
            </div>

            {isLocked && signedAt && (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                <CheckCircle2 size={14} />
                נחתם דיגיטלית · {formatSignedDate(signedAt)}
              </div>
            )}
          </div>
        </div>

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

        {loadingExisting ? (
          <div className="rounded-[28px] border border-[#eadfce] bg-[#fffdf8] p-8 text-center text-sm font-black text-[#7f705d]">
            טוען הסכמי לקוח...
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="min-w-0 rounded-[28px] border border-[#eadfce] bg-[#fffdf8] p-4">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#2b241c]">
                    עורך הסכם
                  </h3>
                  <p className="mt-1 text-xs font-bold text-[#8a7b68]">
                    לאחר שמירת PDF, העמודים יוצגו כתמונות איכותיות מ-Cloudinary ללא קנבס.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf,image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={handleUploadFile}
                    disabled={isLocked || uploadingFile}
                  />

                  <button
                    type="button"
                    onClick={createNewContract}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
                  >
                    <Plus size={17} />
                    הסכם חדש
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLocked || uploadingFile}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload size={17} />
                    {uploadingFile ? "טוען קובץ..." : "העלאת קובץ"}
                  </button>

                  <button
                    type="button"
                    onClick={saveContract}
                    disabled={!contractFile || saving || isLocked || uploadingFile}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] transition hover:bg-[#f4ead9] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={17} />
                    {saving ? "שומר..." : "שמור"}
                  </button>
                </div>
              </div>

              <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_250px]">
                <div>
                  <label className="mb-1 block text-xs font-black text-[#8a7b68]">
                    שם ההסכם
                  </label>
                  <input
                    value={contractTitle}
                    disabled={isLocked}
                    onChange={(event) => setContractTitle(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-black text-[#2b241c] outline-none transition focus:border-[#b98121] disabled:opacity-60"
                    placeholder="לדוגמה: הסכם אולם / הסכם תוספות / נספח עיצוב"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-black text-[#8a7b68]">
                    הסכמים קיימים
                  </label>
                  <select
                    value={contractId}
                    onChange={(event) => handleSelectContract(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-black text-[#2b241c] outline-none transition focus:border-[#b98121]"
                  >
                    <option value="">הסכם חדש / לא נשמר</option>
                    {contracts.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.title} · {statusLabel(contract.status)}
                      </option>
                    ))}
                  </select>
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
                    אפשר להעלות PDF אחד או כמה תמונות יחד. PDF חדש יוצג כתמונה איכותית לאחר שמירה.
                  </p>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload size={18} />
                    {uploadingFile ? "טוען קובץ..." : "בחר קובץ הסכם"}
                  </button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-[28px] border border-[#eadfce] bg-white">
                  <div className="flex flex-col gap-3 border-b border-[#eadfce] bg-[#fbf5ea] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText size={17} className="shrink-0 text-[#b98121]" />
                      <span className="truncate text-sm font-black text-[#2b241c]">
                        {contractFile.name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {contractFile.type === "pdf" && (
                        <label className="flex h-9 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3 text-xs font-black text-[#6f6252]">
                          מספר עמודים:
                          <input
                            type="number"
                            min={1}
                            max={50}
                            disabled={isLocked}
                            value={contractFile.pageCount}
                            onChange={(event) => updatePdfPageCount(Number(event.target.value))}
                            className="w-16 bg-transparent text-center outline-none"
                          />
                        </label>
                      )}

                      <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#8a7b68]">
                        {contractFile.type === "pdf" ? "PDF" : "תמונות"} ·{" "}
                        {contractFile.pageCount} עמודים · {fields.length} שדות
                      </span>
                    </div>
                  </div>

                  <div className="border-b border-[#eadfce] bg-white px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {contractFile.pages.map((page) => {
                        const pageFieldsCount = fields.filter(
                          (field) => field.pageNumber === page.pageNumber
                        ).length;

                        return (
                          <button
                            key={page.pageNumber}
                            type="button"
                            onClick={() => scrollToPage(page.pageNumber)}
                            className={[
                              "inline-flex h-10 items-center gap-2 rounded-2xl border px-4 text-xs font-black transition",
                              activePage === page.pageNumber
                                ? "border-[#b98121] bg-[#b98121] text-white"
                                : "border-[#eadfce] bg-[#fffdf8] text-[#6f6252] hover:bg-[#fbf5ea]",
                            ].join(" ")}
                          >
                            עמוד {page.pageNumber}
                            <span className="opacity-80">({pageFieldsCount})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-[calc(100vh-230px)] overflow-y-auto overflow-x-hidden bg-[#f3eee5] p-4">
                    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-7">
                      {contractFile.pages.map((page) => {
                        const pageFields = fields.filter(
                          (field) => field.pageNumber === page.pageNumber
                        );

                        return (
                          <div key={page.pageNumber} className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                              <div className="text-sm font-black text-[#6f6252]">
                                עמוד {page.pageNumber}
                              </div>
                              <div className="text-xs font-black text-[#9b8a73]">
                                {pageFields.length} שדות
                              </div>
                            </div>

                            <div
                              ref={(node) => {
                                pageEditorRefs.current[page.pageNumber] = node;
                              }}
                              onClick={() => {
                                setActivePage(page.pageNumber);
                                setSelectedFieldId(null);
                              }}
                              className="relative w-full overflow-visible rounded-[22px] border border-[#dbcbb3] bg-white shadow-sm"
                            >
                              <ContractPageImage page={page} />

                              {isLocked && signedAt && page.pageNumber === contractFile.pageCount && (
                                <div className="absolute bottom-4 left-4 z-20 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 text-xs font-black leading-5 text-emerald-700 shadow-sm">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 size={15} />
                                    נחתם דיגיטלית
                                  </div>
                                  <div>{formatSignedDate(signedAt)}</div>
                                </div>
                              )}

                              <div className="pointer-events-none absolute inset-0 z-10">
                                {pageFields.map((field) => {
                                  const selected = selectedFieldId === field.id;

                                  return (
                                    <div
                                      key={field.id}
                                      onMouseDown={(event) => startDrag(event, field)}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedFieldId(field.id);
                                        setActivePage(field.pageNumber);
                                      }}
                                      className={[
                                        "group pointer-events-auto absolute flex items-center justify-center overflow-visible rounded-xl border-2 text-center text-xs font-black shadow-sm backdrop-blur-sm transition",
                                        field.type === "venueNote"
                                          ? "bg-amber-50/95 text-[#5a3f12]"
                                          : "bg-white/85 text-[#2b241c]",
                                        isLocked ? "cursor-default" : "cursor-move",
                                        selected
                                          ? "border-[#b98121] ring-4 ring-[#b98121]/15"
                                          : "border-[#d9bd83] hover:border-[#b98121]",
                                      ].join(" ")}
                                      style={{
                                        left: `${field.x}%`,
                                        top: `${field.y}%`,
                                        width: `${field.width}%`,
                                        height: `${field.height}%`,
                                      }}
                                    >
                                      <span className="absolute right-1 top-1 text-[#b98121]/70">
                                        <GripVertical size={13} />
                                      </span>

                                      <div className="flex max-w-full items-center gap-1 truncate px-2 text-current">
                                        <span className="text-[#b98121]">
                                          {FIELD_ICONS[field.type]}
                                        </span>
                                        <span
                                          className={
                                            field.type === "venueNote"
                                              ? "whitespace-pre-wrap text-right leading-5"
                                              : "truncate"
                                          }
                                        >
                                          {getFieldPreview(field)}
                                        </span>
                                      </div>

                                      {!isLocked && (
                                        <>
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

                                          <button
                                            type="button"
                                            onMouseDown={(event) => startResize(event, field)}
                                            className="absolute -bottom-2 -right-2 hidden h-7 w-7 cursor-se-resize items-center justify-center rounded-full border border-[#d9bd83] bg-white text-[#b98121] shadow-md group-hover:flex"
                                            title="הגדלה / הקטנה"
                                          >
                                            ↘
                                          </button>
                                        </>
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
                title="הוספת שדות והערות"
                icon={<PenLine size={18} />}
                subtitle={`השדה יתווסף לעמוד ${activePage}`}
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
                      "venueNote",
                    ] as ContractFieldType[]
                  ).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addField(type)}
                      disabled={!contractFile || isLocked}
                      className={[
                        "flex h-12 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50",
                        type === "venueNote"
                          ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : "border-[#eadfce] bg-[#fffdf8] text-[#6f6252] hover:border-[#d9bd83] hover:bg-[#fbf5ea]",
                      ].join(" ")}
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

                    {selectedField.type === "venueNote" && (
                      <div>
                        <label className="mb-1 block text-xs font-black text-[#8a7b68]">
                          תוכן הערת אולם
                        </label>
                        <textarea
                          value={selectedField.value || ""}
                          disabled={isLocked}
                          onChange={(event) =>
                            updateField(selectedField.id, {
                              value: event.target.value,
                            })
                          }
                          rows={4}
                          className="w-full resize-none rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-black leading-6 text-[#2b241c] outline-none transition focus:border-[#b98121] disabled:opacity-60"
                          placeholder="לדוגמה: הלקוח מאשר תוספת תאורה והגברה..."
                        />
                      </div>
                    )}

                    <label className="flex h-12 cursor-pointer items-center justify-between rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#2b241c]">
                      <span>שדה חובה</span>
                      <input
                        type="checkbox"
                        checked={selectedField.required}
                        disabled={isLocked || selectedField.type === "venueNote"}
                        onChange={(event) =>
                          updateField(selectedField.id, {
                            required: event.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[#b98121]"
                      />
                    </label>

                    {contractFile && (
                      <div>
                        <label className="mb-1 block text-xs font-black text-[#8a7b68]">
                          עמוד השדה
                        </label>
                        <select
                          value={selectedField.pageNumber}
                          disabled={isLocked}
                          onChange={(event) =>
                            moveFieldToPage(selectedField.id, Number(event.target.value))
                          }
                          className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#2b241c] outline-none transition focus:border-[#b98121] disabled:opacity-60"
                        >
                          {contractFile.pages.map((page) => (
                            <option key={page.pageNumber} value={page.pageNumber}>
                              עמוד {page.pageNumber}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <NumberInput
                        label="מיקום X %"
                        value={selectedField.x}
                        disabled={isLocked}
                        onChange={(value) =>
                          updateField(selectedField.id, {
                            x: clamp(value, 0, 100 - selectedField.width),
                          })
                        }
                      />

                      <NumberInput
                        label="מיקום Y %"
                        value={selectedField.y}
                        disabled={isLocked}
                        onChange={(value) =>
                          updateField(selectedField.id, {
                            y: clamp(value, 0, 100 - selectedField.height),
                          })
                        }
                      />

                      <NumberInput
                        label="רוחב %"
                        value={selectedField.width}
                        disabled={isLocked}
                        onChange={(value) =>
                          updateField(selectedField.id, {
                            width: clamp(value, 4, 85),
                          })
                        }
                      />

                      <NumberInput
                        label="גובה %"
                        value={selectedField.height}
                        disabled={isLocked}
                        onChange={(value) =>
                          updateField(selectedField.id, {
                            height: clamp(value, 3, 35),
                          })
                        }
                      />
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
                  <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
                    <label className="mb-2 block text-xs font-black text-[#8a7b68]">
                      מספר טלפון לשליחת קישור חתימה
                    </label>

                    <div className="flex h-12 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3">
                      <Phone size={16} className="text-[#b98121]" />

                      <input
                        value={smsPhone}
                        onChange={(event) => setSmsPhone(event.target.value)}
                        placeholder="לדוגמה: 0521234567"
                        inputMode="tel"
                        autoComplete="tel"
                        disabled={sendingSms || isLocked}
                        className="h-full w-full bg-transparent text-sm font-black text-[#2b241c] outline-none placeholder:text-[#b8aa96] disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={sendSmsToClient}
                    disabled={!contractFile || !contractId || sendingSms || isLocked || !smsPhone.trim()}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={16} />
                    {sendingSms ? "שולח קישור..." : "שלח קישור חתימה ב-SMS"}
                  </button>

                  <button
                    type="button"
                    disabled={!signingLink}
                    onClick={() => setMobilePreviewOpen(true)}
                    className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-3 text-sm font-black text-[#9f6f1a] transition hover:bg-[#f4ead9] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <Smartphone size={16} className="text-[#b98121]" />
                      תצוגה מקדימה במובייל
                    </span>
                    <Eye size={15} />
                  </button>

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
                    onClick={() => {
                      if (!viewLink) return;
                      window.open(viewLink, "_blank", "noopener,noreferrer");
                    }}
                    className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <Eye size={16} className="text-[#b98121]" />
                      צפייה בהסכם חתום
                    </span>
                    <Eye size={15} />
                  </button>

                </div>

                {isLocked && signedAt && (
                  <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-black leading-6 text-emerald-700">
                    <div>נחתם דיגיטלית</div>
                    <div>{formatSignedDate(signedAt)}</div>
                    <div>ההסכם נעול לצפייה בלבד.</div>
                  </div>
                )}
              </SideBox>
            </aside>
          </div>
        )}
      </div>

      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-3">
          <div className="relative flex h-[92vh] w-full max-w-[430px] flex-col overflow-hidden rounded-[34px] border border-[#eadfce] bg-[#f8f6f2] shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-[#eadfce] bg-white px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
                  <Smartphone size={19} />
                </div>

                <div>
                  <div className="text-sm font-black text-[#2b241c]">
                    תצוגה מקדימה במובייל
                  </div>
                  <div className="text-[11px] font-bold text-[#8a7b68]">
                    כך הלקוח יראה את קישור החתימה
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobilePreviewOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-[#6f6252] transition hover:bg-[#fbf5ea]"
                aria-label="סגירת תצוגה מקדימה"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden bg-[#f3eee5]">
              <iframe
                src={signingLink}
                title="תצוגה מקדימה במובייל"
                className="h-full w-full border-0 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ContractPageImage({ page }: { page: ContractPage }) {
  const src = page.imageUrl || (page.type === "image" ? page.url : "");

  if (!src) {
    return (
      <div className="flex min-h-[760px] flex-col items-center justify-center rounded-[22px] bg-white p-8 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#f4ead9] text-[#b98121]">
          <Save size={26} />
        </div>

        <div className="text-base font-black text-[#2b241c]">
          שמרי את ההסכם כדי להציג את עמוד ה-PDF באיכות גבוהה
        </div>

        <div className="mt-2 max-w-md text-sm font-bold leading-6 text-[#8a7b68]">
          לאחר שמירה, השרת ייצור תמונת עמוד מ-Cloudinary והעמוד יוצג כאן ללא קנבס.
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`עמוד ${page.pageNumber}`}
      draggable={false}
      className="block h-auto w-full select-none rounded-[22px] bg-white"
    />
  );
}

function NumberInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-black text-[#8a7b68]">
        {label}
      </label>

      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#2b241c] outline-none transition focus:border-[#b98121] disabled:opacity-60"
      />
    </div>
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