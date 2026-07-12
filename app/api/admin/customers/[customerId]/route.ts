import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import CustomerFile from "@/models/CustomerFile";
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
      return "opened";

    case "signed":
      return "approved";

    case "expired":
      return "expired";

    case "cancelled":
      return "cancelled";

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
      description: cleanString(
        document?.selectedPackage?.customerSummary
      ),
      price: asNumber(document?.selectedPackage?.price),
    });
  }

  const upsells = Array.isArray(document?.upsells)
    ? document.upsells
    : [];

  for (const upsell of upsells) {
    const title = cleanString(upsell?.title);

    if (!title) continue;

    items.push({
      title,
      description: cleanString(upsell?.description),
      price: asNumber(
        upsell?.givenFree
          ? 0
          : upsell?.price ?? upsell?.totalPrice
      ),
    });
  }

  return items;
}

function mapQuote(
  document: AnyRecord,
  customerId: string,
  customerUserId: string
) {
  return {
    _id: getDocumentId(document),
    customerFileId: customerId,
    userId: customerUserId,

    quoteNumber: getDocumentNumber(document, "Q"),

    items: buildQuoteItems(document),

    total: asNumber(
      document?.totals?.grossAmountAfterDiscount ??
        document?.totals?.grossAmount
    ),

    validUntil:
      document?.quote?.expiresAt ||
      document?.validUntil ||
      null,

    status: mapQuoteStatus(document?.status),

    publicToken: cleanString(
      document?.token || document?.publicToken
    ),

    createdAt:
      document?.createdAt ||
      document?.quote?.createdAt ||
      null,

    updatedAt: document?.updatedAt || null,
  };
}

function mapAgreement(
  document: AnyRecord,
  customerId: string,
  customerUserId: string
) {
  const packageTitle = cleanString(
    document?.selectedPackage?.title
  );

  return {
    _id: getDocumentId(document),
    customerFileId: customerId,
    userId: customerUserId,

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

    publicToken: cleanString(
      document?.token || document?.publicToken
    ),

    pdfUrl: cleanString(document?.pdfUrl),

    createdAt: document?.createdAt || null,

    updatedAt: document?.updatedAt || null,
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

    const phoneRegexes = [
      localPhoneRegex,
      internationalPhoneRegex,
    ].filter(Boolean);

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

    const phoneRegexes = [
      localPhoneRegex,
      internationalPhoneRegex,
    ].filter(Boolean);

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
      .populate(
        "assignedStaffIds",
        "_id name email role staffType"
      )
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

    const conditions =
      buildSalesDocumentConditions(customer);

    let documents: AnyRecord[] = [];

    if (conditions.length > 0) {
      documents = (await SalesDocument.find({
        $or: conditions,
      })
        .sort({
          createdAt: -1,
        })
        .lean()) as AnyRecord[];
    }

    const customerUserId = cleanString(customer?.userId);

    const quotes = documents
      .filter(
        (document) =>
          cleanString(document?.type).toLowerCase() === "quote"
      )
      .map((document) =>
        mapQuote(document, customerId, customerUserId)
      );

    const agreements = documents
      .filter(
        (document) =>
          cleanString(document?.type).toLowerCase() ===
          "agreement"
      )
      .map((document) =>
        mapAgreement(document, customerId, customerUserId)
      );

    console.log("ADMIN CUSTOMER SALES DOCUMENTS:", {
      customerId,
      customerName: customer?.fullName || "",
      customerEmail: customer?.email || "",
      customerPhone: customer?.phone || "",
      documentsFound: documents.length,
      quotesFound: quotes.length,
      agreementsFound: agreements.length,
    });

    return NextResponse.json(
      {
        success: true,
        customer,
        quotes,
        agreements,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
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