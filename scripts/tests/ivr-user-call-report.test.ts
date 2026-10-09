/**
 * Per-customer IVR report: two users, separate events, no mixed rows.
 * Uses mongodb-memory-server, not Production/Staging.
 */
import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { buildIvrUserCallReportWorkbook } from "../../lib/calls/ivrCallReportExcel";
import {
  listUserIvrReportExport,
  listUserIvrReportPage,
} from "../../lib/calls/ivrCallReportQuery";
import Invitation from "../../models/Invitation";
import InvitationGuest from "../../models/InvitationGuest";
import IvrCallAttempt from "../../models/IvrCallAttempt";
import User from "../../models/User";

const JULY = new Date("2026-07-02T12:00:00.000Z");
const MAY = new Date("2026-05-01T12:00:00.000Z");

test("IVR report stays inside the edited user and active filters", async (t) => {
  let mongod: MongoMemoryServer | null = null;
  try {
    mongod = await MongoMemoryServer.create();
  } catch (err: any) {
    t.skip(`mongodb-memory-server unavailable: ${err?.message || err}`);
    return;
  }

  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URI);

  try {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    await User.create({
      _id: userA,
      name: "לקוח א",
      email: `ivr-rounds-${String(userA)}@test.local`,
      role: "user",
      guests: 10,
      maxGuests: 10,
      needsPasswordSetup: true,
      includeCalls: true,
      callRoundsSchedule: {
        rounds: [
          { roundNumber: 1, status: "done", eligibleCount: 12, callType: "ivr" },
          { roundNumber: 2, status: "scheduled", eligibleCount: 4, callType: "ivr" },
          { roundNumber: 3, status: "draft", callType: "ivr" },
        ],
      },
    });
    const eventA = await Invitation.create({
      ownerId: userA,
      eventId: new mongoose.Types.ObjectId(),
      title: "חתונת אור",
    });
    const eventB = await Invitation.create({
      ownerId: userB,
      eventId: new mongoose.Types.ObjectId(),
      title: "חינה של נועה",
    });

    async function guest(invitationId: mongoose.Types.ObjectId, name: string, phone: string, rsvp = "pending") {
      return InvitationGuest.create({
        invitationId,
        name,
        phone,
        token: new mongoose.Types.ObjectId().toString(),
        rsvp,
        status: rsvp,
      });
    }

    const dana = await guest(eventA._id, "דנה כהן", "0501111111");
    const yossi = await guest(eventA._id, "יוסי לוי", "0502222222");
    const roni = await guest(eventA._id, "רוני חדד", "0503333333");
    const noa = await guest(eventA._id, "נועה ברק", "0504444444", "yes");
    const tal = await guest(eventA._id, "טל אביב", "0505555555");
    const amit = await guest(eventA._id, "עמית דן", "0506666666");
    const shai = await guest(eventA._id, "שי מור", "0507777777");
    const michal = await guest(eventB._id, "מיכל גל", "0508888888", "yes");

    async function attempt(input: Record<string, unknown>, at = JULY) {
      const doc = await IvrCallAttempt.create({
        channel: "outbound_ivr",
        direction: "outbound",
        eventName: "חתונת אור",
        dialRequestedAt: at,
        startedAt: at,
        ...input,
      });
      await IvrCallAttempt.collection.updateOne(
        { _id: doc._id },
        { $set: { createdAt: at } }
      );
      return doc;
    }

    await attempt({
      userId: userA,
      invitationId: eventA._id,
      guestId: dana._id,
      round: 1,
      phone: "0501111111",
      status: "completed",
      answered: true,
      choiceDigit: "1",
      rsvpApplied: true,
      rsvpResult: "yes",
      endedAt: new Date(JULY.getTime() + 20000),
      answeredAt: JULY,
      durationSeconds: 20,
    });
    await attempt({
      userId: userA,
      invitationId: eventA._id,
      guestId: dana._id,
      round: 2,
      phone: "0501111111",
      status: "no_answer",
      answered: false,
      retryCount: 1,
      endedAt: new Date(JULY.getTime() + 30000),
    });
    await attempt({
      userId: userA,
      invitationId: eventA._id,
      guestId: yossi._id,
      round: 1,
      phone: "0502222222",
      status: "hangup_before_response",
      answered: true,
      choiceDigit: "",
      endedAt: new Date(JULY.getTime() + 8000),
      answeredAt: JULY,
      durationSeconds: 8,
    });
    await attempt({
      userId: userA,
      invitationId: eventA._id,
      guestId: roni._id,
      round: 1,
      phone: "0503333333",
      status: "failed",
      answered: false,
      error: "DIAL_FAILED",
      endedAt: JULY,
    });
    await attempt({
      userId: userA,
      invitationId: eventA._id,
      guestId: noa._id,
      round: 1,
      phone: "0504444444",
      status: "completed",
      answered: true,
      choiceDigit: "2",
      rsvpApplied: true,
      rsvpResult: "no",
      endedAt: new Date(JULY.getTime() + 15000),
      answeredAt: JULY,
      durationSeconds: 15,
    });
    await attempt({
      userId: userA,
      invitationId: eventA._id,
      guestId: tal._id,
      round: 1,
      phone: "0505555555",
      status: "completed",
      answered: true,
      choiceDigit: "3",
      rsvpApplied: true,
      rsvpResult: "maybe",
      endedAt: new Date(JULY.getTime() + 12000),
      answeredAt: JULY,
      durationSeconds: 12,
    });
    await attempt({
      userId: userA,
      invitationId: eventA._id,
      guestId: amit._id,
      round: 1,
      phone: "0506666666",
      status: "hangup_before_response",
      answered: true,
      choiceDigit: "1",
      rsvpApplied: false,
      endedAt: new Date(JULY.getTime() + 9000),
      answeredAt: JULY,
      durationSeconds: 9,
    });
    await attempt({
      userId: userA,
      invitationId: eventA._id,
      guestId: shai._id,
      round: 1,
      phone: "0507777777",
      status: "hangup_before_response",
      answered: true,
      choiceDigit: "9",
      rsvpApplied: false,
      endedAt: new Date(JULY.getTime() + 7000),
      answeredAt: JULY,
      durationSeconds: 7,
    });
    await attempt(
      {
        userId: userA,
        invitationId: eventA._id,
        guestId: dana._id,
        round: 3,
        phone: "0501111111",
        status: "no_answer",
        answered: false,
        endedAt: MAY,
      },
      MAY
    );
    await attempt({
      userId: userB,
      invitationId: eventB._id,
      guestId: michal._id,
      round: 1,
      phone: "0508888888",
      status: "completed",
      answered: true,
      choiceDigit: "1",
      rsvpApplied: true,
      rsvpResult: "yes",
      eventName: "חינה של נועה",
      endedAt: new Date(JULY.getTime() + 10000),
      answeredAt: JULY,
      durationSeconds: 10,
    });

    const allA = await listUserIvrReportPage(String(userA), { page: 1, pageSize: 50 });
    const namesA = allA.rows.map((row) => row.guestName);
    assert.equal(namesA.includes("מיכל גל"), false);
    assert.equal(allA.rows.some((row) => row.eventName === "חינה של נועה"), false);
    const danaRows = allA.rows.filter((row) => row.guestName === "דנה כהן");
    assert.equal(danaRows.length, 3);
    assert.deepEqual(
      danaRows.map((row) => row.round).sort(),
      [1, 2, 3]
    );
    assert.equal(danaRows.find((row) => row.round === 2)?.attemptNumber, 2);

    const byStatus = Object.fromEntries(
      allA.rows.map((row) => [row.callStatus, row.callStatusLabel])
    );
    assert.equal(byStatus.yes, "אישר הגעה");
    assert.equal(byStatus.no_answer, "לא ענה");
    assert.equal(byStatus.answered_no_digit, "נענה – ללא הקשה");
    assert.equal(byStatus.failed, "נכשל");
    assert.equal(byStatus.no, "לא מגיע");
    assert.equal(byStatus.maybe, "מתלבט");
    assert.equal(byStatus.partial, "נענה – תשובה חלקית");
    assert.equal(byStatus.answered_hangup, "נענה וניתק");

    const hungUp = allA.rows.find((row) => row.guestName === "יוסי לוי");
    assert.equal(hungUp?.answeredLabel, "כן");
    assert.equal(hungUp?.callStatus, "answered_no_digit");
    assert.notEqual(hungUp?.callStatusLabel, "לא ענה");

    const changedLater = allA.rows.find((row) => row.guestName === "נועה ברק");
    assert.equal(changedLater?.choiceDigit, "2");
    assert.equal(changedLater?.rsvpLabel, "לא מגיע");

    assert.equal(allA.stats.dialAttempts, 9);
    assert.equal(allA.stats.uniqueGuests, 7);
    assert.equal(allA.stats.answered, 6);
    assert.equal(allA.stats.unanswered, 2);
    assert.equal(allA.stats.failed, 1);
    assert.equal(allA.stats.hungUpWithoutChoice, 1);
    assert.equal(allA.stats.yes, 1);
    assert.equal(allA.stats.no, 1);
    assert.equal(allA.stats.maybe, 1);
    assert.equal(allA.stats.noFinalAnswer, 3);
    assert.equal(allA.allRounds.uniqueGuests, allA.stats.uniqueGuests);
    assert.equal(allA.allRounds.dialAttempts, allA.stats.dialAttempts);
    assert.equal(allA.allRounds.answered, allA.stats.answered);
    assert.equal(allA.allRounds.yes, 1);
    assert.equal(allA.allRounds.no, 1);
    assert.equal(allA.allRounds.maybe, 1);
    assert.equal(allA.allRounds.noFinalAnswer, 3);
    assert.equal(allA.allRounds.uniqueGuests, 7);
    const numbered = allA.rounds.filter((round) => round.key !== "unassigned");
    assert.deepEqual(
      numbered.map((round) => round.key),
      ["1", "2", "3"]
    );
    assert.equal(numbered[0]?.title, "סבב 1 — שיחות אישורי הגעה");
    assert.equal(numbered[0]?.intended, 12);
    assert.equal(numbered[0]?.dialAttempts, 7);
    assert.equal(numbered[0]?.answered, 6);
    assert.equal(numbered[0]?.unanswered, 0);
    assert.equal(numbered[0]?.failed, 1);
    assert.equal(numbered[0]?.hungUpWithoutChoice, 1);
    assert.equal(numbered[0]?.statusLabel, "בוצע");
    assert.equal(numbered[1]?.intended, 4);
    assert.equal(numbered[1]?.dialAttempts, 1);
    assert.equal(numbered[1]?.unanswered, 1);
    assert.equal(numbered[2]?.intended, 0);
    assert.equal(numbered[2]?.dialAttempts, 1);
    assert.equal(
      numbered.reduce((sum, round) => sum + round.dialAttempts, 0),
      allA.allRounds.dialAttempts
    );
    assert.equal(allA.rounds.some((round) => round.key === "unassigned"), false);
    assert.equal(allA.events.some((event) => event.name === "חינה של נועה"), false);
    assert.equal(allA.events.some((event) => event.name === "חתונת אור"), true);

    const allB = await listUserIvrReportPage(String(userB), {});
    assert.deepEqual(
      allB.rows.map((row) => row.guestName),
      ["מיכל גל"]
    );
    assert.equal(allB.rows.some((row) => row.guestName === "דנה כהן"), false);
    assert.deepEqual(
      allB.rounds.filter((round) => round.key !== "unassigned").map((round) => round.key),
      ["1", "2", "3"]
    );
    assert.equal(allB.rounds.find((round) => round.key === "2")?.dialAttempts, 0);
    assert.equal(allB.rounds.find((round) => round.key === "2")?.statusLabel, "טרם בוצע");
    assert.equal(allB.rounds.find((round) => round.key === "3")?.dialAttempts, 0);
    assert.equal(allB.rounds.some((round) => round.key === "unassigned"), false);

    const foreignEvent = await listUserIvrReportPage(String(userA), {
      invitationId: String(eventB._id),
    });
    assert.equal(foreignEvent.total, 0);
    assert.equal(foreignEvent.rows.length, 0);

    const round2 = await listUserIvrReportPage(String(userA), { round: "2" });
    assert.equal(round2.total, 1);
    assert.equal(round2.rows[0]?.guestName, "דנה כהן");
    assert.equal(round2.rows[0]?.round, 2);
    assert.equal(round2.stats.dialAttempts, 1);
    assert.equal(round2.stats.uniqueGuests, 1);
    assert.equal(round2.allRounds.dialAttempts, 9);
    assert.equal(round2.allRounds.uniqueGuests, 7);
    assert.equal(round2.rounds.find((round) => round.key === "1")?.dialAttempts, 7);

    const missed = await listUserIvrReportPage(String(userA), { callStatus: "no_answer" });
    assert.equal(missed.total, 2);
    assert.equal(missed.rows.every((row) => row.callStatus === "no_answer"), true);
    assert.equal(missed.rows.some((row) => row.answeredLabel === "כן"), false);
    assert.equal(missed.stats.dialAttempts, 2);
    assert.equal(missed.rounds.find((round) => round.key === "1")?.dialAttempts, 7);

    const declined = await listUserIvrReportPage(String(userA), { rsvp: "no" });
    assert.equal(declined.total, 1);
    assert.equal(declined.rows[0]?.guestName, "נועה ברק");
    assert.equal(declined.rows[0]?.rsvpLabel, "לא מגיע");

    const byName = await listUserIvrReportPage(String(userA), { q: "דנה" });
    assert.equal(byName.total, 3);
    assert.equal(byName.rows.every((row) => row.guestName === "דנה כהן"), true);

    const byPhone = await listUserIvrReportPage(String(userA), { q: "0502222222" });
    assert.equal(byPhone.total, 1);
    assert.equal(byPhone.rows[0]?.guestName, "יוסי לוי");

    const otherPhone = await listUserIvrReportPage(String(userA), { q: "0508888888" });
    assert.equal(otherPhone.total, 0);

    const july = await listUserIvrReportPage(String(userA), {
      from: "2026-07-01",
      to: "2026-07-31",
    });
    assert.equal(july.total, 8);
    assert.equal(july.rows.some((row) => row.round === 3), false);
    assert.equal(july.stats.dialAttempts, 8);
    assert.equal(july.allRounds.dialAttempts, 8);
    assert.equal(july.allRounds.uniqueGuests, 7);
    assert.equal(july.rounds.find((round) => round.key === "3")?.dialAttempts, 0);
    assert.equal(july.rounds.find((round) => round.key === "3")?.statusLabel, "טרם בוצע");

    const exported = await listUserIvrReportExport(String(userA), { q: "דנה" });
    const buffer = await buildIvrUserCallReportWorkbook(exported.rows, exported.truncated);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("דוח שיחות IVR");
    assert.ok(sheet);
    const header = (sheet?.getRow(1).values as unknown[]).filter(Boolean).map(String);
    assert.deepEqual(header, [
      "תאריך ושעה",
      "אירוע",
      "אורח",
      "טלפון",
      "סבב",
      "ניסיון חיוג",
      "סטטוס שיחה",
      "נענתה",
      "הקשה",
      "תשובת הגעה",
      "משך שיחה",
      "סיבת כישלון",
    ]);
    const body = sheet!
      .getSheetValues()
      .slice(2)
      .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")).join(" ") : ""))
      .join("\n");
    assert.match(body, /דנה כהן/);
    assert.equal(body.includes("מיכל גל"), false);
    assert.equal(body.includes("חינה של נועה"), false);
    assert.equal(body.includes("יוסי לוי"), false);

    const historical = await guest(eventA._id, "היסטורי ללא סבב", "0509999999");
    await attempt({
      userId: userA,
      invitationId: eventA._id,
      guestId: historical._id,
      phone: "0509999999",
      status: "completed",
      answered: true,
      choiceDigit: "1",
      rsvpApplied: true,
      rsvpResult: "yes",
      channel: "inbound_ivr",
      direction: "inbound",
      endedAt: new Date(JULY.getTime() + 5000),
      answeredAt: JULY,
      durationSeconds: 5,
    });

    const withHistory = await listUserIvrReportPage(String(userA), { page: 1, pageSize: 50 });
    assert.equal(withHistory.stats.dialAttempts, 10);
    assert.equal(withHistory.stats.uniqueGuests, 8);
    assert.equal(withHistory.allRounds.uniqueGuests, 8);
    assert.equal(withHistory.allRounds.dialAttempts, 10);
    assert.equal(withHistory.rounds.find((round) => round.key === "1")?.dialAttempts, 7);
    assert.equal(withHistory.rounds.find((round) => round.key === "1")?.yes, 1);
    const loose = withHistory.rounds.find((round) => round.key === "unassigned");
    assert.equal(loose?.dialAttempts, 1);
    assert.equal(loose?.yes, 1);
    assert.equal(loose?.title, "ללא שיוך");
    const onlyLoose = await listUserIvrReportPage(String(userA), { round: "unassigned" });
    assert.equal(onlyLoose.total, 1);
    assert.equal(onlyLoose.rows[0]?.guestName, "היסטורי ללא סבב");
    assert.equal(onlyLoose.rows[0]?.round, null);
    assert.equal(onlyLoose.stats.uniqueGuests, 1);
    const stillRound1 = await listUserIvrReportPage(String(userA), { round: "1" });
    assert.equal(stillRound1.rows.some((row) => row.guestName === "היסטורי ללא סבב"), false);

    const roundExport = await listUserIvrReportExport(String(userA), {
      round: "2",
      callStatus: "no_answer",
    });
    assert.equal(roundExport.total, 1);
    assert.equal(roundExport.rows[0]?.guestName, "דנה כהן");
    assert.equal(roundExport.rows[0]?.round, 2);
    const looseExport = await listUserIvrReportExport(String(userA), { round: "unassigned" });
    const looseBook = await buildIvrUserCallReportWorkbook(
      looseExport.rows,
      looseExport.truncated
    );
    const looseWorkbook = new ExcelJS.Workbook();
    await looseWorkbook.xlsx.load(looseBook);
    const looseSheet = looseWorkbook.getWorksheet("דוח שיחות IVR");
    const looseBody = looseSheet!
      .getSheetValues()
      .slice(2)
      .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")).join(" ") : ""))
      .join("\n");
    assert.match(looseBody, /היסטורי ללא סבב/);
    assert.match(looseBody, /ללא שיוך/);
    assert.equal(looseBody.includes("דנה כהן"), false);
    assert.equal(looseBody.includes("מיכל גל"), false);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});
