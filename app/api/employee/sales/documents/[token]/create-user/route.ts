import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import SalesDocument from "@/models/SalesDocument";
import CustomerQuote from "@/models/CustomerQuote";
import CustomerFile from "@/models/CustomerFile";
import User from "@/models/User";
import Event from "@/models/Event";
import { writeAdminAuditLog } from "@/lib/admin/auditLog";
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";
import {
  featuresForExperience,
  guestExperienceFromRsvpSiteMode,
  normalizeRsvpSiteMode,
} from "@/types/rsvpSite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return cleanString(value).toLowerCase();
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapPackageKey(key: string) {
  const k = cleanString(key).toLowerCase();
  if (k.includes("smart") || k === "smart") return "smart";
  if (k.includes("seat") || k === "seating") return "seating";
  return "easy";
}

/**
 * POST — פתיחת משתמש מהצעת מחיר קיימת.
 * לא מבצע חיוב / סליקה / SMS תשלום.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    await connectDB();
    const auth = await getUserIdFromRequest(req);
    if (
      !auth?.userId ||
      (auth.role !== "admin" &&
        auth.role !== "staff" &&
        auth.role !== "producer")
    ) {
      return NextResponse.json(
        { success: false, error: "אין הרשאה" },
        { status: 403 }
      );
    }

    const { token } = await context.params;
    const safeToken = cleanString(token);
    const body = await req.json().catch(() => ({}));

    // Atomic claim: only one converter wins on concurrent clicks.
    const claimed = await SalesDocument.findOneAndUpdate(
      {
        token: safeToken,
        type: "quote",
        $or: [
          { convertedUserId: null },
          { convertedUserId: { $exists: false } },
        ],
      },
      {
        $set: {
          convertedAt: new Date(),
          // temporary lock marker until user id is written
          convertingLockAt: new Date(),
        },
      },
      { new: true }
    );

    const doc =
      claimed ||
      (await SalesDocument.findOne({ token: safeToken, type: "quote" }));

    if (!doc) {
      return NextResponse.json(
        { success: false, error: "הצעת מחיר לא נמצאה" },
        { status: 404 }
      );
    }

    if ((doc as any).convertedUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_ALREADY_CREATED",
          message: "כבר נוצר משתמש מההצעה הזו",
          userId: String((doc as any).convertedUserId),
        },
        { status: 409 }
      );
    }

    if (!claimed) {
      return NextResponse.json(
        {
          success: false,
          error: "CONCURRENT_CREATE",
          message: "יצירת משתמש כבר בתהליך. רעננו את העמוד.",
        },
        { status: 409 }
      );
    }

    const clientName =
      cleanString(body?.name) ||
      cleanString(doc.client?.fullName) ||
      "לקוח";
    const clientEmail =
      normalizeEmail(body?.email) || normalizeEmail(doc.client?.email);
    const clientPhone =
      cleanString(body?.phone) || cleanString(doc.client?.phone);

    if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      await SalesDocument.updateOne(
        { _id: doc._id },
        { $unset: { convertingLockAt: 1, convertedAt: 1 } }
      );
      return NextResponse.json(
        { success: false, error: "יש להזין אימייל תקין" },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email: clientEmail })
      .select("_id name email")
      .lean();

    if (existing) {
      await SalesDocument.updateOne(
        { _id: doc._id },
        { $unset: { convertingLockAt: 1, convertedAt: 1 } }
      );
      return NextResponse.json(
        {
          success: false,
          error: "EMAIL_ALREADY_EXISTS",
          message: "כבר קיים משתמש עם האימייל הזה",
          userId: String((existing as any)._id),
        },
        { status: 409 }
      );
    }

    const guests = Math.max(
      1,
      toNumber(body?.guests ?? doc.selectedPackage?.records, 100)
    );
    const plan = mapPackageKey(
      cleanString(body?.plan || doc.selectedPackage?.key || "easy")
    );
    const packageName =
      cleanString(body?.packageName) ||
      cleanString(doc.selectedPackage?.title) ||
      plan;

    const gross = Math.max(
      0,
      toNumber(
        body?.totalDealAmount ??
          doc.totals?.grossAmountAfterDiscount ??
          doc.totals?.grossAmount,
        0
      )
    );

    const eventDateRaw =
      cleanString(body?.eventDate) || cleanString(doc.event?.date);
    const eventDate =
      eventDateRaw && !Number.isNaN(new Date(eventDateRaw).getTime())
        ? new Date(eventDateRaw)
        : null;

    const rsvpSiteMode = normalizeRsvpSiteMode(
      body?.rsvpSiteMode || "standard"
    );
    const guestExperienceType = guestExperienceFromRsvpSiteMode(rsvpSiteMode);
    const customerFeatures = featuresForExperience(guestExperienceType);

    const onboardingAgreementToken = cleanString(body?.onboardingAgreementToken);
    const createdUser = await User.create({
      name: clientName,
      email: clientEmail,
      phone: clientPhone,
      role: "user",
      plan,
      priceKey: plan,
      packageName,
      guests,
      maxGuests: guests,
      totalDealAmount: gross,
      paidAmount: 0,
      remainingAmount: gross,
      paymentMode: doc.totals?.paymentMode || "split",
      paymentActualMode: "none",
      hasPaid: false,
      isActive: false,
      eventDate,
      rsvpSiteMode,
      guestExperienceType,
      features: customerFeatures,
      smsLimit: guests,
      maxMessages: guests,
      smsBalance: 0,
      whatsappBalance: 0,
      allowedMessageRounds: 2,
      needsPasswordSetup: true,
      createdByAdmin: auth.role === "admin",
      billingSource: "admin",
      ...(onboardingAgreementToken
        ? { onboardingAgreementToken, onboardingAgreementSignedAt: null }
        : {}),
    });

    let passwordSetup: Awaited<ReturnType<typeof sendPasswordSetupMail>> | null =
      null;
    if (body?.sendPasswordSms === true) {
      try {
        passwordSetup = await sendPasswordSetupMail(String(createdUser._id));
      } catch (passwordError) {
        console.error("password setup sms failed:", passwordError);
        passwordSetup = {
          link: "",
          email: clientEmail,
          phone: clientPhone,
          emailSent: false,
          smsSent: false,
          smsError:
            passwordError instanceof Error
              ? passwordError.message
              : "שליחת SMS להגדרת סיסמה נכשלה",
        };
      }
    }

    const eventTitle =
      cleanString(body?.eventName) ||
      cleanString(doc.event?.name) ||
      `האירוע של ${clientName}`;

    const createdEvent = await Event.create({
      userId: createdUser._id,
      email: clientEmail,
      title: eventTitle,
      eventType: "wedding",
      date: eventDate
        ? eventDate.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      time: "19:00",
      city: cleanString(body?.city || doc.event?.city),
      location: {
        name: cleanString(body?.venueName || doc.event?.venueName),
        address: "",
      },
      maxGuests: guests,
      status: "active",
      paymentStatus: "paid",
    });

    await SalesDocument.updateOne(
      { _id: doc._id },
      {
        $set: {
          convertedUserId: createdUser._id,
          convertedAt: new Date(),
        },
        $unset: { convertingLockAt: 1 },
      }
    );

    await CustomerQuote.updateOne(
      { salesDocumentId: doc._id },
      {
        $set: {
          userId: createdUser._id,
          status: "converted",
        },
      }
    );

    if (doc.customerFileId) {
      await CustomerFile.updateOne(
        { _id: doc.customerFileId },
        {
          $set: {
            userId: createdUser._id,
            status: "converted",
            fullName: clientName,
            email: clientEmail,
            phone: clientPhone,
          },
        }
      );
    }

    if (auth.role === "admin") {
      await writeAdminAuditLog({
        adminUserId: String(auth.userId),
        managedUserId: String(createdUser._id),
        managedUserName: clientName,
        managedUserEmail: clientEmail,
        eventId: String(createdEvent._id),
        action: "quote_create_user",
        summary: `אדמין פתח משתמש מהצעת מחיר ${doc.token}`,
        meta: { quoteToken: doc.token, packageName, guests, gross },
      });
    }

    return NextResponse.json({
      success: true,
      message: "המשתמש נוצר בהצלחה מההצעה",
      userId: String(createdUser._id),
      eventId: String(createdEvent._id),
      redirectTo: `/admin/users?q=${encodeURIComponent(clientEmail)}`,
      passwordSetup: passwordSetup
        ? {
            link: passwordSetup.link,
            email: passwordSetup.email,
            phone: passwordSetup.phone,
            smsSent: passwordSetup.smsSent,
            smsError: passwordSetup.smsError || null,
          }
        : null,
    });
  } catch (err: any) {
    console.error("create-user from quote failed:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה ביצירת משתמש" },
      { status: 500 }
    );
  }
}
