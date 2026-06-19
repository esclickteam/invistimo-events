import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import CustomerFile from "@/models/CustomerFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return cleanString(value).toLowerCase();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundNumber(value: unknown) {
  const parsed = Math.floor(toNumber(value, 0));
  return parsed > 0 ? parsed : 0;
}

function normalizePhone(value: unknown) {
  return cleanString(value).replace(/[^\d+]/g, "");
}

function getBearerToken(req: NextRequest) {
  const authorization = cleanString(req.headers.get("authorization"));

  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return "";
}

function getWebhookSecret(req: NextRequest) {
  return (
    cleanString(req.headers.get("x-invistimo-webhook-secret")) ||
    getBearerToken(req)
  );
}

function pickFirst(...values: unknown[]) {
  for (const value of values) {
    const cleaned = cleanString(value);
    if (cleaned) return cleaned;
  }

  return "";
}

function parseEventDate(value: unknown) {
  const raw = cleanString(value);
  if (!raw) return null;

  // תומך בתאריך רגיל שמגיע מ-Make / Facebook
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  // תומך בפורמט ישראלי: 25/08/2026
  const match = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const yearRaw = Number(match[3]);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;

    const date = new Date(year, month - 1, day);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

function buildLeadNotes({
  guestsCount,
  eventDateText,
  interestedService,
  existingNotes,
}: {
  guestsCount: number;
  eventDateText: string;
  interestedService: string;
  existingNotes: string;
}) {
  const lines = [
    "ליד נכנס מפייסבוק דרך Make",
    guestsCount ? `כמות מוזמנים: ${guestsCount}` : "",
    eventDateText ? `תאריך אירוע כפי שהתקבל: ${eventDateText}` : "",
    interestedService ? `שירות שמעניין את הלקוח: ${interestedService}` : "",
    existingNotes,
  ].filter(Boolean);

  return lines.join("\n");
}

function normalizeFacebookLeadBody(body: any) {
  const fullName = pickFirst(
    body?.fullName,
    body?.name,
    body?.clientName,
    body?.firstName,
    body?.first_name,
    body?.["שם"],
    body?.["שם מלא"]
  );

  const email = normalizeEmail(
    pickFirst(
      body?.email,
      body?.clientEmail,
      body?.["מייל"],
      body?.["אימייל"]
    )
  );

  const phone = normalizePhone(
    pickFirst(
      body?.phone,
      body?.clientPhone,
      body?.phoneNumber,
      body?.phone_number,
      body?.["טלפון"],
      body?.["מספר טלפון"]
    )
  );

  const guestsCount = roundNumber(
    pickFirst(
      body?.guestsCount,
      body?.guests,
      body?.records,
      body?.["כמה מוזמנים יש באירוע"],
      body?.["כמה_מוזמנים_יש_באירוע?"]
    )
  );

  const eventDateText = pickFirst(
    body?.eventDate,
    body?.event_date,
    body?.["מתי האירוע"],
    body?.["מתי_האירוע?"],
    body?.date
  );

  const eventDate = parseEventDate(eventDateText);

  const interestedService = pickFirst(
    body?.interestedService,
    body?.service,
    body?.packageName,
    body?.["איזה שירות מעניין אתכם"],
    body?.["איזה_שירות_מעניין_אתכם?"]
  );

  const facebookLeadId = cleanString(
    body?.facebookLeadId || body?.leadId || body?.id
  );

  const campaignName = cleanString(body?.campaignName);
  const adName = cleanString(body?.adName);
  const formName = cleanString(body?.formName);

  const notes = buildLeadNotes({
    guestsCount,
    eventDateText,
    interestedService,
    existingNotes: cleanString(body?.notes),
  });

  return {
    fullName,
    email,
    phone,
    guestsCount,
    eventDate,
    eventDateText,
    interestedService,
    facebookLeadId,
    campaignName,
    adName,
    formName,
    notes,
    rawLeadData: body,
  };
}

function buildDuplicateQuery(lead: ReturnType<typeof normalizeFacebookLeadBody>) {
  const or: Record<string, unknown>[] = [];

  if (lead.facebookLeadId) {
    or.push({
      facebookLeadId: lead.facebookLeadId,
      leadProvider: "make",
    });
  }

  if (lead.phone) {
    or.push({
      phone: lead.phone,
      leadSource: "facebook",
    });
  }

  if (lead.email) {
    or.push({
      email: lead.email,
      leadSource: "facebook",
    });
  }

  if (!or.length) return null;

  return { $or: or };
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = cleanString(
      process.env.FACEBOOK_LEADS_WEBHOOK_SECRET
    );

    if (expectedSecret) {
      const incomingSecret = getWebhookSecret(req);

      if (!incomingSecret || incomingSecret !== expectedSecret) {
        return NextResponse.json(
          {
            success: false,
            error: "UNAUTHORIZED_WEBHOOK",
            message: "Webhook secret לא תקין",
          },
          { status: 401 }
        );
      }
    }

    await connectDB();

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_BODY",
          message: "גוף הבקשה לא תקין",
        },
        { status: 400 }
      );
    }

    const lead = normalizeFacebookLeadBody(body);

    if (!lead.fullName && !lead.phone && !lead.email) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_LEAD_DETAILS",
          message: "חובה לשלוח לפחות שם, טלפון או מייל",
        },
        { status: 400 }
      );
    }

    const duplicateQuery = buildDuplicateQuery(lead);

    const payload = {
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,

      eventDate: lead.eventDate,

      guestsCount: lead.guestsCount,
      interestedService: lead.interestedService,

      packageName: lead.interestedService,

      packageBasePrice: 0,
      packageTargetPriceWithCalls: 0,

      hasCallRounds: false,
      allowedCallRounds: 0,

      totalPrice: 0,
      paidAmount: 0,
      balance: 0,

      status: "lead",
      leadStatus: "new",

      leadSource: "facebook",
      leadProvider: "make",
      source: "facebook_lead_make",

      facebookLeadId: lead.facebookLeadId,
      campaignName: lead.campaignName,
      adName: lead.adName,
      formName: lead.formName,

      rawLeadData: lead.rawLeadData,
      notes: lead.notes,
    };

    let customerFile;
    let created = false;

    if (duplicateQuery) {
      const existing = await CustomerFile.findOne(duplicateQuery);

      if (existing) {
        customerFile = await CustomerFile.findByIdAndUpdate(
          existing._id,
          {
            $set: {
              ...payload,
              updatedAt: new Date(),
            },
          },
          { new: true }
        );
      }
    }

    if (!customerFile) {
      customerFile = await CustomerFile.create(payload);
      created = true;
    }

    return NextResponse.json(
      {
        success: true,
        created,
        updated: !created,
        message: created
          ? "הליד נשמר בהצלחה בתיק לקוח"
          : "ליד קיים עודכן בהצלחה בתיק לקוח",
        customerFileId: String(customerFile._id),
        customer: {
          id: String(customerFile._id),
          fullName: customerFile.fullName,
          phone: customerFile.phone,
          email: customerFile.email,
          eventDate: customerFile.eventDate,
          guestsCount: customerFile.guestsCount,
          interestedService: customerFile.interestedService,
          status: customerFile.status,
          leadStatus: customerFile.leadStatus,
          leadSource: customerFile.leadSource,
          leadProvider: customerFile.leadProvider,
        },
      },
      { status: created ? 201 : 200 }
    );
  } catch (error: any) {
    console.error("FACEBOOK LEAD WEBHOOK FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "שגיאת שרת",
      },
      { status: 500 }
    );
  }
}