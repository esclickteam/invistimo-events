import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import CustomerFile from "@/models/CustomerFile";
import {
  CONTACT_FORM_LEAD_PROVIDER,
  CONTACT_FORM_LEAD_SOURCE,
  buildContactLeadPayload,
  isValidContactPhone,
  normalizeContactPhone,
  type ContactLeadInput,
} from "@/lib/contact/contactPhone";

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

function cleanString(value: unknown) {
  return String(value || "").trim();
}

async function getLeadOwnerUser() {
  const envUserId = cleanString(
    process.env.SUPPORT_LEADS_USER_ID ||
      process.env.ADMIN_USER_ID ||
      process.env.NEXT_PUBLIC_ADMIN_USER_ID
  );

  if (envUserId && mongoose.Types.ObjectId.isValid(envUserId)) {
    const user = await User.findById(envUserId).select("_id").lean();
    if (user?._id) return user;
  }

  const envEmail = cleanString(
    process.env.SUPPORT_LEADS_EMAIL || process.env.ADMIN_EMAIL
  ).toLowerCase();

  if (envEmail) {
    const user = await User.findOne({ email: envEmail }).select("_id").lean();
    if (user?._id) return user;
  }

  return User.findOne({
    $or: [{ role: "admin" }, { role: "owner" }, { role: "staff" }],
  })
    .sort({ createdAt: 1 })
    .select("_id")
    .lean();
}

/**
 * Opens a CRM lead for a contact-form phone number.
 * Writes a CustomerFile only. Does not message the person who submitted the form.
 */
export async function openContactFormLead(input: ContactLeadInput) {
  const phone = normalizeContactPhone(input.phone);

  if (!isValidContactPhone(phone)) {
    throw new Error("INVALID_CONTACT_PHONE");
  }

  const payload = buildContactLeadPayload({
    ...input,
    phone,
  });

  await db();

  const existing = await CustomerFile.findOne({
    phone,
    status: "lead",
    leadSource: CONTACT_FORM_LEAD_SOURCE,
    leadProvider: CONTACT_FORM_LEAD_PROVIDER,
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
  }).sort({ createdAt: -1 });

  if (existing) {
    const previousNotes = cleanString(existing.notes);
    const nextNotes = previousNotes.startsWith(payload.notes)
      ? previousNotes
      : [payload.notes, previousNotes ? `---\nפנייה קודמת:\n${previousNotes}` : ""]
          .filter(Boolean)
          .join("\n")
          .slice(0, 8000);

    existing.set({
      fullName: payload.fullName || existing.fullName,
      email: payload.email || existing.email,
      interestedService: payload.interestedService,
      notes: nextNotes,
      formName: payload.formName,
      campaignName: payload.campaignName,
    });
    await existing.save();

    return {
      leadId: String(existing._id),
      existing: true,
    };
  }

  const ownerUser = await getLeadOwnerUser();

  if (!ownerUser?._id) {
    throw new Error("CONTACT_LEAD_OWNER_MISSING");
  }

  const lead = await CustomerFile.create({
    ...payload,
    userId: ownerUser._id,
  });

  return {
    leadId: String(lead._id),
    existing: false,
  };
}
