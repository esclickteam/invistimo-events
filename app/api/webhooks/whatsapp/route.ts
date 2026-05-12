import { NextResponse } from "next/server";
import db from "@/lib/db";
import WhatsappQueue from "@/models/WhatsappQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("📩 WhatsApp Webhook RAW BODY:");
    console.dir(body, { depth: null });

    await db();

    const entries = body?.entry ?? [];

    for (const entry of entries) {
      const changes = entry?.changes ?? [];

      for (const change of changes) {
        const statuses = change?.value?.statuses ?? [];

        for (const status of statuses) {
          const wamid = status?.id;
          const state = status?.status;

          const timestamp = status?.timestamp
            ? new Date(Number(status.timestamp) * 1000)
            : new Date();

          const phone = status?.recipient_id ?? null;

          const errorCode =
            status?.errors?.[0]?.code ??
            status?.errors?.[0]?.error_code ??
            null;

          const errorMessage =
            status?.errors?.[0]?.title ??
            status?.errors?.[0]?.message ??
            status?.errors?.[0]?.error_data?.details ??
            null;

          console.log("📦 WhatsApp Status Update:", {
            wamid,
            state,
            phone,
            timestamp,
            errors: status?.errors ?? null,
          });

          if (!wamid || !state) continue;

          /**
           * חשוב:
           * status במודל נשאר אחד מ:
           * pending / scheduled / sending / sent / failed / cancelled
           *
           * delivered/read נשמרים כשדות מידע,
           * לא כ-status, כדי לא לשבור את enum של WhatsappQueue.
           */

          if (state === "sent") {
            console.log("✅ SENT:", wamid);

            await WhatsappQueue.updateOne(
              { wamid },
              {
                $set: {
                  status: "sent",
                  sentAt: timestamp,
                  providerStatus: "sent",
                  lastError: null,
                  errorCode: null,
                  errorMessage: null,
                },
              }
            );
          }

          if (state === "delivered") {
            console.log("📬 DELIVERED:", wamid);

            await WhatsappQueue.updateOne(
              { wamid },
              {
                $set: {
                  /**
                   * לא להפוך status ל-delivered.
                   * משאירים sent כדי לא לשבור enum ולוגיקות קיימות.
                   */
                  status: "sent",
                  deliveredAt: timestamp,
                  providerStatus: "delivered",
                  lastError: null,
                  errorCode: null,
                  errorMessage: null,
                },
              }
            );
          }

          if (state === "read") {
            console.log("👀 READ:", wamid);

            await WhatsappQueue.updateOne(
              { wamid },
              {
                $set: {
                  status: "sent",
                  readAt: timestamp,
                  providerStatus: "read",
                  lastError: null,
                  errorCode: null,
                  errorMessage: null,
                },
              }
            );
          }

          if (state === "failed") {
            console.error("❌ FAILED MESSAGE:", {
              wamid,
              phone,
              errorCode,
              errorMessage,
            });

            await WhatsappQueue.updateOne(
              { wamid },
              {
                $set: {
                  status: "failed",
                  failedAt: timestamp,
                  providerStatus: "failed",
                  lastError: errorMessage || "WHATSAPP_MESSAGE_FAILED",
                  errorCode,
                  errorMessage,
                  failReason: {
                    code: errorCode,
                    message: errorMessage,
                    raw: status?.errors?.[0] ?? status?.errors ?? null,
                  },
                  lockedAt: null,
                  lockedBy: null,
                },
              }
            );
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ WhatsApp Webhook error", err);

    /**
     * חשוב להחזיר ok:true כדי שמטא לא תמשיך לנסות בלי סוף
     * על שגיאה פנימית זמנית אצלנו.
     */
    return NextResponse.json({ ok: true });
  }
}