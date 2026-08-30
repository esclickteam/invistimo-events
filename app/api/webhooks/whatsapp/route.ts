import { NextResponse } from "next/server";
import db from "@/lib/db";
import WhatsappQueue from "@/models/WhatsappQueue";
import CustomerFile from "@/models/CustomerFile";
import CustomerLeadMessage from "@/models/CustomerLeadMessage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizePhoneForWhatsapp(value: unknown) {
  const digits = cleanString(value).replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("972")) return digits;

  if (digits.startsWith("0")) {
    return `972${digits.slice(1)}`;
  }

  return digits;
}

function toLocalIsraeliPhone(value: unknown) {
  const digits = normalizePhoneForWhatsapp(value);

  if (!digits) return "";

  if (digits.startsWith("972")) {
    return `0${digits.slice(3)}`;
  }

  return digits;
}

function getPhoneCandidates(value: unknown) {
  const whatsappPhone = normalizePhoneForWhatsapp(value);
  const localPhone = toLocalIsraeliPhone(value);

  return Array.from(
    new Set(
      [
        cleanString(value),
        whatsappPhone,
        localPhone,
        whatsappPhone ? `+${whatsappPhone}` : "",
      ].filter(Boolean)
    )
  );
}

function getTimestamp(value: unknown) {
  const timestamp = Number(value || 0);

  if (Number.isFinite(timestamp) && timestamp > 0) {
    return new Date(timestamp * 1000);
  }

  return new Date();
}

function getIncomingTextMessage(message: any) {
  const type = cleanString(message?.type);

  if (type === "text") {
    return cleanString(message?.text?.body);
  }

  if (type === "button") {
    return (
      cleanString(message?.button?.text) ||
      cleanString(message?.button?.payload)
    );
  }

  if (type === "interactive") {
    return (
      cleanString(message?.interactive?.button_reply?.title) ||
      cleanString(message?.interactive?.button_reply?.id) ||
      cleanString(message?.interactive?.list_reply?.title) ||
      cleanString(message?.interactive?.list_reply?.id)
    );
  }

  if (type === "image") {
    return cleanString(message?.image?.caption) || "התקבלה תמונה";
  }

  if (type === "document") {
    return cleanString(message?.document?.caption) || "התקבל מסמך";
  }

  if (type === "audio") {
    return "התקבלה הודעה קולית";
  }

  if (type === "video") {
    return cleanString(message?.video?.caption) || "התקבל וידאו";
  }

  if (type === "sticker") {
    return "התקבלה מדבקה";
  }

  if (type === "location") {
    return "התקבל מיקום";
  }

  if (type) {
    return `התקבלה הודעת WhatsApp מסוג ${type}`;
  }

  return "התקבלה הודעת WhatsApp";
}

async function findOrCreateCustomerFileByIncomingPhone({
  fromPhone,
  messageText,
  rawPayload,
}: {
  fromPhone: string;
  messageText: string;
  rawPayload: any;
}) {
  const candidates = getPhoneCandidates(fromPhone);

  let customer = await CustomerFile.findOne({
    phone: { $in: candidates },
  });

  if (customer) {
    return customer;
  }

  const profileName =
    cleanString(rawPayload?.profile?.name) ||
    cleanString(rawPayload?.contacts?.[0]?.profile?.name) ||
    "";

  customer = await CustomerFile.create({
    userId: null,
    invitationId: null,

    fullName: profileName || "ליד WhatsApp",
    email: "",
    phone: toLocalIsraeliPhone(fromPhone) || normalizePhoneForWhatsapp(fromPhone),

    eventDate: null,
    venueName: "",
    city: "",

    packageName: "",
    packageBasePrice: 0,
    packageTargetPriceWithCalls: 0,

    hasCallRounds: false,
    allowedCallRounds: 0,

    totalPrice: 0,
    paidAmount: 0,
    balance: 0,

    status: "lead",

    leadSource: "whatsapp",
    leadProvider: "360dialog",
    leadStatus: "new",
    interestedService: "",
    facebookLeadId: "",
    campaignName: "",
    adName: "",
    formName: "",
    source: "whatsapp_incoming",

    notes: messageText
      ? `פנייה נכנסת מ־WhatsApp:\n${messageText}`
      : "פנייה נכנסת מ־WhatsApp",
  });

  return customer;
}

