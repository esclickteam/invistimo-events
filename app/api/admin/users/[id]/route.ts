import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Payment from "@/models/Payment";
import Invitation from "@/models/Invitation";
import EmployeeForm101 from "@/models/EmployeeForm101";
import EmployeeAgreement from "@/models/EmployeeAgreement";
import { buildEmployeeSnapshot } from "@/lib/employeeSnapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   HELPERS
========================================================= */
function normalizeEmail(email?: string) {
  return String(email || "").trim().toLowerCase();
}

function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

async function requireAdmin(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);

  if (!auth?.userId) {
    throw new Error("UNAUTHORIZED");
  }

  if (!isAdminContext(auth)) {
    throw new Error("FORBIDDEN");
  }

  return auth;
}

function cleanUndefined(obj: Record<string, any>) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });

  return obj;
}

function hasField(body: any, key: string) {
  return Object.prototype.hasOwnProperty.call(body || {}, key);
}

function toNumberOrUndefined(value: any) {
  if (value === undefined || value === null || value === "") return undefined;

  const num = Number(value);

  return Number.isFinite(num) ? num : undefined;
}

function roundMoney(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function normalizeAllowedMessageRounds(value: any): 2 | 3 {
  return Number(value) === 3 ? 3 : 2;
}

function normalizeAccessModules(value: any, fallback: any) {
  const fallbackRsvpSeating =
    Boolean(fallback?.accessModules?.rsvpSeating) ||
    Boolean(fallback?.includeDigitalSeating) ||
    Boolean(fallback?.planLimits?.seatingEnabled);

  const fallbackEventProduction =
    Boolean(fallback?.accessModules?.eventProduction) ||
    Boolean(fallback?.includeEventManagement) ||
    Boolean(fallback?.selfManageEnabled);

  return {
    rsvpSeating:
      typeof value?.rsvpSeating === "boolean"
        ? value.rsvpSeating
        : fallbackRsvpSeating,

    eventProduction:
      typeof value?.eventProduction === "boolean"
        ? value.eventProduction
        : fallbackEventProduction,
  };
}


function normalizeCallRoundsSchedule(value: any) {
  if (!value || typeof value !== "object") return undefined;

  const rounds = Array.isArray(value.rounds)
    ? value.rounds
        .map((round: any) => {
          const roundNumber = Number(round?.roundNumber || 0);

          if (![1, 2, 3].includes(roundNumber)) {
            return null;
          }

          const scheduledAt = round?.scheduledAt
            ? new Date(round.scheduledAt)
            : null;

          const hasValidScheduledAt =
            scheduledAt instanceof Date && !Number.isNaN(scheduledAt.getTime());

          return {
            roundNumber,
            title: String(round?.title || `סבב שיחות ${roundNumber}`).trim(),
            scheduledAt: hasValidScheduledAt ? scheduledAt : null,
            status: hasValidScheduledAt
              ? String(round?.status || "scheduled")
              : String(round?.status || "draft"),
            notes: String(round?.notes || "").trim(),
            updatedAt: new Date(),
            createdAt: round?.createdAt ? new Date(round.createdAt) : new Date(),
          };
        })
        .filter(Boolean)
    : [];

  return {
    enabled: Boolean(value.enabled),
    rounds: Boolean(value.enabled) ? rounds : [],
  };
}

function normalizeVenueSeatingService(value: any) {
  if (!value || typeof value !== "object") return undefined;

  const totalPrice = Number(value.totalPrice || 0);
  const depositAmount = Number(value.depositAmount || 0);
  const venuePaymentAmount = Number(value.venuePaymentAmount || 0);
  const staffPaymentAmount = Number(value.staffPaymentAmount || 0);

  const safeTotalPrice = Number.isFinite(totalPrice)
    ? Math.max(0, totalPrice)
    : 0;

  const safeDepositAmount = Number.isFinite(depositAmount)
    ? Math.max(0, Math.min(depositAmount, safeTotalPrice))
    : 0;

  const safeVenuePaymentAmount = Number.isFinite(venuePaymentAmount)
    ? Math.max(0, Math.min(venuePaymentAmount, safeTotalPrice))
    : 0;

  const safeStaffPaymentAmount = Number.isFinite(staffPaymentAmount)
    ? Math.max(0, Math.min(staffPaymentAmount, safeTotalPrice))
    : 0;

  const staffPaidFromVenue = Math.min(
    safeStaffPaymentAmount,
    safeVenuePaymentAmount
  );

  const staffPaidFromFullAmount = Math.max(
    safeStaffPaymentAmount - safeVenuePaymentAmount,
    0
  );

  const venuePaymentAfterStaff = Math.max(
    safeVenuePaymentAmount - safeStaffPaymentAmount,
    0
  );

  const totalAfterStaff = Math.max(
    safeTotalPrice - safeStaffPaymentAmount,
    0
  );

  return {
    enabled: Boolean(value.enabled),
    totalPrice: safeTotalPrice,
    depositAmount: safeDepositAmount,
    venuePaymentAmount: safeVenuePaymentAmount,
    staffPaymentAmount: safeStaffPaymentAmount,
    staffPaidFromVenue,
    staffPaidFromFullAmount,
    venuePaymentAfterStaff,
    totalAfterStaff,
  };
}

/* =========================================================
   GET – SINGLE USER
========================================================= */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    await requireAdmin(req);

    const { id } = await context.params;

    const user = await User.findById(id).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const payments = await Payment.find({
      email: normalizeEmail((user as any).email),
      isTest: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json(
      {
        success: true,
        user,
        payments,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (err?.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    console.error("ADMIN USER GET ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH – UPDATE USER / UPGRADE USER
   חשוב:
   לא נוגעים בחבילה / רשומות / SMS / סבבים אם הם לא נשלחו מהקליינט.
========================================================= */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const auth = await requireAdmin(req);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const currentUser: any = await User.findById(id).lean();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const nextVenueSeatingService = hasField(body, "venueSeatingService")
      ? normalizeVenueSeatingService(body.venueSeatingService)
      : undefined;

    const nextCallRoundsSchedule = hasField(body, "callRoundsSchedule")
      ? normalizeCallRoundsSchedule(body.callRoundsSchedule)
      : undefined;

    const hadVenueSeatingService = Boolean(
      currentUser.venueSeatingService?.enabled
    );

    const hasNewVenueSeatingService = Boolean(
      nextVenueSeatingService?.enabled
    );

    /*
      מקדמת הושבה באולם:
      - הפעלה ראשונה דרך מודל שדרוג: הסכום כבר כלול ב-upgradeAmount מהקליינט
      - הפעלה ראשונה דרך עריכת משתמש: אין upgradeAmount → מוסיפים מקדמה כאן
      - שינוי מקדמה על שירות שכבר נרכש: מסנכרנים את ההפרש לסכום הכולל
      - כיבוי שירות: מורידים את המקדמה הקודמת מהסכום הכולל
    */
    const previousVenueDeposit = Number(
      currentUser.venueSeatingService?.depositAmount || 0
    );
    const nextVenueDeposit = Number(
      nextVenueSeatingService?.depositAmount || 0
    );

    const clientIncludesNewVenueDeposit =
      hasField(body, "upgradeAmount") &&
      !hadVenueSeatingService &&
      hasNewVenueSeatingService;

    let venueDepositPaymentAmount = 0;

    if (hasField(body, "venueSeatingService") && nextVenueSeatingService) {
      if (!hadVenueSeatingService && hasNewVenueSeatingService) {
        venueDepositPaymentAmount = clientIncludesNewVenueDeposit
          ? 0
          : nextVenueDeposit;
      } else if (hadVenueSeatingService && hasNewVenueSeatingService) {
        venueDepositPaymentAmount = nextVenueDeposit - previousVenueDeposit;
      } else if (hadVenueSeatingService && !hasNewVenueSeatingService) {
        venueDepositPaymentAmount = -previousVenueDeposit;
      }
    }

    /* =====================================================
       BASIC FIELDS
    ===================================================== */
    const nextEmail = hasField(body, "email")
      ? normalizeEmail(body.email)
      : undefined;

    const nextPlan =
      hasField(body, "plan") || hasField(body, "priceKey")
        ? String(body.plan || body.priceKey || "")
        : undefined;

    const nextPackageName = hasField(body, "packageName")
      ? String(body.packageName || "")
      : undefined;

    const nextGuests =
      hasField(body, "guests") || hasField(body, "maxGuests")
        ? toNumberOrUndefined(body.guests ?? body.maxGuests)
        : undefined;

    const nextSmsLimit =
      hasField(body, "smsLimit") || hasField(body, "maxMessages")
        ? toNumberOrUndefined(body.smsLimit ?? body.maxMessages)
        : undefined;

    /*
      ✅ חדש וחשוב:
      סבבי הודעות לפי מה שהאדמין בוחר.
      תומך גם:
      body.allowedMessageRounds
      וגם:
      body.planLimits.allowedMessageRounds
      וגם:
      body.limits.allowedMessageRounds
    */
    const nextAllowedMessageRounds =
      hasField(body, "allowedMessageRounds") ||
      hasField(body, "planLimits") ||
      hasField(body, "limits")
        ? normalizeAllowedMessageRounds(
            body.allowedMessageRounds ??
              body.planLimits?.allowedMessageRounds ??
              body.limits?.allowedMessageRounds
          )
        : undefined;

    const nextIncludeCalls = hasField(body, "includeCalls")
      ? Boolean(body.includeCalls)
      : undefined;

    const nextIncludeCreditGifts = hasField(body, "includeCreditGifts")
      ? Boolean(body.includeCreditGifts)
      : undefined;

    const nextIncludeDigitalSeating = hasField(body, "includeDigitalSeating")
      ? Boolean(body.includeDigitalSeating)
      : undefined;

    const nextIncludeEventManagement = hasField(body, "includeEventManagement")
      ? Boolean(body.includeEventManagement)
      : undefined;

    const nextIncludeCustomDesign = hasField(body, "includeCustomDesign")
      ? Boolean(body.includeCustomDesign)
      : undefined;

    /*
      ✅ הרשאות מודולים:
      אם הקליינט שלח accessModules — זה המקור החדש.
      אם לא שלח — משתמשים בשדות הישנים כדי לא לשבור עדכונים קיימים.
    */
    const nextAccessModules = hasField(body, "accessModules")
      ? normalizeAccessModules(body.accessModules, currentUser)
      : undefined;

    const finalAccessModules = normalizeAccessModules(
      nextAccessModules,
      {
        ...currentUser,
        includeDigitalSeating:
          nextIncludeDigitalSeating !== undefined
            ? nextIncludeDigitalSeating
            : currentUser.includeDigitalSeating,
        includeEventManagement:
          nextIncludeEventManagement !== undefined
            ? nextIncludeEventManagement
            : currentUser.includeEventManagement,
        selfManageEnabled:
          nextIncludeEventManagement !== undefined
            ? nextIncludeEventManagement
            : currentUser.selfManageEnabled,
      }
    );

    const finalIncludeCalls =
      nextIncludeCalls !== undefined
        ? nextIncludeCalls
        : Boolean(currentUser.includeCalls);

    const finalIncludeDigitalSeating =
      nextAccessModules !== undefined
        ? finalAccessModules.rsvpSeating
        : nextIncludeDigitalSeating !== undefined
          ? nextIncludeDigitalSeating
          : Boolean(currentUser.includeDigitalSeating);

    const finalIncludeEventManagement =
      nextAccessModules !== undefined
        ? finalAccessModules.eventProduction
        : nextIncludeEventManagement !== undefined
          ? nextIncludeEventManagement
          : Boolean(currentUser.includeEventManagement);

    const finalIncludeCustomDesign =
      nextIncludeCustomDesign !== undefined
        ? nextIncludeCustomDesign
        : Boolean(currentUser.includeCustomDesign);

    const planLimitsPatch: Record<string, any> = {};

    if (nextGuests !== undefined) {
      planLimitsPatch["planLimits.maxGuests"] = nextGuests;
    }

    if (nextAllowedMessageRounds !== undefined) {
      planLimitsPatch["planLimits.allowedMessageRounds"] =
        nextAllowedMessageRounds;
    }

    if (nextSmsLimit !== undefined) {
      planLimitsPatch["planLimits.smsEnabled"] = true;
      planLimitsPatch["planLimits.smsLimit"] = nextSmsLimit;
    }

    if (
      nextIncludeDigitalSeating !== undefined ||
      nextAccessModules !== undefined
    ) {
      planLimitsPatch["planLimits.seatingEnabled"] =
        finalAccessModules.rsvpSeating;
    }

    if (nextIncludeCalls !== undefined) {
      planLimitsPatch["planLimits.callsEnabled"] = nextIncludeCalls;
    }

    if (
      nextGuests !== undefined ||
      nextSmsLimit !== undefined ||
      nextAllowedMessageRounds !== undefined ||
      nextIncludeCalls !== undefined ||
      nextIncludeDigitalSeating !== undefined ||
      nextAccessModules !== undefined
    ) {
      planLimitsPatch["planLimits.remindersEnabled"] = true;
    }

    /* =====================================================
       UPDATE OBJECT
    ===================================================== */
    const allowedUpdate: any = cleanUndefined({
      name: hasField(body, "name") ? body.name : undefined,
      email: nextEmail || undefined,
      phone: hasField(body, "phone") ? body.phone : undefined,

      role: hasField(body, "role") ? body.role : undefined,
      staffType: hasField(body, "staffType") ? body.staffType : undefined,

      plan: nextPlan || undefined,
      priceKey: nextPlan || undefined,
      packageName: nextPackageName || undefined,

      guests: nextGuests,
      maxGuests: nextGuests,

      /*
        ✅ חדש:
        שדה ישיר על המשתמש.
        אם האדמין בחר 3 — יישמר 3.
        אם האדמין בחר 2 — יישמר 2.
        אם לא נשלח בכלל — לא נוגעים בערך הקיים.
      */
      allowedMessageRounds: nextAllowedMessageRounds,

      smsLimit: nextSmsLimit,
      maxMessages: nextSmsLimit,

      includeCalls: nextIncludeCalls,
      callsRounds: hasField(body, "callsRounds")
        ? Number(body.callsRounds || 0)
        : nextIncludeCalls !== undefined
          ? nextIncludeCalls
            ? Number(currentUser.callsRounds || 3)
            : 0
          : undefined,

      callsAddonPrice: hasField(body, "callsAddonPrice")
        ? Number(body.callsAddonPrice || 0)
        : undefined,

      includeCreditGifts: nextIncludeCreditGifts,

      creditGiftsAddonPrice: hasField(body, "creditGiftsAddonPrice")
        ? Number(body.creditGiftsAddonPrice || 0)
        : undefined,

      /*
        ✅ סנכרון חדש:
        accessModules הוא המקור החדש,
        אבל שומרים גם את השדות הישנים כדי שכל הקוד הקיים ימשיך לעבוד.
      */
      accessModules:
        nextAccessModules !== undefined ? finalAccessModules : undefined,

      includeDigitalSeating:
        nextAccessModules !== undefined || nextIncludeDigitalSeating !== undefined
          ? finalIncludeDigitalSeating
          : undefined,

      includeEventManagement:
        nextAccessModules !== undefined ||
        nextIncludeEventManagement !== undefined
          ? finalIncludeEventManagement
          : undefined,

      includeCustomDesign: nextIncludeCustomDesign,

      selfManageEnabled:
        nextAccessModules !== undefined ||
        nextIncludeEventManagement !== undefined
          ? finalAccessModules.eventProduction
          : undefined,

      customDesignEnabled:
        nextIncludeCustomDesign !== undefined
          ? nextIncludeCustomDesign
          : undefined,

      paidAmount: hasField(body, "paidAmount") ? body.paidAmount : undefined,
      hasPaid: hasField(body, "hasPaid") ? body.hasPaid : undefined,
      isActive: hasField(body, "isActive") ? body.isActive : undefined,

      producerId: hasField(body, "producerId") ? body.producerId : undefined,

      createdByProducer: hasField(body, "createdByProducer")
        ? body.createdByProducer
        : undefined,

      assignedProducerId: hasField(body, "assignedProducerId")
        ? body.assignedProducerId
        : undefined,

      assignedProducerIds: hasField(body, "assignedProducerIds")
        ? body.assignedProducerIds
        : undefined,

      assignedClientIds: hasField(body, "assignedClientIds")
        ? body.assignedClientIds
        : undefined,

      assignedStaffIds: hasField(body, "assignedStaffIds")
        ? body.assignedStaffIds
        : undefined,

      producerPricePerRecord: hasField(body, "producerPricePerRecord")
        ? body.producerPricePerRecord
        : undefined,

      isTrial: hasField(body, "isTrial") ? body.isTrial : undefined,
      isDemoUser: hasField(body, "isDemoUser") ? body.isDemoUser : undefined,

      eventDate: hasField(body, "eventDate") ? body.eventDate : undefined,

      venueSeatingService: nextVenueSeatingService,

      /*
        מסנכרנים גם salesUpsells.venueSeating — אחרת ב-Compass נראה
        ערך ישן ב-salesUpsells למרות ש-venueSeatingService התעדכן.
      */
      ...(nextVenueSeatingService
        ? {
            "salesUpsells.venueSeating.enabled":
              nextVenueSeatingService.enabled,
            "salesUpsells.venueSeating.totalPrice":
              nextVenueSeatingService.totalPrice,
            "salesUpsells.venueSeating.depositAmount":
              nextVenueSeatingService.depositAmount,
            "salesUpsells.venueSeating.eventDayBalance":
              nextVenueSeatingService.venuePaymentAmount,
          }
        : {}),

      callRoundsSchedule: nextCallRoundsSchedule,

      ...planLimitsPatch,
    });

    const updatedUser: any = await User.findOneAndUpdate(
      { _id: id },
      { $set: allowedUpdate },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    /*
      תאריך האירוע באדמין צריך להישאר תואם להזמנה במונגו.
      אם עדכנו eventDate למשתמש — מסנכרנים גם את ההזמנה/ות שלו.
    */
    if (hasField(body, "eventDate")) {
      const nextEventDate = body.eventDate || null;

      await Invitation.updateMany(
        { ownerId: id },
        { $set: { eventDate: nextEventDate } }
      );
    }

    /* =====================================================
       MANUAL ADMIN UPGRADE PAYMENT
       חשוב: כמו במכירה ידנית — שומרים מבנה מלא:
       totalDealAmount / paidAmount / remainingAmount / paymentMode / payments[]
       סקירת ההכנסות סופרת מ-User.payments[].
    ===================================================== */
    const upgradeAmount = Number(body.upgradeAmount || 0);
    const totalPaymentAmount = roundMoney(
      upgradeAmount + Number(venueDepositPaymentAmount || 0)
    );

    const existingPayments = Array.isArray(currentUser.payments)
      ? currentUser.payments
      : [];
    const legacyPaidAmount = Number(currentUser.paidAmount || 0);
    const currentTotalDealAmount = Number(currentUser.totalDealAmount || 0);

    const previousVenueTotal = Number(
      currentUser.venueSeatingService?.totalPrice || 0
    );
    const nextVenueTotal = nextVenueSeatingService?.enabled
      ? Number(nextVenueSeatingService.totalPrice || 0)
      : 0;
    const nextVenueHallBalance = nextVenueSeatingService?.enabled
      ? Number(nextVenueSeatingService.venuePaymentAmount || 0)
      : 0;

    const venueDealDelta = hasField(body, "venueSeatingService")
      ? nextVenueTotal - (hadVenueSeatingService ? previousVenueTotal : 0)
      : 0;

    /*
      שווי עסקה:
      - אם לא היה totalDealAmount — מתחילים מ-paidAmount הקיים
      - מוסיפים הפרש חבילה ששולם עכשיו
      - מסנכרנים שינוי בשווי שירות הושבה
    */
    let nextTotalDealAmount = currentTotalDealAmount;

    if (nextTotalDealAmount <= 0 && legacyPaidAmount > 0) {
      nextTotalDealAmount = legacyPaidAmount;
    }

    if (upgradeAmount > 0) {
      // upgradeAmount כולל מקדמת הושבה חדשה אם הופעלה עכשיו —
      // מוסיפים גם את יתרת התשלום באולם לשווי העסקה.
      const newVenueHallToAdd =
        !hadVenueSeatingService && hasNewVenueSeatingService
          ? nextVenueHallBalance
          : 0;
      nextTotalDealAmount = roundMoney(
        nextTotalDealAmount + upgradeAmount + newVenueHallToAdd
      );
    } else if (venueDealDelta !== 0) {
      nextTotalDealAmount = roundMoney(
        Math.max(0, nextTotalDealAmount + venueDealDelta)
      );
    }

    if (totalPaymentAmount !== 0) {
      const paymentEmail = normalizeEmail(
        updatedUser.email || currentUser.email
      );
      const paidAt = new Date();
      const isRefundAdjustment = totalPaymentAmount < 0;
      const absoluteAmount = Math.abs(totalPaymentAmount);
      const nextPaidAmount = Math.max(0, legacyPaidAmount + totalPaymentAmount);
      const nextRemainingAmount = Math.max(
        0,
        roundMoney(nextTotalDealAmount - nextPaidAmount)
      );
      const nextPaymentMode =
        nextPaidAmount <= 0
          ? "none"
          : nextRemainingAmount > 0
            ? "deposit"
            : "full";

      if (!isRefundAdjustment) {
        await Payment.create({
          email: paymentEmail,

          stripeSessionId: undefined,
          stripePaymentIntentId: undefined,
          stripeCustomerId: undefined,
          stripePriceId: undefined,

          priceKey: updatedUser.priceKey || updatedUser.plan || nextPlan || "",
          maxGuests: Number(updatedUser.maxGuests || updatedUser.guests || 0),

          includeCalls: Boolean(updatedUser.includeCalls),
          callsAddonPrice: Number(updatedUser.callsAddonPrice || 0),

          includeCreditGifts: Boolean(updatedUser.includeCreditGifts),
          creditGiftsAddonPrice: Number(updatedUser.creditGiftsAddonPrice || 0),

          amount: absoluteAmount,
          refundAmount: 0,
          currency: "ils",

          type: "upgrade",
          status: "paid",
          isTest: false,

          meta: {
            source: "admin_upgrade",
            paymentMethod: body.upgradePaymentMethod || "manual_admin",
            paymentStatus: body.upgradePaymentStatus || "paid",

            adminId: auth.impersonatedBy
              ? String(auth.impersonatedBy)
              : String(auth.userId),

            userId: String(updatedUser._id),

            previousPlan: currentUser.plan || currentUser.priceKey || null,
            newPlan: updatedUser.plan || updatedUser.priceKey || null,
            packageName: updatedUser.packageName || null,

            previousGuests: Number(
              currentUser.maxGuests || currentUser.guests || 0
            ),
            newGuests: Number(updatedUser.maxGuests || updatedUser.guests || 0),

            previousAllowedMessageRounds: Number(
              currentUser.allowedMessageRounds ||
                currentUser.planLimits?.allowedMessageRounds ||
                2
            ),
            newAllowedMessageRounds: Number(
              updatedUser.allowedMessageRounds ||
                updatedUser.planLimits?.allowedMessageRounds ||
                2
            ),

            previousSmsLimit: Number(
              currentUser.smsLimit || currentUser.maxMessages || 0
            ),
            newSmsLimit: Number(
              updatedUser.smsLimit || updatedUser.maxMessages || 0
            ),

            extraRecords: Number(body.extraRecords || 0),
            extraRecordsAmount: Number(body.extraRecordsAmount || 0),

            manualAmount: true,

            venueSeatingDepositAmount: venueDepositPaymentAmount,
            venueSeatingService: nextVenueSeatingService || null,

            totalDealAmount: nextTotalDealAmount,
            remainingAmount: nextRemainingAmount,
            paymentMode: nextPaymentMode,

            includeCalls: Boolean(updatedUser.includeCalls),
            includeCreditGifts: Boolean(updatedUser.includeCreditGifts),
            includeDigitalSeating: Boolean(updatedUser.includeDigitalSeating),
            includeEventManagement: Boolean(
              updatedUser.includeEventManagement
            ),
            includeCustomDesign: Boolean(updatedUser.includeCustomDesign),

            accessModules: updatedUser.accessModules || {
              rsvpSeating: Boolean(updatedUser.includeDigitalSeating),
              eventProduction: Boolean(updatedUser.includeEventManagement),
            },
          },
        });
      }

      const paymentNote = isRefundAdjustment
        ? "תיקון מקדמת שירות הושבה באולם"
        : upgradeAmount > 0
          ? "שדרוג ידני מאדמין"
          : "מקדמת שירות הושבה באולם";

      const paymentType = isRefundAdjustment
        ? "refund"
        : nextRemainingAmount > 0
          ? "deposit"
          : "full";

      const userPaymentEntry = {
        amount: absoluteAmount,
        type: paymentType,
        method: "manual",
        status: "paid",
        paidAt,
        createdAt: paidAt,
        note: paymentNote,
        createdBy: auth.impersonatedBy || auth.userId || null,
      };

      /*
        אם ליוזר יש paidAmount ישן בלי payments[] —
        קודם שומרים את היתרה כרשומה, אחרת הסקירה תאבד את הסכום הישן
        ברגע שנוצר payments[] בפעם הראשונה.
      */
      const paymentsToPush =
        existingPayments.length === 0 && legacyPaidAmount > 0
          ? [
              {
                amount: legacyPaidAmount,
                type: "manual",
                method: "manual",
                status: "paid",
                paidAt:
                  currentUser.paidAt ||
                  currentUser.lastPaymentAt ||
                  currentUser.createdAt ||
                  paidAt,
                createdAt:
                  currentUser.paidAt ||
                  currentUser.lastPaymentAt ||
                  currentUser.createdAt ||
                  paidAt,
                note: "יתרת תשלומים קודמת",
              },
              userPaymentEntry,
            ]
          : [userPaymentEntry];

      await User.findByIdAndUpdate(updatedUser._id, {
        $push: {
          payments: {
            $each: paymentsToPush,
          },
        },
        $set: {
          totalDealAmount: nextTotalDealAmount,
          paidAmount: nextPaidAmount,
          remainingAmount: nextRemainingAmount,
          paymentMode: nextPaymentMode,
          hasPaid: nextPaidAmount > 0,
          isActive: true,
          lastPaymentAt: paidAt,
          paidAt: currentUser.paidAt || paidAt,
        },
      });
    } else if (
      hasField(body, "venueSeatingService") &&
      nextTotalDealAmount !== currentTotalDealAmount
    ) {
      // שינוי שווי הושבה בלי תשלום חדש — מסנכרנים יתרה/שווי עסקה בלבד
      const nextRemainingAmount = Math.max(
        0,
        roundMoney(nextTotalDealAmount - legacyPaidAmount)
      );

      await User.findByIdAndUpdate(updatedUser._id, {
        $set: {
          totalDealAmount: nextTotalDealAmount,
          remainingAmount: nextRemainingAmount,
          paymentMode:
            legacyPaidAmount <= 0
              ? currentUser.paymentMode || "none"
              : nextRemainingAmount > 0
                ? "deposit"
                : "full",
        },
      });
    }

    const finalUser = await User.findById(id).lean();

    return NextResponse.json(
      {
        success: true,
        user: finalUser,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (err?.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    console.error("ADMIN USER UPDATE ERROR:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE – ADMIN DELETE USER
========================================================= */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    await requireAdmin(req);

    const { id } = await context.params;

    const deletedUser = await User.findById(id).lean();

    if (!deletedUser) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const snapshot = buildEmployeeSnapshot(deletedUser);
    const deletedAt = new Date();

    await Promise.all([
      EmployeeForm101.updateMany(
        { employeeId: id },
        {
          $set: {
            ...snapshot,
            employeeDeletedAt: deletedAt,
          },
        }
      ),
      EmployeeAgreement.updateMany(
        { employeeId: id },
        {
          $set: {
            fullName: snapshot.employeeName || undefined,
            email: snapshot.employeeEmail || undefined,
            phone: snapshot.employeePhone || undefined,
            idNumber: snapshot.employeeIdNumber || undefined,
            employeeDeletedAt: deletedAt,
          },
        }
      ),
    ]);

    await User.findByIdAndDelete(id);

    return NextResponse.json(
      {
        success: true,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    if (err?.message === "FORBIDDEN") {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    console.error("ADMIN USER DELETE ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}