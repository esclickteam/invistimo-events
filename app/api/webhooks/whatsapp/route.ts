import { NextResponse } from "next/server";
import db from "@/lib/db";
import WhatsappQueue from "@/models/WhatsappQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await db();

    const entries = body?.entry ?? [];

    for (const entry of entries) {
      const changes = entry?.changes ?? [];

      for (const change of changes) {
        const statuses = change?.value?.statuses ?? [];

        for (const status of statuses) {
          const wamid = status.id;
          const state = status.status; // sent | delivered | read | failed
          const timestamp = status.timestamp
            ? new Date(Number(status.timestamp) * 1000)
            : new Date();

          if (!wamid || !state) continue;

          if (state === "delivered" || state === "read") {
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

            await WhatsappQueue.updateOne(
              { wamid },
              {
                $set: {
                  status: "failed",
                  errorCode,
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
