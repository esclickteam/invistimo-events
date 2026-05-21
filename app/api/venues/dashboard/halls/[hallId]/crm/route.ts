import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import VenueHall from "@/models/VenueHall";
import VenueLead from "@/models/VenueLead";
import VenueEvent from "@/models/VenueEvent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    hallId: string;
  }>;
};

const allowedStatuses = [
  "new",
  "contacted",
  "meeting",
  "proposal",
  "negotiation",
  "closed",
  "lost",
];

const allowedActivityTypes = [
  "call",
  "note",
  "meeting",
  "proposal",
  "contract",
  "sms",
];

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayLabel() {
  return new Date().toLocaleString("he-IL");
}

function serializeLead(lead: any) {
  return {
    id: String(lead._id),
    _id: String(lead._id),

    ownerId: String(lead.ownerId),
    hallId: lead.hallId,

    name: lead.name || "",
    phone: lead.phone || "",
    email: lead.email || "",

    eventType: lead.eventType || "",
    requestedDate: lead.requestedDate || "",
    preferredHall: lead.preferredHall || "",

    guests: lead.guests || 0,
    budget: lead.budget || 0,

    source: lead.source || "",
    owner: lead.owner || "",

    status: lead.status || "new",
    lastActivity: lead.lastActivity || "",

    eventId: lead.eventId || "",
    meetingAt: lead.meetingAt || "",

    proposalFileName: lead.proposalFileName || "",
    contractFileName: lead.contractFileName || "",
    proposalSignature: lead.proposalSignature || "",
    contractSignature: lead.contractSignature || "",

    activities: Array.isArray(lead.activities) ? lead.activities : [],

    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

async function requireAuthAndHall(req: NextRequest, hallId: string) {
  const auth = await getUserIdFromRequest(req);

  if (!auth?.userId) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      ),
      auth: null,
      hall: null,
      safeHallId: "",
    };
  }

  const decodedHallId = decodeURIComponent(hallId);

  const hallOrConditions: any[] = [
    { id: hallId },
    { id: decodedHallId },
  ];

  if (mongoose.Types.ObjectId.isValid(hallId)) {
    hallOrConditions.push({ _id: hallId });
  }

  const hall = await VenueHall.findOne({
    ownerId: auth.userId,
    $or: hallOrConditions,
  }).lean();

  if (!hall) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "האולם לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      ),
      auth,
      hall: null,
      safeHallId: "",
    };
  }

  return {
    error: null,
    auth,
    hall,
    safeHallId: String((hall as any).id || (hall as any)._id),
  };
}

/* ======================================================
   GET /api/venues/dashboard/halls/[hallId]/crm
====================================================== */
export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    if (!hallId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה אולם",
        },
        { status: 400 }
      );
    }

    const guard = await requireAuthAndHall(req, hallId);
    if (guard.error) return guard.error;

    const url = new URL(req.url);
    const status = cleanString(url.searchParams.get("status"));
    const search = cleanString(url.searchParams.get("search"));

    const query: Record<string, any> = {
      ownerId: guard.auth!.userId,
      hallId: guard.safeHallId,
    };

    if (status && allowedStatuses.includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { eventType: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await VenueLead.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      hall: {
        id: guard.safeHallId,
        name: (guard.hall as any).name || "",
        subtitle: (guard.hall as any).subtitle || "",
        capacity: (guard.hall as any).capacity || 0,
        status: (guard.hall as any).status || "active",
      },
      leads: leads.map(serializeLead),
    });
  } catch (error) {
    console.error("GET /api/venues/dashboard/halls/[hallId]/crm failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "טעינת CRM נכשלה",
      },
      { status: 500 }
    );
  }
}

/* ======================================================
   POST /api/venues/dashboard/halls/[hallId]/crm
   יצירת ליד חדש
====================================================== */
export async function POST(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    if (!hallId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה אולם",
        },
        { status: 400 }
      );
    }

    const guard = await requireAuthAndHall(req, hallId);
    if (guard.error) return guard.error;

    const body = await req.json();

    const name = cleanString(body.name);

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "חובה להזין שם לקוח",
        },
        { status: 400 }
      );
    }

    const requestedStatus = cleanString(body.status);
    const status = allowedStatuses.includes(requestedStatus)
      ? requestedStatus
      : "new";

    const lead = await VenueLead.create({
      ownerId: guard.auth!.userId,
      hallId: guard.safeHallId,

      name,
      phone: cleanString(body.phone),
      email: cleanString(body.email),

      eventType: cleanString(body.eventType),
      requestedDate: cleanString(body.requestedDate),
      preferredHall: cleanString(body.preferredHall) || (guard.hall as any).name || "",

      guests: Math.max(0, toNumber(body.guests)),
      budget: Math.max(0, toNumber(body.budget)),

      source: cleanString(body.source) || "ידני",
      owner: cleanString(body.owner),

      status,
      lastActivity: "ליד חדש",

      activities: [
        {
          id: makeId("activity"),
          type: "note",
          title: "ליד חדש",
          description: "הליד נוצר ידנית במערכת CRM.",
          date: todayLabel(),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: "הליד נוצר בהצלחה",
      lead: serializeLead(lead),
    });
  } catch (error) {
    console.error("POST /api/venues/dashboard/halls/[hallId]/crm failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "יצירת ליד נכשלה",
      },
      { status: 500 }
    );
  }
}

