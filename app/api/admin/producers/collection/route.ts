import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { loadOpenProducerCollection } from "@/lib/producerBilling/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    (auth?.role === "staff" &&
      auth?.staffType === "general_staff" &&
      auth?.employeeScope === "system")
  );
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const auth = await getUserIdFromRequest(req);
    if (!isAdminContext(auth)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }
    const { openRows, balances } = await loadOpenProducerCollection();
    const total = Object.values(balances).reduce((sum, value) => sum + Number(value || 0), 0);
    return NextResponse.json({
      success: true,
      total,
      count: openRows.length,
      rows: openRows,
    });
  } catch (err) {
    console.error("producer collection list failed", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
