import { NextRequest, NextResponse } from "next/server";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import IvrSystemAudio from "@/models/IvrSystemAudio";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import { getIvrVoiceIdForGender } from "@/lib/calls/elevenlabs";
import { resolveIvrPublicAudioUrl } from "@/lib/calls/ivrAudioStorage";
import { buildIvrPreviewPlaylist } from "@/lib/calls/ivrPreviewPlaylist";
import {
  requireIvrSession,
  resolveIvrTargetUser,
} from "@/lib/calls/ivrRequestAuth";
import {
  globalPackAudioKey,
  normalizeIvrVoiceGender,
  type IvrGlobalPackSegmentKey,
  type IvrVoiceGender,
} from "@/lib/calls/ivrScript";
import { resolveSpokenIvrEventName } from "@/lib/calls/spokenEventName";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEGMENT_KEYS = [
  "introBeforeEventName",
  "introAfterEventName",
  "inboundBeforeEventName",
  "inboundAfterEventName",
  "afterPress1",
  "afterValidQuantity",
  "afterPress2Or3",
  "invalidInput",
  "invalidGuestCount",
] as const satisfies readonly IvrGlobalPackSegmentKey[];

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function clipUrl(row: { publicToken?: string; audioUrl?: string } | undefined) {
  if (!row) return "";
  return resolveIvrPublicAudioUrl({
    publicToken: row.publicToken,
    storedUrl: row.audioUrl,
  });
}

/**
 * Read the clips a sample call plays.
 * Does not synthesize, save config, dial, or write RSVP / call attempts.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireIvrSession(req);
    if ("error" in session) {
      return NextResponse.json(
        { ok: false, error: session.error },
        { status: session.status }
      );
    }

    const user = await resolveIvrTargetUser({
      sessionUser: session.user,
      isAdmin: session.isAdmin,
      requestedUserId: new URL(req.url).searchParams.get("userId"),
    });
    if (!user || !isIvrCallsUser(user)) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const invitation = await Invitation.findOne({ ownerId: user._id })
      .sort({ eventDate: 1, createdAt: -1 })
      .lean();
    let event: any = null;
    const eventId = (invitation as { eventId?: unknown } | null)?.eventId;
    if (eventId) event = await Event.findById(eventId).lean();
    if (!event) {
      event = await Event.findOne({ userId: user._id }).sort({ updatedAt: -1 }).lean();
    }

    const cfg = user.ivrConfig || {};
    const voiceGender: IvrVoiceGender =
      normalizeIvrVoiceGender(cfg.voiceGender) || "female";
    const voiceId =
      clean(cfg.voiceId) ||
      clean(cfg.systemVoiceId) ||
      getIvrVoiceIdForGender(voiceGender);
    const spokenName = resolveSpokenIvrEventName({ invitation, event });

    const packKeys = SEGMENT_KEYS.map((segment) =>
      globalPackAudioKey(voiceGender, segment)
    );
    const rows = await IvrSystemAudio.find({ key: { $in: packKeys } })
      .select("key audioUrl publicToken contentHash")
      .lean();
    const byKey = new Map(rows.map((row) => [String(row.key), row]));
    const segment = (name: IvrGlobalPackSegmentKey) =>
      byKey.get(globalPackAudioKey(voiceGender, name));

    const before = segment("introBeforeEventName");
    const after = segment("introAfterEventName");
    const inboundBefore = segment("inboundBeforeEventName");
    const inboundAfter = segment("inboundAfterEventName");
    const playlist = buildIvrPreviewPlaylist({
      spokenName,
      voiceGender,
      voiceId,
      cfg,
      composedUrl: resolveIvrPublicAudioUrl({
        publicToken: cfg.composedIntroAudio?.publicToken,
        storedUrl: cfg.composedIntroAudio?.audioUrl,
      }),
      eventNameUrl: resolveIvrPublicAudioUrl({
        publicToken: cfg.eventNameAudio?.publicToken,
        storedUrl: cfg.eventNameAudio?.audioUrl,
      }),
      beforeUrl: clipUrl(before),
      beforeHash: clean(before?.contentHash),
      afterUrl: clipUrl(after),
      afterHash: clean(after?.contentHash),
      inboundBeforeHash: clean(inboundBefore?.contentHash),
      inboundAfterHash: clean(inboundAfter?.contentHash),
      clips: {
        askCount: clipUrl(segment("afterPress1")),
        thanksYes: clipUrl(segment("afterValidQuantity")),
        thanksOther: clipUrl(segment("afterPress2Or3")),
        invalidChoice: clipUrl(segment("invalidInput")),
        invalidCount: clipUrl(segment("invalidGuestCount")),
      },
    });

    return NextResponse.json({
      ok: true,
      ready: playlist.ready,
      spokenName: playlist.spokenName,
      introUrls: playlist.introUrls,
      clips: playlist.clips,
      texts: playlist.texts,
      message: playlist.ready
        ? ""
        : "הקריינות לדוגמה עדיין לא זמינה. היא תוכן אוטומטית לפני השיחות.",
    });
  } catch (error) {
    console.error("[ivr/preview]", error);
    return NextResponse.json(
      { ok: false, error: "PREVIEW_UNAVAILABLE" },
      { status: 500 }
    );
  }
}
