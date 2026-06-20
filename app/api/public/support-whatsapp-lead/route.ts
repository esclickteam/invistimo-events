import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import CustomerFile from "@/models/CustomerFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function makeTicketNumber() {
  return `SUP-${Date.now().toString(36).toUpperCase()}`;
}

async function getLeadOwnerUser() {
  const envUserId = cleanString(
    process.env.SUPPORT_LEADS_USER_ID ||
      process.env.ADMIN_USER_ID ||
      process.env.NEXT_PUBLIC_ADMIN_USER_ID
  );

  if (envUserId && mongoose.Types.ObjectId.isValid(envUserId)) {
    const user = await User.findById(envUserId).select("_id").lean();
    if (user?._id) return user;
  }

  const envEmail = cleanString(
    process.env.SUPPORT_LEADS_EMAIL || process.env.ADMIN_EMAIL
  ).toLowerCase();

  if (envEmail) {
    const user = await User.findOne({ email: envEmail }).select("_id").lean();
    if (user?._id) return user;
  }

  const user = await User.findOne({
    $or: [{ role: "admin" }, { role: "owner" }, { role: "staff" }],
  })
    .sort({ createdAt: 1 })
    .select("_id")
    .lean();

  return user;
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const body = await req.json().catch(() => ({}));

    const pageUrl = cleanString(body?.pageUrl);
    const source = cleanString(body?.source) || "support_widget";
    const interestedService =
      cleanString(body?.interestedService) || "פנייה לנציג מהאתר";
    const userAgent = cleanString(body?.userAgent);

    const ownerUser = await getLeadOwnerUser();

    if (!ownerUser?._id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "לא נמצא משתמש אדמין לשיוך הליד. הגדירי SUPPORT_LEADS_USER_ID בקובץ הסביבה.",
        },
        { status: 500 }
      );
    }

    const ticketNumber = makeTicketNumber();

    const notes = [
      "הלקוח לחץ על מעבר לוואטסאפ עם נציג מתוך חלונית העזרה באתר.",
      `מספר פנייה: ${ticketNumber}`,
      pageUrl ? `עמוד ממנו נפתחה הפנייה: ${pageUrl}` : "",
      userAgent ? `דפדפן: ${userAgent}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const lead = await CustomerFile.create({
      userId: ownerUser._id,

      fullName: "ליד וואטסאפ מהאתר",
      email: "",
      phone: "",

      status: "lead",
      leadStatus: "new",

      leadSource: "website_support",
      leadProvider: "website",
      source,

      interestedService,
      notes,

      campaignName: "Support Widget",
      formName: "WhatsApp Representative Button",
      adName: "",
      facebookLeadId: "",

      totalPrice: 0,
      paidAmount: 0,
      balance: 0,
    });

    return NextResponse.json(
      {
        success: true,
        leadId: String(lead._id),
        ticketNumber,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("CREATE SUPPORT WHATSAPP LEAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה ביצירת ליד וואטסאפ",
      },
      { status: 500 }
    );
  }
}