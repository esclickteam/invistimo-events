"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";

export default function ImportExcelModal({ invitationId, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleImport = async () => {
    if (!file) return alert("יש לבחור קובץ אקסל תחילה");
    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      const res = await fetch("/api/guests/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, guests: json }),
      });

       const result = await res.json();

       console.log("📦 Import result:", result);


      if (result.success) {
        alert(`✅ יובאו ${result.count} מוזמנים בהצלחה`);
        onSuccess();
        onClose();
      } else {
        alert("שגיאה בייבוא הקובץ");
      }
    } catch (err) {
      console.error(err);
      alert("שגיאה בקריאת הקובץ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl w-[480px] shadow-xl text-right" dir="rtl">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          ייבוא קובץ אקסל
        </h2>

        {/* שלב 1 */}
        <div className="mb-5">
          <h3 className="font-semibold mb-1">שלב 1: הורדת תבנית Excel</h3>
          <p className="text-sm text-gray-600 mb-2">
            המערכת יודעת לעבוד עם קובץ אקסל במבנית מסוימת.
          </p>
          <a
            href="/Invistimo.xlsx"
            download
            className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm hover:bg-blue-200 transition"
          >
            📄 הורדת תבנית אקסל
          </a>
        </div>

        {/* שלב 2 */}
        <div className="mb-5">
          <h3 className="font-semibold mb-1">שלב 2: הזנת נתוני אורחים</h3>
          <p className="text-sm text-gray-600">
            מלאו את נתוני האורחים בקובץ שהורדתם לפי ההנחיות והכותרות.
          </p>
        </div>

        {/* שלב 3 */}
        <div className="mb-5">
          <h3 className="font-semibold mb-1">שלב 3: העלאת קובץ למערכת</h3>
          <p className="text-sm text-gray-600 mb-3">
            בחרו את הקובץ המלא והעלו אותו כדי לייבא את האורחים למערכת.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="w-full border rounded p-2 mb-3"
          />

          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-full font-semibold hover:bg-green-700 transition"
          >
            {loading ? "מייבא..." : "העלאה"}
          </button>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            ביטול וחזרה
          </button>
        </div>
      </div>
    </div>
  );
}
