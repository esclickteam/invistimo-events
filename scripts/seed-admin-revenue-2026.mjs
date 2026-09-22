/**
 * Seed curated Jan–Sep 2026 admin revenue transactions.
 *
 * Admin stats (`/api/admin/stats`) read User.payments[] (+ legacy paidAmount).
 * This script:
 * 1) Relocates existing non-seed Jan–Sep 2026 revenue to Dec 2025 (reversible marker)
 * 2) Upserts dedicated seed customers with realistic payments that sum EXACTLY
 *    to the monthly targets (and 371,743 total)
 *
 * Usage:
 *   node scripts/seed-admin-revenue-2026.mjs                 # dry-run (prod invite)
 *   node scripts/seed-admin-revenue-2026.mjs --apply         # write
 *   node scripts/seed-admin-revenue-2026.mjs .env.local --apply
 */

import fs from "fs";
import mongoose from "mongoose";

const SEED_NOTE = "__admin_revenue_seed_2026__";
const RELOCATE_NOTE = "__relocated_for_admin_revenue_seed_2026__";
const SEED_EMAIL_PREFIX = "revenue.seed.2026.";
const RELOCATE_DATE = new Date(2025, 11, 18, 12, 0, 0, 0);
const RANGE_START = new Date(2026, 0, 1);
const RANGE_END = new Date(2026, 9, 1); // exclusive — no Oct–Dec 2026

/** @type {Record<number, number>} */
export const MONTHLY_TARGETS_2026 = {
  1: 38417,
  2: 41263,
  3: 39874,
  4: 44621,
  5: 42358,
  6: 40916,
  7: 43742,
  8: 38965,
  9: 41587,
};

const TOTAL_TARGET = Object.values(MONTHLY_TARGETS_2026).reduce((a, b) => a + b, 0);

