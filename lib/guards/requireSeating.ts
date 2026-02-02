// lib/guards/requireSeating.ts
import { NextResponse } from "next/server";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export async function requireSeating(eventId?: string) {
  const auth = await getUserIdFromRequest();
  if (!auth?.userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  if (!eventId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "MISSING_EVENT" },
        { status: 400 }
      ),
    };
  }

  const invitation = await Invitation.findOne({ eventId }).lean();
  if (!invitation) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      ),
    };
  }

  const userId = String(auth.userId);

  const isOwner = String(invitation.ownerId) === userId;
  const isProducer =
    Array.isArray(invitation.producers) &&
    invitation.producers.some(
      (p: any) => String(p.userId ?? p) === userId
    );

  if (!isOwner && !isProducer) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId };
}
