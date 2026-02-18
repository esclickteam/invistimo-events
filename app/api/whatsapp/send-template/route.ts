import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import "@/models/Event";
import { sendRsvpTemplateMedia } from "@/lib/whatsapp/sendRsvpTemplateMedia";
import { sendTableNumberTemplate } from "@/lib/whatsapp/sendTableNumberTemplate";
import { sendThankYouTemplate } from "@/lib/whatsapp/sendThankYouTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= CONFIG ================= */

const BATCH_SIZE = 5;    // כמות הודעות בכל באצ'
const DELAY_MS = 3000;  // השהיה בין באצ'ים (במילישניות)

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ================= TYPES ================= */

type TemplateName =
  | "rsvp_invitation_media"
  | "rsvp_reminder_invistimo"
  | "table_number_update_invistimo"
  | "table_number_update_with_gift"
  | "thank_you_message";

type SendTemplateRequestBody = {
  invitationId?: string;
  audience?: string[];
  to?: string;
  templateName?: TemplateName;
  languageCode?: string;
  name?: string;
  tableName?: string;
  eventType?: string;
  urlSuffix?: string;
  giftCreditUrl?: string;
};

/* ================= HELPERS ================= */

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function safeTrim(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isTemplateName(value: unknown): value is TemplateName {
  return (
    value === "rsvp_invitation_media" ||
    value === "rsvp_reminder_invistimo" ||
    value === "table_number_update_invistimo" ||
    value === "table_number_update_with_gift" ||
    value === "thank_you_message"
  );
}

/* ================= ROUTE ================= */

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SendTemplateRequestBody>;

    if (!isTemplateName(body.templateName)) {
      return NextResponse.json(
        { success: false, error: "INVALID_TEMPLATE" },
        { status: 400 }
      );
    }

    const templateName = body.templateName;
    const languageCode = safeTrim(body.languageCode) || "he";

    await db();

    /* =====================================================
       RSVP – BULK WHATSAPP (SAFE + RATE LIMITED)
    ===================================================== */

    if (
      templateName === "rsvp_invitation_media" ||
      templateName === "rsvp_reminder_invistimo"
    ) {
      if (
        !isNonEmptyString(body.invitationId) ||
        !Array.isArray(body.audience) ||
        body.audience.length === 0
      ) {
        return NextResponse.json(
          { success: false, error: "MISSING_PARAMS" },
          { status: 400 }
        );
      }

      const invitation = await Invitation.findById(body.invitationId)
        .populate("eventId")
        .lean();

      if (!invitation || !invitation.eventId) {
        return NextResponse.json(
          { success: false, error: "INV_NOT_FOUND" },
          { status: 404 }
        );
      }

      const event = invitation.eventId as any;

      let round: 1 | 2;

      if (templateName === "rsvp_invitation_media") {
        round = 1;
        if (invitation.rsvpRound1SentAt) {
          return NextResponse.json(
            { success: false, error: "RSVP_ROUND1_ALREADY_SENT" },
            { status: 409 }
          );
        }
      } else {
        round = 2;
        if (!invitation.rsvpRound1SentAt) {
          return NextResponse.json(
            { success: false, error: "ROUND1_NOT_SENT_YET" },
            { status: 400 }
          );
        }
        if (invitation.rsvpRound2SentAt) {
          return NextResponse.json(
            { success: false, error: "RSVP_ROUND2_ALREADY_SENT" },
            { status: 409 }
          );
        }
      }

      // ⛔ לא שולחים שוב למי שכבר קיבל
      const guests = await InvitationGuest.find({
        invitationId: invitation._id,
        _id: { $in: body.audience },
        rsvpSentAt: { $exists: false },
      }).lean();

      let sent = 0;
      let rateLimited = false;

      // ✅ שליחה מדורגת ובטוחה
      try {
        for (let i = 0; i < guests.length; i += BATCH_SIZE) {
          const batch = guests.slice(i, i + BATCH_SIZE);

          await Promise.allSettled(
            batch.map(async (guest) => {
              if (!guest.phone || !guest.token) return;

              try {
                const phone = guest.phone.startsWith("972")
                  ? guest.phone
                  : `972${guest.phone.replace(/^0/, "")}`;

                const rsvpLink = `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;

                await sendRsvpTemplateMedia({
                  to: phone,
                  eventTitle: event.title,
                  eventDate: event.date,
                  eventLocation:
                    event.location?.address || event.location?.name || "",
                  rsvpLink,
                  headerImageUrl:
                    invitation.headerImageUrl || invitation.previewImage,
                  templateName,
                  languageCode,
                });

                sent++;

                // מסמנים על האורח שנשלח
                await InvitationGuest.updateOne(
                  { _id: guest._id },
                  { $set: { rsvpSentAt: new Date() } }
                );
              } catch (err: any) {
                const msg = err?.message || "";
                console.error("❌ Failed sending RSVP:", msg);

                // 🚨 חסימת ספאם – עוצרים הכול
                if (msg.includes("131048") || msg.includes("Spam Rate limit")) {
                  rateLimited = true;
                  throw new Error("WHATSAPP_RATE_LIMITED");
                }
              }
            })
          );

          if (i + BATCH_SIZE < guests.length) {
            await sleep(DELAY_MS);
          }
        }
      } catch (e) {
        console.warn("⛔ WhatsApp rate limited – stopping send");
      }

      // ❗ מסמנים סבב רק אם לא הייתה חסימה
      if (sent > 0 && !rateLimited) {
        await Invitation.updateOne(
          { _id: invitation._id },
          {
            $set:
              round === 1
                ? { rsvpRound1SentAt: new Date() }
                : { rsvpRound2SentAt: new Date() },
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          sent,
          round,
          rateLimited,
        },
        { status: 200 }
      );
    }

    /* =====================================================
       TABLE NUMBER
    ===================================================== */

    if (
      templateName === "table_number_update_invistimo" ||
      templateName === "table_number_update_with_gift"
    ) {
      if (
        !isNonEmptyString(body.to) ||
        !isNonEmptyString(body.name) ||
        !isNonEmptyString(body.tableName) ||
        !isNonEmptyString(body.eventType) ||
        !isNonEmptyString(body.urlSuffix)
      ) {
        return NextResponse.json(
          { success: false, error: "MISSING_TABLE_FIELDS" },
          { status: 400 }
        );
      }

      const providerResponse = await sendTableNumberTemplate({
        to: body.to,
        name: body.name,
        tableName: body.tableName,
        eventType: body.eventType,
        urlSuffix: body.urlSuffix,
        giftCreditUrl: body.giftCreditUrl,
        templateName,
        languageCode,
      });

      return NextResponse.json({ success: true, providerResponse });
    }

    /* =====================================================
       THANK YOU
    ===================================================== */

    if (templateName === "thank_you_message") {
      if (!isNonEmptyString(body.to) || !isNonEmptyString(body.name)) {
        return NextResponse.json(
          { success: false, error: "MISSING_FIELDS" },
          { status: 400 }
        );
      }

       const providerResponse = await sendThankYouTemplate({
        to: body.to,
        name: body.name,
        templateName,
        languageCode,
      });

      return NextResponse.json({ success: true, providerResponse });
    }

    return NextResponse.json(
      { success: false, error: "UNHANDLED_TEMPLATE" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("❌ WHATSAPP SEND ERROR:", error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || "SEND_FAILED" },
      { status: 500 }
    );
  }
}
