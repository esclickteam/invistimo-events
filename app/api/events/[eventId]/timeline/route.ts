import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";

import EventTimelineStep from "@/models/EventTimelineStep";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

/* =======================================================
   GET
======================================================= */

export async function GET(
  req: NextRequest,
  context: {
    params: Promise<{
      eventId: string;
    }>;
  }
) {
  try {
    await db();

    const { eventId } =
      await context.params;

    const steps =
      await EventTimelineStep.find({
        eventId,
      }).sort({
        order: 1,
        createdAt: 1,
      });

    return NextResponse.json({
      success: true,
      steps,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
      },
      { status: 500 }
    );
  }
}

/* =======================================================
   POST
======================================================= */

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{
      eventId: string;
    }>;
  }
) {
  try {
    await db();

    const { eventId } =
      await context.params;

    const body =
      await req.json();

    const step =
      await EventTimelineStep.create({
        eventId,

        title:
          body.title || "",

        time:
          body.time || "",

        status:
          body.status ||
          "pending",

        order:
          body.order || 0,
      });

    return NextResponse.json({
      success: true,
      step,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
      },
      { status: 500 }
    );
  }
}