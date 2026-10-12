import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  bumpSeatingMapVersion,
  customerExclusiveLockRequired,
  guardSeatingEditWrite,
  readSeatingWriteCredentials,
} from "@/lib/seating/editLockServer";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/* ============================================
   PATCH — עדכון קבוצה
============================================ */
export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const data = await req.json();
    const touchesSeating =
      Object.prototype.hasOwnProperty.call(data || {}, "tableId") ||
      Object.prototype.hasOwnProperty.call(data || {}, "isSeated");

    if (touchesSeating) {
      const existing = await Group.findById(id).select("eventId").lean<{
        eventId?: unknown;
      } | null>();
      const eventId = existing?.eventId ? String(existing.eventId) : "";
      const exclusiveLock = await customerExclusiveLockRequired(auth, eventId);
      if (exclusiveLock) {
        const gate = await guardSeatingEditWrite({
          eventId,
          credentials: readSeatingWriteCredentials(data),
        });
        if (!gate.ok) {
          return NextResponse.json(gate.body, { status: gate.status });
        }
      } else if (eventId) {
        await bumpSeatingMapVersion(eventId);
      }
    }

    const groupPatch = { ...(data || {}) };
    delete groupPatch.editLockId;
    delete groupPatch.lockId;
    delete groupPatch.lockGeneration;
    delete groupPatch.generation;
    delete groupPatch.screenInstanceId;
    delete groupPatch.baseMapVersion;
    delete groupPatch.mapVersion;
    delete groupPatch.saveScope;

    const group = await Group.findByIdAndUpdate(
      id,
      groupPatch,
      { new: true }
    );

    return NextResponse.json({ success: true, group });
  } catch (err) {
    console.error("PATCH /groups/[id] error:", err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}

/* ============================================
   DELETE — מחיקת קבוצה
============================================ */
export async function DELETE(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    await Group.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /groups/[id] error:", err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