function getWamidMatchQuery(wamid: string) {
  const cleanWamid = cleanString(wamid);
  const withoutPrefix = cleanWamid.replace(/^wamid\./i, "");
  const withPrefix = withoutPrefix ? `wamid.${withoutPrefix}` : "";

  const wamidValues = Array.from(
    new Set([cleanWamid, withoutPrefix, withPrefix].filter(Boolean))
  );

  return { wamid: { $in: wamidValues } };
}

async function updateWhatsappQueueStatus({
  wamid,
  state,
  timestamp,
  phone,
  status,
}: {
  wamid: string;
  state: string;
  timestamp: Date;
  phone: string | null;
  status: any;
}) {
  const errorCode =
    status?.errors?.[0]?.code ?? status?.errors?.[0]?.error_code ?? null;

  const errorMessage =
    status?.errors?.[0]?.title ??
    status?.errors?.[0]?.message ??
    status?.errors?.[0]?.error_data?.details ??
    null;

  const queueQuery = getWamidMatchQuery(wamid);

  if (state === "sent") {
    console.log("✅ SENT:", wamid);

    await WhatsappQueue.updateOne(
      {
        ...queueQuery,
        providerStatus: { $nin: ["delivered", "read"] },
      },
      {
        $set: {
          status: "sent",
          sentAt: timestamp,
          wamid,
          providerStatus: "sent",
          lastError: null,
          errorCode: null,
          errorMessage: null,
        },
      }
    );

    await CustomerLeadMessage.updateOne(
      { providerMessageId: wamid },
      {
        $set: {
          status: "sent",
          errorMessage: "",
        },
      }
    );
  }

  if (state === "delivered") {
    console.log("📬 DELIVERED:", wamid);

    await WhatsappQueue.updateOne(
      {
        ...queueQuery,
        providerStatus: { $ne: "read" },
      },
      {
        $set: {
          status: "sent",
          deliveredAt: timestamp,
          wamid,
          providerStatus: "delivered",
          lastError: null,
          errorCode: null,
          errorMessage: null,
        },
      }
    );

    await CustomerLeadMessage.updateOne(
      { providerMessageId: wamid },
      {
        $set: {
          status: "delivered",
          errorMessage: "",
        },
      }
    );
  }

  if (state === "read") {
    console.log("👀 READ:", wamid);

    await WhatsappQueue.updateOne(
      queueQuery,
      {
        $set: {
          status: "sent",
          readAt: timestamp,
          wamid,
          providerStatus: "read",
          lastError: null,
          errorCode: null,
          errorMessage: null,
        },
      }
    );

    await CustomerLeadMessage.updateOne(
      { providerMessageId: wamid },
      {
        $set: {
          status: "read",
          errorMessage: "",
        },
      }
    );
  }

  if (state === "failed") {
    console.error("❌ FAILED MESSAGE:", {
      wamid,
      phone,
      errorCode,
      errorMessage,
    });

    await WhatsappQueue.updateOne(
      queueQuery,
      {
        $set: {
          status: "failed",
          failedAt: timestamp,
          wamid,
          providerStatus: "failed",
          lastError: errorMessage || "WHATSAPP_MESSAGE_FAILED",
          errorCode,
          errorMessage,
          failReason: {
            code: errorCode,
            message: errorMessage,
            raw: status?.errors?.[0] ?? status?.errors ?? null,
          },
          lockedAt: null,
          lockedBy: null,
        },
      }
    );

    await CustomerLeadMessage.updateOne(
      { providerMessageId: wamid },
      {
        $set: {
          status: "failed",
          errorMessage: errorMessage || "WHATSAPP_MESSAGE_FAILED",
        },
      }
    );
  }
}