/* ======================================================
   PUT /api/venues/dashboard/halls/[hallId]/crm
   עדכון ליד / הוספת פעילות / סגירת אירוע
====================================================== */
export async function PUT(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    if (!hallId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה אולם",
        },
        { status: 400 }
      );
    }

    const guard = await requireAuthAndHall(req, hallId);
    if (guard.error) return guard.error;

    const body = await req.json();

    const leadId = cleanString(body.leadId || body.id || body._id);

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה ליד",
        },
        { status: 400 }
      );
    }

    const action = cleanString(body.action || "update");

    const lead = await VenueLead.findOne({
      _id: leadId,
      ownerId: guard.auth!.userId,
      hallId: guard.safeHallId,
    });

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          message: "הליד לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    if (action === "activity") {
      const requestedType = cleanString(body.type);
      const type = allowedActivityTypes.includes(requestedType)
        ? requestedType
        : "note";

      const title = cleanString(body.title) || "פעילות חדשה";

      lead.activities.unshift({
        id: makeId("activity"),
        type,
        title,
        description: cleanString(body.description),
        date: cleanString(body.date) || todayLabel(),
      });

      lead.lastActivity = title;

      if (body.status && allowedStatuses.includes(cleanString(body.status))) {
        lead.status = cleanString(body.status);
      }

      if (body.meetingAt) {
        lead.meetingAt = cleanString(body.meetingAt);
      }

      await lead.save();

      return NextResponse.json({
        success: true,
        message: "הפעילות נשמרה",
        lead: serializeLead(lead),
      });
    }

    if (action === "closeEvent") {
      const event = await VenueEvent.create({
        ownerId: guard.auth!.userId,
        hallId: guard.safeHallId,

        title: lead.eventType || `אירוע של ${lead.name}`,
        eventType: lead.eventType || "",
        clientName: lead.name,
        clientPhone: lead.phone,
        clientEmail: lead.email,

        date: cleanString(body.date) || lead.requestedDate,
        startTime: cleanString(body.startTime) || "19:30",
        endTime: cleanString(body.endTime) || "00:30",

        guests: Math.max(0, Number(lead.guests || 0)),
        status: "closed",

        budget: Math.max(0, Number(lead.budget || 0)),
        paidAmount: Math.max(0, toNumber(body.paidAmount)),

        notes: cleanString(body.notes),
      });

      lead.status = "closed";
      lead.eventId = String(event._id);
      lead.lastActivity = "נסגר אירוע ונוצר ביומן";

      lead.activities.unshift({
        id: makeId("activity"),
        type: "contract",
        title: "אירוע נסגר ונוצר ביומן",
        description: "הליד נסגר ונוצר אירוע ביומן האולם.",
        date: todayLabel(),
      });

      await lead.save();

      return NextResponse.json({
        success: true,
        message: "האירוע נסגר ונוצר ביומן",
        lead: serializeLead(lead),
        eventId: String(event._id),
      });
    }

    const patch: Record<string, any> = {};

    const fields = [
      "name",
      "phone",
      "email",
      "eventType",
      "requestedDate",
      "preferredHall",
      "source",
      "owner",
      "meetingAt",
      "proposalFileName",
      "contractFileName",
      "proposalSignature",
      "contractSignature",
    ];

    for (const field of fields) {
      if (field in body) {
        patch[field] = cleanString(body[field]);
      }
    }

    if ("guests" in body) {
      patch.guests = Math.max(0, toNumber(body.guests));
    }

    if ("budget" in body) {
      patch.budget = Math.max(0, toNumber(body.budget));
    }

    if ("status" in body) {
      const requestedStatus = cleanString(body.status);
      if (allowedStatuses.includes(requestedStatus)) {
        patch.status = requestedStatus;
      }
    }

    const updatedLead = await VenueLead.findOneAndUpdate(
      {
        _id: leadId,
        ownerId: guard.auth!.userId,
        hallId: guard.safeHallId,
      },
      {
        $set: patch,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return NextResponse.json({
      success: true,
      message: "הליד נשמר בהצלחה",
      lead: serializeLead(updatedLead),
    });
  } catch (error) {
    console.error("PUT /api/venues/dashboard/halls/[hallId]/crm failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "שמירת ליד נכשלה",
      },
      { status: 500 }
    );
  }
}

/* ======================================================
   DELETE /api/venues/dashboard/halls/[hallId]/crm?leadId=...
====================================================== */
export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const { hallId } = await params;

    if (!hallId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה אולם",
        },
        { status: 400 }
      );
    }

    const guard = await requireAuthAndHall(req, hallId);
    if (guard.error) return guard.error;

    const url = new URL(req.url);
    const leadId = cleanString(url.searchParams.get("leadId"));

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה ליד למחיקה",
        },
        { status: 400 }
      );
    }

    const deleted = await VenueLead.findOneAndDelete({
      _id: leadId,
      ownerId: guard.auth!.userId,
      hallId: guard.safeHallId,
    });

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message: "הליד לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "הליד נמחק בהצלחה",
      deletedLeadId: leadId,
    });
  } catch (error) {
    console.error("DELETE /api/venues/dashboard/halls/[hallId]/crm failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "מחיקת ליד נכשלה",
      },
      { status: 500 }
    );
  }
}