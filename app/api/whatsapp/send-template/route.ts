import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import "@/models/Event";
import WhatsappQueue from "@/models/WhatsappQueue";

import { sendTableNumberTemplate } from "@/lib/whatsapp/sendTableNumberTemplate";
import { sendThankYouTemplate } from "@/lib/whatsapp/sendThankYouTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function runTransactionWithRetry<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
  retries = 3
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < retries; i++) {
    const session = await mongoose.startSession();

    try {
      let result!: T;

      await session.withTransaction(async () => {
        result = await fn(session);
      });

      session.endSession();
      return result;
    } catch (err: any) {
      session.endSession();
      lastError = err;

      if (
        err?.message?.includes("catalog changes") ||
        err?.errorLabels?.includes("TransientTransactionError")
      ) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
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
       RSVP – ATOMIC QUEUE (NO ROUND MARKING HERE)
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

      const result = await runTransactionWithRetry(async (session) => {
        const invitation = await Invitation.findById(body.invitationId)
          .populate("eventId")
          .session(session);

        if (!invitation || !invitation.eventId) {
          throw new Error("INV_NOT_FOUND");
        }

        if (
          templateName === "rsvp_reminder_invistimo" &&
          !invitation.rsvpRound1SentAt
        ) {
          throw new Error("ROUND1_NOT_SENT_YET");
        }

        const guests = await InvitationGuest.find({
          invitationId: invitation._id,
          _id: { $in: body.audience },
        }).session(session);

        const queueDocs: any[] = [];

        for (const guest of guests) {
          if (!guest.phone || !guest.token) continue;

          const exists = await WhatsappQueue.findOne({
            invitationId: invitation._id,
            guestId: guest._id,
            templateName,
            status: { $in: ["pending", "sending", "sent"] },
          }).session(session);

          if (exists) continue;

          const phone = guest.phone.startsWith("972")
            ? guest.phone
            : `972${guest.phone.replace(/^0/, "")}`;

          const rsvpLink = `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;

          queueDocs.push({
            invitationId: invitation._id,
            guestId: guest._id,
            phone,
            templateName,
            payload: {
              rsvpLink,
              languageCode,
            },
            status: "pending",
          });
        }

        if (queueDocs.length === 0) {
          return { queued: 0 };
        }

        await WhatsappQueue.insertMany(queueDocs, { session });

        return { queued: queueDocs.length };
      });

      return NextResponse.json({
        success: true,
        queued: result.queued,
      });
    }

    /* =====================================================
       TABLE NUMBER – IMMEDIATE
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
       THANK YOU – IMMEDIATE
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