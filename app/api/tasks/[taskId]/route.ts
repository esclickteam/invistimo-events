import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EventTask from "@/models/EventTask";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   PATCH – עדכון משימה
========================================================= */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    await db();

    /* =========================
       Auth
    ========================= */
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    /* =========================
       Params (⚠️ Promise!)
    ========================= */
    const { taskId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_TASK_ID" },
        { status: 400 }
      );
    }

    /* =========================
       Body
    ========================= */
    const updates = await req.json();

    /* =========================
       Whitelist
    ========================= */
    const allowedFields = [
      "title",
      "dueDate",
      "status",
      "order",
      "archived",
    ] as const;

    const safeUpdates: Partial<Record<(typeof allowedFields)[number], any>> =
      {};

    for (const key of allowedFields) {
      if (key in updates) {
        safeUpdates[key] = updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json(
        { success: false, error: "NO_VALID_FIELDS" },
        { status: 400 }
      );
    }

    /* =========================
       Load Task
    ========================= */
    const task = await EventTask.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: "TASK_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* =========================
       Verify Event Ownership
       (לקוח או מפיק)
    ========================= */
    const event = await Event.findOne({
      _id: task.eventId,
      $or: [
        { userId: auth.userId },
        { producerId: auth.userId },
      ],
    }).select("_id");

    if (!event) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* =========================
       Apply Update
    ========================= */
    const previousStatus = String(task.status || "");
    Object.assign(task, safeUpdates);
    await task.save();
    if (previousStatus !== "done" && String(task.status || "") === "done") {
      try {
        const { recordOperationalTaskCompleted } = await import(
          "@/lib/customerNotifications/adminCenterLive"
        );
        await recordOperationalTaskCompleted({
          taskId: String(task._id),
          title: String(task.title || ""),
          eventId: task.eventId ? String(task.eventId) : null,
          customerId: task.userId ? String(task.userId) : null,
        });
      } catch (notifyError) {
        console.error("task notice failed", notifyError);
      }
    }

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (err) {
    console.error("❌ PATCH /tasks/[taskId] failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
