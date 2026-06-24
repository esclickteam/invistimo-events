"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

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
  order: number;
  enabled: boolean;
  isFixed?: boolean;
  fixedValue?: string;
};

type DragState = {
  key: string;
  offsetX: number;
  offsetY: number;
} | null;

const PDF_URL = "/forms/tofes-101.pdf";

const STORAGE_KEY = "invistimo_form101_original_pdf_mapper_v4";
const APPROVED_STORAGE_KEY = "invistimo_form101_original_pdf_mapper_approved_v1";
const TEMPLATE_API_URL = "/api/admin/forms/101/template";

const PAGE_WIDTH = 900;
const PAGE_HEIGHT = 1280;
const DEFAULT_GLOBAL_DIGIT_GAP = 13;

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

const INITIAL_FIELDS_RAW: Omit<FieldItem, "order" | "enabled">[] = [
  {
    key: "taxYear",
    label: "שנת מס",
    section: "year",
    page: 1,
    x: 344,
    y: 120,
    width: 105,
    height: 30,
    type: "digits",
    sample: "2026",
    isFixed: true,
    fixedValue: "2026",
    fontSize: 20,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 4,
    align: "center",
  },

  {
    key: "employerName",
    label: "שם מעסיק",
    section: "employer",
    page: 1,
    x: 620,
    y: 285,
    width: 150,
    height: 24,
    type: "text",
    sample: "בן עשת",
    isFixed: true,
    fixedValue: "בן עשת",
    fontSize: 16,
    align: "right",
  },
  {
    key: "employerAddress",
    label: "כתובת מעסיק",
    section: "employer",
    page: 1,
    x: 430,
    y: 285,
    width: 175,
    height: 24,
    type: "text",
    sample: "העצמאות 41 קרית אתא",
    isFixed: true,
    fixedValue: "העצמאות 41 קרית אתא",
    fontSize: 14,
    align: "right",
  },
  {
    key: "employerPhone",
    label: "טלפון מעסיק",
    section: "employer",
    page: 1,
    x: 245,
    y: 285,
    width: 145,
    height: 24,
    type: "digits",
    sample: "0526850711",
    isFixed: true,
    fixedValue: "0526850711",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 10,
    align: "left",
  },
  {
    key: "employerFileNumber",
    label: "תיק ניכויים",
    section: "employer",
    page: 1,
    x: 70,
    y: 285,
    width: 145,
    height: 24,
    type: "digits",
    sample: "905790028",
    isFixed: true,
    fixedValue: "905790028",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 9,
    align: "left",
  },

  {
    key: "idNumber",
    label: "תעודת זהות",
    section: "employee",
    page: 1,
    x: 638,
    y: 385,
    width: 125,
    height: 24,
    type: "digits",
    sample: "316576578",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 9,
    align: "left",
  },
  {
    key: "lastName",
    label: "שם משפחה",
    section: "employee",
    page: 1,
    x: 520,
    y: 385,
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
    y: 385,
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
    y: 385,
    width: 98,
    height: 24,
    type: "digits",
    sample: "04031997",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "immigrationDate",
    label: "תאריך עליה",
    section: "employee",
    page: 1,
    x: 170,
    y: 385,
    width: 98,
    height: 24,
    type: "digits",
    sample: "",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 8,
    align: "left",
  },

  {
    key: "street",
    label: "רחוב",
    section: "employee",
    page: 1,
    x: 505,
    y: 445,
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
    y: 445,
    width: 60,
    height: 24,
    type: "digits",
    sample: "41",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 4,
    align: "center",
  },
  {
    key: "city",
    label: "עיר",
    section: "employee",
    page: 1,
    x: 300,
    y: 445,
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
    y: 445,
    width: 80,
    height: 24,
    type: "digits",
    sample: "",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 7,
    align: "left",
  },

  {
    key: "phonePrefix",
    label: "טלפון - קידומת",
    section: "employee",
    page: 1,
    x: 330,
    y: 505,
    width: 38,
    height: 24,
    type: "digits",
    sample: "04",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 3,
    align: "center",
  },
  {
    key: "phoneNumber",
    label: "טלפון - מספר",
    section: "employee",
    page: 1,
    x: 380,
    y: 505,
    width: 90,
    height: 24,
    type: "digits",
    sample: "1234567",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 7,
    align: "left",
  },
  {
    key: "mobilePrefix",
    label: "נייד - קידומת",
    section: "employee",
    page: 1,
    x: 165,
    y: 505,
    width: 38,
    height: 24,
    type: "digits",
    sample: "055",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 3,
    align: "center",
  },
  {
    key: "mobileNumber",
    label: "נייד - מספר",
    section: "employee",
    page: 1,
    x: 215,
    y: 505,
    width: 95,
    height: 24,
    type: "digits",
    sample: "5039072",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 7,
    align: "left",
  },
  {
    key: "email",
    label: "מייל",
    section: "employee",
    page: 1,
    x: 80,
    y: 558,
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
    y: 505,
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
    y: 535,
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
    y: 505,
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
    y: 535,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "maritalDivorced",
    label: "גרוש/ה",
    section: "employee",
    page: 1,
    x: 510,
    y: 505,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "maritalWidowed",
    label: "אלמן/ה",
    section: "employee",
    page: 1,
    x: 510,
    y: 535,
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
    y: 505,
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
    y: 535,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "kibbutzYes",
    label: "חבר קיבוץ/מושב כן",
    section: "employee",
    page: 1,
    x: 285,
    y: 505,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "kibbutzNo",
    label: "חבר קיבוץ/מושב לא",
    section: "employee",
    page: 1,
    x: 285,
    y: 535,
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
    y: 535,
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
    y: 535,
    width: 85,
    height: 24,
    type: "text",
    sample: "כללית",
    fontSize: 14,
    align: "right",
  },

  {
    key: "child1Name",
    label: "ילד 1 שם",
    section: "children",
    page: 1,
    x: 540,
    y: 685,
    width: 95,
    height: 22,
    type: "text",
    sample: "",
    fontSize: 14,
    align: "center",
  },
  {
    key: "child1Id",
    label: "ילד 1 ת.ז",
    section: "children",
    page: 1,
    x: 405,
    y: 685,
    width: 110,
    height: 22,
    type: "digits",
    sample: "",
    fontSize: 14,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 9,
    align: "left",
  },
  {
    key: "child1BirthDate",
    label: "ילד 1 לידה",
    section: "children",
    page: 1,
    x: 285,
    y: 685,
    width: 100,
    height: 22,
    type: "digits",
    sample: "",
    fontSize: 14,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "child1Mark1",
    label: "ילד 1 סימון 1",
    section: "children",
    page: 1,
    x: 745,
    y: 685,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 16,
    align: "center",
  },
  {
    key: "child1Mark2",
    label: "ילד 1 סימון 2",
    section: "children",
    page: 1,
    x: 720,
    y: 685,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 16,
    align: "center",
  },

  {
    key: "workStartDate",
    label: "תחילת עבודה",
    section: "income",
    page: 1,
    x: 95,
    y: 710,
    width: 105,
    height: 24,
    type: "digits",
    sample: "22062026",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "incomeMonthlySalary",
    label: "משכורת חודש",
    section: "income",
    page: 1,
    x: 318,
    y: 700,
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
    y: 730,
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
    y: 760,
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
    y: 790,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "incomeAllowance",
    label: "קצבה",
    section: "income",
    page: 1,
    x: 318,
    y: 820,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "incomeScholarship",
    label: "מלגה",
    section: "income",
    page: 1,
    x: 318,
    y: 850,
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
    y: 940,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "otherHasIncome",
    label: "יש הכנסות אחרות",
    section: "otherIncome",
    page: 1,
    x: 335,
    y: 975,
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
    y: 1180,
    width: 115,
    height: 24,
    type: "digits",
    sample: "",
    fontSize: 14,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 9,
    align: "left",
  },
  {
    key: "spouseLastName",
    label: "בן זוג משפחה",
    section: "spouse",
    page: 1,
    x: 520,
    y: 1180,
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
    y: 1180,
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
    y: 45,
    width: 120,
    height: 24,
    type: "digits",
    sample: "316576578",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 9,
    align: "left",
  },
  {
    key: "creditResident",
    label: "תושב ישראל",
    section: "credits",
    page: 2,
    x: 742,
    y: 100,
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
    y: 145,
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
    y: 210,
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
    y: 285,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditSingleParent",
    label: "חד הורית",
    section: "credits",
    page: 2,
    x: 742,
    y: 420,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditChildrenCustody",
    label: "ילדים בחזקתי",
    section: "credits",
    page: 2,
    x: 742,
    y: 500,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditSoldier",
    label: "חייל משוחרר",
    section: "credits",
    page: 2,
    x: 742,
    y: 845,
    width: 20,
    height: 20,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditAcademic",
    label: "לימודים",
    section: "credits",
    page: 2,
    x: 742,
    y: 895,
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
    y: 970,
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
    y: 1040,
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
    y: 1180,
    width: 115,
    height: 26,
    type: "digits",
    sample: "21062026",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "signature",
    label: "חתימה",
    section: "declaration",
    page: 2,
    x: 80,
    y: 1170,
    width: 140,
    height: 42,
    type: "signature",
    sample: "חתימה",
    fontSize: 16,
    align: "center",
  },
];

