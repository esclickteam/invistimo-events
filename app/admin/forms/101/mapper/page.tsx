"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export const dynamic = "force-dynamic";

type FieldType = "text" | "digits" | "dateDigits" | "check" | "signature";
type TextAlign = "right" | "left" | "center";

type FieldItem = {
  key: string;
  label: string;
  page: 1 | 2;
  x: number;
  y: number;
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

type DragState = {
  key: string;
  offsetX: number;
  offsetY: number;
} | null;

const PDF_URL = "/forms/tofes-101.pdf";
const PDF_WORKER_URL = "/pdf.worker.min.mjs";
const STORAGE_KEY = "invistimo_form101_mapper_clean_pdf_v3";

const INITIAL_FIELDS: FieldItem[] = [
  {
    key: "taxYear",
    label: "שנת מס",
    page: 1,
    x: 285,
    y: 686,
    type: "digits",
    sample: "2026",
    fontSize: 16,
    width: 90,
    height: 22,
    digitGap: 16,
    maxDigits: 4,
    align: "center",
  },

  {
    key: "employerName",
    label: "שם מעסיק",
    page: 1,
    x: 465,
    y: 599,
    type: "text",
    sample: "Invistimo",
    fontSize: 13,
    width: 120,
    height: 18,
    align: "right",
  },
  {
    key: "employerAddress",
    label: "כתובת מעסיק",
    page: 1,
    x: 310,
    y: 599,
    type: "text",
    sample: "העצמאות 41 קרית אתא",
    fontSize: 11,
    width: 150,
    height: 18,
    align: "right",
  },
  {
    key: "employerPhone",
    label: "טלפון מעסיק",
    page: 1,
    x: 155,
    y: 599,
    type: "digits",
    sample: "0526850711",
    fontSize: 13,
    width: 100,
    height: 18,
    digitGap: 9,
    maxDigits: 10,
    align: "left",
  },
  {
    key: "employerFileNumber",
    label: "תיק ניכויים",
    page: 1,
    x: 47,
    y: 599,
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
    x: 462,
    y: 549,
    type: "digits",
    sample: "316576578",
    fontSize: 12,
    width: 95,
    height: 16,
    digitGap: 9,
    maxDigits: 9,
    align: "left",
  },
  {
    key: "lastName",
    label: "שם משפחה",
    page: 1,
    x: 365,
    y: 549,
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
    x: 287,
    y: 549,
    type: "text",
    sample: "הדר",
    fontSize: 12,
    width: 75,
    height: 16,
    align: "center",
  },
  {
    key: "birthDate",
    label: "תאריך לידה",
    page: 1,
    x: 207,
    y: 549,
    type: "dateDigits",
    sample: "04031997",
    fontSize: 12,
    width: 80,
    height: 16,
    digitGap: 8,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "immigrationDate",
    label: "תאריך עליה",
    page: 1,
    x: 130,
    y: 549,
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
    x: 352,
    y: 512,
    type: "text",
    sample: "העצמאות",
    fontSize: 12,
    width: 100,
    height: 16,
    align: "right",
  },
  {
    key: "houseNumber",
    label: "מספר בית",
    page: 1,
    x: 292,
    y: 512,
    type: "digits",
    sample: "41",
    fontSize: 12,
    width: 45,
    height: 16,
    digitGap: 9,
    maxDigits: 4,
    align: "center",
  },
  {
    key: "city",
    label: "עיר",
    page: 1,
    x: 214,
    y: 512,
    type: "text",
    sample: "קרית אתא",
    fontSize: 12,
    width: 75,
    height: 16,
    align: "center",
  },
  {
    key: "postalCode",
    label: "מיקוד",
    page: 1,
    x: 140,
    y: 512,
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
    x: 323,
    y: 465,
    type: "digits",
    sample: "0555039072",
    fontSize: 12,
    width: 95,
    height: 16,
    digitGap: 9,
    maxDigits: 10,
    align: "left",
  },
  {
    key: "phone",
    label: "טלפון",
    page: 1,
    x: 238,
    y: 465,
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
    x: 70,
    y: 465,
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
    x: 535,
    y: 492,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "genderFemale",
    label: "נקבה",
    page: 1,
    x: 535,
    y: 477,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },

  {
    key: "maritalSingle",
    label: "רווק/ה",
    page: 1,
    x: 480,
    y: 492,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "maritalMarried",
    label: "נשוי/אה",
    page: 1,
    x: 480,
    y: 477,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "maritalDivorced",
    label: "גרוש/ה",
    page: 1,
    x: 427,
    y: 492,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "maritalWidowed",
    label: "אלמן/ה",
    page: 1,
    x: 427,
    y: 477,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "maritalSeparated",
    label: "פרוד/ה",
    page: 1,
    x: 374,
    y: 477,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },

  {
    key: "residentYes",
    label: "תושב ישראל כן",
    page: 1,
    x: 337,
    y: 492,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "residentNo",
    label: "תושב ישראל לא",
    page: 1,
    x: 337,
    y: 477,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },

  {
    key: "kibbutzYes",
    label: "קיבוץ כן",
    page: 1,
    x: 261,
    y: 492,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "kibbutzNo",
    label: "קיבוץ לא",
    page: 1,
    x: 261,
    y: 477,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },

  {
    key: "healthFundYes",
    label: "קופת חולים כן",
    page: 1,
    x: 186,
    y: 477,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "healthFundNo",
    label: "קופת חולים לא",
    page: 1,
    x: 186,
    y: 492,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "healthFundName",
    label: "שם קופה",
    page: 1,
    x: 92,
    y: 477,
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
    x: 405,
    y: 352,
    type: "dateDigits",
    sample: "22062026",
    fontSize: 12,
    width: 80,
    height: 16,
    digitGap: 8,
    maxDigits: 8,
    align: "left",
  },

  {
    key: "incomeMonthlySalary",
    label: "משכורת חודש",
    page: 1,
    x: 300,
    y: 383,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "incomeExtraSalary",
    label: "משרה נוספת",
    page: 1,
    x: 300,
    y: 368,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "incomePartialSalary",
    label: "משכורת חלקית",
    page: 1,
    x: 300,
    y: 353,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "incomeDailyWage",
    label: "שכר עבודה",
    page: 1,
    x: 300,
    y: 338,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "incomeAllowance",
    label: "קצבה",
    page: 1,
    x: 300,
    y: 323,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "incomePension",
    label: "מלגה",
    page: 1,
    x: 300,
    y: 308,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },

  {
    key: "otherNoOtherIncome",
    label: "אין הכנסות אחרות",
    page: 1,
    x: 536,
    y: 264,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },

  {
    key: "page2IdNumber",
    label: "תעודת זהות עמוד 2",
    page: 2,
    x: 120,
    y: 785,
    type: "digits",
    sample: "316576578",
    fontSize: 12,
    width: 95,
    height: 16,
    digitGap: 9,
    maxDigits: 9,
    align: "left",
  },
  {
    key: "creditResident",
    label: "ח. תושב ישראל",
    page: 2,
    x: 548,
    y: 752,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditDisabled100",
    label: "ח. נכה 100%",
    page: 2,
    x: 548,
    y: 715,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditSettlement",
    label: "ח. ישוב מזכה",
    page: 2,
    x: 548,
    y: 668,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditNewImmigrant",
    label: "ח. עולה חדש",
    page: 2,
    x: 548,
    y: 626,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditSpouseNoIncome",
    label: "ח. בן זוג ללא הכנסה",
    page: 2,
    x: 548,
    y: 582,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditSingleParent",
    label: "ח. חד הורית",
    page: 2,
    x: 548,
    y: 542,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditChildrenCustody",
    label: "ח. ילדים בחזקתי",
    page: 2,
    x: 548,
    y: 500,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditSpecialChild",
    label: "ח. ילד נטול יכולת",
    page: 2,
    x: 548,
    y: 424,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditAlimony",
    label: "ח. מזונות",
    page: 2,
    x: 548,
    y: 371,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditSoldier",
    label: "ח. חייל משוחרר",
    page: 2,
    x: 548,
    y: 288,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "creditAcademic",
    label: "ח. אקדמי",
    page: 2,
    x: 548,
    y: 248,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },

  {
    key: "taxNoIncomeThisYear",
    label: "ט. לא הייתה הכנסה",
    page: 2,
    x: 548,
    y: 143,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },
  {
    key: "taxHasOtherIncome",
    label: "ט. יש הכנסות נוספות",
    page: 2,
    x: 548,
    y: 105,
    type: "check",
    sample: "✓",
    fontSize: 13,
    width: 13,
    height: 13,
    align: "center",
  },

  {
    key: "signatureDate",
    label: "תאריך חתימה",
    page: 2,
    x: 395,
    y: 42,
    type: "dateDigits",
    sample: "21062026",
    fontSize: 12,
    width: 80,
    height: 16,
    digitGap: 8,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "signature",
    label: "חתימה",
    page: 2,
    x: 190,
    y: 30,
    type: "signature",
    sample: "חתימה",
    fontSize: 12,
    width: 135,
    height: 34,
    align: "center",
  },
];

function getSavedFields() {
  if (typeof window === "undefined") return INITIAL_FIELDS;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_FIELDS;

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return INITIAL_FIELDS;

    return parsed;
  } catch {
    return INITIAL_FIELDS;
  }
}

