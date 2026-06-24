"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export const dynamic = "force-dynamic";

type PageNumber = 1 | 2;
type FieldType = "text" | "digits" | "check" | "signature";
type TextAlign = "right" | "left" | "center";
type DigitSpacingMode = "equal" | "group" | "custom";
type DigitGroupSizeMode = "auto" | "manual";

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
  digitSpacingMode?: DigitSpacingMode;
  digitGaps?: number[]; // legacy only
  digitGroupSize?: number;
  digitGroupSizeMode?: DigitGroupSizeMode;
  digitGroupGap?: number;
  maxDigits?: number;
  align?: TextAlign;
  order: number;
  enabled: boolean;
  isFixed?: boolean;
  fixedValue?: string;
};

type DragState = {
  key: string;
  keys: string[];
  startClientX: number;
  startClientY: number;
  originalPositions: Record<string, { x: number; y: number }>;
} | null;

const PDF_URL = "/forms/tofes-101.pdf";

const STORAGE_KEY = "invistimo_form101_original_pdf_mapper_v4";
const APPROVED_STORAGE_KEY =
  "invistimo_form101_original_pdf_mapper_approved_v1";
const TEMPLATE_API_URL = "/api/admin/forms/101/template";

const PAGE_WIDTH = 900;
const PAGE_HEIGHT = 1280;
const DEFAULT_GLOBAL_DIGIT_GAP = 13;

const CHILDREN_ROW_COUNT = 13;
const DEFAULT_CHILDREN_FIRST_ROW_Y = 685;
const DEFAULT_CHILDREN_ROW_GAP = 35;

const CHILDREN_ROW_FIELD_DEFS = [
  {
    suffix: "Mark1",
    label: "סימון 1",
    x: 745,
    width: 18,
    height: 18,
    type: "check" as FieldType,
    fontSize: 16,
    align: "center" as TextAlign,
  },
  {
    suffix: "Mark2",
    label: "סימון 2",
    x: 720,
    width: 18,
    height: 18,
    type: "check" as FieldType,
    fontSize: 16,
    align: "center" as TextAlign,
  },
  {
    suffix: "Name",
    label: "שם",
    x: 540,
    width: 95,
    height: 22,
    type: "text" as FieldType,
    fontSize: 14,
    align: "center" as TextAlign,
  },
  {
    suffix: "Id",
    label: "ת.ז",
    x: 405,
    width: 110,
    height: 22,
    type: "digits" as FieldType,
    fontSize: 14,
    align: "left" as TextAlign,
    maxDigits: 9,
  },
  {
    suffix: "BirthDate",
    label: "תאריך לידה",
    x: 285,
    width: 100,
    height: 22,
    type: "digits" as FieldType,
    fontSize: 14,
    align: "left" as TextAlign,
    maxDigits: 8,
  },
] as const;

type ChildSuffix = (typeof CHILDREN_ROW_FIELD_DEFS)[number]["suffix"];

function parseChildFieldKeyOutside(key: string) {
  const match = key.match(/^child(\d+)(Name|Id|BirthDate|Mark1|Mark2)$/);

  if (!match) return null;

  return {
    row: Number(match[1]),
    suffix: match[2] as ChildSuffix,
  };
}

function getChildDefinition(suffix: string) {
  return CHILDREN_ROW_FIELD_DEFS.find(
    (definition) => definition.suffix === suffix,
  );
}

function getChildFieldLabelBySuffix(row: number, suffix: string) {
  const definition = getChildDefinition(suffix);
  return definition ? `ילד ${row} ${definition.label}` : `ילד ${row}`;
}

function getDetectedChildrenRowGap(childMap: Map<string, FieldItem>) {
  const rows = Array.from(childMap.values())
    .map((field) => {
      const parsed = parseChildFieldKeyOutside(field.key);
      return parsed ? { row: parsed.row, y: field.y } : null;
    })
    .filter(Boolean) as Array<{ row: number; y: number }>;

  const byRow = new Map<number, number>();

  rows.forEach((item) => {
    if (!byRow.has(item.row)) byRow.set(item.row, item.y);
  });

  const ordered = Array.from(byRow.entries()).sort((a, b) => a[0] - b[0]);
  const gaps: number[] = [];

  for (let index = 1; index < ordered.length; index += 1) {
    const gap = ordered[index][1] - ordered[index - 1][1];
    if (gap > 0 && Number.isFinite(gap)) gaps.push(gap);
  }

  if (!gaps.length) return DEFAULT_CHILDREN_ROW_GAP;

  return Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length);
}

