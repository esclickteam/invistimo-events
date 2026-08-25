import mongoose from "mongoose";
import Event from "@/models/Event";
import VenueEvent from "@/models/VenueEvent";

export type SyncDestructiveWarning = {
  code:
    | "TABLE_REMOVED_WITH_GUESTS"
    | "CAPACITY_BELOW_SEATED"
    | "MAJOR_LAYOUT_CHANGE";
  tableId?: string;
  tableName?: string;
  seatedCount?: number;
  capacity?: number;
  message: string;
};

export type SyncResult = {
  seatingDocsUpdated: number;
  eventsTagged: number;
  venueEventsTagged: number;
  warnings: SyncDestructiveWarning[];
  blocked: boolean;
  applied: boolean;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function asObjectId(value: unknown) {
  const raw = clean(value);
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

function tableIdOf(table: any) {
  return clean(table?.id || table?._id);
}

function getSeatCount(table: any): number {
  if (Array.isArray(table?.seats)) return table.seats.length;
  const fromSeats = Number(table?.seats);
  if (Number.isFinite(fromSeats) && fromSeats > 0) return Math.floor(fromSeats);
  const fromCapacity = Number(table?.capacity);
  if (Number.isFinite(fromCapacity) && fromCapacity > 0) {
    return Math.floor(fromCapacity);
  }
  return 0;
}

function extractSeatedGuests(table: any): any[] {
  if (Array.isArray(table?.seatedGuests) && table.seatedGuests.length) {
    return table.seatedGuests
      .map((seat: any, idx: number) => {
        const guestId = clean(seat?.guestId || seat?._id || seat?.id);
        if (!guestId) return null;
        const seatIndex = Number(seat?.seatIndex);
        return {
          guestId,
          seatIndex: Number.isFinite(seatIndex) ? seatIndex : idx,
          arrived: Boolean(seat?.arrived),
          isVirtual: Boolean(seat?.isVirtual),
          guestName: seat?.guestName || seat?.name || undefined,
        };
      })
      .filter(Boolean);
  }

  // Legacy template seat-array format → seatedGuests
  if (Array.isArray(table?.seats)) {
    const out: any[] = [];
    table.seats.forEach((seat: any, idx: number) => {
      const guestId = clean(
        seat?.guestId || seat?.guest?.id || seat?.guest?._id
      );
      if (!guestId && !seat?.occupied && !seat?.guest) return;
      if (!guestId) return;
      out.push({
        guestId,
        seatIndex: idx,
        arrived: Boolean(seat?.arrived),
        guestName: seat?.guestName || seat?.guest?.name || undefined,
      });
    });
    return out;
  }

  return [];
}

/**
 * Convert venue-template / legacy table shapes into the client SeatingTable
 * document format used by /dashboard/seating (seats:number + seatedGuests[]).
 */
export function toClientSeatingTable(table: any, seatedGuests?: any[]) {
  const id = tableIdOf(table) || `table-${Math.random().toString(36).slice(2, 9)}`;
  const seats = getSeatCount(table);
  const guests = Array.isArray(seatedGuests)
    ? seatedGuests
    : extractSeatedGuests(table);

  // Drop assignments that no longer fit the capacity
  const cappedGuests = guests.filter((g) => {
    const idx = Number(g?.seatIndex);
    return Number.isFinite(idx) && idx >= 0 && idx < seats;
  });

  return {
    id,
    name: clean(table?.name) || "שולחן",
    type: clean(table?.type || table?.shape) || "round",
    group: table?.group ?? null,
    seats,
    capacity: seats,
    x: Number(table?.x) || 0,
    y: Number(table?.y) || 0,
    rotation: Number(table?.rotation) || 0,
    width: Number(table?.width) || 120,
    height: Number(table?.height) || 120,
    radius: Number(table?.radius) || 60,
    color: clean(table?.color) || "#ffffff",
    locked: Boolean(table?.locked),
    reserved: Boolean(table?.reserved),
    reserveLabel: clean(table?.reserveLabel || table?.reservedLabel),
    seatedGuests: cappedGuests,
  };
}

export function toClientSeatingTables(tables: any[]) {
  return (Array.isArray(tables) ? tables : []).map((t) =>
    toClientSeatingTable(t)
  );
}

/**
 * Analyze destructive template → linked seating changes.
 */
export function analyzeDestructiveSync(
  existingTables: any[],
  nextTemplateTables: any[]
): SyncDestructiveWarning[] {
  const warnings: SyncDestructiveWarning[] = [];
  const nextById = new Map(
    toClientSeatingTables(nextTemplateTables).map((t) => [t.id, t])
  );

  let removedWithGuests = 0;
  let totalExistingGuests = 0;
  let preservedGuests = 0;

  for (const table of existingTables || []) {
    const id = tableIdOf(table);
    const seated = extractSeatedGuests(table);
    totalExistingGuests += seated.length;
    if (!id) continue;

    const next = nextById.get(id);
    if (!next) {
      if (seated.length > 0) {
        removedWithGuests += 1;
        warnings.push({
          code: "TABLE_REMOVED_WITH_GUESTS",
          tableId: id,
          tableName: clean(table?.name),
          seatedCount: seated.length,
          message: `מחיקת שולחן "${clean(table?.name) || id}" תשובץ ${seated.length} אורחים ללא שולחן`,
        });
      }
      continue;
    }

    preservedGuests += seated.filter((g) => {
      const idx = Number(g?.seatIndex);
      return Number.isFinite(idx) && idx >= 0 && idx < next.seats;
    }).length;

    if (seated.length > next.seats) {
      warnings.push({
        code: "CAPACITY_BELOW_SEATED",
        tableId: id,
        tableName: clean(next.name || table?.name),
        seatedCount: seated.length,
        capacity: next.seats,
        message: `קיבולת שולחן "${clean(next.name || table?.name)}" (${next.seats}) קטנה ממספר האורחים המשובצים (${seated.length})`,
      });
    }
  }

  if (
    totalExistingGuests > 0 &&
    removedWithGuests === 0 &&
    preservedGuests < totalExistingGuests * 0.5
  ) {
    warnings.push({
      code: "MAJOR_LAYOUT_CHANGE",
      seatedCount: totalExistingGuests,
      message:
        "שינוי משמעותי בתבנית עלול לאבד חלק גדול מהושבת האורחים הקיימת",
    });
  }

  return warnings;
}

/**
 * Keep guest seat assignments when table ids still exist on the new layout.
 * Always emits client seating format (seats:number + seatedGuests[]).
 */
export function mergeGuestAssignments(existingTables: any[], nextTables: any[]) {
  const guestsByTable = new Map<string, any[]>();

  for (const table of existingTables || []) {
    const id = tableIdOf(table);
    if (!id) continue;
    const seated = extractSeatedGuests(table);
    if (seated.length) guestsByTable.set(id, seated);
  }

  return toClientSeatingTables(nextTables).map((table) => {
    const prev = guestsByTable.get(table.id) || [];
    return toClientSeatingTable(table, prev);
  });
}

/**
 * Propagate a venue seating template into every linked client seating layout
 * and mark linked Events / VenueEvents so UIs can refresh live.
 *
 * Rules:
 * - Never invents Events
 * - Converts template geometry to client seating format
 * - Preserves seatedGuests when table ids match
 * - Blocks destructive deletes/capacity shrink unless confirmDestructive
 * - Idempotent upsert by sourceTemplateId / event selection
 */
export async function syncSeatingTemplateToLinkedEvents(input: {
  template: any;
  hallId: string;
  ownerId: string;
  confirmDestructive?: boolean;
}): Promise<SyncResult> {
  const empty: SyncResult = {
    seatingDocsUpdated: 0,
    eventsTagged: 0,
    venueEventsTagged: 0,
    warnings: [],
    blocked: false,
    applied: false,
  };

  const templateId = asObjectId(input.template?._id || input.template?.id);
  const hallId = clean(input.hallId);
  const ownerId = asObjectId(input.ownerId);

  if (!templateId || !hallId || !ownerId) {
    return empty;
  }

  const db = mongoose.connection?.db;
  if (!db) {
    return empty;
  }

  const seatingTables = db.collection("seatingtables");
  const canvas = input.template?.canvas || {};
  const tables = Array.isArray(input.template?.tables)
    ? input.template.tables
    : [];
  const clientTables = toClientSeatingTables(tables);
  const now = new Date();
  const templateUpdatedAt =
    input.template?.updatedAt instanceof Date
      ? input.template.updatedAt
      : now;

  // Collect warnings across linked docs before writing
  const existingByTemplate = await seatingTables
    .find({
      source: "venue_seating_template",
      sourceTemplateId: { $in: [templateId, String(templateId)] },
    })
    .toArray();

  const selectedEvents = await Event.find({
    venueOwnerId: ownerId,
    venueHallId: hallId,
    venueAccessStatus: "linked",
    $or: [
      { venueClientSelectedSeatingTemplateId: templateId },
      { venueClientSelectedSeatingTemplateId: String(templateId) },
    ],
  })
    .select("_id userId venueOwnerId venueHallId venueHallName")
    .lean();

  const warnings: SyncDestructiveWarning[] = [];
  for (const doc of existingByTemplate) {
    warnings.push(
      ...analyzeDestructiveSync(
        Array.isArray(doc.tables) ? doc.tables : [],
        tables
      )
    );
  }
  for (const event of selectedEvents as any[]) {
    const existing = await seatingTables.findOne({ eventId: event._id });
    if (existing) {
      warnings.push(
        ...analyzeDestructiveSync(
          Array.isArray(existing.tables) ? existing.tables : [],
          tables
        )
      );
    }
  }

  // Deduplicate warnings by code+tableId
  const seen = new Set<string>();
  const uniqueWarnings = warnings.filter((w) => {
    const key = `${w.code}:${w.tableId || ""}:${w.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const blocking = uniqueWarnings.some(
    (w) =>
      w.code === "TABLE_REMOVED_WITH_GUESTS" ||
      w.code === "CAPACITY_BELOW_SEATED"
  );

  if (blocking && !input.confirmDestructive) {
    return {
      ...empty,
      warnings: uniqueWarnings,
      blocked: true,
      applied: false,
    };
  }

  let seatingDocsUpdated = 0;

  // 1) Update seating docs already materialised from this template
  for (const doc of existingByTemplate) {
    const mergedTables = mergeGuestAssignments(
      Array.isArray(doc.tables) ? doc.tables : [],
      tables
    );

    await seatingTables.updateOne(
      { _id: doc._id },
      {
        $set: {
          tables: mergedTables,
          background: canvas.background || null,
          canvasView: canvas.canvasView || null,
          zones: Array.isArray(canvas.zones) ? canvas.zones : [],
          sourceTemplateUpdatedAt: templateUpdatedAt,
          venueHallId: hallId,
          updatedAt: now,
        },
      }
    );
    seatingDocsUpdated += 1;
  }

  // 2) Events that selected this template — ensure seating exists
  for (const event of selectedEvents as any[]) {
    const eventId = event._id;
    const existing = await seatingTables.findOne({ eventId });
    if (existing) {
      const mergedTables = mergeGuestAssignments(
        Array.isArray(existing.tables) ? existing.tables : [],
        tables
      );
      await seatingTables.updateOne(
        { _id: existing._id },
        {
          $set: {
            tables: mergedTables,
            background: canvas.background || null,
            canvasView: canvas.canvasView || null,
            zones: Array.isArray(canvas.zones) ? canvas.zones : [],
            source: "venue_seating_template",
            sourceTemplateId: templateId,
            sourceTemplateUpdatedAt: templateUpdatedAt,
            venueOwnerId: ownerId,
            venueHallId: hallId,
            venueHallName: clean(event.venueHallName),
            updatedAt: now,
          },
        }
      );
      seatingDocsUpdated += 1;
    } else {
      await seatingTables.insertOne({
        eventId,
        userId: event.userId || null,
        venueOwnerId: ownerId,
        venueHallId: hallId,
        venueHallName: clean(event.venueHallName),
        source: "venue_seating_template",
        sourceTemplateId: templateId,
        sourceTemplateUpdatedAt: templateUpdatedAt,
        tables: clientTables,
        background: canvas.background || null,
        canvasView: canvas.canvasView || null,
        zones: Array.isArray(canvas.zones) ? canvas.zones : [],
        createdAt: now,
        updatedAt: now,
      });
      seatingDocsUpdated += 1;
    }
  }

  // 3) Tag Event + VenueEvent for live clients (version bump)
  const eventsTagged = await Event.updateMany(
    {
      venueOwnerId: ownerId,
      venueHallId: hallId,
      $or: [
        { venueClientSelectedSeatingTemplateId: templateId },
        { venueClientSelectedSeatingTemplateId: String(templateId) },
      ],
    },
    {
      $set: {
        venueSeatingTemplateSyncedAt: now,
        venueClientSelectedSeatingTemplateName: clean(input.template?.name),
        updatedAt: now,
      },
    }
  );

  const venueEventsTagged = await VenueEvent.updateMany(
    {
      ownerId,
      hallId,
      $or: [
        { selectedSeatingTemplateId: templateId },
        { selectedSeatingTemplateId: String(templateId) },
        { linkedEventId: { $in: selectedEvents.map((e: any) => e._id) } },
      ],
    },
    {
      $set: {
        selectedSeatingTemplateId: templateId,
        seatingTemplateSyncedAt: now,
        updatedAt: now,
      },
    }
  );

  return {
    seatingDocsUpdated,
    eventsTagged: Number((eventsTagged as any)?.modifiedCount || 0),
    venueEventsTagged: Number((venueEventsTagged as any)?.modifiedCount || 0),
    warnings: uniqueWarnings,
    blocked: false,
    applied: true,
  };
}
