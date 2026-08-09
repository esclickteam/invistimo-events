import { NextRequest, NextResponse } from "next/server";
import VenueAuditLog from "@/models/VenueAuditLog";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ hallId: string }>;
};

function serializeEntry(entry: any, actorName?: string) {
  return {
    id: String(entry._id),
    venueId: entry.venueId,
    action: entry.action || "",
    targetType: entry.targetType || "",
    targetId: entry.targetId || "",
    meta: entry.meta || {},
    actorUserId: String(entry.actorUserId || ""),
    actorName: actorName || "",
    createdAt: entry.createdAt
      ? new Date(entry.createdAt).toISOString()
      : null,
  };
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "dashboard.view");
    if (error || !ctx) return error!;

    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);

    const [entries, total] = await Promise.all([
      VenueAuditLog.find({ venueId: ctx.venueId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VenueAuditLog.countDocuments({ venueId: ctx.venueId }),
    ]);

    const actorIds = [
      ...new Set(entries.map((e: any) => String(e.actorUserId)).filter(Boolean)),
    ];

    const actors = actorIds.length
      ? await User.find({ _id: { $in: actorIds } })
          .select("name email")
          .lean()
      : [];

    const actorMap = new Map(
      actors.map((u: any) => [
        String(u._id),
        String(u.name || u.email || "משתמש"),
      ])
    );

    const activity = entries.map((entry: any) =>
      serializeEntry(entry, actorMap.get(String(entry.actorUserId)))
    );

    return NextResponse.json({
      success: true,
      activity,
      total,
      limit,
      skip,
    });
  } catch (err) {
    console.error("GET activity failed:", err);
    return NextResponse.json(
      { success: false, message: "טעינת יומן פעילות נכשלה" },
      { status: 500 }
    );
  }
}
