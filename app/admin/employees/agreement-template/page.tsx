"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AgreementTemplatePage() {
  const pdfWrapRef = useRef<HTMLDivElement | null>(null);

  const [fileUrl, setFileUrl] = useState("/templates/employee-agreement-invistimo.pdf");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(11);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [dragId, setDragId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const currentFields = useMemo(
    () => fields.filter((f) => f.pageIndex === pageIndex),
    [fields, pageIndex]
  );

  const selectedField = fields.find((f) => f.id === selectedId) || null;

  async function loadTemplate() {
    try {
      const res = await fetch("/api/employee-agreement-templates/current", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (data?.template) {
        setFileUrl(data.template.fileUrl || "/templates/employee-agreement-invistimo.pdf");
        setFields(data.template.fields || []);
        setPageCount(data.template.pageCount || 11);
      }
    } catch {
      setMessage("לא נטענה תבנית קיימת");
    }
  }

  useEffect(() => {
    void loadTemplate();
  }, []);

  function addField(type: FieldType) {
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
      x: 120,
      y: 120,
      width: type === "signature" ? 180 : 160,
      height: type === "signature" ? 70 : 32,
      required: true,
      order: fields.length + 1,
    };

    setFields((prev) => [...prev, field]);
    setSelectedId(field.id);
  }

  function updateField(id: string, patch: Partial<TemplateField>) {
    setFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, ...patch } : field))
    );
  }

  function deleteField(id: string) {
    setFields((prev) => prev.filter((field) => field.id !== id));
    setSelectedId("");
  }

  function startDrag(id: string) {
    setDragId(id);
    setSelectedId(id);
  }

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!dragId) return;

    const wrap = pdfWrapRef.current;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    updateField(dragId, {
      x: Math.max(0, Math.round(x)),
      y: Math.max(0, Math.round(y)),
    });
  }

  function stopDrag() {
    setDragId("");
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
            disabled={saving}
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
                className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white"
              >
                הוסף שדה טקסט
              </button>

              <button
                type="button"
                onClick={() => addField("date")}
                className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white"
              >
                הוסף שדה תאריך
              </button>

              <button
                type="button"
                onClick={() => addField("signature")}
                className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white"
              >
                הוסף שדה חתימה
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-black text-slate-900">עמוד</h3>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black"
                >
                  הקודם
                </button>

                <div className="flex h-10 items-center rounded-2xl bg-slate-100 px-4 text-sm font-black">
                  {pageIndex + 1} / {pageCount}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPageIndex((p) => Math.min(pageCount - 1, p + 1))
                  }
                  className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black"
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
                  className="mt-2 h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold"
                />

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-600">
                      רוחב
                    </label>
                    <input
                      type="number"
                      value={selectedField.width}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          width: Number(e.target.value),
                        })
                      }
                      className="mt-2 h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-600">
                      גובה
                    </label>
                    <input
                      type="number"
                      value={selectedField.height}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          height: Number(e.target.value),
                        })
                      }
                      className="mt-2 h-10 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold"
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
                  className="mt-4 h-10 rounded-2xl bg-rose-600 px-4 text-sm font-black text-white"
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

                {fields
                  .sort((a, b) => a.order - b.order)
                  .map((field, index) => (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(field.id);
                        setPageIndex(field.pageIndex);
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">מיקום שדות על ההסכם</h2>

              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700"
              >
                פתיחת PDF
              </a>
            </div>

            <div
              ref={pdfWrapRef}
              onMouseMove={onMove}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
              className="relative mx-auto h-[900px] max-w-[700px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
            >
              <iframe
                src={`${fileUrl}#page=${pageIndex + 1}&toolbar=0`}
                className="h-full w-full"
                title="תבנית הסכם עבודה"
              />

              {currentFields.map((field) => (
                <div
                  key={field.id}
                  onMouseDown={() => startDrag(field.id)}
                  onClick={() => setSelectedId(field.id)}
                  className={`absolute cursor-move rounded-xl border-2 px-2 py-1 text-xs font-black shadow-sm ${
                    selectedId === field.id
                      ? "border-violet-600 bg-violet-100 text-violet-900"
                      : "border-slate-500 bg-white/80 text-slate-800"
                  }`}
                  style={{
                    right: field.x,
                    top: field.y,
                    width: field.width,
                    height: field.height,
                  }}
                >
                  {field.label}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}