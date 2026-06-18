import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import EmployeeSale from "@/models/EmployeeSale";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      details,
    },
    { status }
  );
}

function monthRange(month?: string | null) {
  const cleanMonth = cleanStr(month);

  if (!cleanMonth || !/^\d{4}-\d{2}$/.test(cleanMonth)) {
    return null;
  }

  const [yearRaw, monthRaw] = cleanMonth.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return null;
  }

  return {
    start: new Date(year, monthIndex, 1, 0, 0, 0, 0),
    end: new Date(year, monthIndex + 1, 1, 0, 0, 0, 0),
  };
}

function getSaleDate(sale: any) {
  return sale.paidAt || sale.stripePaidAt || sale.createdAt || sale.updatedAt || null;
}

function serializeSale(sale: any) {
  const grossAmount = cleanNumber(sale.grossAmount || sale.payment?.amount || 0);
  const netAmount = cleanNumber(sale.netAmount || 0);
  const beforeVat =
    netAmount > 0 ? netAmount : Number((grossAmount / 1.18).toFixed(2));
  const afterVat = grossAmount > 0 ? grossAmount : Number((beforeVat * 1.18).toFixed(2));
  const commission =
    cleanNumber(sale.commissionAmount) > 0
      ? cleanNumber(sale.commissionAmount)
      : Number((beforeVat * 0.05).toFixed(2));

  return {
    id: String(sale._id || sale.id || ""),
    employeeId: String(sale.employeeId || ""),
    employeeName: cleanStr(sale.employeeName),
    employeeEmail: cleanStr(sale.employeeEmail),

    saleTitle:
      cleanStr(sale.packageName) ||
      cleanStr(sale.selectedPackage?.title) ||
      cleanStr(sale.selectedPackage?.customerSummary) ||
      cleanStr(sale.plan) ||
      "מכירה",

    clientName: cleanStr(sale.clientName),
    clientEmail: cleanStr(sale.clientEmail),
    clientPhone: cleanStr(sale.clientPhone),

    eventName: cleanStr(sale.eventName),
    eventDate: sale.eventDate ? new Date(sale.eventDate).toISOString() : "",
    eventCity: cleanStr(sale.eventCity),
    venueName: cleanStr(sale.venueName),

    dealAmountBeforeVat: beforeVat,
    dealAmountAfterVat: afterVat,
    commissionRate: 5,
    commissionAmount: commission,

    paymentMode: cleanStr(sale.paymentMode || sale.payment?.mode),
    paymentProvider: cleanStr(sale.paymentProvider || sale.payment?.provider),
    status: cleanStr(sale.status || sale.payment?.status || "pending"),

    saleDate: getSaleDate(sale) ? new Date(getSaleDate(sale)).toISOString() : "",
    paidAt: sale.paidAt ? new Date(sale.paidAt).toISOString() : "",
    createdAt: sale.createdAt ? new Date(sale.createdAt).toISOString() : "",
    notes: cleanStr(sale.notes),
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  try {
    await db();

    const { employeeId } = await context.params;

    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return jsonError("מזהה עובד לא תקין", 400);
    }

    const { searchParams } = new URL(req.url);
    const month = cleanStr(searchParams.get("month"));
    const status = cleanStr(searchParams.get("status")) || "all";

    const query: Record<string, any> = {
      employeeId: new mongoose.Types.ObjectId(employeeId),
    };

    if (status !== "all") {
      query.status = status;
    }

    const range = monthRange(month);

    if (range) {
      query.$or = [
        {
          paidAt: {
            $gte: range.start,
            $lt: range.end,
          },
        },
        {
          paidAt: null,
          createdAt: {
            $gte: range.start,
            $lt: range.end,
          },
        },
      ];
    }

    const sales = await EmployeeSale.find(query)
      .sort({ paidAt: -1, createdAt: -1 })
      .lean();

    const serializedSales = sales.map(serializeSale);

    const totals = serializedSales.reduce(
      (acc, sale) => {
        acc.salesCount += 1;
        acc.totalBeforeVat += sale.dealAmountBeforeVat;
        acc.totalAfterVat += sale.dealAmountAfterVat;
        acc.totalCommission += sale.commissionAmount;

        if (sale.status === "paid") {
          acc.paidSalesCount += 1;
          acc.paidBeforeVat += sale.dealAmountBeforeVat;
          acc.paidAfterVat += sale.dealAmountAfterVat;
          acc.paidCommission += sale.commissionAmount;
        }

        return acc;
      },
      {
        salesCount: 0,
        totalBeforeVat: 0,
        totalAfterVat: 0,
        totalCommission: 0,
        paidSalesCount: 0,
        paidBeforeVat: 0,
        paidAfterVat: 0,
        paidCommission: 0,
      }
    );

    return NextResponse.json({
      success: true,
      sales: serializedSales,
      totals,
    });
  } catch (error) {
    console.error("GET ADMIN EMPLOYEE SALES FAILED:", error);
    return jsonError("שגיאה בטעינת מכירות עובד", 500);
  }
}