import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";

import EventTimelineStep from "@/models/EventTimelineStep";

export const dynamic = "force-dynamic";

export const runtime = "nodejs";

/* =======================================================
   PATCH
======================================================= */

export async function PATCH(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    await db();

    const { id } =
      await context.params;

    const body =
      await req.json();

    const updated =
      await EventTimelineStep.findByIdAndUpdate(
        id,
        {
          $set: body,
        },
        {
          new: true,
        }
      );

    return NextResponse.json({
      success: true,
      step: updated,
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
   DELETE
======================================================= */

export async function DELETE(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    await db();

    const { id } =
      await context.params;

    await EventTimelineStep.findByIdAndDelete(
      id
    );

    return NextResponse.json({
      success: true,
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