import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import SoftphoneWorkSession from "@/models/SoftphoneWorkSession";
import EmployeeSale from "@/models/EmployeeSale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlainEmployee = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  idNumber?: string;
  employeeIdNumber?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  hourlyRate?: number;
  travelAmount?: number;
  travelPay?: number;
  role?: string;
  staffType?: string;
  type?: string;
  userType?: string;
  status?: string;
  isEmployee?: boolean;
  employee?: boolean;
  isStaff?: boolean;
  staff?: boolean;
};

type SaleSummary = {
  count: number;
  totalSalesCents: number;
  totalCommissionCents: number;
};

type PayrollEmployeeRow = {
  employeeId: string;
  name: string;
  idNumber: string;
  phone: string;
  address: string;
  email: string;
  totalHours: number;
  hourlyRate: number;
  hoursPayment: number;
  travelPayment: number;
  salesCount: number;
  salesTotal: number;
  commissionTotal: number;
  totalPayment: number;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanLower(value: unknown) {
  return cleanStr(value).toLowerCase();
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getRawId(value: unknown) {
  if (!value) return "";

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "_id" in value &&
    value._id
  ) {
    return getRawId(value._id);
  }

  return String(value).trim();
}

function moneyToCents(value: unknown) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100);
  }

  if (typeof value === "string") {
    const cleaned = value
      .trim()
      .replace(/[₪,\s]/g, "")
      .replace(/[^\d.-]/g, "");

    const numberValue = Number(cleaned);

    if (!Number.isFinite(numberValue)) return 0;

    return Math.round(numberValue * 100);
  }

  return 0;
}

function centsToMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return value / 100;
}

function roundHours(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10000) / 10000;
}

function getMonthRange(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);

  if (!match) {
    throw new Error("חודש לא תקין. יש לשלוח month בפורמט YYYY-MM");
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error("חודש לא תקין");
  }

  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);

  return {
    year,
    monthNumber: monthIndex + 1,
    start,
    end,
  };
}

function isRealEmployee(employee: PlainEmployee) {
  const role = cleanLower(employee.role);
  const staffType = cleanLower(employee.staffType);
  const type = cleanLower(employee.type);
  const userType = cleanLower(employee.userType);

  const blockedValues = [
    "admin",
    "user",
    "client",
    "customer",
    "producer",
    "venue_owner",
    "venueowner",
    "venue",
    "owner",
  ];

  if (blockedValues.includes(role)) return false;
  if (blockedValues.includes(staffType)) return false;
  if (blockedValues.includes(type)) return false;
  if (blockedValues.includes(userType)) return false;

  const allowedValues = [
    "staff",
    "employee",
    "worker",
    "representative",
    "sales",
    "caller",
    "call_agent",
    "phone_agent",
    "support",
  ];

  if (allowedValues.includes(role)) return true;
  if (allowedValues.includes(staffType)) return true;
  if (allowedValues.includes(type)) return true;
  if (allowedValues.includes(userType)) return true;

  if (employee.isEmployee === true) return true;
  if (employee.employee === true) return true;
  if (employee.isStaff === true) return true;
  if (employee.staff === true) return true;

  return false;
}

function getEmployeeName(employee: PlainEmployee) {
  return (
    cleanStr(employee.fullName) ||
    cleanStr(employee.name) ||
    cleanStr(employee.email) ||
    "עובד ללא שם"
  );
}

function getEmployeeIdNumber(employee: PlainEmployee) {
  return cleanStr(employee.idNumber) || cleanStr(employee.employeeIdNumber);
}

function getHourlyRate(employee: PlainEmployee) {
  return centsToMoney(moneyToCents(employee.hourlyRate));
}

function getTravelPayment(employee: PlainEmployee) {
  return centsToMoney(
    moneyToCents(employee.travelAmount) || moneyToCents(employee.travelPay)
  );
}

