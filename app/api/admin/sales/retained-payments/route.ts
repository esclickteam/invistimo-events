import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { loadRetainedCustomerPayments } from "@/lib/customers/deleteCustomerAccount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId || auth.role !== "admin" || auth.impersonated) {
      return NextResponse.json(
        { success: false, error: "אין הרשאה" },
        { status: 403 }
      );
    }

    await connectDB();
    const originalUserId = clean(req.nextUrl.searchParams.get("originalUserId"));
    const record = await loadRetainedCustomerPayments(originalUserId);

    if (!record) {
      return NextResponse.json(
        { success: false, error: "לא נמצאו תשלומים היסטוריים" },
        { status: 404 }
      );
    }

    const payments = Array.isArray((record as { payments?: unknown[] }).payments)
      ? (record as { payments: Record<string, unknown>[] }).payments
      : [];
    const ledger = Array.isArray(
      (record as { ledgerPayments?: unknown[] }).ledgerPayments
    )
      ? (record as { ledgerPayments: Record<string, unknown>[] }).ledgerPayments
      : [];
    const matchedReferences = new Set(
      payments.map((payment) => clean(payment.reference)).filter(Boolean)
    );
    const extraLedger = ledger.filter((entry) => {
      const reference = clean(entry.reference);
      return reference && !matchedReferences.has(reference);
    });

    return NextResponse.json({
      success: true,
      customer: {
        name:
          clean((record as { fullName?: string }).fullName) ||
          clean((record as { name?: string }).name),
        email: clean((record as { email?: string }).email),
        phone: clean((record as { phone?: string }).phone),
        idNumber: clean((record as { idNumber?: string }).idNumber),
        deleted: true,
      },
      totalDealAmount: Number((record as { totalDealAmount?: number }).totalDealAmount || 0),
      paidAmount: Number((record as { paidAmount?: number }).paidAmount || 0),
      remainingAmount: Number(
        (record as { remainingAmount?: number }).remainingAmount || 0
      ),
      payments: payments.map((payment) => ({
        amount: Number(payment.amount || 0),
        paidAt: payment.paidAt || payment.createdAt || null,
        method: clean(payment.method) || "manual",
        status: clean(payment.status) || "paid",
        type: clean(payment.type),
        reference: clean(payment.reference) || clean(payment.note),
        invoiceUrl: clean(payment.invoiceUrl),
        receiptUrl: clean(payment.receiptUrl),
      })),
      ledgerPayments: extraLedger.map((entry) => ({
        amount: Number(entry.amount || 0),
        paidAt: entry.paidAt || null,
        method: clean(entry.method) || "stripe",
        status: clean(entry.status),
        reference: clean(entry.reference),
        invoiceUrl: clean(entry.invoiceUrl),
        receiptUrl: clean(entry.receiptUrl),
      })),
    });
  } catch (error) {
    console.error("RETAINED PAYMENTS FAILED:", error);
    return NextResponse.json(
      { success: false, error: "טעינת התשלומים נכשלה" },
      { status: 500 }
    );
  }
}
