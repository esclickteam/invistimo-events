import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import EmployeeForm101 from "@/models/EmployeeForm101";
import Form101Template from "@/models/Form101Template";
import User from "@/models/User";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { buildEmployeeSnapshot } from "@/lib/employeeSnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomeTypePayload = {
  monthlySalary?: boolean;
  extraSalary?: boolean;
  partialSalary?: boolean;
  dailyWage?: boolean;
  allowance?: boolean;
  pension?: boolean;
  scholarship?: boolean;
};

type OtherIncomePayload = {
  noOtherIncome?: boolean;
  monthlySalary?: boolean;
  extraSalary?: boolean;
  partialSalary?: boolean;
  dailyWage?: boolean;
  allowance?: boolean;
  pension?: boolean;
  scholarship?: boolean;
};

type ChildPayload = {
  name?: string;
  idNumber?: string;
  birthDate?: string;
};

type SpousePayload = {
  idNumber?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  immigrationDate?: string;
  noIncome?: boolean;
  hasIncome?: boolean;
};

type Form101Payload = {
  taxYear?: string;

  employerName?: string;
  employerAddress?: string;
  employerPhone?: string;
  employerFileNumber?: string;

  idNumber?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  immigrationDate?: string;

  street?: string;
  houseNumber?: string;
  city?: string;
  postalCode?: string;

  phone?: string;
  mobile?: string;
  email?: string;

  gender?: "male" | "female" | "";
  maritalStatus?:
    | "single"
    | "married"
    | "divorced"
    | "widowed"
    | "separated"
    | "";
  residentIsrael?: "yes" | "no" | "";
  kibbutzMember?: "yes" | "no" | "";
  healthFundMember?: "yes" | "no" | "";
  healthFundName?: string;

  incomeType?: IncomeTypePayload;
  otherIncome?: OtherIncomePayload;

  workStartDate?: string;

  spouse?: SpousePayload;
  children?: ChildPayload[];

  taxCredits?: Record<string, any>;

  signatureDate?: string;
  signatureText?: string;
  signatureDataUrl?: string;

  /**
   * כל הערכים שהעובד מילא בפועל לפי key של שדה.
   * זה המקור הראשי לציור ה-PDF.
   */
  formFieldValues?: Record<string, any>;

  /**
   * צילום מצב של התבנית שהעובד ראה בזמן המילוי.
   * חייב להגיע מה-OnlineForm101 כדי שהייצוא יהיה לפי אותה תבנית בדיוק.
   */
  __form101TemplateConfig?: {
    id?: string;
    _id?: string;
    updatedAt?: string | Date | null;
    approvedAt?: string | Date | null;
    fields?: any;
    pageWidth?: number;
    pageHeight?: number;
  };

  [key: string]: any;
};

type FieldType = "text" | "digits" | "check" | "signature";
type TextAlign = "right" | "left" | "center";
type DigitSpacingMode = "equal" | "group" | "custom" | "date";
type DigitGroupSizeMode = "auto" | "manual";

