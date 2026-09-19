import { NextRequest } from "next/server";

import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import { loadGuestPassByToken } from "@/lib/checkIn/loadGuestPass";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

function sseMessage(eventName: string, data: unknown) {
  return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseComment(comment: string) {
  return `: ${comment}\n\n`;
}

function fingerprint(pass: {
  checkedInGuestCount: number;
  confirmedGuestCount: number;
  tableLabel: string;
}) {
  return `${pass.checkedInGuestCount}:${pass.confirmedGuestCount}:${pass.tableLabel}`;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    await dbConnect();

    const initial = await loadGuestPassByToken(token);
    if (!initial) {
      return new Response("NOT_FOUND", { status: 404 });
    }

    const encoder = new TextEncoder();
    let closed = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let changeStream: any = null;
    let lastFingerprint = fingerprint(initial);

    const stream = new ReadableStream({
      async start(controller) {
        const send = (eventName: string, data: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(sseMessage(eventName, data)));
          } catch {
            closed = true;
          }
        };

        const sendComment = (comment: string) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(sseComment(comment)));
          } catch {
            closed = true;
          }
        };

        const pushSnapshot = async (force = false) => {
          const pass = await loadGuestPassByToken(token);
          if (!pass) return;
          const next = fingerprint(pass);
          if (!force && next === lastFingerprint) return;
          lastFingerprint = next;
          send("snapshot", pass);
        };

        const cleanup = async () => {
          if (closed) return;
          closed = true;
          if (heartbeat) clearInterval(heartbeat);
          if (poll) clearInterval(poll);
          heartbeat = null;
          poll = null;
          if (changeStream) {
            try {
              await changeStream.close();
            } catch {
              // ignore
            }
            changeStream = null;
          }
          try {
            controller.close();
          } catch {
            // ignore
          }
        };

        req.signal.addEventListener("abort", () => {
          void cleanup();
        });

        send("connected", { token: initial.token, connectedAt: new Date().toISOString() });
        send("snapshot", initial);

        heartbeat = setInterval(() => {
          sendComment(`heartbeat ${new Date().toISOString()}`);
        }, 25000);

        poll = setInterval(() => {
          void pushSnapshot(false);
        }, 2000);

        try {
          const guest = await InvitationGuest.findOne({ checkInToken: token })
            .select("_id")
            .lean();
          if (guest?._id) {
            changeStream = InvitationGuest.watch(
              [
                {
                  $match: {
                    operationType: { $in: ["update", "replace"] },
                    "documentKey._id": guest._id,
                  },
                },
              ],
              { fullDocument: "updateLookup" }
            );
            changeStream.on("change", () => {
              void pushSnapshot(false);
            });
            changeStream.on("error", () => {
              // polling fallback remains
            });
          }
        } catch {
          // Atlas/replica-set change streams are optional
        }
      },
      async cancel() {
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (poll) clearInterval(poll);
        if (changeStream) {
          try {
            await changeStream.close();
          } catch {
            // ignore
          }
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("CHECK-IN PASS STREAM FAILED:", error);
    return new Response("SERVER_ERROR", { status: 500 });
  }
}
