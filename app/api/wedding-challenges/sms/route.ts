import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import { requireWeddingChallenges } from "@/lib/guards/requireWeddingChallenges";
import { sendSMS } from "@/lib/sendSMS";
import { shortenUrl } from "@/lib/shortenUrl";
import { assertExternalSendAllowed } from "@/lib/env/externalSends";
import { DEFAULT_PUBLIC_ORIGIN } from "@/lib/guestInviteUrl";
import { LIVE_PATH_PREFIX } from "@/lib/weddingChallenges/constants";
import { loadEventChallengeContext } from "@/lib/weddingChallenges/service";
import { buildWeddingChallengesSms, coupleNamesFromTitle } from "@/lib/weddingChallenges/sms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function countBusinessSms(text: string) {
  const length = [...text].length;
  if (length <= 200) return 1;
  if (length <= 320) return 2;
  return 3;
}

export async function GET(req: Request) {
  const eventId = String(new URL(req.url).searchParams.get("eventId") || "").trim();
  if (!eventId) {
    return NextResponse.json({ success: false, error: "EVENT_ID_REQUIRED" }, { status: 400 });
  }

  const gate = await requireWeddingChallenges({ eventId });
  if (!gate.ok) return gate.response;

  const context = await loadEventChallengeContext(eventId);
  if (!context?.invitation) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  const coupleNames = coupleNamesFromTitle(context.invitation?.title || context.event?.title);
  const sample = buildWeddingChallengesSms({
    coupleNames,
    personalLink: `${DEFAULT_PUBLIC_ORIGIN}${LIVE_PATH_PREFIX}/[personal_link]`,
    template: context.settings.sms.template,
  });

  const guests = await InvitationGuest.countDocuments({
    invitationId: context.invitation._id,
    phone: { $exists: true, $nin: ["", null] },
  });

  return NextResponse.json({
    success: true,
    coupleNames,
    template: context.settings.sms.template,
    preview: sample,
    guests,
    sentAt: context.settings.sms.sentAt,
    sentCount: context.settings.sms.sentCount,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
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

  const owner = await User.findById(context.event.userId);
  if (!owner) {
    return NextResponse.json({ success: false, error: "OWNER_NOT_FOUND" }, { status: 404 });
  }

  const guests = await InvitationGuest.find({
    invitationId: context.invitation._id,
    phone: { $exists: true, $nin: ["", null] },
    token: { $exists: true, $nin: ["", null] },
  })
    .select("name phone token")
    .lean();

  const coupleNames = coupleNamesFromTitle(context.invitation?.title || context.event?.title);
  const remaining = Math.max(
    Number(owner.maxMessages || 0) - Number(owner.smsUsed || 0),
    0
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let partsUsed = 0;

  for (const guest of guests) {
    const phone = String(guest.phone || "").trim();
    if (!phone) {
      skipped += 1;
      continue;
    }

    const personalLink = await shortenUrl(
      `${DEFAULT_PUBLIC_ORIGIN}${LIVE_PATH_PREFIX}/${guest.token}`
    );
    const message = buildWeddingChallengesSms({
      coupleNames,
      personalLink,
      template: context.settings.sms.template,
    });
    const parts = countBusinessSms(message);

    if (remaining - partsUsed < parts) {
      failed += 1;
      continue;
    }

    const allowed = assertExternalSendAllowed({ channel: "sms", to: phone });
    if (!allowed.allowed) {
      skipped += 1;
      continue;
    }

    try {
      await sendSMS({ to: phone, message });
      sent += 1;
      partsUsed += parts;
    } catch {
      failed += 1;
    }
  }

  if (partsUsed > 0) {
    await User.updateOne({ _id: owner._id }, { $inc: { smsUsed: partsUsed } });
  }

  context.config.settings.sms.sentAt = new Date();
  context.config.settings.sms.sentCount = sent;
  await context.config.save();

  return NextResponse.json({
    success: true,
    sent,
    failed,
    skipped,
    total: guests.length,
  });
}
