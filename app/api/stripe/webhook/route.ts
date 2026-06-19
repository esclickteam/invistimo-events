import Stripe from "stripe";
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import EmployeeSale from "@/models/EmployeeSale";
import { notifyAdminPurchase } from "@/lib/notifyAdminPurchase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   Stripe instance
============================================================ */

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
});

/* =========================================================
   Helpers
============================================================ */

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(v: unknown): boolean {
  return String(v ?? "").toLowerCase() === "true";
}

function normalizeAllowedMessageRounds(value: unknown): 2 | 3 {
  return Number(value) === 3 ? 3 : 2;
}

function toUserPlan(plan: string): "basic" | "premium" | "plan1" | "plan2" | "plan3" {
  const normalized = String(plan || "").trim().toLowerCase();

  if (normalized === "easy" || normalized === "plan1") return "plan1";
  if (normalized === "smart" || normalized === "plan2") return "plan2";
  if (normalized === "seating" || normalized === "plan3") return "plan3";
  if (normalized === "basic") return "basic";

  return "premium";
}

function parseAccessModulesFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
  fallback: {
    includeDigitalSeating?: boolean;
    includeEventManagement?: boolean;
    existingAccessModules?: any;
    planLimits?: any;
    selfManageEnabled?: boolean;
  }
) {
  let parsedAccessModules: any = null;

  if (metadata?.accessModules) {
    try {
      parsedAccessModules = JSON.parse(metadata.accessModules);
    } catch {
      parsedAccessModules = null;
    }
  }

  const rsvpSeating =
    typeof parsedAccessModules?.rsvpSeating === "boolean"
      ? parsedAccessModules.rsvpSeating
      : metadata?.accessModulesRsvpSeating !== undefined
        ? toBool(metadata.accessModulesRsvpSeating)
        : metadata?.includeDigitalSeating !== undefined
          ? toBool(metadata.includeDigitalSeating)
          : metadata?.seatingEnabled !== undefined
            ? toBool(metadata.seatingEnabled)
            : Boolean(
                fallback.existingAccessModules?.rsvpSeating ??
                  fallback.includeDigitalSeating ??
                  fallback.planLimits?.seatingEnabled
              );

  const eventProduction =
    typeof parsedAccessModules?.eventProduction === "boolean"
      ? parsedAccessModules.eventProduction
      : metadata?.accessModulesEventProduction !== undefined
        ? toBool(metadata.accessModulesEventProduction)
        : metadata?.includeEventManagement !== undefined
          ? toBool(metadata.includeEventManagement)
          : metadata?.selfManageEnabled !== undefined
            ? toBool(metadata.selfManageEnabled)
            : Boolean(
                fallback.existingAccessModules?.eventProduction ??
                  fallback.includeEventManagement ??
                  fallback.selfManageEnabled
              );

  return {
    rsvpSeating: Boolean(rsvpSeating),
    eventProduction: Boolean(eventProduction),

    venues: Boolean(
      parsedAccessModules?.venues ?? fallback.existingAccessModules?.venues ?? false
    ),
    venueDashboard: Boolean(
      parsedAccessModules?.venueDashboard ??
        fallback.existingAccessModules?.venueDashboard ??
        false
    ),
    venueCrm: Boolean(
      parsedAccessModules?.venueCrm ?? fallback.existingAccessModules?.venueCrm ?? false
    ),
    venueCalendar: Boolean(
      parsedAccessModules?.venueCalendar ??
        fallback.existingAccessModules?.venueCalendar ??
        false
    ),
    venueMenus: Boolean(
      parsedAccessModules?.venueMenus ??
        fallback.existingAccessModules?.venueMenus ??
        false
    ),
    venueStaff: Boolean(
      parsedAccessModules?.venueStaff ??
        fallback.existingAccessModules?.venueStaff ??
        false
    ),
  };
}

/* =========================================================
   PLAN AUTHORITY
============================================================ */

