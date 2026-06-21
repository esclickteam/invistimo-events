"use client";

import React, { useMemo, useRef, useState } from "react";

export const dynamic = "force-dynamic";

type PageNumber = 1 | 2;
type FieldType = "text" | "digits" | "check" | "signature";
type TextAlign = "right" | "left" | "center";

type FieldItem = {
  key: string;
  label: string;
  section: string;
  page: PageNumber;
  x: number;
  y: number;
  width: number;
  height: number;
  type: FieldType;
  sample: string;
  fontSize: number;
  digitGap?: number;
  maxDigits?: number;
  align?: TextAlign;
};

type DragState = {
  key: string;
  offsetX: number;
  offsetY: number;
} | null;

const PDF_URL = "/forms/tofes-101.pdf";

const STORAGE_KEY = "invistimo_form101_original_pdf_mapper_v1";

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

const SECTIONS = [
  { key: "year", title: "שנת מס", page: 1 },
  { key: "employer", title: "א. פרטי המעביד", page: 1 },
  { key: "employee", title: "ב. פרטי העובד/ת", page: 1 },
  { key: "children", title: "ג. ילדים", page: 1 },
  { key: "income", title: "ד. הכנסות ממעסיק זה", page: 1 },
  { key: "otherIncome", title: "ה. הכנסות אחרות", page: 1 },
  { key: "spouse", title: "ו. בן/בת זוג", page: 1 },
  { key: "credits", title: "ח. פטור / זיכוי ממס", page: 2 },
  { key: "taxCoordination", title: "ט. תיאום מס", page: 2 },
  { key: "declaration", title: "י. הצהרה וחתימה", page: 2 },
] as const;

