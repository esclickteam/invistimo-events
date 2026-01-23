import connectDB from "@/lib/mongodb";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import SeatingTable from "@/models/SeatingTable";

/* =========================================================
   GET /api/live-snapshot?eventId=...
========================================================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return Response.json(
        { error: "Missing eventId" },
        { status: 400 }
      );
    }

    await connectDB();

    /* =========================
       1️⃣ Load invitations of event
    ========================= */
    const invitations = await Invitation.find(
      { eventId },
      { _id: 1 }
    ).lean();

    const invitationIds = invitations.map((i) => i._id);

    if (!invitationIds.length) {
      return Response.json({
        guests: [],
        tables: [],
        background: null,
        canvasView: { scale: 1, x: 0, y: 0 },
      });
    }

    /* =========================
       2️⃣ Load invitation guests
    ========================= */
    const guests = await InvitationGuest.find({
      invitationId: { $in: invitationIds },
    }).lean();

    /* =========================
       3️⃣ Load seating tables
    ========================= */
    const tables = await SeatingTable.find({
      invitationId: { $in: invitationIds },
    }).lean();

    /* =========================
       4️⃣ Return LIVE snapshot
    ========================= */
    return Response.json({
      guests: guests || [],
      tables: tables || [],
      background: null, // מוכן לעתיד
      canvasView: {
        scale: 1,
        x: 0,
        y: 0,
      },
    });
  } catch (err) {
    console.error("❌ live-snapshot error:", err);
    return Response.json(
      { error: "Failed to load live snapshot" },
      { status: 500 }
    );
  }
}
