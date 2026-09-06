import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import * as XLSX from "xlsx";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import WeddingChallengeGuest from "@/models/WeddingChallengeGuest";
import { requireWeddingChallenges } from "@/lib/guards/requireWeddingChallenges";
import { loadEventChallengeContext } from "@/lib/weddingChallenges/service";
import { attendingGuestMongoFilter } from "@/lib/weddingChallenges/sourceType";
import {
  parseGuestListText,
  parseGuestRecords,
  worksheetRowsToRecords,
  normalizeGuestPhone,
  parseTableNumber,
  parseAdultFlag,
  type ImportedChallengeGuest,
} from "@/lib/weddingChallenges/guestImport";
import { LIVE_PATH_PREFIX } from "@/lib/weddingChallenges/constants";
import {
  wouldExceedWeddingChallengesGuestLimit,
  weddingChallengesGuestLimitPayload,
} from "@/lib/weddingChallenges/guestLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tableFields(tableNumber: number | null) {
  if (!tableNumber) {
    return { tableNumber: null, tableName: "", tableId: null as string | null };
  }
  return {
    tableNumber,
    tableName: `שולחן ${tableNumber}`,
    tableId: String(tableNumber),
  };
}

function serializeGuest(guest: any, origin: string) {
  const tableNumber = guest.tableNumber ?? parseTableNumber(guest.tableId);
  return {
    id: String(guest._id),
    name: guest.name,
    phone: guest.phone || "",
    tableNumber,
    tableId: guest.tableId || null,
    isAdult: guest.isAdult !== false,
    rsvp: guest.rsvp || "yes",
    token: guest.token,
    livePath: `${LIVE_PATH_PREFIX}/${guest.token}`,
    liveUrl: `${origin}${LIVE_PATH_PREFIX}/${guest.token}`,
  };
}