const INITIAL_FIELDS: FieldItem[] = [
  {
    key: "taxYear",
    label: "שנת מס",
    section: "year",
    page: 1,
    x: 344,
    y: 106,
    width: 105,
    height: 30,
    type: "digits",
    sample: "2026",
    fontSize: 20,
    digitGap: 23,
    maxDigits: 4,
    align: "center",
  },

  {
    key: "employerName",
    label: "שם מעסיק",
    section: "employer",
    page: 1,
    x: 620,
    y: 248,
    width: 150,
    height: 24,
    type: "text",
    sample: "בן עשת",
    fontSize: 16,
    align: "right",
  },
  {
    key: "employerAddress",
    label: "כתובת מעסיק",
    section: "employer",
    page: 1,
    x: 430,
    y: 248,
    width: 175,
    height: 24,
    type: "text",
    sample: "העצמאות 41 קרית אתא",
    fontSize: 14,
    align: "right",
  },
  {
    key: "employerPhone",
    label: "טלפון מעסיק",
    section: "employer",
    page: 1,
    x: 245,
    y: 248,
    width: 145,
    height: 24,
    type: "digits",
    sample: "0526850711",
    fontSize: 15,
    digitGap: 13,
    maxDigits: 10,
    align: "left",
  },
  {
    key: "employerFileNumber",
    label: "תיק ניכויים",
    section: "employer",
    page: 1,
    x: 70,
    y: 248,
    width: 145,
    height: 24,
    type: "digits",
    sample: "905790028",
    fontSize: 15,
    digitGap: 14,
    maxDigits: 9,
    align: "left",
  },

  {
    key: "idNumber",
    label: "תעודת זהות",
    section: "employee",
    page: 1,
    x: 638,
    y: 338,
    width: 125,
    height: 24,
    type: "digits",
    sample: "316576578",
    fontSize: 15,
    digitGap: 13,
    maxDigits: 9,
    align: "left",
  },
  {
    key: "lastName",
    label: "שם משפחה",
    section: "employee",
    page: 1,
    x: 520,
    y: 338,
    width: 95,
    height: 24,
    type: "text",
    sample: "עשת",
    fontSize: 15,
    align: "center",
  },
  {
    key: "firstName",
    label: "שם פרטי",
    section: "employee",
    page: 1,
    x: 415,
    y: 338,
    width: 85,
    height: 24,
    type: "text",
    sample: "הדר",
    fontSize: 15,
    align: "center",
  },
  {
    key: "birthDate",
    label: "תאריך לידה",
    section: "employee",
    page: 1,
    x: 298,
    y: 338,
    width: 98,
    height: 24,
    type: "digits",
    sample: "04031997",
    fontSize: 15,
    digitGap: 12,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "immigrationDate",
    label: "תאריך עליה",
    section: "employee",
    page: 1,
    x: 170,
    y: 338,
    width: 98,
    height: 24,
    type: "digits",
    sample: "",
    fontSize: 15,
    digitGap: 12,
    maxDigits: 8,
    align: "left",
  },

  {
    key: "street",
    label: "רחוב",
    section: "employee",
    page: 1,
    x: 505,
    y: 392,
    width: 145,
    height: 24,
    type: "text",
    sample: "העצמאות",
    fontSize: 15,
    align: "right",
  },
  {
    key: "houseNumber",
    label: "מספר בית",
    section: "employee",
    page: 1,
    x: 420,
    y: 392,
    width: 60,
    height: 24,
    type: "digits",
    sample: "41",
    fontSize: 15,
    digitGap: 16,
    maxDigits: 4,
    align: "center",
  },
  {
    key: "city",
    label: "עיר",
    section: "employee",
    page: 1,
    x: 300,
    y: 392,
    width: 100,
    height: 24,
    type: "text",
    sample: "קרית אתא",
    fontSize: 15,
    align: "center",
  },
  {
    key: "postalCode",
    label: "מיקוד",
    section: "employee",
    page: 1,
    x: 200,
    y: 392,
    width: 80,
    height: 24,
    type: "digits",
    sample: "",
    fontSize: 15,
    digitGap: 11,
    maxDigits: 7,
    align: "left",
  },

  {
    key: "phone",
    label: "טלפון",
    section: "employee",
    page: 1,
    x: 330,
    y: 446,
    width: 125,
    height: 24,
    type: "digits",
    sample: "",
    fontSize: 15,
    digitGap: 12,
    maxDigits: 10,
    align: "left",
  },
  {
    key: "mobile",
    label: "נייד",
    section: "employee",
    page: 1,
    x: 165,
    y: 446,
    width: 140,
    height: 24,
    type: "digits",
    sample: "0555039072",
    fontSize: 15,
    digitGap: 13,
    maxDigits: 10,
    align: "left",
  },
  {
    key: "email",
    label: "מייל",
    section: "employee",
    page: 1,
    x: 80,
    y: 492,
    width: 230,
    height: 24,
    type: "text",
    sample: "sapir@gmail.com",
    fontSize: 15,
    align: "left",
  },

  {
    key: "genderMale",
    label: "זכר",
    section: "employee",
    page: 1,
    x: 725,
    y: 446,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "genderFemale",
    label: "נקבה",
    section: "employee",
    page: 1,
    x: 725,
    y: 474,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "maritalSingle",
    label: "רווק/ה",
    section: "employee",
    page: 1,
    x: 610,
    y: 446,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "maritalMarried",
    label: "נשוי/אה",
    section: "employee",
    page: 1,
    x: 610,
    y: 474,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "residentYes",
    label: "תושב כן",
    section: "employee",
    page: 1,
    x: 402,
    y: 446,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "residentNo",
    label: "תושב לא",
    section: "employee",
    page: 1,
    x: 402,
    y: 474,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "healthFundYes",
    label: "קופת חולים כן",
    section: "employee",
    page: 1,
    x: 160,
    y: 474,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "healthFundName",
    label: "שם קופה",
    section: "employee",
    page: 1,
    x: 70,
    y: 474,
    width: 85,
    height: 24,
    type: "text",
    sample: "כללית",
    fontSize: 14,
    align: "right",
  },

  {
    key: "workStartDate",
    label: "תחילת עבודה",
    section: "income",
    page: 1,
    x: 95,
    y: 620,
    width: 105,
    height: 24,
    type: "digits",
    sample: "22062026",
    fontSize: 15,
    digitGap: 12,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "incomeMonthlySalary",
    label: "משכורת חודש",
    section: "income",
    page: 1,
    x: 318,
    y: 610,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "incomeExtraSalary",
    label: "משרה נוספת",
    section: "income",
    page: 1,
    x: 318,
    y: 638,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "incomePartialSalary",
    label: "משכורת חלקית",
    section: "income",
    page: 1,
    x: 318,
    y: 666,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "incomeDailyWage",
    label: "שכר עבודה",
    section: "income",
    page: 1,
    x: 318,
    y: 694,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },

  {
    key: "otherNoIncome",
    label: "אין הכנסות אחרות",
    section: "otherIncome",
    page: 1,
    x: 335,
    y: 820,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },

  {
    key: "spouseId",
    label: "בן זוג ת.ז",
    section: "spouse",
    page: 1,
    x: 650,
    y: 1030,
    width: 115,
    height: 24,
    type: "digits",
    sample: "",
    fontSize: 14,
    digitGap: 12,
    maxDigits: 9,
    align: "left",
  },
  {
    key: "spouseLastName",
    label: "בן זוג משפחה",
    section: "spouse",
    page: 1,
    x: 520,
    y: 1030,
    width: 100,
    height: 24,
    type: "text",
    sample: "",
    fontSize: 14,
    align: "center",
  },
  {
    key: "spouseFirstName",
    label: "בן זוג פרטי",
    section: "spouse",
    page: 1,
    x: 395,
    y: 1030,
    width: 100,
    height: 24,
    type: "text",
    sample: "",
    fontSize: 14,
    align: "center",
  },

  {
    key: "page2IdNumber",
    label: "ת.ז עמוד 2",
    section: "credits",
    page: 2,
    x: 128,
    y: 38,
    width: 120,
    height: 24,
    type: "digits",
    sample: "316576578",
    fontSize: 15,
    digitGap: 13,
    maxDigits: 9,
    align: "left",
  },
  {
    key: "creditResident",
    label: "תושב ישראל",
    section: "credits",
    page: 2,
    x: 742,
    y: 88,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditDisabled",
    label: "נכה",
    section: "credits",
    page: 2,
    x: 742,
    y: 128,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditSettlement",
    label: "ישוב מזכה",
    section: "credits",
    page: 2,
    x: 742,
    y: 185,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditNewImmigrant",
    label: "עולה חדש",
    section: "credits",
    page: 2,
    x: 742,
    y: 250,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },

  {
    key: "taxNoIncome",
    label: "לא הייתה הכנסה",
    section: "taxCoordination",
    page: 2,
    x: 742,
    y: 850,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "taxHasOtherIncome",
    label: "יש הכנסות נוספות",
    section: "taxCoordination",
    page: 2,
    x: 742,
    y: 915,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },

  {
    key: "signatureDate",
    label: "תאריך חתימה",
    section: "declaration",
    page: 2,
    x: 260,
    y: 1035,
    width: 115,
    height: 26,
    type: "digits",
    sample: "21062026",
    fontSize: 15,
    digitGap: 13,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "signature",
    label: "חתימה",
    section: "declaration",
    page: 2,
    x: 80,
    y: 1028,
    width: 140,
    height: 42,
    type: "signature",
    sample: "חתימה",
    fontSize: 16,
    align: "center",
  },
];

