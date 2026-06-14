"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist";

if (typeof window !== "undefined") {
  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
}

type FieldType = "text" | "date" | "signature";

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

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
};

type PageSize = {
  width: number;
  height: number;
};

type PdfRenderTask = {
  cancel: () => void;
  promise: Promise<void>;
};

const DEFAULT_FILE_URL = "/templates/employee-agreement-invistimo.pdf";
const MAX_PAGE_WIDTH = 700;

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function AgreementTemplatePage() {
  const pdfWrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const [fileUrl, setFileUrl] = useState(DEFAULT_FILE_URL);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(11);
  const [pageSize, setPageSize] = useState<PageSize>({
    width: MAX_PAGE_WIDTH,
    height: 900,
  });

  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [dragId, setDragId] = useState("");

  const [loadingPdf, setLoadingPdf] = useState(true);
  const [renderingPage, setRenderingPage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const currentFields = useMemo(
    () => fields.filter((f) => f.pageIndex === pageIndex),
    [fields, pageIndex]
  );

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedId) || null,
    [fields, selectedId]
  );

  async function loadTemplate() {
    try {
      const res = await fetch("/api/employee-agreement-templates/current", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (data?.template) {
        setFileUrl(data.template.fileUrl || DEFAULT_FILE_URL);
        setFields(Array.isArray(data.template.fields) ? data.template.fields : []);
        setPageCount(Number(data.template.pageCount) || 11);
      }
    } catch {
      setMessage("לא נטענה תבנית קיימת");
    }
  }

  useEffect(() => {
    void loadTemplate();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      try {
        setLoadingPdf(true);
        setMessage("");

        const task = getDocument({
          url: fileUrl,
          withCredentials: true,
        });

        const pdf = await task.promise;

        if (cancelled) return;

        setPdfDoc(pdf);
        setPageCount(pdf.numPages);

        setPageIndex((current) =>
          clamp(current, 0, Math.max(0, pdf.numPages - 1))
        );
      } catch {
        if (!cancelled) {
          setMessage("לא ניתן לטעון את קובץ ה־PDF");
        }
      } finally {
        if (!cancelled) {
          setLoadingPdf(false);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!pdfDoc) return;

    const activePdfDoc = pdfDoc;

    let cancelled = false;
    let renderTask: PdfRenderTask | null = null;

    async function renderPage() {
      try {
        setRenderingPage(true);
        setMessage("");

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const page = await activePdfDoc.getPage(pageIndex + 1);

        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = MAX_PAGE_WIDTH / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        setPageSize({
          width: viewport.width,
          height: viewport.height,
        });

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        }) as PdfRenderTask;

        await renderTask.promise;
      } catch (err: unknown) {
        const errorName =
          err && typeof err === "object" && "name" in err
            ? String((err as { name?: unknown }).name)
            : "";

        if (errorName !== "RenderingCancelledException" && !cancelled) {
          setMessage("שגיאה בהצגת עמוד ה־PDF");
        }
      } finally {
        if (!cancelled) {
          setRenderingPage(false);
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;

      try {
        renderTask?.cancel();
      } catch {
        // ignore
      }
    };
  }, [pdfDoc, pageIndex]);

  useEffect(() => {
    if (!dragId) return;

    function handlePointerMove(event: PointerEvent) {
      const activeDrag = dragRef.current;
      const wrap = pdfWrapRef.current;

      if (!activeDrag || !wrap) return;

      const rect = wrap.getBoundingClientRect();

      setFields((prev) =>
        prev.map((field) => {
          if (field.id !== activeDrag.id) return field;

          const maxX = Math.max(0, rect.width - field.width);
          const maxY = Math.max(0, rect.height - field.height);

          const nextX = clamp(
            Math.round(event.clientX - rect.left - activeDrag.offsetX),
            0,
            maxX
          );

          const nextY = clamp(
            Math.round(event.clientY - rect.top - activeDrag.offsetY),
            0,
            maxY
          );

          if (field.x === nextX && field.y === nextY) return field;

          return {
            ...field,
            x: nextX,
            y: nextY,
          };
        })
      );
    }

    function handlePointerUp() {
      dragRef.current = null;
      setDragId("");
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragId]);

  function addField(type: FieldType) {
    const fieldWidth = type === "signature" ? 180 : 160;
    const fieldHeight = type === "signature" ? 70 : 32;

    const field: TemplateField = {
      id: makeId(),
      label:
        type === "signature"
          ? "חתימה"
          : type === "date"
          ? "תאריך"
          : "שדה טקסט",
      type,
      pageIndex,
      x: clamp(120, 0, Math.max(0, pageSize.width - fieldWidth)),
      y: clamp(120, 0, Math.max(0, pageSize.height - fieldHeight)),
      width: fieldWidth,
      height: fieldHeight,
      required: true,
      order: fields.length + 1,
    };

    setFields((prev) => [...prev, field]);
    setSelectedId(field.id);
  }

  function updateField(id: string, patch: Partial<TemplateField>) {
    setFields((prev) =>
      prev.map((field) => {
        if (field.id !== id) return field;

        const nextField = {
          ...field,
          ...patch,
        };

        const fixedWidth = Math.max(20, Number(nextField.width) || 20);
        const fixedHeight = Math.max(20, Number(nextField.height) || 20);

        return {
          ...nextField,
          width: fixedWidth,
          height: fixedHeight,
          x: clamp(
            Number(nextField.x) || 0,
            0,
            Math.max(0, pageSize.width - fixedWidth)
          ),
          y: clamp(
            Number(nextField.y) || 0,
            0,
            Math.max(0, pageSize.height - fixedHeight)
          ),
        };
      })
    );
  }

  function deleteField(id: string) {
    setFields((prev) => prev.filter((field) => field.id !== id));
    setSelectedId("");
    dragRef.current = null;
    setDragId("");
  }

  function changePage(nextPage: number) {
    dragRef.current = null;
    setDragId("");
    setPageIndex(clamp(nextPage, 0, pageCount - 1));
  }

  function startDrag(
    event: React.PointerEvent<HTMLDivElement>,
    field: TemplateField
  ) {
    event.preventDefault();
    event.stopPropagation();

    const wrap = pdfWrapRef.current;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();

    dragRef.current = {
      id: field.id,
      offsetX: event.clientX - rect.left - field.x,
      offsetY: event.clientY - rect.top - field.y,
    };

    setDragId(field.id);
    setSelectedId(field.id);

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  async function saveTemplate() {
    try {
      setSaving(true);
      setMessage("");

      const res = await fetch("/api/employee-agreement-templates/save", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "תבנית הסכם עבודה",
          fileUrl,
          pageCount,
          fields,
          isActive: true,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "שגיאה בשמירת התבנית");
      }

      setMessage("התבנית נשמרה בהצלחה");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "שגיאה בשמירת התבנית");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-5 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black">תבנית הסכם עבודה</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              הוסיפי שדות על ה־PDF, גררי למיקום הרצוי, ושמרי. העובד ימלא שדה־שדה לפי סדר ההוספה.
            </p>
          </div>

          <button
            type="button"
            onClick={saveTemplate}
            disabled={saving || loadingPdf}
            className="h-11 rounded-2xl bg-violet-600 px-6 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמירת תבנית"}
          </button>
        </div>

        {message && (
          <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-700">
            {message}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">הוספת שדות</h2>

            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={() => addField("text")}
                disabled={loadingPdf || renderingPage}
                className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40"
              >
                הוסף שדה טקסט
              </button>

              <button
                type="button"
                onClick={() => addField("date")}
                disabled={loadingPdf || renderingPage}
                className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40"
              >
                הוסף שדה תאריך
              </button>

              <button
                type="button"
                onClick={() => addField("signature")}
                disabled={loadingPdf || renderingPage}
                className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40"
              >
                הוסף שדה חתימה
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-black text-slate-900">עמוד</h3>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => changePage(pageIndex - 1)}
                  disabled={pageIndex <= 0 || loadingPdf}
                  className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black disabled:opacity-40"
                >
                  הקודם
                </button>

                <div
                  dir="ltr"
                  className="flex h-10 items-center rounded-2xl bg-slate-100 px-4 text-sm font-black"
                >
                  {pageIndex + 1} / {pageCount}
                </div>

                <button
                  type="button"
                  onClick={() => changePage(pageIndex + 1)}
                  disabled={pageIndex >= pageCount - 1 || loadingPdf}
                  className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black disabled:opacity-40"
                >
                  הבא
                </button>
              </div>
            </div>

            {selectedField && (
              <div className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-4">
                <h3 className="text-sm font-black text-violet-900">
                  עריכת שדה
                </h3>

                <label className="mt-4 block text-xs font-black text-slate-600">
                  שם השדה לעובד
                </label>

                <input
                  value={selectedField.label}
                  onChange={(e) =>
                    updateField(selectedField.id, { label: e.target.value })
                  }
                  className="mt-2 h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-violet-400"
                />

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-600">
                      רוחב
                    </label>

                    <input
                      type="number"
                      min={20}
                      value={selectedField.width}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          width: Math.max(20, Number(e.target.value) || 20),
                        })
                      }
                      className="mt-2 h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-violet-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-600">
                      גובה
                    </label>

                    <input
                      type="number"
                      min={20}
                      value={selectedField.height}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          height: Math.max(20, Number(e.target.value) || 20),
                        })
                      }
                      className="mt-2 h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-violet-400"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-600">
                      מיקום X
                    </label>

                    <input
                      type="number"
                      min={0}
                      value={selectedField.x}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          x: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="mt-2 h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-violet-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-600">
                      מיקום Y
                    </label>

                    <input
                      type="number"
                      min={0}
                      value={selectedField.y}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          y: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="mt-2 h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-violet-400"
                    />
                  </div>
                </div>

                <label className="mt-4 flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(e) =>
                      updateField(selectedField.id, {
                        required: e.target.checked,
                      })
                    }
                  />
                  שדה חובה
                </label>

                <button
                  type="button"
                  onClick={() => deleteField(selectedField.id)}
                  className="mt-4 h-10 rounded-2xl bg-rose-600 px-4 text-sm font-black text-white hover:bg-rose-700"
                >
                  מחיקת שדה
                </button>
              </div>
            )}

            <div className="mt-6 rounded-3xl bg-slate-50 p-4">
              <h3 className="text-sm font-black">שדות שהוגדרו</h3>

              <div className="mt-3 space-y-2">
                {fields.length === 0 && (
                  <p className="text-sm font-bold text-slate-500">
                    עדיין לא הוגדרו שדות.
                  </p>
                )}

                {[...fields]
                  .sort((a, b) => a.order - b.order)
                  .map((field, index) => (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(field.id);
                        changePage(field.pageIndex);
                      }}
                      className={`w-full rounded-2xl border p-3 text-right text-xs font-black ${
                        selectedId === field.id
                          ? "border-violet-300 bg-violet-50 text-violet-800"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {index + 1}. {field.label} — עמוד {field.pageIndex + 1}
                    </button>
                  ))}
              </div>
            </div>
          </aside>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black">מיקום שדות על ההסכם</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  כפתורי הבא/הקודם מחליפים עמוד אמיתי, והשדות מוצגים לפי העמוד שלהם בלבד.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => changePage(pageIndex - 1)}
                  disabled={pageIndex <= 0 || loadingPdf}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  עמוד קודם
                </button>

                <div
                  dir="ltr"
                  className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700"
                >
                  {pageIndex + 1} / {pageCount}
                </div>

                <button
                  type="button"
                  onClick={() => changePage(pageIndex + 1)}
                  disabled={pageIndex >= pageCount - 1 || loadingPdf}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  עמוד הבא
                </button>

                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  פתיחת PDF
                </a>
              </div>
            </div>

            <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-4">
              <div
                ref={pdfWrapRef}
                className="relative mx-auto overflow-hidden rounded-xl bg-white shadow-sm"
                style={{
                  width: pageSize.width,
                  height: pageSize.height,
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="block"
                  style={{
                    width: pageSize.width,
                    height: pageSize.height,
                  }}
                />

                {(loadingPdf || renderingPage) && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 text-sm font-black text-slate-600">
                    טוען עמוד...
                  </div>
                )}

                {currentFields.map((field) => (
                  <div
                    key={field.id}
                    onPointerDown={(event) => startDrag(event, field)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(field.id);
                    }}
                    className={`absolute z-10 flex items-center justify-center rounded-xl border-2 px-2 py-1 text-center text-xs font-black shadow-sm ${
                      selectedId === field.id
                        ? "border-violet-600 bg-violet-100 text-violet-900"
                        : "border-slate-500 bg-white/85 text-slate-800"
                    } ${
                      dragId === field.id
                        ? "cursor-grabbing select-none"
                        : "cursor-grab"
                    }`}
                    style={{
                      left: field.x,
                      top: field.y,
                      width: field.width,
                      height: field.height,
                      touchAction: "none",
                      userSelect: "none",
                    }}
                  >
                    {field.label}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}