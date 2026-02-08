"use client";

import React, { useState } from "react";
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

export default function ImportExcelModal({ invitationId, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleImport = async () => {
    if (!file) {
      alert("יש לבחור קובץ אקסל תחילה");
      return;
    }

    if (!invitationId) {
      alert("לא נמצא אירוע לייבוא");
      return;
    }

    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      /* ============================================================
         ניקוי + נרמול נתונים לפני שליחה לשרת
      ============================================================ */
      const guests = rawJson
        .map((row) => {
          const name = String(row["שם"] || row["שם מלא"] || "").trim();
          if (!name) return null; // ⛔ רק שם הוא שדה חובה

          const rawStatus = String(row["סטטוס"] || "").trim();

          // מוזמנים: תמיד מספר תקין >= 1
          const guestsCountRaw = Number(
            row["מוזמנים"] ?? row["כמות אורחים"] ?? 1
          );
          const guestsCount = Number.isFinite(guestsCountRaw)
            ? Math.max(1, Math.floor(guestsCountRaw))
            : 1;

          // שולחן: תומך גם בעמודת "מס' שולחן" וגם table/tableNumber
          const rawTable = String(
            row["מס' שולחן"] ?? row["tableNumber"] ?? row["table"] ?? ""
          ).trim();

          return {
            name,

            // 📞 טלפון = אופציונלי
            phone:
              String(row["טלפון"] || "")
                .replace(/\D/g, "")
                .trim() || null,

            relation: String(row["קרבה"] || "").trim() || null,

            // 🟢 סטטוס RSVP תקני
            rsvp: RSVP_MAP[rawStatus] || "pending",

            // 🟢 כמה הוזמנו
            guestsCount,

            // 🛑 תמיד מתחיל מ־0 בייבוא
            arrivedCount: 0,

            notes: String(row["הערות"] || "").trim() || null,

            // השרת שלך תומך tableNumber/tableName
            tableNumber:
              rawTable && Number.isFinite(Number(rawTable))
                ? Number(rawTable)
                : null,
            tableName: rawTable || null,
          };
        })
        .filter(Boolean);

      console.log("📦 Guests to import (normalized):", guests);

      if (guests.length === 0) {
        alert("לא נמצאו שורות תקינות לייבוא");
        return;
      }

      const res = await fetch("/api/guests/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invitationId,
          guests,
        }),
      });

      const result = await res.json();
      console.log("📦 Import result:", result);

      if (res.ok && result.success) {
        const importedCount = Number(result.count || 0);
        const importedGuestsCountSum = Number(result.importedGuestsCountSum || 0);

        const details =
          importedGuestsCountSum > 0
            ? `\n(סה״כ מוזמנים שנוספו: ${importedGuestsCountSum})`
            : "";

        alert(`✅ יובאו ${importedCount} רשומות בהצלחה${details}`);
        onSuccess?.();
        onClose?.();
        return;
      }

      /* ============================================================
         טיפול ייעודי בחריגה ממכסת חבילה
      ============================================================ */
      if (
        res.status === 409 &&
        (result?.code === "PLAN_GUEST_LIMIT_EXCEEDED" ||
          result?.error === "PLAN_GUEST_LIMIT_EXCEEDED")
      ) {
        const limit = Number(result?.limit ?? 0);
        const currentTotal = Number(result?.currentTotal ?? 0);
        const importTotal = Number(result?.importTotal ?? 0);
        const requestedTotal = Number(result?.requestedTotal ?? currentTotal + importTotal);

        alert(
          `אי אפשר לייבא את הקובץ כי הוא חורג מהמכסה של החבילה.\n\n` +
            `מכסה: ${limit}\n` +
            `קיים כרגע: ${currentTotal}\n` +
            `ניסיון לייבא: ${importTotal}\n` +
            `סה״כ לאחר ייבוא: ${requestedTotal}\n\n` +
            `כדי להמשיך:\n` +
            `• מחקי רשומות קיימות\n` +
            `או\n` +
            `• שדרגי חבילה`
        );
        return;
      }

      // שגיאה כללית מהשרת
      alert(result?.error || "שגיאה בייבוא הקובץ");
    } catch (err) {
      console.error("❌ Import file read/parse error:", err);
      alert("שגיאה בקריאת הקובץ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div
        className="bg-white p-8 rounded-2xl w-[480px] max-w-[95vw] shadow-xl text-right"
        dir="rtl"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          ייבוא קובץ אקסל
        </h2>

        {/* שלב 1 */}
        <div className="mb-5">
          <h3 className="font-semibold mb-1">שלב 1: הורדת תבנית Excel</h3>
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
          <h3 className="font-semibold mb-1">שלב 2: הזנת נתוני אורחים</h3>
          <p className="text-sm text-gray-600">
            מלאו את נתוני האורחים בקובץ לפי הכותרות.
          </p>
        </div>

        {/* שלב 3 */}
        <div className="mb-5">
          <h3 className="font-semibold mb-1">שלב 3: העלאת הקובץ</h3>
          <p className="text-sm text-gray-600 mb-3">
            בחרו את הקובץ המלא והעלו אותו למערכת.
          </p>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="w-full border rounded p-2 mb-3"
            disabled={loading}
          />

          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-full font-semibold hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "מייבא..." : "העלאה"}
          </button>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 transition disabled:opacity-60"
          >
            ביטול וחזרה
          </button>
        </div>
      </div>
    </div>
  );
}
