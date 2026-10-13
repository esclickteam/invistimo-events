export type CollectionStatus =
  | "awaiting_final_records"
  | "unpaid"
  | "partial"
  | "paid"
  | "credit";

export const COLLECTION_STATUS_LABELS: Record<CollectionStatus, string> = {
  awaiting_final_records: "ממתין לכמות רשומות סופית",
  unpaid: "טרם שולם",
  partial: "שולם חלקית",
  paid: "שולם",
  credit: "יתרת זכות",
};

export const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "bit",
  "paybox",
  "check",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "מזומן",
  bank_transfer: "העברה בנקאית",
  bit: "ביט",
  paybox: "פייבוקס",
  check: "צ'ק",
  other: "אחר",
};

export function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.includes(String(value || "") as PaymentMethod);
}

type BillingPayment = { amount?: number | null };

export type ProducerBillInput = {
  billingSource?: string | null;
  guests?: number | null;
  maxGuests?: number | null;
  assignedProducerId?: unknown;
  producerBilling?: {
    payerProducerId?: unknown;
    pricePerRecord?: number | null;
    initialRecords?: number | null;
    finalRecords?: number | null;
    finalRecordsConfirmed?: boolean | null;
    grantAccessBeforePayment?: boolean | null;
    payments?: BillingPayment[] | null;
  } | null;
};

export type ProducerBillView = {
  initialRecords: number;
  finalRecords: number | null;
  confirmed: boolean;
  pricePerRecord: number;
  paidAmount: number;
  amountDue: number | null;
  balance: number | null;
  status: CollectionStatus;
  statusLabel: string;
};

export function sumCollectionPayments(payments: BillingPayment[] | null | undefined) {
  return roundMoney(
    (payments || []).reduce((sum, payment) => {
      return sum + Math.max(0, Number(payment?.amount || 0));
    }, 0),
  );
}

export function collectionStatus(input: {
  confirmed: boolean;
  finalRecords: number | null;
  pricePerRecord: number;
  amountDue: number | null;
  paidAmount: number;
}): CollectionStatus {
  if (!input.confirmed || input.finalRecords == null || input.amountDue == null) {
    return "awaiting_final_records";
  }

  const due = roundMoney(input.amountDue);
  const paid = roundMoney(input.paidAmount);
  const price = Number(input.pricePerRecord || 0);

  if (price <= 0 && input.finalRecords > 0 && paid <= 0) {
    return "unpaid";
  }
  if (paid <= 0 && due > 0) return "unpaid";
  if (paid + 0.001 < due) return "partial";
  if (paid > due + 0.001) return "credit";
  return "paid";
}

export function resolveProducerBill(user: ProducerBillInput): ProducerBillView {
  const billing = user.producerBilling || {};
  const quota = Math.max(0, Number(user.guests || user.maxGuests || 0));
  const initialRecords =
    billing.initialRecords == null
      ? quota
      : Math.max(0, Number(billing.initialRecords) || 0);
  const confirmed = billing.finalRecordsConfirmed === true;
  const finalRecords = confirmed
    ? Math.max(0, Number(billing.finalRecords ?? initialRecords) || 0)
    : null;
  const pricePerRecord = Math.max(0, Number(billing.pricePerRecord || 0));
  const paidAmount = sumCollectionPayments(billing.payments);
  const amountDue =
    confirmed && finalRecords != null
      ? roundMoney(finalRecords * pricePerRecord)
      : null;
  const balance =
    amountDue == null ? null : roundMoney(amountDue - paidAmount);
  const status = collectionStatus({
    confirmed,
    finalRecords,
    pricePerRecord,
    amountDue,
    paidAmount,
  });

  return {
    initialRecords,
    finalRecords,
    confirmed,
    pricePerRecord,
    paidAmount,
    amountDue,
    balance,
    status,
    statusLabel: COLLECTION_STATUS_LABELS[status],
  };
}

export function isInProducerCollection(
  user: ProducerBillInput,
  producerId: unknown,
) {
  const producer = String(producerId || "");
  if (!producer) return false;

  const payer = user.producerBilling?.payerProducerId;
  if (payer) return String(payer) === producer;

  if (String(user.billingSource || "") !== "producer") return false;
  return String(user.assignedProducerId || "") === producer;
}

export function canAssignCollectionPayer(
  user: ProducerBillInput & { role?: string | null },
  producerId: unknown,
) {
  const role = String(user.role || "");
  if (role !== "user" && role !== "client") {
    return { ok: false as const, code: "NOT_A_CLIENT" };
  }

  const source = String(user.billingSource || "");
  if (source === "venue") {
    return { ok: false as const, code: "VENUE_CLIENT" };
  }

  const producer = String(producerId || "");
  const payer = user.producerBilling?.payerProducerId
    ? String(user.producerBilling.payerProducerId)
    : "";

  if (payer && payer !== producer) {
    return { ok: false as const, code: "ALREADY_BILLED_BY_ANOTHER_PRODUCER" };
  }

  if (payer && payer === producer) {
    return { ok: false as const, code: "ALREADY_TRACKED" };
  }

  if (source === "producer") {
    const primary = String(user.assignedProducerId || "");
    if (primary && primary !== producer) {
      return { ok: false as const, code: "ALREADY_BILLED_BY_ANOTHER_PRODUCER" };
    }
    if (primary === producer) {
      return { ok: false as const, code: "ALREADY_TRACKED" };
    }
  }

  return { ok: true as const, code: "OK" };
}

export function buildFinalRecordsUpdate(input: {
  previousFinalRecords: number | null;
  nextFinalRecords: number;
  at: Date;
  by: unknown;
  initialRecords?: number | null;
}) {
  const setFields: Record<string, unknown> = {
    "producerBilling.finalRecords": input.nextFinalRecords,
    "producerBilling.finalRecordsConfirmed": true,
    "producerBilling.finalRecordsUpdatedAt": input.at,
    "producerBilling.finalRecordsUpdatedBy": input.by,
  };
  if (input.initialRecords != null) {
    setFields["producerBilling.initialRecords"] = input.initialRecords;
  }
  return {
    $set: setFields,
    $push: {
      "producerBilling.history": {
        at: input.at,
        by: input.by,
        kind: "final_records" as const,
        previousFinalRecords: input.previousFinalRecords,
        nextFinalRecords: input.nextFinalRecords,
      },
    },
  };
}

export function buildCollectionPaymentUpdate(input: {
  amount: number;
  paidAt: Date;
  method: PaymentMethod;
  note: string;
  recordedBy: unknown;
  createdAt: Date;
}) {
  return {
    $push: {
      "producerBilling.payments": {
        amount: roundMoney(input.amount),
        paidAt: input.paidAt,
        method: input.method,
        note: input.note,
        recordedBy: input.recordedBy,
        createdAt: input.createdAt,
      },
    },
  };
}

export function buildPriceUpdate(input: {
  previousPrice: number;
  nextPrice: number;
  at: Date;
  by: unknown;
}) {
  return {
    $set: {
      "producerBilling.pricePerRecord": roundMoney(input.nextPrice),
    },
    $push: {
      "producerBilling.history": {
        at: input.at,
        by: input.by,
        kind: "price" as const,
        previousPricePerRecord: input.previousPrice,
        nextPricePerRecord: roundMoney(input.nextPrice),
      },
    },
  };
}
