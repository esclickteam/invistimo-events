"use client";

import { useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js";

export default function PdfViewer({ url }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function renderPdf() {
      const pdf = await pdfjsLib.getDocument(url).promise;
      if (cancelled) return;

      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.4 });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: ctx, viewport }).promise;
    }

    renderPdf();
    return () => (cancelled = true);
  }, [url]);

  return (
    <div className="overflow-auto">
      <canvas ref={canvasRef} />
    </div>
  );
}