function getSessionStart(session: Record<string, unknown>) {
  return (
    session.startedAt ||
    session.startTime ||
    session.actualStart ||
    session.softphoneStart ||
    session.clockIn ||
    session.clockInAt ||
    session.loginAt ||
    session.startAt ||
    session.shiftStart ||
    session.createdAt ||
    null
  );
}

function getSessionEnd(session: Record<string, unknown>) {
  const status = String(session.status || "").toLowerCase();
  const isOpen =
    status !== "closed" &&
    status !== "ended" &&
    (session.endedAt == null || session.endedAt === "");

  if (isOpen) {
    return null;
  }

  return (
    session.endedAt ||
    session.endTime ||
    session.actualEnd ||
    session.softphoneEnd ||
    session.clockOut ||
    session.clockOutAt ||
    session.logoutAt ||
    session.endAt ||
    session.shiftEnd ||
    session.updatedAt ||
    null
  );
}

function getSessionHours(session: Record<string, unknown>) {
  const explicitHours =
    toNumber(session.totalHours) ||
    toNumber(session.hours) ||
    toNumber(session.durationHours) ||
    toNumber(session.workHours);

  if (explicitHours > 0) return explicitHours;

  const explicitMinutes =
    toNumber(session.totalMinutes) ||
    toNumber(session.workMinutes) ||
    toNumber(session.minutes) ||
    toNumber(session.durationMinutes);

  if (explicitMinutes > 0) return explicitMinutes / 60;

  const start = getSessionStart(session);
  const end = getSessionEnd(session);

  if (!start || !end) return 0;

  const startDate = new Date(String(start));
  const endDate = new Date(String(end));

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }

  const diffMs = endDate.getTime() - startDate.getTime();

  if (diffMs <= 0) return 0;

  return diffMs / 1000 / 60 / 60;
}

function isDateInRange(value: unknown, start: Date, end: Date) {
  if (!value) return false;

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() >= start.getTime() && date.getTime() < end.getTime();
}

function getSaleDate(sale: Record<string, unknown>) {
  return (
    sale.paidAt ||
    sale.saleDate ||
    sale.soldAt ||
    sale.createdAt ||
    sale.updatedAt ||
    null
  );
}

function getSaleEmployeeId(sale: Record<string, unknown>) {
  return (
    getRawId(sale.employeeId) ||
    getRawId(sale.staffId) ||
    getRawId(sale.sellerId) ||
    getRawId(sale.workerId) ||
    getRawId(sale.createdBy)
  );
}

function getSaleAmountCents(sale: Record<string, unknown>) {
  return (
    moneyToCents(sale.grossAmount) ||
    moneyToCents(sale.dealAmountAfterVat) ||
    moneyToCents(sale.netAmount) ||
    moneyToCents(sale.totalAmount) ||
    moneyToCents(sale.amount) ||
    moneyToCents(sale.price) ||
    moneyToCents(sale.total) ||
    moneyToCents(sale.finalPrice)
  );
}

function getSaleCommissionCents(sale: Record<string, unknown>) {
  return (
    moneyToCents(sale.commissionAmount) ||
    moneyToCents(sale.employeeCommission) ||
    moneyToCents(sale.commission) ||
    moneyToCents(sale.staffCommission) ||
    moneyToCents(sale.workerCommission)
  );
}

function isCancelledSale(sale: Record<string, unknown>) {
  const status = cleanLower(sale.status);

  return (
    status === "cancelled" ||
    status === "canceled" ||
    status === "refunded" ||
    status === "deleted"
  );
}

function formatMonthLabel(monthNumber: number, year: number) {
  return `${String(monthNumber).padStart(2, "0")}/${year}`;
}

