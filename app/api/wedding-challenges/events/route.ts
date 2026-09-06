import { NextResponse } from "next/server";
import db from "@/lib/db";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import WeddingChallengeConfig from "@/models/WeddingChallengeConfig";
import { requireWeddingChallenges } from "@/lib/guards/requireWeddingChallenges";
import { inferWeddingChallengesSourceType } from "@/lib/weddingChallenges/sourceType";
import {
  activateExistingEventForWeddingChallenges,
  createStandaloneWeddingChallengesEvent,
} from "@/lib/weddingChallenges/standaloneEvent";
import { coupleNamesFromTitle } from "@/lib/weddingChallenges/sms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const gate = await requireWeddingChallenges();
  if (!gate.ok) return gate.response;

  await db();

  const events = await Event.find({
    status: { $ne: "archived" },
    $or: [{ userId: gate.userId }, { producerId: gate.userId }],
  })
    .select("title date time productType userId")
    .sort({ updatedAt: -1 })
    .lean();

  const eventIds = events.map((event) => event._id);
  const [configs, invitations] = await Promise.all([
    WeddingChallengeConfig.find({ eventId: { $in: eventIds } })
      .select("eventId sourceType settings.enabled settings.startAt settings.endAt invitationId")
      .lean(),
    Invitation.find({ eventId: { $in: eventIds } })
      .select("eventId title standaloneGame")
      .lean(),
  ]);

  const configByEvent = new Map(configs.map((row) => [String(row.eventId), row]));
  const invitationByEvent = new Map(
    invitations.map((row) => [String(row.eventId), row])
  );

  const games = [];
  const attachable = [];

  for (const event of events) {
    const eventId = String(event._id);
    const invitation = invitationByEvent.get(eventId);
    const config = configByEvent.get(eventId);
    const sourceType = inferWeddingChallengesSourceType({
      sourceType: config?.sourceType,
      eventProductType: event.productType,
      standaloneGame: invitation?.standaloneGame,
    });
    const coupleNames = coupleNamesFromTitle(invitation?.title || event.title);
    const summary = {
      eventId,
      coupleNames,
      eventDate: event.date || "",
      eventTime: event.time || "",
      sourceType,
      enabled: Boolean(config?.settings?.enabled),
      hasGame: Boolean(config),
    };

    if (config) {
      games.push(summary);
    } else if (event.productType !== "wedding_challenges") {
      attachable.push(summary);
    } else {
      games.push(summary);
    }
  }

  return NextResponse.json({
    success: true,
    games,
    attachableEvents: attachable,
  });
}

export async function POST(req: Request) {
  const gate = await requireWeddingChallenges();
  if (!gate.ok) return gate.response;

  await db();
  const body = await req.json().catch(() => ({}));
  const existingEventId = String(body.existingEventId || body.eventId || "").trim();

  try {
    if (existingEventId) {
      const event = await Event.findById(existingEventId).select("userId producerId productType").lean();
      if (!event) {
        return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
      }
      const owns =
        gate.privileged ||
        String(event.userId) === String(gate.userId) ||
        String(event.producerId || "") === String(gate.userId);
      if (!owns) {
        return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
      }

      const activated = await activateExistingEventForWeddingChallenges({
        eventId: existingEventId,
        ownerUserId: String(event.userId),
        startAt: body.startAt || null,
        endAt: body.endAt || null,
      });

      return NextResponse.json({
        success: true,
        eventId: String(activated.event._id),
        sourceType: activated.sourceType,
        created: false,
      });
    }

    const created = await createStandaloneWeddingChallengesEvent({
      ownerUserId: String(gate.userId),
      coupleNames: String(body.coupleNames || "").trim(),
      eventDate: String(body.eventDate || "").trim(),
      startAt: body.startAt || null,
      endAt: body.endAt || null,
    });

    return NextResponse.json(
      {
        success: true,
        eventId: String(created.event._id),
        sourceType: created.sourceType,
        created: true,
      },
      { status: 201 }
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "CREATE_FAILED";
    const status =
      code === "COUPLE_NAMES_REQUIRED" ||
      code === "EVENT_DATE_REQUIRED" ||
      code.includes("800")
        ? 400
        : code === "EVENT_NOT_FOUND" || code === "INVITATION_NOT_FOUND" || code === "USER_NOT_FOUND"
          ? 404
          : 500;
    return NextResponse.json({ success: false, error: code, message: code }, { status });
  }
}
