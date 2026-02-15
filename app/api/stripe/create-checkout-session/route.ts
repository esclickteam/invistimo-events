import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
});

type PlanKey = "plan1" | "plan2" | "plan3";

/* ============================================================
   PRICE TABLES
============================================================ */

const planRates: Record<PlanKey, [number, number][]> = {
  plan1: [
    [50,1.19],[100,1.16],[150,1.13],[200,1.1],[250,1.08],
    [300,1.06],[350,1.04],[400,1.02],[450,1.0],[500,0.98],
    [550,0.96],[600,0.94],[650,0.93],[700,0.92],[750,0.9],[800,0.88],
  ],
  plan2: [
    [50,2.85],[100,2.38],[150,2.35],[200,2.29],[250,2.26],
    [300,2.19],[350,2.15],[400,2.1],[450,2.05],[500,2.0],
    [550,1.96],[600,1.92],[650,1.92],[700,1.92],[750,1.92],[800,1.9],
  ],
  plan3: [
    [50,3.75],[100,3.22],[150,2.98],[200,2.76],[250,2.65],
    [300,2.52],[350,2.43],[400,2.35],[450,2.28],[500,2.21],
    [550,2.14],[600,2.07],[650,2.06],[700,2.05],[750,2.04],[800,2.03],
  ],
};

/* ============================================================
   ADDONS
============================================================ */

const addonPrices: Record<
  PlanKey,
  { credit: number; seating: number; system: number; design: number }
> = {
  plan1: { credit: 150, seating: 100, system: 200, design: 200 },
  plan2: { credit: 100, seating: 5, system: 150, design: 150 },
  plan3: { credit: 0, seating: 0, system: 100, design: 100 },
};

/* ============================================================
   HELPERS
============================================================ */

function isValidPlan(p: any): p is PlanKey {
  return p === "plan1" || p === "plan2" || p === "plan3";
}

function getRate(plan: PlanKey, guests: number) {
  const table = planRates[plan];
  for (const [limit, rate] of table) {
    if (guests <= limit) return rate;
  }
  return table[table.length - 1][1];
}

function calculateBase(plan: PlanKey, guests: number) {
  if (guests === 10) return 5; // 🔥 מחיר בדיקה מיוחד
  return Math.round(guests * getRate(plan, guests));
}

function toBool(v: unknown) {
  return String(v ?? "").toLowerCase() === "true";
}

/* ============================================================
   POST
============================================================ */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const plan = body.plan;
    const guests = Number(body.guests);
    const email = String(body.email || "").trim().toLowerCase();
    const userId = String(body.userId || "").trim();

    if (!isValidPlan(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!Number.isFinite(guests) || guests <= 0) {
      return NextResponse.json({ error: "Invalid guests" }, { status: 400 });
    }

    if (!email || !userId) {
      return NextResponse.json({ error: "Missing identity fields" }, { status: 400 });
    }

    const seating = toBool(body.seating);
    const credit = toBool(body.credit);
    const system = toBool(body.system);
    const design = toBool(body.design);

    /* ================= BASE ================= */

    const base = calculateBase(plan, guests);

    /* ================= ADDONS ================= */

    const prices = addonPrices[plan];
    let total = base;

    if (credit) total += prices.credit;
    if (seating) total += prices.seating;
    if (system) total += prices.system;
    if (design) total += prices.design;

    if (total <= 0) {
      return NextResponse.json({ error: "Invalid total" }, { status: 400 });
    }

    /* ================= STRIPE ================= */

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      return NextResponse.json({ error: "Missing site URL" }, { status: 500 });
    }

    const cleanBaseUrl = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "ils",
            product_data: {
              name: `Invistimo – ${plan}`,
              description: `Guests: ${guests}`,
            },
            unit_amount: Math.round(total * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${cleanBaseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cleanBaseUrl}/payment/cancel`,
      metadata: {
        source: "pricing",
        userId,
        plan,
        guests: String(guests),

        seatingEnabled: String(seating),
        includeCreditGifts: String(credit),
        includeCalls: String(plan === "plan2" || plan === "plan3"),
        selfManageEnabled: String(system),
        customDesignEnabled: String(design),

        calculatedTotal: String(total),
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
    });

  } catch (err) {
    console.error("❌ create-checkout error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