function formatDateTime(value: Date) {
  return value.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getEmployees() {
  const employees = await User.find({
    $or: [
      {
        role: {
          $in: [
            "staff",
            "employee",
            "worker",
            "representative",
            "sales",
            "caller",
            "call_agent",
            "phone_agent",
            "support",
          ],
        },
      },
      {
        staffType: {
          $in: [
            "staff",
            "employee",
            "worker",
            "representative",
            "sales",
            "caller",
            "call_agent",
            "phone_agent",
            "support",
          ],
        },
      },
      { isEmployee: true },
      { employee: true },
      { isStaff: true },
      { staff: true },
    ],
    role: { $nin: ["user", "client", "customer", "producer", "venue_owner"] },
  })
    .select(
      "_id name fullName email phone address idNumber employeeIdNumber startDate endDate hourlyRate travelAmount travelPay role staffType type userType status isEmployee employee isStaff staff"
    )
    .lean()
    .exec();

  return (employees as PlainEmployee[]).filter(isRealEmployee);
}

async function getEmployeeHoursByMonth(
  employeeIds: string[],
  start: Date,
  end: Date
) {
  const objectIds = employeeIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const sessions = await SoftphoneWorkSession.find({
    $or: [
      { employeeId: { $in: employeeIds } },
      { employeeId: { $in: objectIds } },
      { staffId: { $in: employeeIds } },
      { staffId: { $in: objectIds } },
      { userId: { $in: employeeIds } },
      { userId: { $in: objectIds } },
      { workerId: { $in: employeeIds } },
      { workerId: { $in: objectIds } },
    ],
    $and: [
      {
        $or: [
          { startedAt: { $gte: start, $lt: end } },
          { startTime: { $gte: start, $lt: end } },
          { actualStart: { $gte: start, $lt: end } },
          { softphoneStart: { $gte: start, $lt: end } },
          { clockIn: { $gte: start, $lt: end } },
          { clockInAt: { $gte: start, $lt: end } },
          { loginAt: { $gte: start, $lt: end } },
          { startAt: { $gte: start, $lt: end } },
          { shiftStart: { $gte: start, $lt: end } },
          { createdAt: { $gte: start, $lt: end } },
        ],
      },
    ],
  })
    .lean<Record<string, unknown>[]>()
    .exec();

  const map = new Map<string, number>();

  for (const session of sessions) {
    const employeeId =
      getRawId(session.employeeId) ||
      getRawId(session.staffId) ||
      getRawId(session.userId) ||
      getRawId(session.workerId);

    if (!employeeId) continue;

    const hours = getSessionHours(session);
    map.set(employeeId, roundHours((map.get(employeeId) || 0) + hours));
  }

  return map;
}

async function getSalesByMonth(employeeIds: string[], start: Date, end: Date) {
  const objectIds = employeeIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const sales = await EmployeeSale.find({
    $or: [
      { employeeId: { $in: employeeIds } },
      { employeeId: { $in: objectIds } },
      { staffId: { $in: employeeIds } },
      { staffId: { $in: objectIds } },
      { sellerId: { $in: employeeIds } },
      { sellerId: { $in: objectIds } },
      { workerId: { $in: employeeIds } },
      { workerId: { $in: objectIds } },
      { createdBy: { $in: employeeIds } },
      { createdBy: { $in: objectIds } },
    ],
    $and: [
      {
        $or: [
          { paidAt: { $gte: start, $lt: end } },
          { saleDate: { $gte: start, $lt: end } },
          { soldAt: { $gte: start, $lt: end } },
          { createdAt: { $gte: start, $lt: end } },
        ],
      },
    ],
  })
    .lean<Record<string, unknown>[]>()
    .exec();

  const map = new Map<string, SaleSummary>();

  for (const sale of sales) {
    if (isCancelledSale(sale)) continue;

    const saleDate = getSaleDate(sale);
    if (!isDateInRange(saleDate, start, end)) continue;

    const employeeId = getSaleEmployeeId(sale);
    if (!employeeId) continue;

    const current = map.get(employeeId) || {
      count: 0,
      totalSalesCents: 0,
      totalCommissionCents: 0,
    };

    current.count += 1;
    current.totalSalesCents += getSaleAmountCents(sale);
    current.totalCommissionCents += getSaleCommissionCents(sale);

    map.set(employeeId, current);
  }

  return map;
}

function buildRows(
  employees: PlainEmployee[],
  hoursMap: Map<string, number>,
  salesMap: Map<string, SaleSummary>
): PayrollEmployeeRow[] {
  return employees.map((employee) => {
    const employeeId = String(employee._id);

    const totalHours = roundHours(hoursMap.get(employeeId) || 0);

    const hourlyRateCents = moneyToCents(employee.hourlyRate);
    const hoursPaymentCents = Math.round(totalHours * hourlyRateCents);

    const travelPaymentCents =
      moneyToCents(employee.travelAmount) || moneyToCents(employee.travelPay);

    const sales = salesMap.get(employeeId) || {
      count: 0,
      totalSalesCents: 0,
      totalCommissionCents: 0,
    };

    const totalPaymentCents =
      hoursPaymentCents + travelPaymentCents + sales.totalCommissionCents;

    return {
      employeeId,
      name: getEmployeeName(employee),
      idNumber: getEmployeeIdNumber(employee),
      phone: cleanStr(employee.phone),
      address: cleanStr(employee.address),
      email: cleanStr(employee.email),
      totalHours,
      hourlyRate: centsToMoney(hourlyRateCents),
      hoursPayment: centsToMoney(hoursPaymentCents),
      travelPayment: centsToMoney(travelPaymentCents),
      salesCount: sales.count,
      salesTotal: centsToMoney(sales.totalSalesCents),
      commissionTotal: centsToMoney(sales.totalCommissionCents),
      totalPayment: centsToMoney(totalPaymentCents),
    };
  });
}

function applyBaseCellStyle(cell: ExcelJS.Cell) {
  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  cell.border = {
    top: { style: "thin", color: { argb: "E2E8F0" } },
    left: { style: "thin", color: { argb: "E2E8F0" } },
    bottom: { style: "thin", color: { argb: "E2E8F0" } },
    right: { style: "thin", color: { argb: "E2E8F0" } },
  };
}

function styleWorksheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ rightToLeft: true, showGridLines: false }];

  sheet.columns = [
    { key: "name", width: 24 },
    { key: "idNumber", width: 16 },
    { key: "phone", width: 16 },
    { key: "address", width: 30 },
    { key: "email", width: 30 },
    { key: "totalHours", width: 14 },
    { key: "hourlyRate", width: 14 },
    { key: "hoursPayment", width: 16 },
    { key: "travelPayment", width: 14 },
    { key: "salesCount", width: 14 },
    { key: "salesTotal", width: 16 },
    { key: "commissionTotal", width: 16 },
    { key: "totalPayment", width: 18 },
  ];

  sheet.eachRow((row: ExcelJS.Row) => {
    row.eachCell((cell: ExcelJS.Cell) => {
      applyBaseCellStyle(cell);
    });
  });

  sheet.getColumn(6).numFmt = "#,##0.00";
  sheet.getColumn(7).numFmt = "₪#,##0.00";
  sheet.getColumn(8).numFmt = "₪#,##0.00";
  sheet.getColumn(9).numFmt = "₪#,##0.00";
  sheet.getColumn(11).numFmt = "₪#,##0.00";
  sheet.getColumn(12).numFmt = "₪#,##0.00";
  sheet.getColumn(13).numFmt = "₪#,##0.00";
}

