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

export const ADMIN_SALES_LIST_LIMIT = 2000;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function unique(values: unknown[]) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value))));
}

/**
 * Historical quotes and agreements are listed even when the customer user
 * record no longer exists. Nothing here deletes or rewrites documents.
 */
export async function loadAdminSalesQuotes(limit = ADMIN_SALES_LIST_LIMIT) {
  const capped = Math.min(
    Math.max(Number(limit) || ADMIN_SALES_LIST_LIMIT, 1),
    ADMIN_SALES_LIST_LIMIT
  );
  const typeFilter = { $in: ["quote", "agreement"] };

  const [salesCount, agreementCount, quoteCount, docs, agreements, quotes] =
    await Promise.all([
      SalesDocument.countDocuments({ type: typeFilter }),
      CustomerAgreement.countDocuments({}),
      CustomerQuote.countDocuments({}),
      SalesDocument.find({ type: typeFilter })
        .sort({ createdAt: -1 })
        .limit(capped)
        .lean(),
      CustomerAgreement.find({}).sort({ createdAt: -1 }).limit(capped).lean(),
      CustomerQuote.find({}).sort({ createdAt: -1 }).limit(capped).lean(),
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
    tombstones.map((tombstone) => clean(tombstone.email).toLowerCase()).filter(Boolean)
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
          userExists: Boolean(row.convertedUserId),
        }),
  }));
  labeled.sort((left, right) =>
    String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
  );

  return {
    quotes: labeled,
    total: labeled.length,
    salesTotal: salesCount,
    truncated:
      salesCount > docs.length ||
      agreementCount > agreements.length ||
      quoteCount > quotes.length,
  };
}
