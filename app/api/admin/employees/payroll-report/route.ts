import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import SoftphoneWorkSession from "@/models/SoftphoneWorkSession";

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
  status?: string;
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

type SaleSummary = {
  count: number;
  totalSales: number;
  totalCommission: number;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getMongoDb() {
  const mongoDb = mongoose.connection.db;

  if (!mongoDb) {
    throw new Error("החיבור למסד הנתונים לא זמין");
  }

  return mongoDb;
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
  return toNumber(employee.hourlyRate);
}

function getTravelPayment(employee: PlainEmployee) {
  return toNumber(employee.travelAmount) || toNumber(employee.travelPay);
}

function getSessionStart(session: Record<string, unknown>) {
  return (
    session.startTime ||
    session.startedAt ||
    session.shiftStart ||
    session.clockInAt ||
    session.createdAt ||
    null
  );
}

function getSessionEnd(session: Record<string, unknown>) {
  return (
    session.endTime ||
    session.endedAt ||
    session.shiftEnd ||
    session.clockOutAt ||
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
    toNumber(session.minutes) ||
    toNumber(session.durationMinutes) ||
    toNumber(session.workMinutes);

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

function getRawId(value: unknown) {
  if (!value) return "";

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  return cleanStr(String(value));
}

function getEmployeeIdFromSale(sale: Record<string, unknown>) {
  return (
    getRawId(sale.employeeId) ||
    getRawId(sale.staffId) ||
    getRawId(sale.sellerId) ||
    getRawId(sale.createdBy) ||
    getRawId(sale.userId) ||
    getRawId(sale.workerId)
  );
}

function getSaleDate(sale: Record<string, unknown>) {
  return sale.createdAt || sale.saleDate || sale.paidAt || sale.updatedAt || null;
}

function getSaleAmount(sale: Record<string, unknown>) {
  return (
    toNumber(sale.totalAmount) ||
    toNumber(sale.amount) ||
    toNumber(sale.price) ||
    toNumber(sale.total) ||
    toNumber(sale.finalPrice)
  );
}

function getSaleCommission(sale: Record<string, unknown>) {
  return (
    toNumber(sale.employeeCommission) ||
    toNumber(sale.commission) ||
    toNumber(sale.commissionAmount) ||
    toNumber(sale.staffCommission) ||
    toNumber(sale.workerCommission)
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
      { role: "staff" },
      { role: "employee" },
      { staffType: { $exists: true, $ne: "" } },
    ],
  })
    .lean<PlainEmployee[]>()
    .exec();

  return employees;
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
    ],
    $and: [
      {
        $or: [
          { startTime: { $gte: start, $lt: end } },
          { startedAt: { $gte: start, $lt: end } },
          { shiftStart: { $gte: start, $lt: end } },
          { clockInAt: { $gte: start, $lt: end } },
          { createdAt: { $gte: start, $lt: end } },
        ],
      },
    ],
  })
    .lean<Record<string, unknown>[]>()
    .exec();

  const map = new Map<string, number>();

  for (const session of sessions) {
    const rawEmployeeId =
      getRawId(session.employeeId) ||
      getRawId(session.staffId) ||
      getRawId(session.userId);

    if (!rawEmployeeId) continue;

    const hours = getSessionHours(session);
    map.set(rawEmployeeId, round2((map.get(rawEmployeeId) || 0) + hours));
  }

  return map;
}

async function getSalesByMonth(employeeIds: string[], start: Date, end: Date) {
  const salesCollections = ["staffsales", "sales", "adminsales", "orders"];
  const map = new Map<string, SaleSummary>();
  const mongoDb = getMongoDb();

  for (const collectionName of salesCollections) {
    try {
      const collectionExists = await mongoDb
        .listCollections({ name: collectionName })
        .hasNext();

      if (!collectionExists) continue;

      const sales = await mongoDb
        .collection<Record<string, unknown>>(collectionName)
        .find({
          $or: [
            { employeeId: { $in: employeeIds } },
            { staffId: { $in: employeeIds } },
            { sellerId: { $in: employeeIds } },
            { createdBy: { $in: employeeIds } },
            { userId: { $in: employeeIds } },
            { workerId: { $in: employeeIds } },
          ],
          $and: [
            {
              $or: [
                { createdAt: { $gte: start, $lt: end } },
                { saleDate: { $gte: start, $lt: end } },
                { paidAt: { $gte: start, $lt: end } },
              ],
            },
          ],
        })
        .toArray();

      for (const sale of sales) {
        const saleDate = getSaleDate(sale);

        if (saleDate) {
          const date = new Date(String(saleDate));

          if (
            Number.isNaN(date.getTime()) ||
            date.getTime() < start.getTime() ||
            date.getTime() >= end.getTime()
          ) {
            continue;
          }
        }

        const employeeId = getEmployeeIdFromSale(sale);
        if (!employeeId) continue;

        const current = map.get(employeeId) || {
          count: 0,
          totalSales: 0,
          totalCommission: 0,
        };

        current.count += 1;
        current.totalSales += getSaleAmount(sale);
        current.totalCommission += getSaleCommission(sale);

        map.set(employeeId, current);
      }
    } catch (error) {
      console.warn(`PAYROLL SALES COLLECTION SKIPPED: ${collectionName}`, error);
    }
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
    const totalHours = round2(hoursMap.get(employeeId) || 0);
    const hourlyRate = getHourlyRate(employee);
    const hoursPayment = round2(totalHours * hourlyRate);
    const travelPayment = getTravelPayment(employee);

    const sales = salesMap.get(employeeId) || {
      count: 0,
      totalSales: 0,
      totalCommission: 0,
    };

    const commissionTotal = round2(sales.totalCommission);
    const totalPayment = round2(hoursPayment + travelPayment + commissionTotal);

    return {
      employeeId,
      name: getEmployeeName(employee),
      idNumber: getEmployeeIdNumber(employee),
      phone: cleanStr(employee.phone),
      address: cleanStr(employee.address),
      email: cleanStr(employee.email),
      totalHours,
      hourlyRate,
      hoursPayment,
      travelPayment,
      salesCount: sales.count,
      salesTotal: round2(sales.totalSales),
      commissionTotal,
      totalPayment,
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
  sheet.getColumn(7).numFmt = '₪#,##0.00';
  sheet.getColumn(8).numFmt = '₪#,##0.00';
  sheet.getColumn(9).numFmt = '₪#,##0.00';
  sheet.getColumn(11).numFmt = '₪#,##0.00';
  sheet.getColumn(12).numFmt = '₪#,##0.00';
  sheet.getColumn(13).numFmt = '₪#,##0.00';
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