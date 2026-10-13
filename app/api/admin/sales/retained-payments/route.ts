import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { loadCustomerPaymentHistory } from "@/lib/customers/paymentHistory";

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
    const history = await loadCustomerPaymentHistory({
      originalUserId: clean(req.nextUrl.searchParams.get("originalUserId")),
      email: clean(req.nextUrl.searchParams.get("email")),
      fullName: clean(req.nextUrl.searchParams.get("fullName")),
    });

    return NextResponse.json({
      success: true,
      ...history,
    });
  } catch (error) {
    console.error("RETAINED PAYMENTS FAILED:", error);
    return NextResponse.json(
      { success: false, error: "טעינת התשלומים נכשלה" },
      { status: 500 }
    );
  }
}
