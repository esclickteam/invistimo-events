import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toObjectId(value: string) {
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  return null;
}

function buildUserLookupQuery(userId: string) {
  const objectId = toObjectId(userId);

  const orQuery: any[] = [
    { userId },
    { id: userId },
    { uid: userId },
    { sub: userId },
  ];

  if (objectId) {
    orQuery.unshift({ _id: objectId });
  }

  return { $or: orQuery };
}

function normalizeStaffIdQuery(userId: string) {
  const objectId = toObjectId(userId);
  const ids: any[] = [userId];

  if (objectId) {
    ids.push(objectId);
  }

  return {
    $or: [
      { assignedEmployeeId: { $in: ids } },
      { assignedStaffId: { $in: ids } },
      { assignedTo: { $in: ids } },
      { staffId: { $in: ids } },
      { supportAgentId: { $in: ids } },

      { assignedStaffIds: { $in: ids } },
      { assignedEmployeeIds: { $in: ids } },

      { staffOwnerId: { $in: ids } },
      { employeeId: { $in: ids } },
      { managerId: { $in: ids } },
    ],
  };
}

function buildAssignedClientsQuery(userId: string) {
  return {
    $and: [
      {
        role: {
          $in: ["client", "customer", "user"],
        },
      },
      normalizeStaffIdQuery(userId),
    ],
  };
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

function getEventTitle(invitation: any) {
  return (
    invitation.title ||
    invitation.eventName ||
    invitation.name ||
    invitation.clientName ||
    "אירוע ללא שם"
  );
}

function getClientName(invitation: any) {
  return (
    invitation.clientName ||
    invitation.customerName ||
    invitation.ownerName ||
    invitation.name ||
    "לקוח ללא שם"
  );
}

function getClientPhone(invitation: any) {
  return (
    invitation.clientPhone ||
    invitation.customerPhone ||
    invitation.phone ||
    invitation.ownerPhone ||
    ""
  );
}

function getLocation(invitation: any) {
  if (!invitation.location) return "";

  if (typeof invitation.location === "string") {
    return invitation.location;
  }

  return invitation.location.name || invitation.location.address || "";
}

function mapInvitationToDashboardEvent(invitation: any) {
  return {
    _id: invitation._id,
    id: String(invitation._id),

    title: getEventTitle(invitation),
    eventName: invitation.eventName || invitation.title || "",
    name: invitation.name || "",

    clientName: getClientName(invitation),
    customerName: invitation.customerName || "",
    ownerName: invitation.ownerName || "",
    clientPhone: getClientPhone(invitation),

    ownerId: invitation.ownerId ? String(invitation.ownerId) : "",
    userId: invitation.userId ? String(invitation.userId) : "",
    clientId: invitation.clientId ? String(invitation.clientId) : "",
    customerId: invitation.customerId ? String(invitation.customerId) : "",
    createdBy: invitation.createdBy ? String(invitation.createdBy) : "",

    eventType: invitation.eventType || invitation.type || "",
    type: invitation.type || invitation.eventType || "",

    eventDate: invitation.eventDate || invitation.date || "",
    date: invitation.date || invitation.eventDate || "",

    location: getLocation(invitation),

    guestsCount:
      Number(invitation.guestsCount) ||
      Number(invitation.maxGuests) ||
      Number(invitation.guests) ||
      0,

    assignedEmployeeId: invitation.assignedEmployeeId,
    assignedStaffId: invitation.assignedStaffId,
    assignedTo: invitation.assignedTo,
    assignedStaffIds: invitation.assignedStaffIds,
    assignedEmployeeIds: invitation.assignedEmployeeIds,

    progress: invitation.progress || invitation.status || "new",
    status: invitation.status || invitation.progress || "new",

    careStatus:
      invitation.careStatus ||
      invitation.supportStatus ||
      invitation.staffStatus ||
      "ok",

    supportStatus: invitation.supportStatus || invitation.careStatus || "ok",

    unreadMessages: Number(
      invitation.unreadMessages || invitation.unreadCount || 0
    ),
    unreadCount: Number(
      invitation.unreadCount || invitation.unreadMessages || 0
    ),

    lastMessage: invitation.lastMessage || "",
    lastMessageAt: invitation.lastMessageAt || invitation.updatedAt || "",

    notes: invitation.notes || invitation.supportNote || "",
    supportNote: invitation.supportNote || invitation.notes || "",

    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await getUserIdFromRequest(request);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);

    const usersCollection = mongoose.connection.collection("users");
    const tasksCollection = mongoose.connection.collection("tasks");

    const currentUser = await usersCollection.findOne(
      buildUserLookupQuery(userId)
    );

    if (!currentUser) {
      console.log("STAFF DASHBOARD USER_NOT_FOUND:", {
        userId,
        auth,
        query: buildUserLookupQuery(userId),
      });

      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
          debug:
            process.env.NODE_ENV === "development"
              ? {
                  userId,
                  role: auth.role,
                  staffType: auth.staffType,
                  employeeScope: auth.employeeScope,
                }
              : undefined,
        },
        { status: 404 }
      );
    }

    const authRole = String(auth.role || "").toLowerCase();
    const authStaffType = String(auth.staffType || "").toLowerCase();
    const authEmployeeScope = String(auth.employeeScope || "").toLowerCase();

    const currentRole = String(currentUser.role || "").toLowerCase();
    const currentStaffType = String(currentUser.staffType || "").toLowerCase();
    const currentEmployeeScope = String(
      currentUser.employeeScope || ""
    ).toLowerCase();
    const currentEffectiveRole = String(
      currentUser.effectiveRole || ""
    ).toLowerCase();

    const isSystemStaff =
      authRole === "admin" ||
      authRole === "staff" ||
      authRole === "employee" ||
      currentRole === "admin" ||
      currentRole === "staff" ||
      currentRole === "employee" ||
      currentEffectiveRole === "system_staff" ||
      currentUser.isSystemStaff === true ||
      (currentRole === "staff" &&
        currentStaffType === "general_staff" &&
        currentEmployeeScope === "system") ||
      (authRole === "staff" &&
        authStaffType === "general_staff" &&
        authEmployeeScope === "system");

    if (!isSystemStaff) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    const staffQuery = normalizeStaffIdQuery(userId);
    const assignedClientsQuery = buildAssignedClientsQuery(userId);

    const [users, invitations, tasks] = await Promise.all([
      usersCollection
        .find(assignedClientsQuery)
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

      Invitation.find(staffQuery)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(200)
        .lean(),

      tasksCollection
        .find(staffQuery)
        .sort({ dueAt: 1, createdAt: -1 })
        .limit(100)
        .toArray()
        .catch(() => []),
    ]);

    const events = invitations.map((invitation: any) =>
      mapInvitationToDashboardEvent(invitation)
    );

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
      auth,
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