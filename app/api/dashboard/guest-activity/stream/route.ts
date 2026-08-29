import { NextRequest } from "next/server";

import db from "@/lib/db";
import { canManageInvitation } from "@/lib/canManageInvitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import GuestWeddingMessage from "@/models/GuestWeddingMessage";
import {
  guestActivityFingerprint,
  type GuestActivityPatch,
} from "@/lib/dashboardGuestActivity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sseMessage(eventName: string, data: unknown) {
  return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseComment(comment: string) {
  return `: ${comment}\n\n`;
}

function isoOrNull(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function findManagedInvitation(auth: any, invitationId?: string | null) {
  if (invitationId) {
    const invitation = await Invitation.findById(invitationId).lean();
    if (invitation && canManageInvitation(auth, invitation)) return invitation;
  }

  const invitation = await Invitation.findOne({ ownerId: auth.userId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  if (invitation && canManageInvitation(auth, invitation)) return invitation;
  return null;
}

async function loadSnapshot(invitationId: unknown) {
  const guests = await InvitationGuest.find({ invitationId })
    .select(
      "_id token firstOpenedAt lastOpenedAt openCount rsvp arrivedCount guestsCount notes rsvpUpdatedAt rsvpRespondedAt lastResponseAt"
    )
    .lean();

  const unreadGuestMessages = await GuestWeddingMessage.countDocuments({
    invitationId,
    status: "unread",
  });

  const patches: GuestActivityPatch[] = guests.map((guest: any) => ({
    id: String(guest._id),
    token: String(guest.token || ""),
    firstOpenedAt: isoOrNull(guest.firstOpenedAt),
    lastOpenedAt: isoOrNull(guest.lastOpenedAt),
    openCount: Number(guest.openCount || 0),
    rsvp: guest.rsvp || "pending",
    arrivedCount: Number(guest.arrivedCount || 0),
    guestsCount: Number(guest.guestsCount || 0),
    notes: String(guest.notes || ""),
    rsvpUpdatedAt: isoOrNull(guest.rsvpUpdatedAt),
    rsvpRespondedAt: isoOrNull(guest.rsvpRespondedAt),
    lastResponseAt: isoOrNull(guest.lastResponseAt),
  }));

  return {
    guests: patches,
    unreadGuestMessages,
    updatedAt: new Date().toISOString(),
    fingerprint: guestActivityFingerprint({
      guests: patches,
      unreadGuestMessages,
    }),
  };
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return new Response("UNAUTHORIZED", { status: 401 });
    }

    const invitationId = req.nextUrl.searchParams.get("invitationId");
    const invitation = await findManagedInvitation(auth, invitationId);

    if (!invitation) {
      return new Response("NO_INVITATION", { status: 404 });
    }

    const encoder = new TextEncoder();
    let closed = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let changeStream: any = null;
    let lastFingerprint = "";

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
          const snapshot = await loadSnapshot(invitation._id);
          if (!force && snapshot.fingerprint === lastFingerprint) return;
          lastFingerprint = snapshot.fingerprint;
          send("snapshot", {
            guests: snapshot.guests,
            unreadGuestMessages: snapshot.unreadGuestMessages,
            updatedAt: snapshot.updatedAt,
          });
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

        send("connected", {
          invitationId: String(invitation._id),
          connectedAt: new Date().toISOString(),
        });

        await pushSnapshot(true);

        heartbeat = setInterval(() => {
          sendComment(`heartbeat ${new Date().toISOString()}`);
        }, 25000);

        poll = setInterval(() => {
          void pushSnapshot(false);
        }, 3000);

        try {
          changeStream = InvitationGuest.watch(
            [
              {
                $match: {
                  operationType: { $in: ["insert", "update", "replace"] },
                  "fullDocument.invitationId": invitation._id,
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
        } catch {
          // Atlas/replica-set change streams are optional; polling is enough.
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
    console.error("DASHBOARD GUEST ACTIVITY STREAM FAILED:", error);
    return new Response("SERVER_ERROR", { status: 500 });
  }
}
