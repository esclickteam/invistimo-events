export function adminSalesListKind(pathname: string): "quotes" | "agreements" {
  return pathname.includes("/admin/sales/agreements") ? "agreements" : "quotes";
}

export function toAdminCustomerAgreementRow(
  agreement: any,
  liveUserIds: Set<string>
): AdminSalesDocumentRow {
  const userId = agreement?.userId ? String(agreement.userId) : "";
  const originalUserId = agreement?.originalUserId
    ? String(agreement.originalUserId)
    : userId;
  const userMissing =
    (Boolean(userId) && !liveUserIds.has(userId)) ||
    (Boolean(agreement?.originalUserId) &&
      !liveUserIds.has(String(agreement.originalUserId)));
  const signedAt = agreement?.signedAt || agreement?.immutableSignedCopy?.signedAt || null;

  return {
    _id: String(agreement?._id || ""),
    token: clean(agreement?.publicToken),
    documentType: "agreement",
    quoteNumber: clean(agreement?.publicToken).slice(-8).toUpperCase(),
    fullName: clean(agreement?.signerName || agreement?.immutableSignedCopy?.signerName),
    email: clean(agreement?.signerEmail),
    phone: clean(agreement?.signerPhone),
    eventName: "",
    packageTitle: clean(agreement?.title) || "הסכם שירותים",
    status: clean(agreement?.status) || "draft",
    total: Number(agreement?.amount || 0) || 0,
    convertedUserId: userId || null,
    originalUserId: originalUserId || null,
    customerDeleted: agreement?.customerDeleted === true || userMissing,
    createdAt: agreement?.createdAt ? new Date(agreement.createdAt).toISOString() : null,
    sentAt: null,
    signedAt: signedAt ? new Date(signedAt).toISOString() : null,
    expiresAt: null,
    adminPaymentConfirmed: false,
    pdfUrl: clean(agreement?.pdfUrl || agreement?.immutableSignedCopy?.pdfUrl),
    signerName: clean(agreement?.signerName || agreement?.immutableSignedCopy?.signerName),
  };
}

export type AdminSalesDocumentRow = {
  _id: string;
  token: string;
  documentType: "quote" | "agreement";
  quoteNumber: string;
  fullName: string;
  email: string;
  phone: string;
  eventName: string;
  packageTitle: string;
  status: string;
  total: number;
  convertedUserId: string | null;
  originalUserId: string | null;
  customerDeleted: boolean;
  createdAt: string | null;
  sentAt: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  adminPaymentConfirmed: boolean;
  pdfUrl: string;
  signerName: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function toAdminSalesDocumentRow(
  doc: any,
  liveUserIds: Set<string>
): AdminSalesDocumentRow {
  const convertedUserId = doc?.convertedUserId ? String(doc.convertedUserId) : "";
  const originalUserId = doc?.originalUserId
    ? String(doc.originalUserId)
    : convertedUserId;
  const userMissing =
    (Boolean(convertedUserId) && !liveUserIds.has(convertedUserId)) ||
    (Boolean(doc?.originalUserId) && !liveUserIds.has(String(doc.originalUserId)));

  const signedAt =
    doc?.signedAt ||
    doc?.signature?.signedAt ||
    doc?.agreement?.signedAt ||
    doc?.immutableSignedCopy?.signedAt ||
    null;

  return {
    _id: String(doc?._id || ""),
    token: clean(doc?.token),
    documentType: doc?.type === "agreement" ? "agreement" : "quote",
    quoteNumber: clean(doc?.token).slice(-8).toUpperCase(),
    fullName: clean(doc?.client?.fullName),
    email: clean(doc?.client?.email),
    phone: clean(doc?.client?.phone),
    eventName: clean(doc?.event?.name),
    packageTitle: clean(doc?.selectedPackage?.title),
    status: clean(doc?.status) || "draft",
    total:
      Number(
        doc?.totals?.grossAmountAfterDiscount ??
          doc?.totals?.grossAmount ??
          doc?.selectedPackage?.price ??
          0
      ) || 0,
    convertedUserId: convertedUserId || null,
    originalUserId: originalUserId || null,
    customerDeleted: doc?.customerDeleted === true || userMissing,
    createdAt: doc?.createdAt ? new Date(doc.createdAt).toISOString() : null,
    sentAt: doc?.sms?.sentAt ? new Date(doc.sms.sentAt).toISOString() : null,
    signedAt: signedAt ? new Date(signedAt).toISOString() : null,
    expiresAt: doc?.quote?.expiresAt || null,
    adminPaymentConfirmed: doc?.adminPaymentConfirmed === true,
    pdfUrl: clean(doc?.pdfUrl || doc?.immutableSignedCopy?.pdfUrl),
    signerName: clean(
      doc?.signature?.fullName ||
        doc?.agreement?.signatureFullName ||
        doc?.immutableSignedCopy?.signature?.fullName
    ),
  };
}
