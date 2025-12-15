import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Event from "@/models/Event";

import { EVENT_PRESETS } from "@/config/eventPresets";
import { ZONE_META } from "@/config/zonesMeta";

/* ============================================================
   POST /api/event/[eventId]/apply-preset
============================================================ */

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    /* ✅ חובה ב-Next החדש */
    const { eventId } = await context.params;

    const body = await req.json();
    const { eventType } = body;

    if (!eventType || !EVENT_PRESETS[eventType]) {
      return NextResponse.json(
        { success: false, error: "Invalid event type" },
        { status: 400 }
      );
    }

    await dbConnect();

    const preset = EVENT_PRESETS[eventType];

    const zones = preset.map((zoneType, index) => {
      const meta = ZONE_META[zoneType];

      return {
        id: crypto.randomUUID(),
        zoneType,
        label: meta.label,
        icon: meta.icon,
        color: meta.color,
        opacity: 0.35,

        x: 200 + index * 80,
        y: 200 + index * 60,
        width: meta.defaultSize.width,
        height: meta.defaultSize.height,
        rotation: 0,
        locked: false,
      };
    });

    await Event.findByIdAndUpdate(eventId, {
      $set: { zones },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ apply-preset error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
