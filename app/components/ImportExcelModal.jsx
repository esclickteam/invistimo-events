"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";

/* ============================================================
   מיפוי סטטוס מאקסל → ערך מערכת
============================================================ */
const RSVP_MAP = {
  בהמתנה: "pending",
  ממתין: "pending",

  מגיע: "yes",
  כן: "yes",

  "לא מגיע": "no",
  לא: "no",
};

/* ============================================================
   עזר: המרת מספר שולחן (גם אם הגיע כטקסט)
============================================================ */
function normalizeTableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const onlyDigits = String(value).replace(/[^\d]/g, "").trim();
  if (!onlyDigits) return null;
  const num = Number(onlyDigits);
  return Number.isFinite(num) ? num : null;
}

/* ============================================================
   🔥 עזר: ניקוי טקסט (קריטי לקרבה)
============================================================ */
function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC") // 🔥 חשוב מאוד לעברית
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // תווים נסתרים
    .replace(/\u00A0/g, " ") // רווח לא תקין
    .replace(/\s+/g, " ") // איחוד רווחים
    .trim();
}

export default function ImportExcelModal({ invitationId, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const selectedFileName = useMemo(() => file?.name || "", [file]);

  const handleFileChange = (e) => {
    setSummary(null);
    setFile(e.target.files?.[0] || null);
  };

  const handleImport = async () => {
    if (!file) {
      alert("יש לבחור קובץ אקסל תחילה");
      return;
    }

    setLoading(true);
    setSummary(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      if (!workbook.SheetNames?.length) {
        alert("הקובץ לא מכיל גיליון תקין");
        return;
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      /* ============================================================
         ניקוי + נרמול נתונים לפני שליחה לשרת
      ============================================================ */
      const guests = rawJson
        .map((row) => {
          const name = normalizeText(row["שם"] || row["שם מלא"]);
          if (!name) return null;

          const rawStatus = normalizeText(row["סטטוס"]);

          const tableNumber = normalizeTableNumber(
            row["מס' שולחן"] ?? row["מספר שולחן"] ?? row["שולחן"] ?? ""
          );

          // 🔥 תיקון קריטי לקרבה
          const relationRaw = normalizeText(row["קרבה"]);

          // 🔍 בדיקה (אפשר למחוק אחרי בדיקה)
          console.log("RELATION:", JSON.stringify(row["קרבה"]), "→", relationRaw);

          return {
            name,

            phone:
              normalizeText(row["טלפון"]).replace(/\D/g, "") || null,

            relation: relationRaw || null,

            rsvp: RSVP_MAP[rawStatus] || "pending",

            guestsCount: Math.max(
              1,
              Number(row["מוזמנים"] ?? row["כמות אורחים"] ?? 1) || 1
            ),

            arrivedCount: 0,

            notes: normalizeText(row["הערות"]) || null,

            tableNumber,
            tableName: tableNumber !== null ? `שולחן ${tableNumber}` : null,
          };
        })
        .filter(Boolean);

      if (guests.length === 0) {
        alert("לא נמצאו שורות תקינות לייבוא");
        return;
      }

      const res = await fetch("/api/guests/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, guests }),
      });

      const result = await res.json();
      console.log("📦 Import result:", result);

      if (!res.ok || !result?.success) {
        const errMsg = result?.error || "שגיאה בייבוא הקובץ";
        alert(errMsg);
        setSummary({ type: "error", text: errMsg });
        return;
      }

      const count = Number(result?.count || 0);

      alert(`✅ יובאו ${count} מוזמנים בהצלחה`);

      setSummary({
        type: "success",
        text: `יובאו ${count} מוזמנים`,
      });

      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      alert("שגיאה בקריאת הקובץ");
      setSummary({ type: "error", text: "שגיאה בקריאת הקובץ" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div
        className="bg-white p-8 rounded-2xl w-[520px] max-w-[95vw] shadow-xl text-right"
        dir="rtl"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          ייבוא קובץ אקסל
        </h2>

        <div className="mb-5">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="w-full border rounded p-2 mb-2"
          />

          {selectedFileName && (
            <p className="text-xs text-gray-500 mb-3">
              נבחר קובץ: {selectedFileName}
            </p>
          )}

          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-full font-semibold hover:bg-green-700 transition disabled:opacity-60"
          >
            {loading ? "מייבא..." : "העלאה"}
          </button>
        </div>

        {summary && (
          <div className="mt-4 bg-gray-100 rounded-xl p-3 text-sm">
            {summary.text}
          </div>
        )}

        <div className="text-center mt-6">
          <button onClick={onClose} className="text-gray-500">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}