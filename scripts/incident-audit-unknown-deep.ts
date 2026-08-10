import mongoose from "mongoose";
import { readFileSync, writeFileSync } from "fs";
const uri = readFileSync("/tmp/prod-mongo-uri.txt", "utf8").trim();
const emails = ["daniela58910275@gmail.com", "atiassseli@gmail.com", "efratattiasss@gmail.com"];

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db!;
  const out: any = { users: [], eventsUserIdIntegrity: {} };

  for (const email of emails) {
    const u = await db.collection("users").findOne({ email });
    if (!u) {
      out.users.push({ email, missing: true });
      continue;
    }
    const byUserId = await db.collection("events").find({ userId: u._id }).toArray();
    const byEmail = await db.collection("events").find({ email }).toArray();
    const invOwner = await db.collection("invitations").find({ ownerId: u._id }).toArray();
    const invUser = await db.collection("invitations").find({ userId: u._id }).toArray();
    const payments = await db.collection("payments").find({ userId: u._id }).toArray();
    const sales = await db.collection("salesdocuments").find({
      $or: [{ userId: u._id }, { customerId: u._id }, { email }],
    }).limit(10).toArray();

    out.users.push({
      email,
      userId: String(u._id),
      role: u.role,
      hasPaid: u.hasPaid,
      isActive: u.isActive,
      paidAmount: u.paidAmount ?? u.amountPaid ?? null,
      billingSource: u.billingSource ?? null,
      plan: u.plan ?? u.priceKey ?? null,
      priceKey: u.priceKey ?? null,
      guestsField: u.guests ?? u.maxGuests ?? null,
      eventDate: u.eventDate ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      eventsByUserId: byUserId.map((e) => ({ id: String(e._id), status: e.status, date: e.date })),
      eventsByEmail: byEmail.map((e) => ({ id: String(e._id), userId: String(e.userId), status: e.status, date: e.date })),
      invitationsOwner: invOwner.map((i) => ({ id: String(i._id), eventId: i.eventId ? String(i.eventId) : null })),
      invitationsUser: invUser.map((i) => ({ id: String(i._id), eventId: i.eventId ? String(i.eventId) : null })),
      payments: payments.map((p) => ({
        id: String(p._id),
        status: p.status,
        amount: p.amount ?? p.paidAmount ?? null,
        eventId: p.eventId ? String(p.eventId) : null,
        createdAt: p.createdAt,
      })),
      salesDocs: sales.map((s) => ({
        id: String(s._id),
        type: s.type || s.docType || null,
        status: s.status || null,
        createdAt: s.createdAt,
      })),
      accessModules: u.accessModules || null,
    });
  }

  // Re-check events whose userId supposedly missing
  const users = await db.collection("users").find({}, { projection: { _id: 1 } }).toArray();
  const userIdStr = new Set(users.map((u) => String(u._id)));
  const events = await db.collection("events").find({}, { projection: { _id: 1, userId: 1, email: 1 } }).toArray();
  const missing = [];
  for (const e of events) {
    const uid = e.userId ? String(e.userId) : "";
    if (!uid || !userIdStr.has(uid)) {
      missing.push({ eventId: String(e._id), userId: uid || null, email: e.email || null });
    }
  }
  out.eventsUserIdIntegrity = {
    totalEvents: events.length,
    missingUserCount: missing.length,
    missingSample: missing.slice(0, 30),
  };

  // Paid active customers access expected
  const paid = await db.collection("users").find({ hasPaid: true, role: "user" }).toArray();
  out.paidUserSummary = {
    total: paid.length,
    active: paid.filter((u) => u.isActive === true).length,
    inactive: paid.filter((u) => u.isActive === false).length,
  };

  writeFileSync("/tmp/incident/exports/audit-unknown-deep.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