function getPlanDefaults(
  plan: string,
  guests: number,
  allowedMessageRounds: 2 | 3
) {
  switch (plan) {
    case "plan1":
      return {
        planLimits: {
          maxGuests: guests,
          allowedMessageRounds,
          smsEnabled: true,
          smsLimit: 0,
          remindersEnabled: true,
          seatingEnabled: false,
          callsEnabled: false,
        },
        includeCalls: false,
        includeCreditGifts: false,
      };

    case "plan2":
      return {
        planLimits: {
          maxGuests: guests,
          allowedMessageRounds,
          smsEnabled: true,
          smsLimit: 0,
          remindersEnabled: true,
          seatingEnabled: false,
          callsEnabled: true,
        },
        includeCalls: true,
        includeCreditGifts: false,
      };

    case "plan3":
      return {
        planLimits: {
          maxGuests: guests,
          allowedMessageRounds,
          smsEnabled: true,
          smsLimit: 0,
          remindersEnabled: true,
          seatingEnabled: true,
          callsEnabled: true,
        },
        includeCalls: true,
        includeCreditGifts: true,
      };

    default:
      return {
        planLimits: {
          maxGuests: guests,
          allowedMessageRounds,
          smsEnabled: false,
          smsLimit: 0,
          remindersEnabled: false,
          seatingEnabled: false,
          callsEnabled: false,
        },
        includeCalls: false,
        includeCreditGifts: false,
      };
  }
}


function cleanString(value: unknown): string {
  return String(value || "").trim();
}

function normalizeUpsellKey(value: unknown): string {
  return cleanString(value).trim();
}

function getSaleUpsellsArray(sale: any): any[] {
  return Array.isArray(sale?.upsells) ? sale.upsells : [];
}

function findSaleUpsell(sale: any, key: string) {
  return getSaleUpsellsArray(sale).find(
    (upsell: any) => normalizeUpsellKey(upsell?.key) === key
  );
}

function hasSaleUpsell(sale: any, key: string): boolean {
  return Boolean(findSaleUpsell(sale, key));
}

function getSaleUpsellPrice(sale: any, key: string): number {
  const upsell = findSaleUpsell(sale, key);
  if (!upsell) return 0;
  if (upsell.givenFree) return 0;

  return toNum(
    upsell.totalPrice ?? upsell.price ?? upsell.amount ?? upsell.grossAmount,
    0
  );
}

function getSaleUpsellStaffCount(sale: any, key: string, fallback = 0): number {
  const upsell = findSaleUpsell(sale, key);
  if (!upsell) return fallback;

  return toNum(upsell.staffCount ?? upsell.count ?? upsell.quantity, fallback);
}

function getSalePlan(sale: any, user: any): string {
  return cleanString(sale?.plan || user?.plan || "premium");
}

function getSalePackageName(sale: any, plan: string): string {
  return cleanString(
    sale?.packageName || sale?.selectedPackage?.title || sale?.selectedPackage?.key || plan
  );
}

function getSaleGuests(sale: any, user: any): number {
  return Math.max(
    0,
    Math.floor(
      toNum(
        sale?.guests ??
          sale?.selectedPackage?.records ??
          sale?.customerDealSummary?.records ??
          user?.guests ??
          user?.maxGuests ??
          0,
        0
      )
    )
  );
}

