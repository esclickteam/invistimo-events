import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";

import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import EventConversation from "@/models/EventConversation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   HELPERS
========================================================= */

function getEventTitle(event: any, invitation: any) {
  return (
    invitation?.title ||
    invitation?.eventTitle ||
    invitation?.eventName ||
    invitation?.invitationTitle ||
    invitation?.name ||
    event?.title ||
    event?.eventTitle ||
    event?.eventName ||
    event?.name ||
    event?.invitationTitle ||
    "אירוע ללא שם"
  );
}

function getEventDate(event: any, invitation: any) {
  return invitation?.eventDate || event?.date || event?.eventDate || null;
}

function getEventLocation(event: any, invitation: any) {
  const invitationLocation = invitation?.location;

  if (invitationLocation) {
    if (typeof invitationLocation === "object") {
      return (
        invitationLocation.address ||
        invitationLocation.name ||
        invitationLocation.label ||
        ""
      );
    }

    return invitationLocation;
  }

  if (!event?.location) {
    return event?.venue || event?.place || "";
  }

  if (typeof event.location === "object") {
    return (
      event.location.address ||
      event.location.name ||
      event.location.label ||
      ""
    );
  }

  return event.location;
}

function getCalendarType(item: any) {
  return item?.calendarType || item?.meetingType || item?.type || "meeting";
}

function getCalendarTypeLabel(type: string) {
  switch (type) {
    case "meeting":
      return "פגישה";
    case "event":
      return "אירוע";
    case "reminder":
      return "תזכורת";
    case "task":
      return "משימה";
    case "call":
      return "שיחת טלפון";
    case "zoom":
      return "פגישת זום";
    case "note":
      return "הערה";
    default:
      return "פריט ביומן";
  }
}

function getCalendarTitle(item: any) {
  return item?.title || item?.entityName || item?.name || item?.subject || "פריט ביומן";
}

function getCalendarDate(item: any) {
  return item?.date || item?.meetingDate || item?.eventDate || item?.dueDate || null;
}

function getCalendarTime(item: any) {
  return item?.time || item?.meetingTime || item?.eventTime || item?.hour || "";
}

function getCalendarDescription(item: any) {
  return item?.description || item?.notes || item?.message || item?.summary || "";
}

function getCalendarLocation(item: any) {
  return item?.location || item?.address || item?.zoomLink || "";
}

/* =========================================================
   GET – Producer Clients
   Route: /api/producer/clients
========================================================= */

