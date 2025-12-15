import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Event from "@/models/Event";
import { EVENT_PRESETS } from "@/config/eventPresets";
import { ZONE_META } from "@/config/zonesMeta";
import { ZoneType } from "@/types/zones";
import mongoose from "mongoose";

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await dbConnect();

    const { eventId } = params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    const preset = EVENT_PRESETS[event.eventType];
    if (!preset) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const zones = preset.map((zoneType: ZoneType, index: number) => {
      const meta = ZONE_META[zoneType];

      return {
        id: new mongoose.Types.ObjectId().toString(),
        zoneType,
        label: meta.label,
        icon: meta.icon,
        color: meta.color,
        opacity: 0.25,
        x: 200 + index * 80,
        y: 150 + index * 60,
        width: 220,
        height: 120,
        rotation: 0,
      };
    });

    event.zones = zones;
    await event.save();

    return NextResponse.json({ success: true, zones });
  } catch (err) {
    console.error("❌ apply preset error", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
