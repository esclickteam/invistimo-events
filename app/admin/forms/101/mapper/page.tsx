"use client";

import React, { useMemo, useRef, useState } from "react";

export const dynamic = "force-dynamic";

type FieldType = "text" | "digits" | "check" | "signature";
type TextAlign = "right" | "left" | "center";

type FormPage = 1 | 2;

type FieldItem = {
  key: string;
  label: string;
  sectionKey: string;
  page: FormPage;
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
  required?: boolean;
};

type SectionItem = {
  key: string;
  title: string;
  page: FormPage;
  optional?: boolean;
  collapsedByDefault?: boolean;
};

type DragState = {
  key: string;
  offsetX: number;
  offsetY: number;
} | null;

const STORAGE_KEY = "invistimo_form101_html_template_builder_v1";

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

const SECTIONS: SectionItem[] = [
  { key: "taxYear", title: "שנת מס", page: 1 },
  { key: "employer", title: "א. פרטי המעביד", page: 1 },
  { key: "employee", title: "ב. פרטי העובד/ת", page: 1 },
  {
    key: "children",
    title: "ג. ילדים עד גיל 19",
    page: 1,
    optional: true,
    collapsedByDefault: true,
  },
  { key: "incomeMain", title: "ד. הכנסות ממעסיק זה", page: 1 },
  {
    key: "otherIncome",
    title: "ה. הכנסות אחרות",
    page: 1,
    optional: true,
    collapsedByDefault: true,
  },
  {
    key: "spouse",
    title: "ו. בן/בת זוג",
    page: 1,
    optional: true,
    collapsedByDefault: true,
  },
  {
    key: "changes",
    title: "ז. שינויים במהלך השנה",
    page: 1,
    optional: true,
    collapsedByDefault: true,
  },
  { key: "credits", title: "ח. פטור / זיכוי ממס", page: 2 },
  {
    key: "taxCoordination",
    title: "ט. תיאום מס",
    page: 2,
    optional: true,
    collapsedByDefault: true,
  },
  { key: "declaration", title: "י. הצהרה וחתימה", page: 2 },
];

