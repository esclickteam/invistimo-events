import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import CustomerFile from "@/models/CustomerFile";
import CustomerQuote from "@/models/CustomerQuote";
import CustomerAgreement from "@/models/CustomerAgreement";
import SalesDocument from "@/models/SalesDocument";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown) {
  return cleanString(value).toLowerCase();
}

function normalizePhone(value: unknown) {
  let digits = cleanString(value).replace(/\D/g, "");

  if (digits.startsWith("972")) {
    digits = `0${digits.slice(3)}`;
  }

  return digits;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createExactTextRegex(value: string) {
  return new RegExp(`^${escapeRegex(value)}$`, "i");
}

function createPhoneRegex(phone: string) {
  const digits = normalizePhone(phone);

  if (!digits) return null;

  const pattern = digits.split("").join("\\D*");

  return new RegExp(`^\\D*${pattern}\\D*$`, "i");
}

function createInternationalPhoneRegex(phone: string) {
  const localPhone = normalizePhone(phone);

  if (!localPhone) return null;

  const internationalPhone = localPhone.startsWith("0")
    ? `972${localPhone.slice(1)}`
    : localPhone;

  const pattern = internationalPhone.split("").join("\\D*");

  return new RegExp(`^\\D*\\+?${pattern}\\D*$`, "i");
}

function toDateOnly(value: unknown) {
  if (!value) return "";

  const rawValue = cleanString(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDocumentId(document: AnyRecord) {
  return cleanString(document?._id);
}

function getDocumentNumber(document: AnyRecord, prefix: string) {
  const existingNumber = cleanString(
    document?.quoteNumber ||
      document?.agreementNumber ||
      document?.documentNumber ||
      document?.number
  );

  if (existingNumber) {
    return existingNumber;
  }

  const documentId = getDocumentId(document);
  const suffix = documentId.slice(-6).toUpperCase();

  return suffix ? `${prefix}-${suffix}` : prefix;
}

function getSignedAt(document: AnyRecord) {
  return (
    document?.signedAt ||
    document?.agreement?.signedAt ||
    document?.signature?.signedAt ||
    document?.audit?.signedAt ||
    null
  );
}

function getSignatureFullName(document: AnyRecord) {
  return cleanString(
    document?.agreement?.signatureFullName ||
      document?.signature?.fullName ||
      document?.client?.fullName
  );
}

function getSignatureIdNumber(document: AnyRecord) {
  return cleanString(
    document?.agreement?.signatureIdNumber ||
      document?.signature?.idNumber ||
      document?.client?.idNumber
  );
}

function getSignaturePhone(document: AnyRecord) {
  return cleanString(
    document?.agreement?.signaturePhone ||
      document?.signature?.phone ||
      document?.client?.phone
  );
}

function getSignatureText(document: AnyRecord) {
  return cleanString(
    document?.agreement?.signatureText ||
      document?.signature?.signatureText
  );
}

function getSignatureImage(document: AnyRecord) {
  return cleanString(
    document?.agreement?.signatureDataUrl ||
      document?.signature?.signatureDataUrl
  );
}

function getSignatureIp(document: AnyRecord) {
  return cleanString(
    document?.audit?.signedIp ||
      document?.signature?.signedIp ||
      document?.signature?.ip
  );
}

function mapQuoteStatus(value: unknown) {
  const status = cleanString(value).toLowerCase();

  switch (status) {
    case "draft":
      return "draft";

    case "sent":
      return "sent";

    case "viewed":
    case "opened":
      return "opened";

    case "signed":
    case "approved":
      return "approved";

    case "expired":
      return "expired";

    case "cancelled":
      return "cancelled";

    case "converted":
      return "converted";

    default:
      return status || "draft";
  }
}

function mapAgreementStatus(document: AnyRecord) {
  const signedAt = getSignedAt(document);

  if (signedAt) {
    return "signed";
  }

  const status = cleanString(document?.status).toLowerCase();

  switch (status) {
    case "draft":
      return "draft";

    case "sent":
      return "sent";

    case "viewed":
      return "sent";

    case "signed":
      return "signed";

    case "expired":
      return "cancelled";

    case "cancelled":
      return "cancelled";

    default:
      return status || "draft";
  }
}

function buildQuoteItems(document: AnyRecord) {
  const items: Array<{
    title: string;
    description?: string;
    price: number;
  }> = [];

  const packageTitle = cleanString(document?.selectedPackage?.title);

  if (packageTitle) {
    items.push({
      title: packageTitle,
      description: cleanString(document?.selectedPackage?.customerSummary),
      price: asNumber(document?.selectedPackage?.price),
    });
  }

  const upsells = Array.isArray(document?.upsells) ? document.upsells : [];

  for (const upsell of upsells) {
    const title = cleanString(upsell?.title);

    if (!title) continue;

    items.push({
      title,
      description: cleanString(upsell?.description),
      price: asNumber(
        upsell?.givenFree ? 0 : upsell?.price ?? upsell?.totalPrice
      ),
    });
  }

  return items;
}

function mapQuoteFromSalesDocument(
  document: AnyRecord,
  customerId: string,
  customerUserId: string
) {
  return {
    _id: getDocumentId(document),
    customerFileId: customerId,
    userId: customerUserId || null,
    salesDocumentId: getDocumentId(document),

    quoteNumber: getDocumentNumber(document, "Q"),

    items: buildQuoteItems(document),

    total: asNumber(
      document?.totals?.grossAmountAfterDiscount ??
        document?.totals?.grossAmount
    ),

    validUntil: document?.quote?.expiresAt || document?.validUntil || null,

    status: mapQuoteStatus(document?.status),

    publicToken: cleanString(document?.token || document?.publicToken),

    createdAt: document?.createdAt || document?.quote?.createdAt || null,

    updatedAt: document?.updatedAt || null,
  };
}

function mapAgreementFromSalesDocument(
  document: AnyRecord,
  customerId: string,
  customerUserId: string
) {
  const packageTitle = cleanString(document?.selectedPackage?.title);

  return {
    _id: getDocumentId(document),
    customerFileId: customerId,
    userId: customerUserId || null,
    salesDocumentId: getDocumentId(document),

    title:
      cleanString(document?.title) ||
      (packageTitle
        ? `הסכם שירותים – ${packageTitle}`
        : "הסכם שירותים"),

    amount: asNumber(
      document?.totals?.grossAmountAfterDiscount ??
        document?.totals?.grossAmount
    ),

    status: mapAgreementStatus(document),

    signedAt: getSignedAt(document),

    signerName: getSignatureFullName(document),

    signerIdNumber: getSignatureIdNumber(document),

    signerEmail: cleanString(document?.client?.email),

    signerPhone: getSignaturePhone(document),

    signatureText: getSignatureText(document),

    signatureImageUrl: getSignatureImage(document),

    ipAddress: getSignatureIp(document),

    publicToken: cleanString(document?.token || document?.publicToken),

    pdfUrl: cleanString(document?.pdfUrl),

    createdAt: document?.createdAt || null,

    updatedAt: document?.updatedAt || null,
  };
}

function enrichQuoteFromSalesDocument(
  quote: AnyRecord,
  salesDocument: AnyRecord | undefined,
  customerId: string,
  customerUserId: string
) {
  const base = {
    _id: getDocumentId(quote),
    customerFileId: cleanString(quote?.customerFileId) || customerId,
    userId: cleanString(quote?.userId) || customerUserId || null,
    salesDocumentId:
      cleanString(quote?.salesDocumentId) ||
      (salesDocument ? getDocumentId(salesDocument) : ""),
    quoteNumber:
      cleanString(quote?.quoteNumber) ||
      (salesDocument ? getDocumentNumber(salesDocument, "Q") : "Q"),
    items: Array.isArray(quote?.items) ? quote.items : [],
    total: asNumber(quote?.total),
    validUntil: quote?.validUntil || null,
    status: mapQuoteStatus(quote?.status),
    publicToken: cleanString(quote?.publicToken),
    createdAt: quote?.createdAt || null,
    updatedAt: quote?.updatedAt || null,
  };

  if (!salesDocument) {
    return base;
  }

  const salesItems = buildQuoteItems(salesDocument);
  const salesStatus = mapQuoteStatus(salesDocument?.status);
  const quoteStatus = mapQuoteStatus(quote?.status);

  // Prefer the live SalesDocument status when it is further along.
  const statusPriority = [
    "draft",
    "sent",
    "opened",
    "approved",
    "converted",
    "expired",
    "cancelled",
  ];
  const quoteRank = statusPriority.indexOf(quoteStatus);
  const salesRank = statusPriority.indexOf(salesStatus);
  const status =
    salesRank > quoteRank && salesRank >= 0 ? salesStatus : quoteStatus;

  return {
    ...base,
    items: salesItems.length > 0 ? salesItems : base.items,
    total:
      asNumber(
        salesDocument?.totals?.grossAmountAfterDiscount ??
          salesDocument?.totals?.grossAmount,
        base.total
      ) || base.total,
    validUntil:
      quote?.validUntil ||
      salesDocument?.quote?.expiresAt ||
      salesDocument?.validUntil ||
      null,
    status,
    publicToken:
      base.publicToken ||
      cleanString(salesDocument?.token || salesDocument?.publicToken),
    createdAt: base.createdAt || salesDocument?.createdAt || null,
    updatedAt: salesDocument?.updatedAt || base.updatedAt || null,
  };
}

function enrichAgreementFromSalesDocument(
  agreement: AnyRecord,
  salesDocument: AnyRecord | undefined,
  customerId: string,
  customerUserId: string
) {
  const base = {
    _id: getDocumentId(agreement),
    customerFileId: cleanString(agreement?.customerFileId) || customerId,
    userId: cleanString(agreement?.userId) || customerUserId || null,
    salesDocumentId:
      cleanString(agreement?.salesDocumentId) ||
      (salesDocument ? getDocumentId(salesDocument) : ""),
    title: cleanString(agreement?.title) || "הסכם שירותים",
    amount: asNumber(agreement?.amount),
    status: cleanString(agreement?.status) || "draft",
    signedAt: agreement?.signedAt || null,
    signerName: cleanString(agreement?.signerName),
    signerIdNumber: cleanString(agreement?.signerIdNumber),
    signerEmail: cleanString(agreement?.signerEmail),
    signerPhone: cleanString(agreement?.signerPhone),
    signatureText: cleanString(agreement?.signatureText),
    signatureImageUrl: cleanString(agreement?.signatureImageUrl),
    ipAddress: cleanString(agreement?.ipAddress),
    publicToken: cleanString(agreement?.publicToken),
    pdfUrl: cleanString(agreement?.pdfUrl),
    createdAt: agreement?.createdAt || null,
    updatedAt: agreement?.updatedAt || null,
  };

  if (!salesDocument) {
    return base;
  }

  const mapped = mapAgreementFromSalesDocument(
    salesDocument,
    customerId,
    customerUserId
  );

  return {
    ...base,
    title: base.title || mapped.title,
    amount: base.amount || mapped.amount,
    status:
      mapped.status === "signed" || mapped.signedAt
        ? "signed"
        : base.status === "draft" && mapped.status
          ? mapped.status
          : base.status,
    signedAt: base.signedAt || mapped.signedAt,
    signerName: base.signerName || mapped.signerName,
    signerIdNumber: base.signerIdNumber || mapped.signerIdNumber,
    signerEmail: base.signerEmail || mapped.signerEmail,
    signerPhone: base.signerPhone || mapped.signerPhone,
    signatureText: base.signatureText || mapped.signatureText,
    signatureImageUrl: base.signatureImageUrl || mapped.signatureImageUrl,
    ipAddress: base.ipAddress || mapped.ipAddress,
    publicToken: base.publicToken || mapped.publicToken,
    pdfUrl: base.pdfUrl || mapped.pdfUrl,
    createdAt: base.createdAt || mapped.createdAt,
    updatedAt: mapped.updatedAt || base.updatedAt,
  };
}

function buildSalesDocumentConditions(customer: AnyRecord) {
  const conditions: AnyRecord[] = [];

  const customerEmail = normalizeEmail(customer?.email);
  const customerPhone = normalizePhone(customer?.phone);
  const customerName = cleanString(customer?.fullName);
  const eventDate = toDateOnly(customer?.eventDate);

  const savedTokens = [
    customer?.quoteToken,
    customer?.agreementToken,
    customer?.signedAgreementToken,
    customer?.salesDocumentToken,
  ]
    .map(cleanString)
    .filter(Boolean);

  if (savedTokens.length > 0) {
    conditions.push({
      token: {
        $in: savedTokens,
      },
    });
  }

  const customerFileId = cleanString(customer?._id);

  if (customerFileId && mongoose.Types.ObjectId.isValid(customerFileId)) {
    conditions.push({
      customerFileId: new mongoose.Types.ObjectId(customerFileId),
    });
  }

  if (customerEmail) {
    const emailCondition: AnyRecord = {
      "client.email": createExactTextRegex(customerEmail),
    };

    if (eventDate) {
      emailCondition["event.date"] = eventDate;
    }

    conditions.push(emailCondition);
  }

  if (customerPhone) {
    const localPhoneRegex = createPhoneRegex(customerPhone);
    const internationalPhoneRegex =
      createInternationalPhoneRegex(customerPhone);

    const phoneRegexes = [localPhoneRegex, internationalPhoneRegex].filter(
      Boolean
    );

    if (phoneRegexes.length > 0) {
      const phoneCondition: AnyRecord = {
        "client.phone": {
          $in: phoneRegexes,
        },
      };

      if (eventDate) {
        phoneCondition["event.date"] = eventDate;
      }

      conditions.push(phoneCondition);
    }
  }

  if (customerName && eventDate) {
    conditions.push({
      "client.fullName": createExactTextRegex(customerName),
      "event.date": eventDate,
    });
  }

  /*
   * גיבוי למסמכים ישנים שבהם תאריך האירוע לא נשמר
   * או נשמר בצורה אחרת.
   */
  if (customerEmail) {
    conditions.push({
      "client.email": createExactTextRegex(customerEmail),
    });
  }

  if (customerPhone) {
    const localPhoneRegex = createPhoneRegex(customerPhone);
    const internationalPhoneRegex =
      createInternationalPhoneRegex(customerPhone);

    const phoneRegexes = [localPhoneRegex, internationalPhoneRegex].filter(
      Boolean
    );

    if (phoneRegexes.length > 0) {
      conditions.push({
        "client.phone": {
          $in: phoneRegexes,
        },
      });
    }
  }

  return conditions;
}

function sortByCreatedAtDesc(a: AnyRecord, b: AnyRecord) {
  const aTime = new Date(a?.createdAt || 0).getTime();
  const bTime = new Date(b?.createdAt || 0).getTime();

  return bTime - aTime;
}

export async function GET(
  _req: NextRequest,
  context: {
    params: Promise<{
      customerId: string;
    }>;
  }
) {
  try {
    await db();

    const { customerId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return NextResponse.json(
        {
          success: false,
          error: "מזהה תיק לקוח לא תקין",
        },
        {
          status: 400,
        }
      );
    }

    const customer = (await CustomerFile.findById(customerId)
      .populate("assignedStaffIds", "_id name email role staffType")
      .lean()) as AnyRecord | null;

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: "תיק לקוח לא נמצא",
        },
        {
          status: 404,
        }
      );
    }

    const customerUserId = cleanString(customer?.userId);

    const [savedQuotes, savedAgreements] = await Promise.all([
      CustomerQuote.find({ customerFileId: customerId })
        .sort({ createdAt: -1 })
        .lean(),
      CustomerAgreement.find({ customerFileId: customerId })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const tokenSet = new Set<string>();
    const salesDocumentIdSet = new Set<string>();

    for (const quote of savedQuotes as AnyRecord[]) {
      const token = cleanString(quote?.publicToken);
      const salesDocumentId = cleanString(quote?.salesDocumentId);

      if (token) tokenSet.add(token);
      if (salesDocumentId) salesDocumentIdSet.add(salesDocumentId);
    }

    for (const agreement of savedAgreements as AnyRecord[]) {
      const token = cleanString(agreement?.publicToken);
      const salesDocumentId = cleanString(agreement?.salesDocumentId);

      if (token) tokenSet.add(token);
      if (salesDocumentId) salesDocumentIdSet.add(salesDocumentId);
    }

    const conditions = buildSalesDocumentConditions(customer);

    const salesDocumentQuery: AnyRecord = {
      $or: [
        ...(conditions.length > 0 ? conditions : []),
        ...(tokenSet.size > 0
          ? [
              {
                token: {
                  $in: Array.from(tokenSet),
                },
              },
            ]
          : []),
        ...(salesDocumentIdSet.size > 0
          ? [
              {
                _id: {
                  $in: Array.from(salesDocumentIdSet).filter((id) =>
                    mongoose.Types.ObjectId.isValid(id)
                  ),
                },
              },
            ]
          : []),
      ],
    };

    let salesDocuments: AnyRecord[] = [];

    if (salesDocumentQuery.$or.length > 0) {
      salesDocuments = (await SalesDocument.find(salesDocumentQuery)
        .sort({
          createdAt: -1,
        })
        .lean()) as AnyRecord[];
    }

    const salesDocumentsById = new Map<string, AnyRecord>();
    const salesDocumentsByToken = new Map<string, AnyRecord>();

    for (const document of salesDocuments) {
      const id = getDocumentId(document);
      const token = cleanString(document?.token);

      if (id) salesDocumentsById.set(id, document);
      if (token) salesDocumentsByToken.set(token, document);
    }

    const quotes = (savedQuotes as AnyRecord[]).map((quote) => {
      const salesDocumentId = cleanString(quote?.salesDocumentId);
      const token = cleanString(quote?.publicToken);

      const salesDocument =
        (salesDocumentId
          ? salesDocumentsById.get(salesDocumentId)
          : undefined) ||
        (token ? salesDocumentsByToken.get(token) : undefined);

      return enrichQuoteFromSalesDocument(
        quote,
        salesDocument,
        customerId,
        customerUserId
      );
    });

    const agreements = (savedAgreements as AnyRecord[]).map((agreement) => {
      const salesDocumentId = cleanString(agreement?.salesDocumentId);
      const token = cleanString(agreement?.publicToken);

      const salesDocument =
        (salesDocumentId
          ? salesDocumentsById.get(salesDocumentId)
          : undefined) ||
        (token ? salesDocumentsByToken.get(token) : undefined);

      return enrichAgreementFromSalesDocument(
        agreement,
        salesDocument,
        customerId,
        customerUserId
      );
    });

    const knownQuoteTokens = new Set(
      quotes.map((quote) => cleanString(quote.publicToken)).filter(Boolean)
    );
    const knownAgreementTokens = new Set(
      agreements
        .map((agreement) => cleanString(agreement.publicToken))
        .filter(Boolean)
    );
    const knownQuoteSalesIds = new Set(
      quotes
        .map((quote) => cleanString(quote.salesDocumentId))
        .filter(Boolean)
    );
    const knownAgreementSalesIds = new Set(
      agreements
        .map((agreement) => cleanString(agreement.salesDocumentId))
        .filter(Boolean)
    );

    // Legacy fallback: include SalesDocuments that were never written into
    // CustomerQuote / CustomerAgreement, but clearly belong to this customer.
    for (const document of salesDocuments) {
      const type = cleanString(document?.type).toLowerCase();
      const token = cleanString(document?.token);
      const documentId = getDocumentId(document);

      if (type === "quote") {
        if (
          (token && knownQuoteTokens.has(token)) ||
          (documentId && knownQuoteSalesIds.has(documentId))
        ) {
          continue;
        }

        quotes.push(
          mapQuoteFromSalesDocument(document, customerId, customerUserId)
        );
        continue;
      }

      if (type === "agreement") {
        if (
          (token && knownAgreementTokens.has(token)) ||
          (documentId && knownAgreementSalesIds.has(documentId))
        ) {
          continue;
        }

        agreements.push(
          mapAgreementFromSalesDocument(document, customerId, customerUserId)
        );
      }
    }

    quotes.sort(sortByCreatedAtDesc);
    agreements.sort(sortByCreatedAtDesc);

    return NextResponse.json(
      {
        success: true,
        customer,
        quotes,
        agreements,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("GET CUSTOMER FILE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בטעינת תיק לקוח",
      },
      {
        status: 500,
      }
    );
  }
}
