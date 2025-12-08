"use client";

import { useState } from "react";
import SeatingEditor from "./SeatingEditor";
import UploadBackgroundModal from "./UploadBackgroundModal";

export default function SeatingPage() {
  const [background, setBackground] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* כותרת עליונה */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
        <h1 className="text-xl font-semibold">הושבה באולם</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            העלאת תבנית אולם (PDF/תמונה)
          </button>
        </div>
      </div>

      {/* עורך ההושבה */}
      <div className="flex-1 overflow-hidden">
        <SeatingEditor background={background} />
      </div>

      {/* מודאל העלאה */}
      {showUpload && (
        <UploadBackgroundModal
          onClose={() => setShowUpload(false)}
          onBackgroundSelect={(url) => {
            setBackground(url);
            setShowUpload(false);
          }}
        />
      )}
    </div>
  );
}
