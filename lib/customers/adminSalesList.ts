import CustomerAgreement from "@/models/CustomerAgreement";
import CustomerFile from "@/models/CustomerFile";
import CustomerQuote from "@/models/CustomerQuote";
import DeletedCustomerTombstone from "@/models/DeletedCustomerTombstone";
import SalesDocument from "@/models/SalesDocument";
import User from "@/models/User";
import { userLinkStatus } from "@/lib/adminQuoteWorkflow";
import {
  markRowsDeletedByTombstone,
  toAdminCustomerAgreementRow,
  toAdminCustomerQuoteRow,
  toAdminSalesDocumentRow,
  type AdminSalesDocumentRow,
} from "@/lib/customers/adminSalesDocumentRow";

/** Rows rendered on one admin page. The query itself is not capped. */
export const ADMIN_SALES_PAGE_SIZE = 50;

const READ_BATCH = 500;

const SALES_FIELDS = [
  "token",
  "type",
  "status",
  "client.fullName",
  "client.email",
  "client.phone",
  "event.name",
  "selectedPackage.title",
  "selectedPackage.price",
  "totals.grossAmount",
  "totals.grossAmountAfterDiscount",
  "convertedUserId",
  "originalUserId",
  "customerDeleted",
  "createdAt",
  "sms.sentAt",
  "signedAt",
  "signature.signedAt",
  "signature.fullName",
  "agreement.signedAt",
  "agreement.signatureFullName",
  "immutableSignedCopy.signedAt",
  "immutableSignedCopy.pdfUrl",
  "immutableSignedCopy.signature.fullName",
  "quote.expiresAt",
  "adminPaymentConfirmed",
  "pdfUrl",
].join(" ");

const AGREEMENT_FIELDS = [
  "publicToken",
  "userId",
  "originalUserId",
  "salesDocumentId",
  "signedAt",
  "signerName",
  "signerEmail",
  "signerPhone",
  "status",
  "title",
  "amount",
  "customerDeleted",
  "createdAt",
  "pdfUrl",
  "immutableSignedCopy.signedAt",
  "immutableSignedCopy.signerName",
  "immutableSignedCopy.pdfUrl",
].join(" ");

const QUOTE_FIELDS = [
  "publicToken",
  "userId",
  "originalUserId",
  "customerFileId",
  "salesDocumentId",
  "quoteNumber",
  "status",
  "total",
  "customerDeleted",
  "createdAt",
  "validUntil",
].join(" ");

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function unique(values: unknown[]) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value))));
}

async function readEvery(
  model: {
    find: (filter: object) => {
      select: (fields: string) => {
        sort: (order: object) => {
          skip: (count: number) => {
            limit: (count: number) => { lean: () => Promise<any[]> };
          };
        };
      };
    };
  },
  filter: object,
  fields: string
) {
  const rows: any[] = [];
  let skip = 0;
  for (;;) {
    const chunk = await model
      .find(filter)
      .select(fields)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(READ_BATCH)
      .lean();
    rows.push(...chunk);
    if (chunk.length < READ_BATCH) break;
    skip += chunk.length;
  }
  return rows;
}

/**
 * Every historical quote and agreement, including customers whose user
 * record no longer exists. Reads until the collections are exhausted.
 * Nothing here deletes or rewrites documents.
 */
export async function loadAdminSalesQuotes() {
  const typeFilter = { type: { $in: ["quote", "agreement"] } };

  const [docs, agreements, quotes] = await Promise.all([
    readEvery(SalesDocument, typeFilter, SALES_FIELDS),
    readEvery(CustomerAgreement, {}, AGREEMENT_FIELDS),
    readEvery(CustomerQuote, {}, QUOTE_FIELDS),
  ]);

  const fileIds = unique(
    quotes.map((quote: { customerFileId?: unknown }) => quote.customerFileId)
  );
  const files = fileIds.length
    ? await CustomerFile.find({ _id: { $in: fileIds } })
        .select(
          "fullName email phone venueName packageName totalPrice customerDeleted userId originalUserId"
        )
        .lean()
    : [];
  const filesById = new Map(files.map((file) => [String(file._id), file]));

  const userIds = unique([
    ...docs.flatMap((doc: any) => [doc.convertedUserId, doc.originalUserId]),
    ...agreements.flatMap((agreement: any) => [
      agreement.userId,
      agreement.originalUserId,
    ]),
    ...quotes.flatMap((quote: any) => [quote.userId, quote.originalUserId]),
    ...files.flatMap((file: any) => [file.userId, file.originalUserId]),
  ]);
  const liveUsers = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select("_id").lean()
    : [];
  const liveUserIds = new Set(liveUsers.map((user) => String(user._id)));

  const salesIds = new Set(docs.map((doc) => String(doc._id)));
  const tokens = new Set(
    docs.map((doc: any) => clean(doc.token)).filter(Boolean)
  );
  const rows: AdminSalesDocumentRow[] = docs.map((doc) =>
    toAdminSalesDocumentRow(doc, liveUserIds)
  );

  for (const agreement of agreements) {
    const token = clean((agreement as { publicToken?: string }).publicToken);
    const salesDocumentId = (agreement as { salesDocumentId?: unknown })
      .salesDocumentId;
    if (token && tokens.has(token)) continue;
    if (salesDocumentId && salesIds.has(String(salesDocumentId))) continue;
    const row = toAdminCustomerAgreementRow(agreement, liveUserIds);
    if (row.token) tokens.add(row.token);
    rows.push(row);
  }

  for (const quote of quotes) {
    const token = clean((quote as { publicToken?: string }).publicToken);
    const salesDocumentId = (quote as { salesDocumentId?: unknown })
      .salesDocumentId;
    if (salesDocumentId && salesIds.has(String(salesDocumentId))) continue;
    if (token && tokens.has(token)) continue;
    const file = filesById.get(
      String((quote as { customerFileId?: unknown }).customerFileId || "")
    );
    const row = toAdminCustomerQuoteRow(quote, file, liveUserIds);
    if (row.token) tokens.add(row.token);
    rows.push(row);
  }

  const emails = unique(rows.map((row) => clean(row.email).toLowerCase()));
  const tombstones =
    userIds.length || emails.length
      ? await DeletedCustomerTombstone.find({
          $or: [
            ...(userIds.length ? [{ originalUserId: { $in: userIds } }] : []),
            ...(emails.length ? [{ email: { $in: emails } }] : []),
          ],
        })
          .select("originalUserId email")
          .lean()
      : [];
  const tombstoneUserIds = new Set(
    tombstones.map((tombstone) => String(tombstone.originalUserId))
  );
  const tombstoneEmails = new Set(
    tombstones
      .map((tombstone) => clean(tombstone.email).toLowerCase())
      .filter(Boolean)
  );
  const labeled = markRowsDeletedByTombstone(
    rows,
    tombstoneUserIds,
    tombstoneEmails
  ).map((row) => ({
    ...row,
    userLinkStatus: row.customerDeleted
      ? ("none" as const)
      : userLinkStatus({
          convertedUserId: row.convertedUserId,
          userExists: row.convertedUserId
            ? liveUserIds.has(String(row.convertedUserId))
            : false,
        }),
  }));
  labeled.sort((left, right) =>
    String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
  );

  return {
    quotes: labeled,
    total: labeled.length,
    salesTotal: docs.length,
    truncated: false,
  };
}
