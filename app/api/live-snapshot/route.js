import connectDB from "@/lib/mongodb";
import InvitationGuest from "@/models/InvitationGuest";
import SeatingTable from "@/models/SeatingTable";
import Group from "@/models/Group";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return Response.json(
        { error: "Missing invitationId" },
        { status: 400 }
      );
    }

    await connectDB();

    /* =========================
       Load guests
    ========================= */
    const guests = await InvitationGuest.find({
      invitationId,
    }).lean();

    /* =========================
       Load seating tables
    ========================= */
    const tables = await SeatingTable.find({
      invitationId,
    }).lean();

    /* =========================
       🔥 Load groups (MODEL קיים!)
    ========================= */
    const groups = await Group.find({
      invitationId,
    }).lean();

    /* =========================
       Return LIVE snapshot
    ========================= */
    return Response.json({
      guests: guests || [],
      tables: tables || [],
      groups: groups || [],
      background: null,
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
