"use client";

import { useState } from "react";

export default function UploadBackgroundModal({ onClose, onBackgroundSelect }) {
  const [preview, setPreview] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      alert("נמיר PDF לתמונה בהמשך, כרגע תעלה תמונה בלבד 🙂");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (preview) onBackgroundSelect(preview);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[400px] p-6">
        <h2 className="text-lg font-semibold mb-3">
          העלאת תבנית אולם כרקע
        </h2>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={handleFile}
          className="w-full mb-4"
        />

        {preview && (
          <img
            src={preview}
            alt="preview"
            className="rounded-lg mb-4 border h-40 w-full object-cover"
          />
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            שמירה
          </button>
        </div>
      </div>
    </div>
  );
}
