import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User";

/**
 * מתקן לקוחות שסכומם "קופץ" להכנסה החודשית כל חודש.
 *
 * סיבות נפוצות:
 * 1. hasPaid + paidAmount בלי paidAt / בלי payments[] — הסטטיסטיקה הישנה
 *    נפלה ל-updatedAt ולכן כל שמירה הזיזה את הסכום לחודש הנוכחי.
 * 2. רשומת "יתרת תשלומים קודמת" שנשמרה עם paidAt=היום במקום תאריך היסטורי.
 *
 * הרצה:
 *   npx tsx scripts/fix-stuck-monthly-revenue.ts
 *   npx tsx scripts/fix-stuck-monthly-revenue.ts --apply
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const APPLY = process.argv.includes("--apply");

const STUCK_NAME_PATTERNS = [
  /גל/,
  /אורנית/,
  /רפאל/,
  /אברמוב/,
  /abramov/i,
  /rafael/i,
];

function objectIdDate(id: unknown): Date | null {
  try {
    const rawId = String(id || "");
    if (/^[a-f0-9]{24}$/i.test(rawId)) {
      return new Date(parseInt(rawId.slice(0, 8), 16) * 1000);
    }
  } catch {
    // ignore
  }
  return null;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function pickHistoricalDate(user: any): Date | null {
  return (
    asDate(user.paidAt) ||
    asDate(user.lastPaymentAt) ||
    asDate(user.manualPaidAt) ||
    asDate(user.createdAt) ||
    objectIdDate(user._id)
  );
}

function displayName(user: any) {
  return (
    user.fullName ||
    user.name ||
    user.clientName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    String(user._id)
  );
}

function isTargetUser(user: any) {
  const haystack = [
    user.name,
    user.fullName,
    user.clientName,
    user.firstName,
    user.lastName,
    user.email,
  ]
    .filter(Boolean)
    .join(" ");

  return STUCK_NAME_PATTERNS.some((pattern) => pattern.test(haystack));
}

function monthsApart(a: Date, b: Date) {
  return Math.abs(
    (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth())
  );
}

async function fixStuckMonthlyRevenue() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("❌ Missing MONGO_URI");
  }

  console.log(APPLY ? "🛠 APPLY mode" : "👀 DRY-RUN mode (pass --apply to write)");
  console.log("Connecting...");

  await mongoose.connect(mongoUri);
  console.log("✅ Connected");

  const users = await User.find({
    isDemoUser: { $ne: true },
    isTest: { $ne: true },
    hasPaid: true,
    paidAmount: { $gt: 0 },
  })
    .select(
      "name fullName firstName lastName clientName email paidAmount paidAt lastPaymentAt manualPaidAt createdAt updatedAt payments eventDate totalDealAmount remainingAmount"
    )
    .lean();

  let inspected = 0;
  let changed = 0;

  for (const user of users) {
    const historicalDate = pickHistoricalDate(user);
    const payments = Array.isArray(user.payments) ? [...user.payments] : [];
    const target = isTargetUser(user);
    let dirty = false;
    const notes: string[] = [];

    // 1) יוזר ישן בלי paidAt — מקבעים תאריך היסטורי כדי לא ליפול ל-updatedAt
    if (!asDate(user.paidAt) && historicalDate) {
      user.paidAt = historicalDate;
      dirty = true;
      notes.push(`set paidAt=${historicalDate.toISOString()}`);
    }

    if (!asDate(user.lastPaymentAt) && historicalDate) {
      user.lastPaymentAt = historicalDate;
      dirty = true;
      notes.push(`set lastPaymentAt=${historicalDate.toISOString()}`);
    }

    // 2) רשומות גיבוי / תשלומים בלי תאריך / עם תאריך "היום" על עסקה ישנה
    const fixedPayments = payments.map((payment: any) => {
      const next = { ...payment };
      const paidAt = asDate(payment?.paidAt);
      const createdAt = asDate(payment?.createdAt);
      const note = String(payment?.note || "");
      const isLegacyBackfill = note.includes("יתרת תשלומים קודמת");
      const anchor = historicalDate || objectIdDate(user._id);

      if (!anchor) return next;

      if (!paidAt) {
        next.paidAt = createdAt || anchor;
        dirty = true;
        notes.push("filled missing payment.paidAt");
        return next;
      }

      const looksRecentlyStamped =
        monthsApart(paidAt, anchor) >= 1 && paidAt.getTime() > anchor.getTime();

      if ((isLegacyBackfill || target) && looksRecentlyStamped) {
        next.paidAt = anchor;
        if (!createdAt || monthsApart(createdAt, anchor) >= 1) {
          next.createdAt = anchor;
        }
        dirty = true;
        notes.push(
          `moved payment ${Number(payment.amount || 0)} from ${paidAt.toISOString()} → ${anchor.toISOString()}`
        );
      }

      return next;
    });

    // 3) לקוחות יעד בלי payments[] — יוצרים רשומה היסטורית אחת
    if (target && fixedPayments.length === 0 && Number(user.paidAmount || 0) > 0 && historicalDate) {
      fixedPayments.push({
        amount: Number(user.paidAmount || 0),
        type: "manual",
        method: "manual",
        status: "paid",
        paidAt: historicalDate,
        createdAt: historicalDate,
        note: "תיקון תשלום היסטורי — מניעת קפיצה להכנסה חודשית",
      });
      dirty = true;
      notes.push("created historical payments[] entry");
    }

    if (!dirty) continue;

    inspected += 1;

    console.log("\n---");
    console.log(target ? "🎯 TARGET" : "fix", displayName(user), String(user._id));
    console.log("email:", user.email || "-");
    console.log("paidAmount:", user.paidAmount);
    console.log("changes:", notes.join(" | "));

    if (!APPLY) continue;

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          paidAt: user.paidAt || historicalDate,
          lastPaymentAt: user.lastPaymentAt || historicalDate,
          payments: fixedPayments,
        },
      }
    );

    changed += 1;
  }

  console.log("\n======= SUMMARY =======");
  console.log("Users needing fix:", inspected);
  console.log(APPLY ? `Updated: ${changed}` : "No writes (dry-run)");

  await mongoose.disconnect();
  process.exit(0);
}

fixStuckMonthlyRevenue().catch(async (err) => {
  console.error("❌ Fix failed:", err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