type FieldMapItem = {
  page: 1 | 2;
  section: string;
  order: number;
  enabled: boolean;
  isFixed?: boolean;
  fixedValue?: string;
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

type FieldMap = Record<string, FieldMapItem>;

type Form101TemplateConfig = {
  fields: FieldMap;
  pageWidth: number;
  pageHeight: number;
};

const DEFAULT_MAPPER_PAGE_WIDTH = 900;
const DEFAULT_MAPPER_PAGE_HEIGHT = 1280;

const FORM101_FIELD_MAP = {
  "taxYear": {
    "page": 1,
    "section": "year",
    "order": 1,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "2026",
    "x": 323,
    "y": 111,
    "width": 120,
    "height": 30,
    "type": "digits",
    "fontSize": 20,
    "digitGap": 21,
    "maxDigits": 4,
    "align": "center"
  },
  "employerName": {
    "page": 1,
    "section": "employer",
    "order": 2,
    "enabled": true,
    "isFixed": true,
    "fixedValue": "בן עשת",
    "x": 603,
    "y": 221,
    "width": 150,
    "height": 24,
    "type": "text",
    "fontSize": 16,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "employerAddress": {
    "page": 1,
    "section": "employer",
    "order": 3,
    "enabled": true,
    "isFixed": true,
    "fixedValue": "העצמאות 41 קרית אתא",
    "x": 401,
    "y": 223,
    "width": 175,
    "height": 24,
    "type": "text",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "right"
  },
  "employerPhone": {
    "page": 1,
    "section": "employer",
    "order": 4,
    "enabled": true,
    "isFixed": true,
    "fixedValue": "0526850711",
    "x": 224,
    "y": 224,
    "width": 98,
    "height": 24,
    "type": "digits",
    "fontSize": 15,
    "digitGap": 21,
    "maxDigits": 10,
    "align": "left"
  },
  "employerFileNumber": {
    "page": 1,
    "section": "employer",
    "order": 5,
    "enabled": true,
    "isFixed": true,
    "fixedValue": "05790028",
    "x": 98,
    "y": 226,
    "width": 124,
    "height": 24,
    "type": "digits",
    "fontSize": 15,
    "digitGap": 21,
    "maxDigits": 9,
    "align": "right"
  },
  "idNumber": {
    "page": 1,
    "section": "employee",
    "order": 6,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 631,
    "y": 283,
    "width": 136,
    "height": 24,
    "type": "digits",
    "fontSize": 15,
    "digitGap": 21,
    "maxDigits": 9,
    "align": "center"
  },
  "lastName": {
    "page": 1,
    "section": "employee",
    "order": 7,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 504,
    "y": 283,
    "width": 95,
    "height": 24,
    "type": "text",
    "fontSize": 15,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "firstName": {
    "page": 1,
    "section": "employee",
    "order": 8,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 356,
    "y": 282,
    "width": 85,
    "height": 24,
    "type": "text",
    "fontSize": 15,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "birthDate": {
    "page": 1,
    "section": "employee",
    "order": 9,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 204,
    "y": 284,
    "width": 123,
    "height": 24,
    "type": "digits",
    "fontSize": 15,
    "digitGap": 21,
    "maxDigits": 8,
    "align": "center"
  },
  "immigrationDate": {
    "page": 1,
    "section": "employee",
    "order": 10,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 85,
    "y": 285,
    "width": 120,
    "height": 24,
    "type": "digits",
    "fontSize": 15,
    "digitGap": 21,
    "maxDigits": 8,
    "align": "center"
  },
  "street": {
    "page": 1,
    "section": "employee",
    "order": 11,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 607,
    "y": 311,
    "width": 143,
    "height": 24,
    "type": "text",
    "fontSize": 15,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "houseNumber": {
    "page": 1,
    "section": "employee",
    "order": 12,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 558,
    "y": 311,
    "width": 52,
    "height": 24,
    "type": "digits",
    "fontSize": 15,
    "digitGap": 21,
    "maxDigits": 4,
    "align": "center"
  },
  "city": {
    "page": 1,
    "section": "employee",
    "order": 13,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 465,
    "y": 311,
    "width": 100,
    "height": 24,
    "type": "text",
    "fontSize": 15,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "postalCode": {
    "page": 1,
    "section": "employee",
    "order": 14,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 360,
    "y": 312,
    "width": 103,
    "height": 24,
    "type": "digits",
    "fontSize": 15,
    "digitGap": 21,
    "maxDigits": 7,
    "align": "left"
  },
  "phone": {
    "page": 1,
    "section": "employee",
    "order": 15,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 221,
    "y": 312,
    "width": 30,
    "height": 24,
    "type": "digits",
    "fontSize": 15,
    "digitGap": 21,
    "maxDigits": 10,
    "align": "center"
  },
  "customField1782075538085": {
    "page": 1,
    "section": "employee",
    "order": 16,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 250,
    "y": 312,
    "width": 76,
    "height": 24,
    "type": "text",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "mobile": {
    "page": 1,
    "section": "employee",
    "order": 17,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 86,
    "y": 313,
    "width": 28,
    "height": 24,
    "type": "digits",
    "fontSize": 15,
    "digitGap": 21,
    "maxDigits": 10,
    "align": "left"
  },
  "customField1782075699673": {
    "page": 1,
    "section": "employee",
    "order": 18,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 104,
    "y": 312,
    "width": 95,
    "height": 24,
    "type": "text",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "email": {
    "page": 1,
    "section": "employee",
    "order": 19,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 426,
    "y": 522,
    "width": 230,
    "height": 24,
    "type": "text",
    "fontSize": 15,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "genderMale": {
    "page": 1,
    "section": "employee",
    "order": 19,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 740,
    "y": 357,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "genderFemale": {
    "page": 1,
    "section": "employee",
    "order": 20,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 740,
    "y": 374,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "maritalSingle": {
    "page": 1,
    "section": "employee",
    "order": 21,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 674,
    "y": 355,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "maritalMarried": {
    "page": 1,
    "section": "employee",
    "order": 22,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 590,
    "y": 355,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "maritalDivorced": {
    "page": 1,
    "section": "employee",
    "order": 23,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 500,
    "y": 355,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "maritalWidowed": {
    "page": 1,
    "section": "employee",
    "order": 24,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 674,
    "y": 373,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "customField1782075946735": {
    "page": 1,
    "section": "employee",
    "order": 25,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 601,
    "y": 371,
    "width": 29,
    "height": 24,
    "type": "check",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "residentYes": {
    "page": 1,
    "section": "employee",
    "order": 26,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 412,
    "y": 357,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "residentNo": {
    "page": 1,
    "section": "employee",
    "order": 27,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 412,
    "y": 374,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "kibbutzYes": {
    "page": 1,
    "section": "employee",
    "order": 28,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 306,
    "y": 356,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "kibbutzNo": {
    "page": 1,
    "section": "employee",
    "order": 29,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 306,
    "y": 374,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "healthFundYes": {
    "page": 1,
    "section": "employee",
    "order": 30,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 213,
    "y": 371,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "child1Name": {
    "page": 1,
    "section": "children",
    "order": 30,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 540,
    "y": 685,
    "width": 95,
    "height": 22,
    "type": "text",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "healthFundName": {
    "page": 1,
    "section": "employee",
    "order": 31,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 78,
    "y": 371,
    "width": 85,
    "height": 24,
    "type": "text",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "child1Id": {
    "page": 1,
    "section": "children",
    "order": 31,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 405,
    "y": 685,
    "width": 110,
    "height": 22,
    "type": "digits",
    "fontSize": 14,
    "digitGap": 21,
    "maxDigits": 9,
    "align": "left"
  },
  "child1BirthDate": {
    "page": 1,
    "section": "children",
    "order": 32,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 285,
    "y": 685,
    "width": 100,
    "height": 22,
    "type": "digits",
    "fontSize": 14,
    "digitGap": 21,
    "maxDigits": 8,
    "align": "left"
  },
  "customField1782076968515": {
    "page": 1,
    "section": "employee",
    "order": 32,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 199,
    "y": 352,
    "width": 47,
    "height": 24,
    "type": "check",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "right"
  },
  "child1Mark1": {
    "page": 1,
    "section": "children",
    "order": 33,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 745,
    "y": 685,
    "width": 18,
    "height": 18,
    "type": "check",
    "fontSize": 16,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "child1Mark2": {
    "page": 1,
    "section": "children",
    "order": 34,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 720,
    "y": 685,
    "width": 18,
    "height": 18,
    "type": "check",
    "fontSize": 16,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "workStartDate": {
    "page": 1,
    "section": "income",
    "order": 35,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 95,
    "y": 710,
    "width": 105,
    "height": 24,
    "type": "digits",
    "fontSize": 15,
    "digitGap": 21,
    "maxDigits": 8,
    "align": "left"
  },
  "incomeMonthlySalary": {
    "page": 1,
    "section": "income",
    "order": 36,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 318,
    "y": 700,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "incomeExtraSalary": {
    "page": 1,
    "section": "income",
    "order": 37,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 318,
    "y": 730,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "incomePartialSalary": {
    "page": 1,
    "section": "income",
    "order": 38,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 318,
    "y": 760,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "incomeDailyWage": {
    "page": 1,
    "section": "income",
    "order": 39,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 318,
    "y": 790,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "incomeAllowance": {
    "page": 1,
    "section": "income",
    "order": 40,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 318,
    "y": 820,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "incomeScholarship": {
    "page": 1,
    "section": "income",
    "order": 41,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 318,
    "y": 850,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "otherNoIncome": {
    "page": 1,
    "section": "otherIncome",
    "order": 42,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 335,
    "y": 940,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "otherHasIncome": {
    "page": 1,
    "section": "otherIncome",
    "order": 43,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 335,
    "y": 975,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "spouseId": {
    "page": 1,
    "section": "spouse",
    "order": 44,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 650,
    "y": 1180,
    "width": 115,
    "height": 24,
    "type": "digits",
    "fontSize": 14,
    "digitGap": 21,
    "maxDigits": 9,
    "align": "left"
  },
  "spouseLastName": {
    "page": 1,
    "section": "spouse",
    "order": 45,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 520,
    "y": 1180,
    "width": 100,
    "height": 24,
    "type": "text",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "spouseFirstName": {
    "page": 1,
    "section": "spouse",
    "order": 46,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 395,
    "y": 1180,
    "width": 100,
    "height": 24,
    "type": "text",
    "fontSize": 14,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "page2IdNumber": {
    "page": 2,
    "section": "credits",
    "order": 47,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 128,
    "y": 45,
    "width": 120,
    "height": 24,
    "type": "digits",
    "fontSize": 15,
    "digitGap": 21,
    "maxDigits": 9,
    "align": "left"
  },
  "creditResident": {
    "page": 2,
    "section": "credits",
    "order": 48,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 742,
    "y": 100,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "creditDisabled": {
    "page": 2,
    "section": "credits",
    "order": 49,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 742,
    "y": 145,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "creditSettlement": {
    "page": 2,
    "section": "credits",
    "order": 50,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 742,
    "y": 210,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "creditNewImmigrant": {
    "page": 2,
    "section": "credits",
    "order": 51,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 742,
    "y": 285,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "creditSingleParent": {
    "page": 2,
    "section": "credits",
    "order": 52,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 742,
    "y": 420,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "creditChildrenCustody": {
    "page": 2,
    "section": "credits",
    "order": 53,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 742,
    "y": 500,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "creditSoldier": {
    "page": 2,
    "section": "credits",
    "order": 54,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 742,
    "y": 845,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "creditAcademic": {
    "page": 2,
    "section": "credits",
    "order": 55,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 742,
    "y": 895,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "taxNoIncome": {
    "page": 2,
    "section": "taxCoordination",
    "order": 56,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 742,
    "y": 970,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "taxHasOtherIncome": {
    "page": 2,
    "section": "taxCoordination",
    "order": 57,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 742,
    "y": 1040,
    "width": 20,
    "height": 20,
    "type": "check",
    "fontSize": 18,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  },
  "signatureDate": {
    "page": 2,
    "section": "declaration",
    "order": 58,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 260,
    "y": 1180,
    "width": 115,
    "height": 26,
    "type": "digits",
    "fontSize": 15,
    "digitGap": 21,
    "maxDigits": 8,
    "align": "left"
  },
  "signature": {
    "page": 2,
    "section": "declaration",
    "order": 59,
    "enabled": true,
    "isFixed": false,
    "fixedValue": "",
    "x": 80,
    "y": 1170,
    "width": 140,
    "height": 42,
    "type": "signature",
    "fontSize": 16,
    "digitGap": null,
    "maxDigits": null,
    "align": "center"
  }
} as const;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function onlyDigits(value: unknown) {
  return clean(value).replace(/\D/g, "");
}

function formatDateIL(value?: string) {
  const raw = clean(value);
  if (!raw) return "";

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());

  return `${dd}/${mm}/${yyyy}`;
}

function formatDateDigits(value?: string) {
  const formatted = formatDateIL(value);
  const digits = onlyDigits(formatted);

  if (digits) return digits;

  return onlyDigits(value);
}

function splitId(value?: string) {
  return onlyDigits(value).slice(0, 9);
}

function normalizeTaxYear(value: unknown) {
  const parsed = Number(value || new Date().getFullYear());
  const currentYear = new Date().getFullYear();

  if (!Number.isFinite(parsed)) return currentYear;

  const year = Math.trunc(parsed);

  if (year < 2000 || year > currentYear + 2) {
    return currentYear;
  }

  return year;
}

function toObjectId(value: unknown) {
  const id = clean(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function extractUserId(authResult: any) {
  if (!authResult) return "";

  if (typeof authResult === "string") {
    return authResult;
  }

  return clean(
    authResult.userId ||
      authResult.id ||
      authResult._id ||
      authResult.user?._id ||
      authResult.user?.id
  );
}

function extractBusinessId(authResult: any) {
  if (!authResult || typeof authResult === "string") return "";

  return clean(
    authResult.businessId ||
      authResult.business?._id ||
      authResult.business?.id ||
      authResult.user?.businessId
  );
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadHebrewFont(pdfDoc: PDFDocument) {
  pdfDoc.registerFontkit(fontkit);

  const fontPath = path.join(
    process.cwd(),
    "public",
    "fonts",
    "NotoSansHebrew-Regular.ttf"
  );

  const exists = await fileExists(fontPath);

  if (!exists) {
    throw new Error(
      "HEBREW_FONT_MISSING: missing public/fonts/NotoSansHebrew-Regular.ttf"
    );
  }

  const fontBytes = await fs.readFile(fontPath);
  return pdfDoc.embedFont(fontBytes, { subset: true });
}

function getCredit(body: Form101Payload, key: string) {
  return body.taxCredits?.[key];
}

function extractImageDataUrl(value: unknown) {
  const raw = clean(value);
  if (!raw) return null;

  const match = raw.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);

  if (!match?.[1] || !match?.[2]) return null;

  const imageType = match[1].toLowerCase() === "png" ? "png" : "jpg";

  return {
    imageType,
    base64: match[2],
  };
}

async function drawSignatureImage(
  pdfDoc: PDFDocument,
  page: any,
  signatureDataUrl: unknown,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const imageData = extractImageDataUrl(signatureDataUrl);
  if (!imageData) return false;

  try {
    const imageBytes = Buffer.from(imageData.base64, "base64");

    const image =
      imageData.imageType === "png"
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes);

    page.drawImage(image, {
      x,
      y,
      width,
      height,
    });

    return true;
  } catch (error) {
    console.error("DRAW SIGNATURE IMAGE ERROR:", error);
    return false;
  }
}

function buildPrivateDocumentViewUrl(r2Key: string) {
  return `/api/employee/documents/view?key=${encodeURIComponent(r2Key)}`;
}

function sanitizeFilePart(value: unknown, fallback: string) {
  const cleaned =
    clean(value)
      .replace(/[^\w.\-א-ת]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || fallback;

  return cleaned;
}

function normalizeFieldType(value: unknown): FieldType {
  const raw = clean(value);

  if (raw === "digits") return "digits";
  if (raw === "check") return "check";
  if (raw === "signature") return "signature";

  return "text";
}

function normalizeTextAlign(value: unknown): TextAlign {
  const raw = clean(value);

  if (raw === "left") return "left";
  if (raw === "center") return "center";

  return "right";
}

function normalizeFieldMapItem(rawField: any): FieldMapItem | null {
  if (!rawField || typeof rawField !== "object") return null;

  const page = Number(rawField.page) === 2 ? 2 : 1;
  const x = Number(rawField.x);
  const y = Number(rawField.y);
  const width = Number(rawField.width);
  const height = Number(rawField.height);
  const fontSize = Number(rawField.fontSize);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }

  return {
    page,
    section: clean(rawField.section) || "employee",
    order: Math.max(1, Number(rawField.order) || 1),
    enabled:
      typeof rawField.enabled === "boolean" ? rawField.enabled : true,
    isFixed: Boolean(rawField.isFixed),
    fixedValue: clean(rawField.fixedValue),
    label: clean(rawField.label),
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
    type: normalizeFieldType(rawField.type),
    fontSize: Math.max(6, Number.isFinite(fontSize) ? fontSize : 14),
    digitGap:
      rawField.digitGap === null || rawField.digitGap === undefined
        ? null
        : Math.max(1, Number(rawField.digitGap) || 13),
    digitSpacingMode:
      rawField.digitSpacingMode === "group" ||
      rawField.digitSpacingMode === "custom" ||
      rawField.digitSpacingMode === "date"
        ? rawField.digitSpacingMode
        : "equal",
    digitGaps: Array.isArray(rawField.digitGaps)
      ? rawField.digitGaps
          .map((gap: any) => Math.max(1, Number(gap) || 13))
          .filter((gap: any) => Number.isFinite(gap))
      : [],
    digitGroupSize:
      rawField.digitGroupSize === null || rawField.digitGroupSize === undefined
        ? null
        : Math.max(1, Number(rawField.digitGroupSize) || 3),
    digitGroupSizeMode: rawField.digitGroupSizeMode === "manual" ? "manual" : "auto",
    digitGroupGap:
      rawField.digitGroupGap === null || rawField.digitGroupGap === undefined
        ? null
        : Math.max(0, Number(rawField.digitGroupGap) || 0),
    maxDigits:
      rawField.maxDigits === null || rawField.maxDigits === undefined
        ? null
        : Math.max(1, Number(rawField.maxDigits) || 1),
    align: normalizeTextAlign(rawField.align),
  };
}

function normalizeFieldMap(rawFields: any): FieldMap {
  const source =
    rawFields instanceof Map ? Object.fromEntries(rawFields) : rawFields || {};

  if (!source || typeof source !== "object") {
    return {};
  }

  const normalized: FieldMap = {};

  Object.entries(source).forEach(([key, value]) => {
    const fieldKey = clean(key);
    if (!fieldKey) return;

    const field = normalizeFieldMapItem(value);
    if (!field) return;

    normalized[fieldKey] = field;
  });

  return normalized;
}


function normalizeTemplateSize(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function templateConfigFromSnapshot(snapshot: any): Form101TemplateConfig | null {
  if (!snapshot || typeof snapshot !== "object") return null;

  const fields = normalizeFieldMap(snapshot.fields);

  if (!Object.keys(fields).length) {
    return null;
  }

  return {
    fields,
    pageWidth: normalizeTemplateSize(
      snapshot.pageWidth,
      DEFAULT_MAPPER_PAGE_WIDTH
    ),
    pageHeight: normalizeTemplateSize(
      snapshot.pageHeight,
      DEFAULT_MAPPER_PAGE_HEIGHT
    ),
  };
}

async function loadForm101TemplateConfig(): Promise<Form101TemplateConfig> {
  const template = await Form101Template.findOne({
    name: "default",
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .lean();

  const fields = normalizeFieldMap((template as any)?.fields);

  if (!template || !Object.keys(fields).length) {
    throw new Error(
      "FORM101_TEMPLATE_NOT_FOUND_OR_EMPTY: לא נמצאה תבנית 101 פעילה מהאדמין"
    );
  }

  return {
    fields,
    pageWidth: normalizeTemplateSize(
      (template as any).pageWidth,
      DEFAULT_MAPPER_PAGE_WIDTH
    ),
    pageHeight: normalizeTemplateSize(
      (template as any).pageHeight,
      DEFAULT_MAPPER_PAGE_HEIGHT
    ),
  };
}

async function resolveForm101TemplateConfig(
  body: Form101Payload
): Promise<Form101TemplateConfig> {
  /**
   * הכי חשוב:
   * קודם משתמשים ב-snapshot שהעובד שלח מהמסך.
   * זה אומר שה-PDF נוצר לפי אותה תבנית בדיוק שהעובד מילא:
   * fields, x, y, width, height, fontSize, digitGap, digitSpacingMode וכו'.
   */
  const snapshotConfig = templateConfigFromSnapshot(
    body.__form101TemplateConfig
  );

  if (snapshotConfig) {
    return snapshotConfig;
  }

  /**
   * רק אם לא הגיע snapshot בכלל, טוענים את התבנית הפעילה מהאדמין.
   * אין fallback קשיח למפה ישנה, כדי לא לייצר PDF במיקומים לא נכונים.
   */
  return loadForm101TemplateConfig();
}

function getTemplateSnapshotMeta(body: Form101Payload) {
  const snapshot = body.__form101TemplateConfig;

  const rawId = clean(snapshot?.id || snapshot?._id || "");
  const templateId =
    rawId && mongoose.Types.ObjectId.isValid(rawId)
      ? new mongoose.Types.ObjectId(rawId)
      : null;

  const rawUpdatedAt = snapshot?.updatedAt || null;
  const rawApprovedAt = snapshot?.approvedAt || null;

  const updatedAt = rawUpdatedAt ? new Date(rawUpdatedAt) : null;
  const approvedAt = rawApprovedAt ? new Date(rawApprovedAt) : null;

  return {
    templateId,
    templateUpdatedAt:
      updatedAt && !Number.isNaN(updatedAt.getTime()) ? updatedAt : null,
    templateApprovedAt:
      approvedAt && !Number.isNaN(approvedAt.getTime()) ? approvedAt : null,
  };
}

function buildTemplateSnapshotForStorage(
  templateConfig: Form101TemplateConfig,
  body: Form101Payload
) {
  return {
    id: clean(body.__form101TemplateConfig?.id || body.__form101TemplateConfig?._id || ""),
    updatedAt: body.__form101TemplateConfig?.updatedAt || null,
    approvedAt: body.__form101TemplateConfig?.approvedAt || null,
    fields: templateConfig.fields,
    pageWidth: templateConfig.pageWidth,
    pageHeight: templateConfig.pageHeight,
  };
}

function buildFormFieldValuesForStorage(body: Form101Payload) {
  if (body.formFieldValues && typeof body.formFieldValues === "object") {
    return body.formFieldValues;
  }

  const values: Record<string, any> = {};

  Object.entries(body).forEach(([key, value]) => {
    if (key.startsWith("__")) return;

    if (
      [
        "incomeType",
        "otherIncome",
        "spouse",
        "children",
        "taxCredits",
      ].includes(key)
    ) {
      return;
    }

    values[key] = value;
  });

  return values;
}

function splitPhoneParts(value: unknown) {
  const digits = onlyDigits(value);

  return {
    prefix: digits.slice(0, 3),
    number: digits.slice(3),
  };
}

function getMappedRect(
  page: any,
  field: FieldMapItem,
  templateConfig: Form101TemplateConfig
) {
  const { width: pdfWidth, height: pdfHeight } = page.getSize();

  const mapperPageWidth =
    templateConfig.pageWidth > 0
      ? templateConfig.pageWidth
      : DEFAULT_MAPPER_PAGE_WIDTH;

  const mapperPageHeight =
    templateConfig.pageHeight > 0
      ? templateConfig.pageHeight
      : DEFAULT_MAPPER_PAGE_HEIGHT;

  const scaleX = pdfWidth / mapperPageWidth;
  const scaleY = pdfHeight / mapperPageHeight;

  const x = field.x * scaleX;
  const width = field.width * scaleX;
  const height = field.height * scaleY;

  return {
    x,
    y: pdfHeight - (field.y + field.height) * scaleY,
    width,
    height,
    scaleX,
    scaleY,
    fontSize: Math.max(6, field.fontSize * scaleY),
  };
}


function getValueFromBody(body: Form101Payload, fieldKey: string): unknown {
  const directValues =
    body.formFieldValues && typeof body.formFieldValues === "object"
      ? body.formFieldValues
      : null;

  /**
   * הכי חשוב:
   * הייצוא חייב לקחת קודם את הערך שהעובד מילא בפועל לפי אותו key של השדה.
   * ככה גם שדות מותאמים, שדות ילדים, שדות שהאדמין הוסיף וכו' יוצאים ל-PDF.
   */
  if (
    directValues &&
    Object.prototype.hasOwnProperty.call(directValues, fieldKey)
  ) {
    return directValues[fieldKey];
  }

  const children = Array.isArray(body.children) ? body.children : [];
  const childMatch = fieldKey.match(
    /^child(\d+)(Name|Id|BirthDate|Mark1|Mark2)$/
  );

  if (childMatch) {
    const childIndex = Number(childMatch[1]) - 1;
    const suffix = childMatch[2];
    const child = children[childIndex] || {};

    if (suffix === "Name") return child.name;
    if (suffix === "Id") return splitId(child.idNumber);
    if (suffix === "BirthDate") return formatDateDigits(child.birthDate);

    return Boolean(body[fieldKey]);
  }

  switch (fieldKey) {
    case "taxYear":
      return body.taxYear;

    case "employerName":
      return body.employerName;
    case "employerAddress":
      return body.employerAddress;
    case "employerPhone":
      return body.employerPhone;
    case "employerFileNumber":
      return body.employerFileNumber;

    case "idNumber":
    case "page2IdNumber":
      return splitId(body.idNumber);
    case "lastName":
      return body.lastName;
    case "firstName":
      return body.firstName;
    case "birthDate":
      return formatDateDigits(body.birthDate);
    case "immigrationDate":
      return formatDateDigits(body.immigrationDate);

    case "street":
      return body.street;
    case "houseNumber":
      return body.houseNumber;
    case "city":
      return body.city;
    case "postalCode":
      return body.postalCode;
    case "phone":
      return onlyDigits(body.phone);
    case "phonePrefix":
      return onlyDigits(body.phonePrefix || splitPhoneParts(body.phone).prefix);
    case "phoneNumber":
      return onlyDigits(body.phoneNumber || splitPhoneParts(body.phone).number);
    case "mobile":
      return onlyDigits(body.mobile);
    case "mobilePrefix":
      return onlyDigits(body.mobilePrefix || splitPhoneParts(body.mobile).prefix);
    case "mobileNumber":
      return onlyDigits(body.mobileNumber || splitPhoneParts(body.mobile).number);
    case "email":
      return body.email;

    case "genderMale":
      return body.gender === "male";
    case "genderFemale":
      return body.gender === "female";

    case "maritalSingle":
      return body.maritalStatus === "single";
    case "maritalMarried":
      return body.maritalStatus === "married";
    case "maritalDivorced":
      return body.maritalStatus === "divorced";
    case "maritalWidowed":
      return body.maritalStatus === "widowed";
    case "customField1782075946735":
      return body.maritalStatus === "separated";

    case "residentYes":
      return body.residentIsrael === "yes";
    case "residentNo":
      return body.residentIsrael === "no";

    case "kibbutzYes":
      return body.kibbutzMember === "yes";
    case "kibbutzNo":
      return body.kibbutzMember === "no";

    case "healthFundYes":
      return body.healthFundMember === "yes";
    case "customField1782076968515":
      return body.healthFundMember === "no";
    case "healthFundName":
      return body.healthFundName;

    case "workStartDate":
      return formatDateDigits(body.workStartDate);

    case "incomeMonthlySalary":
      return Boolean(body.incomeType?.monthlySalary);
    case "incomeExtraSalary":
      return Boolean(body.incomeType?.extraSalary);
    case "incomePartialSalary":
      return Boolean(body.incomeType?.partialSalary);
    case "incomeDailyWage":
      return Boolean(body.incomeType?.dailyWage);
    case "incomeAllowance":
      return Boolean(body.incomeType?.allowance);
    case "incomeScholarship":
      return Boolean(body.incomeType?.scholarship);

    case "otherNoIncome":
      return Boolean(body.otherIncome?.noOtherIncome);
    case "otherHasIncome":
      return (
        !body.otherIncome?.noOtherIncome &&
        Boolean(
          body.otherIncome?.monthlySalary ||
            body.otherIncome?.extraSalary ||
            body.otherIncome?.partialSalary ||
            body.otherIncome?.dailyWage ||
            body.otherIncome?.allowance ||
            body.otherIncome?.pension ||
            body.otherIncome?.scholarship
        )
      );

    case "spouseId":
      return splitId(body.spouse?.idNumber);
    case "spouseLastName":
      return body.spouse?.lastName;
    case "spouseFirstName":
      return body.spouse?.firstName;

    case "creditResident":
      return Boolean(getCredit(body, "resident"));
    case "creditDisabled":
      return Boolean(getCredit(body, "disabled100"));
    case "creditSettlement":
      return Boolean(getCredit(body, "settlement"));
    case "creditNewImmigrant":
      return Boolean(getCredit(body, "newImmigrant"));
    case "creditSingleParent":
      return Boolean(getCredit(body, "singleParent"));
    case "creditChildrenCustody":
      return Boolean(getCredit(body, "childrenCustody"));
    case "creditSoldier":
      return Boolean(getCredit(body, "soldier"));
    case "creditAcademic":
      return Boolean(getCredit(body, "academic"));

    case "taxNoIncome":
      return Boolean(getCredit(body, "noIncomeThisYear"));
    case "taxHasOtherIncome":
      return Boolean(getCredit(body, "hasOtherIncomeForTaxCoordination"));

    case "signatureDate":
      return formatDateDigits(body.signatureDate);
    case "signature":
      return body.signatureDataUrl || body.signatureText;

    default:
      return body[fieldKey];
  }
}

function getFieldValue(body: Form101Payload, fieldKey: string, field: FieldMapItem) {
  if (field.isFixed) {
    return field.fixedValue || "";
  }

  return getValueFromBody(body, fieldKey);
}

function hasValue(value: unknown, type: FieldType) {
  if (type === "check") return Boolean(value);
  return Boolean(clean(value));
}

function drawTextInRect(
  page: any,
  text: unknown,
  rect: { x: number; y: number; width: number; height: number; fontSize: number },
  field: FieldMapItem,
  font: any
) {
  const value = clean(text);
  if (!value) return;

  const padding = 2;
  const size = rect.fontSize;
  const textWidth = font.widthOfTextAtSize(value, size);
  const maxX = rect.x + rect.width - padding;

  let x = rect.x + padding;

  if (field.align === "center") {
    x = rect.x + Math.max((rect.width - textWidth) / 2, padding);
  }

  if (field.align === "right") {
    x = Math.max(maxX - textWidth, rect.x + padding);
  }

  const y = rect.y + Math.max((rect.height - size) / 2, 0) + 1;

  page.drawText(value, {
    x,
    y,
    size,
    font,
    color: rgb(0, 0, 0),
    maxWidth: Math.max(rect.width - padding * 2, 5),
  });
}

function getBaseDigitCellWidth(field: FieldMapItem, scaleX: number) {
  return Math.max(1, Number(field.digitGap || 10)) * scaleX;
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

function getResolvedDigitGroupSize(field: FieldMapItem, value: unknown) {
  const fallback = Math.max(1, Number(field.digitGroupSize || 3));

  if (field.digitGroupSizeMode === "manual") {
    return fallback;
  }

  return getAutoDigitGroupSize(value, fallback);
}


function getCustomDigitGapAfterIndex(
  field: FieldMapItem,
  index: number,
  scaleX: number
) {
  if (!Array.isArray(field.digitGaps) || !field.digitGaps.length) return 0;

  const rawGap = Number(field.digitGaps[index]);

  if (!Number.isFinite(rawGap)) return 0;

  return Math.max(0, rawGap) * scaleX;
}

function getGroupGapAfterDigit(
  field: FieldMapItem,
  index: number,
  scaleX: number,
  value: unknown
) {
  /**
   * custom = המרווחים המדויקים שהוגדרו בתבנית.
   * לא ממירים את זה ל-group כדי לא להרוס מרווחים.
   */
  if (field.digitSpacingMode === "custom") {
    return getCustomDigitGapAfterIndex(field, index, scaleX);
  }

  /**
   * date = פורמט תאריך: DDMMYYYY.
   * מוסיף רווח אחרי היום ואחרי החודש אם לא הוגדר custom.
   */
  if (field.digitSpacingMode === "date") {
    if (index === 1 || index === 3) {
      return Math.max(0, Number(field.digitGroupGap || 6)) * scaleX;
    }

    return 0;
  }

  if (field.digitSpacingMode !== "group") return 0;

  const groupSize = getResolvedDigitGroupSize(field, value);
  if (index !== groupSize - 1) return 0;

  return Math.max(0, Number(field.digitGroupGap || 0)) * scaleX;
}

function drawDigitsInRect(
  page: any,
  text: unknown,
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    scaleX: number;
    fontSize: number;
  },
  field: FieldMapItem,
  font: any
) {
  const maxDigits = field.maxDigits || undefined;
  const digits = onlyDigits(text).slice(0, maxDigits);

  if (!digits) return;

  const size = rect.fontSize;
  const digitArray = digits.split("");
  const baseCellWidth = getBaseDigitCellWidth(field, rect.scaleX);

  const totalWidth = Math.max(
    digitArray.reduce((sum, _digit, index) => {
      return sum + baseCellWidth + getGroupGapAfterDigit(field, index, rect.scaleX, digits);
    }, 0),
    1
  );

  let startX = rect.x;

  if (field.align === "center") {
    startX = rect.x + Math.max((rect.width - totalWidth) / 2, 0);
  }

  if (field.align === "right") {
    startX = rect.x + Math.max(rect.width - totalWidth, 0);
  }

  const y = rect.y + Math.max((rect.height - size) / 2, 0) + 1;

  let cursorX = startX;

  digitArray.forEach((digit, index) => {
    const digitWidth = font.widthOfTextAtSize(digit, size);

    page.drawText(digit, {
      x: cursorX + Math.max((baseCellWidth - digitWidth) / 2, 0),
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });

    cursorX += baseCellWidth + getGroupGapAfterDigit(field, index, rect.scaleX, digits);
  });
}

function drawCheckInRect(
  page: any,
  checked: unknown,
  rect: { x: number; y: number; width: number; height: number; fontSize: number },
  font: any
) {
  if (!checked) return;

  const value = "✓";
  const size = Math.max(8, rect.fontSize);
  const textWidth = font.widthOfTextAtSize(value, size);

  page.drawText(value, {
    x: rect.x + Math.max((rect.width - textWidth) / 2, 0),
    y: rect.y + Math.max((rect.height - size) / 2, 0) + 1,
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

async function drawField(
  pdfDoc: PDFDocument,
  pages: any[],
  fieldKey: string,
  field: FieldMapItem,
  body: Form101Payload,
  font: any,
  templateConfig: Form101TemplateConfig
) {
  if (!field.enabled) return;

  const page = pages[field.page - 1];
  if (!page) return;

  const value = getFieldValue(body, fieldKey, field);

  if (!hasValue(value, field.type)) return;

  const rect = getMappedRect(page, field, templateConfig);

  if (field.type === "signature") {
    const signatureDrawn = await drawSignatureImage(
      pdfDoc,
      page,
      body.signatureDataUrl,
      rect.x,
      rect.y,
      rect.width,
      rect.height
    );

    if (!signatureDrawn) {
      drawTextInRect(page, body.signatureText || value, rect, field, font);
    }

    return;
  }

  if (field.type === "check") {
    drawCheckInRect(page, value, rect, font);
    return;
  }

  if (field.type === "digits") {
    drawDigitsInRect(page, value, rect, field, font);
    return;
  }

  drawTextInRect(page, value, rect, field, font);
}


async function generateForm101Pdf(body: Form101Payload) {
  const templatePath = path.join(
    process.cwd(),
    "public",
    "forms",
    "tofes-101.pdf"
  );

  const templateExists = await fileExists(templatePath);

  if (!templateExists) {
    throw new Error("חסר קובץ public/forms/tofes-101.pdf");
  }

  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const font = await loadHebrewFont(pdfDoc);

  const pages = pdfDoc.getPages();

  if (!pages.length) {
    throw new Error("INVALID_TEMPLATE_PDF");
  }

  /**
   * ייצוא לפי אותה תבנית שהעובד ראה במסך:
   * קודם snapshot מהמסך, ורק אם אין — התבנית הפעילה מהאדמין.
   */
  const templateConfig = await resolveForm101TemplateConfig(body);

  const fields = Object.entries(templateConfig.fields)
    .filter(([, field]) => field.enabled)
    .sort(([, a], [, b]) => a.order - b.order) as [string, FieldMapItem][];

  for (const [fieldKey, field] of fields) {
    await drawField(pdfDoc, pages, fieldKey, field, body, font, templateConfig);
  }

  const pdfBytes = await pdfDoc.save();

  return {
    pdfBuffer: Buffer.from(pdfBytes),
    templateConfig,
  };
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);
    const employeeIdString = extractUserId(auth);
    const businessIdString = extractBusinessId(auth);

    const employeeObjectId = toObjectId(employeeIdString);
    const businessObjectId = toObjectId(businessIdString);

    if (!employeeObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "לא נמצאה הרשאת עובד תקינה",
        },
        { status: 401 }
      );
    }

    if (!R2_BUCKET_NAME) {
      return NextResponse.json(
        {
          success: false,
          error: "R2_BUCKET_MISSING",
          message: "חסר R2_BUCKET_NAME בהגדרות השרת",
        },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as Form101Payload | null;

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_BODY",
          message: "הטופס לא התקבל בצורה תקינה",
        },
        { status: 400 }
      );
    }

    const taxYear = normalizeTaxYear(body.taxYear);

    const existingActiveForm = await EmployeeForm101.findOne({
      employeeId: employeeObjectId,
      taxYear,
      documentType: "form101",
      status: { $in: ["uploaded", "approved"] },
    })
      .select("_id status fileUrl")
      .lean();

    if (existingActiveForm) {
      return NextResponse.json(
        {
          success: false,
          error: "FORM101_ALREADY_SUBMITTED",
          message:
            existingActiveForm.status === "approved"
              ? "טופס 101 כבר אושר ולא ניתן לשלוח מחדש"
              : "טופס 101 כבר נשלח וממתין לבדיקה",
          documentId: String(existingActiveForm._id),
          fileUrl: existingActiveForm.fileUrl,
        },
        { status: 409 }
      );
    }

    const normalizedBody: Form101Payload = {
      ...body,
      taxYear: String(taxYear),
    };

    const { pdfBuffer, templateConfig } = await generateForm101Pdf(normalizedBody);

    const templateMeta = getTemplateSnapshotMeta(normalizedBody);
    const formFieldValues = buildFormFieldValuesForStorage(normalizedBody);
    const templateSnapshot = buildTemplateSnapshotForStorage(
      templateConfig,
      normalizedBody
    );

    const now = new Date();
    const timestamp = now.getTime();
    const randomId = crypto.randomUUID();

    const employeePart = sanitizeFilePart(employeeIdString, "employee");
    const originalFileName = `טופס-101-${taxYear}.pdf`;
    const storedFileName = `form101-${taxYear}-${employeePart}-${timestamp}-${randomId}.pdf`;

    const r2Key = [
      "employee-documents",
      employeeIdString,
      "form101",
      String(taxYear),
      storedFileName,
    ].join("/");

    const fileUrl = buildPrivateDocumentViewUrl(r2Key);

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
        Body: pdfBuffer,
        ContentType: "application/pdf",
        ContentDisposition: `inline; filename="${encodeURIComponent(storedFileName)}"`,
        CacheControl: "no-store",
      })
    );

    const employeeUser = await User.findById(employeeObjectId).lean();
    const employeeSnapshot = buildEmployeeSnapshot(employeeUser);

    const document = await EmployeeForm101.create({
      employeeId: employeeObjectId,
      businessId: businessObjectId,

      ...employeeSnapshot,

      documentType: "form101",

      originalFileName,
      storedFileName,
      r2Key,
      fileUrl,
      fileType: "application/pdf",
      fileSize: pdfBuffer.length,

      taxYear,

      formFieldValues,
      templateSnapshot,
      templateId: templateMeta.templateId,
      templateUpdatedAt: templateMeta.templateUpdatedAt,
      templateApprovedAt: templateMeta.templateApprovedAt,

      status: "uploaded",
      rejectionReason: "",

      uploadedAt: now,
      approvedAt: null,
      rejectedAt: null,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="form-101-${taxYear}.pdf"`,
        "Cache-Control": "no-store",
        "X-Success": "true",
        "X-Document-Id": String(document._id),
        "X-File-Url": fileUrl,
        "X-R2-Key": r2Key,
      },
    });
  } catch (error) {
    console.error("GENERATE AND SAVE FORM 101 PDF ERROR:", error);

    
    const message =
      error instanceof Error ? error.message : "GENERATE_PDF_FAILED";

    return NextResponse.json(
      {
        success: false,
        error: "GENERATE_PDF_FAILED",
        message,
      },
      { status: 500 }
    );
  }
}
