"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type PageNumber = 1 | 2;
type FieldType = "text" | "digits" | "check" | "signature";
type TextAlign = "right" | "left" | "center";
type DigitSpacingMode = "equal" | "group" | "custom";
type DigitGroupSizeMode = "auto" | "manual";

type FieldConfig = {
  page: PageNumber;
  section: string;
  order: number;
  enabled: boolean;
  isFixed: boolean;
  fixedValue: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: FieldType;
  fontSize: number;
  digitGap: number | null;
  digitSpacingMode?: DigitSpacingMode;
  digitGaps?: number[]; // legacy only
  digitGroupSize?: number | null;
  digitGroupSizeMode?: DigitGroupSizeMode;
  digitGroupGap?: number | null;
  maxDigits: number | null;
  align: TextAlign;
};

type FieldValue = string | boolean;
type ValuesMap = Record<string, FieldValue>;
type ChildPayload = {
  name?: string;
  idNumber?: string;
  birthDate?: string;
};
type ActiveSignatureField = string | null;

const PDF_URL = "/forms/tofes-101.pdf";
const PAGE_WIDTH = 900;
const PAGE_HEIGHT = 1280;
const DRAFT_STORAGE_KEY =
  "invistimo_employee_form101_template_draft_v2_no_samples";
const OLD_DRAFT_STORAGE_KEYS = ["invistimo_employee_form101_template_draft_v1"];

