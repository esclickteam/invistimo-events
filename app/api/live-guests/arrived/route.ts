import connectDB from "@/lib/mongodb";
import InvitationGuest from "@/models/InvitationGuest";
import { planSingleGuestWrite } from "@/lib/invitationGuestWrites";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const { invitationGuestId, arrivedCount } = body;

    console.log("🟡 [API arrived] incoming body:", body);

    if (!invitationGuestId) {
      return NextResponse.json(
        { error: "invitationGuestId is required" },
        { status: 400 }
      );
    }

    const guest = await InvitationGuest.findById(invitationGuestId);

    if (!guest) {
      return NextResponse.json(
        { error: "Guest not found" },
        { status: 404 }
      );
    }

    const safeArrived = Math.max(0, Number(arrivedCount || 0));

    console.log("🟡 [API arrived] BEFORE save:", {
      guestId: guest._id.toString(),
      prevArrived: guest.arrivedCount,
      nextArrived: safeArrived,
    });

    const writePlan = planSingleGuestWrite({
      source: "live-guests.arrived",
      guestId: String(guest._id),
      invitationId: guest.invitationId ? String(guest.invitationId) : null,
      current: { arrivedCount: guest.arrivedCount },
      next: { arrivedCount: safeArrived },
      keys: ["arrivedCount"],
    });

    if (writePlan.shouldWrite) {
      guest.arrivedCount = safeArrived;
      await guest.save();
    }

    console.log("🟢 [API arrived] AFTER save:", {
      guestId: guest._id.toString(),
      savedArrived: guest.arrivedCount,
    });

    return NextResponse.json({
      success: true,
      invitationGuestId,
      arrivedCount: guest.arrivedCount,
    });
  } catch (err) {
    console.error("❌ [API arrived] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
