"use client";

import { useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";

/**
 * ✅ Next.js fix:
 * אין יותר pdf.worker.entry בגרסאות החדשות.
 * לכן מגדירים workerSrc ל-CDN לפי הגרסה של pdfjs-dist שמותקנת אצלך.
 */
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PdfViewer({ url }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    let loadingTask = null;

    async function renderPdf() {
      loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      if (cancelled) return;

      // עמוד ראשון (אפשר להרחיב אחר כך לעמודים/זום)
      const page = await pdf.getPage(1);
      if (cancelled) return;

      const viewport = page.getViewport({ scale: 1.4 });

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      await page.render({ canvasContext: ctx, viewport }).promise;
    }

    renderPdf().catch((err) => {
      // לרוב זה יופיע אם יש CORS/URL לא נגיש (למשל Cloudinary raw)
      console.error("PdfViewer render error:", err);
    });

    return () => {
      cancelled = true;
      try {
        if (loadingTask && typeof loadingTask.destroy === "function") {
          loadingTask.destroy();
        }
      } catch (_) {}
    };
  }, [url]);

  return (
    <div className="overflow-auto">
      <canvas ref={canvasRef} />
    </div>
  );
}
