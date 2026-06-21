"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export const dynamic = "force-dynamic";

type FieldType = "text" | "digits" | "dateDigits" | "check" | "signature";
type TextAlign = "right" | "left" | "center";

type FieldItem = {
  key: string;
  label: string;
  page: 1 | 2;
  pdfX: number;
  pdfY: number;
  type: FieldType;
  sample: string;
  fontSize: number;
  width: number;
  height: number;
  digitGap?: number;
  maxDigits?: number;
  align?: TextAlign;
};

type PageSize = {
  width: number;
  height: number;
};

const PDF_URL = "/forms/tofes-101.pdf";
const STORAGE_KEY = "invistimo_form101_pdf_mapper_v2";

const INITIAL_FIELDS: FieldItem[] = [
  {
    key: "taxYear",
    label: "שנת מס",
    page: 1,
    pdfX: 285,
    pdfY: 686,
    type: "digits",
    sample: "2026",
    fontSize: 16,
    width: 72,
    height: 18,
    digitGap: 14,
    maxDigits: 4,
    align: "center",
  },

  {
    key: "employerName",
    label: "שם מעסיק",
    page: 1,
    pdfX: 465,
    pdfY: 599,
    type: "text",
    sample: "Invistimo",
    fontSize: 13,
    width: 105,
    height: 18,
    align: "right",
  },
  {
    key: "employerAddress",
    label: "כתובת מעסיק",
    page: 1,
    pdfX: 310,
    pdfY: 599,
    type: "text",
    sample: "העצמאות 41 קרית אתא",
    fontSize: 11,
    width: 145,
    height: 18,
    align: "right",
  },
  {
    key: "employerPhone",
    label: "טלפון מעסיק",
    page: 1,
    pdfX: 155,
    pdfY: 599,
    type: "digits",
    sample: "0526850711",
    fontSize: 13,
    width: 95,
    height: 18,
    digitGap: 9,
    maxDigits: 10,
    align: "left",
  },
  {
    key: "employerFileNumber",
    label: "תיק ניכויים",
    page: 1,
    pdfX: 47,
    pdfY: 599,
    type: "digits",
    sample: "905790028",
    fontSize: 13,
    width: 90,
    height: 18,
    digitGap: 9,
    maxDigits: 9,
    align: "left",
  },

  {
    key: "idNumber",
    label: "תעודת זהות",
    page: 1,
    pdfX: 462,
    pdfY: 549,
    type: "digits",
    sample: "316576578",
    fontSize: 12,
    width: 90,
    height: 16,
    digitGap: 9,
    maxDigits: 9,
    align: "left",
  },
  {
    key: "lastName",
    label: "שם משפחה",
    page: 1,
    pdfX: 365,
    pdfY: 549,
    type: "text",
    sample: "עשת",
    fontSize: 12,
    width: 80,
    height: 16,
    align: "center",
  },
  {
    key: "firstName",
    label: "שם פרטי",
    page: 1,
    pdfX: 287,
    pdfY: 549,
    type: "text",
    sample: "הדר",
    fontSize: 12,
    width: 70,
    height: 16,
    align: "center",
  },
  {
    key: "birthDate",
    label: "תאריך לידה",
    page: 1,
    pdfX: 207,
    pdfY: 549,
    type: "dateDigits",
    sample: "04/03/1997",
    fontSize: 12,
    width: 76,
    height: 16,
    digitGap: 8,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "immigrationDate",
    label: "תאריך עליה",
    page: 1,
    pdfX: 130,
    pdfY: 549,
    type: "dateDigits",
    sample: "",
    fontSize: 12,
    width: 75,
    height: 16,
    digitGap: 8,
    maxDigits: 8,
    align: "left",
  },

  {
    key: "street",
    label: "רחוב",
    page: 1,
    pdfX: 352,
    pdfY: 512,
    type: "text",
    sample: "העצמאות",
    fontSize: 12,
    width: 92,
    height: 16,
    align: "right",
  },
  {
    key: "houseNumber",
    label: "מספר",
    page: 1,
    pdfX: 292,
    pdfY: 512,
    type: "digits",
    sample: "41",
    fontSize: 12,
    width: 40,
    height: 16,
    digitGap: 9,
    maxDigits: 4,
    align: "center",
  },
  {
    key: "city",
    label: "עיר",
    page: 1,
    pdfX: 214,
    pdfY: 512,
    type: "text",
    sample: "קרית אתא",
    fontSize: 12,
    width: 70,
    height: 16,
    align: "center",
  },
  {
    key: "postalCode",
    label: "מיקוד",
    page: 1,
    pdfX: 140,
    pdfY: 512,
    type: "digits",
    sample: "",
    fontSize: 12,
    width: 60,
    height: 16,
    digitGap: 8,
    maxDigits: 7,
    align: "left",
  },

  {
    key: "mobile",
    label: "טלפון נייד",
    page: 1,
    pdfX: 323,
    pdfY: 465,
    type: "digits",
    sample: "0555039072",
    fontSize: 12,
    width: 92,
    height: 16,
    digitGap: 9,
    maxDigits: 10,
    align: "left",
  },
  {
    key: "phone",
    label: "טלפון",
    page: 1,
    pdfX: 238,
    pdfY: 465,
    type: "digits",
    sample: "",
    fontSize: 12,
    width: 80,
    height: 16,
    digitGap: 9,
    maxDigits: 10,
    align: "left",
  },
  {
    key: "email",
    label: "אימייל",
    page: 1,
    pdfX: 70,
    pdfY: 465,
    type: "text",
    sample: "sapir@gmail.com",
    fontSize: 12,
    width: 160,
    height: 16,
    align: "left",
  },

  {
    key: "genderMale",
    label: "זכר",
    page: 1,
    pdfX: 535,
    pdfY: 492,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "genderFemale",
    label: "נקבה",
    page: 1,
    pdfX: 535,
    pdfY: 477,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "maritalSingle",
    label: "רווק/ה",
    page: 1,
    pdfX: 480,
    pdfY: 492,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "maritalMarried",
    label: "נשוי/אה",
    page: 1,
    pdfX: 480,
    pdfY: 477,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "maritalDivorced",
    label: "גרוש/ה",
    page: 1,
    pdfX: 427,
    pdfY: 492,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "maritalWidowed",
    label: "אלמן/ה",
    page: 1,
    pdfX: 427,
    pdfY: 477,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "maritalSeparated",
    label: "פרוד/ה",
    page: 1,
    pdfX: 374,
    pdfY: 477,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "residentYes",
    label: "תושב כן",
    page: 1,
    pdfX: 337,
    pdfY: 492,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "residentNo",
    label: "תושב לא",
    page: 1,
    pdfX: 337,
    pdfY: 477,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "kibbutzYes",
    label: "קיבוץ כן",
    page: 1,
    pdfX: 261,
    pdfY: 492,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "kibbutzNo",
    label: "קיבוץ לא",
    page: 1,
    pdfX: 261,
    pdfY: 477,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "healthFundYes",
    label: "קופה כן",
    page: 1,
    pdfX: 186,
    pdfY: 477,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "healthFundNo",
    label: "קופה לא",
    page: 1,
    pdfX: 186,
    pdfY: 492,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "healthFundName",
    label: "שם קופה",
    page: 1,
    pdfX: 92,
    pdfY: 477,
    type: "text",
    sample: "כללית",
    fontSize: 12,
    width: 80,
    height: 16,
    align: "right",
  },

  {
    key: "workStartDate",
    label: "תחילת עבודה",
    page: 1,
    pdfX: 405,
    pdfY: 352,
    type: "dateDigits",
    sample: "22/06/2026",
    fontSize: 12,
    width: 76,
    height: 16,
    digitGap: 8,
    maxDigits: 8,
    align: "left",
  },

  {
    key: "incomeMonthlySalary",
    label: "משכורת חודש",
    page: 1,
    pdfX: 300,
    pdfY: 383,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "incomeExtraSalary",
    label: "משרה נוספת",
    page: 1,
    pdfX: 300,
    pdfY: 368,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "incomePartialSalary",
    label: "משכורת חלקית",
    page: 1,
    pdfX: 300,
    pdfY: 353,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "incomeDailyWage",
    label: "שכר עבודה",
    page: 1,
    pdfX: 300,
    pdfY: 338,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "incomeAllowance",
    label: "קצבה",
    page: 1,
    pdfX: 300,
    pdfY: 323,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "incomePension",
    label: "מלגה",
    page: 1,
    pdfX: 300,
    pdfY: 308,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },

  {
    key: "otherNoOtherIncome",
    label: "אין הכנסות אחרות",
    page: 1,
    pdfX: 536,
    pdfY: 264,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },

  {
    key: "page2IdNumber",
    label: "ת.ז עמוד 2",
    page: 2,
    pdfX: 120,
    pdfY: 785,
    type: "digits",
    sample: "316576578",
    fontSize: 12,
    width: 90,
    height: 16,
    digitGap: 9,
    maxDigits: 9,
    align: "left",
  },
  {
    key: "creditResident",
    label: "תושב ישראל",
    page: 2,
    pdfX: 548,
    pdfY: 752,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditDisabled100",
    label: "נכה 100%",
    page: 2,
    pdfX: 548,
    pdfY: 715,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditSettlement",
    label: "ישוב מזכה",
    page: 2,
    pdfX: 548,
    pdfY: 668,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditNewImmigrant",
    label: "עולה חדש",
    page: 2,
    pdfX: 548,
    pdfY: 626,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditSpouseNoIncome",
    label: "בן זוג ללא הכנסה",
    page: 2,
    pdfX: 548,
    pdfY: 582,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditSingleParent",
    label: "חד הורית",
    page: 2,
    pdfX: 548,
    pdfY: 542,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditChildrenCustody",
    label: "ילדים בחזקתי",
    page: 2,
    pdfX: 548,
    pdfY: 500,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditSpecialChild",
    label: "ילד נטול יכולת",
    page: 2,
    pdfX: 548,
    pdfY: 424,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditAlimony",
    label: "מזונות",
    page: 2,
    pdfX: 548,
    pdfY: 371,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditSoldier",
    label: "חייל",
    page: 2,
    pdfX: 548,
    pdfY: 288,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditAcademic",
    label: "אקדמי",
    page: 2,
    pdfX: 548,
    pdfY: 248,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },

  {
    key: "taxNoIncomeThisYear",
    label: "לא הייתה הכנסה",
    page: 2,
    pdfX: 548,
    pdfY: 143,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "taxHasOtherIncome",
    label: "יש הכנסות נוספות",
    page: 2,
    pdfX: 548,
    pdfY: 105,
    type: "check",
    sample: "✓",
    fontSize: 12,
    width: 13,
    height: 13,
    align: "center",
  },

  {
    key: "signatureDate",
    label: "תאריך חתימה",
    page: 2,
    pdfX: 395,
    pdfY: 42,
    type: "dateDigits",
    sample: "21/06/2026",
    fontSize: 12,
    width: 76,
    height: 16,
    digitGap: 8,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "signature",
    label: "חתימה",
    page: 2,
    pdfX: 190,
    pdfY: 30,
    type: "signature",
    sample: "חתימה",
    fontSize: 12,
    width: 135,
    height: 34,
    align: "center",
  },
];