const FORM101_FIELD_MAP: Record<string, FieldConfig> = {
  taxYear: {
    page: 1,
    section: "year",
    order: 1,
    enabled: true,
    isFixed: false,
    fixedValue: "2026",
    x: 323,
    y: 111,
    width: 120,
    height: 30,
    type: "digits",
    fontSize: 20,
    digitGap: 21,
    maxDigits: 4,
    align: "center",
  },
  employerName: {
    page: 1,
    section: "employer",
    order: 2,
    enabled: true,
    isFixed: true,
    fixedValue: "בן עשת",
    x: 603,
    y: 221,
    width: 150,
    height: 24,
    type: "text",
    fontSize: 16,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  employerAddress: {
    page: 1,
    section: "employer",
    order: 3,
    enabled: true,
    isFixed: true,
    fixedValue: "העצמאות 41 קרית אתא",
    x: 401,
    y: 223,
    width: 175,
    height: 24,
    type: "text",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "right",
  },
  employerPhone: {
    page: 1,
    section: "employer",
    order: 4,
    enabled: true,
    isFixed: true,
    fixedValue: "0526850711",
    x: 224,
    y: 224,
    width: 98,
    height: 24,
    type: "digits",
    fontSize: 15,
    digitGap: 21,
    maxDigits: 10,
    align: "left",
  },
  employerFileNumber: {
    page: 1,
    section: "employer",
    order: 5,
    enabled: true,
    isFixed: true,
    fixedValue: "05790028",
    x: 98,
    y: 226,
    width: 124,
    height: 24,
    type: "digits",
    fontSize: 15,
    digitGap: 21,
    maxDigits: 9,
    align: "right",
  },
  idNumber: {
    page: 1,
    section: "employee",
    order: 6,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 631,
    y: 283,
    width: 136,
    height: 24,
    type: "digits",
    fontSize: 15,
    digitGap: 21,
    maxDigits: 9,
    align: "center",
  },
  lastName: {
    page: 1,
    section: "employee",
    order: 7,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 504,
    y: 283,
    width: 95,
    height: 24,
    type: "text",
    fontSize: 15,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  firstName: {
    page: 1,
    section: "employee",
    order: 8,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 356,
    y: 282,
    width: 85,
    height: 24,
    type: "text",
    fontSize: 15,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  birthDate: {
    page: 1,
    section: "employee",
    order: 9,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 204,
    y: 284,
    width: 123,
    height: 24,
    type: "digits",
    fontSize: 15,
    digitGap: 21,
    maxDigits: 8,
    align: "center",
  },
  immigrationDate: {
    page: 1,
    section: "employee",
    order: 10,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 85,
    y: 285,
    width: 120,
    height: 24,
    type: "digits",
    fontSize: 15,
    digitGap: 21,
    maxDigits: 8,
    align: "center",
  },
  street: {
    page: 1,
    section: "employee",
    order: 11,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 607,
    y: 311,
    width: 143,
    height: 24,
    type: "text",
    fontSize: 15,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  houseNumber: {
    page: 1,
    section: "employee",
    order: 12,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 558,
    y: 311,
    width: 52,
    height: 24,
    type: "digits",
    fontSize: 15,
    digitGap: 21,
    maxDigits: 4,
    align: "center",
  },
  city: {
    page: 1,
    section: "employee",
    order: 13,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 465,
    y: 311,
    width: 100,
    height: 24,
    type: "text",
    fontSize: 15,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  postalCode: {
    page: 1,
    section: "employee",
    order: 14,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 360,
    y: 312,
    width: 103,
    height: 24,
    type: "digits",
    fontSize: 15,
    digitGap: 21,
    maxDigits: 7,
    align: "left",
  },
  phone: {
    page: 1,
    section: "employee",
    order: 15,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 221,
    y: 312,
    width: 30,
    height: 24,
    type: "digits",
    fontSize: 15,
    digitGap: 21,
    maxDigits: 10,
    align: "center",
  },
  customField1782075538085: {
    page: 1,
    section: "employee",
    order: 16,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 250,
    y: 312,
    width: 76,
    height: 24,
    type: "text",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  mobile: {
    page: 1,
    section: "employee",
    order: 17,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 86,
    y: 313,
    width: 28,
    height: 24,
    type: "digits",
    fontSize: 15,
    digitGap: 21,
    maxDigits: 10,
    align: "left",
  },
  customField1782075699673: {
    page: 1,
    section: "employee",
    order: 18,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 104,
    y: 312,
    width: 95,
    height: 24,
    type: "text",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  email: {
    page: 1,
    section: "employee",
    order: 19,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 426,
    y: 522,
    width: 230,
    height: 24,
    type: "text",
    fontSize: 15,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  genderMale: {
    page: 1,
    section: "employee",
    order: 19,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 740,
    y: 357,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  genderFemale: {
    page: 1,
    section: "employee",
    order: 20,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 740,
    y: 374,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  maritalSingle: {
    page: 1,
    section: "employee",
    order: 21,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 674,
    y: 355,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  maritalMarried: {
    page: 1,
    section: "employee",
    order: 22,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 590,
    y: 355,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  maritalDivorced: {
    page: 1,
    section: "employee",
    order: 23,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 500,
    y: 355,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  maritalWidowed: {
    page: 1,
    section: "employee",
    order: 24,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 674,
    y: 373,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  customField1782075946735: {
    page: 1,
    section: "employee",
    order: 25,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 601,
    y: 371,
    width: 29,
    height: 24,
    type: "check",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  residentYes: {
    page: 1,
    section: "employee",
    order: 26,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 412,
    y: 357,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  residentNo: {
    page: 1,
    section: "employee",
    order: 27,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 412,
    y: 374,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  kibbutzYes: {
    page: 1,
    section: "employee",
    order: 28,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 306,
    y: 356,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  kibbutzNo: {
    page: 1,
    section: "employee",
    order: 29,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 306,
    y: 374,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  healthFundYes: {
    page: 1,
    section: "employee",
    order: 30,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 213,
    y: 371,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  child1Name: {
    page: 1,
    section: "children",
    order: 30,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 540,
    y: 685,
    width: 95,
    height: 22,
    type: "text",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  healthFundName: {
    page: 1,
    section: "employee",
    order: 31,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 78,
    y: 371,
    width: 85,
    height: 24,
    type: "text",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  child1Id: {
    page: 1,
    section: "children",
    order: 31,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 405,
    y: 685,
    width: 110,
    height: 22,
    type: "digits",
    fontSize: 14,
    digitGap: 21,
    maxDigits: 9,
    align: "left",
  },
  child1BirthDate: {
    page: 1,
    section: "children",
    order: 32,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 285,
    y: 685,
    width: 100,
    height: 22,
    type: "digits",
    fontSize: 14,
    digitGap: 21,
    maxDigits: 8,
    align: "left",
  },
  customField1782076968515: {
    page: 1,
    section: "employee",
    order: 32,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 199,
    y: 352,
    width: 47,
    height: 24,
    type: "check",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "right",
  },
  child1Mark1: {
    page: 1,
    section: "children",
    order: 33,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 745,
    y: 685,
    width: 18,
    height: 18,
    type: "check",
    fontSize: 16,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  child1Mark2: {
    page: 1,
    section: "children",
    order: 34,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 720,
    y: 685,
    width: 18,
    height: 18,
    type: "check",
    fontSize: 16,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  workStartDate: {
    page: 1,
    section: "income",
    order: 35,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 95,
    y: 710,
    width: 105,
    height: 24,
    type: "digits",
    fontSize: 15,
    digitGap: 21,
    maxDigits: 8,
    align: "left",
  },
  incomeMonthlySalary: {
    page: 1,
    section: "income",
    order: 36,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 318,
    y: 700,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  incomeExtraSalary: {
    page: 1,
    section: "income",
    order: 37,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 318,
    y: 730,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  incomePartialSalary: {
    page: 1,
    section: "income",
    order: 38,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 318,
    y: 760,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  incomeDailyWage: {
    page: 1,
    section: "income",
    order: 39,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 318,
    y: 790,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  incomeAllowance: {
    page: 1,
    section: "income",
    order: 40,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 318,
    y: 820,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  incomeScholarship: {
    page: 1,
    section: "income",
    order: 41,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 318,
    y: 850,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  otherNoIncome: {
    page: 1,
    section: "otherIncome",
    order: 42,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 335,
    y: 940,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  otherHasIncome: {
    page: 1,
    section: "otherIncome",
    order: 43,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 335,
    y: 975,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  spouseId: {
    page: 1,
    section: "spouse",
    order: 44,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 650,
    y: 1180,
    width: 115,
    height: 24,
    type: "digits",
    fontSize: 14,
    digitGap: 21,
    maxDigits: 9,
    align: "left",
  },
  spouseLastName: {
    page: 1,
    section: "spouse",
    order: 45,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 520,
    y: 1180,
    width: 100,
    height: 24,
    type: "text",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  spouseFirstName: {
    page: 1,
    section: "spouse",
    order: 46,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 395,
    y: 1180,
    width: 100,
    height: 24,
    type: "text",
    fontSize: 14,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  page2IdNumber: {
    page: 2,
    section: "credits",
    order: 47,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 128,
    y: 45,
    width: 120,
    height: 24,
    type: "digits",
    fontSize: 15,
    digitGap: 21,
    maxDigits: 9,
    align: "left",
  },
  creditResident: {
    page: 2,
    section: "credits",
    order: 48,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 742,
    y: 100,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  creditDisabled: {
    page: 2,
    section: "credits",
    order: 49,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 742,
    y: 145,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  creditSettlement: {
    page: 2,
    section: "credits",
    order: 50,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 742,
    y: 210,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  creditNewImmigrant: {
    page: 2,
    section: "credits",
    order: 51,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 742,
    y: 285,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  creditSingleParent: {
    page: 2,
    section: "credits",
    order: 52,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 742,
    y: 420,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  creditChildrenCustody: {
    page: 2,
    section: "credits",
    order: 53,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 742,
    y: 500,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  creditSoldier: {
    page: 2,
    section: "credits",
    order: 54,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 742,
    y: 845,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  creditAcademic: {
    page: 2,
    section: "credits",
    order: 55,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 742,
    y: 895,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  taxNoIncome: {
    page: 2,
    section: "taxCoordination",
    order: 56,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 742,
    y: 970,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  taxHasOtherIncome: {
    page: 2,
    section: "taxCoordination",
    order: 57,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 742,
    y: 1040,
    width: 20,
    height: 20,
    type: "check",
    fontSize: 18,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
  signatureDate: {
    page: 2,
    section: "declaration",
    order: 58,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 260,
    y: 1180,
    width: 115,
    height: 26,
    type: "digits",
    fontSize: 15,
    digitGap: 21,
    maxDigits: 8,
    align: "left",
  },
  signature: {
    page: 2,
    section: "declaration",
    order: 59,
    enabled: true,
    isFixed: false,
    fixedValue: "",
    x: 80,
    y: 1170,
    width: 140,
    height: 42,
    type: "signature",
    fontSize: 16,
    digitGap: null,
    maxDigits: null,
    align: "center",
  },
};

const SECTION_TITLES: Record<string, string> = {
  year: "שנת מס",
  employer: "א. פרטי המעסיק",
  employee: "ב. פרטי העובד/ת",
  children: "ג. ילדים",
  income: "ד. הכנסות ממעסיק זה",
  otherIncome: "ה. הכנסות אחרות",
  spouse: "ו. בן/בת זוג",
  credits: "ח. פטור / זיכוי ממס",
  taxCoordination: "ט. תיאום מס",
  declaration: "י. הצהרה וחתימה",
};

const FIELD_LABELS: Record<string, string> = {
  taxYear: "שנת מס",
  employerName: "שם מעסיק",
  employerAddress: "כתובת מעסיק",
  employerPhone: "טלפון מעסיק",
  employerFileNumber: "תיק ניכויים",
  idNumber: "תעודת זהות",
  lastName: "שם משפחה",
  firstName: "שם פרטי",
  birthDate: "תאריך לידה",
  immigrationDate: "תאריך עלייה",
  street: "רחוב / שכונה",
  houseNumber: "מספר בית",
  city: "עיר / יישוב",
  postalCode: "מיקוד",
  phone: "טלפון",
  customField1782075538085: "טלפון - המשך",
  mobile: "נייד",
  customField1782075699673: "נייד - המשך",
  email: "דואר אלקטרוני",
  genderMale: "זכר",
  genderFemale: "נקבה",
  maritalSingle: "רווק/ה",
  maritalMarried: "נשוי/אה",
  maritalDivorced: "גרוש/ה",
  maritalWidowed: "אלמן/ה",
  customField1782075946735: "פרוד/ה",
  residentYes: "תושב כן",
  residentNo: "תושב לא",
  kibbutzYes: "חבר קיבוץ/מושב כן",
  kibbutzNo: "חבר קיבוץ/מושב לא",
  healthFundYes: "קופת חולים כן",
  customField1782076968515: "קופת חולים לא",
  healthFundName: "שם קופת חולים",
  child1Name: "ילד 1 - שם",
  child1Id: "ילד 1 - תעודת זהות",
  child1BirthDate: "ילד 1 - תאריך לידה",
  child1Mark1: "ילד 1 - סימון 1",
  child1Mark2: "ילד 1 - סימון 2",
  workStartDate: "תחילת עבודה",
  incomeMonthlySalary: "משכורת חודש",
  incomeExtraSalary: "משכורת נוספת",
  incomePartialSalary: "משכורת בעד משרה נוספת",
  incomeDailyWage: "שכר עבודה יומי",
  incomeAllowance: "קצבה",
  incomeScholarship: "מלגה",
  otherNoIncome: "אין הכנסות אחרות",
  otherHasIncome: "יש הכנסות אחרות",
  spouseId: "בן/בת זוג - תעודת זהות",
  spouseLastName: "בן/בת זוג - שם משפחה",
  spouseFirstName: "בן/בת זוג - שם פרטי",
  page2IdNumber: "תעודת זהות עמוד 2",
  creditResident: "תושב ישראל",
  creditDisabled: "נכות / עיוורון",
  creditSettlement: "ישוב מזכה",
  creditNewImmigrant: "עולה חדש",
  creditSingleParent: "משפחה חד הורית",
  creditChildrenCustody: "ילדים בחזקתי",
  creditSoldier: "חייל משוחרר / שירות לאומי",
  creditAcademic: "לימודים אקדמיים",
  taxNoIncome: "לא הייתה הכנסה",
  taxHasOtherIncome: "יש הכנסות נוספות",
  signatureDate: "תאריך חתימה",
  signature: "חתימה",
};

const EXCLUSIVE_GROUPS: string[][] = [
  ["genderMale", "genderFemale"],
  [
    "maritalSingle",
    "maritalMarried",
    "maritalDivorced",
    "maritalWidowed",
    "customField1782075946735",
  ],
  ["residentYes", "residentNo"],
  ["kibbutzYes", "kibbutzNo"],
  ["healthFundYes", "customField1782076968515"],
  ["otherNoIncome", "otherHasIncome"],
  ["taxNoIncome", "taxHasOtherIncome"],
];

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function onlyDigits(value: unknown) {
  return clean(value).replace(/\D/g, "");
}

function getDynamicChildLabel(key: string) {
  const match = key.match(/^child(\d+)(Name|Id|BirthDate|Mark1|Mark2)$/);

  if (!match) return "";

  const row = match[1];
  const suffix = match[2];

  if (suffix === "Name") return `ילד ${row} - שם`;
  if (suffix === "Id") return `ילד ${row} - תעודת זהות`;
  if (suffix === "BirthDate") return `ילד ${row} - תאריך לידה`;
  if (suffix === "Mark1") return `ילד ${row} - סימון 1`;
  if (suffix === "Mark2") return `ילד ${row} - סימון 2`;

  return `ילד ${row}`;
}

function getFieldLabel(key: string, field?: FieldConfig | null) {
  return field?.label || FIELD_LABELS[key] || getDynamicChildLabel(key) || key;
}

function normalizeTemplateFields(input: unknown) {
  const raw =
    input && typeof input === "object"
      ? (input as Record<string, Partial<FieldConfig>>)
      : {};

  const normalized: Record<string, FieldConfig> = {};

  Object.entries(raw).forEach(([key, field]) => {
    if (!key || !field) return;

    const page: PageNumber = Number(field.page) === 2 ? 2 : 1;
    const type = ["text", "digits", "check", "signature"].includes(
      String(field.type || ""),
    )
      ? (field.type as FieldType)
      : "text";

    const align = ["right", "left", "center"].includes(
      String(field.align || ""),
    )
      ? (field.align as TextAlign)
      : "right";

    normalized[key] = {
      page,
      section: clean(field.section) || "employee",
      order: Math.max(1, Number(field.order || 1)),
      enabled: typeof field.enabled === "boolean" ? field.enabled : true,
      isFixed: Boolean(field.isFixed),
      fixedValue: clean(field.fixedValue),
      label: clean(field.label) || FIELD_LABELS[key] || key,
      x: Number.isFinite(Number(field.x)) ? Number(field.x) : 0,
      y: Number.isFinite(Number(field.y)) ? Number(field.y) : 0,
      width: Math.max(1, Number(field.width || 20)),
      height: Math.max(1, Number(field.height || 20)),
      type,
      fontSize: Math.max(6, Number(field.fontSize || 14)),
      digitGap:
        field.digitGap === null || field.digitGap === undefined
          ? null
          : Math.max(1, Number(field.digitGap || 13)),
      digitSpacingMode:
        field.digitSpacingMode === "group" ||
        field.digitSpacingMode === "custom"
          ? "group"
          : "equal",
      digitGaps: Array.isArray(field.digitGaps)
        ? field.digitGaps
            .map((gap) => Math.max(1, Number(gap) || 13))
            .filter((gap) => Number.isFinite(gap))
        : [],
      digitGroupSize:
        field.digitGroupSize === null || field.digitGroupSize === undefined
          ? null
          : Math.max(1, Number(field.digitGroupSize || 3)),
      digitGroupSizeMode:
        field.digitGroupSizeMode === "manual" ? "manual" : "auto",
      digitGroupGap:
        field.digitGroupGap === null || field.digitGroupGap === undefined
          ? null
          : Math.max(0, Number(field.digitGroupGap || 0)),
      maxDigits:
        field.maxDigits === null || field.maxDigits === undefined
          ? null
          : Math.max(1, Number(field.maxDigits || 1)),
      align,
    };
  });

  return Object.keys(normalized).length ? normalized : FORM101_FIELD_MAP;
}

function getFixedValues(fieldMap: Record<string, FieldConfig>) {
  return Object.fromEntries(
    Object.entries(fieldMap)
      .filter(([, field]) => field.isFixed)
      .map(([key, field]) => [
        key,
        field.type === "check"
          ? field.fixedValue === "true" || field.fixedValue === "✓"
          : field.fixedValue || "",
      ]),
  ) as ValuesMap;
}

function normalizeValueByField(value: unknown, field: FieldConfig): FieldValue {
  if (field.type === "check") return Boolean(value);
  if (field.type === "digits") return onlyDigits(value);
  return clean(value);
}

function mergeValuesForTemplate(
  currentValues: ValuesMap,
  fieldMap: Record<string, FieldConfig>,
) {
  const initial = getInitialValues(fieldMap);
  const next: ValuesMap = { ...initial };

  Object.entries(fieldMap).forEach(([key, field]) => {
    if (!field.enabled) return;

    if (field.isFixed) {
      next[key] =
        field.type === "check"
          ? field.fixedValue === "true" || field.fixedValue === "✓"
          : field.fixedValue || "";
      return;
    }

    if (Object.prototype.hasOwnProperty.call(currentValues, key)) {
      next[key] = normalizeValueByField(currentValues[key], field);
    }
  });

  return next;
}

function getInitialValues(fieldMap: Record<string, FieldConfig>) {
  const next: ValuesMap = {};

  Object.entries(fieldMap).forEach(([key, field]) => {
    if (!field.enabled) return;

    if (field.type === "check") {
      next[key] = field.isFixed
        ? field.fixedValue === "true" || field.fixedValue === "✓"
        : false;
      return;
    }

    next[key] = field.isFixed ? field.fixedValue || "" : "";
  });

  if (!next.taxYear) {
    next.taxYear = new Date().getFullYear().toString();
  }

  return next;
}

function loadDraftValues(fieldMap: Record<string, FieldConfig>) {
  const initial = getInitialValues(fieldMap);

  if (typeof window === "undefined") return initial;

  try {
    OLD_DRAFT_STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });

    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!saved) return initial;

    const parsed = JSON.parse(saved) as ValuesMap;

    return mergeValuesForTemplate(parsed, fieldMap);
  } catch {
    return initial;
  }
}

function getPageFields(
  fieldMap: Record<string, FieldConfig>,
  page: PageNumber,
) {
  return Object.entries(fieldMap)
    .filter(([, field]) => field.enabled && field.page === page)
    .sort(([, a], [, b]) => a.order - b.order);
}

function getSectionFields(
  fieldMap: Record<string, FieldConfig>,
  section: string,
) {
  return Object.entries(fieldMap)
    .filter(([, field]) => field.enabled && field.section === section)
    .sort(([, a], [, b]) => a.order - b.order);
}

function valueForPdf(value: FieldValue, field: FieldConfig) {
  if (field.isFixed) return field.fixedValue || "";
  if (field.type === "digits") return onlyDigits(value);
  return value;
}

function collectChildrenPayload(
  values: ValuesMap,
  fieldMap: Record<string, FieldConfig>,
) {
  const rows = new Map<number, ChildPayload>();

  Object.keys(fieldMap).forEach((key) => {
    const match = key.match(/^child(\d+)(Name|Id|BirthDate)$/);

    if (!match) return;

    const row = Number(match[1]);
    const suffix = match[2];

    if (!Number.isFinite(row) || row < 1) return;

    const current = rows.get(row) || {};
    const value = clean(values[key]);

    if (suffix === "Name") current.name = value;
    if (suffix === "Id") current.idNumber = value;
    if (suffix === "BirthDate") current.birthDate = value;

    rows.set(row, current);
  });

  return Array.from(rows.entries())
    .sort(([a], [b]) => a - b)
    .map(([, child]) => child)
    .filter(
      (child) =>
        clean(child.name) || clean(child.idNumber) || clean(child.birthDate),
    );
}

function buildStructuredPayload(
  values: ValuesMap,
  fieldMap: Record<string, FieldConfig>,
) {
  const fieldValue = (key: string) => values[key];
  const text = (key: string) => clean(fieldValue(key));
  const checked = (key: string) => Boolean(fieldValue(key));
  const idNumber = text("idNumber");

  const payload: any = {
    taxYear: text("taxYear"),

    employerName: text("employerName"),
    employerAddress: text("employerAddress"),
    employerPhone: text("employerPhone"),
    employerFileNumber: text("employerFileNumber"),

    idNumber,
    firstName: text("firstName"),
    lastName: text("lastName"),
    birthDate: text("birthDate"),
    immigrationDate: text("immigrationDate"),

    street: text("street"),
    houseNumber: text("houseNumber"),
    city: text("city"),
    postalCode: text("postalCode"),

    phonePrefix: text("phonePrefix") || text("phone"),
    phoneNumber: text("phoneNumber") || text("customField1782075538085"),
    mobilePrefix: text("mobilePrefix") || text("mobile"),
    mobileNumber: text("mobileNumber") || text("customField1782075699673"),

    phone:
      `${text("phonePrefix") || text("phone")}${text("phoneNumber") || text("customField1782075538085")}`.trim(),
    mobile:
      `${text("mobilePrefix") || text("mobile")}${text("mobileNumber") || text("customField1782075699673")}`.trim(),
    email: text("email"),

    gender: checked("genderMale")
      ? "male"
      : checked("genderFemale")
        ? "female"
        : "",
    maritalStatus: checked("maritalSingle")
      ? "single"
      : checked("maritalMarried")
        ? "married"
        : checked("maritalDivorced")
          ? "divorced"
          : checked("maritalWidowed")
            ? "widowed"
            : checked("customField1782075946735")
              ? "separated"
              : "",
    residentIsrael: checked("residentYes")
      ? "yes"
      : checked("residentNo")
        ? "no"
        : "",
    kibbutzMember: checked("kibbutzYes")
      ? "yes"
      : checked("kibbutzNo")
        ? "no"
        : "",
    healthFundMember: checked("healthFundYes")
      ? "yes"
      : checked("customField1782076968515")
        ? "no"
        : "",
    healthFundName: text("healthFundName"),

    workStartDate: text("workStartDate"),

    incomeType: {
      monthlySalary: checked("incomeMonthlySalary"),
      extraSalary: checked("incomeExtraSalary"),
      partialSalary: checked("incomePartialSalary"),
      dailyWage: checked("incomeDailyWage"),
      allowance: checked("incomeAllowance"),
      pension: checked("incomeScholarship"),
    },

    otherIncome: {
      noOtherIncome: checked("otherNoIncome"),
      monthlySalary: false,
      extraSalary: false,
      partialSalary: false,
      dailyWage: false,
      allowance: false,
      pension: false,
      scholarship: false,
    },

    spouse: {
      idNumber: text("spouseId"),
      firstName: text("spouseFirstName"),
      lastName: text("spouseLastName"),
      birthDate: "",
      immigrationDate: "",
      noIncome: false,
      hasIncome: false,
    },

    children: collectChildrenPayload(values, fieldMap),

    taxCredits: {
      resident: checked("creditResident"),
      disabled100: checked("creditDisabled"),
      settlement: checked("creditSettlement"),
      settlementDate: "",
      settlementName: "",
      newImmigrant: checked("creditNewImmigrant"),
      spouseNoIncome: false,
      singleParent: checked("creditSingleParent"),
      childrenCustody: checked("creditChildrenCustody"),
      childrenBornThisYear: "",
      childrenAgeOneToFive: "",
      childrenAgeSixToSeventeen: "",
      childrenAgeEighteen: "",
      specialChild: false,
      alimony: false,
      childrenUnder19: false,
      soldier: checked("creditSoldier"),
      academic: checked("creditAcademic"),
      diploma: false,
      noIncomeThisYear: checked("taxNoIncome"),
      hasOtherIncomeForTaxCoordination: checked("taxHasOtherIncome"),
    },

    signatureDate: text("signatureDate"),
    signatureText: "",
    signatureDataUrl: text("signature"),
  };

  Object.entries(fieldMap)
    .filter(([, field]) => field.enabled)
    .forEach(([key, field]) => {
      payload[key] = valueForPdf(values[key], field);
    });

  payload.formFieldValues = Object.fromEntries(
    Object.entries(fieldMap)
      .filter(([, field]) => field.enabled)
      .map(([key, field]) => [key, valueForPdf(values[key], field)]),
  );

  if (idNumber && !payload.page2IdNumber) {
    payload.page2IdNumber = idNumber;
    payload.formFieldValues.page2IdNumber = idNumber;
  }

  return payload;
}

function getBaseDigitCellWidth(field: FieldConfig) {
  return Math.max(1, Number(field.digitGap || 13));
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

function getResolvedDigitGroupSize(field: FieldConfig, value: unknown) {
  const fallback = Math.max(1, Number(field.digitGroupSize || 3));

  if (field.digitGroupSizeMode === "manual") {
    return fallback;
  }

  return getAutoDigitGroupSize(value, fallback);
}

function getGroupGapAfterDigit(
  field: FieldConfig,
  index: number,
  value: unknown,
) {
  if (field.digitSpacingMode !== "group") return 0;

  const groupSize = getResolvedDigitGroupSize(field, value);
  if (index !== groupSize - 1) return 0;

  return Math.max(0, Number(field.digitGroupGap || 0));
}

function FieldControl({
  fieldKey,
  field,
  value,
  selected,
  onSelect,
  onChange,
  onOpenSignature,
}: {
  fieldKey: string;
  field: FieldConfig;
  value: FieldValue;
  selected: boolean;
  onSelect: () => void;
  onChange: (value: FieldValue) => void;
  onOpenSignature: () => void;
}) {
  const commonStyle: React.CSSProperties = {
    left: field.x,
    top: field.y,
    width: field.width,
    height: field.height,
    fontSize: Math.max(10, field.fontSize),
    textAlign: field.align,
  };

  if (field.type === "check") {
    return (
      <button
        type="button"
        disabled={field.isFixed}
        onClick={() => {
          onSelect();
          if (!field.isFixed) onChange(!Boolean(value));
        }}
        className={`absolute z-20 flex items-center justify-center border bg-white/20 font-black text-blue-700 transition ${
          selected
            ? "border-fuchsia-500 ring-2 ring-fuchsia-400"
            : "border-blue-400/60"
        } ${field.isFixed ? "cursor-default opacity-80" : "cursor-pointer hover:bg-blue-50/70"}`}
        style={commonStyle}
        title={getFieldLabel(fieldKey, field)}
      >
        {Boolean(value) ? "✓" : ""}
      </button>
    );
  }

  if (field.type === "signature") {
    return (
      <button
        type="button"
        onClick={() => {
          onSelect();
          if (!field.isFixed) onOpenSignature();
        }}
        className={`absolute z-20 overflow-hidden border bg-white/30 text-center text-xs font-black transition ${
          selected
            ? "border-fuchsia-500 ring-2 ring-fuchsia-400"
            : "border-blue-400/60"
        }`}
        style={commonStyle}
        title={getFieldLabel(fieldKey, field)}
      >
        {typeof value === "string" && value.startsWith("data:image") ? (
          <img
            src={value}
            alt="חתימה"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-blue-700">
            לחתימה
          </span>
        )}
      </button>
    );
  }

  const stringValue = clean(value);
  const inputValue =
    field.type === "digits" ? onlyDigits(stringValue) : stringValue;

  function alignToJustify(align: TextAlign) {
    if (align === "center") return "center";
    if (align === "right") return "flex-end";
    return "flex-start";
  }

  function alignToText(align: TextAlign) {
    if (align === "center") return "center";
    if (align === "left") return "left";
    return "right";
  }

  if (field.type === "digits") {
    const digits = onlyDigits(inputValue);
    const sliced = field.maxDigits ? digits.slice(0, field.maxDigits) : digits;

    return (
      <div
        className="absolute z-20"
        style={{
          left: field.x,
          top: field.y,
          width: field.width,
          height: field.height,
        }}
      >
        <div
          className={`relative h-full w-full border ${
            selected
              ? "border-fuchsia-500 bg-fuchsia-500/10 ring-2 ring-fuchsia-400"
              : "border-blue-400/60 bg-white/20"
          } ${field.isFixed ? "bg-slate-100/50 text-slate-700" : ""}`}
        >
          <span
            dir="ltr"
            className="pointer-events-none flex h-full w-full items-center text-blue-900"
            style={{
              justifyContent: alignToJustify(field.align),
              fontSize: field.fontSize,
              lineHeight: `${field.height}px`,
            }}
          >
            {sliced.split("").map((digit, index) => (
              <span
                key={`${fieldKey}-${index}`}
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

          <input
            value={inputValue}
            disabled={field.isFixed}
            maxLength={field.maxDigits || undefined}
            onFocus={onSelect}
            onClick={onSelect}
            onChange={(event) => onChange(onlyDigits(event.target.value))}
            className="absolute inset-0 h-full w-full border-0 bg-transparent p-0 text-transparent caret-blue-700 outline-none"
            style={{
              fontSize: Math.max(10, field.fontSize),
              direction: "ltr",
            }}
            placeholder=""
            title={getFieldLabel(fieldKey, field)}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute z-20"
      style={{
        left: field.x,
        top: field.y,
        width: field.width,
        height: field.height,
      }}
    >
      <div
        className={`relative h-full w-full border ${
          selected
            ? "border-fuchsia-500 bg-fuchsia-500/10 ring-2 ring-fuchsia-400"
            : "border-blue-400/60 bg-white/20"
        } ${field.isFixed ? "bg-slate-100/50 text-slate-700" : ""}`}
      >
        <span
          className="pointer-events-none block h-full w-full overflow-hidden whitespace-nowrap text-blue-900"
          style={{
            fontSize: field.fontSize,
            lineHeight: `${field.height}px`,
            textAlign: alignToText(field.align),
          }}
        >
          {inputValue}
        </span>

        <input
          value={inputValue}
          disabled={field.isFixed}
          maxLength={field.maxDigits || undefined}
          onFocus={onSelect}
          onClick={onSelect}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full border-0 bg-transparent p-0 text-transparent caret-blue-700 outline-none"
          style={{
            fontSize: Math.max(10, field.fontSize),
            direction: "rtl",
            textAlign: field.align,
          }}
          placeholder=""
          title={getFieldLabel(fieldKey, field)}
        />
      </div>
    </div>
  );
}

function SignatureModal({
  value,
  onClose,
  onSave,
}: {
  value: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  function setupCanvas(restore = true) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";

    if (restore && value) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = value;
    }
  }

  useEffect(() => {
    setupCanvas(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPoint(event);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const last = lastPointRef.current;
    const next = getPoint(event);
    if (!canvas || !ctx || !last) return;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    lastPointRef.current = next;
  }

  function stop(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    event.preventDefault();
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setupCanvas(false);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        dir="rtl"
        className="w-full max-w-2xl rounded-[32px] bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              חתימה דיגיטלית
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              חתמי בתוך המסגרת ושמרי.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black"
          >
            סגירה
          </button>
        </div>

        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={draw}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={stop}
          className="h-60 w-full touch-none rounded-2xl border-2 border-dashed border-sky-300 bg-slate-50"
        />

        <div className="mt-4 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={clear}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            ניקוי חתימה
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-2xl bg-sky-600 px-8 py-3 text-sm font-black text-white"
          >
            שמירת חתימה
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnlineForm101() {
  const [fieldMap, setFieldMap] =
    useState<Record<string, FieldConfig>>(FORM101_FIELD_MAP);
  const [pageWidth, setPageWidth] = useState(PAGE_WIDTH);
  const [pageHeight, setPageHeight] = useState(PAGE_HEIGHT);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [templateError, setTemplateError] = useState("");
  const [values, setValues] = useState<ValuesMap>(() =>
    loadDraftValues(FORM101_FIELD_MAP),
  );
  const [page, setPage] = useState<PageNumber>(1);
  const [selectedKey, setSelectedKey] = useState<string>("idNumber");
  const [submitting, setSubmitting] = useState(false);
  const [activeSignatureField, setActiveSignatureField] =
    useState<ActiveSignatureField>(null);
  const [pdfReloadKey, setPdfReloadKey] = useState(1);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);

  const pageFields = useMemo(
    () => getPageFields(fieldMap, page),
    [fieldMap, page],
  );

  const sections = useMemo(() => {
    return Array.from(
      new Set(pageFields.map(([, field]) => field.section)),
    ).map((section) => ({
      key: section,
      title: SECTION_TITLES[section] || section,
      fields: getSectionFields(fieldMap, section),
    }));
  }, [fieldMap, pageFields]);

  const selectedField = selectedKey ? fieldMap[selectedKey] || null : null;

  useEffect(() => {
    let cancelled = false;

    async function loadTemplate() {
      try {
        setLoadingTemplate(true);
        setTemplateError("");

        const response = await fetch(
          "/api/admin/forms/101/template?public=true",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || "שגיאה בטעינת תבנית טופס 101");
        }

        const template = data.template || {};
        const normalizedFields = normalizeTemplateFields(template.fields);

        if (cancelled) return;

        setFieldMap(normalizedFields);
        setPageWidth(Math.max(1, Number(template.pageWidth || PAGE_WIDTH)));
        setPageHeight(Math.max(1, Number(template.pageHeight || PAGE_HEIGHT)));

        setValues((prev) => mergeValuesForTemplate(prev, normalizedFields));

        if (!normalizedFields[selectedKey]) {
          const firstField = Object.entries(normalizedFields)
            .filter(([, field]) => field.enabled)
            .sort(([, a], [, b]) => a.order - b.order)[0];

          if (firstField) {
            setSelectedKey(firstField[0]);
            setPage(firstField[1].page);
          }
        }
      } catch (error) {
        console.error("LOAD FORM 101 TEMPLATE ERROR:", error);

        if (!cancelled) {
          setTemplateError(
            error instanceof Error
              ? error.message
              : "לא הצלחתי לטעון את תבנית טופס 101",
          );
          setFieldMap(FORM101_FIELD_MAP);
          setValues((prev) => mergeValuesForTemplate(prev, FORM101_FIELD_MAP));
        }
      } finally {
        if (!cancelled) {
          setLoadingTemplate(false);
        }
      }
    }

    loadTemplate();

    return () => {
      cancelled = true;
    };
    // נטען פעם אחת בכניסה לעמוד
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(values));
  }, [values]);

  useEffect(() => {
    const idNumber = clean(values.idNumber);
    if (!idNumber) return;

    setValues((prev) => {
      if (prev.page2IdNumber) return prev;
      return { ...prev, page2IdNumber: idNumber };
    });
  }, [values.idNumber]);

  function updateValue(key: string, value: FieldValue) {
    const field = fieldMap[key];
    if (!field || field.isFixed) return;

    setValues((prev) => {
      const next: ValuesMap = { ...prev };

      const group = EXCLUSIVE_GROUPS.find((keys) => keys.includes(key));
      if (group && Boolean(value)) {
        group.forEach((groupKey) => {
          next[groupKey] = false;
        });
      }

      next[key] = value;

      if (key === "idNumber" && !next.page2IdNumber) {
        next.page2IdNumber = value;
      }

      return next;
    });
  }

  function clearDraft() {
    if (!confirm("לנקות את כל הטופס?")) return;
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setValues(getInitialValues(fieldMap));
    setPage(1);
    setSelectedKey("idNumber");
  }

  async function submitForm101() {
    try {
      setSubmitting(true);

      const payload = buildStructuredPayload(values, fieldMap);

      const response = await fetch("/api/forms/101/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("FORM 101 PDF ERROR:", errorData);
        alert(errorData?.message || "שגיאה ביצירת טופס 101");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("SUBMIT FORM 101 ERROR:", error);
      alert("שגיאה בשליחת טופס 101");
    } finally {
      setSubmitting(false);
    }
  }

  function changePage(nextPage: PageNumber) {
    setPage(nextPage);
    setPdfReloadKey((prev) => prev + 1);

    const firstFieldInPage = getPageFields(fieldMap, nextPage)[0];
    if (firstFieldInPage) {
      setSelectedKey(firstFieldInPage[0]);
    }

    requestAnimationFrame(() => {
      previewScrollRef.current?.scrollTo({ top: 0, left: 0 });
    });
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-[1700px] space-y-4 p-4">
        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-sky-50 px-4 py-2 text-xs font-black text-sky-700">
                טופס 101 מקוון
              </span>
              <h1 className="mt-3 text-3xl font-black">
                מילוי טופס 101 על גבי התבנית
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-500">
                השדות מוצגים בדיוק על התבנית שהוגדרה באדמין. שדות קבועים מופיעים
                אוטומטית לכל העובדים, ושדות רגילים ניתנים למילוי.
              </p>

              {loadingTemplate && (
                <p className="mt-2 text-sm font-black text-sky-600">
                  טוען תבנית מאושרת...
                </p>
              )}

              {templateError && (
                <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-2 text-sm font-black text-amber-700">
                  {templateError} — מוצגת תבנית ברירת מחדל.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => changePage(1)}
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
                onClick={() => changePage(2)}
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
                onClick={clearDraft}
                className="h-11 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-sm font-black text-rose-700"
              >
                ניקוי טופס
              </button>
              <button
                type="button"
                onClick={submitForm101}
                disabled={submitting}
                className="h-11 rounded-2xl bg-sky-600 px-8 text-sm font-black text-white shadow-lg transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "מייצר PDF..." : "שליחת טופס ויצירת PDF"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[320px_1fr_360px]">
          <aside className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black">ניווט שדות</h2>
            <div className="mt-4 max-h-[calc(100vh-210px)] space-y-4 overflow-auto pr-1">
              {sections.map((section) => (
                <div key={section.key} className="rounded-2xl bg-slate-50 p-3">
                  <p className="mb-2 text-sm font-black text-slate-700">
                    {section.title}
                  </p>
                  <div className="space-y-2">
                    {section.fields.map(([key, field]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setPage(field.page);
                          setSelectedKey(key);
                        }}
                        className={`w-full rounded-xl border px-3 py-2 text-right text-xs font-black transition ${
                          selectedKey === key
                            ? "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="block">
                          {field.order}. {getFieldLabel(key, field)}
                        </span>
                        <span
                          className={`mt-1 block text-[10px] ${field.isFixed ? "text-indigo-600" : "text-emerald-600"}`}
                        >
                          {field.isFixed ? "קבוע לכל העובדים" : "העובד ממלא"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section
            ref={previewScrollRef}
            className="overflow-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div
              className="relative mx-auto overflow-hidden rounded-sm bg-white shadow-xl ring-2 ring-slate-300"
              style={{ width: pageWidth, height: pageHeight }}
            >
              <iframe
                key={`${page}-${pdfReloadKey}`}
                src={`${PDF_URL}#toolbar=0&navpanes=0&scrollbar=0&page=${page}&zoom=page-fit`}
                title="טופס 101"
                scrolling="no"
                className="absolute inset-0 h-full w-full border-0"
                style={{ pointerEvents: "none", background: "white" }}
              />

              {pageFields.map(([key, field]) => (
                <FieldControl
                  key={key}
                  fieldKey={key}
                  field={field}
                  value={values[key] ?? ""}
                  selected={selectedKey === key}
                  onSelect={() => setSelectedKey(key)}
                  onChange={(value) => updateValue(key, value)}
                  onOpenSignature={() => setActiveSignatureField(key)}
                />
              ))}
            </div>
          </section>

          <aside className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black">השדה הנבחר</h2>

            {selectedField ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-base font-black text-slate-950">
                    {selectedField.order}.{" "}
                    {getFieldLabel(selectedKey, selectedField)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {selectedKey}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                      {selectedField.type === "check"
                        ? "סימון"
                        : selectedField.type === "digits"
                          ? "ספרות"
                          : selectedField.type === "signature"
                            ? "חתימה"
                            : "טקסט"}
                    </span>
                    <span
                      className={`rounded-full bg-white px-3 py-1 text-xs font-black ${selectedField.isFixed ? "text-indigo-700" : "text-emerald-700"}`}
                    >
                      {selectedField.isFixed
                        ? "קבוע לכל העובדים"
                        : "העובד ממלא"}
                    </span>
                  </div>
                </div>

                {selectedField.isFixed ? (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-bold text-indigo-800">
                    זה שדה קבוע. הערך שלו יופיע לכל העובדים ולא ניתן לעריכה כאן.
                    <div className="mt-2 rounded-xl bg-white px-3 py-2 text-slate-700">
                      {clean(values[selectedKey]) || "ריק"}
                    </div>
                  </div>
                ) : selectedField.type === "check" ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateValue(selectedKey, !Boolean(values[selectedKey]))
                    }
                    className={`w-full rounded-2xl border px-4 py-4 text-sm font-black ${
                      Boolean(values[selectedKey])
                        ? "border-sky-300 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {Boolean(values[selectedKey]) ? "מסומן ✓" : "לא מסומן"}
                  </button>
                ) : selectedField.type === "signature" ? (
                  <button
                    type="button"
                    onClick={() => setActiveSignatureField(selectedKey)}
                    className="w-full rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm font-black text-sky-700"
                  >
                    פתיחת חתימה
                  </button>
                ) : (
                  <label className="block text-sm font-black text-slate-600">
                    ערך למילוי
                    <input
                      value={clean(values[selectedKey])}
                      maxLength={selectedField.maxDigits || undefined}
                      onChange={(event) =>
                        updateValue(
                          selectedKey,
                          selectedField.type === "digits"
                            ? onlyDigits(event.target.value)
                            : event.target.value,
                        )
                      }
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-right text-sm font-bold outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </label>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm font-bold text-slate-500">
                לא נבחר שדה
              </p>
            )}
          </aside>
        </section>
      </div>

      {activeSignatureField && (
        <SignatureModal
          value={clean(values[activeSignatureField])}
          onClose={() => setActiveSignatureField(null)}
          onSave={(value) => {
            updateValue(activeSignatureField, value);
            setActiveSignatureField(null);
          }}
        />
      )}
    </main>
  );
}