async function saveIncomingWhatsappMessage({
  message,
  value,
}: {
  message: any;
  value: any;
}) {
  const providerMessageId = cleanString(message?.id);

  if (!providerMessageId) return;

  const existing = await CustomerLeadMessage.findOne({
    providerMessageId,
  }).lean();

  if (existing) {
    console.log("↩️ Incoming message already saved:", providerMessageId);
    return;
  }

  const fromPhone = normalizePhoneForWhatsapp(message?.from);
  const businessPhone =
    normalizePhoneForWhatsapp(value?.metadata?.display_phone_number) ||
    normalizePhoneForWhatsapp(value?.metadata?.phone_number_id);

  const messageText = getIncomingTextMessage(message);
  const timestamp = getTimestamp(message?.timestamp);

  if (!fromPhone) {
    console.warn("⚠️ Incoming WhatsApp message without from phone:", message);
    return;
  }

  const profile =
    Array.isArray(value?.contacts) && value.contacts.length > 0
      ? value.contacts.find((contact: any) => {
          return normalizePhoneForWhatsapp(contact?.wa_id) === fromPhone;
        }) || value.contacts[0]
      : null;

  const customer = await findOrCreateCustomerFileByIncomingPhone({
    fromPhone,
    messageText,
    rawPayload: {
      message,
      value,
      profile,
    },
  });

  const assignedStaffIds = Array.isArray((customer as any)?.assignedStaffIds)
    ? (customer as any).assignedStaffIds
    : [];

  const staffId = assignedStaffIds[0] || null;

  await CustomerLeadMessage.create({
    customerFileId: customer._id,
    staffId,
    direction: "incoming",
    channel: "whatsapp",
    from: fromPhone,
    to: businessPhone,
    messageText,
    provider: "360dialog",
    providerMessageId,
    status: "received",
    errorMessage: "",
    rawPayload: {
      message,
      value,
      profile,
    },
    createdAt: timestamp,
  });

  const nextNotes = cleanString((customer as any)?.notes)
    ? `${cleanString((customer as any)?.notes)}\n\nהודעת WhatsApp נכנסת (${timestamp.toLocaleString(
        "he-IL"
      )}):\n${messageText}`
    : `הודעת WhatsApp נכנסת (${timestamp.toLocaleString(
        "he-IL"
      )}):\n${messageText}`;

  await CustomerFile.updateOne(
    { _id: customer._id },
    {
      $set: {
        status: "lead",
        leadStatus:
          cleanString((customer as any)?.leadStatus) === "new"
            ? "contacted"
            : cleanString((customer as any)?.leadStatus) || "contacted",
        notes: nextNotes,
      },
    }
  );

  console.log("✅ Incoming WhatsApp message saved:", {
    providerMessageId,
    customerFileId: String(customer._id),
    fromPhone,
    messageText,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("📩 WhatsApp Webhook RAW BODY:");
    console.dir(body, { depth: null });

    await db();

    const entries = body?.entry ?? [];

    for (const entry of entries) {
      const changes = entry?.changes ?? [];

      for (const change of changes) {
        const value = change?.value ?? {};

        /**
         * 1. הודעות נכנסות מהלקוח
         */
        const messages = value?.messages ?? [];

        for (const message of messages) {
          try {
            console.log("💬 Incoming WhatsApp Message:", {
              id: message?.id,
              from: message?.from,
              type: message?.type,
              timestamp: message?.timestamp,
            });

            await saveIncomingWhatsappMessage({
              message,
              value,
            });
          } catch (messageError) {
            console.error("❌ SAVE INCOMING WHATSAPP MESSAGE ERROR:", messageError);
          }
        }

        /**
         * 2. עדכוני סטטוס להודעות יוצאות
         */
        const statuses = value?.statuses ?? [];

        for (const status of statuses) {
          const wamid = cleanString(status?.id);
          const state = cleanString(status?.status);

          const timestamp = getTimestamp(status?.timestamp);
          const phone = status?.recipient_id ?? null;

          console.log("📦 WhatsApp Status Update:", {
            wamid,
            state,
            phone,
            timestamp,
            errors: status?.errors ?? null,
          });

          if (!wamid || !state) continue;

          await updateWhatsappQueueStatus({
            wamid,
            state,
            timestamp,
            phone,
            status,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ WhatsApp Webhook error", err);

    return NextResponse.json({ ok: true });
  }
}