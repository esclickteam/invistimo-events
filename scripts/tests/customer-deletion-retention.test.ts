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
import Group from "../../models/Group";
import Seating from "../../models/Seating";
import SeatingTable from "../../models/SeatingTable";
import ScheduledMessage from "../../models/ScheduledMessage";
import MobileRefreshToken from "../../models/MobileRefreshToken";
import MobilePushDevice from "../../models/MobilePushDevice";
import NotificationPreference from "../../models/NotificationPreference";
import WhatsappQueue from "../../models/WhatsappQueue";
import MessageLog from "../../models/MessageLog";
import RoundGuestDelivery from "../../models/RoundGuestDelivery";
import CallLog from "../../models/CallLog";
import CallTask from "../../models/CallTask";
import CallWorkOrder from "../../models/CallWorkOrder";
import IvrCallAttempt from "../../models/IvrCallAttempt";
import CheckInLog from "../../models/CheckInLog";
import LiveArrival from "../../models/LiveArrival";
import GuestPhoneClaim from "../../models/GuestPhoneClaim";
import EventTask from "../../models/EventTask";
import EventGift from "../../models/EventGift";
import EventAlcohol from "../../models/EventAlcohol";
import EventLogisticsStep from "../../models/EventLogisticsStep";
import EventTimelineStep from "../../models/EventTimelineStep";
import EventTransportation from "../../models/EventTransportation";
import TransportRoute from "../../models/TransportRoute";
import TransportStop from "../../models/TransportStop";
import TransportRegistration from "../../models/TransportRegistration";
import HallSeatingContact from "../../models/HallSeatingContact";
import WeddingEventUpload from "../../models/WeddingEventUpload";
import WeddingChallengeMission from "../../models/WeddingChallengeMission";
import ShortLink from "../../models/ShortLink";
import Supplier from "../../models/Supplier";
import SupplierCategory from "../../models/SupplierCategory";
import EventSupplier from "../../models/EventSupplier";
import SalesClient from "../../models/SalesClient";
import CustomerLeadMessage from "../../models/CustomerLeadMessage";
import SalesDocument from "../../models/SalesDocument";
import CustomerFile from "../../models/CustomerFile";
import CustomerQuote from "../../models/CustomerQuote";
import CustomerAgreement from "../../models/CustomerAgreement";
import Payment from "../../models/Payment";
import VenueEvent from "../../models/VenueEvent";
import RetainedCustomerFinancial from "../../models/RetainedCustomerFinancial";
import DeletedCustomerTombstone from "../../models/DeletedCustomerTombstone";
import { deleteInvistimoCustomerAccount } from "../../lib/customers/deleteCustomerAccount";
import { cloudinaryPublicIdFromUrl } from "../../lib/customers/operationalPurge";
import { sumRevenueBetween } from "../../lib/admin/revenuePayments";
import {
  adminSalesListKind,
  toAdminSalesDocumentRow,
} from "../../lib/customers/adminSalesDocumentRow";
import { buildRetainedDocumentHtml } from "../../lib/customers/retainedDocumentHtml";

