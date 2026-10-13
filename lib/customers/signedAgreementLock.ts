const PROTECTED_ROOTS = new Set([
  "client",
  "event",
  "signature",
  "agreement",
  "totals",
  "selectedPackage",
  "upsells",
  "cancellationTerms",
  "paymentTerms",
  "additionalTerms",
  "engagementTerms",
  "customerDealSummary",
  "immutableSignedCopy",
  "immutableSignedCopyFrozenAt",
  "pdfUrl",
  "signedAt",
  "status",
  "signerName",
  "signerIdNumber",
  "signerEmail",
  "signerPhone",
  "signatureText",
  "signatureImageUrl",
  "ipAddress",
  "amount",
  "title",
]);

const PROTECTED_PATHS = new Set([
  "audit.signedAt",
  "audit.signedIp",
  "audit.signedUserAgent",
]);

export function pathIsProtected(path: string) {
  if (PROTECTED_PATHS.has(path)) return true;
  const root = String(path || "").split(".")[0];
  return PROTECTED_ROOTS.has(root);
}

export function updateTouchesProtected(update: unknown) {
  if (!update || typeof update !== "object") return false;
  const record = update as Record<string, unknown>;
  const operators = [
    "$set",
    "$unset",
    "$rename",
    "$setOnInsert",
    "$inc",
    "$min",
    "$max",
  ];
  const used = operators.filter(
    (operator) => record[operator] && typeof record[operator] === "object"
  );

  if (used.length === 0) return true;

  for (const operator of used) {
    const container = record[operator] as Record<string, unknown>;
    for (const key of Object.keys(container)) {
      if (pathIsProtected(key)) return true;
    }
  }

  return false;
}

type LockQuery = {
  getUpdate: () => unknown;
  getFilter: () => unknown;
  model: {
    findOne: (filter: unknown) => {
      select: (fields: string) => { lean: () => Promise<unknown> };
    };
  };
};

export async function rejectProtectedSignedUpdate(query: LockQuery) {
  if (!updateTouchesProtected(query.getUpdate())) return;

  const existing = await query.model
    .findOne({
      $and: [
        query.getFilter(),
        { immutableSignedCopy: { $exists: true, $ne: null } },
      ],
    })
    .select("_id")
    .lean();

  if (existing) {
    throw new Error("SIGNED_AGREEMENT_IMMUTABLE");
  }
}

export function freezeSignedSnapshot(
  doc: {
    status?: string;
    immutableSignedCopy?: unknown;
    immutableSignedCopyFrozenAt?: Date;
    $locals?: Record<string, unknown>;
  },
  build: (doc: unknown) => unknown
) {
  if (String(doc.status || "") !== "signed" || doc.immutableSignedCopy) return;
  doc.immutableSignedCopy = build(doc);
  doc.immutableSignedCopyFrozenAt = new Date();
  doc.$locals = doc.$locals || {};
  doc.$locals.justFrozen = true;
}

export function restoreFrozenSignedContent(doc: {
  immutableSignedCopy?: Record<string, unknown> | null;
  $locals?: Record<string, unknown>;
  modifiedPaths?: () => string[];
  set?: (path: string, value: unknown) => void;
}) {
  const snapshot = doc.immutableSignedCopy;
  if (!snapshot || doc.$locals?.justFrozen) return;

  const modified =
    typeof doc.modifiedPaths === "function" ? doc.modifiedPaths() : [];
  const roots = new Set<string>();

  for (const path of modified) {
    if (pathIsProtected(path)) roots.add(path.split(".")[0]);
  }

  if (!doc.set) return;

  for (const root of roots) {
    if (Object.prototype.hasOwnProperty.call(snapshot, root)) {
      doc.set(root, snapshot[root]);
    }
  }
}

function plain(doc: unknown) {
  if (
    doc &&
    typeof doc === "object" &&
    "toObject" in doc &&
    typeof (doc as { toObject?: unknown }).toObject === "function"
  ) {
    return (doc as { toObject: (options?: unknown) => Record<string, unknown> }).toObject(
      { depopulate: true }
    );
  }
  return (doc || {}) as Record<string, unknown>;
}

export function buildSalesDocumentSignedCopy(doc: unknown) {
  const source = plain(doc);
  const sms = (source.sms || {}) as Record<string, unknown>;
  return {
    type: source.type || "agreement",
    token: source.token || "",
    status: source.status || "signed",
    url: source.url || "",
    pdfUrl: source.pdfUrl || "",
    client: source.client || {},
    event: source.event || {},
    quote: source.quote || {},
    agreement: source.agreement || {},
    selectedPackage: source.selectedPackage || {},
    upsells: source.upsells || [],
    totals: source.totals || {},
    customerDealSummary: source.customerDealSummary || {},
    cancellationTerms: source.cancellationTerms || [],
    paymentTerms: source.paymentTerms || [],
    additionalTerms: source.additionalTerms || [],
    engagementTerms: source.engagementTerms || [],
    signature: source.signature || {},
    audit: source.audit || {},
    signedAt: source.signedAt || null,
    smsSentAt: sms.sentAt || null,
  };
}

export function buildCustomerAgreementSignedCopy(doc: unknown) {
  const source = plain(doc);
  return {
    title: source.title || "",
    amount: source.amount || 0,
    status: source.status || "signed",
    signedAt: source.signedAt || null,
    signerName: source.signerName || "",
    signerIdNumber: source.signerIdNumber || "",
    signerEmail: source.signerEmail || "",
    signerPhone: source.signerPhone || "",
    signatureText: source.signatureText || "",
    signatureImageUrl: source.signatureImageUrl || "",
    ipAddress: source.ipAddress || "",
    pdfUrl: source.pdfUrl || "",
    publicToken: source.publicToken || "",
  };
}
