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
   עזר: ניקוי טקסט (עברית, רווחים, תווים נסתרים)
============================================================ */
function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ============================================================
   עזר: מספר תקין
============================================================ */
function normalizeNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

export default function ImportExcelModal({
  invitationId,
  onClose,
  onSuccess,

  // זה צריך להגיע מהשדה user.guests
  guestLimit = 0,

  // תמיכה לאחור במקרה שקראת לזה אחרת באב
  allowedRecords = 0,
  maxRecords = 0,
  user = null,
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // לשיפור UX - הודעה אחרונה מהייבוא
  const [summary, setSummary] = useState(null);

  const selectedFileName = useMemo(() => file?.name || "", [file]);

  const recordsLimit = useMemo(() => {
    return normalizeNumber(
      guestLimit ||
        allowedRecords ||
        maxRecords ||
        user?.guests ||
        0
    );
  }, [guestLimit, allowedRecords, maxRecords, user?.guests]);

  const handleFileChange = (e) => {
    setSummary(null);
    setFile(e.target.files?.[0] || null);
  };

  const showLimitError = ({ limit, incomingCount }) => {
    const msg = `לא ניתן להעלות את הקובץ. החבילה שלך מאפשרת עד ${limit} רשומות בלבד, ובקובץ נמצאו ${incomingCount} רשומות.`;

    alert(msg);

    setSummary({
      type: "error",
      text: msg,
      usage: {
        limit,
        incomingCount,
      },
    });
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

      /* ============================================================
         קריאה מדויקת של האקסל
      ============================================================ */
      const rawJson = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      });

      console.log("📄 RAW JSON FULL:", rawJson);

      /* ============================================================
         ניקוי + נרמול נתונים לפני שליחה לשרת
      ============================================================ */
      const guests = rawJson
        .map((row, index) => {
          console.log("=================================");
          console.log(`🔍 ROW ${index + 1}`);
          console.log("RAW ROW:", row);

          const nameRaw = row["שם"] || row["שם מלא"] || "";
          const name = normalizeText(nameRaw);

          console.log("➡️ NAME RAW:", JSON.stringify(nameRaw));
          console.log("➡️ NAME CLEAN:", name);

          if (!name) return null;

          const rawStatus = normalizeText(row["סטטוס"]);

          const relationOriginal = row["קרבה"];
          const relationRaw = normalizeText(relationOriginal);

          const groupOriginal = row["קבוצה"];
          const groupRaw = normalizeText(groupOriginal);

          console.log("➡️ RELATION RAW:", JSON.stringify(relationOriginal));
          console.log("➡️ RELATION CLEAN:", relationRaw);

          const phoneRaw = row["טלפון"];
          const phoneClean = normalizeText(phoneRaw).replace(/\D/g, "");

          console.log("➡️ PHONE RAW:", phoneRaw);
          console.log("➡️ PHONE CLEAN:", phoneClean);

          const tableNumber = normalizeTableNumber(
            row["מס' שולחן"] ??
              row["מספר שולחן"] ??
              row["שולחן"] ??
              ""
          );

          console.log("➡️ TABLE:", tableNumber);

          return {
            name,

            // טלפון אופציונלי
            phone: phoneClean || null,

            relation: relationRaw || null,
            group: groupRaw || null,

            // RSVP תקני
            rsvp: RSVP_MAP[rawStatus] || "pending",

            // כמות מוזמנים בתוך הרשומה - לא קשור למגבלת הרשומות
            guestsCount: Math.max(
              1,
              Number(row["מוזמנים"] ?? row["כמות אורחים"] ?? 1) || 1
            ),

            // מתחיל תמיד מ-0
            arrivedCount: 0,

            notes: normalizeText(row["הערות"]) || null,

            tableNumber,
            tableName: tableNumber !== null ? `שולחן ${tableNumber}` : null,
          };
        })
        .filter(Boolean);

      console.log("📦 FINAL GUESTS:", guests);

      if (guests.length === 0) {
        alert("לא נמצאו שורות תקינות לייבוא");
        return;
      }

      /* ============================================================
         בדיקת מגבלת רשומות לפי user.guests לפני שליחה לשרת
         guests.length = מספר רשומות באקסל
      ============================================================ */
      const incomingRecordsCount = guests.length;

      console.log("📌 EXCEL RECORD LIMIT CHECK:", {
        recordsLimit,
        incomingRecordsCount,
      });

      if (recordsLimit > 0 && incomingRecordsCount > recordsLimit) {
        showLimitError({
          limit: recordsLimit,
          incomingCount: incomingRecordsCount,
        });
        return;
      }

      const res = await fetch("/api/guests/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, guests }),
      });

      const result = await res.json();
      console.log("📦 Import result:", result);

      /* ============================================================
         טיפול שגיאות מהשרת
         כולל הגבלה לפי user.guests בצד שרת
      ============================================================ */
      if (!res.ok || !result?.success) {
        const isLimitError =
          result?.code === "GUEST_LIMIT_REACHED" ||
          result?.code === "GUEST_RECORD_LIMIT_EXCEEDED" ||
          result?.error === "GUEST_LIMIT_REACHED" ||
          result?.error === "GUEST_RECORD_LIMIT_EXCEEDED";

        if ((res.status === 409 || res.status === 403) && isLimitError) {
          const serverLimit =
            result?.usage?.limit ??
            result?.allowedRecords ??
            result?.maxRecords ??
            recordsLimit ??
            "-";

          const serverIncoming =
            result?.usage?.incomingCount ??
            result?.incomingRecordsCount ??
            result?.count ??
            incomingRecordsCount;

          const limitMsg =
            result?.message ||
            result?.errorMessage ||
            `לא ניתן להעלות את הקובץ. החבילה שלך מאפשרת עד ${serverLimit} רשומות בלבד, ובקובץ נמצאו ${serverIncoming} רשומות.`;

          alert(limitMsg);

          setSummary({
            type: "error",
            text: limitMsg,
            usage: result?.usage || {
              limit: serverLimit,
              incomingCount: serverIncoming,
            },
          });

          return;
        }

        const errMsg =
          result?.message ||
          result?.error ||
          "שגיאה בייבוא הקובץ";

        alert(errMsg);

        setSummary({
          type: "error",
          text: errMsg,
          usage: result?.usage || null,
        });

        return;
      }

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
        const msg = result?.message || `✅ יובאו ${count} מוזמנים בהצלחה`;

        alert(msg);

        setSummary({
          type: "success",
          text: msg,
          usage,
        });
      }

      await onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error("❌ Excel Error:", err);
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
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/50 px-4 py-6
        backdrop-blur-sm
      "
      dir="rtl"
    >
      <div
        className="
          relative w-full max-w-[680px]
          overflow-hidden rounded-[34px]
          bg-[#FFFCF7]
          shadow-[0_30px_100px_rgba(25,18,10,0.28)]
          border border-[#EFE2CF]
        "
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="
            absolute left-5 top-5 z-20
            flex h-10 w-10 items-center justify-center
            rounded-full
            bg-white/85
            text-xl font-bold text-[#6B5138]
            shadow-sm transition
            hover:bg-[#F6EBD9]
            disabled:opacity-50
          "
          aria-label="סגירה"
        >
          ×
        </button>

        {/* Header */}
        <div
          className="
            relative overflow-hidden
            bg-gradient-to-l from-[#F8EEDC] via-[#FFF7EA] to-[#FFFFFF]
            px-7 pb-7 pt-8 sm:px-10
            border-b border-[#EFE2CF]
          "
        >
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#D6B16A]/20 blur-2xl" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-[#8B6A3F]/10 blur-2xl" />

          <div className="relative">
            <div
              className="
                mx-auto mb-4 flex h-16 w-16 items-center justify-center
                rounded-3xl
                bg-white
                text-3xl
                shadow-[0_12px_35px_rgba(139,106,63,0.18)]
                border border-[#EFE2CF]
              "
            >
              📊
            </div>

            <h2 className="text-center text-2xl sm:text-3xl font-black text-[#2F241A]">
              ייבוא מוזמנים מאקסל
            </h2>

            <p className="mx-auto mt-3 max-w-[460px] text-center text-sm sm:text-base leading-7 text-[#7A6A59]">
              הורידו את התבנית, מלאו את פרטי האורחים והעלו את הקובץ למערכת.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 sm:px-9 sm:py-8">
          {/* Steps */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div
              className="
                rounded-[24px]
                border border-[#EFE2CF]
                bg-white
                p-4
                shadow-[0_10px_30px_rgba(95,68,34,0.06)]
              "
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="
                    flex h-9 w-9 items-center justify-center
                    rounded-full bg-[#F4E7D1]
                    text-sm font-black text-[#8B6A3F]
                  "
                >
                  1
                </span>
                <h3 className="font-black text-[#3E2D20]">הורדת תבנית</h3>
              </div>

              <p className="mb-4 text-sm leading-6 text-[#7A6A59]">
                התחילו מקובץ התבנית המוכן כדי לשמור על מבנה תקין.
              </p>

              <a
                href="/Invistimo_v4.xlsx?v=4"
                download
                className="
                  inline-flex w-full items-center justify-center gap-2
                  rounded-full
                  bg-[#F4E7D1]
                  px-4 py-2.5
                  text-sm font-bold text-[#7B5A2E]
                  transition
                  hover:bg-[#EAD7B8]
                "
              >
                📄 הורדת תבנית
              </a>
            </div>

            <div
              className="
                rounded-[24px]
                border border-[#EFE2CF]
                bg-white
                p-4
                shadow-[0_10px_30px_rgba(95,68,34,0.06)]
              "
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="
                    flex h-9 w-9 items-center justify-center
                    rounded-full bg-[#F4E7D1]
                    text-sm font-black text-[#8B6A3F]
                  "
                >
                  2
                </span>
                <h3 className="font-black text-[#3E2D20]">מילוי אורחים</h3>
              </div>

              <p className="text-sm leading-6 text-[#7A6A59]">
                מלאו שם, טלפון, סטטוס, קרבה, קבוצה, כמות מוזמנים ושולחן לפי
                הכותרות בקובץ.
              </p>
            </div>

            <div
              className="
                rounded-[24px]
                border border-[#EFE2CF]
                bg-white
                p-4
                shadow-[0_10px_30px_rgba(95,68,34,0.06)]
              "
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="
                    flex h-9 w-9 items-center justify-center
                    rounded-full bg-[#F4E7D1]
                    text-sm font-black text-[#8B6A3F]
                  "
                >
                  3
                </span>
                <h3 className="font-black text-[#3E2D20]">העלאה למערכת</h3>
              </div>

              <p className="text-sm leading-6 text-[#7A6A59]">
                בחרו את הקובץ המלא ולחצו על העלאה. המערכת תייבא את האורחים
                אוטומטית.
              </p>
            </div>
          </div>

          {/* Upload box */}
          <div
            className="
              mt-6 rounded-[28px]
              border border-dashed border-[#D6B16A]
              bg-[#FFF8ED]
              p-5 sm:p-6
            "
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-black text-[#3E2D20]">
                  העלאת קובץ אקסל
                </h3>
                <p className="mt-1 text-sm text-[#7A6A59]">
                  ניתן להעלות קובץ מסוג XLSX או XLS בלבד.
                </p>
              </div>

              <div
                className="
                  inline-flex items-center justify-center
                  rounded-full bg-white
                  px-4 py-2
                  text-xs font-bold text-[#8B6A3F]
                  border border-[#EFE2CF]
                "
              >
                Excel בלבד
              </div>
            </div>

            <label
              className="
                flex cursor-pointer flex-col items-center justify-center
                rounded-[24px]
                border border-[#EFE2CF]
                bg-white
                px-4 py-6
                text-center
                shadow-[0_10px_30px_rgba(95,68,34,0.05)]
                transition
                hover:border-[#D6B16A]
                hover:bg-[#FFFDF8]
              "
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                className="
                  mb-3 flex h-14 w-14 items-center justify-center
                  rounded-2xl
                  bg-[#F4E7D1]
                  text-2xl
                "
              >
                ⬆️
              </div>

              <p className="text-base font-black text-[#3E2D20]">
                {selectedFileName ? "הקובץ נבחר בהצלחה" : "בחרו קובץ להעלאה"}
              </p>

              <p className="mt-1 max-w-[420px] text-sm leading-6 text-[#7A6A59]">
                {selectedFileName
                  ? selectedFileName
                  : "לחצו כאן לבחירת קובץ האקסל מהמחשב או מהטלפון"}
              </p>
            </label>

            {selectedFileName ? (
              <div
                className="
                  mt-4 flex items-center justify-between gap-3
                  rounded-2xl
                  bg-white
                  px-4 py-3
                  border border-[#EFE2CF]
                "
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#8B6A3F]">קובץ נבחר</p>
                  <p className="truncate text-sm font-semibold text-[#3E2D20]">
                    {selectedFileName}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                  מוכן לייבוא
                </span>
              </div>
            ) : null}

            {recordsLimit > 0 ? (
              <div
                className="
                  mt-4 rounded-2xl
                  border border-[#EFE2CF]
                  bg-white
                  px-4 py-3
                  text-sm font-semibold leading-6 text-[#7A6A59]
                "
              >
                החבילה מאפשרת עד{" "}
                <span className="font-black text-[#3E2D20]">
                  {recordsLimit}
                </span>{" "}
                רשומות באקסל.
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleImport}
              disabled={loading}
              className="
                mt-5 flex w-full items-center justify-center gap-2
                rounded-full
                bg-[#128C3A]
                px-6 py-4
                text-base font-black text-white
                shadow-[0_14px_35px_rgba(18,140,58,0.24)]
                transition
                hover:bg-[#0F7A32]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {loading ? (
                <>
                  <span
                    className="
                      h-5 w-5 animate-spin rounded-full
                      border-2 border-white/40 border-t-white
                    "
                  />
                  מייבא את הקובץ...
                </>
              ) : (
                <>העלאת קובץ וייבוא אורחים</>
              )}
            </button>
          </div>

          {summary ? (
            <div
              className={`
                mt-5 rounded-[22px] border px-4 py-3 text-sm font-semibold leading-6
                ${
                  summary.type === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : summary.type === "partial"
                    ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }
              `}
            >
              {summary.text}
            </div>
          ) : null}

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="
                rounded-full
                px-5 py-2.5
                text-sm font-bold text-[#7A6A59]
                transition
                hover:bg-[#F6EBD9]
                hover:text-[#3E2D20]
                disabled:opacity-50
              "
            >
              ביטול וחזרה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}