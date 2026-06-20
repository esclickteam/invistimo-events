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

function normalizeIsraeliPhone(value: unknown) {
  const raw = cleanString(value);
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  if (/^05\d{8}$/.test(digits)) {
    return digits;
  }

  if (/^9725\d{8}$/.test(digits)) {
    return `0${digits.slice(3)}`;
  }

  if (/^5\d{8}$/.test(digits)) {
    return `0${digits}`;
  }

  return digits;
}

function isValidIsraeliMobile(value: unknown) {
  const phone = normalizeIsraeliPhone(value);
  return /^05\d{8}$/.test(phone);
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

    const fullName =
      cleanString(body?.fullName) ||
      cleanString(body?.name) ||
      "ליד וואטסאפ מהאתר";

    const email = cleanString(body?.email);
    const phone = normalizeIsraeliPhone(body?.phone);

    const pageUrl = cleanString(body?.pageUrl);
    const source = cleanString(body?.source) || "support_widget";
    const leadSource = cleanString(body?.leadSource) || "website_support";
    const leadProvider = cleanString(body?.leadProvider) || "website";

    const interestedService =
      cleanString(body?.interestedService) || "פנייה לנציג מהאתר";

    const userAgent = cleanString(body?.userAgent);
    const extraNotes = cleanString(body?.notes);

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error: "נא להזין מספר טלפון",
        },
        { status: 400 }
      );
    }

    if (!isValidIsraeliMobile(phone)) {
      return NextResponse.json(
        {
          success: false,
          error: "נא להזין מספר טלפון ישראלי תקין",
        },
        { status: 400 }
      );
    }

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

    const existingLead = await CustomerFile.findOne({
      userId: ownerUser._id,
      phone,
      status: "lead",
      leadSource,
      leadProvider,
      source,
      createdAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (existingLead?._id) {
      return NextResponse.json(
        {
          success: true,
          leadId: String(existingLead._id),
          existing: true,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const notes = [
      extraNotes ||
        "הלקוח מילא שם וטלפון בבוט התמיכה ולחץ מעבר לוואטסאפ עם נציג.",
      `טלפון שהוזן בבוט: ${phone}`,
      pageUrl ? `עמוד ממנו נפתחה הפנייה: ${pageUrl}` : "",
      userAgent ? `דפדפן: ${userAgent}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const lead = await CustomerFile.create({
      userId: ownerUser._id,

      fullName,
      email,
      phone,

      status: "lead",
      leadStatus: "new",

      leadSource,
      leadProvider,
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
        existing: false,
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