function cleanNumber(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getSavedFields() {
  if (typeof window === "undefined") return INITIAL_FIELDS;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_FIELDS;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return INITIAL_FIELDS;

    return parsed.map((field: FieldItem) => ({
      ...field,
      pdfX: cleanNumber(field.pdfX, 0),
      pdfY: cleanNumber(field.pdfY, 0),
      fontSize: cleanNumber(field.fontSize, 12),
      width: cleanNumber(field.width, 80),
      height: cleanNumber(field.height, 16),
      digitGap: cleanNumber(field.digitGap, 8),
      maxDigits: field.maxDigits ? cleanNumber(field.maxDigits, 0) : undefined,
      align: field.align || "right",
    }));
  } catch {
    return INITIAL_FIELDS;
  }
}

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function getDigitChars(field: FieldItem) {
  const digits = onlyDigits(field.sample);
  if (!digits) return [];

  const sliced = field.maxDigits ? digits.slice(0, field.maxDigits) : digits;
  return sliced.split("");
}

function renderPreview(field: FieldItem, zoom: number) {
  if (field.type === "check") {
    return (
      <span
        className="flex h-full w-full items-center justify-center font-black leading-none text-blue-700"
        style={{ fontSize: field.fontSize * zoom }}
      >
        ✓
      </span>
    );
  }

  if (field.type === "signature") {
    return (
      <span
        className="flex h-full w-full items-center justify-center italic text-blue-800"
        style={{ fontSize: field.fontSize * zoom }}
      >
        {field.sample || "חתימה"}
      </span>
    );
  }

  if (field.type === "digits" || field.type === "dateDigits") {
    const chars = getDigitChars(field);

    return (
      <span
        dir="ltr"
        className="flex h-full w-full items-center overflow-visible text-blue-900"
        style={{
          justifyContent:
            field.align === "center"
              ? "center"
              : field.align === "right"
              ? "flex-end"
              : "flex-start",
          fontSize: field.fontSize * zoom,
          lineHeight: `${field.height * zoom}px`,
        }}
      >
        {chars.map((char, index) => (
          <span
            key={`${field.key}-${index}`}
            className="inline-block text-center font-medium"
            style={{ width: (field.digitGap || 8) * zoom }}
          >
            {char}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span
      className="block h-full w-full overflow-visible whitespace-nowrap text-blue-900"
      style={{
        fontSize: field.fontSize * zoom,
        lineHeight: `${field.height * zoom}px`,
        textAlign: field.align || "right",
      }}
    >
      {field.sample}
    </span>
  );
}

function fieldToPdfMap(field: FieldItem) {
  return {
    page: field.page,
    x: field.pdfX,
    y: field.pdfY,
    type: field.type,
    fontSize: field.fontSize,
    width: field.width,
    height: field.height,
    digitGap: field.digitGap || null,
    maxDigits: field.maxDigits || null,
    align: field.align || "right",
  };
}

export default function Form101MapperPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [page, setPage] = useState<1 | 2>(1);
  const [pageSize, setPageSize] = useState<PageSize>({
    width: 595,
    height: 842,
  });

  const [zoom, setZoom] = useState(1.55);
  const [fields, setFields] = useState<FieldItem[]>(getSavedFields);
  const [selectedKey, setSelectedKey] = useState("taxYear");
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showOutlines, setShowOutlines] = useState(true);

  const pageFields = useMemo(
    () => fields.filter((field) => field.page === page),
    [fields, page]
  );

  const selectedField = useMemo(
    () => fields.find((field) => field.key === selectedKey) || fields[0],
    [fields, selectedKey]
  );

  useEffect(() => {
    let mounted = true;

    async function loadPdf() {
      try {
        setLoadingPdf(true);

        const pdfjs = await import("pdfjs-dist");

        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

        const loadedPdf = await pdfjs.getDocument(PDF_URL).promise;

        if (mounted) {
          setPdfDocument(loadedPdf);
        }
      } catch (error) {
        console.error("LOAD FORM 101 PDF FAILED:", error);
        alert("שגיאה בטעינת PDF של טופס 101");
      } finally {
        if (mounted) {
          setLoadingPdf(false);
        }
      }
    }

    void loadPdf();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      if (!pdfDocument || !canvasRef.current) return;

      const pdfPage = await pdfDocument.getPage(page);
      const viewport = pdfPage.getViewport({ scale: zoom });

      setPageSize({
        width: viewport.width / zoom,
        height: viewport.height / zoom,
      });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await pdfPage.render({
        canvasContext: context,
        viewport,
      }).promise;

      if (cancelled) return;
    }

    void renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDocument, page, zoom]);

  function updateField(key: string, patch: Partial<FieldItem>) {
    setFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, ...patch } : field))
    );
  }

  function updateFieldPositionFromClient(
    key: string,
    clientX: number,
    clientY: number
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const pdfX = canvasX / zoom;
    const pdfY = pageSize.height - canvasY / zoom;

    updateField(key, {
      pdfX: Math.round(pdfX),
      pdfY: Math.round(pdfY),
    });
  }

  function nudgeSelected(dx: number, dy: number) {
    if (!selectedField) return;

    updateField(selectedField.key, {
      pdfX: selectedField.pdfX + dx,
      pdfY: selectedField.pdfY + dy,
    });
  }

  function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fields, null, 2));
    alert("המיקומים נשמרו בדפדפן");
  }

  async function copyJson() {
    const objectMap = fields.reduce<Record<string, any>>((acc, field) => {
      acc[field.key] = fieldToPdfMap(field);
      return acc;
    }, {});

    await navigator.clipboard.writeText(JSON.stringify(objectMap, null, 2));
    alert("ה־JSON הועתק");
  }

  async function copyTsConst() {
    const objectMap = fields.reduce<Record<string, any>>((acc, field) => {
      acc[field.key] = fieldToPdfMap(field);
      return acc;
    }, {});

    const content = `const FORM101_FIELD_MAP = ${JSON.stringify(
      objectMap,
      null,
      2
    )} as const;`;

    await navigator.clipboard.writeText(content);
    alert("FORM101_FIELD_MAP הועתק");
  }

  function resetFields() {
    if (!confirm("לאפס את כל המיקומים?")) return;

    localStorage.removeItem(STORAGE_KEY);
    setFields(INITIAL_FIELDS);
    setSelectedKey("taxYear");
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 text-slate-900"
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLSelectElement ||
          event.target instanceof HTMLTextAreaElement
        ) {
          return;
        }

        if (event.key === "ArrowUp") nudgeSelected(0, 1);
        if (event.key === "ArrowDown") nudgeSelected(0, -1);
        if (event.key === "ArrowRight") nudgeSelected(1, 0);
        if (event.key === "ArrowLeft") nudgeSelected(-1, 0);
      }}
    >
      <div className="mx-auto w-full max-w-[1800px] space-y-5 p-4 md:p-6">
        <section className="rounded-[32px] border border-white/80 bg-white/95 p-5 shadow-[0_18px_60px_rgba(79,70,229,0.10)] backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
                יצירת תבנית טופס 101
              </div>

              <h1 className="mt-4 text-3xl font-black md:text-4xl">
                מיפוי שדות על PDF אמיתי
              </h1>

              <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-500">
                זה מציג את הקובץ public/forms/tofes-101.pdf עצמו, לא תמונה.
                גררי שדות למיקום המדויק. מספרים מוצגים במרווחים שווים כדי שכל
                ספרה תיכנס בדיוק לקובייה שלה.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                className={`h-11 rounded-2xl px-5 text-sm font-black ${
                  page === 1
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                עמוד 1
              </button>

              <button
                type="button"
                onClick={() => setPage(2)}
                className={`h-11 rounded-2xl px-5 text-sm font-black ${
                  page === 2
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                עמוד 2
              </button>

              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.8, prev - 0.1))}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
              >
                -
              </button>

              <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
                זום {Math.round(zoom * 100)}%
              </div>

              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(2.5, prev + 0.1))}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
              >
                +
              </button>

              <button
                type="button"
                onClick={() => setShowLabels((prev) => !prev)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
              >
                {showLabels ? "הסתר שמות" : "הצג שמות"}
              </button>

              <button
                type="button"
                onClick={() => setShowOutlines((prev) => !prev)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
              >
                {showOutlines ? "הסתר מסגרות" : "הצג מסגרות"}
              </button>

              <button
                type="button"
                onClick={saveToLocalStorage}
                className="h-11 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-100"
              >
                שמירה בדפדפן
              </button>

              <button
                type="button"
                onClick={copyJson}
                className="h-11 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-100"
              >
                העתקת JSON
              </button>

              <button
                type="button"
                onClick={copyTsConst}
                className="h-11 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-100"
              >
                העתקת TS CONST
              </button>

              <button
                type="button"
                onClick={resetFields}
                className="h-11 rounded-2xl bg-rose-50 px-5 text-sm font-black text-rose-700"
              >
                איפוס
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_410px]">
          <div className="overflow-auto rounded-[32px] border border-white/80 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            {loadingPdf ? (
              <div className="flex h-[650px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-500" />
                  <p className="mt-4 text-sm font-black text-slate-600">
                    טוען PDF...
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="relative mx-auto w-fit select-none"
                onMouseMove={(event) => {
                  if (!dragKey) return;
                  updateFieldPositionFromClient(
                    dragKey,
                    event.clientX,
                    event.clientY
                  );
                }}
                onMouseUp={() => setDragKey(null)}
                onMouseLeave={() => setDragKey(null)}
              >
                <canvas
                  ref={canvasRef}
                  className="block border border-slate-200 bg-white shadow-xl"
                />

                {pageFields.map((field) => {
                  const selected = field.key === selectedKey;

                  const left = field.pdfX * zoom;
                  const top = (pageSize.height - field.pdfY) * zoom;

                  return (
                    <button
                      key={field.key}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setSelectedKey(field.key);
                        setDragKey(field.key);
                      }}
                      onClick={() => setSelectedKey(field.key)}
                      className={`absolute z-10 cursor-move bg-transparent p-0 text-right ${
                        selected ? "ring-2 ring-fuchsia-500" : ""
                      }`}
                      style={{
                        left,
                        top,
                        width: field.width * zoom,
                        height: field.height * zoom,
                        transform: "translate(0, -100%)",
                      }}
                      title={`${field.label} | x:${field.pdfX} y:${field.pdfY}`}
                    >
                      <span
                        className={`relative block h-full w-full ${
                          showOutlines
                            ? selected
                              ? "border-2 border-fuchsia-500 bg-fuchsia-500/10"
                              : "border border-blue-500 bg-blue-500/10"
                            : ""
                        }`}
                      >
                        {renderPreview(field, zoom)}

                        {showLabels && (
                          <span className="absolute -top-6 right-0 rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-black text-white">
                            {field.label}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-black">עריכת שדה</h2>

              {selectedField ? (
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
                      X ב־PDF
                      <input
                        type="number"
                        value={selectedField.pdfX}
                        onChange={(event) =>
                          updateField(selectedField.key, {
                            pdfX: Number(event.target.value),
                          })
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
                      />
                    </label>

                    <label className="text-xs font-black text-slate-500">
                      Y ב־PDF
                      <input
                        type="number"
                        value={selectedField.pdfY}
                        onChange={(event) =>
                          updateField(selectedField.key, {
                            pdfY: Number(event.target.value),
                          })
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
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
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
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
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
                      />
                    </label>

                    <label className="text-xs font-black text-slate-500">
                      גודל פונט
                      <input
                        type="number"
                        value={selectedField.fontSize}
                        onChange={(event) =>
                          updateField(selectedField.key, {
                            fontSize: Number(event.target.value),
                          })
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
                      />
                    </label>

                    <label className="text-xs font-black text-slate-500">
                      מרווח ספרות
                      <input
                        type="number"
                        value={selectedField.digitGap || 0}
                        disabled={
                          selectedField.type !== "digits" &&
                          selectedField.type !== "dateDigits"
                        }
                        onChange={(event) =>
                          updateField(selectedField.key, {
                            digitGap: Number(event.target.value),
                          })
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold disabled:bg-slate-100 disabled:text-slate-300"
                      />
                    </label>

                    <label className="text-xs font-black text-slate-500">
                      מקס׳ ספרות
                      <input
                        type="number"
                        value={selectedField.maxDigits || 0}
                        disabled={
                          selectedField.type !== "digits" &&
                          selectedField.type !== "dateDigits"
                        }
                        onChange={(event) =>
                          updateField(selectedField.key, {
                            maxDigits: Number(event.target.value) || undefined,
                          })
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold disabled:bg-slate-100 disabled:text-slate-300"
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
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
                      >
                        <option value="right">ימין</option>
                        <option value="center">מרכז</option>
                        <option value="left">שמאל</option>
                      </select>
                    </label>
                  </div>

                  <label className="block text-xs font-black text-slate-500">
                    טקסט לדוגמה
                    <input
                      value={selectedField.sample}
                      onChange={(event) =>
                        updateField(selectedField.key, {
                          sample: event.target.value,
                        })
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
                    />
                  </label>

                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => nudgeSelected(0, 1)}
                      className="rounded-xl bg-slate-100 py-2 text-sm font-black"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeSelected(0, -1)}
                      className="rounded-xl bg-slate-100 py-2 text-sm font-black"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeSelected(-1, 0)}
                      className="rounded-xl bg-slate-100 py-2 text-sm font-black"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeSelected(1, 0)}
                      className="rounded-xl bg-slate-100 py-2 text-sm font-black"
                    >
                      →
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-black">שדות בעמוד {page}</h2>

              <div className="mt-4 max-h-[620px] space-y-2 overflow-auto pr-1">
                {pageFields.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => setSelectedKey(field.key)}
                    className={`w-full rounded-2xl border p-3 text-right transition ${
                      selectedKey === field.key
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-800">
                          {field.label}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-400">
                          x:{field.pdfX} y:{field.pdfY}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
                        {field.type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}