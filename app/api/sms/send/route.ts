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
import SeatingTable from "@/models/SeatingTable";

/* ======================================================
   TYPES
====================================================== */
type MessageTemplateKey = "rsvp" | "table" | "custom";
type FilterType = "all" | "pending" | "withTable";


 function countBusinessSms(text: string) {
  const length = [...text].length; // Unicode safe

  if (length <= 200) return 1;
  if (length <= 320) return 2;

  return -1; // חסום מעל 320
}



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
const maxMessages =
  typeof user.maxMessages === "number" ? user.maxMessages : 0;

const smsUsed =
  typeof user.smsUsed === "number" ? user.smsUsed : 0;

const remainingMessages = Math.max(
  (typeof user.maxMessages === "number" ? user.maxMessages : 0) -
  (typeof user.smsUsed === "number" ? user.smsUsed : 0),
  0
);


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
    let navigationLink = "";

if (hasLocation) {
  const wazeUrl = `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`;
  navigationLink = await shortenUrl(wazeUrl);
}


    /* ================= SCHEDULE ================= */
    if (scheduledAt) {
  const guestsCount = await InvitationGuest.countDocuments(guestsQuery);

  /* 🧮 חישוב worst-case */
  let previewContent = baseTemplateText
    .replace(/{{name}}/g, "שם מלא לדוגמה ארוך מאוד")
    .replace(/{{rsvpLink}}/g, "https://example.com/very-long-link")
    .replace(/{{tableName}}/g, "שולחן 123")
    .replace(/{{navigationLink}}/g, navigationLink);

  if (includeGiftLink && giftLink) {
    previewContent += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
  }

  const partsPerMessage = countBusinessSms(previewContent);

if (partsPerMessage === -1) {
  return NextResponse.json(
    {
      success: false,
      error: "MESSAGE_TOO_LONG",
      maxParts: 2,
      totalChars: [...previewContent].length,
    },
    { status: 400 }
  );
}


  const totalMessagesToCharge = guestsCount * partsPerMessage;

  if (totalMessagesToCharge > remainingMessages) {
    return NextResponse.json(
      {
        success: false,
        error: "SMS_LIMIT_REACHED",
        required: totalMessagesToCharge,
        remaining: remainingMessages,
      },
      { status: 403 }
    );
  }

  /* 📦 התוכן האמיתי שנשמר */
  let messageContent = baseTemplateText
    .replace(/{{name}}/g, "{{name}}")
    .replace(/{{rsvpLink}}/g, "{{rsvpLink}}")
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

    /* ================= BASE MESSAGE ================= */

const baseMessage = baseTemplateText
  .replace(/{{name}}/g, "{{name}}")
  .replace(/{{rsvpLink}}/g, "{{rsvpLink}}")
  .replace(/{{tableName}}/g, "{{tableName}}")
  .replace(/{{navigationLink}}/g, navigationLink);










    if (!guests.length) {
  return NextResponse.json({
    success: true,
    sent: 0,
    partsPerMessage: 0,
    charged: 0,
  });
}






    
let totalPartsSent = 0;


    let sent = 0;

    for (const guest of guests) {

      if (
        template.requiresTable &&
        !guest.tableName &&
        typeof guest.tableNumber !== "number"
      ) {
        continue;
      }

      let tableName = "";

if (guest.tableId) {
  const table = await SeatingTable.findById(guest.tableId).lean();

  if (table) {
    tableName =
      table.name ||
      (typeof table.number === "number"
        ? `שולחן ${table.number}`
        : "");
  }
}


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
  .replace(/{{tableName}}/g, tableName)
  .replace(/{{navigationLink}}/g, navigationLink);

if (includeGiftLink && giftLink) {
  finalText += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
}

const parts = countBusinessSms(finalText);


if (parts === -1) {
  continue; // ⬅️ מדלג רק על האורח הזה
}



// 🔒 בדיקת יתרה אמיתית
if (totalPartsSent + parts > remainingMessages) {
  continue;
}




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

        if (res.ok) {
  sent++;
  totalPartsSent += parts;
}

      } catch (err) {
        console.error("❌ SMS SEND ERROR:", err);
      }
    }

  


    if (totalPartsSent > 0) {
  await User.updateOne(
    { _id: user._id },
    { $inc: { smsUsed: totalPartsSent } }
  );
}



    return NextResponse.json({
  success: true,
  sent,
  charged: totalPartsSent,
});



    
  } catch (err: any) {
    console.error("❌ SMS API CRASH:", err);
    return NextResponse.json(
      { success: false, error: "SMS_SEND_FAILED" },
      { status: 500 }
    );
  }
}
