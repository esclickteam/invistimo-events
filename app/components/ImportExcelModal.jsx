"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useGroupStore } from "@/store/groupStore";

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

export default function ImportExcelModal({ invitationId, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // לשיפור UX - הודעה אחרונה מהייבוא
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
          const name = String(row["שם"] || row["שם מלא"] || "").trim();
          if (!name) return null;

          const rawStatus = String(row["סטטוס"] || "").trim();
          const tableNumber = normalizeTableNumber(
            row["מס' שולחן"] ??
              row["מספר שולחן"] ??
              row["שולחן"] ??
              ""
          );

          return {
            name,

            phone:
              String(row["טלפון"] || "")
                .replace(/\D/g, "")
                .trim() || null,

            relation: String(row["קרבה"] || "").trim() || null,

            rsvp: RSVP_MAP[rawStatus] || "pending",

            guestsCount: Math.max(
              1,
              Number(row["מוזמנים"] ?? row["כמות אורחים"] ?? 1) || 1
            ),

            arrivedCount: 0,

            notes: String(row["הערות"] || "").trim() || null,

            tableNumber,
            tableName:
              tableNumber !== null ? `שולחן ${tableNumber}` : null,
          };
        })
        .filter(Boolean);

      if (guests.length === 0) {
        alert("לא נמצאו שורות תקינות לייבוא");
        return;
      }

      const res = await fetch("/api/guests/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationId,
          guests,
        }),
      });

      const result = await res.json();
      console.log("📦 Import result:", result);

      /* =======================
         ❌ שגיאות
      ======================= */
      if (!res.ok || !result?.success) {
        if (res.status === 409 && result?.code === "GUEST_LIMIT_REACHED") {
          const limitMsg =
            result?.error ||
            `הגעת למכסת הרשומות (${result?.usage?.limit ?? "-"})`;

          alert(limitMsg);

          setSummary({
            type: "error",
            text: limitMsg,
            usage: result?.usage || null,
          });

          return;
        }

        const errMsg = result?.error || "שגיאה בייבוא הקובץ";

        alert(errMsg);

        setSummary({
          type: "error",
          text: errMsg,
          usage: result?.usage || null,
        });

        return;
      }

      /* ============================================================
         🔥🔥🔥 הפתרון שלך - רענון קבוצות אחרי import
      ============================================================ */
      await useGroupStore.getState().loadGroups(invitationId);

      /* רענון אורחים (אם קיים אצלך) */
      onSuccess?.();

      /* ============================================================
         הצלחה
      ============================================================ */
      const count = Number(result?.count || 0);
      const skippedByLimit = Number(result?.skippedByLimit || 0);
      const usage = result?.usage || null;

      if (skippedByLimit > 0) {
        const msg =
          result?.message ||
          `יובאו ${count} מוזמנים. ${skippedByLimit} לא יובאו בגלל מגבלת מכסה.`;

        alert(`⚠️ ${msg}`);

        setSummary({
          type: "partial",
          text: msg,
          usage,
        });
      } else {
        const msg =
          result?.message || `✅ יובאו ${count} מוזמנים בהצלחה`;

        alert(msg);

        setSummary({
          type: "success",
          text: msg,
          usage,
        });
      }

      onClose?.();
    } catch (err) {
      console.error(err);

      alert("שגיאה בקריאת הקובץ");

      setSummary({
        type: "error",
        text: "שגיאה בקריאת הקובץ",
        usage: null,
      });
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

        {/* שלב 1 */}
        <div className="mb-5">
          <h3 className="font-semibold mb-1">
            שלב 1: הורדת תבנית Excel
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            המערכת יודעת לעבוד עם קובץ אקסל במבנה מסוים.
          </p>

          <a
            href="/Invistimo.xlsx"
            download
            className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm hover:bg-blue-200 transition"
          >
            📄 הורדת תבנית אקסל
          </a>
        </div>

        {/* שלב 2 */}
        <div className="mb-5">
          <h3 className="font-semibold mb-1">
            שלב 2: הזנת נתוני אורחים
          </h3>
          <p className="text-sm text-gray-600">
            מלאו את נתוני האורחים בקובץ לפי הכותרות.
          </p>
        </div>

        {/* שלב 3 */}
        <div className="mb-5">
          <h3 className="font-semibold mb-1">
            שלב 3: העלאת הקובץ
          </h3>

          <p className="text-sm text-gray-600 mb-3">
            בחרו את הקובץ המלא והעלו אותו למערכת.
          </p>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="w-full border rounded p-2 mb-2"
          />

          {selectedFileName ? (
            <p className="text-xs text-gray-500 mb-3">
              נבחר קובץ: {selectedFileName}
            </p>
          ) : null}

          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-full font-semibold hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "מייבא..." : "העלאה"}
          </button>
        </div>

        {/* סיכום */}
        {summary ? (
          <div
            className={`mt-4 rounded-xl p-3 text-sm ${
              summary.type === "success"
                ? "bg-green-50 text-green-700"
                : summary.type === "partial"
                ? "bg-yellow-50 text-yellow-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            <div>{summary.text}</div>

            {summary.usage ? (
              <div className="mt-1 text-xs opacity-80">
                שימוש: {summary.usage.current} /{" "}
                {summary.usage.limit} (נותרו{" "}
                {summary.usage.remaining})
              </div>
            ) : null}
          </div>
        ) : null}

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