const INITIAL_FIELDS: FieldItem[] = [
  {
    key: "taxYear",
    label: "שנת מס",
    sectionKey: "taxYear",
    page: 1,
    x: 335,
    y: 106,
    width: 112,
    height: 28,
    type: "digits",
    sample: "2026",
    fontSize: 20,
    digitGap: 22,
    maxDigits: 4,
    align: "center",
    required: true,
  },

  {
    key: "employerName",
    label: "שם מעסיק",
    sectionKey: "employer",
    page: 1,
    x: 592,
    y: 236,
    width: 160,
    height: 28,
    type: "text",
    sample: "Invistimo",
    fontSize: 17,
    align: "right",
    required: true,
  },
  {
    key: "employerAddress",
    label: "כתובת מעסיק",
    sectionKey: "employer",
    page: 1,
    x: 384,
    y: 236,
    width: 190,
    height: 28,
    type: "text",
    sample: "העצמאות 41 קרית אתא",
    fontSize: 15,
    align: "right",
  },
  {
    key: "employerPhone",
    label: "טלפון מעסיק",
    sectionKey: "employer",
    page: 1,
    x: 226,
    y: 236,
    width: 132,
    height: 28,
    type: "digits",
    sample: "0526850711",
    fontSize: 16,
    digitGap: 13,
    maxDigits: 10,
    align: "left",
  },
  {
    key: "employerFileNumber",
    label: "תיק ניכויים",
    sectionKey: "employer",
    page: 1,
    x: 62,
    y: 236,
    width: 132,
    height: 28,
    type: "digits",
    sample: "905790028",
    fontSize: 16,
    digitGap: 14,
    maxDigits: 9,
    align: "left",
  },

  {
    key: "idNumber",
    label: "תעודת זהות",
    sectionKey: "employee",
    page: 1,
    x: 642,
    y: 318,
    width: 118,
    height: 26,
    type: "digits",
    sample: "316576578",
    fontSize: 16,
    digitGap: 13,
    maxDigits: 9,
    align: "left",
    required: true,
  },
  {
    key: "lastName",
    label: "שם משפחה",
    sectionKey: "employee",
    page: 1,
    x: 525,
    y: 318,
    width: 95,
    height: 26,
    type: "text",
    sample: "עשת",
    fontSize: 16,
    align: "center",
    required: true,
  },
  {
    key: "firstName",
    label: "שם פרטי",
    sectionKey: "employee",
    page: 1,
    x: 420,
    y: 318,
    width: 85,
    height: 26,
    type: "text",
    sample: "הדר",
    fontSize: 16,
    align: "center",
    required: true,
  },
  {
    key: "birthDate",
    label: "תאריך לידה",
    sectionKey: "employee",
    page: 1,
    x: 300,
    y: 318,
    width: 100,
    height: 26,
    type: "digits",
    sample: "04031997",
    fontSize: 16,
    digitGap: 12,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "immigrationDate",
    label: "תאריך עליה",
    sectionKey: "employee",
    page: 1,
    x: 160,
    y: 318,
    width: 100,
    height: 26,
    type: "digits",
    sample: "",
    fontSize: 16,
    digitGap: 12,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "street",
    label: "רחוב / שכונה",
    sectionKey: "employee",
    page: 1,
    x: 520,
    y: 373,
    width: 160,
    height: 26,
    type: "text",
    sample: "העצמאות",
    fontSize: 16,
    align: "right",
  },
  {
    key: "houseNumber",
    label: "מספר",
    sectionKey: "employee",
    page: 1,
    x: 440,
    y: 373,
    width: 55,
    height: 26,
    type: "digits",
    sample: "41",
    fontSize: 16,
    digitGap: 16,
    maxDigits: 4,
    align: "center",
  },
  {
    key: "city",
    label: "עיר / ישוב",
    sectionKey: "employee",
    page: 1,
    x: 315,
    y: 373,
    width: 105,
    height: 26,
    type: "text",
    sample: "קרית אתא",
    fontSize: 16,
    align: "center",
  },
  {
    key: "postalCode",
    label: "מיקוד",
    sectionKey: "employee",
    page: 1,
    x: 205,
    y: 373,
    width: 88,
    height: 26,
    type: "digits",
    sample: "",
    fontSize: 16,
    digitGap: 12,
    maxDigits: 7,
    align: "left",
  },
  {
    key: "phone",
    label: "טלפון",
    sectionKey: "employee",
    page: 1,
    x: 342,
    y: 422,
    width: 120,
    height: 26,
    type: "digits",
    sample: "",
    fontSize: 16,
    digitGap: 12,
    maxDigits: 10,
    align: "left",
  },
  {
    key: "mobile",
    label: "נייד",
    sectionKey: "employee",
    page: 1,
    x: 165,
    y: 422,
    width: 140,
    height: 26,
    type: "digits",
    sample: "0555039072",
    fontSize: 16,
    digitGap: 13,
    maxDigits: 10,
    align: "left",
  },
  {
    key: "email",
    label: "דואר אלקטרוני",
    sectionKey: "employee",
    page: 1,
    x: 98,
    y: 490,
    width: 230,
    height: 28,
    type: "text",
    sample: "sapir@gmail.com",
    fontSize: 16,
    align: "left",
  },

  {
    key: "genderMale",
    label: "מין: זכר",
    sectionKey: "employee",
    page: 1,
    x: 724,
    y: 423,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "genderFemale",
    label: "מין: נקבה",
    sectionKey: "employee",
    page: 1,
    x: 724,
    y: 452,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "maritalSingle",
    label: "רווק/ה",
    sectionKey: "employee",
    page: 1,
    x: 612,
    y: 423,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "maritalMarried",
    label: "נשוי/אה",
    sectionKey: "employee",
    page: 1,
    x: 612,
    y: 452,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "maritalDivorced",
    label: "גרוש/ה",
    sectionKey: "employee",
    page: 1,
    x: 510,
    y: 423,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "maritalWidowed",
    label: "אלמן/ה",
    sectionKey: "employee",
    page: 1,
    x: 510,
    y: 452,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "residentYes",
    label: "תושב ישראל כן",
    sectionKey: "employee",
    page: 1,
    x: 408,
    y: 423,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "residentNo",
    label: "תושב ישראל לא",
    sectionKey: "employee",
    page: 1,
    x: 408,
    y: 452,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "healthFundYes",
    label: "קופת חולים כן",
    sectionKey: "employee",
    page: 1,
    x: 158,
    y: 452,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "healthFundName",
    label: "שם קופה",
    sectionKey: "employee",
    page: 1,
    x: 70,
    y: 452,
    width: 86,
    height: 24,
    type: "text",
    sample: "כללית",
    fontSize: 15,
    align: "right",
  },

  {
    key: "child1Name",
    label: "ילד 1 - שם",
    sectionKey: "children",
    page: 1,
    x: 548,
    y: 595,
    width: 100,
    height: 24,
    type: "text",
    sample: "",
    fontSize: 14,
    align: "center",
  },
  {
    key: "child1Id",
    label: "ילד 1 - ת.ז",
    sectionKey: "children",
    page: 1,
    x: 412,
    y: 595,
    width: 95,
    height: 24,
    type: "digits",
    sample: "",
    fontSize: 14,
    digitGap: 10,
    maxDigits: 9,
    align: "left",
  },
  {
    key: "child1BirthDate",
    label: "ילד 1 - תאריך לידה",
    sectionKey: "children",
    page: 1,
    x: 290,
    y: 595,
    width: 90,
    height: 24,
    type: "digits",
    sample: "",
    fontSize: 14,
    digitGap: 10,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "child1Custody",
    label: "ילד 1 - חזקה",
    sectionKey: "children",
    page: 1,
    x: 708,
    y: 595,
    width: 16,
    height: 16,
    type: "check",
    sample: "✓",
    fontSize: 16,
    align: "center",
  },
  {
    key: "child1Allowance",
    label: "ילד 1 - קצבה",
    sectionKey: "children",
    page: 1,
    x: 733,
    y: 595,
    width: 16,
    height: 16,
    type: "check",
    sample: "✓",
    fontSize: 16,
    align: "center",
  },

  {
    key: "workStartDate",
    label: "תאריך תחילת עבודה",
    sectionKey: "incomeMain",
    page: 1,
    x: 94,
    y: 604,
    width: 105,
    height: 26,
    type: "digits",
    sample: "22062026",
    fontSize: 16,
    digitGap: 12,
    maxDigits: 8,
    align: "left",
  },
  {
    key: "incomeMonthlySalary",
    label: "משכורת חודש",
    sectionKey: "incomeMain",
    page: 1,
    x: 318,
    y: 604,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "incomeExtraSalary",
    label: "משרה נוספת",
    sectionKey: "incomeMain",
    page: 1,
    x: 318,
    y: 632,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "incomePartialSalary",
    label: "משכורת חלקית",
    sectionKey: "incomeMain",
    page: 1,
    x: 318,
    y: 660,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "incomeDailyWage",
    label: "שכר עבודה",
    sectionKey: "incomeMain",
    page: 1,
    x: 318,
    y: 688,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "incomeAllowance",
    label: "קצבה",
    sectionKey: "incomeMain",
    page: 1,
    x: 318,
    y: 716,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "incomeScholarship",
    label: "מלגה",
    sectionKey: "incomeMain",
    page: 1,
    x: 318,
    y: 744,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },

  {
    key: "otherNoIncome",
    label: "אין הכנסות אחרות",
    sectionKey: "otherIncome",
    page: 1,
    x: 330,
    y: 815,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "otherHasIncome",
    label: "יש הכנסות אחרות",
    sectionKey: "otherIncome",
    page: 1,
    x: 330,
    y: 850,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },

  {
    key: "spouseId",
    label: "בן/בת זוג - ת.ז",
    sectionKey: "spouse",
    page: 1,
    x: 670,
    y: 1035,
    width: 95,
    height: 24,
    type: "digits",
    sample: "",
    fontSize: 14,
    digitGap: 10,
    maxDigits: 9,
    align: "left",
  },
  {
    key: "spouseLastName",
    label: "בן/בת זוג - משפחה",
    sectionKey: "spouse",
    page: 1,
    x: 520,
    y: 1035,
    width: 120,
    height: 24,
    type: "text",
    sample: "",
    fontSize: 14,
    align: "center",
  },
  {
    key: "spouseFirstName",
    label: "בן/בת זוג - פרטי",
    sectionKey: "spouse",
    page: 1,
    x: 385,
    y: 1035,
    width: 110,
    height: 24,
    type: "text",
    sample: "",
    fontSize: 14,
    align: "center",
  },

  {
    key: "creditResident",
    label: "תושב/ת ישראל",
    sectionKey: "credits",
    page: 2,
    x: 742,
    y: 75,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditDisabled",
    label: "נכה / עיוור",
    sectionKey: "credits",
    page: 2,
    x: 742,
    y: 112,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditSettlement",
    label: "ישוב מזכה",
    sectionKey: "credits",
    page: 2,
    x: 742,
    y: 168,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditNewImmigrant",
    label: "עולה חדש / חוזר",
    sectionKey: "credits",
    page: 2,
    x: 742,
    y: 230,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditSingleParent",
    label: "הורה במשפחה חד הורית",
    sectionKey: "credits",
    page: 2,
    x: 742,
    y: 340,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditChildren",
    label: "ילדים בחזקתי",
    sectionKey: "credits",
    page: 2,
    x: 742,
    y: 420,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditSoldier",
    label: "חייל/ת משוחרר/ת",
    sectionKey: "credits",
    page: 2,
    x: 742,
    y: 725,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "creditAcademic",
    label: "תואר / לימודי מקצוע",
    sectionKey: "credits",
    page: 2,
    x: 742,
    y: 770,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },

  {
    key: "taxNoIncome",
    label: "לא הייתה הכנסה",
    sectionKey: "taxCoordination",
    page: 2,
    x: 742,
    y: 860,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },
  {
    key: "taxHasOtherIncome",
    label: "יש הכנסות נוספות",
    sectionKey: "taxCoordination",
    page: 2,
    x: 742,
    y: 925,
    width: 18,
    height: 18,
    type: "check",
    sample: "✓",
    fontSize: 18,
    align: "center",
  },

  {
    key: "signatureDate",
    label: "תאריך חתימה",
    sectionKey: "declaration",
    page: 2,
    x: 260,
    y: 1036,
    width: 115,
    height: 28,
    type: "digits",
    sample: "21062026",
    fontSize: 16,
    digitGap: 13,
    maxDigits: 8,
    align: "left",
    required: true,
  },
  {
    key: "signature",
    label: "חתימה",
    sectionKey: "declaration",
    page: 2,
    x: 80,
    y: 1028,
    width: 140,
    height: 42,
    type: "signature",
    sample: "חתימה",
    fontSize: 17,
    align: "center",
    required: true,
  },
];

