"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  EMPLOYEE_AGREEMENT_TEMPLATE_TYPES,
  type EmployeeAgreementTemplateType,
  getTemplateDefaultName,
  getTemplateTypeLabel,
  normalizeTemplateType,
  TEMPLATE_TYPE_LABELS,
} from "@/lib/employeeAgreementTemplateTypes";
import { DATE_FIELD_PLACEHOLDER } from "@/lib/dateFieldFormat";

type FieldType = "text" | "date" | "signature" | "checkbox";

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

type DragState = {
  id: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  mode: "move" | "resize";
};

const DEFAULT_FILE_URL = "/templates/employee-agreement-invistimo.pdf";
const DEFAULT_PAGE_COUNT = 11;

const LEGACY_PAGE_WIDTH = 700;
const LEGACY_PAGE_HEIGHT = 900;

const FIELD_LABELS: Record<FieldType, string> = {
  text: "שדה טקסט",
  date: "תאריך",
  signature: "חתימה",
  checkbox: "",
};

const FIELD_TYPE_NAMES: Record<FieldType, string> = {
  text: "שדה טקסט",
  date: "תאריך",
  signature: "חתימה",
  checkbox: "ריבוע סימון",
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizePageType(value: unknown): TemplatePage["type"] {
  return String(value || "") === "pdf" ? "pdf" : "image";
}

function normalizeField(raw: any, index: number): TemplateField {
  const rawType = String(raw?.type || "text");
  const type: FieldType =
    rawType === "date" || rawType === "signature" || rawType === "checkbox"
      ? rawType
      : "text";

  let width = toNumber(
    raw?.width,
    type === "signature" ? 24 : type === "checkbox" ? 5 : 22
  );
  let height = toNumber(
    raw?.height,
    type === "signature" ? 8 : type === "checkbox" ? 5 : 6
  );
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
    id: String(raw?.id || makeId()),
    label: String(raw?.label || FIELD_LABELS[type] || "שדה"),
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

function buildPagesFromTemplate(template: any): TemplatePage[] {
  const pageCount = Math.max(
    1,
    toNumber(template?.pageCount, DEFAULT_PAGE_COUNT)
  );

  const rawPages = Array.isArray(template?.pages) ? template.pages : [];

  if (rawPages.length > 0) {
    return rawPages.map((page: any, index: number): TemplatePage => {
      const pageNumber = Math.max(
        1,
        toNumber(
          page?.pageNumber,
          page?.pageIndex !== undefined ? page.pageIndex + 1 : index + 1
        )
      );

      return {
        pageIndex: pageNumber - 1,
        pageNumber,
        url: String(page?.url || template?.fileUrl || DEFAULT_FILE_URL),
        imageUrl: String(page?.imageUrl || ""),
        name: String(page?.name || `עמוד ${pageNumber}`),
        type: normalizePageType(page?.type),
      };
    });
  }

  return Array.from({ length: pageCount }).map((_, index): TemplatePage => ({
    pageIndex: index,
    pageNumber: index + 1,
    url: String(template?.fileUrl || DEFAULT_FILE_URL),
    imageUrl: "",
    name: `עמוד ${index + 1}`,
    type: "image",
  }));
}

export default function AgreementTemplatePage() {
  return (
    <Suspense
      fallback={
        <main dir="rtl" className="min-h-screen bg-slate-50 p-5 text-slate-950">
          <div className="mx-auto max-w-7xl rounded-[28px] border border-slate-200 bg-white p-8 text-center text-sm font-black text-slate-500">
            טוען עורך תבניות...
          </div>
        </main>
      }
    >
      <AgreementTemplateEditor />
    </Suspense>
  );
}

function AgreementTemplateEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const templateType = normalizeTemplateType(searchParams.get("type"));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pageEditorRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const dragRef = useRef<DragState | null>(null);

  const [fileUrl, setFileUrl] = useState(DEFAULT_FILE_URL);
  const [pageCount, setPageCount] = useState(DEFAULT_PAGE_COUNT);
  const [pages, setPages] = useState<TemplatePage[]>([]);

  const [activePageIndex, setActivePageIndex] = useState(0);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selectedId, setSelectedId] = useState("");

  const [draggingId, setDraggingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [message, setMessage] = useState("");
  const [employees, setEmployees] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [sending, setSending] = useState(false);

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedId) || null,
    [fields, selectedId]
  );

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.order - b.order),
    [fields]
  );

  const hasPageImages = pages.some((page) => Boolean(page.imageUrl));

  function applyTemplateToState(template: any) {
    const nextFileUrl = String(template?.fileUrl || DEFAULT_FILE_URL);
    const nextPageCount = Math.max(
      1,
      toNumber(template?.pageCount, DEFAULT_PAGE_COUNT)
    );

    const nextPages = buildPagesFromTemplate({
      ...template,
      fileUrl: nextFileUrl,
      pageCount: nextPageCount,
    });

    setFileUrl(nextFileUrl);
    setPageCount(nextPageCount);
    setPages(nextPages);

    setFields(
      Array.isArray(template?.fields)
        ? template.fields.map((field: any, index: number) =>
            normalizeField(field, index)
          )
        : []
    );

    setActivePageIndex(0);
    setSelectedId("");
  }

  async function loadTemplate(type: EmployeeAgreementTemplateType = templateType) {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(
        `/api/employee-agreement-templates/current?templateType=${encodeURIComponent(type)}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await res.json().catch(() => null);
      const template = data?.template || {};

      applyTemplateToState(template);
    } catch {
      setMessage("לא נטענה תבנית קיימת");

      applyTemplateToState({
        fileUrl: DEFAULT_FILE_URL,
        pageCount: DEFAULT_PAGE_COUNT,
        pages: [],
        fields: [],
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplate(templateType);
  }, [templateType]);

  useEffect(() => {
    async function loadEmployees() {
      try {
        setEmployeesLoading(true);

        const res = await fetch("/api/admin/employees", {
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);
        const rows = Array.isArray(data?.employees) ? data.employees : [];

        setEmployees(
          rows
            .map((employee: any) => ({
              id: String(employee.id || employee._id || ""),
              name: String(employee.name || employee.fullName || "עובד ללא שם"),
              email: String(employee.email || ""),
            }))
            .filter((employee) => employee.id),
        );
      } catch {
        setEmployees([]);
      } finally {
        setEmployeesLoading(false);
      }
    }

    void loadEmployees();
  }, []);

  async function sendToEmployee() {
    if (!selectedEmployeeId) {
      alert("בחרי עובד לשליחה");
      return;
    }

    if (!hasPageImages) {
      alert("קודם צריך להעלות PDF ולשמור את התבנית");
      return;
    }

    try {
      setSending(true);
      setMessage("");

      const res = await fetch("/api/admin/employee-agreements/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          templateType,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בשליחה לעובד");
      }

      setMessage(data?.message || "המסמך נשלח לעובד בהצלחה");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "שגיאה בשליחה לעובד");
    } finally {
      setSending(false);
    }
  }

  function switchTemplateType(nextType: EmployeeAgreementTemplateType) {
    if (nextType === templateType) return;

    router.push(
      `/admin/employees/agreement-template?type=${encodeURIComponent(nextType)}`
    );
  }

  useEffect(() => {
    if (!draggingId) return;

    function handlePointerMove(event: PointerEvent) {
      const activeDrag = dragRef.current;
      if (!activeDrag) return;

      const field = fields.find((item) => item.id === activeDrag.id);
      if (!field) return;

      const editor = pageEditorRefs.current[field.pageIndex];
      if (!editor) return;

      const rect = editor.getBoundingClientRect();

      const dx = ((event.clientX - activeDrag.startClientX) / rect.width) * 100;
      const dy = ((event.clientY - activeDrag.startClientY) / rect.height) * 100;

      setFields((prev) =>
        prev.map((item) => {
          if (item.id !== activeDrag.id) return item;

          if (activeDrag.mode === "resize") {
            const nextWidth = clamp(
              activeDrag.startWidth + dx,
              4,
              100 - item.x
            );

            const nextHeight = clamp(
              activeDrag.startHeight + dy,
              3,
              100 - item.y
            );

            return {
              ...item,
              width: Number(nextWidth.toFixed(2)),
              height: Number(nextHeight.toFixed(2)),
            };
          }

          const nextX = clamp(activeDrag.startX + dx, 0, 100 - item.width);
          const nextY = clamp(activeDrag.startY + dy, 0, 100 - item.height);

          return {
            ...item,
            x: Number(nextX.toFixed(2)),
            y: Number(nextY.toFixed(2)),
          };
        })
      );
    }

    function handlePointerUp() {
      dragRef.current = null;
      setDraggingId("");
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [draggingId, fields]);

  function scrollToPage(pageIndex: number) {
    const safePageIndex = clamp(pageIndex, 0, pageCount - 1);

    setActivePageIndex(safePageIndex);
    setSelectedId("");

    requestAnimationFrame(() => {
      pageEditorRefs.current[safePageIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function addField(type: FieldType) {
    if (!hasPageImages) {
      alert("קודם צריך להעלות PDF וליצור תמונות עמודים.");
      return;
    }

    const width =
      type === "signature" ? 24 : type === "date" ? 18 : type === "checkbox" ? 5 : 22;
    const height = type === "signature" ? 8 : type === "checkbox" ? 5 : 6;

    const field: TemplateField = {
      id: makeId(),
      label: type === "checkbox" ? "" : FIELD_LABELS[type],
      type,
      pageIndex: activePageIndex,
      x: 38,
      y: 35,
      width,
      height,
      required: true,
      order: fields.length + 1,
    };

    setFields((prev) => [...prev, field]);
    setSelectedId(field.id);

    requestAnimationFrame(() => {
      pageEditorRefs.current[activePageIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function updateField(id: string, patch: Partial<TemplateField>) {
    setFields((prev) =>
      prev.map((field) => {
        if (field.id !== id) return field;

        const nextField = {
          ...field,
          ...patch,
        };

        const width = clamp(toNumber(nextField.width, field.width), 4, 85);
        const height = clamp(toNumber(nextField.height, field.height), 3, 35);

        return {
          ...nextField,
          width,
          height,
          x: clamp(toNumber(nextField.x, field.x), 0, 100 - width),
          y: clamp(toNumber(nextField.y, field.y), 0, 100 - height),
        };
      })
    );
  }

  function deleteField(id: string) {
    setFields((prev) => prev.filter((field) => field.id !== id));

    if (selectedId === id) {
      setSelectedId("");
    }
  }

  function moveFieldToPage(id: string, pageIndex: number) {
    const safePageIndex = clamp(pageIndex, 0, pageCount - 1);

    updateField(id, { pageIndex: safePageIndex });
    setActivePageIndex(safePageIndex);

    requestAnimationFrame(() => {
      pageEditorRefs.current[safePageIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function startDrag(
    event: React.PointerEvent<HTMLDivElement>,
    field: TemplateField
  ) {
    event.preventDefault();
    event.stopPropagation();

    setSelectedId(field.id);
    setActivePageIndex(field.pageIndex);

    dragRef.current = {
      id: field.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: field.x,
      startY: field.y,
      startWidth: field.width,
      startHeight: field.height,
      mode: "move",
    };

    setDraggingId(field.id);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function startResize(
    event: React.PointerEvent<HTMLButtonElement>,
    field: TemplateField
  ) {
    event.preventDefault();
    event.stopPropagation();

    setSelectedId(field.id);
    setActivePageIndex(field.pageIndex);

    dragRef.current = {
      id: field.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: field.x,
      startY: field.y,
      startWidth: field.width,
      startHeight: field.height,
      mode: "resize",
    };

    setDraggingId(field.id);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function getFieldPreview(field: TemplateField) {
    if (field.type === "checkbox") return "";

    if (field.type === "date") return DATE_FIELD_PLACEHOLDER;

    if (field.label?.trim()) return field.label.trim();

    if (field.type === "signature") return "חתימה";

    return "שדה טקסט";
  }
  async function saveTemplate(pdfFile?: File) {
    try {
      setSaving(!pdfFile);
      setUploadingPdf(Boolean(pdfFile));
      setMessage("");

      const endpoint = "/api/employee-agreement-templates/save";

      let res: Response;

      const templateName = getTemplateDefaultName(templateType);

      if (pdfFile) {
        const formData = new FormData();

        formData.append("file", pdfFile);
        formData.append("templateType", templateType);
        formData.append("name", templateName);
        formData.append("fileUrl", fileUrl || DEFAULT_FILE_URL);
        formData.append("pageCount", String(pageCount || DEFAULT_PAGE_COUNT));
        formData.append("pages", JSON.stringify([]));
        formData.append("fields", JSON.stringify([]));
        formData.append("isActive", "true");
        formData.append("coordinateMode", "percent");

        res = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
      } else {
        res = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateType,
            name: templateName,
            fileUrl,
            pageCount,
            pages,
            fields,
            isActive: true,
            coordinateMode: "percent",
          }),
        });
      }

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בשמירת התבנית");
      }

      if (data?.template) {
        applyTemplateToState(data.template);
      }

      setMessage(
        pdfFile
          ? "ה־PDF הועלה בהצלחה והתבנית התעדכנה אוטומטית"
          : "התבנית נשמרה בהצלחה"
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "שגיאה בשמירת התבנית");
    } finally {
      setSaving(false);
      setUploadingPdf(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleUploadPdf(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("אפשר להעלות רק קובץ PDF");
      event.target.value = "";
      return;
    }

    await saveTemplate(file);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-5 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-black">
                {getTemplateTypeLabel(templateType)}
              </h1>

              <p className="mt-2 text-sm font-bold text-slate-500">
                העלאת PDF, יצירת תמונות עמודים אוטומטית, מיקום שדות באחוזים ושמירה לפי עמוד.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleUploadPdf}
                disabled={uploadingPdf || saving || loading}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPdf || saving || loading}
                className="inline-flex h-11 items-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {uploadingPdf ? "מעלה וממיר..." : "העלאת PDF"}
              </button>

              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                פתיחת PDF
              </a>

              <button
                type="button"
                onClick={() => saveTemplate()}
                disabled={saving || uploadingPdf || loading}
                className="h-11 rounded-2xl bg-violet-600 px-6 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? "שומר..." : "שמירת תבנית"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {(
              Object.values(
                EMPLOYEE_AGREEMENT_TEMPLATE_TYPES
              ) as EmployeeAgreementTemplateType[]
            ).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => switchTemplateType(type)}
                disabled={loading || saving || uploadingPdf}
                className={`rounded-2xl border px-4 py-2.5 text-xs font-black transition disabled:opacity-50 ${
                  templateType === type
                    ? "border-violet-500 bg-violet-600 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-violet-200 hover:bg-violet-50"
                }`}
              >
                {TEMPLATE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-black text-slate-500">
                שליחה לעובד
              </label>

              <select
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                disabled={employeesLoading || sending || loading}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:border-violet-400 disabled:opacity-50"
              >
                <option value="">
                  {employeesLoading ? "טוען עובדים..." : "בחרי עובד מהרשימה"}
                </option>

                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                    {employee.email ? ` · ${employee.email}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => void sendToEmployee()}
              disabled={
                sending ||
                employeesLoading ||
                loading ||
                !selectedEmployeeId ||
                !hasPageImages
              }
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? "שולח..." : "שליחה לעובד"}
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-700">
            {message}
          </div>
        )}

        {!hasPageImages && !loading && (
          <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-black leading-6 text-amber-800">
            עדיין לא נוצרו תמונות לעמודי ה־PDF. לחצי על <span className="font-black">העלאת PDF</span>,
            בחרי את קובץ ההסכם, והמערכת תעלה ותמיר אותו אוטומטית לתמונות עמודים.
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-black">מיקום שדות על ההסכם</h2>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  כל עמוד מוצג כתמונה, והשדות מוצמדים אליו באחוזים.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {pages.map((page) => {
                  const count = fields.filter(
                    (field) => field.pageIndex === page.pageIndex
                  ).length;

                  return (
                    <button
                      key={page.pageIndex}
                      type="button"
                      onClick={() => scrollToPage(page.pageIndex)}
                      className={`h-10 rounded-2xl border px-4 text-xs font-black transition ${
                        activePageIndex === page.pageIndex
                          ? "border-violet-500 bg-violet-600 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      עמוד {page.pageNumber} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {loading || uploadingPdf ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-[28px] bg-slate-50 text-sm font-black text-slate-500">
                {uploadingPdf
                  ? "מעלה PDF ומייצר תמונות עמודים..."
                  : "טוען תבנית..."}
              </div>
            ) : (
              <div className="h-[calc(100vh-230px)] overflow-y-auto overflow-x-hidden rounded-[24px] bg-slate-100 p-4">
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

                        <div
                          ref={(node) => {
                            pageEditorRefs.current[page.pageIndex] = node;
                          }}
                          onClick={() => {
                            setActivePageIndex(page.pageIndex);
                            setSelectedId("");
                          }}
                          className="relative w-full overflow-visible rounded-[22px] border border-slate-300 bg-white shadow-sm"
                        >
                          <TemplatePageImage page={page} />

                          <div className="pointer-events-none absolute inset-0 z-10">
                            {pageFields.map((field) => {
                              const selected = selectedId === field.id;

                              return (
                                <div
                                  key={field.id}
                                  onPointerDown={(event) =>
                                    startDrag(event, field)
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedId(field.id);
                                    setActivePageIndex(field.pageIndex);
                                  }}
                                  className={[
                                    "group pointer-events-auto absolute flex items-center justify-center overflow-visible text-center text-xs font-black shadow-sm backdrop-blur-sm transition",
                                    field.type === "checkbox"
                                      ? "cursor-move rounded-md border-2 border-slate-700 bg-white"
                                      : "cursor-move rounded-xl border-2 bg-white/85 text-slate-900",
                                    selected
                                      ? "border-violet-600 ring-4 ring-violet-600/15"
                                      : field.type === "checkbox"
                                        ? "border-slate-700 hover:border-violet-500"
                                        : "border-slate-500 hover:border-violet-500",
                                  ].join(" ")}
                                  style={{
                                    left: `${field.x}%`,
                                    top: `${field.y}%`,
                                    width: `${field.width}%`,
                                    height: `${field.height}%`,
                                    touchAction: "none",
                                    userSelect: "none",
                                  }}
                                >
                                  <span className="absolute right-1 top-1 text-slate-400">
                                    ⋮⋮
                                  </span>

                                  <div
                                    className={[
                                      "max-w-full truncate px-2",
                                      field.type === "date"
                                        ? "font-mono text-[10px] text-slate-400"
                                        : "",
                                    ].join(" ")}
                                  >
                                    {field.type === "checkbox"
                                      ? null
                                      : getFieldPreview(field)}
                                  </div>

                                  <button
                                    type="button"
                                    onPointerDown={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                    }}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      deleteField(field.id);
                                    }}
                                    className="absolute -left-2 -top-2 hidden h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-md group-hover:flex"
                                    title="מחיקת שדה"
                                  >
                                    ×
                                  </button>

                                  <button
                                    type="button"
                                    onPointerDown={(event) =>
                                      startResize(event, field)
                                    }
                                    className="absolute -bottom-2 -right-2 hidden h-7 w-7 cursor-se-resize items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 shadow-md group-hover:flex"
                                    title="הגדלה / הקטנה"
                                  >
                                    ↘
                                  </button>
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
            )}
          </section>

          <aside className="space-y-5">
            <SideBox title="הוספת שדות">
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => addField("text")}
                  disabled={loading || uploadingPdf || !hasPageImages}
                  className="h-12 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40"
                >
                  הוסף שדה טקסט
                </button>

                <button
                  type="button"
                  onClick={() => addField("date")}
                  disabled={loading || uploadingPdf || !hasPageImages}
                  className="h-12 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40"
                >
                  הוסף שדה תאריך
                </button>

                <button
                  type="button"
                  onClick={() => addField("signature")}
                  disabled={loading || uploadingPdf || !hasPageImages}
                  className="h-12 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40"
                >
                  הוסף שדה חתימה
                </button>

                <button
                  type="button"
                  onClick={() => addField("checkbox")}
                  disabled={loading || uploadingPdf || !hasPageImages}
                  className="h-12 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40"
                >
                  הוסף תיבת סימון
                </button>
              </div>

              <div className="mt-5">
                <h3 className="mb-2 text-sm font-black text-slate-800">
                  מעבר עמודים
                </h3>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => scrollToPage(activePageIndex - 1)}
                    disabled={activePageIndex <= 0}
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black disabled:opacity-40"
                  >
                    הקודם
                  </button>

                  <div
                    dir="ltr"
                    className="flex h-10 items-center rounded-2xl bg-slate-100 px-4 text-sm font-black"
                  >
                    {activePageIndex + 1} / {pageCount}
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollToPage(activePageIndex + 1)}
                    disabled={activePageIndex >= pageCount - 1}
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black disabled:opacity-40"
                  >
                    הבא
                  </button>
                </div>
              </div>
            </SideBox>

            <SideBox title="עריכת שדה">
              {!selectedField ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-black leading-6 text-slate-500">
                  בחרי שדה מהמסמך או מהרשימה למטה כדי לשנות את שמו
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-black text-slate-500">
                      שם השדה לעובד
                    </label>

                    <input
                      value={selectedField.label}
                      onChange={(event) =>
                        updateField(selectedField.id, {
                          label: event.target.value,
                        })
                      }
                      placeholder="לדוגמה: שם מלא, תאריך סיום..."
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:border-violet-400"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                    סוג שדה: {FIELD_TYPE_NAMES[selectedField.type]}
                  </div>

                  <label className="flex h-12 cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800">
                    <span>שדה חובה</span>

                    <input
                      type="checkbox"
                      checked={selectedField.required}
                      onChange={(event) =>
                        updateField(selectedField.id, {
                          required: event.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-violet-600"
                    />
                  </label>

                  <div>
                    <label className="mb-1 block text-xs font-black text-slate-500">
                      עמוד השדה
                    </label>

                    <select
                      value={selectedField.pageIndex}
                      onChange={(event) =>
                        moveFieldToPage(
                          selectedField.id,
                          Number(event.target.value)
                        )
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:border-violet-400"
                    >
                      {pages.map((page) => (
                        <option key={page.pageIndex} value={page.pageIndex}>
                          עמוד {page.pageNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <NumberInput
                      label="מיקום X %"
                      value={selectedField.x}
                      onChange={(value) =>
                        updateField(selectedField.id, {
                          x: clamp(value, 0, 100 - selectedField.width),
                        })
                      }
                    />

                    <NumberInput
                      label="מיקום Y %"
                      value={selectedField.y}
                      onChange={(value) =>
                        updateField(selectedField.id, {
                          y: clamp(value, 0, 100 - selectedField.height),
                        })
                      }
                    />

                    <NumberInput
                      label="רוחב %"
                      value={selectedField.width}
                      onChange={(value) =>
                        updateField(selectedField.id, {
                          width: clamp(value, 4, 85),
                        })
                      }
                    />

                    <NumberInput
                      label="גובה %"
                      value={selectedField.height}
                      onChange={(value) =>
                        updateField(selectedField.id, {
                          height: clamp(value, 3, 35),
                        })
                      }
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteField(selectedField.id)}
                    className="h-11 w-full rounded-2xl bg-rose-600 px-4 text-sm font-black text-white hover:bg-rose-700"
                  >
                    מחיקת שדה
                  </button>
                </div>
              )}
            </SideBox>

            <SideBox title="שדות שהוגדרו">
              <div className="space-y-2">
                {sortedFields.length === 0 && (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    עדיין לא הוגדרו שדות.
                  </p>
                )}

                {sortedFields.map((field, index) => (
                  <div
                    key={field.id}
                    className={`rounded-2xl border p-3 ${
                      selectedId === field.id
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(field.id);
                        scrollToPage(field.pageIndex);
                      }}
                      className="mb-2 w-full text-right text-xs font-black text-slate-500"
                    >
                      {index + 1}. {FIELD_TYPE_NAMES[field.type]} — עמוד{" "}
                      {field.pageIndex + 1}
                    </button>

                    <input
                      value={field.label}
                      onFocus={() => {
                        setSelectedId(field.id);
                        setActivePageIndex(field.pageIndex);
                      }}
                      onChange={(event) =>
                        updateField(field.id, {
                          label: event.target.value,
                        })
                      }
                      placeholder="שם השדה"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black outline-none focus:border-violet-400"
                    />
                  </div>
                ))}
              </div>
            </SideBox>
          </aside>
        </div>
      </div>
    </main>
  );
}

function TemplatePageImage({ page }: { page: TemplatePage }) {
  if (!page.imageUrl) {
    return (
      <div
        className="flex w-full flex-col items-center justify-center rounded-[22px] bg-white p-8 text-center"
        style={{
          aspectRatio: "1 / 1.4142",
        }}
      >
        <div className="text-base font-black text-slate-800">
          אין עדיין תמונת עמוד להצגה איכותית
        </div>

        <div className="mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
          לחצי על העלאת PDF כדי שהמערכת תיצור תמונות עמודים אוטומטית.
        </div>
      </div>
    );
  }

  return (
    <img
      src={page.imageUrl}
      alt={`עמוד ${page.pageNumber}`}
      draggable={false}
      className="block h-auto w-full select-none rounded-[22px] bg-white"
    />
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-black text-slate-500">
        {label}
      </label>

      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:border-violet-400"
      />
    </div>
  );
}

function SideBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-black text-slate-900">{title}</h3>
      {children}
    </div>
  );
}