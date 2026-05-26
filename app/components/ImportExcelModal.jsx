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
   טאבים
============================================================ */
const IMPORT_TABS = [
  { id: "excel", label: "Excel", icon: "📊" },
  { id: "paste", label: "הדבקת רשימה", icon: "📋" },
  { id: "image", label: "תמונה / צילום מסך", icon: "📷" },
];

/* ============================================================
   עזר: המרת מספר שולחן
============================================================ */
function normalizeTableNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const onlyDigits = String(value).replace(/[^\d]/g, "").trim();
  if (!onlyDigits) return null;

  const num = Number(onlyDigits);
  return Number.isFinite(num) ? num : null;
}

/* ============================================================
   עזר: ניקוי טקסט
============================================================ */
function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u200E\u200F]/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/[׳']/g, "'")
    .replace(/[״"]/g, '"')
    .replace(/[־]/g, "-")
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

/* ============================================================
   עזר: ניקוי OCR נפוץ במספרים
============================================================ */
function normalizePhoneOcrChars(value) {
  return String(value || "")
    .replace(/[Oo]/g, "0")
    .replace(/[Il|]/g, "1")
    .replace(/[S]/g, "5")
    .replace(/[B]/g, "8")
    .replace(/[–—־]/g, "-")
    .replace(/[()]/g, " ")
    .replace(/[\u200E\u200F]/g, " ");
}

/* ============================================================
   עזר: נרמול טלפון רק להדבקה/תמונה
   לא משתמשים בזה באקסל כדי לא לשנות את הייבוא התקין שלך
============================================================ */
function normalizeSmartPhone(value) {
  let phone = normalizePhoneOcrChars(value).trim();

  phone = phone.replace(/^00\s*972/, "+972");
  phone = phone.replace(/[^\d+]/g, "");

  if (phone.startsWith("+972")) {
    phone = "0" + phone.slice(4);
  } else if (phone.startsWith("972")) {
    phone = "0" + phone.slice(3);
  }

  phone = phone.replace(/\D/g, "");

  if (phone.length === 9 && phone.startsWith("5")) {
    phone = `0${phone}`;
  }

  const localMatch = phone.match(/05\d{8}/);
  if (localMatch?.[0]) return localMatch[0];

  const intlMatch = phone.match(/972(5\d{8})/);
  if (intlMatch?.[1]) return `0${intlMatch[1]}`;

  return phone || "";
}

/* ============================================================
   עזר: חילוץ טלפון משורה
============================================================ */
function extractPhoneFromLine(line) {
  const text = normalizePhoneOcrChars(line)
    .replace(/[\u200E\u200F]/g, " ")
    .trim();

  const patterns = [
    /(?:\+|00)?\s*972\s*[-–]?\s*(5\d)\s*[-–]?\s*(\d{3})\s*[-–]?\s*(\d{4})/,
    /0?\s*(5\d)\s*[-–]?\s*(\d{3})\s*[-–]?\s*(\d{4})/,
    /(?:\+|00)?\s*972[\s\-–]*(5\d[\d\s\-–]{7,12})/,
    /0?\s*(5\d[\d\s\-–]{7,12})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    let raw = match[0];

    if (match[1] && match[2] && match[3]) {
      raw = `${match[1]}${match[2]}${match[3]}`;
    }

    const phone = normalizeSmartPhone(raw);

    if (/^05\d{8}$/.test(phone)) {
      return phone;
    }
  }

  const digits = text.replace(/\D/g, "");
  if (!digits) return "";

  const intl = digits.match(/972(5\d{8})/);
  if (intl?.[1]) return `0${intl[1]}`;

  const local = digits.match(/05\d{8}/);
  if (local?.[0]) return local[0];

  const localNoZero = digits.match(/5\d{8}/);
  if (localNoZero?.[0]) return `0${localNoZero[0]}`;

  return "";
}

/* ============================================================
   עזר: חילוץ כמות מתוך טקסט
============================================================ */
function extractGuestsCountFromLine(line) {
  const text = normalizeText(line);

  const explicitMatch =
    text.match(/(?:כמות|מוזמנים|אורחים|נפשות)\s*[:\-]?\s*(\d{1,2})/) ||
    text.match(/(\d{1,2})\s*(?:מוזמנים|אורחים|נפשות)/);

  if (!explicitMatch?.[1]) return 1;

  const count = Number(explicitMatch[1]);
  if (!Number.isFinite(count) || count < 1) return 1;

  return Math.min(Math.floor(count), 99);
}

/* ============================================================
   עזר: ניקוי שם
============================================================ */
function cleanNameText(value) {
  let text = normalizeText(value);

  text = text
    .replace(
      /(?:שליחת פרטי אנשי הקשר|שליחה|נייד|טלפון|שם החברה|שם מלא|שם)/g,
      " "
    )
    .replace(/[✓✔●•@]+/g, " ")
    .replace(/[|,;]+/g, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  text = text
    .split(" ")
    .filter((word) => {
      const clean = word.trim();
      if (!clean) return false;
      if (clean.length === 1) return false;
      if (/^[םסמ]{1,2}$/.test(clean)) return false;
      return true;
    })
    .join(" ")
    .trim();

  return text;
}

/* ============================================================
   עזר: חילוץ שם מתוך שורת טקסט
============================================================ */
function extractNameFromLine(line, phone) {
  let name = normalizeText(line);

  name = name.replace(
    /(?:\+|00)?\s*972\s*[-–]?\s*5\d\s*[-–]?\s*\d{3}\s*[-–]?\s*\d{4}/g,
    " "
  );

  name = name.replace(
    /0?\s*5\d\s*[-–]?\s*\d{3}\s*[-–]?\s*\d{4}/g,
    " "
  );

  if (phone) {
    const digits = String(phone).replace(/\D/g, "");
    const noZero = digits.replace(/^0/, "");

    const possibleFormats = [
      digits,
      noZero,
      `+972${noZero}`,
      `972${noZero}`,
      `+972 ${noZero}`,
      `972 ${noZero}`,
    ];

    possibleFormats.forEach((format) => {
      name = name.replace(format, " ");
    });
  }

  name = name
    .replace(/(?:כמות|מוזמנים|אורחים|נפשות)\s*[:\-]?\s*\d{1,2}/g, " ")
    .replace(/\d{1,2}\s*(?:מוזמנים|אורחים|נפשות)/g, " ");

  return cleanNameText(name);
}

/* ============================================================
   עזר: שורת רעש
============================================================ */
function isNoiseLine(line) {
  const text = normalizeText(line);

  if (!text) return true;

  const exactNoise = [
    "שליחה",
    "שליחת פרטי אנשי הקשר",
    "נייד",
    "טלפון",
    "שם",
    "שם מלא",
    "שם החברה",
    "חברה",
    "רשימת מוזמנים",
    "מוזמנים",
    "אורחים",
  ];

  if (exactNoise.includes(text)) return true;
  if (/^[✓✔●•@+\-\s\d]+$/.test(text)) return true;

  return false;
}

/* ============================================================
   עזר: האם שורה נראית כמו שם
============================================================ */
function looksLikeNameLine(line) {
  const text = cleanNameText(line);

  if (!text) return false;
  if (isNoiseLine(text)) return false;
  if (extractPhoneFromLine(text)) return false;

  if (!/[א-תA-Za-z]/.test(text)) return false;
  if (text.length < 2) return false;

  const badWords = [
    "נייד",
    "טלפון",
    "שם",
    "שם מלא",
    "שם החברה",
    "שליחה",
    "שליחת",
    "פרטי",
    "אנשי",
    "הקשר",
  ];

  if (badWords.includes(text)) return false;

  return true;
}

/* ============================================================
   עזר: פירוק טקסט OCR לשורות נקיות
============================================================ */
function splitSmartLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .flatMap((line) => {
      return line
        .replace(/\s+(נייד)\s+/g, "\n$1\n")
        .split("\n")
        .map((x) => normalizeText(x));
    })
    .filter(Boolean);
}

/* ============================================================
   עזר: שורות OCR / הדבקה → קבוצות של שם + טלפון
============================================================ */
function buildGuestLinesFromText(text) {
  const lines = splitSmartLines(text);

  const guestLines = [];
  let lastNameCandidate = "";

  for (const originalLine of lines) {
    const line = normalizeText(originalLine);
    const phone = extractPhoneFromLine(line);

    if (phone) {
      const nameFromSameLine = cleanNameText(extractNameFromLine(line, phone));

      if (nameFromSameLine && looksLikeNameLine(nameFromSameLine)) {
        guestLines.push(`${nameFromSameLine} ${phone}`);
      } else if (lastNameCandidate) {
        guestLines.push(`${lastNameCandidate} ${phone}`);
      } else {
        guestLines.push(`ללא שם ${phone}`);
      }

      lastNameCandidate = "";
      continue;
    }

    if (isNoiseLine(line)) continue;

    const cleanedName = cleanNameText(line);

    if (looksLikeNameLine(cleanedName)) {
      // לא מדלגים על "אקדמיה/סטודיו/חברה" כי זה יכול להיות חלק משם איש קשר אמיתי.
      lastNameCandidate = cleanedName;
    }
  }

  return guestLines;
}

/* ============================================================
   עזר: הסרת כפילויות לפי טלפון
============================================================ */
function uniqueGuestsByPhone(guests) {
  const seen = new Set();

  return guests.filter((guest) => {
    if (!guest?.phone) return true;
    if (seen.has(guest.phone)) return false;

    seen.add(guest.phone);
    return true;
  });
}

/* ============================================================
   עזר: הפיכת טקסט חופשי לרשימת מוזמנים
============================================================ */
function parseGuestsFromText(text) {
  const guestLines = buildGuestLinesFromText(text);

  const guests = guestLines
    .map((line) => {
      const phone = extractPhoneFromLine(line);
      const name = extractNameFromLine(line, phone);
      const guestsCount = extractGuestsCountFromLine(line);

      if (!name && !phone) return null;

      return {
        name: name || "ללא שם",
        phone: phone || null,
        relation: null,
        group: null,
        rsvp: "pending",
        guestsCount,
        arrivedCount: 0,
        notes: null,
        tableNumber: null,
        tableName: null,
      };
    })
    .filter(Boolean);

  return uniqueGuestsByPhone(guests);
}

/* ============================================================
   עזר: מיזוג תוצאות OCR מכמה סריקות
   אם אותה רשומה זוהתה בכמה צורות, שומרים לפי טלפון.
============================================================ */
function mergeGuestsFromOcrTexts(texts = []) {
  const allGuests = texts.flatMap((text) => parseGuestsFromText(text));

  const byPhone = new Map();
  const withoutPhone = [];

  allGuests.forEach((guest) => {
    if (!guest?.phone) {
      withoutPhone.push(guest);
      return;
    }

    const existing = byPhone.get(guest.phone);

    if (!existing) {
      byPhone.set(guest.phone, guest);
      return;
    }

    const existingName = normalizeText(existing.name || "");
    const newName = normalizeText(guest.name || "");

    // מעדיף שם ארוך/מלא יותר, כי OCR לפעמים קולט רק חלק מהשם.
    if (newName.length > existingName.length) {
      byPhone.set(guest.phone, {
        ...existing,
        ...guest,
        name: newName,
      });
    }
  });

  return uniqueGuestsByPhone([...byPhone.values(), ...withoutPhone]);
}

/* ============================================================
   עזר: הכנה לתצוגה מקדימה
============================================================ */
function preparePreviewGuests(guests) {
  return guests.map((guest, index) => ({
    ...guest,
    _previewId: `${Date.now()}-${index}-${Math.random()
      .toString(16)
      .slice(2)}`,
    name: normalizeText(guest?.name || "") || "ללא שם",
    phone: normalizeText(guest?.phone || "") || "",
    guestsCount: Math.max(1, Number(guest?.guestsCount || 1) || 1),
    relation: guest?.relation || null,
    group: guest?.group || null,
    rsvp: guest?.rsvp || "pending",
    arrivedCount: Number(guest?.arrivedCount || 0),
    notes: guest?.notes || null,
    tableNumber: guest?.tableNumber ?? null,
    tableName: guest?.tableName ?? null,
  }));
}

/* ============================================================
   עזר: ניקוי לפני שליחה לשרת
============================================================ */
function cleanGuestsForServer(guests) {
  return guests
    .map((guest) => {
      const name = normalizeText(guest?.name || "");
      const phone = normalizeText(guest?.phone || "").replace(/\D/g, "");
      const guestsCount = Math.max(1, Number(guest?.guestsCount || 1) || 1);

      if (!name && !phone) return null;

      return {
        name: name || "ללא שם",
        phone: phone || null,
        relation: guest?.relation || null,
        group: guest?.group || null,
        rsvp: guest?.rsvp || "pending",
        guestsCount,
        arrivedCount: Number(guest?.arrivedCount || 0),
        notes: guest?.notes || null,
        tableNumber: guest?.tableNumber ?? null,
        tableName: guest?.tableName ?? null,
      };
    })
    .filter(Boolean);
}

/* ============================================================
   שיפור תמונה לפני OCR - עדין יותר כדי לא להרוס עברית
============================================================ */
async function preprocessImageForOcr(file) {
  if (typeof window === "undefined") return file;

  const imageUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = imageUrl;
    });

    const scale = 2;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) return file;

    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png", 1);
    });

    return blob || file;
  } catch (error) {
    console.warn("OCR preprocess failed, using original image", error);
    return file;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
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
  const [activeTab, setActiveTab] = useState("excel");

  const [file, setFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [pastedText, setPastedText] = useState("");

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const [ocrText, setOcrText] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);

  const [previewGuests, setPreviewGuests] = useState([]);
  const [previewSource, setPreviewSource] = useState("");

  const selectedFileName = useMemo(() => file?.name || "", [file]);
  const selectedImageName = useMemo(() => imageFile?.name || "", [imageFile]);

  const recordsLimit = useMemo(() => {
    return normalizeNumber(
      guestLimit || allowedRecords || maxRecords || user?.guests || 0
    );
  }, [guestLimit, allowedRecords, maxRecords, user?.guests]);

  const hasPreview = previewGuests.length > 0;

  const resetMessages = () => {
    setSummary(null);
  };

  const clearPreview = () => {
    setPreviewGuests([]);
    setPreviewSource("");
  };

  const openPreview = (guests, sourceLabel) => {
    const prepared = preparePreviewGuests(guests);

    if (!prepared.length) {
      alert("לא נמצאו מוזמנים תקינים להצגה");
      return;
    }

    setPreviewGuests(prepared);
    setPreviewSource(sourceLabel);
    setSummary({
      type: "success",
      text: `נמצאו ${prepared.length} מוזמנים לבדיקה. אפשר לערוך לפני שמירה.`,
      usage: null,
    });
  };

  const updatePreviewGuest = (previewId, field, value) => {
    setPreviewGuests((prev) =>
      prev.map((guest) => {
        if (guest._previewId !== previewId) return guest;

        if (field === "guestsCount") {
          return {
            ...guest,
            guestsCount: Math.max(1, Number(value || 1) || 1),
          };
        }

        return {
          ...guest,
          [field]: value,
        };
      })
    );
  };

  const removePreviewGuest = (previewId) => {
    setPreviewGuests((prev) =>
      prev.filter((guest) => guest._previewId !== previewId)
    );
  };

  const handleFileChange = (e) => {
    resetMessages();
    clearPreview();
    setFile(e.target.files?.[0] || null);
  };

  const handleImageChange = (e) => {
    resetMessages();
    clearPreview();
    setOcrText("");
    setOcrProgress(0);
    setImageFile(e.target.files?.[0] || null);
  };

  const showLimitError = ({ limit, incomingCount }) => {
    const msg = `לא ניתן להעלות. החבילה שלך מאפשרת עד ${limit} רשומות בלבד, ובייבוא נמצאו ${incomingCount} רשומות.`;

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

  const checkRecordsLimit = (incomingRecordsCount) => {
    if (recordsLimit > 0 && incomingRecordsCount > recordsLimit) {
      showLimitError({
        limit: recordsLimit,
        incomingCount: incomingRecordsCount,
      });
      return false;
    }

    return true;
  };

  const sendGuestsToServer = async (guests, successPrefix = "יובאו") => {
    const cleanedGuests = cleanGuestsForServer(guests);
    const incomingRecordsCount = cleanedGuests.length;

    if (!incomingRecordsCount) {
      alert("אין מוזמנים תקינים לשמירה");
      return;
    }

    if (!checkRecordsLimit(incomingRecordsCount)) {
      return;
    }

    const res = await fetch("/api/guests/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId, guests: cleanedGuests }),
    });

    const result = await res.json();
    console.log("📦 Import result:", result);

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
          `לא ניתן להעלות. החבילה שלך מאפשרת עד ${serverLimit} רשומות בלבד, ובייבוא נמצאו ${serverIncoming} רשומות.`;

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
        result?.message || result?.error || "שגיאה בייבוא המוזמנים";

      alert(errMsg);

      setSummary({
        type: "error",
        text: errMsg,
        usage: result?.usage || null,
      });

      return;
    }

    const count = Number(result?.count || 0);
    const skippedByLimit = Number(result?.skippedByLimit || 0);
    const usage = result?.usage || null;

    if (skippedByLimit > 0) {
      const msg =
        result?.message ||
        `${successPrefix} ${count} מוזמנים. ${skippedByLimit} לא יובאו בגלל מגבלת מכסה.`;

      alert(`⚠️ ${msg}`);

      setSummary({
        type: "partial",
        text: msg,
        usage,
      });
    } else {
      const msg =
        result?.message || `✅ ${successPrefix} ${count} מוזמנים בהצלחה`;

      alert(msg);

      setSummary({
        type: "success",
        text: msg,
        usage,
      });
    }

    clearPreview();
    await onSuccess?.();
    onClose?.();
  };

  const handleConfirmPreview = async () => {
    if (!previewGuests.length) {
      alert("אין מוזמנים לשמירה");
      return;
    }

    setLoading(true);
    setSummary(null);

    try {
      await sendGuestsToServer(previewGuests, "יובאו");
    } catch (err) {
      console.error("❌ Confirm Preview Error:", err);
      alert("שגיאה בשמירת המוזמנים");

      setSummary({
        type: "error",
        text: "שגיאה בשמירת המוזמנים",
        usage: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = async () => {
    if (!file) {
      alert("יש לבחור קובץ אקסל תחילה");
      return;
    }

    setLoading(true);
    setSummary(null);
    clearPreview();

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      if (!workbook.SheetNames?.length) {
        alert("הקובץ לא מכיל גיליון תקין");
        return;
      }

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rawJson = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      });

      console.log("📄 RAW JSON FULL:", rawJson);

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

          // לא לגעת: זה בדיוק כמו שהיה אצלך באקסל
          const phoneClean = normalizeText(phoneRaw).replace(/\D/g, "");

          console.log("➡️ PHONE RAW:", phoneRaw);
          console.log("➡️ PHONE CLEAN:", phoneClean);

          const tableNumber = normalizeTableNumber(
            row["מס' שולחן"] ?? row["מספר שולחן"] ?? row["שולחן"] ?? ""
          );

          console.log("➡️ TABLE:", tableNumber);

          return {
            name,
            phone: phoneClean || null,
            relation: relationRaw || null,
            group: groupRaw || null,
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

      console.log("📦 FINAL GUESTS:", guests);

      if (guests.length === 0) {
        alert("לא נמצאו שורות תקינות לייבוא");
        return;
      }

      if (!checkRecordsLimit(guests.length)) return;

      openPreview(guests, "Excel");
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

  const handleImportPastedList = async () => {
    const guests = parseGuestsFromText(pastedText);

    if (!guests.length) {
      alert("לא נמצאו מוזמנים תקינים בטקסט שהודבק");
      return;
    }

    if (!checkRecordsLimit(guests.length)) return;

    setSummary(null);
    clearPreview();

    console.log("📋 PASTED GUESTS:", guests);
    openPreview(guests, "הדבקת רשימה");
  };

  const handleImportImage = async () => {
    if (!imageFile) {
      alert("יש לבחור תמונה או צילום מסך תחילה");
      return;
    }

    setLoading(true);
    setSummary(null);
    clearPreview();
    setOcrText("");
    setOcrProgress(0);

    try {
      const Tesseract = await import("tesseract.js");
      const processedImage = await preprocessImageForOcr(imageFile);

      const scanOptionsBase = {
        preserve_interword_spaces: "1",
      };

      // סריקה 1: התמונה המקורית - לפעמים מדויקת יותר במספרים.
      const originalResult = await Tesseract.recognize(imageFile, "heb+eng", {
        ...scanOptionsBase,
        tessedit_pageseg_mode: "6",
        logger: (m) => {
          if (m?.status === "recognizing text") {
            setOcrProgress(Math.round((m.progress || 0) * 45));
          }
        },
      });

      // סריקה 2: תמונה מוגדלת/מעובדת - לפעמים מדויקת יותר בשמות.
      const processedResult = await Tesseract.recognize(processedImage, "heb+eng", {
        ...scanOptionsBase,
        tessedit_pageseg_mode: "11",
        logger: (m) => {
          if (m?.status === "recognizing text") {
            setOcrProgress(45 + Math.round((m.progress || 0) * 55));
          }
        },
      });

      const originalText = String(originalResult?.data?.text || "").trim();
      const processedText = String(processedResult?.data?.text || "").trim();

      const combinedText = [
        "===== סריקה מקורית =====",
        originalText || "לא זוהה טקסט בסריקה המקורית",
        "",
        "===== סריקה חכמה =====",
        processedText || "לא זוהה טקסט בסריקה החכמה",
      ].join("\\n");

      console.log("📷 OCR ORIGINAL TEXT:", originalText);
      console.log("📷 OCR PROCESSED TEXT:", processedText);

      setOcrText(combinedText);

      if (!originalText && !processedText) {
        alert("לא זוהה טקסט בתמונה");

        setSummary({
          type: "error",
          text: "לא זוהה טקסט בתמונה. נסי להעלות צילום מסך ברור יותר.",
          usage: null,
        });

        return;
      }

      const guests = mergeGuestsFromOcrTexts([originalText, processedText]);

      console.log("📷 OCR MERGED GUESTS:", guests);

      if (!guests.length) {
        alert("זוהה טקסט, אבל לא נמצאו שמות וטלפונים תקינים");

        setSummary({
          type: "error",
          text:
            "זוהה טקסט, אבל לא נמצאו שמות וטלפונים תקינים. מומלץ שהתמונה תהיה צילום מסך ברור מתוך אנשי קשר/וואטסאפ.",
          usage: null,
        });

        return;
      }

      if (!checkRecordsLimit(guests.length)) return;

      openPreview(guests, "תמונה / צילום מסך");
    } catch (err) {
      console.error("❌ Image OCR Error:", err);
      alert("שגיאה בסריקת התמונה");

      setSummary({
        type: "error",
        text: "שגיאה בסריקת התמונה. ודאי שהותקנה החבילה tesseract.js.",
        usage: null,
      });
    } finally {
      setLoading(false);
      setOcrProgress(0);
    }
  };

  const renderActiveImportButton = () => {
    if (hasPreview) {
      return null;
    }

    if (activeTab === "excel") {
      return (
        <button
          type="button"
          onClick={handleImportExcel}
          disabled={loading}
          className="
            mt-5 flex w-full items-center justify-center gap-2
            rounded-full bg-[#128C3A] px-6 py-4
            text-base font-black text-white
            shadow-[0_14px_35px_rgba(18,140,58,0.24)]
            transition hover:bg-[#0F7A32]
            disabled:cursor-not-allowed disabled:opacity-60
          "
        >
          {loading ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              קורא את הקובץ...
            </>
          ) : (
            <>בדיקת קובץ והצגת מוזמנים</>
          )}
        </button>
      );
    }

    if (activeTab === "paste") {
      return (
        <button
          type="button"
          onClick={handleImportPastedList}
          disabled={loading}
          className="
            mt-5 flex w-full items-center justify-center gap-2
            rounded-full bg-[#128C3A] px-6 py-4
            text-base font-black text-white
            shadow-[0_14px_35px_rgba(18,140,58,0.24)]
            transition hover:bg-[#0F7A32]
            disabled:cursor-not-allowed disabled:opacity-60
          "
        >
          זיהוי מהרשימה והצגה לבדיקה
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleImportImage}
        disabled={loading}
        className="
          mt-5 flex w-full items-center justify-center gap-2
          rounded-full bg-[#128C3A] px-6 py-4
          text-base font-black text-white
          shadow-[0_14px_35px_rgba(18,140,58,0.24)]
          transition hover:bg-[#0F7A32]
          disabled:cursor-not-allowed disabled:opacity-60
        "
      >
        {loading ? (
          <>
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            {ocrProgress > 0
              ? `סורק תמונה... ${ocrProgress}%`
              : "מכין סריקה..."}
          </>
        ) : (
          <>סריקת תמונה והצגה לבדיקה</>
        )}
      </button>
    );
  };

  return (
    <div
      className="
        fixed inset-0 z-50 flex items-center justify-center
        bg-black/50 px-4 py-6 backdrop-blur-sm
      "
      dir="rtl"
    >
      <div
        className="
          relative flex max-h-[92vh] w-full max-w-[860px] flex-col
          overflow-hidden rounded-[34px]
          border border-[#EFE2CF] bg-[#FFFCF7]
          shadow-[0_30px_100px_rgba(25,18,10,0.28)]
        "
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="
            absolute left-5 top-5 z-20 flex h-10 w-10 items-center justify-center
            rounded-full bg-white/85 text-xl font-bold text-[#6B5138]
            shadow-sm transition hover:bg-[#F6EBD9] disabled:opacity-50
          "
          aria-label="סגירה"
        >
          ×
        </button>

        <div
          className="
            relative overflow-hidden
            border-b border-[#EFE2CF]
            bg-gradient-to-l from-[#F8EEDC] via-[#FFF7EA] to-[#FFFFFF]
            px-7 pb-7 pt-8 sm:px-10
          "
        >
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#D6B16A]/20 blur-2xl" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-[#8B6A3F]/10 blur-2xl" />

          <div className="relative">
            <div
              className="
                mx-auto mb-4 flex h-16 w-16 items-center justify-center
                rounded-3xl border border-[#EFE2CF] bg-white text-3xl
                shadow-[0_12px_35px_rgba(139,106,63,0.18)]
              "
            >
              {activeTab === "excel"
                ? "📊"
                : activeTab === "paste"
                ? "📋"
                : "📷"}
            </div>

            <h2 className="text-center text-2xl font-black text-[#2F241A] sm:text-3xl">
              ייבוא מוזמנים
            </h2>

            <p className="mx-auto mt-3 max-w-[560px] text-center text-sm leading-7 text-[#7A6A59] sm:text-base">
              בחרו דרך ייבוא, בדקו את הרשימה, ערכו במידת הצורך ורק אז שמרו
              למערכת.
            </p>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-6 sm:px-9 sm:py-8">
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {IMPORT_TABS.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (loading) return;
                    setActiveTab(tab.id);
                    setSummary(null);
                    clearPreview();
                  }}
                  className={`
                    rounded-[22px] border px-4 py-4 text-center transition
                    ${
                      isActive
                        ? "border-[#C89A46] bg-[#F7E7C7] shadow-[0_12px_28px_rgba(139,106,63,0.16)]"
                        : "border-[#EFE2CF] bg-white hover:border-[#D6B16A] hover:bg-[#FFF8ED]"
                    }
                  `}
                >
                  <div className="text-2xl">{tab.icon}</div>
                  <div
                    className={`mt-2 text-sm font-black ${
                      isActive ? "text-[#5A3D18]" : "text-[#3E2D20]"
                    }`}
                  >
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-[28px] border border-dashed border-[#D6B16A] bg-[#FFF8ED] p-5 sm:p-6">
            {activeTab === "excel" ? (
              <>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-[#3E2D20]">
                      העלאת קובץ אקסל
                    </h3>
                    <p className="mt-1 text-sm text-[#7A6A59]">
                      ניתן להעלות קובץ מסוג XLSX או XLS בלבד.
                    </p>
                  </div>

                  <a
                    href="/Invistimo_v4.xlsx?v=4"
                    download
                    className="
                      inline-flex items-center justify-center gap-2
                      rounded-full bg-white px-4 py-2
                      text-xs font-bold text-[#8B6A3F]
                      border border-[#EFE2CF]
                    "
                  >
                    📄 הורדת תבנית
                  </a>
                </div>

                <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-[#EFE2CF] bg-white px-4 py-6 text-center shadow-[0_10px_30px_rgba(95,68,34,0.05)] transition hover:border-[#D6B16A] hover:bg-[#FFFDF8]">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4E7D1] text-2xl">
                    ⬆️
                  </div>

                  <p className="text-base font-black text-[#3E2D20]">
                    {selectedFileName
                      ? "הקובץ נבחר בהצלחה"
                      : "בחרו קובץ להעלאה"}
                  </p>

                  <p className="mt-1 max-w-[420px] text-sm leading-6 text-[#7A6A59]">
                    {selectedFileName
                      ? selectedFileName
                      : "לחצו כאן לבחירת קובץ האקסל מהמחשב או מהטלפון"}
                  </p>
                </label>
              </>
            ) : null}

            {activeTab === "paste" ? (
              <>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-[#3E2D20]">
                      הדבקת רשימת מוזמנים
                    </h3>
                    <p className="mt-1 text-sm text-[#7A6A59]">
                      הדביקו כל מוזמן בשורה נפרדת. אפשר גם שם וטלפון בשורות
                      נפרדות.
                    </p>
                  </div>

                  <div className="inline-flex items-center justify-center rounded-full border border-[#EFE2CF] bg-white px-4 py-2 text-xs font-bold text-[#8B6A3F]">
                    זיהוי אוטומטי
                  </div>
                </div>

                <textarea
                  value={pastedText}
                  onChange={(e) => {
                    setSummary(null);
                    clearPreview();
                    setPastedText(e.target.value);
                  }}
                  placeholder={`לדוגמה:
דנה כהן 0521234567
יוסי לוי - 0549876543
משפחת אברהם
+972555039072`}
                  className="
                    min-h-[220px] w-full resize-none rounded-[24px]
                    border border-[#EFE2CF] bg-white px-4 py-4
                    text-sm leading-7 text-[#3E2D20]
                    shadow-[0_10px_30px_rgba(95,68,34,0.05)]
                    outline-none transition
                    placeholder:text-[#B7A893]
                    focus:border-[#D6B16A] focus:ring-4 focus:ring-[#D6B16A]/15
                  "
                />

                <div className="mt-4 rounded-2xl border border-[#EFE2CF] bg-white px-4 py-3 text-sm leading-6 text-[#7A6A59]">
                  המערכת תזהה גם מספרים בפורמט{" "}
                  <span className="font-black text-[#3E2D20]">+972</span>{" "}
                  ותמיר אותם לפורמט ישראלי רגיל.
                </div>
              </>
            ) : null}

            {activeTab === "image" ? (
              <>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-[#3E2D20]">
                      העלאת תמונה / צילום מסך
                    </h3>
                    <p className="mt-1 text-sm text-[#7A6A59]">
                      סריקה חכמה ללא OpenAI וללא טוקנים. אחרי הסריקה תוצג טבלה לעריכה
                      לפני שמירה.
                    </p>
                  </div>

                  <div className="inline-flex items-center justify-center rounded-full border border-[#EFE2CF] bg-white px-4 py-2 text-xs font-bold text-[#8B6A3F]">
                    OCR מקומי
                  </div>
                </div>

                <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-[#EFE2CF] bg-white px-4 py-6 text-center shadow-[0_10px_30px_rgba(95,68,34,0.05)] transition hover:border-[#D6B16A] hover:bg-[#FFFDF8]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4E7D1] text-2xl">
                    📷
                  </div>

                  <p className="text-base font-black text-[#3E2D20]">
                    {selectedImageName
                      ? "התמונה נבחרה בהצלחה"
                      : "בחרו תמונה לסריקה"}
                  </p>

                  <p className="mt-1 max-w-[460px] text-sm leading-6 text-[#7A6A59]">
                    {selectedImageName
                      ? selectedImageName
                      : "לחצו כאן לבחירת צילום מסך מהמחשב / מהטלפון"}
                  </p>
                </label>

                {ocrText ? (
                  <div className="mt-4 rounded-2xl border border-[#EFE2CF] bg-white px-4 py-3">
                    <p className="mb-2 text-xs font-black text-[#8B6A3F]">
                      טקסט שזוהה מהתמונה
                    </p>
                    <pre className="max-h-[140px] overflow-auto whitespace-pre-wrap text-xs leading-6 text-[#3E2D20]">
                      {ocrText}
                    </pre>
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold leading-6 text-yellow-800">
                  זו סריקה חכמה מתוך תמונה, אך האחריות היא שלכם לעבור על התצוגה המקדימה,
                  לבדוק שמות ומספרים ולערוך במידת הצורך לפני שמירה.
                </div>
              </>
            ) : null}

            {recordsLimit > 0 ? (
              <div className="mt-4 rounded-2xl border border-[#EFE2CF] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#7A6A59]">
                החבילה מאפשרת עד{" "}
                <span className="font-black text-[#3E2D20]">
                  {recordsLimit}
                </span>{" "}
                רשומות.
              </div>
            ) : null}

            {renderActiveImportButton()}
          </div>

          {hasPreview ? (
            <div className="mt-6 rounded-[28px] border border-[#EFE2CF] bg-white p-4 shadow-[0_12px_34px_rgba(95,68,34,0.08)]">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#2F241A]">
                    בדיקת מוזמנים לפני שמירה
                  </h3>
                  <p className="mt-1 text-sm text-[#7A6A59]">
                    מקור: {previewSource || "ייבוא"} · נמצאו{" "}
                    <span className="font-black text-[#2F241A]">
                      {previewGuests.length}
                    </span>{" "}
                    מוזמנים. ניתן לערוך שם, טלפון וכמות לפני השמירה.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearPreview}
                  disabled={loading}
                  className="
                    rounded-full border border-[#EFE2CF] bg-[#FFFCF7]
                    px-4 py-2 text-xs font-black text-[#7A6A59]
                    transition hover:bg-[#F6EBD9]
                    disabled:opacity-50
                  "
                >
                  ניקוי תצוגה
                </button>
              </div>

              {previewSource === "תמונה / צילום מסך" ? (
                <div className="mb-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-bold leading-6 text-yellow-800">
                  זו סריקה חכמה מתוך תמונה. האחריות היא שלכם לעבור על התצוגה המקדימה,
                  לבדוק שכל שם וכל מספר נקלטו נכון, ולערוך במידת הצורך לפני שמירה.
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-[22px] border border-[#EFE2CF]">
                <table className="min-w-[720px] w-full text-right text-sm">
                  <thead className="bg-[#F8F1E6] text-[#6B5138]">
                    <tr>
                      <th className="px-4 py-3 font-black">#</th>
                      <th className="px-4 py-3 font-black">שם מלא</th>
                      <th className="px-4 py-3 font-black">טלפון</th>
                      <th className="px-4 py-3 font-black">כמות</th>
                      <th className="px-4 py-3 font-black">סטטוס</th>
                      <th className="px-4 py-3 font-black">פעולה</th>
                    </tr>
                  </thead>

                  <tbody>
                    {previewGuests.map((guest, index) => {
                      const phoneValid =
                        !guest.phone || /^05\d{8}$/.test(guest.phone);

                      return (
                        <tr
                          key={guest._previewId}
                          className="border-t border-[#EFE2CF] bg-white"
                        >
                          <td className="px-4 py-3 font-black text-[#8B6A3F]">
                            {index + 1}
                          </td>

                          <td className="px-4 py-3">
                            <input
                              value={guest.name || ""}
                              onChange={(e) =>
                                updatePreviewGuest(
                                  guest._previewId,
                                  "name",
                                  e.target.value
                                )
                              }
                              className="
                                w-full rounded-2xl border border-[#EFE2CF]
                                bg-[#FFFCF7] px-3 py-2
                                font-bold text-[#2F241A]
                                outline-none transition
                                focus:border-[#D6B16A]
                                focus:ring-4 focus:ring-[#D6B16A]/15
                              "
                            />
                          </td>

                          <td className="px-4 py-3">
                            <input
                              value={guest.phone || ""}
                              onChange={(e) =>
                                updatePreviewGuest(
                                  guest._previewId,
                                  "phone",
                                  normalizeSmartPhone(e.target.value)
                                )
                              }
                              className={`
                                w-full rounded-2xl border px-3 py-2
                                bg-[#FFFCF7]
                                font-semibold text-[#2F241A]
                                outline-none transition
                                focus:ring-4 focus:ring-[#D6B16A]/15
                                ${
                                  phoneValid
                                    ? "border-[#EFE2CF] focus:border-[#D6B16A]"
                                    : "border-red-300 focus:border-red-400"
                                }
                              `}
                            />
                            {!phoneValid ? (
                              <p className="mt-1 text-xs font-bold text-red-600">
                                מספר לא נראה תקין
                              </p>
                            ) : null}
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={guest.guestsCount || 1}
                              onChange={(e) =>
                                updatePreviewGuest(
                                  guest._previewId,
                                  "guestsCount",
                                  e.target.value
                                )
                              }
                              className="
                                w-20 rounded-2xl border border-[#EFE2CF]
                                bg-[#FFFCF7] px-3 py-2
                                text-center font-black text-[#2F241A]
                                outline-none transition
                                focus:border-[#D6B16A]
                                focus:ring-4 focus:ring-[#D6B16A]/15
                              "
                            />
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`
                                inline-flex rounded-full px-3 py-1 text-xs font-black
                                ${
                                  previewSource === "תמונה / צילום מסך"
                                    ? "bg-yellow-50 text-yellow-700"
                                    : guest.name && phoneValid
                                    ? "bg-green-50 text-green-700"
                                    : "bg-yellow-50 text-yellow-700"
                                }
                              `}
                            >
                              {previewSource === "תמונה / צילום מסך"
                                ? "לבדיקה"
                                : guest.name && phoneValid
                                ? "תקין"
                                : "דורש בדיקה"}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                removePreviewGuest(guest._previewId)
                              }
                              disabled={loading}
                              className="
                                rounded-full bg-red-50 px-3 py-2
                                text-xs font-black text-red-600
                                transition hover:bg-red-100
                                disabled:opacity-50
                              "
                            >
                              מחיקה
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleConfirmPreview}
                  disabled={loading || !previewGuests.length}
                  className="
                    flex flex-1 items-center justify-center gap-2
                    rounded-full bg-[#128C3A] px-6 py-4
                    text-base font-black text-white
                    shadow-[0_14px_35px_rgba(18,140,58,0.24)]
                    transition hover:bg-[#0F7A32]
                    disabled:cursor-not-allowed disabled:opacity-60
                  "
                >
                  {loading ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      שומר מוזמנים...
                    </>
                  ) : (
                    <>אישור ושמירת המוזמנים</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={clearPreview}
                  disabled={loading}
                  className="
                    rounded-full border border-[#EFE2CF]
                    bg-white px-6 py-4
                    text-sm font-black text-[#7A6A59]
                    transition hover:bg-[#F6EBD9]
                    disabled:opacity-50
                  "
                >
                  ביטול בדיקה
                </button>
              </div>
            </div>
          ) : null}

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

          <div className="mt-6 flex items-center justify-center">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="
                rounded-full px-5 py-2.5
                text-sm font-bold text-[#7A6A59]
                transition hover:bg-[#F6EBD9] hover:text-[#3E2D20]
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