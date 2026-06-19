import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import CustomerFile from "@/models/CustomerFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);
    const q = cleanString(searchParams.get("q"));

    const filter: any = {};

    if (q) {
      const numericQ = toNumber(q);

      filter.$or = [
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },

        // חיפוש לפי פרטי ליד
        { interestedService: { $regex: q, $options: "i" } },
        { leadSource: { $regex: q, $options: "i" } },
        { leadProvider: { $regex: q, $options: "i" } },
        { leadStatus: { $regex: q, $options: "i" } },
        { facebookLeadId: { $regex: q, $options: "i" } },
        { campaignName: { $regex: q, $options: "i" } },
        { adName: { $regex: q, $options: "i" } },
        { formName: { $regex: q, $options: "i" } },
        { source: { $regex: q, $options: "i" } },

        // חיפוש רגיל לפי פרטי תיק
        { packageName: { $regex: q, $options: "i" } },
        { venueName: { $regex: q, $options: "i" } },
        { city: { $regex: q, $options: "i" } },
        { status: { $regex: q, $options: "i" } },
        { notes: { $regex: q, $options: "i" } },
      ];

      if (numericQ !== null) {
        filter.$or.push({ guestsCount: numericQ });
        filter.$or.push({ recordsCount: numericQ });
        filter.$or.push({ totalPrice: numericQ });
        filter.$or.push({ paidAmount: numericQ });
        filter.$or.push({ balance: numericQ });
      }
    }

    const customers = await CustomerFile.find(filter)
      .populate("assignedStaffIds", "_id name email role staffType")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    return NextResponse.json(
      {
        success: true,
        customers,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בטעינת לקוחות",
      },
      { status: 500 }
    );
  }
}