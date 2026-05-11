import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";

import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   HELPERS
========================================================= */

function getEventTitle(event: any, invitation: any) {
  return (
    event?.title ||
    event?.eventTitle ||
    event?.eventName ||
    event?.name ||
    event?.invitationTitle ||
    invitation?.title ||
    invitation?.eventTitle ||
    invitation?.eventName ||
    invitation?.invitationTitle ||
    invitation?.name ||
    ""
  );
}

function getEventDate(event: any) {
  return event?.date || event?.eventDate || null;
}

function getEventLocation(event: any) {
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

    const producerObjectId = new mongoose.Types.ObjectId(
      auth.userId
    );

    console.log(
      "🟢 Producer ObjectId:",
      producerObjectId.toString()
    );

    /* =========================
       Clients – by assignedProducerId
    ========================= */
    const clients = await User.find({
      assignedProducerId: producerObjectId,
      role: {
        $in: ["client", "user"],
      },
    })
      .select(
        "name email phone createdAt assignedProducerId billingSource"
      )
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

    console.log(
      "🧾 Client IDs:",
      clients.map((client: any) => ({
        _id: String(client._id),
        assignedProducerId: String(
          client.assignedProducerId
        ),
      }))
    );

    const clientIds = clients.map(
      (client: any) => client._id
    );

    /* =========================
       Events
       חשוב:
       כאן שולפים גם שם אירוע.
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

          // dates / place
          "date",
          "eventDate",
          "location",
          "venue",
          "place",

          // possible event title fields
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
      events.map((event: any) => [
        String(event.userId),
        event,
      ])
    );

    const eventIds = events.map(
      (event: any) => event._id
    );

    /* =========================
       Invitations
       גם כאן שולפים שדות שם.
    ========================= */
    const invitations = await Invitation.find({
      eventId: {
        $in: eventIds,
      },
    })
      .select(
        [
          "_id",
          "eventId",

          // possible invitation title fields
          "title",
          "eventTitle",
          "eventName",
          "name",
          "invitationTitle",
        ].join(" ")
      )
      .lean();

    console.log(
      "🟢 Invitations found:",
      invitations.length
    );

    const invitationsByEventId = invitations.reduce(
      (acc: any, invitation: any) => {
        const key = String(invitation.eventId);

        acc[key] = acc[key] || [];
        acc[key].push(invitation);

        return acc;
      },
      {}
    );

    const invitationIds = invitations.map(
      (invitation: any) => invitation._id
    );

    /* =========================
       Guests stats
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
                  $sum: "$guestsCount",
                },

                approvedCount: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ["$rsvp", "yes"],
                      },
                      "$guestsCount",
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

    console.log(
      "🟢 Guest stats rows:",
      guestStats.length
    );

    const statsByInvitationId = Object.fromEntries(
      guestStats.map((guest: any) => [
        String(guest._id),
        {
          totalGuests: guest.totalGuests || 0,
          approvedCount: guest.approvedCount || 0,
          arrivedCount: guest.arrivedCount || 0,
          actualArrivedCount:
            guest.actualArrivedCount || 0,
        },
      ])
    );

    /* =========================
       Merge Client + Event + Invitation + Stats
    ========================= */
    const result = clients.map((client: any) => {
      const event = eventsByUserId[String(client._id)];

      if (!event) {
        console.log(
          "⚠️ Client has NO event:",
          String(client._id)
        );

        return {
          ...client,
          event: null,
          invitation: null,
        };
      }

      const invitationsForEvent =
        invitationsByEventId[String(event._id)] || [];

      const mainInvitation =
        invitationsForEvent[0] || null;

      let totalGuests = 0;
      let approvedCount = 0;
      let arrivedCount = 0;
      let actualArrivedCount = 0;

      for (const invitation of invitationsForEvent) {
        const stats =
          statsByInvitationId[String(invitation._id)];

        if (!stats) continue;

        totalGuests += stats.totalGuests;
        approvedCount += stats.approvedCount;
        arrivedCount += stats.arrivedCount;
        actualArrivedCount += stats.actualArrivedCount;
      }

      const eventTitle = getEventTitle(
        event,
        mainInvitation
      );

      const eventDate = getEventDate(event);
      const eventLocation = getEventLocation(event);

      return {
        ...client,

        event: {
          _id: event._id,

          // title fields for frontend compatibility
          title: eventTitle,
          eventTitle,
          eventName: eventTitle,
          name: eventTitle,

          // date fields for frontend compatibility
          date: eventDate,
          eventDate,

          location: eventLocation,

          totalGuests,
          approvedCount,
          arrivedCount,
          actualArrivedCount,
        },

        invitation: mainInvitation
          ? {
              _id: mainInvitation._id,
              title: getEventTitle(null, mainInvitation),
              eventTitle: getEventTitle(
                null,
                mainInvitation
              ),
            }
          : null,
      };
    });

    console.log("✅ FINAL RESULT COUNT:", result.length);

    return NextResponse.json({
      success: true,
      clients: result,
    });
  } catch (error) {
    console.error(
      "❌ ERROR FETCHING PRODUCER CLIENTS:",
      error
    );

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
    console.log(
      "🟣 [PRODUCER CLIENTS PATCH] Route called"
    );

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

    if (
      !clientId ||
      !mongoose.Types.ObjectId.isValid(clientId)
    ) {
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

    const producerObjectId = new mongoose.Types.ObjectId(
      auth.userId
    );

    /*
      לפי ה־GET שלך, לקוח שייך למפיק דרך assignedProducerId.
      לכן גם העדכון מוגבל רק ללקוח ששייך לאותו מפיק.
    */
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
      .select(
        "name email phone createdAt assignedProducerId billingSource role"
      )
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
    console.error(
      "❌ ERROR UPDATING PRODUCER CLIENT:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update client",
      },
      { status: 500 }
    );
  }
}