const paidAt = new Date("2026-03-15T12:00:00.000Z");
const rangeStart = new Date("2026-03-01T00:00:00.000Z");
const rangeEnd = new Date("2026-04-01T00:00:00.000Z");
const signatureImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("signed agreements use their own admin tab", () => {
  assert.equal(adminSalesListKind("/admin/sales/quotes"), "quotes");
  assert.equal(adminSalesListKind("/admin/sales/agreements"), "agreements");
  assert.equal(
    cloudinaryPublicIdFromUrl(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v123/events/dana/photo.jpg"
    ),
    "events/dana/photo"
  );
});

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
    mongod = await MongoMemoryServer.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
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

    const producer = await User.create({
      name: "מפיק נשאר",
      email: "producer.keep@example.com",
      password: "producer-password",
      needsPasswordSetup: false,
      role: "producer",
      assignedClientIds: [],
    });
    const staff = await User.create({
      name: "עובד נשאר",
      email: "staff.keep@example.com",
      password: "staff-password",
      needsPasswordSetup: false,
      role: "staff",
      staffType: "seating_staff",
      assignedClientIds: [],
    });
    producer.assignedClientIds = [customer._id];
    staff.assignedClientIds = [customer._id];
    await producer.save();
    await staff.save();

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
      producerId: producer._id,
      assignedStaffIds: [staff._id],
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
    const guest = await InvitationGuest.findOne({ invitationId: invitation._id });
    assert.ok(guest);
    await Guest.create({
      invitationId: invitation._id,
      name: "אורח פעיל",
      phone: "0500000001",
      token: "guest-model-dana",
    });
    await Group.create({ eventId: event._id, name: "משפחה" });
    await Seating.create({
      invitationId: invitation._id,
      tables: [
        {
          id: "map-1",
          name: "שולחן 1",
          type: "round",
          seats: 10,
          x: 12,
          y: 24,
          seatedGuests: [String(guest._id)],
        },
      ],
    });
    await SeatingTable.create({
      eventId: event._id,
      tables: [
        {
          id: "table-1",
          name: "שולחן 1",
          seats: 10,
          x: 30,
          y: 40,
          seatedGuests: [{ guestId: guest._id, seatIndex: 0 }],
        },
      ],
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
    await MobilePushDevice.create({
      userId: customer._id,
      expoPushToken: "ExponentPushToken[dana-purge]",
      deviceId: "dana-phone",
    });
    await NotificationPreference.create({ userId: customer._id });
    const schedule = await ScheduledMessage.findOne({ userId: customer._id });
    await WhatsappQueue.create({
      invitationId: invitation._id,
      guestId: guest._id,
      phone: "0500000001",
      templateName: "rsvp_round",
      idempotencyKey: `whatsapp:rsvp:${invitation._id}:1:${guest._id}`,
      payload: { name: "אורח פעיל" },
      status: "pending",
      scheduleId: schedule?._id,
    });
    await MessageLog.create({
      invitationId: invitation._id,
      guestId: guest._id,
      phone: "0500000001",
      message: "אישור הגעה",
      type: "rsvp",
      status: "sent",
    });
    await RoundGuestDelivery.create({
      invitationId: invitation._id,
      guestId: guest._id,
      roundKey: "rsvp:1",
      type: "rsvp",
      round: 1,
      source: "scheduled",
      phone: "0500000001",
      whatsapp: { status: "QUEUED" },
    });
    const workOrder = await CallWorkOrder.create({
      invitationId: invitation._id,
      userId: customer._id,
      clientUserId: customer._id,
      round: 1,
      sourceAudience: "pending_rsvp",
      workDate: new Date("2026-07-01T06:00:00.000Z"),
      autoOpenAt: new Date("2026-07-01T06:00:00.000Z"),
      status: "scheduled",
    });
    await CallTask.create({
      workOrderId: workOrder._id,
      invitationId: invitation._id,
      guestId: guest._id,
      round: 1,
      sourceAudience: "pending_rsvp",
      workDate: new Date("2026-07-01T06:00:00.000Z"),
      phone: "0500000001",
    });
    await CallLog.create({
      agentId: staff._id,
      userId: customer._id,
      invitationId: invitation._id,
      guestId: guest._id,
      phone: "0500000001",
      direction: "outbound",
      status: "completed",
      dayKey: "2026-07-01",
    });
    await IvrCallAttempt.create({
      userId: customer._id,
      invitationId: invitation._id,
      guestId: guest._id,
      phone: "0500000001",
      round: 1,
      status: "queued",
    });
    await CheckInLog.create({
      eventId: event._id,
      invitationId: invitation._id,
      invitationGuestId: guest._id,
      scannedByUserId: staff._id,
      quantityAdded: 1,
      previousCheckedInCount: 0,
      newCheckedInCount: 1,
      method: "QR",
    });
    await LiveArrival.create({
      invitationId: invitation._id,
      guestId: guest._id,
      arrivedCount: 1,
      updatedBy: staff._id,
    });
    await GuestPhoneClaim.create({
      invitationId: invitation._id,
      phoneNormalized: "0500000001",
      guestId: guest._id,
    });
    await EventTask.create({
      eventId: event._id,
      userId: customer._id,
      producerId: producer._id,
      title: "לאשר סידור הושבה",
      dueDate: "2026-07-20",
    });
    await EventGift.create({
      eventId: event._id,
      invitationId: invitation._id,
      guestId: guest._id,
      guestName: "אורח פעיל",
      amount: 200,
    });
    await EventAlcohol.create({
      eventId: event._id,
      category: "וודקה",
      brand: "Absolut",
      total: 2,
    });
    await EventLogisticsStep.create({
      eventId: event._id,
      title: "הגעת ספק",
      time: "16:00",
    });
    await EventTimelineStep.create({
      eventId: event._id,
      title: "כניסה",
      time: "19:00",
    });
    await EventTransportation.create({
      eventId: event._id,
      invitationId: invitation._id,
      enabled: true,
    });
    const route = await TransportRoute.create({
      eventId: event._id,
      name: "קו צפון",
      direction: "outbound",
      capacity: 20,
    });
    const stop = await TransportStop.create({
      eventId: event._id,
      routeId: route._id,
      name: "צומת",
      stopType: "pickup",
    });
    await TransportRegistration.create({
      eventId: event._id,
      invitationGuestId: guest._id,
      name: "אורח פעיל",
      phone: "0500000001",
      passengerCount: 2,
      outboundRouteId: route._id,
      outboundStopId: stop._id,
    });
    await HallSeatingContact.create({
      eventId: event._id,
      userId: customer._id,
      primary: { fullName: "דנה לוי", phone: "0501234567" },
      responsibilityVersion: "v1",
      responsibilityText: "אישור אחריות להושבה",
    });
    await WeddingEventUpload.create({
      invitationId: invitation._id,
      guestId: guest._id,
      type: "image",
      url: "https://res.cloudinary.com/demo/image/upload/v1/events/dana/guest.jpg",
      publicId: "events/dana/guest",
      expiresAt: new Date("2026-09-01T00:00:00.000Z"),
    });
    await WeddingChallengeMission.create({
      eventId: event._id,
      missionKey: "dana-purge-mission",
      text: "לרקוד",
      category: "dancefloor",
    });
    await ShortLink.create({
      code: "danaPurge1",
      targetUrl: `https://www.invistimo.com/invite/${invitation._id}?guest=${guest.token}`,
    });
    const sharedCategory = await SupplierCategory.create({
      name: "צילום",
      ownerId: survivor._id,
    });
    await Supplier.create({
      name: "צלם משותף",
      ownerId: survivor._id,
      categoryId: sharedCategory._id,
      sub: "סטילס",
    });
    await Supplier.create({
      name: "ספק של דנה",
      ownerId: customer._id,
      categoryId: sharedCategory._id,
      sub: "וידאו",
    });
    await EventSupplier.create({
      eventId: event._id,
      categoryId: sharedCategory._id,
      category: "צילום",
      sub: "סטילס",
      name: "צלם משותף",
    });
    await SalesClient.create({
      clientName: "דנה לוי",
      clientEmail: customer.email,
      clientPhone: customer.phone,
      userId: customer._id,
      invitationId: invitation._id,
      status: "paid",
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
    const venueInvitation = await Invitation.create({
      ownerId: customer._id,
      eventId: venueLinkedEvent._id,
      title: "הזמנת אולם",
      canvasData: {},
      maxGuests: 100,
    });
    await InvitationGuest.create({
      invitationId: venueInvitation._id,
      name: "אורח אולם",
      phone: "0500000099",
      token: "guest-token-venue",
    });
    const survivorInvitation = await Invitation.create({
      ownerId: survivor._id,
      eventId: survivorEvent._id,
      title: "הזמנה שנשארת",
      canvasData: {},
      maxGuests: 80,
    });
    await SeatingTable.create({
      eventId: survivorEvent._id,
      tables: [{ id: "keep", name: "שולחן שנשאר", seats: 8, x: 1, y: 1 }],
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
      assignedStaffIds: [staff._id],
      invitationId: invitation._id,
    });
    await CustomerLeadMessage.create({
      customerFileId: file._id,
      staffId: staff._id,
      direction: "outgoing",
      messageText: "הודעת ליד תפעולית",
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
    assert.equal(await Group.countDocuments({ eventId: event._id }), 0);
    assert.equal(await Seating.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await SeatingTable.countDocuments({ eventId: event._id }), 0);
    assert.equal(await WhatsappQueue.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await MessageLog.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await RoundGuestDelivery.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await CallLog.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await CallTask.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await CallWorkOrder.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await IvrCallAttempt.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await CheckInLog.countDocuments({ eventId: event._id }), 0);
    assert.equal(await LiveArrival.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await GuestPhoneClaim.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await EventTask.countDocuments({ eventId: event._id }), 0);
    assert.equal(await EventGift.countDocuments({ eventId: event._id }), 0);
    assert.equal(await EventAlcohol.countDocuments({ eventId: event._id }), 0);
    assert.equal(await EventLogisticsStep.countDocuments({ eventId: event._id }), 0);
    assert.equal(await EventTimelineStep.countDocuments({ eventId: event._id }), 0);
    assert.equal(await EventTransportation.countDocuments({ eventId: event._id }), 0);
    assert.equal(await TransportRoute.countDocuments({ eventId: event._id }), 0);
    assert.equal(await TransportStop.countDocuments({ eventId: event._id }), 0);
    assert.equal(await TransportRegistration.countDocuments({ eventId: event._id }), 0);
    assert.equal(await HallSeatingContact.countDocuments({ eventId: event._id }), 0);
    assert.equal(await WeddingEventUpload.countDocuments({ invitationId: invitation._id }), 0);
    assert.equal(await WeddingChallengeMission.countDocuments({ eventId: event._id }), 0);
    assert.equal(await EventSupplier.countDocuments({ eventId: event._id }), 0);
    assert.equal(await ShortLink.countDocuments({ code: "danaPurge1" }), 0);
    assert.equal(await MobilePushDevice.countDocuments({ userId: customer._id }), 0);
    assert.equal(await NotificationPreference.countDocuments({ userId: customer._id }), 0);
    assert.equal(await CustomerLeadMessage.countDocuments({ customerFileId: file._id }), 0);
    assert.equal(await Supplier.countDocuments({ name: "ספק של דנה" }), 0);
    assert.equal(await Supplier.countDocuments({ name: "צלם משותף" }), 1);
    assert.equal(await SupplierCategory.countDocuments({ name: "צילום" }), 1);
    const keptSalesClient = await SalesClient.findOne({ clientEmail: customer.email }).lean();
    assert.ok(keptSalesClient);
    assert.equal(keptSalesClient?.invitationId || null, null);
    const keptProducer = await User.findById(producer._id).lean();
    const keptStaff = await User.findById(staff._id).lean();
    assert.ok(keptProducer);
    assert.ok(keptStaff);
    assert.equal(
      (keptProducer?.assignedClientIds || []).some((id: unknown) => String(id) === String(customer._id)),
      false
    );
    assert.equal(
      (keptStaff?.assignedClientIds || []).some((id: unknown) => String(id) === String(customer._id)),
      false
    );
    assert.ok(await Event.findById(survivorEvent._id));
    assert.ok(await SeatingTable.findOne({ eventId: survivorEvent._id }));
    assert.ok(await Invitation.findById(venueInvitation._id));
    assert.equal(
      await InvitationGuest.countDocuments({ invitationId: venueInvitation._id }),
      1
    );
    const tombstone = await DeletedCustomerTombstone.findOne({
      originalUserId: customer._id,
    }).lean();
    assert.ok(tombstone);
    assert.equal(tombstone?.name, "דנה לוי");
    await assert.rejects(
      () =>
        ScheduledMessage.create({
          invitationId: invitation._id,
          userId: customer._id,
          channel: "sms",
          type: "rsvp",
          filter: "all",
          templateKey: "rsvp",
          messageContent: "לא אמור להיווצר",
          scheduledAt: new Date("2026-07-02T10:00:00.000Z"),
        }),
      /CUSTOMER_PURGED/
    );
    await ScheduledMessage.create({
      invitationId: survivorInvitation._id,
      userId: survivor._id,
      channel: "sms",
      type: "rsvp",
      filter: "all",
      templateKey: "rsvp",
      messageContent: "סבב של לקוח פעיל",
      scheduledAt: new Date("2026-07-02T10:00:00.000Z"),
    });
    assert.equal(await ScheduledMessage.countDocuments({ userId: survivor._id }), 1);
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
    const signedCopy = keptAgreement?.immutableSignedCopy as
      | { signature?: { fullName?: string; signatureDataUrl?: string } }
      | undefined;
    assert.equal(signedCopy?.signature?.fullName, "דנה לוי");
    assert.equal(signedCopy?.signature?.signatureDataUrl, signatureImage);

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
    assert.equal(keptFile?.invitationId, null);
    assert.deepEqual(keptFile?.assignedStaffIds || [], []);
    assert.equal(keptFile?.rawLeadData, null);
    assert.equal(keptFile?.notes, "");
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