function buildDefaultChildField(
  row: number,
  suffix: ChildSuffix,
  order: number,
  childMap: Map<string, FieldItem>,
): FieldItem {
  const definition = getChildDefinition(suffix)!;
  const sameSuffixFields = Array.from(childMap.values())
    .map((field) => ({ field, parsed: parseChildFieldKeyOutside(field.key) }))
    .filter((item) => item.parsed?.suffix === suffix) as Array<{
    field: FieldItem;
    parsed: { row: number; suffix: ChildSuffix };
  }>;

  const reference =
    childMap.get(`1:${suffix}`) ||
    sameSuffixFields.sort((a, b) => a.parsed.row - b.parsed.row)[0]?.field;

  const referenceParsed = reference
    ? parseChildFieldKeyOutside(reference.key)
    : null;
  const rowGap = getDetectedChildrenRowGap(childMap);

  const x = reference?.x ?? definition.x;
  const y = reference
    ? reference.y + (row - (referenceParsed?.row || 1)) * rowGap
    : DEFAULT_CHILDREN_FIRST_ROW_Y + (row - 1) * DEFAULT_CHILDREN_ROW_GAP;

  return {
    key: `child${row}${suffix}`,
    label: getChildFieldLabelBySuffix(row, suffix),
    section: "children",
    page: 1,
    x,
    y,
    width: reference?.width ?? definition.width,
    height: reference?.height ?? definition.height,
    type: definition.type,
    sample: definition.type === "check" ? "✓" : "",
    fontSize: reference?.fontSize ?? definition.fontSize,
    digitGap:
      definition.type === "digits"
        ? (reference?.digitGap ?? DEFAULT_GLOBAL_DIGIT_GAP)
        : undefined,
    digitSpacingMode:
      definition.type === "digits"
        ? (reference?.digitSpacingMode ?? "equal")
        : undefined,
    digitGaps: Array.isArray(reference?.digitGaps) ? reference?.digitGaps : [],
    digitGroupSize:
      definition.type === "digits"
        ? (reference?.digitGroupSize ?? 3)
        : undefined,
    digitGroupSizeMode:
      definition.type === "digits"
        ? (reference?.digitGroupSizeMode ?? "manual")
        : undefined,
    digitGroupGap:
      definition.type === "digits"
        ? (reference?.digitGroupGap ?? 0)
        : undefined,
    maxDigits: "maxDigits" in definition ? definition.maxDigits : undefined,
    align: reference?.align ?? definition.align,
    order,
    enabled: true,
    isFixed: false,
    fixedValue: "",
  };
}

function ensure13ChildrenRowsWithoutChangingExistingPositions(
  sourceFields: FieldItem[],
) {
  const sortedFields = [...sourceFields].sort((a, b) => a.order - b.order);
  const existingChildren = sortedFields.filter(
    (field) => field.section === "children",
  );

  const childrenStartOrder = existingChildren.length
    ? Math.min(...existingChildren.map((field) => field.order))
    : 34;

  const beforeChildren = sortedFields.filter(
    (field) => field.section !== "children" && field.order < childrenStartOrder,
  );

  const afterChildren = sortedFields.filter(
    (field) =>
      field.section !== "children" && field.order >= childrenStartOrder,
  );

  const childMap = new Map<string, FieldItem>();

  existingChildren
    .sort((a, b) => a.order - b.order)
    .forEach((field) => {
      const parsed = parseChildFieldKeyOutside(field.key);

      if (!parsed) return;
      if (parsed.row < 1 || parsed.row > CHILDREN_ROW_COUNT) return;

      const mapKey = `${parsed.row}:${parsed.suffix}`;
      if (childMap.has(mapKey)) return;

      childMap.set(mapKey, field);
    });

  let nextOrder = 1;

  const normalizedBefore = beforeChildren.map((field) => ({
    ...field,
    order: nextOrder++,
  }));

  const children: FieldItem[] = [];

  for (let row = 1; row <= CHILDREN_ROW_COUNT; row += 1) {
    CHILDREN_ROW_FIELD_DEFS.forEach((definition) => {
      const existing = childMap.get(`${row}:${definition.suffix}`);

      if (existing) {
        children.push({
          ...existing,
          key: `child${row}${definition.suffix}`,
          label: getChildFieldLabelBySuffix(row, definition.suffix),
          section: "children",
          page: 1,
          order: nextOrder++,
          enabled:
            typeof existing.enabled === "boolean" ? existing.enabled : true,
          isFixed: false,
          fixedValue: "",
        });
        return;
      }

      children.push(
        buildDefaultChildField(row, definition.suffix, nextOrder++, childMap),
      );
    });
  }

  const normalizedAfter = afterChildren.map((field) => ({
    ...field,
    order: nextOrder++,
  }));

  return [...normalizedBefore, ...children, ...normalizedAfter];
}

