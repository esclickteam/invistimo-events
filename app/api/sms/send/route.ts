import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import User from "@/models/User";
import ScheduledMessage from "@/models/ScheduledMessage";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { shortenUrl } from "@/lib/shortenUrl";
import { countSmsParts } from "@/lib/smsUtils";

/* ======================================================
   TYPES
====================================================== */
type MessageTemplateKey = "rsvp" | "table" | "custom";
type FilterType = "all" | "pending" | "withTable";

/* ======================================================
   MESSAGE TEMPLATES – SERVER SOURCE OF TRUTH
====================================================== */
const MESSAGE_TEMPLATES: Record<
  MessageTemplateKey,
  { requiresTable?: boolean; content: string }
> = {
  rsvp: {
    content:
      "היי {{name}},\n" +
      "נשמח לדעת אם תגיעו לחגוג איתנו 🎉\n\n" +
      "לאישור הגעה לחצו כאן:\n" +
      "{{rsvpLink}}\n\n" +
      "מחכים לכם באהבה 💖",
  },
  table: {
    requiresTable: true,
    content:
      "היי {{name}} 🌸 שמחים לראות אותך 💛\n" +
      "מספר השולחן שלך באירוע:\n" +
      "🪑 {{tableName}}\n\n" +
      "ניווט לאירוע:\n" +
      "{{navigationLink}}\n\n" +
      "מחכים לך!",
  },
  custom: {
    content:
      "היי {{name}} 🌸\n" +
      "שמחנו לראותכם באירוע.\n" +
      "תודה שהשתתפתם בשמחתנו.",
  },
};