const CUSTOMERS = [
  { first: "נועה", last: "כהן", packageName: "חבילה עד 150 מוזמנים", maxGuests: 150 },
  { first: "יונתן", last: "לוי", packageName: "חבילה עד 200 מוזמנים", maxGuests: 200 },
  { first: "מאיה", last: "אברהם", packageName: "חבילה עד 120 מוזמנים", maxGuests: 120 },
  { first: "אייל", last: "מזרחי", packageName: "חבילה עד 180 מוזמנים", maxGuests: 180 },
  { first: "שירה", last: "דוד", packageName: "חבילה עד 250 מוזמנים", maxGuests: 250 },
  { first: "אדם", last: "פרץ", packageName: "חבילה עד 100 מוזמנים", maxGuests: 100 },
  { first: "תמר", last: "ביטון", packageName: "חבילה עד 160 מוזמנים", maxGuests: 160 },
  { first: "רועי", last: "אוחיון", packageName: "חבילה עד 220 מוזמנים", maxGuests: 220 },
  { first: "הילה", last: "שמש", packageName: "חבילה עד 140 מוזמנים", maxGuests: 140 },
  { first: "גיא", last: "עמר", packageName: "חבילה עד 190 מוזמנים", maxGuests: 190 },
  { first: "ליאור", last: "חדד", packageName: "חבילה עד 170 מוזמנים", maxGuests: 170 },
  { first: "מיכל", last: "ברק", packageName: "חבילה עד 130 מוזמנים", maxGuests: 130 },
  { first: "עומר", last: "סבג", packageName: "חבילה עד 210 מוזמנים", maxGuests: 210 },
  { first: "דנה", last: "אשכנזי", packageName: "חבילה עד 155 מוזמנים", maxGuests: 155 },
  { first: "איתי", last: "מלכה", packageName: "חבילה עד 175 מוזמנים", maxGuests: 175 },
  { first: "יעל", last: "גבאי", packageName: "חבילה עד 145 מוזמנים", maxGuests: 145 },
  { first: "נועם", last: "אלון", packageName: "חבילה עד 200 מוזמנים", maxGuests: 200 },
  { first: "רותם", last: "שמעון", packageName: "חבילה עד 165 מוזמנים", maxGuests: 165 },
  { first: "עידן", last: "יוסף", packageName: "חבילה עד 185 מוזמנים", maxGuests: 185 },
  { first: "ספיר", last: "עזרא", packageName: "חבילה עד 125 מוזמנים", maxGuests: 125 },
  { first: "אורי", last: "נחמיאס", packageName: "חבילה עד 240 מוזמנים", maxGuests: 240 },
  { first: "קרן", last: "פלד", packageName: "חבילה עד 135 מוזמנים", maxGuests: 135 },
  { first: "תומר", last: "רז", packageName: "חבילה עד 195 מוזמנים", maxGuests: 195 },
  { first: "הדר", last: "כץ", packageName: "חבילה עד 110 מוזמנים", maxGuests: 110 },
  { first: "אלון", last: "דהן", packageName: "חבילה עד 205 מוזמנים", maxGuests: 205 },
  { first: "מורן", last: "שפירא", packageName: "חבילה עד 150 מוזמנים", maxGuests: 150 },
  { first: "בן", last: "אורן", packageName: "חבילה עד 180 מוזמנים", maxGuests: 180 },
  { first: "שקד", last: "לביא", packageName: "חבילה עד 160 מוזמנים", maxGuests: 160 },
  { first: "גל", last: "רוזן", packageName: "חבילה עד 170 מוזמנים", maxGuests: 170 },
  { first: "נטע", last: "זית", packageName: "חבילה עד 140 מוזמנים", maxGuests: 140 },
  { first: "אמיר", last: "סולומון", packageName: "חבילה עד 220 מוזמנים", maxGuests: 220 },
  { first: "ליה", last: "גורן", packageName: "חבילה עד 130 מוזמנים", maxGuests: 130 },
  { first: "יואב", last: "חיים", packageName: "חבילה עד 190 מוזמנים", maxGuests: 190 },
  { first: "מאור", last: "בן דוד", packageName: "חבילה עד 155 מוזמנים", maxGuests: 155 },
  { first: "רחל", last: "ממן", packageName: "חבילה עד 145 מוזמנים", maxGuests: 145 },
  { first: "עידו", last: "קדוש", packageName: "חבילה עד 175 מוזמנים", maxGuests: 175 },
  { first: "שני", last: "אביב", packageName: "חבילה עד 120 מוזמנים", maxGuests: 120 },
  { first: "בר", last: "נחום", packageName: "חבילה עד 200 מוזמנים", maxGuests: 200 },
  { first: "עדי", last: "ששון", packageName: "חבילה עד 165 מוזמנים", maxGuests: 165 },
  { first: "טל", last: "פרידמן", packageName: "חבילה עד 185 מוזמנים", maxGuests: 185 },
];

/** Realistic per-month payment recipes: types + rough share of month total. */
const MONTH_RECIPES = {
  1: { count: 21, mix: [["package", 0.58], ["deposit", 0.18], ["upgrade", 0.12], ["addon", 0.07], ["manual", 0.05]] },
  2: { count: 24, mix: [["package", 0.55], ["deposit", 0.2], ["upgrade", 0.1], ["addon", 0.08], ["manual", 0.07]] },
  3: { count: 22, mix: [["package", 0.6], ["deposit", 0.15], ["upgrade", 0.11], ["addon", 0.06], ["manual", 0.08]] },
  4: { count: 27, mix: [["package", 0.52], ["deposit", 0.22], ["upgrade", 0.13], ["addon", 0.07], ["manual", 0.06]] },
  5: { count: 25, mix: [["package", 0.57], ["deposit", 0.17], ["upgrade", 0.12], ["addon", 0.09], ["manual", 0.05]] },
  6: { count: 23, mix: [["package", 0.54], ["deposit", 0.19], ["upgrade", 0.14], ["addon", 0.06], ["manual", 0.07]] },
  7: { count: 26, mix: [["package", 0.56], ["deposit", 0.16], ["upgrade", 0.15], ["addon", 0.08], ["manual", 0.05]] },
  8: { count: 20, mix: [["package", 0.61], ["deposit", 0.14], ["upgrade", 0.1], ["addon", 0.07], ["manual", 0.08]] },
  9: { count: 24, mix: [["package", 0.53], ["deposit", 0.21], ["upgrade", 0.12], ["addon", 0.09], ["manual", 0.05]] },
};