function buildInitialChildrenFields(startOrder = 34) {
  const emptyMap = new Map<string, FieldItem>();
  const rows: FieldItem[] = [];
  let nextOrder = startOrder;

  for (let row = 1; row <= CHILDREN_ROW_COUNT; row += 1) {
    CHILDREN_ROW_FIELD_DEFS.forEach((definition) => {
      rows.push(
        buildDefaultChildField(row, definition.suffix, nextOrder++, emptyMap),
      );
    });
  }

  return rows;
}

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
    key: "phone",
    label: "טלפון",
    section: "employee",
    page: 1,
    x: 230,
    y: 313,
    width: 150,
    height: 24,
    type: "digits",
    sample: "048447508",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    digitSpacingMode: "group",
    digitGroupSizeMode: "auto",
    digitGroupSize: 2,
    digitGroupGap: 20,
    maxDigits: 10,
    align: "center",
  },

  {
    key: "mobile",
    label: "נייד",
    section: "employee",
    page: 1,
    x: 90,
    y: 313,
    width: 150,
    height: 24,
    type: "digits",
    sample: "0501234567",
    fontSize: 15,
    digitGap: DEFAULT_GLOBAL_DIGIT_GAP,
    digitSpacingMode: "group",
    digitGroupSizeMode: "auto",
    digitGroupSize: 3,
    digitGroupGap: 20,
    maxDigits: 10,
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

  ...buildInitialChildrenFields(),

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
    digitSpacingMode:
      field.digitSpacingMode === "group" || field.digitSpacingMode === "custom"
        ? "group"
        : "equal",
    digitGaps: Array.isArray(field.digitGaps)
      ? field.digitGaps
          .map((gap) => Math.max(1, Number(gap) || DEFAULT_GLOBAL_DIGIT_GAP))
          .filter((gap) => Number.isFinite(gap))
      : [],
    digitGroupSize: Math.max(1, Number(field.digitGroupSize || 3)),
    digitGroupSizeMode:
      field.digitGroupSizeMode === "manual" ? "manual" : "auto",
    digitGroupGap: Math.max(0, Number(field.digitGroupGap || 20)),
  })) as FieldItem[];
}

const INITIAL_FIELDS = ensure13ChildrenRowsWithoutChangingExistingPositions(
  normalizeFields(INITIAL_FIELDS_RAW),
);

function loadFields() {
  if (typeof window === "undefined") return INITIAL_FIELDS;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_FIELDS;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed)
      ? ensure13ChildrenRowsWithoutChangingExistingPositions(
          normalizeFields(parsed),
        )
      : INITIAL_FIELDS;
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

function getBaseDigitCellWidth(field: FieldItem) {
  return Math.max(1, Number(field.digitGap || DEFAULT_GLOBAL_DIGIT_GAP));
}

function getAutoDigitGroupSize(value: unknown, fallback: number) {
  const digits = onlyDigits(value);

  if (!digits) return fallback;

  if (digits.startsWith("05")) return 3;
  if (digits.startsWith("077") || digits.startsWith("073")) return 3;
  if (digits.length === 10) return 3;

  if (
    digits.length === 9 &&
    (digits.startsWith("02") ||
      digits.startsWith("03") ||
      digits.startsWith("04") ||
      digits.startsWith("08") ||
      digits.startsWith("09"))
  ) {
    return 2;
  }

  return fallback;
}

function getResolvedDigitGroupSize(field: FieldItem, value: unknown) {
  const fallback = Math.max(1, Number(field.digitGroupSize || 3));

  if (field.digitGroupSizeMode === "manual") {
    return fallback;
  }

  return getAutoDigitGroupSize(value, fallback);
}

function getGroupGapAfterDigit(
  field: FieldItem,
  index: number,
  value: unknown,
) {
  if (field.digitSpacingMode !== "group") return 0;

  const groupSize = getResolvedDigitGroupSize(field, value);
  if (index !== groupSize - 1) return 0;

  return Math.max(0, Number(field.digitGroupGap || 0));
}

function getDigitTotalWidth(
  field: FieldItem,
  digitsLength: number,
  value: unknown,
) {
  if (digitsLength <= 0) return 0;

  let total = 0;

  for (let index = 0; index < digitsLength; index += 1) {
    total += getBaseDigitCellWidth(field);
    total += getGroupGapAfterDigit(field, index, value);
  }

  return total;
}

