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
          const wamid = status.id;
          const state = status.status;
          const timestamp = status.timestamp
            ? new Date(Number(status.timestamp) * 1000)
            : new Date();

          const phone = status?.recipient_id ?? null;

          console.log("📦 Status Update:", {
            wamid,
            state,
            phone,
            timestamp,
            errors: status?.errors ?? null,
          });

          if (!wamid || !state) continue;

          if (state === "sent") {
            console.log("✅ SENT:", wamid);
          }

          if (state === "delivered" || state === "read") {
            console.log("📬 DELIVERED/READ:", wamid);

            await WhatsappQueue.updateOne(
              { wamid },
              {
                $set: {
                  status: "delivered",
                  deliveredAt: timestamp,
                },
              }
            );
          }

          if (state === "failed") {
            const errorCode =
              status?.errors?.[0]?.code ??
              status?.errors?.[0]?.error_code ??
              null;

            const errorMessage =
              status?.errors?.[0]?.title ??
              status?.errors?.[0]?.message ??
              null;

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
                  errorCode,
                  errorMessage,
                  failedAt: timestamp,
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
    return NextResponse.json({ ok: true });
  }
}