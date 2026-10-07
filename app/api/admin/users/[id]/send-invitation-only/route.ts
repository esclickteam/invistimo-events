import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import WhatsappQueue from "@/models/WhatsappQueue";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { ensurePreRsvpInvitationGrant } from "@/lib/preRsvp/entitlement";
import {
  recordRoundDecisions,
  type RoundDecision,
} from "@/lib/whatsapp/roundDeliveryTracking";
import {
  filterGuestsByInvitationAudience,
  findGuestIdsWithInvitationSendAttempt,
  formatInvitationWhatsappDateParam,
  parseInvitationOnlyAudienceFilter,
  resolveInvitationImageUrl,
  buildInvitationLocationLabel,
  formatInvitationDisplayDate,
} from "@/lib/messages/invitationOnlyDetails";
import { getHighQualityCloudinaryImageUrl } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_INVITATION_TEMPLATE_NAME = "event_invitation_image_he";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.role === "super_admin" ||
    auth?.role === "superadmin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

function toObjectId(value: unknown) {
  const id = cleanString(value);
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function normalizeIsraeliPhone(value: unknown) {
  const raw = cleanString(value);
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";
  if (/^05\d{8}$/.test(digits)) return digits;
  if (/^9725\d{8}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^5\d{8}$/.test(digits)) return `0${digits}`;
  return digits;
}

function getGuestPhone(guest: any) {
  return normalizeIsraeliPhone(
    guest?.phone ||
      guest?.phoneNumber ||
      guest?.mobile ||
      guest?.whatsapp ||
      guest?.contactPhone ||
      ""
  );
}

/**
 * Admin-only: send invitation_only WhatsApp to a user's guests.
 * Does not open or mark RSVP rounds. Audience can be never_invited.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (!isAdminContext(auth)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id: userId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const audienceFilter = parseInvitationOnlyAudienceFilter(
      body?.filter || body?.audienceFilter
    );
    const invitationIdFromBody = cleanString(body?.invitationId);

    const user: any = await User.findById(userId)
      .select("_id email salesUpsells.preRsvpMessages")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Ensure invitation-only entitlement exists; admin send may open it.
    await ensurePreRsvpInvitationGrant(user);

    const invitationQuery = invitationIdFromBody
      ? { _id: invitationIdFromBody, ownerId: userId }
      : { ownerId: userId };

    const invitation: any = await Invitation.findOne(invitationQuery)
      .select(
        "_id ownerId title eventDate eventTime location preRsvpMedia headerImageUrl previewImageUrl imageUrl canvasImageUrl previewImage"
      )
      .sort({ updatedAt: -1 })
      .lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const invitationId = String(invitation._id);
    const imageUrl = getHighQualityCloudinaryImageUrl(
      resolveInvitationImageUrl(invitation)
    );

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "INVITATION_IMAGE_MISSING" },
        { status: 400 }
      );
    }

    const eventDate = formatInvitationDisplayDate(invitation.eventDate);
    const eventTime = cleanString(invitation.eventTime);
    const eventLocation = buildInvitationLocationLabel(invitation);
    const invitationTitle =
      cleanString(invitation.title) || "האירוע שלנו";
    const whatsappDate = formatInvitationWhatsappDateParam(
      invitation.eventDate,
      eventTime
    );

    if (!eventDate || !eventLocation) {
      return NextResponse.json(
        { success: false, error: "MISSING_EVENT_DETAILS" },
        { status: 400 }
      );
    }

    const templateVariables = {
      invitationTitle,
      eventDate,
      eventTime,
      eventLocation,
    };

    const whatsappPayload = {
      languageCode: "he",
      imageUrl,
      headerImageUrl: imageUrl,
      eventTitle: invitationTitle,
      eventDate: whatsappDate,
      eventLocation,
      templateVariables,
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: { link: imageUrl },
            },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: invitationTitle },
            { type: "text", text: whatsappDate },
            { type: "text", text: eventLocation },
          ],
        },
      ],
    };

    const guests = await InvitationGuest.find({
      invitationId: toObjectId(invitationId),
    })
      .select(
        "_id name guestsCount phone phoneNumber mobile whatsapp contactPhone"
      )
      .lean();

    let audienceGuests = guests;

    if (audienceFilter === "never_invited") {
      const alreadyInvited = await findGuestIdsWithInvitationSendAttempt(
        invitationId
      );
      audienceGuests = filterGuestsByInvitationAudience({
        guests,
        filter: "never_invited",
        alreadyInvitedGuestIds: alreadyInvited,
      });
    }

    const validGuests = audienceGuests
      .map((guest: any) => ({
        guest,
        phone: getGuestPhone(guest),
      }))
      .filter((item) => /^05\d{8}$/.test(item.phone));

    if (validGuests.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            audienceFilter === "never_invited"
              ? "NO_NEVER_INVITED_GUESTS"
              : "NO_VALID_PHONES",
          message:
            audienceFilter === "never_invited"
              ? "לא נמצאו אורחים שלא נשלחה אליהם הזמנה מהמערכת."
              : "לא נמצאו מספרי טלפון תקינים.",
        },
        { status: 400 }
      );
    }

    const decisionAt = new Date();
    const decisions: RoundDecision[] = [];
    const queueDocs = validGuests.map(({ guest, phone }) => {
      const guestId = String(guest._id);
      const idempotencyKey = [
        "whatsapp",
        "pre-rsvp",
        "invitation_only",
        "admin",
        invitationId,
        guestId,
        EVENT_INVITATION_TEMPLATE_NAME,
        Date.now(),
      ].join(":");

      return {
        invitationId: toObjectId(invitationId),
        guestId: toObjectId(guestId),
        scheduleId: null,
        channel: "whatsapp",
        type: "invitation_only",
        round: 1,
        roundNumber: 1,
        phone,
        templateName: EVENT_INVITATION_TEMPLATE_NAME,
        idempotencyKey,
        wamid: null,
        providerStatus: "",
        lockedAt: null,
        lockedBy: null,
        scheduledAt: null,
        payload: whatsappPayload,
        status: "pending",
        attempts: 0,
        maxAttempts: 1,
        lastAttemptAt: null,
        lastError: null,
        errorCode: null,
        errorMessage: null,
        failReason: { code: null, message: null, raw: null },
        sentAt: null,
        deliveredAt: null,
        readAt: null,
        failedAt: null,
        cancelledAt: null,
      };
    });

    let inserted: any[] = [];

    try {
      inserted = await WhatsappQueue.insertMany(queueDocs, { ordered: false });
    } catch (insertErr: any) {
      inserted = insertErr?.insertedDocs || [];
      if (!inserted.length) throw insertErr;
    }

    for (const doc of inserted) {
      const guest = validGuests.find(
        (item) => String(item.guest._id) === String(doc.guestId)
      );
      if (!guest) continue;
      decisions.push({
        invitationId,
        guest: { ...guest.guest, phone: guest.phone },
        type: "invitation_only",
        round: 1,
        source: "pre_rsvp",
        templateName: EVENT_INVITATION_TEMPLATE_NAME,
        at: decisionAt,
        outcome: {
          kind: "queued",
          queueId: doc._id,
          idempotencyKey: doc.idempotencyKey,
          phone: guest.phone,
        },
      });
    }

    await recordRoundDecisions(decisions);

    const now = new Date();
    await User.updateOne(
      { _id: toObjectId(userId) },
      {
        $set: {
          "salesUpsells.preRsvpMessages.enabled": true,
          "salesUpsells.preRsvpMessages.invitationOnlyEnabled": true,
          "salesUpsells.preRsvpMessages.invitationOnlySentAt": now,
          "salesUpsells.preRsvpMessages.sentAt": now,
          "salesUpsells.preRsvpMessages.updatedAt": now,
        },
        $inc: {
          "salesUpsells.preRsvpMessages.invitationOnlySentCount": 1,
          "salesUpsells.preRsvpMessages.sentCount": 1,
        },
      }
    );

    console.log("✅ ADMIN INVITATION-ONLY QUEUED:", {
      adminUserId: auth.userId,
      targetUserId: userId,
      invitationId,
      filter: audienceFilter,
      queued: inserted.length,
    });

    return NextResponse.json({
      success: true,
      message: "הזמנה בלבד נוספה לתור השליחה.",
      filter: audienceFilter,
      queuedCount: inserted.length,
      guestsCount: validGuests.length,
      invitationId,
      // Explicit: this path does not touch RSVP rounds.
      rsvpRoundsTouched: false,
    });
  } catch (err: any) {
    console.error("❌ ADMIN SEND INVITATION-ONLY ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId || !isAdminContext(auth)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { id: userId } = await context.params;
    const { searchParams } = new URL(req.url);
    const invitationIdFromQuery = cleanString(searchParams.get("invitationId"));

    const invitationQuery = invitationIdFromQuery
      ? { _id: invitationIdFromQuery, ownerId: userId }
      : { ownerId: userId };

    const invitation: any = await Invitation.findOne(invitationQuery)
      .select("_id")
      .sort({ updatedAt: -1 })
      .lean();

    if (!invitation) {
      return NextResponse.json({
        success: true,
        totalGuests: 0,
        neverInvitedCount: 0,
        alreadyInvitedCount: 0,
      });
    }

    const invitationId = String(invitation._id);
    const guests = await InvitationGuest.find({
      invitationId: toObjectId(invitationId),
    })
      .select("_id")
      .lean();

    const alreadyInvited = await findGuestIdsWithInvitationSendAttempt(
      invitationId
    );
    const neverInvited = filterGuestsByInvitationAudience({
      guests,
      filter: "never_invited",
      alreadyInvitedGuestIds: alreadyInvited,
    });

    return NextResponse.json({
      success: true,
      invitationId,
      totalGuests: guests.length,
      neverInvitedCount: neverInvited.length,
      alreadyInvitedCount: alreadyInvited.size,
    });
  } catch (err: any) {
    console.error("❌ ADMIN INVITATION-ONLY COUNTS ERROR:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