function onlyDigits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function renderFieldPreview(
  field: FieldItem,
  zoom: number,
  showPreviewValues: boolean
) {
  if (!showPreviewValues) return null;

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
    const digits = onlyDigits(field.sample);
    const sliced = field.maxDigits ? digits.slice(0, field.maxDigits) : digits;
    const chars = sliced.split("");

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

function fieldToMap(field: FieldItem) {
  return {
    page: field.page,
    x: field.x,
    y: field.y,
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
  const dragStateRef = useRef<DragState>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [page, setPage] = useState<1 | 2>(1);
  const [pageSize, setPageSize] = useState<PageSize>({
    width: 595,
    height: 842,
  });
  const [zoom, setZoom] = useState(1.55);
  const [fields, setFields] = useState<FieldItem[]>(getSavedFields);
  const [selectedKey, setSelectedKey] = useState("taxYear");
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [showAllFields, setShowAllFields] = useState(false);
  const [showLabel, setShowLabel] = useState(true);
  const [showPreviewValues, setShowPreviewValues] = useState(false);
  const [error, setError] = useState("");

  const pageFields = useMemo(
    () => fields.filter((field) => field.page === page),
    [fields, page]
  );

  const selectedField = useMemo(
    () => fields.find((field) => field.key === selectedKey) || fields[0],
    [fields, selectedKey]
  );

  const visibleFields = useMemo(() => {
    if (showAllFields) return pageFields;

    return pageFields.filter((field) => field.key === selectedKey);
  }, [pageFields, selectedKey, showAllFields]);

  useEffect(() => {
    let mounted = true;

    async function loadPdf() {
      try {
        setLoadingPdf(true);
        setError("");

        const pdfjs = await import("pdfjs-dist");

        (pdfjs as any).GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

        const loaded = await (pdfjs as any).getDocument({
          url: PDF_URL,
          isEvalSupported: false,
        }).promise;

        if (mounted) {
          setPdfDoc(loaded);
        }
      } catch (loadError) {
        console.error("LOAD FORM 101 PDF FAILED:", loadError);

        if (mounted) {
          setError(
            "לא הצלחתי לטעון את ה־PDF. ודאי שקיים public/forms/tofes-101.pdf וגם public/pdf.worker.min.mjs"
          );
        }
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

    async function renderPdfPage() {
      if (!pdfDoc || !canvasRef.current) return;

      const pdfPage = await pdfDoc.getPage(page);
      const viewport = pdfPage.getViewport({ scale: zoom });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      setPageSize({
        width: viewport.width / zoom,
        height: viewport.height / zoom,
      });

      await pdfPage.render({
        canvasContext: context,
        viewport,
      }).promise;

      if (cancelled) return;
    }

    void renderPdfPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, page, zoom]);

  function updateField(key: string, patch: Partial<FieldItem>) {
    setFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, ...patch } : field))
    );
  }

  function startDrag(
    event: React.PointerEvent<HTMLButtonElement>,
    field: FieldItem
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    const pointerX = event.clientX - rect.left;
    const pointerBottom = rect.bottom - event.clientY;

    const fieldLeft = field.x * zoom;
    const fieldBottom = field.y * zoom;

    dragStateRef.current = {
      key: field.key,
      offsetX: pointerX - fieldLeft,
      offsetY: pointerBottom - fieldBottom,
    };

    setSelectedKey(field.key);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    const canvas = canvasRef.current;

    if (!dragState || !canvas) return;

    const rect = canvas.getBoundingClientRect();

    const pointerX = event.clientX - rect.left;
    const pointerBottom = rect.bottom - event.clientY;

    const x = (pointerX - dragState.offsetX) / zoom;
    const y = (pointerBottom - dragState.offsetY) / zoom;

    updateField(dragState.key, {
      x: Math.round(Math.max(0, Math.min(pageSize.width, x))),
      y: Math.round(Math.max(0, Math.min(pageSize.height, y))),
    });
  }

  function stopDrag() {
    dragStateRef.current = null;
  }

  function nudge(dx: number, dy: number) {
    if (!selectedField) return;

    updateField(selectedField.key, {
      x: selectedField.x + dx,
      y: selectedField.y + dy,
    });
  }

  function saveFields() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fields, null, 2));
    alert("נשמר בדפדפן");
  }

  async function copyTsConst() {
    const map = fields.reduce<Record<string, any>>((acc, field) => {
      acc[field.key] = fieldToMap(field);
      return acc;
    }, {});

    await navigator.clipboard.writeText(
      `const FORM101_FIELD_MAP = ${JSON.stringify(map, null, 2)} as const;`
    );

    alert("הועתק TS CONST");
  }

  function reset() {
    if (!confirm("לאפס את כל המיקומים?")) return;

    localStorage.removeItem(STORAGE_KEY);
    setFields(INITIAL_FIELDS);
    setSelectedKey("taxYear");
    setShowAllFields(false);
    setShowPreviewValues(false);
  }

  function addCustomField() {
    const count = fields.length + 1;
    const key = `customField${count}`;

    const field: FieldItem = {
      key,
      label: `שדה חדש ${count}`,
      page,
      x: 250,
      y: 500,
      type: "text",
      sample: "",
      fontSize: 12,
      width: 120,
      height: 18,
      align: "right",
    };

    setFields((prev) => [...prev, field]);
    setSelectedKey(key);
    setShowAllFields(false);
  }

  function removeSelectedField() {
    if (!selectedField) return;

    if (!selectedField.key.startsWith("customField")) {
      alert("אפשר למחוק רק שדות חדשים שהוספת ידנית");
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
          event.target instanceof HTMLSelectElement ||
          event.target instanceof HTMLTextAreaElement
        ) {
          return;
        }

        if (event.key === "ArrowUp") nudge(0, 1);
        if (event.key === "ArrowDown") nudge(0, -1);
        if (event.key === "ArrowRight") nudge(1, 0);
        if (event.key === "ArrowLeft") nudge(-1, 0);
      }}
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 text-slate-900"
    >
      <div className="mx-auto w-full max-w-[1800px] space-y-5 p-4 md:p-6">
        <section className="rounded-[32px] border border-white/80 bg-white/95 p-5 shadow-[0_18px_60px_rgba(79,70,229,0.10)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
                יצירת תבנית טופס 101
              </div>

              <h1 className="mt-4 text-3xl font-black md:text-4xl">
                מיפוי שדות על PDF
              </h1>

              <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-500">
                בחרי שדה מהרשימה, גררי אותו למקום המדויק על ה־PDF. כברירת מחדל
                הערכים לא מוצגים כדי שלא יהיה בלאגן. במספרים אפשר לשלוט
                במרווח ספרות כדי שכל ספרה תיכנס לקובייה שלה.
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
                onClick={() => setZoom((prev) => Math.min(2.8, prev + 0.1))}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
              >
                +
              </button>

              <button
                type="button"
                onClick={() => setShowAllFields((prev) => !prev)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
              >
                {showAllFields ? "הצג רק שדה נבחר" : "הצג כל השדות"}
              </button>

              <button
                type="button"
                onClick={() => setShowPreviewValues((prev) => !prev)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
              >
                {showPreviewValues ? "הסתר ערכי דוגמה" : "הצג ערכי דוגמה"}
              </button>

              <button
                type="button"
                onClick={() => setShowLabel((prev) => !prev)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
              >
                {showLabel ? "הסתר שם שדה" : "הצג שם שדה"}
              </button>

              <button
                type="button"
                onClick={addCustomField}
                className="h-11 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white"
              >
                הוספת שדה
              </button>

              <button
                type="button"
                onClick={saveFields}
                className="h-11 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white"
              >
                שמירה
              </button>

              <button
                type="button"
                onClick={copyTsConst}
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

        <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
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
            ) : error ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
                <h2 className="text-xl font-black text-rose-700">
                  שגיאה בטעינת PDF
                </h2>
                <p className="mt-3 text-sm font-bold text-rose-600">{error}</p>
              </div>
            ) : (
              <div
                className="relative mx-auto w-fit touch-none select-none"
                onPointerMove={moveDrag}
                onPointerUp={stopDrag}
                onPointerCancel={stopDrag}
                onPointerLeave={stopDrag}
              >
                <canvas
                  ref={canvasRef}
                  className="block border border-slate-200 bg-white shadow-xl"
                />

                {visibleFields.map((field) => {
                  const selected = field.key === selectedKey;

                  return (
                    <button
                      key={field.key}
                      type="button"
                      onPointerDown={(event) => startDrag(event, field)}
                      onClick={() => setSelectedKey(field.key)}
                      className={`absolute z-10 cursor-grab bg-transparent p-0 text-right active:cursor-grabbing ${
                        selected ? "ring-2 ring-fuchsia-500" : ""
                      }`}
                      style={{
                        left: field.x * zoom,
                        bottom: field.y * zoom,
                        width: field.width * zoom,
                        height: field.height * zoom,
                      }}
                    >
                      <span
                        className={`relative block h-full w-full border ${
                          selected
                            ? "border-fuchsia-500 bg-fuchsia-500/10"
                            : "border-blue-500 bg-blue-500/10"
                        }`}
                      >
                        {renderFieldPreview(field, zoom, showPreviewValues)}

                        {showLabel && (
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
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
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
                      סוג שדה
                      <select
                        value={selectedField.type}
                        onChange={(event) =>
                          updateField(selectedField.key, {
                            type: event.target.value as FieldType,
                          })
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
                      >
                        <option value="text">טקסט</option>
                        <option value="digits">ספרות</option>
                        <option value="dateDigits">תאריך ספרות</option>
                        <option value="check">וי</option>
                        <option value="signature">חתימה</option>
                      </select>
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
                    ערך דוגמה
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

                  <label className="block text-xs font-black text-slate-500">
                    שם שדה
                    <input
                      value={selectedField.label}
                      onChange={(event) =>
                        updateField(selectedField.key, {
                          label: event.target.value,
                        })
                      }
                      className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
                    />
                  </label>

                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => nudge(0, 1)}
                      className="rounded-xl bg-slate-100 py-2 text-sm font-black"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => nudge(0, -1)}
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
                    onClick={removeSelectedField}
                    className="w-full rounded-2xl bg-rose-50 py-3 text-sm font-black text-rose-700"
                  >
                    מחיקת שדה חדש
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-black">שדות בעמוד {page}</h2>

              <div className="mt-4 max-h-[620px] space-y-2 overflow-auto pr-1">
                {pageFields.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => {
                      setSelectedKey(field.key);
                      setShowAllFields(false);
                    }}
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
                          x:{field.x} y:{field.y}
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