import mongoose from "mongoose";
import { readFileSync, writeFileSync } from "fs";
const uri = readFileSync("/tmp/prod-mongo-uri.txt", "utf8").trim();
const emails = [
  "dorpin11@gmail.com",
  "mali.paz1983@gmail.com",
  "avia5956@gmail.com",
  "daniela58910275@gmail.com",
  "atiassseli@gmail.com",
  "efratattiasss@gmail.com",
];
async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db!;
  const out = [];
  for (const email of emails) {
    const u = await db.collection("users").findOne({ email });
    if (!u) { out.push({ email, missing: true }); continue; }
    const payments = await db.collection("payments").find({ $or: [{ userId: u._id }, { email }] }).toArray();
    const sales = await db.collection("salesdocuments").find({ $or: [{ userId: u._id }, { email }, { customerEmail: email }] }).limit(5).toArray();
    const eventsEmail = await db.collection("events").countDocuments({ email });
    const eventsUser = await db.collection("events").countDocuments({ userId: u._id });
    const inv = await db.collection("invitations").countDocuments({ ownerId: u._id });
    out.push({
      email,
      role: u.role,
      hasPaid: u.hasPaid,
      isActive: u.isActive,
      paidAmount: u.paidAmount ?? null,
      billingSource: u.billingSource ?? null,
      plan: u.plan ?? u.priceKey ?? null,
      eventDate: u.eventDate ?? null,
      guestsField: u.guests ?? null,
      maxGuests: u.maxGuests ?? null,
      paymentsCount: payments.length,
      paymentStatuses: payments.map((p) => p.status),
      salesCount: sales.length,
      eventsByUserId: eventsUser,
      eventsByEmail: eventsEmail,
      invitations: inv,
      notes: u.adminNotes || u.notes || null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });
  }
  writeFileSync("/tmp/incident/exports/audit-paid-no-event.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await mongoose.disconnect();
}
main().catch((e)=>{console.error(e);process.exit(1);});