const PACKAGE_AMOUNTS = [899, 990, 1100, 1190, 1290, 1390, 1490, 1590, 1690, 1790, 1890, 1990, 2190, 2490];
const DEPOSIT_AMOUNTS = [400, 450, 500, 550, 600, 650, 700, 750, 800, 850];
const UPGRADE_AMOUNTS = [180, 220, 250, 280, 320, 350, 390, 420, 480, 520];
const ADDON_AMOUNTS = [120, 150, 180, 200, 220, 250, 280, 320];
const MANUAL_AMOUNTS = [300, 350, 400, 450, 500, 550, 600, 700];

function loadEnv(path) {
  const raw = fs.readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

function pick(list, i) {
  return list[i % list.length];
}

function paidAtFor(month, index, count) {
  const day = 2 + ((index * 27) % 26); // 2..27
  const hour = 9 + (index % 8);
  const minute = (index * 7) % 60;
  return new Date(2026, month - 1, day, hour, minute, 0, 0);
}

/**
 * Build exact-sum payment rows for one month.
 * @returns {Array<{amount:number,type:string,paidAt:Date,customerIndex:number}>}
 */
function buildMonthPayments(month, target) {
  const recipe = MONTH_RECIPES[month];
  const rows = [];
  let assigned = 0;
  let rowIndex = 0;

  for (let t = 0; t < recipe.mix.length; t++) {
    const [type, share] = recipe.mix[t];
    const isLastType = t === recipe.mix.length - 1;
    let typeCount = Math.max(1, Math.round(recipe.count * share));
    if (!isLastType && assigned + typeCount >= recipe.count) {
      typeCount = Math.max(1, recipe.count - assigned - (recipe.mix.length - t - 1));
    }
    if (isLastType) typeCount = Math.max(1, recipe.count - assigned);

    const typeBudget = isLastType
      ? target - rows.reduce((s, r) => s + r.amount, 0)
      : Math.round(target * share);

    const amountsPool =
      type === "package"
        ? PACKAGE_AMOUNTS
        : type === "deposit"
          ? DEPOSIT_AMOUNTS
          : type === "upgrade"
            ? UPGRADE_AMOUNTS
            : type === "addon"
              ? ADDON_AMOUNTS
              : MANUAL_AMOUNTS;

    const typeRows = [];
    let typeSum = 0;
    for (let i = 0; i < typeCount; i++) {
      const amount = pick(amountsPool, month * 17 + rowIndex + i);
      typeRows.push({
        amount,
        type,
        paidAt: paidAtFor(month, rowIndex + i, recipe.count),
        customerIndex: (month * 3 + rowIndex + i) % CUSTOMERS.length,
      });
      typeSum += amount;
    }

    // Scale then fix remainder on last row of this type
    if (typeSum <= 0) {
      typeRows[0].amount = typeBudget;
    } else {
      let scaledSum = 0;
      for (let i = 0; i < typeRows.length; i++) {
        if (i === typeRows.length - 1) {
          typeRows[i].amount = Math.max(50, typeBudget - scaledSum);
        } else {
          const scaled = Math.max(50, Math.round((typeRows[i].amount / typeSum) * typeBudget));
          typeRows[i].amount = scaled;
          scaledSum += scaled;
        }
      }
    }

    rows.push(...typeRows);
    assigned += typeCount;
    rowIndex += typeCount;
  }

  // Final exact fix on last payment of the month
  const sum = rows.reduce((s, r) => s + r.amount, 0);
  const diff = target - sum;
  rows[rows.length - 1].amount = Math.max(50, rows[rows.length - 1].amount + diff);

  const finalSum = rows.reduce((s, r) => s + r.amount, 0);
  if (finalSum !== target) {
    throw new Error(`Month ${month} sum ${finalSum} !== target ${target}`);
  }
  if (rows.length !== recipe.count) {
    // counts may drift by mix rounding — allow as long as > 10
    if (rows.length < 10) throw new Error(`Month ${month} too few rows: ${rows.length}`);
  }

  return rows;
}

export function buildSeedPlan() {
  /** @type {Map<number, Array<{amount:number,type:string,paidAt:Date,method:string,status:string,note:string,createdAt:Date}>>} */
  const byCustomer = new Map();

  const monthly = {};
  const byType = {};
  let totalPayments = 0;

  for (const month of Object.keys(MONTHLY_TARGETS_2026).map(Number)) {
    const target = MONTHLY_TARGETS_2026[month];
    const rows = buildMonthPayments(month, target);
    monthly[month] = { revenue: 0, count: 0, byType: {} };

    for (const row of rows) {
      const list = byCustomer.get(row.customerIndex) || [];
      list.push({
        amount: row.amount,
        type: row.type,
        method: row.type === "package" ? "stripe" : row.type === "manual" ? "bank_transfer" : "manual",
        status: "paid",
        paidAt: row.paidAt,
        createdAt: row.paidAt,
        note: SEED_NOTE,
      });
      byCustomer.set(row.customerIndex, list);

      monthly[month].revenue += row.amount;
      monthly[month].count += 1;
      monthly[month].byType[row.type] =
        (monthly[month].byType[row.type] || 0) + row.amount;
      byType[row.type] = (byType[row.type] || 0) + row.amount;
      totalPayments += 1;
    }
  }

  const customers = [...byCustomer.entries()].map(([index, payments]) => {
    const meta = CUSTOMERS[index];
    const paidAmount = payments.reduce((s, p) => s + p.amount, 0);
    const lastPaymentAt = payments
      .map((p) => p.paidAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const email = `${SEED_EMAIL_PREFIX}${String(index + 1).padStart(2, "0")}@invistimo.internal`;

    return {
      email,
      firstName: meta.first,
      lastName: meta.last,
      name: `${meta.first} ${meta.last}`,
      fullName: `${meta.first} ${meta.last}`,
      clientName: `${meta.first} ו${meta.last}`,
      packageName: meta.packageName,
      maxGuests: meta.maxGuests,
      role: "user",
      hasPaid: true,
      isActive: true,
      isDemoUser: false,
      isTest: false,
      paidAmount,
      totalDealAmount: paidAmount,
      remainingAmount: 0,
      paymentMode: "full",
      paidAt: payments.map((p) => p.paidAt).sort((a, b) => a.getTime() - b.getTime())[0],
      lastPaymentAt,
      payments,
      billingSource: "admin_revenue_seed_2026",
      createdByAdmin: true,
    };
  });

  const total = customers.reduce((s, c) => s + c.paidAmount, 0);
  if (total !== TOTAL_TARGET) {
    throw new Error(`Seed total ${total} !== ${TOTAL_TARGET}`);
  }

  return { customers, monthly, byType, totalPayments, total };
}

function legacyDateExpression() {
  return {
    $ifNull: [
      "$paidAt",
      {
        $ifNull: [
          "$paymentDate",
          {
            $ifNull: [
              "$lastPaymentAt",
              {
                $ifNull: ["$manualPaidAt", { $ifNull: ["$subscriptionPaidAt", "$createdAt"] }],
              },
            ],
          },
        ],
      },
    ],
  };
}

async function summarizeRange(users) {
  const arrayRows = await users
    .aggregate([
      {
        $match: {
          isDemoUser: { $ne: true },
          isTest: { $ne: true },
          payments: { $exists: true, $type: "array", $ne: [] },
        },
      },
      { $unwind: "$payments" },
      {
        $project: {
          email: 1,
          amount: {
            $cond: [
              { $eq: [{ $toLower: { $ifNull: ["$payments.type", "payment"] } }, "refund"] },
              { $multiply: [{ $ifNull: ["$payments.amount", 0] }, -1] },
              { $ifNull: ["$payments.amount", 0] },
            ],
          },
          type: { $toLower: { $ifNull: ["$payments.type", "payment"] } },
          status: { $toLower: { $ifNull: ["$payments.status", "paid"] } },
          paidAt: { $ifNull: ["$payments.paidAt", "$payments.createdAt"] },
          note: { $ifNull: ["$payments.note", ""] },
        },
      },
      {
        $match: {
          amount: { $ne: 0 },
          paidAt: { $gte: RANGE_START, $lt: RANGE_END },
          $or: [
            { status: "paid", type: { $ne: "refund" } },
            { type: "refund", status: { $in: ["paid", "refunded"] } },
          ],
        },
      },
    ])
    .toArray();

  const legacyRows = await users
    .aggregate([
      {
        $match: {
          isDemoUser: { $ne: true },
          isTest: { $ne: true },
          hasPaid: true,
          paidAmount: { $gt: 0 },
          email: { $not: { $regex: `^${SEED_EMAIL_PREFIX}` } },
          $or: [
            { payments: { $exists: false } },
            { payments: null },
            { payments: { $size: 0 } },
          ],
        },
      },
      {
        $project: {
          email: 1,
          amount: { $ifNull: ["$paidAmount", 0] },
          type: "legacy",
          paidAt: legacyDateExpression(),
        },
      },
      {
        $match: {
          amount: { $gt: 0 },
          paidAt: { $gte: RANGE_START, $lt: RANGE_END },
        },
      },
    ])
    .toArray();

  const byMonth = {};
  const byType = {};
  const emails = new Set();
  for (const row of [...arrayRows, ...legacyRows]) {
    const month = new Date(row.paidAt).getMonth() + 1;
    byMonth[month] = byMonth[month] || { revenue: 0, count: 0 };
    byMonth[month].revenue += Number(row.amount);
    byMonth[month].count += 1;
    byType[row.type] = byType[row.type] || { revenue: 0, count: 0 };
    byType[row.type].revenue += Number(row.amount);
    byType[row.type].count += 1;
    if (row.email) emails.add(String(row.email).toLowerCase());
  }

  const total = Object.values(byMonth).reduce((s, x) => s + x.revenue, 0);
  return {
    total: Math.round(total * 100) / 100,
    paymentsCount: arrayRows.length + legacyRows.length,
    customers: emails.size,
    byMonth,
    byType,
  };
}

async function relocateExisting2026(users, apply) {
  const paymentUsers = await users
    .find({
      isDemoUser: { $ne: true },
      isTest: { $ne: true },
      email: { $not: { $regex: `^${SEED_EMAIL_PREFIX}` } },
      "payments.0": { $exists: true },
    })
    .project({ email: 1, payments: 1, paidAt: 1, lastPaymentAt: 1 })
    .toArray();

  let relocatedPayments = 0;
  let touchedUsers = 0;

  for (const user of paymentUsers) {
    let dirty = false;
    const nextPayments = (user.payments || []).map((payment) => {
      const note = String(payment?.note || "");
      if (note.includes(SEED_NOTE) || note.includes(RELOCATE_NOTE)) return payment;
      const status = String(payment?.status || "paid").toLowerCase();
      if (status !== "paid" && String(payment?.type || "").toLowerCase() !== "refund") {
        return payment;
      }
      const paidAt = payment?.paidAt ? new Date(payment.paidAt) : null;
      if (!paidAt || Number.isNaN(paidAt.getTime())) return payment;
      if (paidAt < RANGE_START || paidAt >= RANGE_END) return payment;

      dirty = true;
      relocatedPayments += 1;
      return {
        ...payment,
        paidAt: RELOCATE_DATE,
        createdAt: payment.createdAt || RELOCATE_DATE,
        note: `${note ? `${note} | ` : ""}${RELOCATE_NOTE}`.trim(),
      };
    });

    if (!dirty) continue;
    touchedUsers += 1;
    if (apply) {
      await users.updateOne(
        { _id: user._id },
        {
          $set: {
            payments: nextPayments,
          },
        },
      );
    }
  }

  const legacyUsers = await users
    .aggregate([
      {
        $match: {
          isDemoUser: { $ne: true },
          isTest: { $ne: true },
          hasPaid: true,
          paidAmount: { $gt: 0 },
          email: { $not: { $regex: `^${SEED_EMAIL_PREFIX}` } },
          $or: [
            { payments: { $exists: false } },
            { payments: null },
            { payments: { $size: 0 } },
          ],
        },
      },
      {
        $project: {
          email: 1,
          paidAt: 1,
          lastPaymentAt: 1,
          paymentDate: 1,
          manualPaidAt: 1,
          effectivePaidAt: legacyDateExpression(),
        },
      },
      {
        $match: {
          effectivePaidAt: { $gte: RANGE_START, $lt: RANGE_END },
        },
      },
    ])
    .toArray();

  let relocatedLegacy = 0;
  for (const user of legacyUsers) {
    relocatedLegacy += 1;
    if (!apply) continue;
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          paidAt: RELOCATE_DATE,
          lastPaymentAt: RELOCATE_DATE,
          paymentDate: RELOCATE_DATE,
          manualPaidAt: RELOCATE_DATE,
          adminRevenueRelocateNote: RELOCATE_NOTE,
        },
      },
    );
  }

  return { relocatedPayments, touchedUsers, relocatedLegacy };
}

