"use client";

import { useState } from "react";

async function rasterizePdfFirstPage(file) {
  const pdfjs = await import("pdfjs-dist");

  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas unavailable");
  }

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL("image/png");
}

export default function UploadBackgroundModal({ onClose, onBackgroundSelect }) {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setBusy(true);

    try {
      if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        const dataUrl = await rasterizePdfFirstPage(file);
        setPreview(dataUrl);
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("ניתן להעלות תמונה (JPG/PNG/WebP) או PDF");
        setPreview(null);
        return;
      }

      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
        reader.readAsDataURL(file);
      });

      setPreview(dataUrl);
    } catch (err) {
      console.error("Background upload failed", err);
      setError("לא ניתן לעבד את הקובץ. נסו תמונה או PDF אחר.");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () => {
    if (!preview || busy) return;

    onBackgroundSelect(preview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[420px] max-w-[92vw] rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-3 text-lg font-semibold">העלאת תבנית אולם כרקע</h2>

        <input
          type="file"
          accept="image/*,application/pdf,.pdf"
          onChange={handleFile}
          className="mb-4 w-full"
          disabled={busy}
        />

        {busy && (
          <p className="mb-3 text-sm font-medium text-[#8a765f]">
            מעבד סקיצה…
          </p>
        )}

        {error && (
          <p className="mb-3 text-sm font-medium text-red-600">{error}</p>
        )}

        {preview && (
          <img
            src={preview}
            alt="preview"
            className="mb-4 h-48 w-full rounded-lg border object-contain bg-[#faf7f2]"
          />
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-4 py-1.5 hover:bg-gray-300"
          >
            ביטול
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!preview || busy}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            שמירה
          </button>
        </div>
      </div>
    </div>
  );
}