function normalizeFields(fields: Partial<FieldItem>[]) {
  return fields.map((field, index) => ({
    ...field,
    order: Number(field.order || index + 1),
    enabled: typeof field.enabled === "boolean" ? field.enabled : true,
    isFixed: typeof field.isFixed === "boolean" ? field.isFixed : false,
    fixedValue: String(field.fixedValue || ""),
  })) as FieldItem[];
}

const INITIAL_FIELDS = normalizeFields(INITIAL_FIELDS_RAW);

function loadFields() {
  if (typeof window === "undefined") return INITIAL_FIELDS;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_FIELDS;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? normalizeFields(parsed) : INITIAL_FIELDS;
  } catch {
    return INITIAL_FIELDS;
  }
}

function loadApproved() {
  if (typeof window === "undefined") return false;

  return localStorage.getItem(APPROVED_STORAGE_KEY) === "true";
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

function getFieldTypeLabel(type: FieldType) {
  if (type === "text") return "טקסט";
  if (type === "digits") return "ספרות / מספרים";
  if (type === "check") return "סימון וי";
  if (type === "signature") return "חתימה";
  return type;
}

function renderValue(field: FieldItem, showValues: boolean) {
  if (!showValues) return null;

  const displayValue = field.isFixed ? field.fixedValue || field.sample : field.sample;

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
        {displayValue || "חתימה"}
      </span>
    );
  }

  if (field.type === "digits") {
    const digits = onlyDigits(displayValue);
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
            style={{ width: field.digitGap || DEFAULT_GLOBAL_DIGIT_GAP }}
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
      {displayValue}
    </span>
  );
}