function getSavedFields() {
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

function getInitialOpenSections() {
  const result: Record<string, boolean> = {};

  for (const section of SECTIONS) {
    result[section.key] = !section.collapsedByDefault;
  }

  return result;
}

function onlyDigits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function getFieldAlignClass(align?: TextAlign) {
  if (align === "left") return "text-left";
  if (align === "center") return "text-center";
  return "text-right";
}

function renderFieldValue(field: FieldItem, showPreviewValues: boolean) {
  if (!showPreviewValues) return null;

  if (field.type === "check") {
    return (
      <span
        className="flex h-full w-full items-center justify-center font-black leading-none text-blue-700"
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
          justifyContent:
            field.align === "center"
              ? "center"
              : field.align === "right"
              ? "flex-end"
              : "flex-start",
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
      className={`block h-full w-full overflow-hidden whitespace-nowrap text-blue-900 ${getFieldAlignClass(
        field.align
      )}`}
      style={{
        fontSize: field.fontSize,
        lineHeight: `${field.height}px`,
      }}
    >
      {field.sample}
    </span>
  );
}

function fieldToMap(field: FieldItem) {
  return {
    page: field.page,
    sectionKey: field.sectionKey,
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    type: field.type,
    fontSize: field.fontSize,
    digitGap: field.digitGap || null,
    maxDigits: field.maxDigits || null,
    align: field.align || "right",
    required: Boolean(field.required),
  };
}

function TemplatePageBackground({ page }: { page: FormPage }) {
  if (page === 1) {
    return (
      <div className="absolute inset-0 bg-white text-black">
        <div className="absolute right-8 top-8 text-sm font-black">0101/130</div>
        <div className="absolute left-1/2 top-8 -translate-x-1/2 text-xs">
          דף 1 מתוך 2
        </div>

        <div className="absolute left-1/2 top-44 -translate-x-1/2 text-center">
          <div className="text-[34px] font-black leading-none">כרטיס עובד</div>
          <div className="mt-2 text-[13px] font-bold">
            ובקשה להקלה ולתיאום מס על ידי המעביד
          </div>
          <div className="mt-3 text-[18px] font-black tracking-[12px]">
            שנת המס
          </div>
        </div>

        <div className="absolute left-8 right-8 top-[190px] rounded border border-black p-3 text-center text-[12px] leading-5">
          טופס זה ימולא על-ידי כל עובד עם תחילת עבודתו וכן בתחילת כל שנת מס.
          אם חל שינוי בפרטים יש להצהיר על כך תוך שבוע ימים.
        </div>

        <div className="absolute left-8 right-8 top-[285px]">
          <div className="mb-1 text-right text-[15px] font-black">
            א. פרטי המעביד
          </div>
          <div className="grid grid-cols-[1.5fr_1.2fr_1fr_1fr] border border-black text-center text-[12px]">
            <div className="border-l border-black p-2">שם</div>
            <div className="border-l border-black p-2">כתובת</div>
            <div className="border-l border-black p-2">מספר טלפון</div>
            <div className="p-2">מספר תיק ניכויים</div>
          </div>
        </div>

        <div className="absolute left-8 right-8 top-[365px]">
          <div className="mb-1 text-right text-[15px] font-black">
            ב. פרטי העובד/ת
          </div>
          <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr_1fr] border border-black text-center text-[12px]">
            <div className="border-l border-black p-2">מספר זהות</div>
            <div className="border-l border-black p-2">שם משפחה</div>
            <div className="border-l border-black p-2">שם פרטי</div>
            <div className="border-l border-black p-2">תאריך לידה</div>
            <div className="p-2">תאריך עליה</div>
          </div>

          <div className="grid grid-cols-[1.5fr_.5fr_1fr_1fr] border-x border-b border-black text-center text-[12px]">
            <div className="border-l border-black p-2">רחוב/שכונה</div>
            <div className="border-l border-black p-2">מספר</div>
            <div className="border-l border-black p-2">עיר/ישוב</div>
            <div className="p-2">מיקוד</div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_2fr] border-x border-b border-black text-center text-[12px]">
            <div className="border-l border-black p-2">מספר טלפון</div>
            <div className="border-l border-black p-2">מספר טלפון נייד</div>
            <div className="p-2">כתובת דואר אלקטרוני</div>
          </div>

          <div className="grid grid-cols-5 border-x border-b border-black text-[12px]">
            <div className="border-l border-black p-3">
              <b>מין</b>
              <br />
              ☐ זכר
              <br />
              ☐ נקבה
            </div>
            <div className="border-l border-black p-3">
              <b>מצב משפחתי</b>
              <br />
              ☐ רווק/ה ☐ נשוי/אה
              <br />
              ☐ גרוש/ה ☐ אלמן/ה
            </div>
            <div className="border-l border-black p-3">
              <b>תושב ישראל</b>
              <br />
              ☐ כן
              <br />
              ☐ לא
            </div>
            <div className="border-l border-black p-3">
              <b>קיבוץ / מושב</b>
              <br />
              ☐ כן
              <br />
              ☐ לא
            </div>
            <div className="p-3">
              <b>קופת חולים</b>
              <br />
              ☐ לא
              <br />
              ☐ כן, שם הקופה ______
            </div>
          </div>
        </div>

        <div className="absolute left-8 right-8 top-[560px] grid grid-cols-[1.1fr_1fr] gap-4">
          <div>
            <div className="mb-1 text-right text-[15px] font-black">
              ד. פרטים על הכנסותיי ממעביד זה
            </div>
            <div className="h-[170px] border border-black p-3 text-[12px] leading-6">
              ☐ משכורת חודש
              <br />
              ☐ משכורת בעד משרה נוספת
              <br />
              ☐ משכורת חלקית
              <br />
              ☐ שכר עבודה
              <br />
              ☐ קצבה
              <br />
              ☐ מלגה
              <div className="mt-2 border-t border-black pt-2">
                תאריך תחילת העבודה בשנת המס: __ / __ / ____
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-right text-[15px] font-black">
              ג. פרטים על ילדיי
            </div>
            <div className="h-[280px] border border-black">
              <div className="grid grid-cols-[.4fr_.4fr_1.2fr_1.2fr_1fr] border-b border-black text-center text-[11px]">
                <div className="border-l border-black p-2">1</div>
                <div className="border-l border-black p-2">2</div>
                <div className="border-l border-black p-2">שם</div>
                <div className="border-l border-black p-2">מספר זהות</div>
                <div className="p-2">תאריך לידה</div>
              </div>
              {Array.from({ length: 9 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[25px] border-b border-black/50"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-28 left-8 right-[420px]">
          <div className="mb-1 text-right text-[15px] font-black">
            ה. פרטים על הכנסות אחרות
          </div>
          <div className="h-[210px] border border-black p-3 text-[12px] leading-6">
            ☐ אין לי הכנסות אחרות לרבות מלגות
            <br />
            ☐ יש לי הכנסות אחרות כמפורט להלן
            <br />
            ☐ משכורת חודש ☐ משרה נוספת ☐ שכר עבודה
            <br />
            ☐ קצבה ☐ מלגה ☐ מקור אחר
          </div>
        </div>

        <div className="absolute bottom-6 left-8 right-8">
          <div className="mb-1 text-right text-[15px] font-black">
            ו. פרטים על בן/בת הזוג
          </div>
          <div className="grid grid-cols-5 border border-black text-center text-[12px]">
            <div className="border-l border-black p-2">מספר זהות</div>
            <div className="border-l border-black p-2">שם משפחה</div>
            <div className="border-l border-black p-2">שם פרטי</div>
            <div className="border-l border-black p-2">תאריך לידה</div>
            <div className="p-2">תאריך עליה</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-white text-black">
      <div className="absolute right-8 top-8 text-sm font-black">101</div>
      <div className="absolute right-20 top-8 text-xs">דף 2 מתוך 2</div>

      <div className="absolute left-8 right-8 top-10">
        <div className="border-b border-black pb-2 text-right text-[15px] font-black">
          ח. אני מבקש/ת פטור או זיכוי ממס מהסיבות הבאות
        </div>

        <div className="mt-2 space-y-0 border border-black text-[12px] leading-6">
          {[
            "אני תושב/ת ישראל.",
            "אני נכה 100% / עיוור/ת לצמיתות.",
            "אני תושב/ת קבוע/ה בישוב מזכה.",
            "אני עולה חדש/ה / תושב/ת חוזר/ת.",
            "בגין בן/בת זוגי המתגורר/ת עימי ואין לו/לה הכנסות.",
            "אני הורה במשפחה חד הורית.",
            "בגין ילדיי שבחזקתי.",
            "בגין ילדיי הפעוטים.",
            "אני הורה יחיד לילדיי שבחזקתי.",
            "בגין ילדיי שאינם בחזקתי ואני משתתף/ת בכלכלתם.",
            "אני הורה לילד נטול יכולת.",
            "בגין מזונות לבן/בת זוגי לשעבר.",
            "מלאו לי או לבן/בת זוגי 16 שנים וטרם מלאו 18.",
            "אני חייל/ת משוחרר/ת / שרתתי בשירות לאומי.",
            "בגין סיום לימודים לתואר אקדמי / מקצוע.",
          ].map((row, index) => (
            <div key={row} className="border-b border-black px-3 py-1">
              ☐ {index + 1}. {row}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute left-8 right-8 top-[755px]">
        <div className="mb-1 text-right text-[15px] font-black">
          ט. אני מבקש/ת תיאום מס מהסיבות הבאות
        </div>

        <div className="border border-black p-3 text-[12px] leading-6">
          ☐ לא היתה לי הכנסה מתחילת שנת המס הנוכחית עד לתחילת עבודתי אצל
          מעביד זה.
          <br />
          ☐ יש לי הכנסות נוספות ממשכורת כמפורט להלן:
          <div className="mt-3 grid grid-cols-5 border border-black text-center">
            <div className="border-l border-black p-2">שם</div>
            <div className="border-l border-black p-2">כתובת</div>
            <div className="border-l border-black p-2">מספר תיק ניכויים</div>
            <div className="border-l border-black p-2">הכנסה חודשית</div>
            <div className="p-2">המס שנוכה</div>
          </div>
          <div className="h-[76px] border-x border-b border-black" />
        </div>
      </div>

      <div className="absolute bottom-40 left-8 right-8">
        <div className="mb-1 text-right text-[15px] font-black">
          י. הצהרה
        </div>
        <div className="border border-black p-4 text-[13px] leading-6">
          אני מצהיר/ה כי הפרטים שמסרתי בטופס זה הינם מלאים ונכונים. ידוע לי
          שהשמטה או מסירת פרטים לא נכונים הינה עבירה על פקודת מס הכנסה. אני
          מתחייב/ת להודיע למעביד על כל שינוי שיחול בפרטיי האישיים ובפרטים
          דלעיל תוך שבוע ימים מתאריך השינוי.
          <div className="mt-6 grid grid-cols-2 gap-12">
            <div className="border-t border-black pt-2 text-center">תאריך</div>
            <div className="border-t border-black pt-2 text-center">
              חתימת המבקש/ת
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Form101TemplateBuilderPage() {
  const dragRef = useRef<DragState>(null);
  const [fields, setFields] = useState<FieldItem[]>(getSavedFields);
  const [page, setPage] = useState<FormPage>(1);
  const [selectedSectionKey, setSelectedSectionKey] = useState("taxYear");
  const [selectedKey, setSelectedKey] = useState("taxYear");
  const [showAllFields, setShowAllFields] = useState(false);
  const [showPreviewValues, setShowPreviewValues] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    getInitialOpenSections
  );

  const pageSections = useMemo(
    () => SECTIONS.filter((section) => section.page === page),
    [page]
  );

  const selectedField = useMemo(
    () => fields.find((field) => field.key === selectedKey) || fields[0],
    [fields, selectedKey]
  );

  const selectedSection = useMemo(
    () =>
      SECTIONS.find((section) => section.key === selectedSectionKey) ||
      SECTIONS[0],
    [selectedSectionKey]
  );

  const currentSectionFields = useMemo(() => {
    return fields.filter(
      (field) =>
        field.page === page &&
        (showAllFields || field.sectionKey === selectedSectionKey)
    );
  }, [fields, page, selectedSectionKey, showAllFields]);

  const visibleFields = useMemo(() => {
    return currentSectionFields;
  }, [currentSectionFields]);

  function updateField(key: string, patch: Partial<FieldItem>) {
    setFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, ...patch } : field))
    );
  }

  function startDrag(
    event: React.PointerEvent<HTMLButtonElement>,
    field: FieldItem
  ) {
    const pageEl = document.getElementById("form101-template-page");

    if (!pageEl) return;

    const rect = pageEl.getBoundingClientRect();

    dragRef.current = {
      key: field.key,
      offsetX: event.clientX - rect.left - field.x,
      offsetY: event.clientY - rect.top - field.y,
    };

    setSelectedKey(field.key);
    setSelectedSectionKey(field.sectionKey);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const pageEl = document.getElementById("form101-template-page");

    if (!drag || !pageEl) return;

    const rect = pageEl.getBoundingClientRect();

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

  function saveFields() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fields, null, 2));
    alert("התבנית נשמרה בדפדפן");
  }

  function resetFields() {
    if (!confirm("לאפס את כל השדות?")) return;

    localStorage.removeItem(STORAGE_KEY);
    setFields(INITIAL_FIELDS);
    setSelectedKey("taxYear");
    setSelectedSectionKey("taxYear");
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

  function addField() {
    const count = fields.length + 1;
    const key = `customField${count}`;

    const field: FieldItem = {
      key,
      label: `שדה חדש ${count}`,
      sectionKey: selectedSectionKey,
      page,
      x: 120,
      y: 120,
      width: 140,
      height: 28,
      type: "text",
      sample: "",
      fontSize: 14,
      align: "right",
    };

    setFields((prev) => [...prev, field]);
    setSelectedKey(key);
  }

  function removeSelectedField() {
    if (!selectedField) return;

    if (!selectedField.key.startsWith("customField")) {
      alert("אפשר למחוק רק שדות שהוספת ידנית");
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

        if (event.key === "ArrowUp") nudge(0, -1);
        if (event.key === "ArrowDown") nudge(0, 1);
        if (event.key === "ArrowRight") nudge(1, 0);
        if (event.key === "ArrowLeft") nudge(-1, 0);
      }}
      className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 text-slate-900"
    >
      <div className="mx-auto max-w-[1800px] space-y-5 p-5">
        <section className="rounded-[32px] border border-white/80 bg-white/95 p-5 shadow-[0_18px_60px_rgba(79,70,229,0.10)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
                יצירת תבנית טופס 101
              </div>

              <h1 className="mt-4 text-3xl font-black md:text-4xl">
                טופס 101 HTML חלק ונקי
              </h1>

              <p className="mt-2 max-w-4xl text-sm font-semibold leading-7 text-slate-500">
                זה לא PDF סרוק ולא Canvas. זה טופס HTML נקי כמו ההסכמים. בחרי
                סעיף לפי סדר הטופס, גררי שדות, מלאי ערכי בדיקה, ובמספרים שלטי
                במרווח ספרות כדי שכל ספרה תיכנס בקובייה.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setSelectedSectionKey("taxYear");
                }}
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
                onClick={() => {
                  setPage(2);
                  setSelectedSectionKey("credits");
                }}
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
                onClick={() => setShowAllFields((prev) => !prev)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
              >
                {showAllFields ? "הצג רק סעיף נבחר" : "הצג כל השדות בעמוד"}
              </button>

              <button
                type="button"
                onClick={() => setShowPreviewValues((prev) => !prev)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
              >
                {showPreviewValues ? "הסתר ערכי בדיקה" : "הצג ערכי בדיקה"}
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
                onClick={resetFields}
                className="h-11 rounded-2xl bg-rose-50 px-5 text-sm font-black text-rose-700"
              >
                איפוס
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[330px_1fr_390px]">
          <aside className="rounded-[30px] border border-white/80 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-black">סעיפי הטופס</h2>

            <div className="mt-4 space-y-2">
              {pageSections.map((section) => {
                const isSelected = selectedSectionKey === section.key;
                const sectionFields = fields.filter(
                  (field) =>
                    field.page === page && field.sectionKey === section.key
                );

                return (
                  <div key={section.key} className="rounded-2xl border">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSectionKey(section.key);
                        setOpenSections((prev) => ({
                          ...prev,
                          [section.key]: !prev[section.key],
                        }));

                        const first = sectionFields[0];

                        if (first) {
                          setSelectedKey(first.key);
                        }
                      }}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-right text-sm font-black ${
                        isSelected
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-white text-slate-700"
                      }`}
                    >
                      <span>{section.title}</span>
                      <span className="text-xs text-slate-400">
                        {section.optional ? "אופציונלי" : "חובה"}
                      </span>
                    </button>

                    {openSections[section.key] && (
                      <div className="space-y-1 border-t border-slate-100 p-2">
                        {sectionFields.map((field) => (
                          <button
                            key={field.key}
                            type="button"
                            onClick={() => {
                              setSelectedSectionKey(section.key);
                              setSelectedKey(field.key);
                            }}
                            className={`w-full rounded-xl px-3 py-2 text-right text-xs font-bold ${
                              selectedKey === field.key
                                ? "bg-violet-50 text-violet-700"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            {field.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="overflow-auto rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <div
              id="form101-template-page"
              className="relative mx-auto overflow-hidden bg-white shadow-2xl ring-1 ring-slate-200"
              style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
              onPointerMove={moveDrag}
              onPointerUp={stopDrag}
              onPointerCancel={stopDrag}
              onPointerLeave={stopDrag}
            >
              <TemplatePageBackground page={page} />

              {visibleFields.map((field) => {
                const selected = selectedKey === field.key;

                return (
                  <button
                    key={field.key}
                    type="button"
                    onPointerDown={(event) => startDrag(event, field)}
                    onClick={() => {
                      setSelectedKey(field.key);
                      setSelectedSectionKey(field.sectionKey);
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
                      {renderFieldValue(field, showPreviewValues)}

                      <span className="absolute -top-6 right-0 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-black text-white">
                        {field.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
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
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {selectedSection?.title}
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
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold disabled:bg-slate-100 disabled:text-slate-300"
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

                  <label className="text-xs font-black text-slate-500">
                    חובה
                    <select
                      value={selectedField.required ? "yes" : "no"}
                      onChange={(event) =>
                        updateField(selectedField.key, {
                          required: event.target.value === "yes",
                        })
                      }
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
                    >
                      <option value="yes">כן</option>
                      <option value="no">לא</option>
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
                  onClick={removeSelectedField}
                  className="w-full rounded-2xl bg-rose-50 py-3 text-sm font-black text-rose-700"
                >
                  מחיקת שדה חדש
                </button>
              </div>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}