function buildWorkbook(rows: PayrollEmployeeRow[], monthLabel: string) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Invistimo Admin";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet("דוח משכורת חודשי", {
    views: [{ rightToLeft: true, showGridLines: false }],
  });

  sheet.mergeCells("A1:M1");
  sheet.getCell("A1").value = `דוח משכורת חודשי - ${monthLabel}`;
  sheet.getCell("A1").font = {
    bold: true,
    size: 22,
    color: { argb: "1E1B4B" },
  };
  sheet.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "EEF2FF" },
  };
  sheet.getRow(1).height = 38;

  sheet.mergeCells("A2:M2");
  sheet.getCell("A2").value = `תאריך ייצוא: ${formatDateTime(new Date())}`;
  sheet.getCell("A2").font = {
    bold: true,
    size: 11,
    color: { argb: "64748B" },
  };
  sheet.getCell("A2").alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  sheet.getRow(2).height = 24;

  sheet.addRow([]);

  const headerRow = sheet.addRow([
    "שם מלא",
    "תעודת זהות",
    "טלפון",
    "כתובת",
    "מייל",
    "סה״כ שעות",
    "שכר לשעה",
    "שכר שעות",
    "נסיעות",
    "כמות מכירות",
    "סך מכירות",
    "עמלות",
    "סה״כ לתשלום",
  ]);

  headerRow.height = 34;

  headerRow.eachCell((cell: ExcelJS.Cell) => {
    cell.font = {
      bold: true,
      size: 11,
      color: { argb: "FFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4F46E5" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "4338CA" } },
      left: { style: "thin", color: { argb: "4338CA" } },
      bottom: { style: "thin", color: { argb: "4338CA" } },
      right: { style: "thin", color: { argb: "4338CA" } },
    };
  });

  for (const row of rows) {
    sheet.addRow([
      row.name,
      row.idNumber || "—",
      row.phone || "—",
      row.address || "—",
      row.email || "—",
      row.totalHours,
      row.hourlyRate,
      row.hoursPayment,
      row.travelPayment,
      row.salesCount,
      row.salesTotal,
      row.commissionTotal,
      row.totalPayment,
    ]);
  }

  const firstDataRow = 5;
  const lastDataRow = rows.length + 4;

  const summaryRow = sheet.addRow([
    "סה״כ",
    "",
    "",
    "",
    "",
    rows.length ? { formula: `SUM(F${firstDataRow}:F${lastDataRow})` } : 0,
    "",
    rows.length ? { formula: `SUM(H${firstDataRow}:H${lastDataRow})` } : 0,
    rows.length ? { formula: `SUM(I${firstDataRow}:I${lastDataRow})` } : 0,
    rows.length ? { formula: `SUM(J${firstDataRow}:J${lastDataRow})` } : 0,
    rows.length ? { formula: `SUM(K${firstDataRow}:K${lastDataRow})` } : 0,
    rows.length ? { formula: `SUM(L${firstDataRow}:L${lastDataRow})` } : 0,
    rows.length ? { formula: `SUM(M${firstDataRow}:M${lastDataRow})` } : 0,
  ]);

  summaryRow.height = 34;

  summaryRow.eachCell((cell: ExcelJS.Cell) => {
    cell.font = {
      bold: true,
      size: 12,
      color: { argb: "064E3B" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D1FAE5" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "10B981" } },
      left: { style: "thin", color: { argb: "10B981" } },
      bottom: { style: "thin", color: { argb: "10B981" } },
      right: { style: "thin", color: { argb: "10B981" } },
    };
  });

  styleWorksheet(sheet);

  sheet.autoFilter = {
    from: "A4",
    to: "M4",
  };

  sheet.views = [
    {
      rightToLeft: true,
      showGridLines: false,
      state: "frozen",
      ySplit: 4,
    },
  ];

  return workbook;
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);
    const month = cleanStr(searchParams.get("month"));

    const { year, monthNumber, start, end } = getMonthRange(month);
    const monthLabel = formatMonthLabel(monthNumber, year);

    const employees = await getEmployees();
    const employeeIds = employees.map((employee) => String(employee._id));

    const [hoursMap, salesMap] = await Promise.all([
      getEmployeeHoursByMonth(employeeIds, start, end),
      getSalesByMonth(employeeIds, start, end),
    ]);

    const rows = buildRows(employees, hoursMap, salesMap);
    const workbook = buildWorkbook(rows, monthLabel);

    const excelBuffer = await workbook.xlsx.writeBuffer();
    const nodeBuffer = Buffer.from(excelBuffer);

    const fileName = encodeURIComponent(
      `דוח_משכורת_חודשי_${String(monthNumber).padStart(2, "0")}_${year}.xlsx`
    );

    return new NextResponse(nodeBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("EXPORT PAYROLL REPORT FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "שגיאה בייצוא דוח משכורת",
      },
      { status: 500 }
    );
  }
}