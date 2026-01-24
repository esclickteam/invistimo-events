"use client";

export default function PdfViewer({ url }) {
  if (!url) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        אין קובץ להצגה
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <iframe
        src={url}
        title="PDF Viewer"
        className="w-full h-full border-0"
      />
    </div>
  );
}
