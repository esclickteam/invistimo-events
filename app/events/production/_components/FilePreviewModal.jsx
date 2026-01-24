"use client";

export default function FilePreviewModal({ file, onClose }) {
  const name = file?.name || "קובץ";
  const url = file?.url;

  const isPdf =
    (file?.type || "").includes("pdf") ||
    String(name).toLowerCase().endsWith(".pdf");

  const isImage =
    (file?.type || "").startsWith("image/") ||
    /\.(png|jpe?g|gif|webp)$/i.test(String(name));

  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="font-medium truncate">{name}</div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-sm underline text-gray-600"
              onClick={() =>
                window.open(url, "_blank", "noopener,noreferrer")
              }
            >
              פתיחה בטאב חדש
            </button>
            <button
              type="button"
              className="text-sm bg-black text-white px-4 py-2 rounded-xl"
              onClick={onClose}
            >
              סגור
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="h-[75vh] bg-gray-50 overflow-hidden">
          {isPdf ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
              <div className="text-gray-700 font-medium">
                מסמך PDF
              </div>
              <button
                type="button"
                className="bg-black text-white px-6 py-3 rounded-xl"
                onClick={() =>
                  window.open(url, "_blank", "noopener,noreferrer")
                }
              >
                פתיחה בטאב חדש
              </button>
            </div>
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center p-6">
              <img
                src={url}
                alt={name}
                className="max-h-full max-w-full rounded-xl shadow"
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-4">
              <div className="text-gray-700 font-medium">
                אין תצוגה מקדימה לסוג הקובץ הזה
              </div>
              <button
                type="button"
                className="bg-black text-white px-5 py-2 rounded-xl"
                onClick={() =>
                  window.open(url, "_blank", "noopener,noreferrer")
                }
              >
                פתח בטאב חדש
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
