import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function objectIdOrString(value: string) {
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  return value;
}

function normalizeStaffIdQuery(userId: string) {
  const id = objectIdOrString(userId);

  const query: any = {
    $or: [
      { assignedEmployeeId: id },
      { assignedEmployeeId: userId },

      { assignedStaffId: id },
      { assignedStaffId: userId },

      { assignedTo: id },
      { assignedTo: userId },

      { assignedStaffIds: id },
      { assignedStaffIds: userId },

      { assignedEmployeeIds: id },
      { assignedEmployeeIds: userId },

      { staffId: id },
      { staffId: userId },

      { supportAgentId: id },
      { supportAgentId: userId },
    ],
  };

  return query;
}

function isEventNeedsCheck(event: any) {
  const status = String(
    event.careStatus ||
      event.supportStatus ||
      event.staffStatus ||
      event.employeeStatus ||
      event.status ||
      ""
  ).toLowerCase();

  if (
    status === "urgent" ||
    status === "critical" ||
    status === "danger" ||
    status === "check" ||
    status === "warning" ||
    status === "needs_check" ||
    status === "pending"
  ) {
    return true;
  }

  const unread = Number(event.unreadMessages || event.unreadCount || 0);

  return unread > 0;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const userIdString = String(userId);
    const userObjectId = objectIdOrString(userIdString);

    const usersCollection = mongoose.connection.collection("users");
    const eventsCollection = mongoose.connection.collection("events");
    const tasksCollection = mongoose.connection.collection("tasks");

    const currentUserQuery: any = {
      $or: [{ _id: userObjectId }, { _id: userIdString }],
    };

    const currentUser = await usersCollection.findOne(currentUserQuery);

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const isSystemStaff =
      currentUser.role === "staff" ||
      currentUser.role === "admin" ||
      currentUser.effectiveRole === "system_staff" ||
      currentUser.isSystemStaff === true ||
      (currentUser.role === "staff" &&
        currentUser.staffType === "general_staff" &&
        currentUser.employeeScope === "system");

    if (!isSystemStaff) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    const staffQuery = normalizeStaffIdQuery(userIdString);

    const [users, events, tasks] = await Promise.all([
      usersCollection
        .find({})
        .project({
          password: 0,
          refreshTokens: 0,
          resetPasswordToken: 0,
          resetPasswordExpires: 0,
          verificationToken: 0,
          otp: 0,
          otpExpires: 0,
        })
        .sort({ createdAt: -1 })
        .limit(300)
        .toArray(),

      eventsCollection
        .find(staffQuery)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(200)
        .toArray(),

      tasksCollection
        .find(staffQuery)
        .sort({ dueAt: 1, createdAt: -1 })
        .limit(100)
        .toArray()
        .catch(() => []),
    ]);

    const needCheck = events.filter(isEventNeedsCheck).length;

    const unreadMessages = events.reduce((sum: number, event: any) => {
      return sum + Number(event.unreadMessages || event.unreadCount || 0);
    }, 0);

    const activeUsers = users.filter((item: any) => {
      if (item.isActive === false) return false;

      const status = String(item.status || "active").toLowerCase();

      return status === "active";
    }).length;

    return NextResponse.json({
      success: true,
      user: currentUser,
      users,
      events,
      tasks,
      stats: {
        totalUsers: users.length,
        myEvents: events.length,
        needCheck,
        unreadMessages,
        activeUsers,
      },
    });
  } catch (error) {
    console.error("GET /api/staff/dashboard failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "STAFF_DASHBOARD_FAILED",
      },
      { status: 500 }
    );
  }
}