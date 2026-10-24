/**
 * Isolated local demo for the invitation studio.
 * Requires MONGO_URI pointing at a non-production database and JWT_SECRET.
 * Does not send WhatsApp, SMS, or a live charge.
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import InvitationStudioDesign from "@/models/InvitationStudioDesign";
import { getStudioTemplate } from "@/lib/invitationStudio/templates";
import { freezeSnapshot } from "@/lib/invitationStudio/render";
import { contentFromEvent } from "@/lib/invitationStudio/prefill";

const EMAIL = "studio-demo@invistimo.test";
const ADMIN_EMAIL = "studio-admin@invistimo.test";
const SHARE_ID = "studioDemo1";
const GUEST_TOKEN = "studioGuest1";

async function main() {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET missing");
  await connectDB();

  const password = await bcrypt.hash("studio-demo", 8);
  const owner = await User.findOneAndUpdate(
    { email: EMAIL },
    {
      $set: {
        name: "דמו סטודיו",
        email: EMAIL,
        password,
        role: "user",
        plan: "plan1",
        paidAmount: 1,
        hasPaid: true,
        isActive: true,
        authVersion: 0,
        needsPasswordSetup: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $set: {
        name: "אדמין סטודיו",
        email: ADMIN_EMAIL,
        password,
        role: "admin",
        plan: "plan1",
        paidAmount: 1,
        hasPaid: true,
        isActive: true,
        authVersion: 0,
        needsPasswordSetup: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const event = await Event.findOneAndUpdate(
    { email: EMAIL, title: "החתונה של נועה ודני — סטודיו" },
    {
      $set: {
        userId: owner._id,
        email: EMAIL,
        title: "החתונה של נועה ודני — סטודיו",
        eventType: "wedding",
        date: "2027-06-10",
        time: "19:30",
        location: { name: "אולם הגן", address: "הרצליה" },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const invitation = await Invitation.findOneAndUpdate(
    { shareId: SHARE_ID },
    {
      $set: {
        ownerId: owner._id,
        eventId: event._id,
        title: "נועה ודני",
        eventType: "wedding",
        eventDate: new Date("2027-06-10T12:00:00.000Z"),
        eventTime: "19:30",
        location: { name: "אולם הגן", address: "הרצליה" },
        canvasData: {},
        standaloneGame: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await InvitationGuest.findOneAndUpdate(
    { token: GUEST_TOKEN },
    {
      $set: {
        invitationId: invitation._id,
        name: "יעל כהן",
        phone: "0500000199",
        token: GUEST_TOKEN,
        rsvp: "pending",
        status: "pending",
        arrivedCount: 0,
        amount: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const template = getStudioTemplate("wedding-gold-frame");
  if (!template) throw new Error("template missing");
  const snapshot = freezeSnapshot(template, {
    personalGreeting: true,
    content: contentFromEvent(template, invitation, event),
  });
  snapshot.content.hostNames = "נועה ודני";
  const design = await InvitationStudioDesign.findOneAndUpdate(
    { ownerId: owner._id, templateId: template.id, invitationId: invitation._id },
    {
      $set: {
        ownerId: owner._id,
        invitationId: invitation._id,
        eventId: event._id,
        templateId: template.id,
        status: "draft",
        snapshot,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const token = jwt.sign(
    { userId: String(owner._id), role: "user", authVersion: 0 },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
  const adminToken = jwt.sign(
    { userId: String((await User.findOne({ email: ADMIN_EMAIL }))!._id), role: "admin", authVersion: 0 },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  console.log(
    JSON.stringify(
      {
        email: EMAIL,
        designId: String(design._id),
        shareId: SHARE_ID,
        guestToken: GUEST_TOKEN,
        personalUrl: `/invite/${SHARE_ID}?token=${GUEST_TOKEN}`,
        token,
        adminToken,
      },
      null,
      2
    )
  );
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