function buildEmployeeSaleUpsells(sale: any) {
  const digitalSeatingEnabled = hasSaleUpsell(sale, "digitalSeating");
  const venueSeatingEnabled = hasSaleUpsell(sale, "venueSeating");
  const personalRepresentativeEnabled = hasSaleUpsell(
    sale,
    "personalRepresentative"
  );
  const thirdRsvpRoundEnabled = hasSaleUpsell(sale, "thirdRsvpRound");
  const suppliersBudgetSystemEnabled = hasSaleUpsell(
    sale,
    "suppliersBudgetSystem"
  );
  const alcoholManagementEnabled = hasSaleUpsell(sale, "alcoholManagement");
  const creditGiftsEnabled = hasSaleUpsell(sale, "creditGifts");

  return {
    digitalSeating: {
      enabled: digitalSeatingEnabled,
      price: getSaleUpsellPrice(sale, "digitalSeating"),
    },

    creditGifts: {
      enabled: creditGiftsEnabled,
      price: getSaleUpsellPrice(sale, "creditGifts"),
    },

    venueSeating: {
      enabled: venueSeatingEnabled,
      staffCount: getSaleUpsellStaffCount(sale, "venueSeating", 0),
      totalPrice: getSaleUpsellPrice(sale, "venueSeating"),
    },

    personalRepresentative: {
      enabled: personalRepresentativeEnabled,
      price: getSaleUpsellPrice(sale, "personalRepresentative"),
    },

    thirdRsvpRound: {
      enabled: thirdRsvpRoundEnabled,
      price: getSaleUpsellPrice(sale, "thirdRsvpRound"),
    },

    suppliersBudgetSystem: {
      enabled: suppliersBudgetSystemEnabled,
      price: getSaleUpsellPrice(sale, "suppliersBudgetSystem"),
      givenFree: Boolean(findSaleUpsell(sale, "suppliersBudgetSystem")?.givenFree),
    },

    alcoholManagement: {
      enabled: alcoholManagementEnabled,
      staffCount: getSaleUpsellStaffCount(sale, "alcoholManagement", 0),
      totalPrice: getSaleUpsellPrice(sale, "alcoholManagement"),
    },
  };
}

function getEmployeeSalePackageFlags(sale: any, user: any) {
  const plan = getSalePlan(sale, user);
  const isSmartOrSeating =
    plan === "smart" || plan === "seating" || plan === "plan2" || plan === "plan3";
  const isSeatingPackage = plan === "seating" || plan === "plan3";
  const salesUpsells = buildEmployeeSaleUpsells(sale);

  const includeCalls = Boolean(
    isSmartOrSeating || user?.includeCalls || user?.planLimits?.callsEnabled
  );

  const includeDigitalSeating = Boolean(
    isSeatingPackage || salesUpsells.digitalSeating.enabled
  );

  const includeCreditGifts = Boolean(
    isSeatingPackage || salesUpsells.creditGifts.enabled || user?.includeCreditGifts
  );

  const includeEventManagement = Boolean(
    salesUpsells.suppliersBudgetSystem.enabled || user?.includeEventManagement
  );

  const allowedMessageRounds: 2 | 3 = salesUpsells.thirdRsvpRound.enabled
    ? 3
    : normalizeAllowedMessageRounds(
        sale?.allowedMessageRounds ??
          sale?.planLimits?.allowedMessageRounds ??
          user?.allowedMessageRounds ??
          user?.planLimits?.allowedMessageRounds
      );

  const guests = getSaleGuests(sale, user);

  const accessModules = {
    rsvpSeating: includeDigitalSeating,
    eventProduction: includeEventManagement,

    venues: Boolean(user?.accessModules?.venues ?? false),
    venueDashboard: Boolean(user?.accessModules?.venueDashboard ?? false),
    venueCrm: Boolean(user?.accessModules?.venueCrm ?? false),
    venueCalendar: Boolean(user?.accessModules?.venueCalendar ?? false),
    venueMenus: Boolean(user?.accessModules?.venueMenus ?? false),
    venueStaff: Boolean(user?.accessModules?.venueStaff ?? false),
  };

  const planLimits = {
    ...(user?.planLimits || {}),
    maxGuests: guests,
    allowedMessageRounds,
    smsEnabled: true,
    smsLimit: guests,
    seatingEnabled: includeDigitalSeating,
    remindersEnabled: true,
    callsEnabled: includeCalls,
  };

  return {
    plan,
    packageName: getSalePackageName(sale, plan),
    guests,
    includeCalls,
    callsRounds: includeCalls ? 3 : 0,
    includeDigitalSeating,
    includeCreditGifts,
    includeEventManagement,
    allowedMessageRounds,
    accessModules,
    planLimits,
    salesUpsells,
  };
}