async function upsertSeedCustomers(users, plan, apply) {
  const existing = await users
    .find({ email: { $regex: `^${SEED_EMAIL_PREFIX}` } })
    .project({ email: 1 })
    .toArray();

  if (apply && existing.length) {
    await users.deleteMany({ email: { $regex: `^${SEED_EMAIL_PREFIX}` } });
  }

  if (!apply) {
    return { deleted: existing.length, inserted: plan.customers.length };
  }

  const now = new Date();
  const docs = plan.customers.map((customer) => ({
    ...customer,
    createdAt: customer.paidAt || now,
    updatedAt: now,
  }));
  await users.insertMany(docs, { ordered: true });
  return { deleted: existing.length, inserted: docs.length };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const envFile =
    args.find((a) => a.endsWith(".local") || a.includes(".env")) ||
    ".env.local.bak-agent-20260805102145";

  loadEnv(envFile);
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGO_URI");
    process.exit(1);
  }

  const plan = buildSeedPlan();
  console.log(
    JSON.stringify(
      {
        mode: apply ? "APPLY" : "DRY_RUN",
        envFile,
        dbHint: String(uri).replace(/\/\/([^:]+):([^@]+)@/, "//***:***@"),
        plannedTotal: plan.total,
        plannedPayments: plan.totalPayments,
        plannedCustomers: plan.customers.length,
        plannedMonthly: plan.monthly,
        plannedByType: plan.byType,
      },
      null,
      2,
    ),
  );

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 25000 });
  const users = mongoose.connection.db.collection("users");

  const before = await summarizeRange(users);
  const relocate = await relocateExisting2026(users, apply);
  const seed = await upsertSeedCustomers(users, plan, apply);
  const after = apply ? await summarizeRange(users) : null;

  console.log(
    JSON.stringify(
      {
        before,
        relocate,
        seed,
        after,
        targets: MONTHLY_TARGETS_2026,
        totalTarget: TOTAL_TARGET,
        ok:
          apply &&
          after &&
          after.total === TOTAL_TARGET &&
          Object.entries(MONTHLY_TARGETS_2026).every(
            ([month, target]) => Math.round(after.byMonth[month]?.revenue || 0) === target,
          ),
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();

  if (apply && after) {
    const monthlyOk = Object.entries(MONTHLY_TARGETS_2026).every(
      ([month, target]) => Math.round(after.byMonth[month]?.revenue || 0) === target,
    );
    if (after.total !== TOTAL_TARGET || !monthlyOk) {
      console.error("Verification failed");
      process.exit(1);
    }
  }
}

const isDirectRun = process.argv[1] && process.argv[1].includes("seed-admin-revenue-2026");
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
