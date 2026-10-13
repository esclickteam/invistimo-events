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
import {
  buildQuoteUserCommercials,
  planQuoteUserAction,
  toUserPlan,
} from "@/lib/adminQuoteWorkflow";

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
  return toUserPlan(key);
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

    const preview = await SalesDocument.findOne({ token: safeToken, type: "quote" });
    if (preview?.convertedUserId && body?.repairBrokenLink === true) {
      const linked = await User.findById(preview.convertedUserId).select("_id");
      if (!linked) {
        await SalesDocument.updateOne(
          { _id: preview._id },
          { $unset: { convertedUserId: 1, convertedAt: 1, convertingLockAt: 1 } },
        );
      }
    }

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
      const linked = await User.findById((doc as any).convertedUserId)
        .select("_id email")
        .lean();
      if (linked) {
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
      return NextResponse.json(
        {
          success: false,
          error: "BROKEN_LINK",
          message: "הקישור למשתמש שבור. לא נוצר משתמש חדש. אפשר לתקן את הקישור באופן מבוקר.",
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
      .select("_id name email phone totalDealAmount paidAmount payments")
      .lean();

    const quoteGross = Math.max(
      0,
      toNumber(
        body?.totalDealAmount ??
          doc.totals?.grossAmountAfterDiscount ??
          doc.totals?.grossAmount,
        0,
      ),
    );
    const decision = planQuoteUserAction({
      quoteEmail: clientEmail,
      quotePhone: clientPhone,
      quoteGross,
      packageKey: body?.plan || doc.selectedPackage?.key,
      packageTitle:
        cleanString(body?.packageName) || cleanString(doc.selectedPackage?.title),
      records: toNumber(body?.guests ?? doc.selectedPackage?.records, 1),
      callsType: body?.callsType,
      rsvpSiteMode: body?.rsvpSiteMode,
      convertedUserId: null,
      convertedUserExists: false,
      existingByEmail: existing
        ? {
            id: String((existing as { _id: unknown })._id),
            email: String((existing as { email?: string }).email || ""),
            name: String((existing as { name?: string }).name || ""),
            phone: String((existing as { phone?: string }).phone || ""),
            totalDealAmount: toNumber(
              (existing as { totalDealAmount?: number }).totalDealAmount,
            ),
            paidAmount: toNumber((existing as { paidAmount?: number }).paidAmount),
            paymentsCount: Array.isArray((existing as { payments?: unknown[] }).payments)
              ? (existing as { payments: unknown[] }).payments.length
              : 0,
          }
        : null,
      linkExistingUser: body?.linkExistingUser === true,
      expectedUserId: cleanString(body?.expectedUserId),
      confirmIdentity: body?.confirmIdentity === true,
      acknowledgeDealGap: body?.acknowledgeDealGap === true,
      repairBrokenLink: body?.repairBrokenLink === true,
    });

    if (decision.action === "reject") {
      await SalesDocument.updateOne(
        { _id: doc._id },
        { $unset: { convertingLockAt: 1, convertedAt: 1 } },
      );
      return NextResponse.json(
        {
          success: false,
          error: decision.code,
          message: decision.message,
          userId: "userId" in decision ? decision.userId : undefined,
          email: "email" in decision ? decision.email : undefined,
          dealGap: "dealGap" in decision ? decision.dealGap : undefined,
        },
        { status: decision.status },
      );
    }

    if (decision.action === "link") {
      await SalesDocument.updateOne(
        { _id: doc._id },
        {
          $set: {
            convertedUserId: decision.userId,
            convertedAt: new Date(),
          },
          $unset: { convertingLockAt: 1 },
        },
      );
      await SalesDocument.updateMany(
        { type: "agreement", sourceQuoteToken: doc.token },
        { $set: { convertedUserId: decision.userId } },
      );
      const userUpdate: Record<string, unknown> = {
        sourceQuoteToken: doc.token,
        sourceQuoteId: doc._id,
      };
      if (doc.linkedAgreementToken || body?.onboardingAgreementToken) {
        userUpdate.sourceAgreementToken = cleanString(
          body?.onboardingAgreementToken || (doc as { linkedAgreementToken?: string }).linkedAgreementToken,
        );
      }
      if (decision.updateDeal) {
        userUpdate.totalDealAmount = quoteGross;
      }
      await User.updateOne({ _id: decision.userId }, { $set: userUpdate });
      await CustomerQuote.updateOne(
        { salesDocumentId: doc._id },
        { $set: { userId: decision.userId, status: "converted" } },
      );
      return NextResponse.json({
        success: true,
        linkedExisting: true,
        message: decision.dealGap
          ? "ההצעה קושרה למשתמש הקיים בלי לדרוס את סכום העסקה הפעילה"
          : "ההצעה קושרה למשתמש הקיים בלי ליצור חשבון כפול",
        userId: decision.userId,
        dealGap: decision.dealGap,
        redirectTo: `/admin/users?q=${encodeURIComponent(clientEmail)}`,
      });
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

    const onboardingAgreementToken = cleanString(
      body?.onboardingAgreementToken ||
        (doc as { linkedAgreementToken?: string }).linkedAgreementToken,
    );
    const commercials = buildQuoteUserCommercials({
      packageKey: body?.plan || doc.selectedPackage?.key,
      packageTitle: packageName,
      records: guests,
      gross,
      callsType: body?.callsType,
      rsvpSiteMode,
    });
    const createdUser = await User.create({
      name: clientName,
      email: clientEmail,
      phone: clientPhone,
      role: "user",
      plan: commercials.plan,
      priceKey: commercials.priceKey,
      packageName: commercials.packageName,
      guests: commercials.guests,
      maxGuests: commercials.guests,
      totalDealAmount: commercials.totalDealAmount,
      paidAmount: 0,
      remainingAmount: commercials.remainingAmount,
      payments: [],
      paymentMode: "none",
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
      callsType: commercials.callsType,
      includeCalls: false,
      sourceQuoteToken: doc.token,
      sourceQuoteId: doc._id,
      sourceAgreementToken: onboardingAgreementToken,
      needsPasswordSetup: true,
      createdByAdmin: auth.role === "admin",
      billingSource: "admin",
      ...(onboardingAgreementToken
        ? { onboardingAgreementToken, onboardingAgreementSignedAt: null }
        : {}),
    });

    try {
      const { recordNewCustomer } = await import("@/lib/customerNotifications/adminCenterLive");
      await recordNewCustomer({
        customerId: String(createdUser._id),
        name: clientName,
        role: "user",
      });
    } catch (notifyError) {
      console.error("new customer notice failed", notifyError);
    }

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

    await SalesDocument.updateMany(
      {
        type: "agreement",
        sourceQuoteToken: doc.token,
        $or: [{ convertedUserId: null }, { convertedUserId: { $exists: false } }],
      },
      { $set: { convertedUserId: createdUser._id } },
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
