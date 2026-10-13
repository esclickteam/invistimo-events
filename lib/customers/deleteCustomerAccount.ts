import mongoose, { type ClientSession } from "mongoose";

import User from "@/models/User";
import Payment from "@/models/Payment";
import SalesDocument from "@/models/SalesDocument";
import CustomerFile from "@/models/CustomerFile";
import CustomerQuote from "@/models/CustomerQuote";
import CustomerAgreement from "@/models/CustomerAgreement";
import RetainedCustomerFinancial from "@/models/RetainedCustomerFinancial";
import {
  buildCustomerAgreementSignedCopy,
  buildSalesDocumentSignedCopy,
} from "@/lib/customers/signedAgreementLock";
import {
  destroyOperationalMedia,
  purgeOperationalCustomerData,
  type OperationalMediaPlan,
} from "@/lib/customers/operationalPurge";

type AnyRecord = Record<string, any>;

const KEPT_COLLECTIONS = [
  "salesdocuments",
  "customerquotes",
  "customeragreements",
  "customerfiles",
  "payments",
  "retainedcustomerfinancials",
] as const;

export function isInvistimoCustomerAccount(user: AnyRecord | null | undefined) {
  if (!user) return false;
  if (user.venueUser) return false;
  const role = String(user.role || "user");
  if (
    role === "venue_owner" ||
    role === "admin" ||
    role === "staff" ||
    role === "producer"
  ) {
    return false;
  }
  return role === "user" || role === "client";
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function asDate(value: unknown) {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
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

function cloneUserPayments(user: AnyRecord) {
  const payments = Array.isArray(user.payments) ? user.payments : [];
  return payments.map((payment: AnyRecord) => ({
    amount: Number(payment?.amount || 0),
    type: clean(payment?.type) || "manual",
    method: clean(payment?.method) || "manual",
    status: clean(payment?.status) || "paid",
    paidAt: asDate(payment?.paidAt),
    createdAt: asDate(payment?.createdAt) || asDate(payment?.paidAt),
    note: clean(payment?.note),
    reference: "",
    invoiceUrl: "",
    receiptUrl: "",
  }));
}

function sameAmount(left: AnyRecord, right: AnyRecord) {
  return Math.abs(Number(left.amount || 0) - Number(right.amount || 0)) <= 0.01;
}

function attachLedgerReferences(payments: AnyRecord[], ledger: AnyRecord[]) {
  const used = new Set<string>();
  return payments.map((payment) => {
    const paidAt = asDate(payment.paidAt)?.getTime() || 0;
    const unused = ledger.filter((entry) => {
      const id = String(entry._id || "");
      return id && !used.has(id) && sameAmount(entry, payment);
    });
    const close = unused.filter((entry) => {
      const entryTime = asDate(entry.createdAt)?.getTime() || 0;
      if (!paidAt || !entryTime) return false;
      return Math.abs(entryTime - paidAt) <= 3 * 24 * 60 * 60 * 1000;
    });
    const match = close[0] || (unused.length === 1 ? unused[0] : null);
    if (!match) return payment;
    used.add(String(match._id));
    return {
      ...payment,
      reference:
        clean(match.stripePaymentIntentId) ||
        clean(match.stripeSessionId) ||
        payment.note,
      invoiceUrl: pickUrl(match, "invoice"),
      receiptUrl: pickUrl(match, "receipt"),
    };
  });
}

function mapLedger(entries: AnyRecord[]) {
  return entries.map((entry) => ({
    sourceId: String(entry._id || ""),
    amount: Number(entry.amount || 0),
    currency: clean(entry.currency) || "ils",
    status: clean(entry.status),
    type: clean(entry.type),
    paidAt: asDate(entry.createdAt),
    method: "stripe",
    reference:
      clean(entry.stripePaymentIntentId) || clean(entry.stripeSessionId),
    invoiceUrl: pickUrl(entry, "invoice"),
    receiptUrl: pickUrl(entry, "receipt"),
  }));
}

function copyField(user: AnyRecord, key: string) {
  return user?.[key] === undefined ? undefined : user[key];
}

function withSession(session: ClientSession | null) {
  return session ? { session } : {};
}

async function archiveFinancials(
  user: AnyRecord,
  idNumber: string,
  session: ClientSession | null
) {
  const email = clean(user.email).toLowerCase();
  const ledger = email
    ? await Payment.find({ email }).session(session).lean()
    : [];
  const payments = attachLedgerReferences(
    cloneUserPayments(user),
    ledger as AnyRecord[]
  );
  const producerPayments = Array.isArray(user.producerBilling?.payments)
    ? user.producerBilling.payments.map((payment: AnyRecord) => ({
        amount: Number(payment?.amount || 0),
        type: "producer-client",
        method: clean(payment?.method) || "manual",
        status: "paid",
        paidAt: asDate(payment?.paidAt),
        createdAt: asDate(payment?.createdAt) || asDate(payment?.paidAt),
        note: clean(payment?.note),
        reference: "",
        invoiceUrl: "",
        receiptUrl: "",
      }))
    : [];

  const accountCreatedAt = asDate(user.createdAt) || new Date();
  const snapshot: AnyRecord = {
    originalUserId: user._id,
    customerDeletedAt: new Date(),
    name: clean(user.name),
    fullName: clean(user.fullName) || clean(user.name),
    firstName: clean(user.firstName),
    lastName: clean(user.lastName),
    clientName: clean(user.clientName),
    businessName: clean(user.businessName),
    email,
    phone: clean(user.phone),
    idNumber,
    plan: clean(user.plan),
    priceKey: clean(user.priceKey),
    packageName: clean(user.packageName),
    planName: clean(user.planName),
    subscriptionPlan: clean(user.subscriptionPlan),
    maxGuests: Number(user.maxGuests || 0),
    includeCalls: Boolean(user.includeCalls),
    includeCreditGifts: Boolean(user.includeCreditGifts),
    callsAddonPrice: Number(user.callsAddonPrice || 0),
    creditGiftsAddonPrice: Number(user.creditGiftsAddonPrice || 0),
    isDemoUser: Boolean(user.isDemoUser),
    isTest: Boolean(user.isTest),
    hasPaid: Boolean(user.hasPaid),
    paidAmount: Number(user.paidAmount || 0),
    totalPaid: Number(user.totalPaid || 0),
    amountPaid: Number(user.amountPaid || 0),
    packagePrice: Number(user.packagePrice || 0),
    planPrice: Number(user.planPrice || 0),
    subscriptionPrice: Number(user.subscriptionPrice || 0),
    price: Number(user.price || 0),
    totalDealAmount: Number(user.totalDealAmount || 0),
    remainingAmount: Number(user.remainingAmount || 0),
    paymentMode: clean(user.paymentMode) || "none",
    paidAt: asDate(user.paidAt),
    paymentDate: asDate(user.paymentDate),
    lastPaymentAt: asDate(user.lastPaymentAt),
    manualPaidAt: asDate(user.manualPaidAt),
    subscriptionPaidAt: asDate(user.subscriptionPaidAt),
    payments,
    ledgerPayments: mapLedger(ledger as AnyRecord[]),
    producerCollectionPayments: producerPayments,
    createdAt: accountCreatedAt,
  };

  for (const key of ["paidAt", "paymentDate", "lastPaymentAt"] as const) {
    if (copyField(user, key) === undefined) delete snapshot[key];
  }

  await RetainedCustomerFinancial.findOneAndUpdate(
    { originalUserId: user._id },
    { $set: snapshot },
    { upsert: true, new: true, timestamps: false, ...withSession(session) }
  );

  return snapshot;
}

function documentFilter(user: AnyRecord, fileIds: mongoose.Types.ObjectId[]) {
  const or: AnyRecord[] = [{ convertedUserId: user._id }, { originalUserId: user._id }];
  const email = clean(user.email).toLowerCase();
  if (email) or.push({ "client.email": email });
  if (fileIds.length) or.push({ customerFileId: { $in: fileIds } });
  const token = clean(user.onboardingAgreementToken);
  if (token) or.push({ token });
  return { $or: or };
}

async function markFinancialDocuments(
  user: AnyRecord,
  session: ClientSession | null
) {
  const files = await CustomerFile.find({
    $or: [
      { userId: user._id },
      { originalUserId: user._id },
      ...(clean(user.email)
        ? [{ email: clean(user.email).toLowerCase() }]
        : []),
    ],
  }).session(session);
  const fileIds = files.map((file) => file._id as mongoose.Types.ObjectId);
  const deletedAt = new Date();
  const filter = documentFilter(user, fileIds);

  const salesDocuments = await SalesDocument.find(filter).session(session);
  let idNumber = "";
  for (const document of salesDocuments) {
    document.customerDeleted = true;
    document.customerDeletedAt = deletedAt;
    document.originalUserId = user._id;
    if (
      document.type === "agreement" &&
      document.status === "signed" &&
      !document.immutableSignedCopy
    ) {
      document.immutableSignedCopy = buildSalesDocumentSignedCopy(document);
      document.immutableSignedCopyFrozenAt = deletedAt;
    }
    const signerId = clean(
      (document as AnyRecord).signature?.idNumber ||
        (document as AnyRecord).immutableSignedCopy?.signature?.idNumber
    );
    if (!idNumber && signerId) idNumber = signerId;
    await document.save(withSession(session));
  }

  await CustomerQuote.updateMany(
    {
      $or: [
        { userId: user._id },
        { originalUserId: user._id },
        ...(fileIds.length ? [{ customerFileId: { $in: fileIds } }] : []),
      ],
    },
    {
      $set: {
        customerDeleted: true,
        customerDeletedAt: deletedAt,
        originalUserId: user._id,
      },
    },
    withSession(session)
  );

  const agreements = await CustomerAgreement.find({
    $or: [
      { userId: user._id },
      { originalUserId: user._id },
      ...(fileIds.length ? [{ customerFileId: { $in: fileIds } }] : []),
      ...(clean(user.onboardingAgreementToken)
        ? [{ publicToken: clean(user.onboardingAgreementToken) }]
        : []),
    ],
  }).session(session);

  for (const agreement of agreements) {
    agreement.customerDeleted = true;
    agreement.customerDeletedAt = deletedAt;
    agreement.originalUserId = user._id;
    if (agreement.status === "signed" && !agreement.immutableSignedCopy) {
      agreement.immutableSignedCopy = buildCustomerAgreementSignedCopy(agreement);
      agreement.immutableSignedCopyFrozenAt = deletedAt;
    }
    if (!idNumber && clean(agreement.signerIdNumber)) {
      idNumber = clean(agreement.signerIdNumber);
    }
    await agreement.save(withSession(session));
  }

  for (const file of files) {
    file.customerDeleted = true;
    file.customerDeletedAt = deletedAt;
    file.originalUserId = user._id;
    file.userId = null;
    file.invitationId = null;
    file.assignedStaffIds = [];
    file.rawLeadData = null;
    file.facebookLeadId = "";
    file.campaignName = "";
    file.adName = "";
    file.formName = "";
    file.notes = "";
    await file.save(withSession(session));
  }

  return idNumber;
}

async function clearDeletionMarks(userId: mongoose.Types.ObjectId) {
  const update = {
    $set: { customerDeleted: false, customerDeletedAt: null },
  };
  await Promise.all([
    SalesDocument.updateMany({ originalUserId: userId }, update),
    CustomerQuote.updateMany({ originalUserId: userId }, update),
    CustomerAgreement.updateMany({ originalUserId: userId }, update),
    CustomerFile.updateMany({ originalUserId: userId }, update),
  ]);
}

async function runDeletion(
  user: AnyRecord,
  session: ClientSession | null,
  media: { plan: OperationalMediaPlan | null }
) {
  const userId = user._id as mongoose.Types.ObjectId;
  const idNumber = await markFinancialDocuments(user, session);
  await archiveFinancials(user, idNumber, session);
  media.plan = await purgeOperationalCustomerData(user, session);
  const deleted = await User.findByIdAndDelete(userId, withSession(session));
  if (!deleted) throw new Error("USER_NOT_FOUND");
}

/**
 * Deletes an Invistimo customer account and its operational event data.
 * Quotes, signed agreements, payment history, and their files stay.
 * Venue / Evently360 records are not modified.
 * The database delete is one transaction when the server supports it.
 */
export async function deleteInvistimoCustomerAccount(user: AnyRecord) {
  if (!isInvistimoCustomerAccount(user)) {
    throw new Error("NOT_INVISTIMO_CUSTOMER");
  }

  const userId = user._id as mongoose.Types.ObjectId;
  const media: { plan: OperationalMediaPlan | null } = { plan: null };
  let committed = false;

  try {
    const session = await mongoose.startSession();
    try {
      try {
        await session.withTransaction(async () => {
          await runDeletion(user, session, media);
        });
        committed = true;
      } catch (error) {
        const message = String((error as Error)?.message || error);
        const unsupported =
          /replica set|Transaction numbers are only allowed/i.test(message);
        if (!unsupported) throw error;
        media.plan = null;
        await runDeletion(user, null, media);
        committed = true;
      }
    } finally {
      await session.endSession();
    }
  } catch (error) {
    if (!committed) {
      const stillThere = await User.exists({ _id: userId });
      if (stillThere) await clearDeletionMarks(userId);
    }
    throw error;
  }

  if (media.plan) {
    await destroyOperationalMedia(media.plan);
  }

  return {
    deletedUserId: String(userId),
    retained: true,
    keptCollections: KEPT_COLLECTIONS,
  };
}

export async function loadRetainedCustomerPayments(originalUserId: string) {
  if (!mongoose.Types.ObjectId.isValid(originalUserId)) return null;
  return RetainedCustomerFinancial.findOne({
    originalUserId: new mongoose.Types.ObjectId(originalUserId),
  }).lean();
}