/* =========================================================
   WEBHOOK
============================================================ */

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.log("❌ Missing signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const body = await req.text();

    let stripeEvent: Stripe.Event;

    try {
      stripeEvent = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error("❌ Invalid webhook signature:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (stripeEvent.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    await connectDB();

    const session = stripeEvent.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      console.log("Payment status is not 'paid', exiting...");
      return NextResponse.json({ received: true });
    }

    if (!session.payment_intent) {
      console.log("No payment intent found, exiting...");
      return NextResponse.json({ received: true });
    }

    /* =========================================================
       IDENTIFY USER
    ============================================================ */

    let user: any = null;

    if (session.metadata?.userId) {
      user = await User.findById(session.metadata.userId);
    }

    if (!user && session.customer_email) {
      user = await User.findOne({
        email: String(session.customer_email).toLowerCase(),
      });
    }

    if (!user) {
      console.error("❌ User not found for payment");
      return NextResponse.json({ received: true });
    }

    /* =========================================================
       HANDLE ADMIN UPGRADE
       תשלום הפרש שדרוג מהאדמין דרך Stripe
    ============================================================ */

    if (session.metadata?.source === "admin_upgrade") {
      const paymentIntentId = String(session.payment_intent);
      const amount = toNum(session.amount_total, 0) / 100;

      const existingUpgradePayment = await Payment.findOne({
        stripePaymentIntentId: paymentIntentId,
      }).lean();

      if (existingUpgradePayment) {
        console.log("ℹ️ Admin upgrade payment already exists:", paymentIntentId);
        return NextResponse.json({ received: true });
      }

      const plan = String(session.metadata?.plan || "");
      const priceKey = String(session.metadata?.priceKey || plan);
      const packageName = String(session.metadata?.packageName || "");

      const guests = toNum(session.metadata?.guests, 0);
      const maxGuests = toNum(session.metadata?.maxGuests, guests);

      const smsLimit = toNum(session.metadata?.smsLimit, 0);
      const maxMessages = toNum(session.metadata?.maxMessages, smsLimit);

      const allowedMessageRounds = normalizeAllowedMessageRounds(
        session.metadata?.allowedMessageRounds ??
          user.allowedMessageRounds ??
          user.planLimits?.allowedMessageRounds
      );

      const includeCalls = toBool(session.metadata?.includeCalls);

      const includeCreditGifts = toBool(
        session.metadata?.includeCreditGifts
      );

      const includeDigitalSeating = toBool(
        session.metadata?.includeDigitalSeating
      );

      const includeEventManagement = toBool(
        session.metadata?.includeEventManagement
      );

      const includeCustomDesign = toBool(
        session.metadata?.includeCustomDesign
      );

      const accessModules = parseAccessModulesFromMetadata(session.metadata, {
        includeDigitalSeating,
        includeEventManagement,
        existingAccessModules: user.accessModules,
        planLimits: user.planLimits,
        selfManageEnabled: user.selfManageEnabled,
      });

      const extraRecords = toNum(session.metadata?.extraRecords, 0);

      const extraRecordsAmount = toNum(
        session.metadata?.extraRecordsAmount,
        0
      );

      await Payment.create({
        email: (user.email || "").toLowerCase(),

        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: (session.customer as string) || "",

        priceKey,
        maxGuests,

        includeCalls,
        callsAddonPrice: 0,

        includeCreditGifts,
        creditGiftsAddonPrice: 0,

        amount,
        refundAmount: 0,
        currency: (session.currency || "ils").toLowerCase(),

        type: "upgrade",
        status: "paid",
        isTest: !session.livemode,

        meta: {
          source: "admin_upgrade",
          stripeEventId: stripeEvent.id,

          userId: String(user._id),
          adminId: session.metadata?.adminId || null,

          previousPlan: session.metadata?.previousPlan || null,
          plan,
          priceKey,
          packageName,

          guests,
          maxGuests,
          smsLimit,
          maxMessages,

          allowedMessageRounds,

          includeCalls,
          includeCreditGifts,
          includeDigitalSeating,
          includeEventManagement,
          includeCustomDesign,

          accessModules,

          extraRecords,
          extraRecordsAmount,
        },
      });

      await User.findByIdAndUpdate(
        user._id,
        {
          $inc: {
            paidAmount: amount,
          },

          $set: {
            hasPaid: true,
            isActive: true,

            plan,
            priceKey,
            packageName,

            guests: maxGuests,
            maxGuests,

            smsLimit,
            maxMessages,

            allowedMessageRounds,

            includeCalls,
            includeCreditGifts,

            includeDigitalSeating: accessModules.rsvpSeating,
            includeEventManagement: accessModules.eventProduction,
            includeCustomDesign,

            accessModules,

            selfManageEnabled: accessModules.eventProduction,
            customDesignEnabled: includeCustomDesign,

            "planLimits.maxGuests": maxGuests,
            "planLimits.allowedMessageRounds": allowedMessageRounds,

            "planLimits.smsEnabled": true,
            "planLimits.smsLimit": smsLimit,
            "planLimits.seatingEnabled": accessModules.rsvpSeating,
            "planLimits.remindersEnabled": true,
            "planLimits.callsEnabled": includeCalls,

            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      try {
        await notifyAdminPurchase({
          email: user.email,
          amount,
          currency: "ils",
          type: "Admin upgrade",
          details: `plan=${plan} | guests=${maxGuests} | rounds=${allowedMessageRounds} | eventProduction=${accessModules.eventProduction} | rsvpSeating=${accessModules.rsvpSeating} | extraRecords=${extraRecords}`,
        });
      } catch (err) {
        console.error("❌ Failed to notify admin about upgrade", err);
      }

      console.log("✅ Admin upgrade completed for user:", {
        userId: String(user._id),
        accessModules,
      });

      return NextResponse.json({ received: true });
    }


    /* =========================================================
       HANDLE EMPLOYEE SALES CHECKOUT
       עסקה שנוצרה ממסך עובד + פתיחת כל האפסיילים אחרי תשלום
    ============================================================ */

    if (session.metadata?.source === "employee_sales_page") {
      const paymentIntentId = String(session.payment_intent);
      const amount = toNum(session.amount_total, 0) / 100;
      const saleId = cleanString(session.metadata?.saleId);

      const sale: any = saleId ? await EmployeeSale.findById(saleId) : null;

      if (!sale) {
        console.error("❌ EmployeeSale not found for employee checkout", {
          saleId,
          userId: String(user._id),
        });
        return NextResponse.json({ received: true });
      }

      const packageFlags = getEmployeeSalePackageFlags(sale, user);
      const userPlan = toUserPlan(packageFlags.plan);
      const existingPayment = await Payment.findOne({
        stripePaymentIntentId: paymentIntentId,
      }).lean();

      const saleAlreadyMarkedPaid =
        String(sale.status || "").toLowerCase() === "paid" &&
        cleanString(sale.stripePaymentIntentId) === paymentIntentId;

      if (existingPayment && saleAlreadyMarkedPaid) {
        console.log("ℹ️ Employee sale already processed:", {
          paymentIntentId,
          saleId: String(sale._id),
        });

        return NextResponse.json({ received: true });
      }

      if (!existingPayment) {
        await Payment.create({
          email: (user.email || "").toLowerCase(),

          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          stripeCustomerId: (session.customer as string) || "",

          priceKey: userPlan,
          maxGuests: packageFlags.guests,

          includeCalls: packageFlags.includeCalls,
          callsAddonPrice: 0,

          includeCreditGifts: packageFlags.includeCreditGifts,
          creditGiftsAddonPrice: packageFlags.salesUpsells.creditGifts.price,

          amount,
          refundAmount: 0,
          currency: (session.currency || "ils").toLowerCase(),

          status: "paid",
          type: "package",
          isTest: !session.livemode,

          meta: {
            source: "employee_sales_page",
            stripeEventId: stripeEvent.id,

            userId: String(user._id),
            saleId: String(sale._id),
            employeeId: sale.employeeId ? String(sale.employeeId) : null,

            plan: packageFlags.plan,
            priceKey: userPlan,
            packageName: packageFlags.packageName,

            guests: packageFlags.guests,
            maxGuests: packageFlags.guests,

            allowedMessageRounds: packageFlags.allowedMessageRounds,

            includeCalls: packageFlags.includeCalls,
            includeCreditGifts: packageFlags.includeCreditGifts,
            includeDigitalSeating: packageFlags.includeDigitalSeating,
            includeEventManagement: packageFlags.includeEventManagement,

            accessModules: packageFlags.accessModules,
            salesUpsells: packageFlags.salesUpsells,
          },
        });
      } else {
        console.log(
          "ℹ️ Employee sale payment already exists for paymentIntent:",
          paymentIntentId
        );
      }

      const venueSeatingPrice = packageFlags.salesUpsells.venueSeating.totalPrice;
      const venueSeatingDeposit = toNum(sale?.paymentSchedule?.eventServicesDeposit, 0);
      const venueSeatingBalance = toNum(sale?.paymentSchedule?.eventServicesBalance, 0);

      await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            paidAmount: amount,
            hasPaid: true,
            isActive: true,
            billingSource: "pricing",

            isTrial: false,
            hasDashboardAccess: true,

            plan: userPlan,
            priceKey: userPlan,
            packageName: packageFlags.packageName,

            guests: packageFlags.guests,
            maxGuests: packageFlags.guests,

            allowedMessageRounds: packageFlags.allowedMessageRounds,

            planLimits: packageFlags.planLimits,

            smsLimit: packageFlags.guests,
            maxMessages: packageFlags.guests,

            includeCalls: packageFlags.includeCalls,
            callsRounds: packageFlags.callsRounds,
            callsAddonPrice: 0,
            callsEnabledBy: packageFlags.includeCalls ? "stripe" : null,
            callsEnabledAt: packageFlags.includeCalls ? new Date() : null,

            includeCreditGifts: packageFlags.includeCreditGifts,
            creditGiftsAddonPrice: packageFlags.salesUpsells.creditGifts.price,
            creditGiftsEnabledBy: packageFlags.includeCreditGifts ? "stripe" : null,
            creditGiftsEnabledAt: packageFlags.includeCreditGifts ? new Date() : null,

            includeDigitalSeating: packageFlags.includeDigitalSeating,
            includeEventManagement: packageFlags.includeEventManagement,

            accessModules: packageFlags.accessModules,

            selfManageEnabled: packageFlags.includeEventManagement,

            salesUpsells: packageFlags.salesUpsells,

            venueSeatingService: {
              enabled: packageFlags.salesUpsells.venueSeating.enabled,
              totalPrice: venueSeatingPrice,
              depositAmount: venueSeatingDeposit,
              venuePaymentAmount: venueSeatingBalance,
              staffPaymentAmount: 0,
              staffPaidFromVenue: 0,
              staffPaidFromFullAmount: 0,
              venuePaymentAfterStaff: venueSeatingBalance,
              totalAfterStaff: venueSeatingPrice,
            },

            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            stripePaidAt: new Date(),

            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      const paidAt = new Date();

      sale.set?.("status", "paid");
      sale.set?.("stripeCheckoutSessionId", sale.stripeCheckoutSessionId || session.id);
      sale.set?.("stripePaymentIntentId", paymentIntentId);
      sale.set?.("stripePaidAt", paidAt);
      sale.set?.("paidAt", paidAt);

      sale.set?.("payment.status", "paid");
      sale.set?.("payment.checkoutSessionId", sale.payment?.checkoutSessionId || session.id);
      sale.set?.("payment.paymentIntentId", paymentIntentId);
      sale.set?.("payment.paidAt", paidAt);
      sale.set?.("payment.amount", sale.payment?.amount || sale.grossAmount || amount);
      sale.set?.("payment.stripeAmount", sale.payment?.stripeAmount || sale.stripeAmount || amount);
      sale.set?.("payment.immediateAmount", sale.payment?.immediateAmount || sale.stripeAmount || amount);

      await sale.save?.();

      try {
        await notifyAdminPurchase({
          email: user.email,
          amount,
          currency: "ils",
          type: "Employee sale checkout",
          details: `saleId=${String(sale._id)} | plan=${packageFlags.plan} | guests=${packageFlags.guests} | rounds=${packageFlags.allowedMessageRounds} | eventProduction=${packageFlags.accessModules.eventProduction} | rsvpSeating=${packageFlags.accessModules.rsvpSeating}`,
        });
      } catch (err) {
        console.error("❌ Failed to notify admin about employee sale", err);
      }

      console.log("✅ Employee sale payment completed:", {
        userId: String(user._id),
        saleId: String(sale._id),
        plan: packageFlags.plan,
        guests: packageFlags.guests,
        allowedMessageRounds: packageFlags.allowedMessageRounds,
        salesUpsells: packageFlags.salesUpsells,
      });

      return NextResponse.json({ received: true });
    }

    /* =========================================================
       HANDLE PRICING / ADMIN CHECKOUT
    ============================================================ */

    const source = String(session.metadata?.source || "");

    if (source !== "pricing" && source !== "admin_checkout") {
      return NextResponse.json({ received: true });
    }

    const paymentIntentId = String(session.payment_intent);
    const amount = toNum(session.amount_total, 0) / 100;

    const plan = String(session.metadata?.plan || user.plan || "plan1");

    const priceKey = String(
      session.metadata?.priceKey || user.priceKey || plan
    );

    const packageName = String(
      session.metadata?.packageName || user.packageName || ""
    );

    const guests = toNum(
      session.metadata?.guests,
      toNum(user.guests ?? user.planLimits?.maxGuests, 0)
    );

    const maxGuests = toNum(
      session.metadata?.maxGuests,
      toNum(user.maxGuests ?? user.planLimits?.maxGuests, guests)
    );

    const allowedMessageRounds = normalizeAllowedMessageRounds(
      session.metadata?.allowedMessageRounds ??
        user.allowedMessageRounds ??
        user.planLimits?.allowedMessageRounds
    );

    const addonSeating =
      toBool(session.metadata?.seatingEnabled) ||
      toBool(session.metadata?.includeDigitalSeating);

    const addonCalls = toBool(session.metadata?.includeCalls);

    const addonCredit = toBool(session.metadata?.includeCreditGifts);

    const addonSelfManage =
      toBool(session.metadata?.selfManageEnabled) ||
      toBool(session.metadata?.includeEventManagement);

    const addonCustomDesign =
      toBool(session.metadata?.customDesignEnabled) ||
      toBool(session.metadata?.includeCustomDesign);

    const base = getPlanDefaults(plan, maxGuests || guests, allowedMessageRounds);

    const finalIncludeCalls = base.includeCalls || addonCalls;
    const finalIncludeCreditGifts = base.includeCreditGifts || addonCredit;
    const finalSeatingEnabled = base.planLimits.seatingEnabled || addonSeating;

    const finalAccessModules = parseAccessModulesFromMetadata(session.metadata, {
      includeDigitalSeating: finalSeatingEnabled,
      includeEventManagement: addonSelfManage,
      existingAccessModules: user.accessModules,
      planLimits: {
        ...(user.planLimits || {}),
        seatingEnabled: finalSeatingEnabled,
      },
      selfManageEnabled: addonSelfManage,
    });

    const finalPlanLimits = {
      ...base.planLimits,

      maxGuests: maxGuests || guests,
      allowedMessageRounds,

      seatingEnabled: finalAccessModules.rsvpSeating,
      callsEnabled: finalIncludeCalls,
      remindersEnabled: true,

      smsEnabled: true,
      smsLimit: 0,
    };

    /* =========================================================
       PAYMENT IDEMPOTENCY
    ============================================================ */

    const existingPayment = await Payment.findOne({
      stripePaymentIntentId: paymentIntentId,
    }).lean();

    if (!existingPayment) {
      await Payment.create({
        email: (user.email || "").toLowerCase(),

        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: (session.customer as string) || "",

        priceKey,
        maxGuests: maxGuests || guests,

        includeCalls: finalIncludeCalls,
        callsAddonPrice: 0,

        includeCreditGifts: finalIncludeCreditGifts,
        creditGiftsAddonPrice: 0,

        amount,
        refundAmount: 0,
        currency: (session.currency || "ils").toLowerCase(),

        status: "paid",
        type: "package",
        isTest: !session.livemode,

        meta: {
          source,
          stripeEventId: stripeEvent.id,

          userId: String(user._id),

          plan,
          priceKey,
          packageName,

          guests,
          maxGuests: maxGuests || guests,

          allowedMessageRounds,

          includeCalls: finalIncludeCalls,
          includeCreditGifts: finalIncludeCreditGifts,
          seatingEnabled: finalAccessModules.rsvpSeating,
          selfManageEnabled: finalAccessModules.eventProduction,
          customDesignEnabled: addonCustomDesign,

          accessModules: finalAccessModules,
        },
      });
    } else {
      console.log("ℹ️ Payment already exists for paymentIntent:", paymentIntentId);
    }

    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          hasPaid: true,
          paidAmount: amount,

          billingSource: source === "admin_checkout" ? "admin" : "site",

          isTrial: false,
          hasDashboardAccess: true,

          isActive: source === "admin_checkout" ? true : false,

          plan,
          priceKey,
          packageName,

          guests: maxGuests || guests,
          maxGuests: maxGuests || guests,

          allowedMessageRounds,

          planLimits: finalPlanLimits,

          maxMessages: 0,
          smsLimit: 0,

          includeCalls: finalIncludeCalls,
          includeCreditGifts: finalIncludeCreditGifts,
          includeDigitalSeating: finalAccessModules.rsvpSeating,
          includeEventManagement: finalAccessModules.eventProduction,
          includeCustomDesign: addonCustomDesign,

          accessModules: finalAccessModules,

          selfManageEnabled: finalAccessModules.eventProduction,
          customDesignEnabled: addonCustomDesign,

          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    try {
      await notifyAdminPurchase({
        email: user.email,
        amount,
        currency: "ils",
        type: source === "admin_checkout" ? "Admin checkout" : "New registration",
        details: `plan=${plan} | guests=${maxGuests || guests} | rounds=${allowedMessageRounds} | eventProduction=${finalAccessModules.eventProduction} | rsvpSeating=${finalAccessModules.rsvpSeating}`,
      });
    } catch (err) {
      console.error("❌ Failed to notify admin", err);
    }

    console.log("✅ Stripe payment completed:", {
      userId: String(user._id),
      source,
      plan,
      guests: maxGuests || guests,
      allowedMessageRounds,
      accessModules: finalAccessModules,
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("🔥 Stripe webhook fatal error:", err);
    return NextResponse.json({ received: true });
  }
}