function loadFields() {
  if (typeof window === "undefined") return INITIAL_FIELDS;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_FIELDS;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : INITIAL_FIELDS;
  } catch {
    return INITIAL_FIELDS;
  }
}

function onlyDigits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function alignToJustify(align?: TextAlign) {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
}

function alignToText(align?: TextAlign) {
  if (align === "center") return "center";
  if (align === "left") return "left";
  return "right";
}

function renderValue(field: FieldItem, showValues: boolean) {
  if (!showValues) return null;

  if (field.type === "check") {
    return (
      <span
        className="flex h-full w-full items-center justify-center font-black text-blue-700"
        style={{ fontSize: field.fontSize }}
      >
        ✓
      </span>
    );
  }

  if (field.type === "signature") {
    return (
      <span
        className="flex h-full w-full items-center justify-center italic text-blue-800"
        style={{ fontSize: field.fontSize }}
      >
        {field.sample || "חתימה"}
      </span>
    );
  }

  if (field.type === "digits") {
    const digits = onlyDigits(field.sample);
    const sliced = field.maxDigits ? digits.slice(0, field.maxDigits) : digits;

    return (
      <span
        dir="ltr"
        className="flex h-full w-full items-center text-blue-900"
        style={{
          justifyContent: alignToJustify(field.align),
          fontSize: field.fontSize,
          lineHeight: `${field.height}px`,
        }}
      >
        {sliced.split("").map((digit, index) => (
          <span
            key={`${field.key}-${index}`}
            className="inline-block text-center font-semibold"
            style={{ width: field.digitGap || 10 }}
          >
            {digit}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span
      className="block h-full w-full overflow-hidden whitespace-nowrap text-blue-900"
      style={{
        fontSize: field.fontSize,
        lineHeight: `${field.height}px`,
        textAlign: alignToText(field.align),
      }}
    >
      {field.sample}
    </span>
  );
}

function fieldToMap(field: FieldItem) {
  return {
    page: field.page,
    section: field.section,
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    type: field.type,
    fontSize: field.fontSize,
    digitGap: field.digitGap || null,
    maxDigits: field.maxDigits || null,
    align: field.align || "right",
  };
}

export default function Form101MapperPage() {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>(null);

  const [fields, setFields] = useState<FieldItem[]>(loadFields);
  const [page, setPage] = useState<PageNumber>(1);
  const [selectedSection, setSelectedSection] = useState("year");
  const [selectedKey, setSelectedKey] = useState("taxYear");
  const [showValues, setShowValues] = useState(true);
  const [showAllFields, setShowAllFields] = useState(false);
  const [pdfReloadKey, setPdfReloadKey] = useState(1);

  const pageSections = useMemo(
    () => SECTIONS.filter((section) => section.page === page),
    [page]
  );

  const pageFields = useMemo(
    () => fields.filter((field) => field.page === page),
    [fields, page]
  );

  const visibleFields = useMemo(() => {
    if (showAllFields) return pageFields;

    return pageFields.filter((field) => field.section === selectedSection);
  }, [pageFields, selectedSection, showAllFields]);

  const selectedField = useMemo(
    () => fields.find((field) => field.key === selectedKey) || fields[0],
    [fields, selectedKey]
  );

  function updateField(key: string, patch: Partial<FieldItem>) {
    setFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, ...patch } : field))
    );
  }

  function startDrag(
    event: React.PointerEvent<HTMLButtonElement>,
    field: FieldItem
  ) {
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      key: field.key,
      offsetX: event.clientX - rect.left - field.x,
      offsetY: event.clientY - rect.top - field.y,
    };

    setSelectedKey(field.key);
    setSelectedSection(field.section);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const rect = pageRef.current?.getBoundingClientRect();

    if (!drag || !rect) return;

    const x = event.clientX - rect.left - drag.offsetX;
    const y = event.clientY - rect.top - drag.offsetY;

    updateField(drag.key, {
      x: Math.round(Math.max(0, Math.min(PAGE_WIDTH, x))),
      y: Math.round(Math.max(0, Math.min(PAGE_HEIGHT, y))),
    });
  }

  function stopDrag() {
    dragRef.current = null;
  }

  function nudge(dx: number, dy: number) {
    if (!selectedField) return;

    updateField(selectedField.key, {
      x: selectedField.x + dx,
      y: selectedField.y + dy,
    });
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fields, null, 2));
    alert("נשמר");
  }

  function reset() {
    if (!confirm("לאפס מיקומים?")) return;

    localStorage.removeItem(STORAGE_KEY);
    setFields(INITIAL_FIELDS);
    setSelectedSection("year");
    setSelectedKey("taxYear");
    setPdfReloadKey((prev) => prev + 1);
  }

  async function copyConst() {
    const map = fields.reduce<Record<string, any>>((acc, field) => {
      acc[field.key] = fieldToMap(field);
      return acc;
    }, {});

    await navigator.clipboard.writeText(
      `const FORM101_FIELD_MAP = ${JSON.stringify(map, null, 2)} as const;`
    );

    alert("הועתק");
  }

  function addField() {
    const key = `customField${fields.length + 1}`;

    const field: FieldItem = {
      key,
      label: `שדה חדש ${fields.length + 1}`,
      section: selectedSection,
      page,
      x: 100,
      y: 100,
      width: 120,
      height: 24,
      type: "text",
      sample: "",
      fontSize: 14,
      align: "right",
    };

    setFields((prev) => [...prev, field]);
    setSelectedKey(key);
  }

  function removeField() {
    if (!selectedField?.key.startsWith("customField")) {
      alert("אפשר למחוק רק שדה חדש שהוספת");
      return;
    }

    setFields((prev) => prev.filter((field) => field.key !== selectedField.key));
    setSelectedKey("taxYear");
  }

  return (
    <main
      dir="rtl"
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLSelectElement
        ) {
          return;
        }

        if (event.key === "ArrowUp") nudge(0, -1);
        if (event.key === "ArrowDown") nudge(0, 1);
        if (event.key === "ArrowRight") nudge(1, 0);
        if (event.key === "ArrowLeft") nudge(-1, 0);
      }}
      className="min-h-screen bg-slate-100 text-slate-900"
    >
      <div className="mx-auto max-w-[1800px] space-y-4 p-4">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
                יצירת תבנית טופס 101
              </div>

              <h1 className="mt-3 text-3xl font-black">
                מיפוי שדות על הטופס המקורי
              </h1>

              <p className="mt-2 text-sm font-bold text-slate-500">
                מוצג כאן הקובץ המקורי: public/forms/tofes-101.pdf. אין PDF.js,
                אין Worker, ואין טופס מומצא.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setSelectedSection("year");
                  setSelectedKey("taxYear");
                  setPdfReloadKey((prev) => prev + 1);
                }}
                className={`h-11 rounded-2xl px-5 text-sm font-black ${
                  page === 1
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200"
                }`}
              >
                עמוד 1
              </button>

              <button
                type="button"
                onClick={() => {
                  setPage(2);
                  setSelectedSection("credits");
                  setSelectedKey("page2IdNumber");
                  setPdfReloadKey((prev) => prev + 1);
                }}
                className={`h-11 rounded-2xl px-5 text-sm font-black ${
                  page === 2
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200"
                }`}
              >
                עמוד 2
              </button>

              <button
                type="button"
                onClick={() => setShowAllFields((prev) => !prev)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black"
              >
                {showAllFields ? "רק סעיף נבחר" : "כל השדות"}
              </button>

              <button
                type="button"
                onClick={() => setShowValues((prev) => !prev)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black"
              >
                {showValues ? "הסתר בדיקה" : "הצג בדיקה"}
              </button>

              <button
                type="button"
                onClick={addField}
                className="h-11 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white"
              >
                הוספת שדה
              </button>

              <button
                type="button"
                onClick={save}
                className="h-11 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white"
              >
                שמירה
              </button>

              <button
                type="button"
                onClick={copyConst}
                className="h-11 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white"
              >
                העתקת TS CONST
              </button>

              <button
                type="button"
                onClick={reset}
                className="h-11 rounded-2xl bg-rose-50 px-5 text-sm font-black text-rose-700"
              >
                איפוס
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[300px_1fr_380px]">
          <aside className="rounded-3xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black">סעיפים</h2>

            <div className="mt-4 space-y-2">
              {pageSections.map((section) => {
                const active = selectedSection === section.key;

                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => {
                      setSelectedSection(section.key);

                      const firstField = fields.find(
                        (field) =>
                          field.page === page && field.section === section.key
                      );

                      if (firstField) setSelectedKey(firstField.key);
                    }}
                    className={`w-full rounded-2xl px-4 py-3 text-right text-sm font-black ${
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {section.title}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="overflow-auto rounded-3xl bg-white p-4 shadow-sm">
            <div
              ref={pageRef}
              className="relative mx-auto overflow-hidden bg-white shadow-xl ring-1 ring-slate-300"
              style={{
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT,
              }}
              onPointerMove={moveDrag}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
              onPointerLeave={stopDrag}
            >
              <iframe
                key={`${page}-${pdfReloadKey}`}
                src={`${PDF_URL}#toolbar=0&navpanes=0&scrollbar=0&page=${page}&view=Fit`}
                title="טופס 101 מקורי"
                className="absolute inset-0 h-full w-full border-0"
                style={{
                  pointerEvents: "none",
                  background: "white",
                }}
              />

              {visibleFields.map((field) => {
                const selected = field.key === selectedKey;

                return (
                  <button
                    key={field.key}
                    type="button"
                    onPointerDown={(event) => startDrag(event, field)}
                    onClick={() => {
                      setSelectedKey(field.key);
                      setSelectedSection(field.section);
                    }}
                    className={`absolute z-20 cursor-grab bg-transparent p-0 active:cursor-grabbing ${
                      selected ? "ring-2 ring-fuchsia-500" : ""
                    }`}
                    style={{
                      left: field.x,
                      top: field.y,
                      width: field.width,
                      height: field.height,
                    }}
                  >
                    <span
                      className={`relative block h-full w-full border ${
                        selected
                          ? "border-fuchsia-500 bg-fuchsia-500/10"
                          : "border-blue-500 bg-blue-500/10"
                      }`}
                    >
                      {renderValue(field, showValues)}

                      <span className="absolute -top-6 right-0 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] font-black text-white">
                        {field.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-3xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black">עריכת שדה</h2>

            {selectedField && (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-indigo-50 p-4">
                  <p className="text-sm font-black text-indigo-700">
                    {selectedField.label}
                  </p>
                  <p className="mt-1 text-xs font-bold text-indigo-400">
                    {selectedField.key}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-black text-slate-500">
                    X
                    <input
                      type="number"
                      value={selectedField.x}
                      onChange={(event) =>
                        updateField(selectedField.key, {
                          x: Number(event.target.value),
                        })
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-500">
                    Y
                    <input
                      type="number"
                      value={selectedField.y}
                      onChange={(event) =>
                        updateField(selectedField.key, {
                          y: Number(event.target.value),
                        })
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-500">
                    רוחב
                    <input
                      type="number"
                      value={selectedField.width}
                      onChange={(event) =>
                        updateField(selectedField.key, {
                          width: Number(event.target.value),
                        })
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-500">
                    גובה
                    <input
                      type="number"
                      value={selectedField.height}
                      onChange={(event) =>
                        updateField(selectedField.key, {
                          height: Number(event.target.value),
                        })
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-500">
                    פונט
                    <input
                      type="number"
                      value={selectedField.fontSize}
                      onChange={(event) =>
                        updateField(selectedField.key, {
                          fontSize: Number(event.target.value),
                        })
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-500">
                    סוג
                    <select
                      value={selectedField.type}
                      onChange={(event) =>
                        updateField(selectedField.key, {
                          type: event.target.value as FieldType,
                        })
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold"
                    >
                      <option value="text">טקסט</option>
                      <option value="digits">ספרות</option>
                      <option value="check">וי</option>
                      <option value="signature">חתימה</option>
                    </select>
                  </label>

                  <label className="text-xs font-black text-slate-500">
                    מרווח ספרות
                    <input
                      type="number"
                      value={selectedField.digitGap || 0}
                      disabled={selectedField.type !== "digits"}
                      onChange={(event) =>
                        updateField(selectedField.key, {
                          digitGap: Number(event.target.value),
                        })
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold disabled:bg-slate-100"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-500">
                    מקס׳ ספרות
                    <input
                      type="number"
                      value={selectedField.maxDigits || 0}
                      disabled={selectedField.type !== "digits"}
                      onChange={(event) =>
                        updateField(selectedField.key, {
                          maxDigits: Number(event.target.value) || undefined,
                        })
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold disabled:bg-slate-100"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-500">
                    יישור
                    <select
                      value={selectedField.align || "right"}
                      onChange={(event) =>
                        updateField(selectedField.key, {
                          align: event.target.value as TextAlign,
                        })
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold"
                    >
                      <option value="right">ימין</option>
                      <option value="center">מרכז</option>
                      <option value="left">שמאל</option>
                    </select>
                  </label>
                </div>

                <label className="block text-xs font-black text-slate-500">
                  ערך בדיקה
                  <input
                    value={selectedField.sample}
                    onChange={(event) =>
                      updateField(selectedField.key, {
                        sample: event.target.value,
                      })
                    }
                    className="mt-1 h-11 w-full rounded-xl border px-3 text-sm font-bold"
                  />
                </label>

                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => nudge(0, -1)}
                    className="rounded-xl bg-slate-100 py-2 text-sm font-black"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => nudge(0, 1)}
                    className="rounded-xl bg-slate-100 py-2 text-sm font-black"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => nudge(-1, 0)}
                    className="rounded-xl bg-slate-100 py-2 text-sm font-black"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => nudge(1, 0)}
                    className="rounded-xl bg-slate-100 py-2 text-sm font-black"
                  >
                    →
                  </button>
                </div>

                <button
                  type="button"
                  onClick={removeField}
                  className="w-full rounded-2xl bg-rose-50 py-3 text-sm font-black text-rose-700"
                >
                  מחיקת שדה חדש
                </button>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}