function requestOrigin(req: Request) {
  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

function guestsFromJsonBody(body: any): ImportedChallengeGuest[] {
  if (Array.isArray(body?.guests) && body.guests.length) {
    return parseGuestRecords(
      body.guests.map((guest: any) => ({
        name: guest.name || guest.firstName || "",
        phone: guest.phone,
        table: guest.tableNumber ?? guest.table,
        adult: guest.isAdult ?? guest.adult,
      }))
    ).guests;
  }
  if (typeof body?.text === "string" && body.text.trim()) {
    return parseGuestListText(body.text).guests;
  }
  return [];
}

async function guestsFromSpreadsheet(file: File): Promise<ImportedChallengeGuest[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  return parseGuestRecords(worksheetRowsToRecords(rows)).guests;
}

export async function GET(req: Request) {
  const eventId = String(new URL(req.url).searchParams.get("eventId") || "").trim();
  if (!eventId) {
    return NextResponse.json({ success: false, error: "EVENT_ID_REQUIRED" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  await db();
  const context = await loadEventChallengeContext(eventId);
  if (!context?.invitation) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  const guests = await InvitationGuest.find({
    invitationId: context.invitation._id,
    ...attendingGuestMongoFilter(context.sourceType),
  })
    .select("name phone token tableId tableNumber tableName isAdult rsvp")
    .sort({ createdAt: 1 })
    .lean();

  const missingTableCount = guests.filter((guest) => !guest.tableId && !guest.tableNumber).length;
  const origin = requestOrigin(req);

  return NextResponse.json({
    success: true,
    eventId,
    sourceType: context.sourceType,
    guests: guests.map((guest) => serializeGuest(guest, origin)),
    count: guests.length,
    missingTableCount,
    tableRecommended: true,
  });
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  let body: any = {};
  let incoming: ImportedChallengeGuest[] = [];

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    body = {
      eventId: String(form.get("eventId") || ""),
      text: String(form.get("text") || ""),
    };
    const file = form.get("file");
    if (file && typeof file === "object" && "arrayBuffer" in file) {
      incoming = await guestsFromSpreadsheet(file as File);
    } else {
      incoming = guestsFromJsonBody(body);
    }
  } else {
    body = await req.json().catch(() => ({}));
    incoming = guestsFromJsonBody(body);
  }

  const eventId = String(body.eventId || "").trim();
  if (!eventId) {
    return NextResponse.json({ success: false, error: "EVENT_ID_REQUIRED" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  await db();
  const context = await loadEventChallengeContext(eventId);
  if (!context?.invitation) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  if (!incoming.length) {
    return NextResponse.json({ success: false, error: "NO_GUESTS" }, { status: 400 });
  }

  const invitationId = context.invitation._id;
  const existingCount = await InvitationGuest.countDocuments({
    invitationId,
    ...attendingGuestMongoFilter(context.sourceType),
  });
  const existing = await InvitationGuest.find({
    invitationId,
    phone: { $in: incoming.map((guest) => guest.phone) },
  })
    .select("phone")
    .lean();
  const existingPhones = new Set(existing.map((guest) => normalizeGuestPhone(guest.phone)));
  const incomingNewCount = incoming.filter((guest) => !existingPhones.has(guest.phone)).length;
  if (wouldExceedWeddingChallengesGuestLimit(existingCount, incomingNewCount)) {
    return NextResponse.json(weddingChallengesGuestLimitPayload(), { status: 400 });
  }

  const created = [];
  let skipped = 0;
  const ids: string[] = [];

  for (const guest of incoming) {
    if (existingPhones.has(guest.phone)) {
      skipped += 1;
      continue;
    }
    existingPhones.add(guest.phone);
    const table = tableFields(guest.tableNumber);
    const doc = await InvitationGuest.create({
      invitationId,
      name: guest.name,
      phone: guest.phone,
      rsvp: "yes",
      status: "yes",
      guestsCount: 1,
      arrivedCount: 1,
      amount: 1,
      token: nanoid(12),
      isAdult: guest.isAdult !== false,
      ...table,
    });
    created.push(doc);
    ids.push(String(doc._id));
  }

  if (ids.length) {
    await Invitation.updateOne(
      { _id: invitationId },
      { $addToSet: { guests: { $each: ids } } }
    );
  }

  const origin = requestOrigin(req);
  return NextResponse.json({
    success: true,
    added: created.length,
    skipped,
    guests: created.map((guest) => serializeGuest(guest, origin)),
    sourceType: context.sourceType,
  });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const eventId = String(body.eventId || "").trim();
  const guestId = String(body.guestId || body.id || "").trim();
  if (!eventId || !guestId) {
    return NextResponse.json({ success: false, error: "GUEST_ID_REQUIRED" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  await db();
  const context = await loadEventChallengeContext(eventId);
  if (!context?.invitation) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  const guest = await InvitationGuest.findOne({
    _id: guestId,
    invitationId: context.invitation._id,
  });
  if (!guest) {
    return NextResponse.json({ success: false, error: "GUEST_NOT_FOUND" }, { status: 404 });
  }

  if (body.name != null) guest.name = String(body.name).trim();
  if (body.phone != null) guest.phone = normalizeGuestPhone(body.phone);
  if (body.tableNumber !== undefined) {
    const table = tableFields(parseTableNumber(body.tableNumber));
    guest.tableNumber = table.tableNumber;
    guest.tableName = table.tableName;
    guest.tableId = table.tableId;
  }
  if (body.isAdult !== undefined) guest.isAdult = parseAdultFlag(body.isAdult, true);
  await guest.save();

  await WeddingChallengeGuest.updateOne(
    { eventId, guestId },
    {
      $set: {
        tableId: guest.tableId,
        isAdult: guest.isAdult !== false,
        token: guest.token,
      },
    }
  );

  return NextResponse.json({
    success: true,
    guest: serializeGuest(guest, requestOrigin(req)),
  });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const eventId = String(url.searchParams.get("eventId") || "").trim();
  const guestId = String(url.searchParams.get("guestId") || "").trim();
  if (!eventId || !guestId) {
    return NextResponse.json({ success: false, error: "GUEST_ID_REQUIRED" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  await db();
  const context = await loadEventChallengeContext(eventId);
  if (!context?.invitation) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  const guest = await InvitationGuest.findOneAndDelete({
    _id: guestId,
    invitationId: context.invitation._id,
  });
  if (!guest) {
    return NextResponse.json({ success: false, error: "GUEST_NOT_FOUND" }, { status: 404 });
  }

  await Promise.all([
    Invitation.updateOne({ _id: context.invitation._id }, { $pull: { guests: guest._id } }),
    WeddingChallengeGuest.deleteOne({ eventId, guestId }),
  ]);

  return NextResponse.json({ success: true });
}