function fieldToMap(field: FieldItem) {
  return {
    label: field.label,
    page: field.page,
    section: field.section,
    order: field.order,
    enabled: field.enabled,
    isFixed: Boolean(field.isFixed),
    fixedValue: field.fixedValue || "",
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

function fieldsToMap(fields: FieldItem[]) {
  return fields
    .filter((field) => field.enabled)
    .sort((a, b) => a.order - b.order)
    .reduce<Record<string, any>>((acc, field) => {
      acc[field.key] = fieldToMap(field);
      return acc;
    }, {});
}

function templateFieldsToFields(templateFields: any) {
  const source =
    templateFields && typeof templateFields === "object" ? templateFields : {};

  const fromServer = Object.entries(source).map(([key, value]: any, index) => {
    const base = INITIAL_FIELDS.find((field) => field.key === key);

    return {
      key,
      label: String(value?.label || base?.label || key),
      section: String(value?.section || base?.section || "employee"),
      page: Number(value?.page) === 2 ? 2 : 1,
      x: Number(value?.x ?? base?.x ?? 0),
      y: Number(value?.y ?? base?.y ?? 0),
      width: Number(value?.width ?? base?.width ?? 120),
      height: Number(value?.height ?? base?.height ?? 24),
      type:
        value?.type === "digits" ||
        value?.type === "check" ||
        value?.type === "signature"
          ? value.type
          : value?.type === "text"
          ? "text"
          : base?.type || "text",
      sample: String(value?.sample ?? base?.sample ?? ""),
      fontSize: Number(value?.fontSize ?? base?.fontSize ?? 14),
      digitGap:
        value?.digitGap === null || value?.digitGap === undefined
          ? base?.digitGap
          : Number(value.digitGap),
      maxDigits:
        value?.maxDigits === null || value?.maxDigits === undefined
          ? base?.maxDigits
          : Number(value.maxDigits),
      align:
        value?.align === "left" || value?.align === "center" || value?.align === "right"
          ? value.align
          : base?.align || "right",
      order: Number(value?.order || base?.order || index + 1),
      enabled: typeof value?.enabled === "boolean" ? value.enabled : true,
      isFixed: typeof value?.isFixed === "boolean" ? value.isFixed : false,
      fixedValue: String(value?.fixedValue || ""),
    } as FieldItem;
  });

  if (!fromServer.length) return INITIAL_FIELDS;

  const serverKeys = new Set(fromServer.map((field) => field.key));
  const missingDefaults = INITIAL_FIELDS.filter((field) => !serverKeys.has(field.key));

  return normalizeFields([...fromServer, ...missingDefaults]).sort(
    (a, b) => a.order - b.order
  );
}

async function loadTemplateFromServer() {
  const response = await fetch(TEMPLATE_API_URL, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || "שגיאה בטעינת התבנית");
  }

  return data?.template || null;
}

async function saveTemplateToServer(fields: FieldItem[]) {
  const response = await fetch(TEMPLATE_API_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      fields: fieldsToMap(fields),
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || "שגיאה בשמירת התבנית");
  }

  return data?.template || null;
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
  const [showDisabledFields, setShowDisabledFields] = useState(true);
  const [pdfReloadKey, setPdfReloadKey] = useState(1);
  const [globalDigitGap, setGlobalDigitGap] = useState(
    DEFAULT_GLOBAL_DIGIT_GAP
  );
  const [templateApproved, setTemplateApproved] = useState(loadApproved);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateSaving, setTemplateSaving] = useState(false);

  const pageSections = useMemo(
    () => SECTIONS.filter((section) => section.page === page),
    [page]
  );

  const pageFields = useMemo(
    () =>
      fields
        .filter((field) => field.page === page)
        .sort((a, b) => a.order - b.order),
    [fields, page]
  );

  const sectionFields = useMemo(() => {
    return pageFields.filter((field) => field.section === selectedSection);
  }, [pageFields, selectedSection]);

  const visibleFields = useMemo(() => {
    const allowed = sectionFields.filter(
      (field) => field.enabled || showDisabledFields
    );

    if (showAllFields) return allowed;

    return allowed.filter((field) => field.key === selectedKey);
  }, [sectionFields, selectedKey, showAllFields, showDisabledFields]);

  const selectedField = useMemo(
    () => fields.find((field) => field.key === selectedKey) || fields[0],
    [fields, selectedKey]
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateTemplate() {
      try {
        setTemplateLoading(true);

        const template = await loadTemplateFromServer();
        const serverFields = templateFieldsToFields(template?.fields);

        if (cancelled) return;

        setFields(serverFields);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverFields, null, 2));

        const approved = Boolean(template?.approvedAt || template?.updatedAt);
        setTemplateApproved(approved);
        localStorage.setItem(APPROVED_STORAGE_KEY, approved ? "true" : "false");

        const firstField = serverFields.find((field) => field.enabled) || serverFields[0];

        if (firstField) {
          setPage(firstField.page);
          setSelectedSection(firstField.section);
          setSelectedKey(firstField.key);
        }
      } catch (error) {
        console.error("LOAD FORM 101 TEMPLATE ERROR:", error);
      } finally {
        if (!cancelled) setTemplateLoading(false);
      }
    }

    hydrateTemplate();

    return () => {
      cancelled = true;
    };
  }, []);

  function markTemplateChanged() {
    setTemplateApproved(false);

    if (typeof window !== "undefined") {
      localStorage.setItem(APPROVED_STORAGE_KEY, "false");
    }
  }

  function updateField(key: string, patch: Partial<FieldItem>) {
    markTemplateChanged();

    setFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, ...patch } : field))
    );
  }

  function updateAllDigitGaps(value: number) {
    const safeValue = Math.max(1, Number(value) || DEFAULT_GLOBAL_DIGIT_GAP);

    markTemplateChanged();
    setGlobalDigitGap(safeValue);

    setFields((prev) =>
      prev.map((field) =>
        field.type === "digits"
          ? {
              ...field,
              digitGap: safeValue,
            }
          : field
      )
    );
  }

  function setFieldEnabled(key: string, enabled: boolean) {
    updateField(key, { enabled });
  }

  function updateFieldOrder(key: string, order: number) {
    updateField(key, { order: Math.max(1, Number(order) || 1) });
  }

  function moveFieldOrder(key: string, direction: "up" | "down") {
    const current = fields.find((field) => field.key === key);
    if (!current) return;

    const sameSection = fields
      .filter(
        (field) =>
          field.page === current.page && field.section === current.section
      )
      .sort((a, b) => a.order - b.order);

    const index = sameSection.findIndex((field) => field.key === key);
    const swapIndex = direction === "up" ? index - 1 : index + 1;

    if (swapIndex < 0 || swapIndex >= sameSection.length) return;

    const other = sameSection[swapIndex];

    markTemplateChanged();

    setFields((prev) =>
      prev.map((field) => {
        if (field.key === current.key) return { ...field, order: other.order };
        if (field.key === other.key) return { ...field, order: current.order };
        return field;
      })
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

  async function save() {
    try {
      setTemplateSaving(true);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(fields, null, 2));

      await saveTemplateToServer(fields);

      setTemplateApproved(true);
      localStorage.setItem(APPROVED_STORAGE_KEY, "true");

      alert("התבנית נשמרה ואושרה בשרת");
    } catch (error) {
      console.error("SAVE FORM 101 TEMPLATE ERROR:", error);
      alert(error instanceof Error ? error.message : "שגיאה בשמירת התבנית");
    } finally {
      setTemplateSaving(false);
    }
  }

  async function approveTemplate() {
    await save();
  }

  function reset() {
    if (!confirm("לאפס מיקומים והגדרות?")) return;

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(APPROVED_STORAGE_KEY);

    setFields(INITIAL_FIELDS);
    setSelectedSection("year");
    setSelectedKey("taxYear");
    setGlobalDigitGap(DEFAULT_GLOBAL_DIGIT_GAP);
    setShowAllFields(false);
    setTemplateApproved(false);
    setPdfReloadKey((prev) => prev + 1);
  }

  async function copyConst() {
    const map = fields
      .filter((field) => field.enabled)
      .sort((a, b) => a.order - b.order)
      .reduce<Record<string, any>>((acc, field) => {
        acc[field.key] = fieldToMap(field);
        return acc;
      }, {});

    await navigator.clipboard.writeText(
      `const FORM101_FIELD_MAP = ${JSON.stringify(map, null, 2)} as const;`
    );

    alert("הועתקו רק השדות הפעילים כולל שדות קבועים");
  }

  function addField() {
    const sectionMaxOrder = fields
      .filter((field) => field.page === page && field.section === selectedSection)
      .reduce((max, field) => Math.max(max, field.order), 0);

    const key = `customField${Date.now()}`;

    const field: FieldItem = {
      key,
      label: `שדה חדש`,
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
      order: sectionMaxOrder + 1,
      enabled: true,
      isFixed: false,
      fixedValue: "",
    };

    markTemplateChanged();

    setFields((prev) => [...prev, field]);
    setSelectedKey(key);
    setShowAllFields(false);
  }

  function deleteOrDisableField() {
    if (!selectedField) return;

    if (selectedField.key.startsWith("customField")) {
      if (!confirm("למחוק את השדה החדש לגמרי?")) return;

      markTemplateChanged();

      setFields((prev) =>
        prev.filter((field) => field.key !== selectedField.key)
      );

      setSelectedKey("taxYear");
      setSelectedSection("year");
      setShowAllFields(false);

      return;
    }

    setFieldEnabled(selectedField.key, false);
    setShowAllFields(false);
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
      <div className="mx-auto max-w-[1900px] space-y-4 p-4">
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
                מוצג כאן הקובץ המקורי: public/forms/tofes-101.pdf. ניתן לשנות
                מספר שדה, להפעיל/לכבות שדות, להגדיר שדה קבוע לכל העובדים או שדה
                שהעובד ממלא, למחוק שדות חדשים, ולאשר תבנית לפני שימוש.
              </p>

              <div
                className={`mt-3 inline-flex rounded-full px-4 py-2 text-xs font-black ${
                  templateApproved
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {templateLoading
                  ? "טוען תבנית מהשרת..."
                  : templateApproved
                  ? "התבנית מאושרת"
                  : "התבנית עדיין לא אושרה"}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setSelectedSection("year");
                  setSelectedKey("taxYear");
                  setShowAllFields(false);
                  setPdfReloadKey((prev) => prev + 1);
                }}
                className={`h-11 rounded-2xl px-5 text-sm font-black ${
                  page === 1
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white"
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
                  setShowAllFields(false);
                  setPdfReloadKey((prev) => prev + 1);
                }}
                className={`h-11 rounded-2xl px-5 text-sm font-black ${
                  page === 2
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white"
                }`}
              >
                עמוד 2
              </button>

              <button
                type="button"
                onClick={() => setShowAllFields((prev) => !prev)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black"
              >
                {showAllFields ? "הצג רק שדה נבחר" : "הצג כל השדות בסעיף"}
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
                onClick={() => setShowDisabledFields((prev) => !prev)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black"
              >
                {showDisabledFields ? "הסתר שדות כבויים" : "הצג שדות כבויים"}
              </button>

              <label className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
                <span>מרווח ספרות</span>
                <input
                  type="number"
                  min={1}
                  value={globalDigitGap}
                  onChange={(event) =>
                    updateAllDigitGaps(Number(event.target.value))
                  }
                  className="h-8 w-16 rounded-xl border border-slate-200 px-2 text-center text-sm font-black outline-none"
                />
              </label>

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
                disabled={templateSaving || templateLoading}
                className="h-11 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {templateSaving ? "שומר..." : "שמירה"}
              </button>

              <button
                type="button"
                onClick={approveTemplate}
                disabled={templateSaving || templateLoading}
                className="h-11 rounded-2xl bg-teal-600 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {templateSaving ? "מאשר..." : "אישור תבנית"}
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

        <section className="grid gap-4 xl:grid-cols-[330px_1fr_410px]">
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
                      setShowAllFields(false);

                      const firstField = fields
                        .filter(
                          (field) =>
                            field.page === page &&
                            field.section === section.key &&
                            (field.enabled || showDisabledFields)
                        )
                        .sort((a, b) => a.order - b.order)[0];

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

            <div className="mt-6 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-black text-slate-700">
                שדות בסעיף הנבחר
              </h3>

              <div className="mt-3 max-h-[560px] space-y-2 overflow-auto pr-1">
                {sectionFields
                  .filter((field) => field.enabled || showDisabledFields)
                  .map((field) => {
                    const active = selectedKey === field.key;

                    return (
                      <button
                        key={field.key}
                        type="button"
                        onClick={() => {
                          setSelectedKey(field.key);
                          setSelectedSection(field.section);
                          setShowAllFields(false);
                        }}
                        className={`w-full rounded-2xl border px-3 py-3 text-right transition ${
                          active
                            ? "border-fuchsia-300 bg-fuchsia-50"
                            : field.enabled
                            ? "border-slate-200 bg-white hover:bg-slate-50"
                            : "border-rose-200 bg-rose-50 opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-slate-800">
                            {field.order}. {field.label}
                          </span>

                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
                            {getFieldTypeLabel(field.type)}
                          </span>
                        </div>

                        <div className="mt-1 text-xs font-bold text-slate-400">
                          ערך: {field.isFixed ? field.fixedValue || "ריק" : field.sample || "ריק"}
                        </div>

                        <div
                          className={`mt-1 text-xs font-black ${
                            field.enabled ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {field.enabled ? "פעיל" : "כבוי"} · {field.isFixed ? "קבוע לכל העובדים" : "העובד ממלא"}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </aside>

          <section className="overflow-auto rounded-3xl bg-white p-8 shadow-sm">
            <div
              ref={pageRef}
              className="relative mx-auto overflow-hidden rounded-sm bg-white shadow-xl ring-2 ring-slate-300"
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
                src={`${PDF_URL}#toolbar=0&navpanes=0&scrollbar=0&page=${page}&zoom=page-fit`}
                title="טופס 101 מקורי"
                scrolling="no"
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
                      setShowAllFields(false);
                    }}
                    className={`absolute z-20 cursor-grab bg-transparent p-0 active:cursor-grabbing ${
                      selected ? "ring-2 ring-fuchsia-500" : ""
                    } ${field.enabled ? "" : "opacity-40"}`}
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
                          : field.enabled
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-rose-500 bg-rose-500/10"
                      }`}
                    >
                      {renderValue(field, showValues)}

                      <span className="absolute -top-6 right-0 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] font-black text-white">
                        {field.order}. {field.label}
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
                    {selectedField.order}. {selectedField.label}
                  </p>

                  <p className="mt-1 text-xs font-bold text-indigo-400">
                    {selectedField.key}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black">
                    <div className="rounded-xl bg-white px-3 py-2 text-slate-600">
                      סוג: {getFieldTypeLabel(selectedField.type)}
                    </div>

                    <div className="rounded-xl bg-white px-3 py-2 text-slate-600">
                      ערך: {selectedField.isFixed ? selectedField.fixedValue || "ריק" : selectedField.sample || "ריק"}
                    </div>

                    <div
                      className={`rounded-xl bg-white px-3 py-2 ${
                        selectedField.enabled
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      מצב: {selectedField.enabled ? "פעיל" : "כבוי"}
                    </div>

                    <div className="rounded-xl bg-white px-3 py-2 text-slate-600">
                      מספר: {selectedField.order}
                    </div>

                    <div
                      className={`rounded-xl bg-white px-3 py-2 ${
                        selectedField.isFixed ? "text-indigo-700" : "text-slate-600"
                      }`}
                    >
                      מילוי: {selectedField.isFixed ? "קבוע לכל העובדים" : "העובד ממלא"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-black text-slate-500">
                    מספר שדה
                    <input
                      type="number"
                      min={1}
                      value={selectedField.order}
                      onChange={(event) =>
                        updateFieldOrder(
                          selectedField.key,
                          Number(event.target.value)
                        )
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-500">
                    פעיל / כבוי
                    <select
                      value={selectedField.enabled ? "yes" : "no"}
                      onChange={(event) =>
                        setFieldEnabled(
                          selectedField.key,
                          event.target.value === "yes"
                        )
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold"
                    >
                      <option value="yes">פעיל</option>
                      <option value="no">כבוי</option>
                    </select>
                  </label>

                  <label className="text-xs font-black text-slate-500">
                    קבוע / עובד ממלא
                    <select
                      value={selectedField.isFixed ? "fixed" : "employee"}
                      onChange={(event) =>
                        updateField(selectedField.key, {
                          isFixed: event.target.value === "fixed",
                          fixedValue:
                            event.target.value === "fixed"
                              ? selectedField.fixedValue || selectedField.sample || ""
                              : selectedField.fixedValue || "",
                        })
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold"
                    >
                      <option value="employee">העובד ממלא</option>
                      <option value="fixed">קבוע לכל העובדים</option>
                    </select>
                  </label>

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
                      value={selectedField.digitGap || globalDigitGap}
                      disabled={selectedField.type !== "digits"}
                      onChange={(event) =>
                        updateAllDigitGaps(Number(event.target.value))
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

                <label className="block text-xs font-black text-slate-500">
                  ערך קבוע לכל העובדים
                  <input
                    value={selectedField.fixedValue || ""}
                    disabled={!selectedField.isFixed}
                    onChange={(event) =>
                      updateField(selectedField.key, {
                        fixedValue: event.target.value,
                      })
                    }
                    placeholder="מופיע אוטומטית לכל העובדים"
                    className="mt-1 h-11 w-full rounded-xl border px-3 text-sm font-bold disabled:bg-slate-100 disabled:text-slate-400"
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
                    className="mt-1 h-11 w-full rounded-xl border px-3 text-sm font-bold"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => moveFieldOrder(selectedField.key, "up")}
                    className="rounded-xl bg-slate-100 py-2 text-sm font-black"
                  >
                    העלה בסדר
                  </button>

                  <button
                    type="button"
                    onClick={() => moveFieldOrder(selectedField.key, "down")}
                    className="rounded-xl bg-slate-100 py-2 text-sm font-black"
                  >
                    הורד בסדר
                  </button>
                </div>

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

                {selectedField.enabled ? (
                  <button
                    type="button"
                    onClick={deleteOrDisableField}
                    className="w-full rounded-2xl bg-rose-50 py-3 text-sm font-black text-rose-700"
                  >
                    {selectedField.key.startsWith("customField")
                      ? "מחיקת שדה חדש"
                      : "כיבוי שדה"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFieldEnabled(selectedField.key, true)}
                    className="w-full rounded-2xl bg-emerald-50 py-3 text-sm font-black text-emerald-700"
                  >
                    החזרת שדה לפעיל
                  </button>
                )}
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}