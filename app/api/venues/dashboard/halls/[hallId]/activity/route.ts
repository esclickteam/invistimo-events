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
    const targetId = String(url.searchParams.get("targetId") || "").trim();
    const action = String(url.searchParams.get("action") || "").trim();
    const targetType = String(url.searchParams.get("targetType") || "").trim();
    const actorUserId = String(url.searchParams.get("actorUserId") || "").trim();
    const from = String(url.searchParams.get("from") || "").trim();
    const to = String(url.searchParams.get("to") || "").trim();
    const q = String(url.searchParams.get("q") || "").trim();

    const filter: Record<string, unknown> = { venueId: ctx.venueId };
    if (targetId) filter.targetId = targetId;
    if (action) {
      filter.action = { $regex: action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }
    if (targetType) {
      filter.targetType = {
        $regex: targetType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }
    if (actorUserId) filter.actorUserId = actorUserId;

    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) createdAt.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) {
          // inclusive end-of-day when date-only
          if (/^\d{4}-\d{2}-\d{2}$/.test(to)) d.setHours(23, 59, 59, 999);
          createdAt.$lte = d;
        }
      }
      if (Object.keys(createdAt).length) filter.createdAt = createdAt;
    }

    if (q) {
      filter.$or = [
        { action: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        { targetType: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        { targetId: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
      ];
    }

    const [entries, total] = await Promise.all([
      VenueAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VenueAuditLog.countDocuments(filter),
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
      filters: { action, targetType, actorUserId, from, to, q, targetId },
    });
  } catch (err) {
    console.error("GET activity failed:", err);
    return NextResponse.json(
      { success: false, message: "טעינת יומן פעילות נכשלה" },
      { status: 500 }
    );
  }
}
