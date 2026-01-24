"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// ✅ WORKER יציב (4.x עובד מצוין)
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@4.2.67/build/pdf.worker.min.js";

export default function PdfViewer({ url }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    let loadingTask;

    async function renderPdf() {
      try {
        setLoading(true);
        setError(false);

        loadingTask = pdfjsLib.getDocument({
          url,
          withCredentials: false,
        });

        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1.2 });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        setLoading(false);
      } catch (err) {
        console.error("PdfViewer error:", err);
        setError(true);
        setLoading(false);
      }
    }

    renderPdf();

    return () => {
      cancelled = true;
      try {
        loadingTask?.destroy();
      } catch {}
    };
  }, [url]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        טוען PDF…
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
        <div className="text-red-600 font-medium">לא ניתן לטעון PDF</div>
        <button
          className="bg-black text-white px-5 py-2 rounded-xl"
          onClick={() => window.open(url, "_blank")}
        >
          פתיחה בטאב חדש
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-auto flex justify-center">
      <canvas ref={canvasRef} />
    </div>
  );
}
