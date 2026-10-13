/**
 * Customer deletion keeps quotes, signed agreements, and revenue.
 * Uses mongodb-memory-server, not production or staging.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import User from "../../models/User";
import Event from "../../models/Event";
import Invitation from "../../models/Invitation";
import InvitationGuest from "../../models/InvitationGuest";
import Guest from "../../models/Guest";
import ScheduledMessage from "../../models/ScheduledMessage";
import MobileRefreshToken from "../../models/MobileRefreshToken";
import SalesDocument from "../../models/SalesDocument";
import CustomerFile from "../../models/CustomerFile";
import CustomerQuote from "../../models/CustomerQuote";
import CustomerAgreement from "../../models/CustomerAgreement";
import Payment from "../../models/Payment";
import VenueEvent from "../../models/VenueEvent";
import RetainedCustomerFinancial from "../../models/RetainedCustomerFinancial";
import { deleteInvistimoCustomerAccount } from "../../lib/customers/deleteCustomerAccount";
import { sumRevenueBetween } from "../../lib/admin/revenuePayments";
import { toAdminSalesDocumentRow } from "../../lib/customers/adminSalesDocumentRow";
import { buildRetainedDocumentHtml } from "../../lib/customers/retainedDocumentHtml";

const paidAt = new Date("2026-03-15T12:00:00.000Z");
const rangeStart = new Date("2026-03-01T00:00:00.000Z");
const rangeEnd = new Date("2026-04-01T00:00:00.000Z");
const signatureImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("a deleted customer is labeled without a live user link", () => {
  const row = toAdminSalesDocumentRow(
    {
      _id: "doc1",
      type: "agreement",
      token: "agreement-token-12345678",
      status: "signed",
      client: { fullName: "דנה לוי", email: "dana@example.com" },
      convertedUserId: "a".repeat(24),
      originalUserId: "a".repeat(24),
      customerDeleted: true,
      signature: { fullName: "דנה לוי", signedAt: paidAt },
      totals: { grossAmountAfterDiscount: 500 },
    },
    new Set()
  );

  assert.equal(row.customerDeleted, true);
  assert.equal(row.fullName, "דנה לוי");
  assert.equal(row.documentType, "agreement");
  assert.equal(row.originalUserId, "a".repeat(24));
  assert.equal(row.signerName, "דנה לוי");
});

test("signed agreement download uses the frozen copy", () => {
  const html = buildRetainedDocumentHtml({
    type: "agreement",
    token: "tok",
    createdAt: paidAt,
    client: { fullName: "שונה אחרי החתימה" },
    immutableSignedCopy: {
      type: "agreement",
      status: "signed",
      token: "tok",
      client: { fullName: "דנה לוי", email: "dana@example.com" },
      signature: {
        fullName: "דנה לוי",
        signedAt: paidAt,
        signatureDataUrl: signatureImage,
      },
      totals: { grossAmountAfterDiscount: 500 },
      audit: { signedIp: "203.0.113.8" },
    },
  });

  assert.match(html, /דנה לוי/);
  assert.doesNotMatch(html, /שונה אחרי החתימה/);
  assert.match(html, /203\.0\.113\.8/);
  assert.match(html, /data:image\/png/);
});

test("deleting a customer keeps quotes, signed agreements, payments, and revenue", async (t) => {
  let mongod: MongoMemoryServer | null = null;
  process.env.APP_ENV = "test";

  try {
    mongod = await MongoMemoryServer.create();
  } catch (err: any) {
    t.skip(`mongodb-memory-server unavailable: ${err?.message || err}`);
    return;
  }

  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URI);

  try {
    const customer = await User.create({
      name: "דנה לוי",
      email: "dana.retention@example.com",
      phone: "0501234567",
      password: "plain-password-must-not-survive",
      needsPasswordSetup: false,
      role: "user",
      hasPaid: true,
      isDemoUser: false,
      totalDealAmount: 500,
      paidAt,
      packageName: "Invistimo Hybrid",
      maxGuests: 350,
      payments: [
        {
          amount: 200,
          type: "deposit",
          method: "bank_transfer",
          status: "paid",
          paidAt,
          note: "מקדמה",
        },
      ],
    });

    const legacyCustomer = await User.create({
      name: "יוסי ישן",
      email: "yossi.legacy@example.com",
      password: "legacy-password",
      needsPasswordSetup: false,
      role: "user",
      hasPaid: true,
      paidAmount: 80,
      totalDealAmount: 80,
      paidAt: new Date("2026-03-10T08:00:00.000Z"),
      payments: [],
    });

    const survivor = await User.create({
      name: "נשאר במערכת",
      email: "survivor@example.com",
      password: "survivor-password",
      needsPasswordSetup: false,
      role: "user",
      hasPaid: true,
      totalDealAmount: 50,
      payments: [
        {
          amount: 50,
          type: "full",
          method: "cash",
          status: "paid",
          paidAt: new Date("2026-03-16T08:00:00.000Z"),
        },
      ],
    });

    const venueOwner = await User.create({
      name: "בעל אולם",
      email: "venue-owner@example.com",
      password: "venue-password",
      needsPasswordSetup: false,
      role: "venue_owner",
      venueUser: true,
    });

    const event = await Event.create({
      userId: customer._id,
      email: customer.email,
      title: "החתונה של דנה",
      date: "2026-08-01",
      time: "19:00",
      maxGuests: 350,
    });
    const venueLinkedEvent = await Event.create({
      userId: customer._id,
      email: customer.email,
      title: "אירוע אולם",
      date: "2026-09-01",
      time: "18:00",
      maxGuests: 100,
      venueOwnerId: venueOwner._id,
      venueHallId: "hall-1",
    });
    const survivorEvent = await Event.create({
      userId: survivor._id,
      email: survivor.email,
      title: "אירוע שנשאר",
      date: "2026-10-01",
      time: "20:00",
      maxGuests: 80,
    });

    const invitation = await Invitation.create({
      ownerId: customer._id,
      eventId: event._id,
      title: "הזמנה של דנה",
      canvasData: {},
      maxGuests: 350,
    });
    await InvitationGuest.create({
      invitationId: invitation._id,
      name: "אורח פעיל",
      phone: "0500000001",
      token: "guest-token-dana",
    });
    await Guest.create({
      invitationId: invitation._id,
      name: "אורח פעיל",
      phone: "0500000001",
      token: "guest-model-dana",
    });
    await ScheduledMessage.create({
      invitationId: invitation._id,
      userId: customer._id,
      channel: "sms",
      type: "rsvp",
      filter: "all",
      templateKey: "rsvp",
      messageContent: "בואו לחתונה",
      scheduledAt: new Date("2026-07-01T10:00:00.000Z"),
    });
    await MobileRefreshToken.create({
      userId: customer._id,
      tokenHash: "refresh-hash-dana",
      familyId: "family-dana",
      expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    });

    const venueEvent = await VenueEvent.create({
      ownerId: venueOwner._id,
      hallId: "hall-1",
      title: "אירוע אולם",
      date: "2026-09-01",
      startTime: "18:00",
      linkedEventId: venueLinkedEvent._id,
      clientUserId: customer._id,
      clientName: "דנה לוי",
    });

    const file = await CustomerFile.create({
      userId: customer._id,
      fullName: "דנה לוי",
      email: customer.email,
      phone: customer.phone,
      totalPrice: 500,
      paidAmount: 200,
      rawLeadData: { secret: "לא לשימור" },
      notes: "הערת תפעול",
    });

    const quote = await SalesDocument.create({
      type: "quote",
      token: "quote-token-dana",
      status: "sent",
      url: "https://www.invistimo.com/sales-documents/quote-token-dana",
      customerFileId: file._id,
      convertedUserId: customer._id,
      client: {
        fullName: "דנה לוי",
        email: customer.email,
        phone: customer.phone,
      },
      event: { name: "החתונה של דנה", date: "2026-08-01" },
      selectedPackage: { title: "Invistimo Hybrid", price: 500 },
      totals: { grossAmount: 500, grossAmountAfterDiscount: 500 },
      sms: { sentAt: new Date("2026-02-01T09:00:00.000Z"), sentTo: customer.phone },
    });
    await CustomerQuote.create({
      customerFileId: file._id,
      userId: customer._id,
      salesDocumentId: quote._id,
      total: 500,
      status: "sent",
    });

    const agreement = await SalesDocument.create({
      type: "agreement",
      token: "agreement-token-dana",
      status: "signed",
      url: "https://www.invistimo.com/sales-documents/agreement-token-dana",
      pdfUrl: "https://files.invistimo.com/agreements/dana-signed.pdf",
      customerFileId: file._id,
      convertedUserId: customer._id,
      client: {
        fullName: "דנה לוי",
        email: customer.email,
        phone: customer.phone,
        idNumber: "123456782",
      },
      event: { name: "החתונה של דנה", date: "2026-08-01" },
      selectedPackage: { title: "Invistimo Hybrid", price: 500 },
      totals: { grossAmountAfterDiscount: 500 },
      signature: {
        fullName: "דנה לוי",
        idNumber: "123456782",
        phone: customer.phone,
        signedAt: new Date("2026-02-02T10:00:00.000Z"),
        signatureDataUrl: signatureImage,
        acceptedTerms: true,
        signedIp: "203.0.113.8",
      },
      agreement: {
        signatureFullName: "דנה לוי",
        signatureDataUrl: signatureImage,
        signedAt: new Date("2026-02-02T10:00:00.000Z"),
      },
      audit: { signedIp: "203.0.113.8", signedAt: new Date("2026-02-02T10:00:00.000Z") },
      signedAt: new Date("2026-02-02T10:00:00.000Z"),
      sms: { sentAt: new Date("2026-02-01T09:30:00.000Z") },
    });
    await CustomerAgreement.create({
      customerFileId: file._id,
      userId: customer._id,
      salesDocumentId: agreement._id,
      publicToken: agreement.token,
      status: "signed",
      amount: 500,
      signerName: "דנה לוי",
      signerIdNumber: "123456782",
      signerEmail: customer.email,
      signatureImageUrl: signatureImage,
      pdfUrl: "https://files.invistimo.com/agreements/dana-signed.pdf",
      signedAt: new Date("2026-02-02T10:00:00.000Z"),
      ipAddress: "203.0.113.8",
    });

    await Payment.create({
      email: customer.email,
      amount: 200,
      currency: "ils",
      status: "paid",
      type: "package",
      maxGuests: 350,
      stripePaymentIntentId: "pi_retention_dana",
      metadata: {
        invoiceUrl: "https://files.invistimo.com/invoices/dana.pdf",
        receiptUrl: "https://files.invistimo.com/receipts/dana.pdf",
      },
      createdAt: paidAt,
    });

    await RetainedCustomerFinancial.create({
      originalUserId: survivor._id,
      name: survivor.name,
      fullName: survivor.name,
      email: survivor.email,
      hasPaid: true,
      isDemoUser: false,
      isTest: false,
      payments: [
        {
          amount: 50,
          type: "full",
          method: "cash",
          status: "paid",
          paidAt: new Date("2026-03-16T08:00:00.000Z"),
        },
      ],
    });

    const beforeRevenue = await sumRevenueBetween(rangeStart, rangeEnd);
    assert.equal(beforeRevenue, 330);

    const salesCountBefore = await SalesDocument.countDocuments();
    const paymentCountBefore = await Payment.countDocuments();
    const venueEventBefore = await VenueEvent.findById(venueEvent._id).lean();

    await deleteInvistimoCustomerAccount(customer.toObject());
    await deleteInvistimoCustomerAccount(legacyCustomer.toObject());

    assert.equal(await User.findOne({ email: customer.email }), null);
    assert.equal(await User.findOne({ email: legacyCustomer.email }), null);
    assert.equal(await MobileRefreshToken.countDocuments({ userId: customer._id }), 0);
    assert.ok(await User.findById(survivor._id));
    assert.ok(await User.findById(venueOwner._id));

    assert.equal(await Event.countDocuments({ _id: event._id }), 0);
    assert.equal(await Invitation.countDocuments({ _id: invitation._id }), 0);
    assert.equal(await InvitationGuest.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await Guest.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await ScheduledMessage.countDocuments({ userId: customer._id }), 0);
    assert.ok(await Event.findById(survivorEvent._id));
    assert.ok(await Event.findById(venueLinkedEvent._id));
    const venueEventAfter = await VenueEvent.findById(venueEvent._id).lean();
    assert.equal(venueEventAfter?.title, venueEventBefore?.title);
    assert.equal(String(venueEventAfter?.linkedEventId), String(venueLinkedEvent._id));

    assert.equal(await SalesDocument.countDocuments(), salesCountBefore);
    assert.equal(await Payment.countDocuments(), paymentCountBefore);
    const keptQuote = await SalesDocument.findById(quote._id).lean();
    const keptAgreement = await SalesDocument.findById(agreement._id).lean();
    assert.equal(keptQuote?.client?.fullName, "דנה לוי");
    assert.equal(keptQuote?.customerDeleted, true);
    assert.equal(keptAgreement?.pdfUrl, "https://files.invistimo.com/agreements/dana-signed.pdf");
    assert.equal(keptAgreement?.immutableSignedCopy?.signature?.fullName, "דנה לוי");
    assert.equal(
      keptAgreement?.immutableSignedCopy?.signature?.signatureDataUrl,
      signatureImage
    );

    await assert.rejects(
      () =>
        SalesDocument.updateOne(
          { _id: agreement._id },
          { $set: { "signature.fullName": "שם שהוחלף" } }
        ),
      /SIGNED_AGREEMENT_IMMUTABLE/
    );
    const stillSigned = await SalesDocument.findById(agreement._id).lean();
    assert.equal(stillSigned?.signature?.fullName, "דנה לוי");

    const keptCustomerAgreement = await CustomerAgreement.findOne({
      publicToken: "agreement-token-dana",
    }).lean();
    assert.equal(
      keptCustomerAgreement?.pdfUrl,
      "https://files.invistimo.com/agreements/dana-signed.pdf"
    );
    assert.equal(keptCustomerAgreement?.immutableSignedCopy?.signerName, "דנה לוי");
    assert.equal(await CustomerQuote.countDocuments({ customerFileId: file._id }), 1);

    const keptFile = await CustomerFile.findById(file._id).lean();
    assert.ok(keptFile);
    assert.equal(keptFile?.userId, null);
    assert.equal(keptFile?.rawLeadData, null);
    assert.equal(keptFile?.customerDeleted, true);

    const retained = await RetainedCustomerFinancial.findOne({
      originalUserId: customer._id,
    }).lean();
    assert.ok(retained);
    assert.equal(JSON.stringify(retained).includes("plain-password-must-not-survive"), false);
    assert.equal(retained?.payments?.[0]?.amount, 200);
    assert.equal(retained?.payments?.[0]?.method, "bank_transfer");
    assert.equal(retained?.payments?.[0]?.status, "paid");
    assert.equal(retained?.payments?.[0]?.reference, "pi_retention_dana");
    assert.equal(
      retained?.payments?.[0]?.invoiceUrl,
      "https://files.invistimo.com/invoices/dana.pdf"
    );
    assert.equal(retained?.totalDealAmount, 500);
    assert.equal(retained?.name, "דנה לוי");

    const afterRevenue = await sumRevenueBetween(rangeStart, rangeEnd);
    assert.equal(afterRevenue, beforeRevenue);

    const row = toAdminSalesDocumentRow(keptAgreement, new Set());
    assert.equal(row.customerDeleted, true);
    assert.equal(row.fullName, "דנה לוי");
    assert.match(buildRetainedDocumentHtml(keptAgreement), /דנה לוי/);
    assert.match(buildRetainedDocumentHtml(keptAgreement), /203\.0\.113\.8/);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});
