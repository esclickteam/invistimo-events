import User from "@/models/User";

/**
 * מעביר תשלומים תקועים של לקוחות ספציפיים לדצמבר 2025.
 * לא מוחק משתמשים, לא מכבה גישה, לא משנה סכומים —
 * רק מתקן את תאריך התשלום להכנסה החודשית.
 */

export const DECEMBER_PAYMENT_DATE = new Date(2025, 11, 1, 12, 0, 0, 0);

function userDisplayText(user: any) {
  return [
    user?.name,
    user?.fullName,
    user?.clientName,
    user?.firstName,
    user?.lastName,
    user?.email,
  ]
    .filter(Boolean)
    .join(" ");
}

function isTargetUser(user: any) {
  const text = userDisplayText(user);

  const isGalAndOrnit =
    /גל\s*ו?\s*אורנית/.test(text) ||
    (/גל/.test(text) && /אורנית/.test(text));

  const isRafaelAbramov =
    (/רפאל/.test(text) && /אברמוב/.test(text)) ||
    (/rafael/i.test(text) && /abramov/i.test(text)) ||
    /רפאל\s*אברמוב/.test(text);

  return isGalAndOrnit || isRafaelAbramov;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isAlreadyDecember2025(value: unknown) {
  const date = asDate(value);
  if (!date) return false;
  return date.getFullYear() === 2025 && date.getMonth() === 11;
}

function needsMoveToDecember(value: unknown) {
  const date = asDate(value);
  if (!date) return true;
  // כבר בדצמבר 2025 — אין מה לתקן
  if (isAlreadyDecember2025(date)) return false;
  // תאריך ב-2026 (כמו אוגוסט הנוכחי) = תאריך שגוי שקופץ להכנסה
  if (date.getFullYear() >= 2026) return true;
  // תאריך אחרי דצמבר 2025 גם נחשב שגוי לרשומות האלה
  return date.getTime() > DECEMBER_PAYMENT_DATE.getTime();
}

export async function moveStuckPaymentsToDecember() {
  const users = await User.find({
    isDemoUser: { $ne: true },
    isTest: { $ne: true },
    hasPaid: true,
    paidAmount: { $gt: 0 },
  })
    .select(
      "name fullName firstName lastName clientName email paidAmount paidAt lastPaymentAt payments isActive hasPaid"
    )
    .lean();

  const targets = users.filter(isTargetUser);
  const results: Array<{
    id: string;
    name: string;
    email: string;
    changed: boolean;
    notes: string[];
  }> = [];

  for (const user of targets) {
    const notes: string[] = [];
    const payments = Array.isArray(user.payments) ? user.payments.map((p: any) => ({ ...p })) : [];
    let dirty = false;

    const nextPayments =
      payments.length > 0
        ? payments.map((payment: any) => {
            if (String(payment?.status || "paid").toLowerCase() !== "paid") {
              return payment;
            }
            if (!needsMoveToDecember(payment.paidAt)) {
              return payment;
            }

            dirty = true;
            notes.push(
              `payment ${Number(payment.amount || 0)} → ${DECEMBER_PAYMENT_DATE.toISOString()}`
            );

            return {
              ...payment,
              paidAt: DECEMBER_PAYMENT_DATE,
              createdAt: asDate(payment.createdAt) || DECEMBER_PAYMENT_DATE,
              note: String(payment.note || "").trim()
                ? payment.note
                : "תשלום היסטורי — נרשם לדצמבר 2025",
            };
          })
        : [
            {
              amount: Number(user.paidAmount || 0),
              type: "manual",
              method: "manual",
              status: "paid",
              paidAt: DECEMBER_PAYMENT_DATE,
              createdAt: DECEMBER_PAYMENT_DATE,
              note: "תשלום היסטורי — נרשם לדצמבר 2025",
            },
          ];

    if (payments.length === 0 && Number(user.paidAmount || 0) > 0) {
      dirty = true;
      notes.push("created December 2025 payment entry");
    }

    const nextPaidAt = needsMoveToDecember(user.paidAt)
      ? DECEMBER_PAYMENT_DATE
      : asDate(user.paidAt) || DECEMBER_PAYMENT_DATE;

    const nextLastPaymentAt = needsMoveToDecember(user.lastPaymentAt)
      ? DECEMBER_PAYMENT_DATE
      : asDate(user.lastPaymentAt) || nextPaidAt;

    if (needsMoveToDecember(user.paidAt) || needsMoveToDecember(user.lastPaymentAt)) {
      dirty = true;
      notes.push("set user paidAt/lastPaymentAt to December 2025");
    }

    if (dirty) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            paidAt: nextPaidAt,
            lastPaymentAt: nextLastPaymentAt,
            payments: nextPayments,
            // במפורש לא נוגעים ב-isActive / hasPaid / paidAmount
          },
        }
      );
    }

    results.push({
      id: String(user._id),
      name: userDisplayText(user) || String(user._id),
      email: String(user.email || ""),
      changed: dirty,
      notes,
    });
  }

  return {
    decemberDate: DECEMBER_PAYMENT_DATE.toISOString(),
    matchedUsers: results.length,
    updatedUsers: results.filter((item) => item.changed).length,
    results,
  };
}