export async function GET(req: NextRequest) {
  try {
    console.log("🔵 [PRODUCER CLIENTS] Route called");

    await dbConnect();
    console.log("🟢 DB connected");

    /* =========================
       Auth – Producer
    ========================= */
    const auth = await getUserIdFromRequest(req);
    console.log("🟡 AUTH payload:", auth);

    if (!auth?.userId || auth.role !== "producer") {
      console.log("🔴 UNAUTHORIZED", auth);

      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const producerObjectId = new mongoose.Types.ObjectId(auth.userId);

    console.log("🟢 Producer ObjectId:", producerObjectId.toString());

    /* =========================
       Clients – by assignedProducerId
    ========================= */
    const clients = await User.find({
      assignedProducerId: producerObjectId,
      role: {
        $in: ["client", "user"],
      },
    })
      .select("name email phone createdAt assignedProducerId billingSource")
      .sort({
        createdAt: -1,
      })
      .lean();

    console.log("🟢 Clients found:", clients.length);

    if (clients.length === 0) {
      console.log("⚠️ NO CLIENTS MATCH QUERY");

      return NextResponse.json({
        success: true,
        clients: [],
      });
    }

    const clientIds = clients.map((client: any) => client._id);

    /* =========================
       Events
    ========================= */
    const events = await Event.find({
      userId: {
        $in: clientIds,
      },
    })
      .select(
        [
          "_id",
          "userId",
          "date",
          "eventDate",
          "location",
          "venue",
          "place",
          "title",
          "eventTitle",
          "eventName",
          "name",
          "invitationTitle",
        ].join(" ")
      )
      .lean();

    console.log("🟢 Events found:", events.length);

    const eventsByUserId = Object.fromEntries(
      events.map((event: any) => [String(event.userId), event])
    );

    const eventIds = events.map((event: any) => event._id);

    /* =========================
       Invitations
    ========================= */
    const invitations =
      eventIds.length > 0
        ? await Invitation.find({
            eventId: {
              $in: eventIds,
            },
          })
            .select(
              [
                "_id",
                "eventId",
                "title",
                "eventTitle",
                "eventName",
                "name",
                "invitationTitle",
                "eventDate",
                "eventTime",
                "location",
              ].join(" ")
            )
            .sort({
              createdAt: -1,
            })
            .lean()
        : [];

    console.log("🟢 Invitations found:", invitations.length);

    const invitationsByEventId = invitations.reduce((acc: any, invitation: any) => {
      const key = String(invitation.eventId);

      acc[key] = acc[key] || [];
      acc[key].push(invitation);

      return acc;
    }, {});

    const invitationIds = invitations.map((invitation: any) => invitation._id);

    /* =========================
       Producer calendar items
       כל מה שנוסף ביומן לקוח בהפקה
    ========================= */
    const calendarItems =
      eventIds.length > 0
        ? await EventConversation.find({
            eventId: {
              $in: eventIds,
            },
            syncToProducerCalendar: {
              $ne: false,
            },
          })
            .select(
              [
                "_id",
                "eventId",
                "type",
                "calendarType",
                "meetingType",
                "entityName",
                "title",
                "name",
                "subject",
                "date",
                "meetingDate",
                "eventDate",
                "dueDate",
                "time",
                "meetingTime",
                "eventTime",
                "hour",
                "summary",
                "description",
                "notes",
                "message",
                "location",
                "address",
                "zoomLink",
                "status",
                "syncToProducerCalendar",
                "createdAt",
                "updatedAt",
              ].join(" ")
            )
            .sort({
              date: 1,
              time: 1,
              createdAt: -1,
            })
            .lean()
        : [];

    console.log("🟢 Producer calendar items found:", calendarItems.length);

    const calendarItemsByEventId = calendarItems.reduce((acc: any, item: any) => {
      const key = String(item.eventId);

      acc[key] = acc[key] || [];
      acc[key].push(item);

      return acc;
    }, {});

    /* =========================
       Guests stats
       totalGuests = סך מוזמנים לפי כמות בתוך כל רשומה
       approvedCount = כמה סימנו מגיעים לפי rsvp yes
    ========================= */
    const guestStats =
      invitationIds.length > 0
        ? await InvitationGuest.aggregate([
            {
              $match: {
                invitationId: {
                  $in: invitationIds,
                },
              },
            },
            {
              $group: {
                _id: "$invitationId",

                totalGuests: {
                  $sum: {
                    $ifNull: ["$guestsCount", 1],
                  },
                },

                approvedCount: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$rsvp", "yes"],
                      },
                      {
                        $ifNull: ["$guestsCount", 1],
                      },
                      0,
                    ],
                  },
                },

                pendingRecords: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ["$rsvp", null] },
                          { $eq: ["$rsvp", ""] },
                          { $eq: ["$rsvp", "pending"] },
                          { $not: ["$rsvp"] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },

                declinedRecords: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$rsvp", "no"],
                      },
                      1,
                      0,
                    ],
                  },
                },

                arrivedCount: {
                  $sum: {
                    $ifNull: ["$arrivedCount", 0],
                  },
                },

                actualArrivedCount: {
                  $sum: {
                    $ifNull: ["$actualArrivedCount", 0],
                  },
                },
              },
            },
          ])
        : [];

    console.log("🟢 Guest stats rows:", guestStats.length);

    const statsByInvitationId = Object.fromEntries(
      guestStats.map((guest: any) => [
        String(guest._id),
        {
          totalGuests: guest.totalGuests || 0,
          approvedCount: guest.approvedCount || 0,
          pendingRecords: guest.pendingRecords || 0,
          declinedRecords: guest.declinedRecords || 0,
          arrivedCount: guest.arrivedCount || 0,
          actualArrivedCount: guest.actualArrivedCount || 0,
        },
      ])
    );

    /* =========================
       Merge Client + Event + Invitation + Stats + Calendar
    ========================= */
    const result = clients.map((client: any) => {
      const event = eventsByUserId[String(client._id)];

      if (!event) {
        console.log("⚠️ Client has NO event:", String(client._id));

        return {
          ...client,
          event: null,
          invitation: null,
          rsvpStats: {
            totalGuests: 0,
            approvedCount: 0,
            pendingRecords: 0,
            declinedRecords: 0,
            arrivedCount: 0,
            actualArrivedCount: 0,
          },
          calendarItems: [],
        };
      }

      const invitationsForEvent = invitationsByEventId[String(event._id)] || [];
      const mainInvitation = invitationsForEvent[0] || null;
      const eventCalendarItems = calendarItemsByEventId[String(event._id)] || [];

      let totalGuests = 0;
      let approvedCount = 0;
      let pendingRecords = 0;
      let declinedRecords = 0;
      let arrivedCount = 0;
      let actualArrivedCount = 0;

      for (const invitation of invitationsForEvent) {
        const stats = statsByInvitationId[String(invitation._id)];

        if (!stats) continue;

        totalGuests += stats.totalGuests;
        approvedCount += stats.approvedCount;
        pendingRecords += stats.pendingRecords;
        declinedRecords += stats.declinedRecords;
        arrivedCount += stats.arrivedCount;
        actualArrivedCount += stats.actualArrivedCount;
      }

      const eventTitle = getEventTitle(event, mainInvitation);
      const eventDate = getEventDate(event, mainInvitation);
      const eventLocation = getEventLocation(event, mainInvitation);

      const clientName = client.name || "לקוח ללא שם";

      const normalizedCalendarItems = eventCalendarItems.map((item: any) => {
        const itemType = getCalendarType(item);
        const itemTitle = getCalendarTitle(item);
        const itemDate = getCalendarDate(item);
        const itemTime = getCalendarTime(item);
        const itemDescription = getCalendarDescription(item);
        const itemLocation = getCalendarLocation(item);

        return {
          _id: item._id,
          eventId: item.eventId,

          clientId: client._id,
          clientName,

          eventTitle,
          eventName: eventTitle,

          type: itemType,
          calendarType: itemType,
          meetingType: itemType,
          typeLabel: getCalendarTypeLabel(itemType),

          title: itemTitle,
          entityName: itemTitle,
          name: itemTitle,
          subject: itemTitle,

          date: itemDate,
          meetingDate: itemDate,
          eventDate: itemDate,
          dueDate: itemDate,

          time: itemTime,
          meetingTime: itemTime,
          eventTime: itemTime,
          hour: itemTime,

          description: itemDescription,
          notes: itemDescription,
          summary: itemDescription,
          message: itemDescription,

          location: itemLocation,
          address: itemLocation,
          zoomLink: item.zoomLink || "",

          status: item.status || "planned",

          syncToProducerCalendar: item.syncToProducerCalendar !== false,

          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });

      const rsvpStats = {
        totalGuests,
        approvedCount,
        pendingRecords,
        declinedRecords,
        arrivedCount,
        actualArrivedCount,
      };

      return {
        ...client,

        rsvpStats,

        event: {
          _id: event._id,

          title: eventTitle,
          eventTitle,
          eventName: eventTitle,
          name: eventTitle,

          date: eventDate,
          eventDate,

          location: eventLocation,

          totalGuests,
          approvedCount,
          pendingRecords,
          declinedRecords,
          arrivedCount,
          actualArrivedCount,

          rsvpStats,
        },

        invitation: mainInvitation
          ? {
              _id: mainInvitation._id,

              title: getEventTitle(null, mainInvitation),
              eventTitle: getEventTitle(null, mainInvitation),
              eventName: getEventTitle(null, mainInvitation),
              invitationTitle: getEventTitle(null, mainInvitation),

              eventDate: mainInvitation.eventDate || null,
              eventTime: mainInvitation.eventTime || null,

              location:
                typeof mainInvitation.location === "object"
                  ? mainInvitation.location?.address ||
                    mainInvitation.location?.name ||
                    ""
                  : mainInvitation.location || "",

              rsvpStats,
            }
          : null,

        /*
          זה השדה שיומן המפיק צריך לקרוא:
          client.calendarItems
          כל פריט כבר כולל clientName + eventTitle + title + date + time
        */
        calendarItems: normalizedCalendarItems,
      };
    });

    console.log("✅ FINAL RESULT COUNT:", result.length);

    return NextResponse.json({
      success: true,
      clients: result,
    });
  } catch (error) {
    console.error("❌ ERROR FETCHING PRODUCER CLIENTS:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch clients",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH – Update Producer Client
   Route: /api/producer/clients

   בלי route חדש.
   הפרונט צריך לשלוח:
   PATCH /api/producer/clients
   body: { clientId, phone }
========================================================= */

export async function PATCH(req: NextRequest) {
  try {
    console.log("🟣 [PRODUCER CLIENTS PATCH] Route called");

    await dbConnect();

    /* =========================
       Auth – Producer
    ========================= */
    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId || auth.role !== "producer") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const clientId = String(body?.clientId || "").trim();

    if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid clientId",
        },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {};

    if (typeof body.phone === "string") {
      updates.phone = body.phone.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid fields to update",
        },
        { status: 400 }
      );
    }

    const producerObjectId = new mongoose.Types.ObjectId(auth.userId);

    const updatedClient = await User.findOneAndUpdate(
      {
        _id: clientId,
        assignedProducerId: producerObjectId,
        role: {
          $in: ["client", "user"],
        },
      },
      {
        $set: updates,
      },
      {
        new: true,
      }
    )
      .select("name email phone createdAt assignedProducerId billingSource role")
      .lean();

    if (!updatedClient) {
      return NextResponse.json(
        {
          success: false,
          message: "Client not found for this producer",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      client: updatedClient,
    });
  } catch (error) {
    console.error("❌ ERROR UPDATING PRODUCER CLIENT:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update client",
      },
      { status: 500 }
    );
  }
}