function justifyFromAlign(align?: TextAlign) {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
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

  const displayValue = field.isFixed
    ? field.fixedValue || field.sample
    : field.sample;

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
          justifyContent: justifyFromAlign(field.align),
          fontSize: field.fontSize,
          lineHeight: `${field.height}px`,
        }}
      >
        {sliced.split("").map((digit, index) => (
          <span
            key={`${field.key}-${index}`}
            className="inline-block text-center font-semibold"
            style={{
              width: getBaseDigitCellWidth(field),
              marginRight: getGroupGapAfterDigit(field, index, sliced),
            }}
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
    digitSpacingMode: field.digitSpacingMode || "equal",
    digitGaps: Array.isArray(field.digitGaps) ? field.digitGaps : [],
    digitGroupSize: field.digitGroupSize || null,
    digitGroupSizeMode: field.digitGroupSizeMode || "auto",
    digitGroupGap: field.digitGroupGap || null,
    maxDigits: field.maxDigits || null,
    align: field.align || "right",
  };
}

function fieldsToMap(fields: FieldItem[]) {
  return fields
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
      digitSpacingMode:
        value?.digitSpacingMode === "group" ||
        value?.digitSpacingMode === "custom"
          ? "group"
          : "equal",
      digitGaps: Array.isArray(value?.digitGaps)
        ? value.digitGaps
            .map((gap: any) =>
              Math.max(1, Number(gap) || DEFAULT_GLOBAL_DIGIT_GAP),
            )
            .filter((gap: any) => Number.isFinite(gap))
        : Array.isArray(base?.digitGaps)
          ? base?.digitGaps
          : [],
      digitGroupSize: Math.max(
        1,
        Number(value?.digitGroupSize ?? base?.digitGroupSize ?? 3),
      ),
      digitGroupSizeMode:
        value?.digitGroupSizeMode === "manual" ? "manual" : "auto",
      digitGroupGap: Math.max(
        0,
        Number(value?.digitGroupGap ?? base?.digitGroupGap ?? 20),
      ),
      maxDigits:
        value?.maxDigits === null || value?.maxDigits === undefined
          ? base?.maxDigits
          : Number(value.maxDigits),
      align:
        value?.align === "left" ||
        value?.align === "center" ||
        value?.align === "right"
          ? value.align
          : base?.align || "right",
      order: Number(value?.order || base?.order || index + 1),
      enabled: typeof value?.enabled === "boolean" ? value.enabled : true,
      isFixed: typeof value?.isFixed === "boolean" ? value.isFixed : false,
      fixedValue: String(value?.fixedValue || ""),
    } as FieldItem;
  });

  if (!fromServer.length) return INITIAL_FIELDS;

  return ensure13ChildrenRowsWithoutChangingExistingPositions(
    normalizeFields(fromServer),
  ).sort((a, b) => a.order - b.order);
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
  const [templateApproved, setTemplateApproved] = useState(loadApproved);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [childrenRowOrdersInput, setChildrenRowOrdersInput] = useState("");
  const [childrenRowGap, setChildrenRowGap] = useState(
    DEFAULT_CHILDREN_ROW_GAP,
  );

  const pageSections = useMemo(
    () => SECTIONS.filter((section) => section.page === page),
    [page],
  );

  const pageFields = useMemo(
    () =>
      fields
        .filter((field) => field.page === page)
        .sort((a, b) => a.order - b.order),
    [fields, page],
  );

  const sectionFields = useMemo(() => {
    return pageFields.filter((field) => field.section === selectedSection);
  }, [pageFields, selectedSection]);

  const visibleFields = useMemo(() => {
    const allowed = sectionFields.filter(
      (field) => field.enabled || showDisabledFields,
    );

    if (showAllFields) return allowed;

    return allowed.filter((field) => field.key === selectedKey);
  }, [sectionFields, selectedKey, showAllFields, showDisabledFields]);

  const selectedField = useMemo(
    () => fields.find((field) => field.key === selectedKey) || fields[0],
    [fields, selectedKey],
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
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(serverFields, null, 2),
        );

        const approved = Boolean(template?.approvedAt || template?.updatedAt);
        setTemplateApproved(approved);
        localStorage.setItem(APPROVED_STORAGE_KEY, approved ? "true" : "false");

        const firstField =
          serverFields.find((field) => field.enabled) || serverFields[0];

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
      prev.map((field) => (field.key === key ? { ...field, ...patch } : field)),
    );
  }

  function updateSelectedDigitGap(key: string, value: number) {
    const safeValue = Math.max(1, Number(value) || DEFAULT_GLOBAL_DIGIT_GAP);

    markTemplateChanged();

    setFields((prev) =>
      prev.map((field) =>
        field.key === key
          ? {
              ...field,
              digitGap: safeValue,
            }
          : field,
      ),
    );
  }

  function updateSelectedDigitSpacingMode(
    key: string,
    value: DigitSpacingMode,
  ) {
    updateField(key, {
      digitSpacingMode: value,
    });
  }

  function updateSelectedDigitGroupSizeMode(key: string, value: string) {
    if (value === "auto") {
      updateField(key, {
        digitGroupSizeMode: "auto",
      });
      return;
    }

    updateField(key, {
      digitGroupSizeMode: "manual",
      digitGroupSize: Math.max(1, Number(value) || 3),
    });
  }

  function updateSelectedDigitGroupSize(key: string, value: number) {
    updateField(key, {
      digitGroupSizeMode: "manual",
      digitGroupSize: Math.max(1, Number(value) || 3),
    });
  }

  function updateSelectedDigitGroupGap(key: string, value: number) {
    updateField(key, {
      digitGroupGap: Math.max(0, Number(value) || 0),
    });
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
          field.page === current.page && field.section === current.section,
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
      }),
    );
  }

  function parseChildFieldKey(key: string) {
    const match = key.match(/^child(\d+)(Name|Id|BirthDate|Mark1|Mark2)$/);

    if (!match) return null;

    return {
      row: Number(match[1]),
      suffix: match[2],
    };
  }

  function getChildFieldLabel(row: number, suffix: string) {
    if (suffix === "Name") return `ילד ${row} שם`;
    if (suffix === "Id") return `ילד ${row} ת.ז`;
    if (suffix === "BirthDate") return `ילד ${row} תאריך לידה`;
    if (suffix === "Mark1") return `ילד ${row} סימון 1`;
    if (suffix === "Mark2") return `ילד ${row} סימון 2`;

    return `ילד ${row}`;
  }

  function getSelectedChildRowNumber() {
    const parsed = selectedField ? parseChildFieldKey(selectedField.key) : null;

    return parsed?.row || null;
  }

  function getChildRowFields(row: number, sourceFields = fields) {
    return sourceFields
      .filter((field) => parseChildFieldKey(field.key)?.row === row)
      .sort((a, b) => a.order - b.order);
  }

  function getChildRowKeys(row: number, sourceFields = fields) {
    return getChildRowFields(row, sourceFields).map((field) => field.key);
  }

  function getDragGroupKeys(field: FieldItem) {
    const parsed = parseChildFieldKey(field.key);

    if (!parsed) return [field.key];

    const rowKeys = getChildRowKeys(parsed.row);
    return rowKeys.length ? rowKeys : [field.key];
  }

  function isFieldInSelectedChildRow(field: FieldItem) {
    const selectedRow = getSelectedChildRowNumber();
    if (!selectedRow) return false;

    return parseChildFieldKey(field.key)?.row === selectedRow;
  }

  function startDrag(
    event: React.PointerEvent<HTMLButtonElement>,
    field: FieldItem,
  ) {
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const keys = getDragGroupKeys(field);
    const originalPositions = fields.reduce<
      Record<string, { x: number; y: number }>
    >((acc, item) => {
      if (keys.includes(item.key)) {
        acc[item.key] = { x: item.x, y: item.y };
      }

      return acc;
    }, {});

    dragRef.current = {
      key: field.key,
      keys,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originalPositions,
    };

    setSelectedKey(field.key);
    setSelectedSection(field.section);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag) return;

    const dx = Math.round(event.clientX - drag.startClientX);
    const dy = Math.round(event.clientY - drag.startClientY);

    markTemplateChanged();

    setFields((prev) =>
      prev.map((field) => {
        const original = drag.originalPositions[field.key];

        if (!original) return field;

        return {
          ...field,
          x: Math.round(Math.max(0, Math.min(PAGE_WIDTH, original.x + dx))),
          y: Math.round(Math.max(0, Math.min(PAGE_HEIGHT, original.y + dy))),
        };
      }),
    );
  }

  function stopDrag() {
    dragRef.current = null;
  }

  function nudge(dx: number, dy: number) {
    if (!selectedField) return;

    const keys = getDragGroupKeys(selectedField);

    markTemplateChanged();

    setFields((prev) =>
      prev.map((field) =>
        keys.includes(field.key)
          ? {
              ...field,
              x: field.x + dx,
              y: field.y + dy,
            }
          : field,
      ),
    );
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
    setShowAllFields(false);
    setTemplateApproved(false);
    setPdfReloadKey((prev) => prev + 1);
  }

  async function copyConst() {
    const map = fields
      .sort((a, b) => a.order - b.order)
      .reduce<Record<string, any>>((acc, field) => {
        acc[field.key] = fieldToMap(field);
        return acc;
      }, {});

    await navigator.clipboard.writeText(
      `const FORM101_FIELD_MAP = ${JSON.stringify(map, null, 2)} as const;`,
    );

    alert("הועתקו כל השדות כולל כבויים ושדות קבועים");
  }

  function addField() {
    const sectionMaxOrder = fields
      .filter(
        (field) => field.page === page && field.section === selectedSection,
      )
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

  function selectFallbackField(nextFields: FieldItem[]) {
    const fallback =
      nextFields.find((field) => field.page === page && field.enabled) ||
      nextFields.find((field) => field.enabled) ||
      nextFields[0];

    if (!fallback) return;

    setSelectedKey(fallback.key);
    setSelectedSection(fallback.section);
    setPage(fallback.page);
  }

  function deleteFieldPermanently() {
    if (!selectedField) return;

    if (
      !confirm(
        `למחוק את השדה "${selectedField.label}" מהתבנית?
אפשר להחזיר רק דרך איפוס תבנית.`,
      )
    ) {
      return;
    }

    markTemplateChanged();

    setFields((prev) => {
      const next = prev.filter((field) => field.key !== selectedField.key);
      selectFallbackField(next);
      return next;
    });

    setShowAllFields(false);
  }

  function deleteOrDisableField() {
    if (!selectedField) return;

    setFieldEnabled(selectedField.key, false);
    setShowAllFields(false);
  }

  function deleteCurrentSectionPermanently() {
    const currentSection = SECTIONS.find(
      (section) => section.key === selectedSection && section.page === page,
    );

    const sectionLabel = currentSection?.title || selectedSection;

    const fieldsInSection = fields.filter(
      (field) => field.page === page && field.section === selectedSection,
    );

    if (!fieldsInSection.length) {
      alert("אין שדות למחיקה בסעיף הנבחר");
      return;
    }

    const confirmText = `למחוק את כל ${fieldsInSection.length} השדות בסעיף "${sectionLabel}"?

הפעולה מוחקת את השדות מהתבנית. אפשר להחזיר רק דרך איפוס תבנית או הוספה מחדש.`;

    if (!confirm(confirmText)) return;

    markTemplateChanged();

    setFields((prev) => {
      const next = prev.filter(
        (field) => !(field.page === page && field.section === selectedSection),
      );

      selectFallbackField(next);
      return next;
    });

    setShowAllFields(false);
  }

  function parseChildRowOrdersInput(value: string) {
    return value
      .split(/[,\s|]+/)
      .map((item) => Number(item.trim()))
      .filter((num) => Number.isFinite(num) && num > 0)
      .map((num) => Math.round(num));
  }

  function getSelectedRowFieldsFromInput() {
    const orders = parseChildRowOrdersInput(childrenRowOrdersInput);

    if (orders.length) {
      const byOrder = fields
        .filter(
          (field) =>
            field.page === page &&
            field.section === "children" &&
            orders.includes(field.order),
        )
        .sort((a, b) => orders.indexOf(a.order) - orders.indexOf(b.order));

      return byOrder;
    }

    const selectedRow = getSelectedChildRowNumber();

    if (selectedRow) {
      return getChildRowFields(selectedRow);
    }

    return [];
  }

  function inferChildSuffix(field: FieldItem, index: number) {
    const parsed = parseChildFieldKey(field.key);
    if (parsed?.suffix) return parsed.suffix;

    if (field.label.includes("שם")) return "Name";
    if (field.label.includes("ת.ז") || field.label.includes("זהות"))
      return "Id";
    if (field.label.includes("לידה") || field.label.includes("תאריך"))
      return "BirthDate";

    if (field.type === "check") {
      return index === 3 ? "Mark1" : "Mark2";
    }

    const fallbackByIndex = ["Name", "Id", "BirthDate", "Mark1", "Mark2"];
    return fallbackByIndex[index] || `Custom${index + 1}`;
  }

  function getNextChildRowNumber() {
    const maxRow = fields.reduce((max, field) => {
      const parsed = parseChildFieldKey(field.key);
      return parsed ? Math.max(max, parsed.row) : max;
    }, 0);

    return maxRow + 1;
  }

  function fillChildRowOrdersFromSelectedRow() {
    const selectedRow = getSelectedChildRowNumber();

    if (!selectedRow) {
      alert("צריך לבחור שדה מתוך שורת ילד קיימת");
      return;
    }

    const rowFields = getChildRowFields(selectedRow);

    if (!rowFields.length) {
      alert("לא נמצאו שדות לשורת הילד הנבחרת");
      return;
    }

    setChildrenRowOrdersInput(rowFields.map((field) => field.order).join(","));
  }

  function duplicateSelectedChildrenRowToNext() {
    const sourceFields = getSelectedRowFieldsFromInput();

    if (!sourceFields.length) {
      alert("צריך להכניס מספרי שדות של השורה, למשל: 34,35,36,37,38");
      return;
    }

    if (sourceFields.length < 2) {
      alert("צריך לבחור לפחות שני שדות לשכפול שורה");
      return;
    }

    const targetRow = getNextChildRowNumber();
    const rowGap = Math.max(1, Number(childrenRowGap) || 32);
    const maxOrder = fields.reduce(
      (max, field) => Math.max(max, field.order),
      0,
    );

    const sourceSummary = sourceFields
      .map((field) => `${field.order} - ${field.label}`)
      .join("\n");

    if (
      !confirm(
        `לשכפל את השדות הבאים לילד ${targetRow}?\n\n${sourceSummary}\n\nהשורה החדשה תיווצר ${rowGap}px מתחת, ואז אפשר לגרור אותה יחד למיקום הנכון.`,
      )
    ) {
      return;
    }

    const newFields = sourceFields.map((sourceField, index) => {
      const suffix = inferChildSuffix(sourceField, index);
      const key = `child${targetRow}${suffix}`;

      return {
        ...sourceField,
        key,
        label: getChildFieldLabel(targetRow, suffix),
        y: sourceField.y + rowGap,
        order: maxOrder + index + 1,
        sample: "",
        fixedValue: "",
        isFixed: false,
        enabled: true,
      };
    });

    markTemplateChanged();

    setFields((prev) =>
      [...prev, ...newFields].sort((a, b) => a.order - b.order),
    );

    const firstNewField = newFields[0];
    setSelectedKey(firstNewField.key);
    setSelectedSection("children");
    setPage(firstNewField.page);
    setShowAllFields(true);
    setChildrenRowOrdersInput(
      newFields.map((field) => String(field.order)).join(","),
    );
  }

  function completeChildrenRowsTo13() {
    markTemplateChanged();

    setFields((prev) =>
      ensure13ChildrenRowsWithoutChangingExistingPositions(prev),
    );
    setPage(1);
    setSelectedSection("children");
    setSelectedKey("child1Mark1");
    setShowAllFields(true);
    setChildrenRowOrdersInput("");
  }

  function deleteSelectedChildRow() {
    const selectedRow = getSelectedChildRowNumber();

    if (!selectedRow) {
      alert("צריך לבחור שדה מתוך שורת ילד קיימת");
      return;
    }

    const rowFields = getChildRowFields(selectedRow);

    if (!rowFields.length) {
      alert("לא נמצאו שדות למחיקה בשורת הילד הנבחרת");
      return;
    }

    if (
      !confirm(`למחוק את כל ${rowFields.length} השדות של ילד ${selectedRow}?`)
    ) {
      return;
    }

    const keysToDelete = new Set(rowFields.map((field) => field.key));

    markTemplateChanged();

    setFields((prev) => {
      const next = prev.filter((field) => !keysToDelete.has(field.key));
      selectFallbackField(next);
      return next;
    });

    setShowAllFields(true);
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

              <button
                type="button"
                onClick={addField}
                className="h-11 rounded-2xl bg-sky-600 px-5 text-sm font-black text-white"
              >
                הוספת שדה
              </button>

              <button
                type="button"
                onClick={completeChildrenRowsTo13}
                className="h-11 rounded-2xl bg-amber-500 px-5 text-sm font-black text-white"
              >
                השלמת 13 שורות ילדים
              </button>

              <button
                type="button"
                onClick={deleteCurrentSectionPermanently}
                className="h-11 rounded-2xl bg-red-600 px-5 text-sm font-black text-white"
              >
                מחיקת כל שדות הסעיף
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
                            (field.enabled || showDisabledFields),
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
                          ערך:{" "}
                          {field.isFixed
                            ? field.fixedValue || "ריק"
                            : field.sample || "ריק"}
                        </div>

                        <div
                          className={`mt-1 text-xs font-black ${
                            field.enabled ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {field.enabled ? "פעיל" : "כבוי"} ·{" "}
                          {field.isFixed ? "קבוע לכל העובדים" : "העובד ממלא"}
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
                      ערך:{" "}
                      {selectedField.isFixed
                        ? selectedField.fixedValue || "ריק"
                        : selectedField.sample || "ריק"}
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
                        selectedField.isFixed
                          ? "text-indigo-700"
                          : "text-slate-600"
                      }`}
                    >
                      מילוי:{" "}
                      {selectedField.isFixed
                        ? "קבוע לכל העובדים"
                        : "העובד ממלא"}
                    </div>
                  </div>
                </div>

                {selectedField.section === "children" && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-black text-amber-800">
                      13 שורות ילדים בלי נעילת מיקום
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-amber-700">
                      המערכת רק דואגת שיהיו 13 שורות עם 5 שדות בכל שורה: סימון
                      1, סימון 2, שם, ת.ז, תאריך לידה. היא לא מאפסת מיקומים שכבר
                      הגדרת ולא מאפסת מרווחי ספרות. כל שורה אפשר למקם ידנית,
                      וגרירה של שדה מתוך שורת ילד מזיזה את כל השורה יחד.
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={completeChildrenRowsTo13}
                        className="rounded-2xl bg-amber-600 py-3 text-sm font-black text-white"
                      >
                        השלם ל-13 שורות
                      </button>

                      <button
                        type="button"
                        onClick={deleteSelectedChildRow}
                        className="rounded-2xl bg-red-600 py-3 text-sm font-black text-white"
                      >
                        מחק שורת ילד
                      </button>
                    </div>
                  </div>
                )}

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
                          Number(event.target.value),
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
                          event.target.value === "yes",
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
                              ? selectedField.fixedValue ||
                                selectedField.sample ||
                                ""
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
                    מבנה ספרות
                    <select
                      value={selectedField.digitSpacingMode || "equal"}
                      disabled={selectedField.type !== "digits"}
                      onChange={(event) =>
                        updateSelectedDigitSpacingMode(
                          selectedField.key,
                          event.target.value as DigitSpacingMode,
                        )
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold disabled:bg-slate-100"
                    >
                      <option value="equal">מרווח שווה בין כל הספרות</option>
                      <option value="group">קידומת + מספר עם רווח באמצע</option>
                    </select>
                  </label>

                  <label className="text-xs font-black text-slate-500">
                    מרווח בין כל ספרה
                    <input
                      type="number"
                      min={1}
                      value={selectedField.digitGap || DEFAULT_GLOBAL_DIGIT_GAP}
                      disabled={selectedField.type !== "digits"}
                      onChange={(event) =>
                        updateSelectedDigitGap(
                          selectedField.key,
                          Number(event.target.value),
                        )
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold disabled:bg-slate-100"
                    />
                  </label>

                  <label className="text-xs font-black text-slate-500">
                    אורך קידומת
                    <select
                      value={
                        selectedField.digitGroupSizeMode === "manual"
                          ? String(selectedField.digitGroupSize || 3)
                          : "auto"
                      }
                      disabled={
                        selectedField.type !== "digits" ||
                        selectedField.digitSpacingMode !== "group"
                      }
                      onChange={(event) =>
                        updateSelectedDigitGroupSizeMode(
                          selectedField.key,
                          event.target.value,
                        )
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold disabled:bg-slate-100"
                    >
                      <option value="auto">אוטומטי לפי המספר</option>
                      <option value="2">2 ספרות</option>
                      <option value="3">3 ספרות</option>
                    </select>
                  </label>

                  <label className="text-xs font-black text-slate-500">
                    רווח אחרי הקידומת
                    <input
                      type="number"
                      min={0}
                      value={selectedField.digitGroupGap || 0}
                      disabled={
                        selectedField.type !== "digits" ||
                        selectedField.digitSpacingMode !== "group"
                      }
                      onChange={(event) =>
                        updateSelectedDigitGroupGap(
                          selectedField.key,
                          Number(event.target.value),
                        )
                      }
                      className="mt-1 h-10 w-full rounded-xl border px-3 text-sm font-bold disabled:bg-slate-100"
                    />
                  </label>

                  <div className="col-span-2 rounded-2xl bg-sky-50 px-4 py-3 text-[11px] font-bold leading-5 text-sky-800">
                    לטלפון/נייד: בוחרים “קידומת + מספר”. באורך קידומת אפשר לבחור
                    אוטומטי לפי המספר: 05/073/077 או כל מספר באורך 10 = קידומת 3
                    ספרות, 02/03/04/08/09 באורך 9 = קידומת 2 ספרות. את הרווח
                    אחרי הקידומת את מגדירה בעצמך, והעובד מקליד את המספר ברצף.
                  </div>

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

                <div className="grid grid-cols-2 gap-2">
                  {selectedField.enabled ? (
                    <button
                      type="button"
                      onClick={deleteOrDisableField}
                      className="rounded-2xl bg-rose-50 py-3 text-sm font-black text-rose-700"
                    >
                      כיבוי שדה
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFieldEnabled(selectedField.key, true)}
                      className="rounded-2xl bg-emerald-50 py-3 text-sm font-black text-emerald-700"
                    >
                      החזרת שדה לפעיל
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={deleteFieldPermanently}
                    className="rounded-2xl bg-red-600 py-3 text-sm font-black text-white"
                  >
                    מחיקת שדה
                  </button>
                </div>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
