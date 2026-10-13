import mongoose from "mongoose";

import Payment from "@/models/Payment";
import RetainedCustomerFinancial from "@/models/RetainedCustomerFinancial";
import User from "@/models/User";

type AnyRecord = Record<string, any>;

export type CustomerPaymentRow = {
  amount: number;
  paidAt: Date | string | null;
  method: string;
  status: string;
  type: string;
  reference: string;
  invoiceUrl: string;
  receiptUrl: string;
};

export type CustomerPaymentHistory = {
  customer: {
    name: string;
    email: string;
    phone: string;
    idNumber: string;
    deleted: boolean;
  };
  totalDealAmount: number;
  paidAmount: number;
  remainingAmount: number;
  payments: CustomerPaymentRow[];
  ledgerPayments: CustomerPaymentRow[];
  source: "user" | "retained" | "ledger" | "none";
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function validId(value: string) {
  return mongoose.Types.ObjectId.isValid(value);
}

function pickUrl(record: AnyRecord | null | undefined, kind: "invoice" | "receipt") {
  if (!record) return "";
  const bags = [record, record.metadata, record.meta];
  const keys =
    kind === "invoice"
      ? ["invoiceUrl", "invoice_url", "hosted_invoice_url", "invoicePdf"]
      : ["receiptUrl", "receipt_url", "receiptPdf"];
  for (const bag of bags) {
    if (!bag || typeof bag !== "object") continue;
    for (const key of keys) {
      const value = clean((bag as AnyRecord)[key]);
      if (value) return value;
    }
  }
  return "";
}

function mapStoredPayment(payment: AnyRecord): CustomerPaymentRow {
  return {
    amount: Number(payment.amount || 0),
    paidAt: payment.paidAt || payment.createdAt || null,
    method: clean(payment.method) || "manual",
    status: clean(payment.status) || "paid",
    type: clean(payment.type),
    reference: clean(payment.reference) || clean(payment.note),
    invoiceUrl: clean(payment.invoiceUrl) || pickUrl(payment, "invoice"),
    receiptUrl: clean(payment.receiptUrl) || pickUrl(payment, "receipt"),
  };
}

function mapLedger(entry: AnyRecord): CustomerPaymentRow {
  return {
    amount: Number(entry.amount || 0),
    paidAt: entry.paidAt || entry.createdAt || null,
    method: clean(entry.method) || "stripe",
    status: clean(entry.status) || "paid",
    type: clean(entry.type),
    reference:
      clean(entry.reference) ||
      clean(entry.stripePaymentIntentId) ||
      clean(entry.stripeSessionId),
    invoiceUrl: clean(entry.invoiceUrl) || pickUrl(entry, "invoice"),
    receiptUrl: clean(entry.receiptUrl) || pickUrl(entry, "receipt"),
  };
}

function emptyHistory(input: {
  fullName?: string;
  email?: string;
  deleted?: boolean;
}): CustomerPaymentHistory {
  return {
    customer: {
      name: clean(input.fullName),
      email: clean(input.email).toLowerCase(),
      phone: "",
      idNumber: "",
      deleted: input.deleted === true,
    },
    totalDealAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    payments: [],
    ledgerPayments: [],
    source: "none",
  };
}

function fromUser(user: AnyRecord, hintName: string): CustomerPaymentHistory {
  const payments = Array.isArray(user.payments)
    ? user.payments.map(mapStoredPayment)
    : [];
  const paidFromRows = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );
  const paidAmount = Number(user.paidAmount || user.totalPaid || paidFromRows || 0);
  if (payments.length === 0 && paidAmount > 0) {
    payments.push({
      amount: paidAmount,
      paidAt: user.paidAt || user.lastPaymentAt || user.createdAt || null,
      method: "manual",
      status: "paid",
      type: "legacy",
      reference: "",
      invoiceUrl: "",
      receiptUrl: "",
    });
  }
  const name =
    clean(user.fullName) ||
    clean(user.name) ||
    clean(hintName);
  return {
    customer: {
      name,
      email: clean(user.email).toLowerCase(),
      phone: clean(user.phone),
      idNumber: clean(user.idNumber),
      deleted: false,
    },
    totalDealAmount: Number(user.totalDealAmount || 0),
    paidAmount,
    remainingAmount: Number(user.remainingAmount || 0),
    payments,
    ledgerPayments: [],
    source: "user",
  };
}

function fromRetained(record: AnyRecord, hintName: string): CustomerPaymentHistory {
  const payments = Array.isArray(record.payments)
    ? record.payments.map(mapStoredPayment)
    : [];
  const matched = new Set(payments.map((payment) => payment.reference).filter(Boolean));
  const ledger = Array.isArray(record.ledgerPayments)
    ? record.ledgerPayments
        .map(mapLedger)
        .filter((entry) => entry.reference && !matched.has(entry.reference))
    : [];
  return {
    customer: {
      name:
        clean(record.fullName) ||
        clean(record.name) ||
        clean(hintName),
      email: clean(record.email).toLowerCase(),
      phone: clean(record.phone),
      idNumber: clean(record.idNumber),
      deleted: true,
    },
    totalDealAmount: Number(record.totalDealAmount || 0),
    paidAmount: Number(record.paidAmount || 0),
    remainingAmount: Number(record.remainingAmount || 0),
    payments,
    ledgerPayments: ledger,
    source: "retained",
  };
}

function fromLedger(
  entries: AnyRecord[],
  email: string,
  hintName: string
): CustomerPaymentHistory {
  const payments = entries.map(mapLedger);
  const paidAmount = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );
  return {
    customer: {
      name: clean(hintName),
      email,
      phone: "",
      idNumber: "",
      deleted: true,
    },
    totalDealAmount: paidAmount,
    paidAmount,
    remainingAmount: 0,
    payments,
    ledgerPayments: [],
    source: "ledger",
  };
}

/**
 * Read-only payment history. A live customer is read from the user record.
 * A deleted customer is read from the retained snapshot, then from Payment
 * rows that were never deleted.
 */
export async function loadCustomerPaymentHistory(input: {
  originalUserId?: string;
  email?: string;
  fullName?: string;
}): Promise<CustomerPaymentHistory> {
  const originalUserId = clean(input.originalUserId);
  const email = clean(input.email).toLowerCase();
  const fullName = clean(input.fullName);

  if (validId(originalUserId)) {
    const user = await User.findById(originalUserId).lean();
    if (user) return fromUser(user, fullName);
    const retained = await RetainedCustomerFinancial.findOne({
      originalUserId: new mongoose.Types.ObjectId(originalUserId),
    }).lean();
    if (retained) return fromRetained(retained, fullName);
  }

  if (email) {
    const user = await User.findOne({ email }).lean();
    if (user) return fromUser(user, fullName);
    const retained = await RetainedCustomerFinancial.findOne({ email }).lean();
    if (retained) return fromRetained(retained, fullName);
  }

  if (email) {
    const ledger = await Payment.find({ email }).sort({ createdAt: -1 }).lean();
    if (ledger.length) return fromLedger(ledger as AnyRecord[], email, fullName);
  }

  return emptyHistory({
    fullName,
    email,
    deleted: Boolean(originalUserId),
  });
}
