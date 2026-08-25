import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VenueAlert from "@/models/VenueAlert";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import {
  createVenueAlert,
  filterAlertsForPermissions,
  refreshProactiveVenueAlerts,
} from "@/lib/venues/alerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ hallId: string }>;
};

const allowedTones = ["amber", "rose", "violet", "emerald"] as const;
const allowedTypes = [
  "maintenance",
  "payments",
  "staff",
  "menu",
  "leads",
  "tasks",
  "events",
  "clients",
  "files",
  "day_of",
] as const;

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function serializeAlert(alert: any) {
  return {
    id: String(alert._id),
    title: alert.title || "",
    description: alert.description || "",
    tone: alert.tone || "amber",
    type: alert.type || "maintenance",
    linkHref: alert.linkHref || "",
    read: Boolean(alert.read),
    hallId: alert.hallId || "",
    createdAt: alert.createdAt
      ? new Date(alert.createdAt).toISOString()
      : null,
  };
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "dashboard.view");
    if (error || !ctx) return error!;

    await refreshProactiveVenueAlerts({
      ownerId: String(ctx.ownerId),
      hallId: ctx.venueId,
    });

    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "1";
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));

    const query: Record<string, unknown> = {
      ownerId: ctx.ownerId,
      $or: [
        { hallId: ctx.venueId },
        { hallId: { $exists: false } },
        { hallId: "" },
        { hallId: null },
      ],
    };

    if (unreadOnly) {
      query.read = false;
    }

    const alerts = await VenueAlert.find(query)
      .sort({ read: 1, createdAt: -1 })
      .limit(Math.min(80, limit * 2))
      .lean();

    const visible = filterAlertsForPermissions(
      alerts as any[],
      ctx.permissions
    ).slice(0, limit);

    return NextResponse.json({
      success: true,
      alerts: visible.map(serializeAlert),
      unreadCount: visible.filter((a: any) => !a.read).length,
    });
  } catch (err) {
    console.error("GET hall alerts failed:", err);
    return NextResponse.json(
      { success: false, message: "טעינת התראות נכשלה" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "dashboard.view");
    if (error || !ctx) return error!;

    const body = await req.json().catch(() => ({}));
    const action = cleanString(body.action || "markRead");

    if (action === "markRead") {
      const alertId = cleanString(body.alertId || body.id);
      if (!alertId) {
        return NextResponse.json(
          { success: false, message: "חסר מזהה התראה" },
          { status: 400 }
        );
      }

      const updated = await VenueAlert.findOneAndUpdate(
        {
          _id: alertId,
          ownerId: ctx.ownerId,
          $or: [
            { hallId: ctx.venueId },
            { hallId: { $exists: false } },
            { hallId: "" },
            { hallId: null },
          ],
        },
        { $set: { read: true } },
        { new: true }
      ).lean();

      if (!updated) {
        return NextResponse.json(
          { success: false, message: "התראה לא נמצאה" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        alert: serializeAlert(updated),
      });
    }

    if (action === "markAllRead") {
      await VenueAlert.updateMany(
        {
          ownerId: ctx.ownerId,
          read: false,
          $or: [
            { hallId: ctx.venueId },
            { hallId: { $exists: false } },
            { hallId: "" },
            { hallId: null },
          ],
        },
        { $set: { read: true } }
      );

      return NextResponse.json({ success: true, message: "כל ההתראות סומנו כנקראו" });
    }

    if (action === "create") {
      const title = cleanString(body.title);
      if (!title) {
        return NextResponse.json(
          { success: false, message: "חובה להזין כותרת" },
          { status: 400 }
        );
      }

      const tone = allowedTones.includes(body.tone) ? body.tone : "amber";
      const type = allowedTypes.includes(body.type) ? body.type : "maintenance";

      const alert = await createVenueAlert({
        ownerId: ctx.ownerId,
        hallId: ctx.venueId,
        title,
        description: cleanString(body.description),
        tone,
        type,
        linkHref: cleanString(body.linkHref),
      });

      return NextResponse.json({
        success: true,
        alert: serializeAlert(alert),
      });
    }

    return NextResponse.json(
      { success: false, message: "פעולה לא נתמכת" },
      { status: 400 }
    );
  } catch (err) {
    console.error("POST hall alerts failed:", err);
    return NextResponse.json(
      { success: false, message: "שמירת התראה נכשלה" },
      { status: 500 }
    );
  }
}