async function shortenUrlsInText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex);

  if (!urls) return text;

  let result = text;

  for (const url of urls) {
    const shortUrl = await shortenUrl(url);
    result = result.replace(url, shortUrl);
  }

  return result;
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { success: false, error: "INVALID_TOKEN" },
        { status: 401 }
      );
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 401 }
      );
    }

    /* ================= BALANCE ================= */
    const isTrial = !!user.isTrial;

    const maxMessages = isTrial
      ? typeof user.planLimits?.smsLimit === "number"
        ? user.planLimits.smsLimit
        : 0
      : typeof user.maxMessages === "number"
      ? user.maxMessages
      : 0;

    const smsUsed = typeof user.smsUsed === "number" ? user.smsUsed : 0;
    const remainingMessages = Math.max(maxMessages - smsUsed, 0);

    if (remainingMessages <= 0) {
      return NextResponse.json(
        { success: false, error: "SMS_LIMIT_REACHED" },
        { status: 403 }
      );
    }

    /* ================= BODY ================= */
    const body = (await req.json()) as {
  invitationId?: string;
  filter?: FilterType;
  templateKey?: MessageTemplateKey;
  scheduledAt?: string;
  includeGiftLink?: boolean;
  giftLink?: string;
  messageOverride?: string;

  guestIds?: string[]; // ⭐️ חדש – מקור האמת
};

    const {
  invitationId,
  filter = "all",
  templateKey,
  scheduledAt,
  includeGiftLink,
  giftLink,
  messageOverride,
  guestIds,
} = body;

    if (!invitationId || !templateKey) {
      return NextResponse.json(
        { success: false, error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    const template = MESSAGE_TEMPLATES[templateKey];
    if (!template) {
      return NextResponse.json(
        { success: false, error: "INVALID_TEMPLATE" },
        { status: 400 }
      );
    }

    if (template.requiresTable && filter !== "withTable") {
      return NextResponse.json(
        { success: false, error: "INVALID_FILTER_FOR_TABLE_MESSAGE" },
        { status: 400 }
      );
    }

    /* ⭐️ בחירת מקור הטקסט */
    const baseTemplateText =
      messageOverride &&
      messageOverride.trim() !== template.content.trim()
        ? messageOverride
        : template.content;

    /* ================= INVITATION ================= */
    const invitation = await Invitation.findById(invitationId).lean();
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INV_NOT_FOUND" },
        { status: 404 }
      );
    }

    const event = invitation.eventId
      ? await Event.findById(invitation.eventId).lean()
      : null;

    /* ================= QUERY ================= */
    const query: any = { invitationId };
    if (filter === "pending") query.rsvp = "pending";

    if (filter === "withTable") {
  query.$or = [
    { tableName: { $exists: true, $ne: "" } },
    { tableNumber: { $ne: null } },
  ];
}

/* ================= TARGET GUESTS ================= */
let guestsQuery: any;

if (Array.isArray(guestIds) && guestIds.length > 0) {
  // ⭐️ מקור אמת מה־UI
  guestsQuery = {
    _id: { $in: guestIds },
    invitationId,
  };
} else {
  // fallback – התנהגות ישנה
  guestsQuery = query;
}


    const location = invitation.eventLocation ?? event?.location;
    const hasLocation = !!(location?.lat && location?.lng);
    const navigationLink = hasLocation
      ? `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`
      : "";

    /* ================= SCHEDULE ================= */
    if (scheduledAt) {
      const guestsCount = await InvitationGuest.countDocuments(guestsQuery);


      if (guestsCount > remainingMessages) {
        return NextResponse.json(
          { success: false, error: "SMS_LIMIT_REACHED" },
          { status: 403 }
        );
      }

      let messageContent = baseTemplateText
        .replace(/{{name}}/g, "{{name}}")
        .replace(
          /{{rsvpLink}}/g,
          `https://www.invistimo.com/invite/${invitation.shareId}?token={{token}}`
        )
        .replace(/{{tableName}}/g, "{{tableName}}")
        .replace(/{{navigationLink}}/g, navigationLink);

      if (includeGiftLink && giftLink) {
        messageContent += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
      }



      await ScheduledMessage.create({
  invitationId,
  userId: user._id,
  channel: "sms",
  filter,
  templateKey,
  scheduledAt: new Date(scheduledAt),
  guestsCount,
  status: "scheduled",
  includeGiftLink: !!includeGiftLink,
  giftLink: giftLink || null,
  messageContent,

  // ⭐️ קריטי
  guestIds: Array.isArray(guestIds) ? guestIds : [],
});

      return NextResponse.json({
        success: true,
        scheduled: true,
        guestsCount,
      });
    }

    /* ================= SEND NOW ================= */
    const guests = await InvitationGuest.find(guestsQuery).lean();

    if (!guests.length) {
      return NextResponse.json({ success: true, sent: 0, total: 0 });
    }

    const baseMessage = baseTemplateText
      .replace(/{{name}}/g, "{{name}}")
      .replace(
        /{{rsvpLink}}/g,
        `https://www.invistimo.com/invite/${invitation.shareId}?token={{token}}`
      )
      .replace(/{{tableName}}/g, "{{tableName}}")
      .replace(/{{navigationLink}}/g, navigationLink);

    let sent = 0;

    for (const guest of guests) {
      if (sent >= remainingMessages) break;

      if (
        template.requiresTable &&
        !guest.tableName &&
        typeof guest.tableNumber !== "number"
      ) {
        continue;
      }

      const tableName =
        guest.tableName ||
        (typeof guest.tableNumber === "number"
          ? `שולחן ${guest.tableNumber}`
          : "");

      let phone = (guest.phone || "").replace(/\D/g, "");
      if (!phone) continue;

      if (phone.startsWith("0")) phone = "972" + phone.slice(1);
      else if (!phone.startsWith("972")) phone = "972" + phone;

      // 🔗 קישור RSVP אישי
const personalRsvpUrl =
  `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;

// ✂️ קיצור הקישור האישי
const shortRsvpUrl = await shortenUrl(personalRsvpUrl);

let finalText = baseMessage
  .replace(/{{name}}/g, guest.name || "")
  .replace(/{{rsvpLink}}/g, shortRsvpUrl)
  .replace(/{{tableName}}/g, tableName);


      if (includeGiftLink && giftLink) {
        finalText += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
      }

      // ✂️ קיצור אוטומטי של כל הקישורים
finalText = await shortenUrlsInText(finalText);


      try {
        const res = await fetch(
          "https://api.sms4free.co.il/ApiSMS/v2/SendSMS",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: process.env.SMS4FREE_KEY,
              user: process.env.SMS4FREE_USER,
              pass: process.env.SMS4FREE_PASS,
              sender: process.env.SMS4FREE_SENDER,
              recipient: phone,
              msg: finalText,
            }),
          }
        );

        if (res.ok) sent++;
      } catch (err) {
        console.error("❌ SMS SEND ERROR:", err);
      }
    }

    if (sent > 0) {
      await User.findByIdAndUpdate(user._id, {
        $inc: { smsUsed: sent },
      });
    }

    return NextResponse.json({
      success: true,
      sent,
      total: guests.length,
      limited: sent < guests.length,
    });
  } catch (err: any) {
    console.error("❌ SMS API CRASH:", err);
    return NextResponse.json(
      { success: false, error: "SMS_SEND_FAILED" },
      { status: 500 }
    );
  }
}
