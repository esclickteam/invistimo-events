/**
 * Isolated round-1 RSVP simulation.
 * Real kosher split, narration script, dial admission, and RSVP write.
 * Telnyx, WhatsApp, and SMS are mocked. No production data is used.
 */
import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../../models/User";
import Invitation from "../../models/Invitation";
import InvitationGuest from "../../models/InvitationGuest";
import ScheduledMessage from "../../models/ScheduledMessage";
import IvrCallAttempt from "../../models/IvrCallAttempt";
import { partitionMessageRoundGuests } from "../../lib/kosherPhones/routeAudience";
import {
  dispatchKosherMessageRound,
  continueKosherMessageDials,
} from "../../lib/kosherPhones/dispatch";
import {
  buildKosherCallScript,
  resolveKosherSpokenEventName,
} from "../../lib/kosherPhones/match";
import { applyIvrRsvpToGuest } from "../../lib/calls/ivrApplyRsvp";
import { countActiveOutboundCalls } from "../../lib/calls/ivrCapacity";
import KosherPhonePrefix from "../../models/KosherPhonePrefix";

const BLOCKED = /telnyx\.com|whatsapp|graph\.facebook|sms4free|twilio/i;

test("round 1 splits regular guests to messages and kosher guests to IVR", async (t) => {
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  let telnyxMocks = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = String(input instanceof Request ? input.url : input);
    if (BLOCKED.test(href)) {
      networkCalls += 1;
      if (href.includes("api.telnyx.com/v2/calls") && init?.method === "POST") {
        const fail = href.includes("fail=1");
        telnyxMocks += 1;
        if (fail) {
          return new Response(JSON.stringify({ errors: [{ code: "SIMULATED" }] }), { status: 500 });
        }
        const id = `sim-${telnyxMocks}`;
        return new Response(
          JSON.stringify({
            data: {
              call_control_id: id,
              call_leg_id: `leg-${id}`,
              call_session_id: `session-${id}`,
              connection_id: "sim-connection",
            },
          }),
          { status: 200 }
        );
      }
      throw new Error("SIMULATION_BLOCKED_NETWORK");
    }
    return originalFetch(input, init);
  }) as typeof fetch;

  const saved = {
    TELNYX_API_KEY: process.env.TELNYX_API_KEY,
    TELNYX_CONNECTION_ID: process.env.TELNYX_CONNECTION_ID,
    TELNYX_IVR_WEBHOOK_URL: process.env.TELNYX_IVR_WEBHOOK_URL,
    IVR_ALLOW_LIVE_DIAL: process.env.IVR_ALLOW_LIVE_DIAL,
    IVR_OUTBOUND_CPS: process.env.IVR_OUTBOUND_CPS,
    IVR_DIAL_TICK_SECONDS: process.env.IVR_DIAL_TICK_SECONDS,
    IVR_MAX_PARALLEL_CALLS: process.env.IVR_MAX_PARALLEL_CALLS,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  delete process.env.IVR_OUTBOUND_CPS;
  delete process.env.IVR_DIAL_TICK_SECONDS;
  delete process.env.IVR_MAX_PARALLEL_CALLS;
  delete process.env.VERCEL_ENV;
  process.env.TELNYX_API_KEY = "simulation-only";
  process.env.TELNYX_CONNECTION_ID = "simulation-only";
  process.env.TELNYX_IVR_WEBHOOK_URL = "https://sim.invalid/api/telnyx/ivr/webhook";
  process.env.IVR_ALLOW_LIVE_DIAL = "true";

  let mongod: MongoMemoryServer | null = null;
  try {
    mongod = await MongoMemoryServer.create();
  } catch (error) {
    globalThis.fetch = originalFetch;
    t.skip(`mongodb-memory-server unavailable: ${error instanceof Error ? error.message : error}`);
    return;
  }

  const uri = mongod.getUri();
  if (!/127\.0\.0\.1|localhost/.test(uri)) {
    throw new Error("refusing a non-local database");
  }

  const report: Record<string, unknown>[] = [];

  try {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    await mongoose.connect(uri);

    const eventTitle = "החתונה של נועה ודני";
    const spoken = resolveKosherSpokenEventName({
      invitation: { title: eventTitle },
      ivrConfig: { eventName: "שם קריינות נפרד שלא אמור להישמע" },
    });
    const script = buildKosherCallScript(spoken.speechText);
    assert.equal(spoken.displayName, eventTitle);
    assert.match(script, /לאישור הגעה, הקישו 1/);
    assert.match(script, /לאי הגעה, הקישו 2/);
    assert.match(script, /הקישו 3/);
    assert.equal(script.includes("שם קריינות נפרד"), false);

    async function makeCustomer(enabled: boolean) {
      const user = await User.create({
        name: enabled ? "לקוח עם תוספת" : "לקוח בלי תוספת",
        email: `sim-${enabled ? "on" : "off"}-${new mongoose.Types.ObjectId()}@example.test`,
        needsPasswordSetup: true,
        kosherRecordedCallsEnabled: enabled,
        includeCalls: false,
      });
      const invitation = await Invitation.create({
        ownerId: user._id,
        eventId: new mongoose.Types.ObjectId(),
        title: eventTitle,
        canvasData: {},
        maxGuests: 5000,
        kosherCallAudio: {
          spokenName: spoken.speechText,
          speechText: spoken.speechText,
          status: "ready",
          error: "",
          voiceGender: "female",
          composedIntroAudio: { audioUrl: "https://sim.invalid/kosher-intro.mp3" },
          eventNameAudio: { audioUrl: "https://sim.invalid/event-name.mp3" },
        },
      });
      const schedule = await ScheduledMessage.create({
        invitationId: invitation._id,
        userId: user._id,
        channel: "whatsapp",
        type: "rsvp",
        filter: "all",
        templateKey: "rsvp",
        round: 1,
        roundNumber: 1,
        messageContent: "אישור הגעה",
        scheduledAt: new Date(Date.now() - 60_000),
        status: "scheduled",
      });
      return { user, invitation, schedule };
    }

    function guest(phone: string, rsvp = "pending") {
      return {
        _id: new mongoose.Types.ObjectId(),
        phone,
        rsvp,
        name: "אורח מדומה",
      };
    }

    const { user, invitation, schedule } = await makeCustomer(true);
    await partitionMessageRoundGuests({
      user,
      schedule,
      guests: [],
    });

    const off = await makeCustomer(false);
    const offGuests = [guest("0527100001"), guest("0501234001")];
    const offSplit = await partitionMessageRoundGuests({
      user: off.user,
      schedule: off.schedule,
      guests: offGuests,
    });
    const offDispatch = await dispatchKosherMessageRound({
      user: off.user,
      invitation: off.invitation,
      schedule: off.schedule,
      guests: offGuests,
    });
    report.push({
      id: "service-off",
      eligible: offGuests.length,
      messages: offSplit.messageGuests.length,
      calls: offSplit.kosherGuests.length,
      dispatchEnabled: offDispatch.enabled,
      passed: offSplit.kosherGuests.length === 0 && offDispatch.enabled === false,
    });
    assert.equal(offSplit.messageGuests.length, 2);
    assert.equal(offDispatch.enabled, false);
    assert.equal(await IvrCallAttempt.countDocuments({ userId: off.user._id }), 0);

    const timingGuests = [
      guest("0527100101"),
      guest("+972527600102"),
      guest("0505550103"),
      guest("0599900104"),
    ];
    const beforePrefix = await partitionMessageRoundGuests({
      user,
      schedule,
      guests: timingGuests,
    });
    assert.equal(beforePrefix.kosherGuests.length, 2);
    await KosherPhonePrefix.create({ prefix: "05999", carrier: "בדיקה", active: true });
    await KosherPhonePrefix.updateOne({ prefix: "05271" }, { $set: { active: false } });
    const changedPhone = guest("0505550199");
    changedPhone.phone = "0527600199";
    const afterPrefix = await partitionMessageRoundGuests({
      user,
      schedule,
      guests: [...timingGuests, changedPhone],
    });
    const kosherPhones = afterPrefix.kosherGuests.map((item) => item.phone).sort();
    report.push({
      id: "prefixes-at-execution",
      kosherPhones,
      passed:
        kosherPhones.includes("+972527600102") &&
        kosherPhones.includes("0599900104") &&
        kosherPhones.includes("0527600199") &&
        !kosherPhones.includes("0527100101"),
    });
    assert.deepEqual(kosherPhones, ["+972527600102", "0527600199", "0599900104"]);
    await KosherPhonePrefix.updateOne({ prefix: "05271" }, { $set: { active: true } });

    user.kosherRecordedCallsEnabled = false;
    await user.save();
    const scheduledWhileOff = await partitionMessageRoundGuests({
      user,
      schedule,
      guests: [guest("0527100201"), guest("0505550202")],
    });
    user.kosherRecordedCallsEnabled = true;
    await user.save();
    const enabledBeforeRun = await partitionMessageRoundGuests({
      user,
      schedule,
      guests: [guest("0527100201"), guest("0505550202")],
    });
    user.kosherRecordedCallsEnabled = false;
    await user.save();
    const disabledBeforeRun = await partitionMessageRoundGuests({
      user,
      schedule,
      guests: [guest("0527100201"), guest("0505550202")],
    });
    user.kosherRecordedCallsEnabled = true;
    await user.save();
    report.push({
      id: "flag-at-execution",
      whileOff: scheduledWhileOff.kosherGuests.length,
      enabledBeforeRun: enabledBeforeRun.kosherGuests.length,
      disabledBeforeRun: disabledBeforeRun.kosherGuests.length,
      passed:
        scheduledWhileOff.kosherGuests.length === 0 &&
        enabledBeforeRun.kosherGuests.length === 1 &&
        disabledBeforeRun.kosherGuests.length === 0,
    });
    assert.equal(enabledBeforeRun.kosherGuests.length, 1);
    assert.equal(disabledBeforeRun.kosherGuests.length, 0);

    const audience = [
      ...Array.from({ length: 800 }, (_, index) => guest(`0502${String(100000 + index)}`)),
      ...Array.from({ length: 100 }, (_, index) => guest(`05271${String(10000 + index)}`)),
      ...Array.from({ length: 100 }, (_, index) => guest(`+9725276${String(10000 + index)}`)),
    ];
    const split = await partitionMessageRoundGuests({ user, schedule, guests: audience });
    const messageIds = new Set(split.messageGuests.map((item) => String(item._id)));
    const kosherIds = new Set(split.kosherGuests.map((item) => String(item._id)));
    const overlap = [...messageIds].filter((id) => kosherIds.has(id));
    assert.equal(split.messageGuests.length, 800);
    assert.equal(split.kosherGuests.length, 200);
    assert.equal(overlap.length, 0);
    assert.equal(messageIds.size + kosherIds.size, 1000);

    let messagesSent = 0;
    let messageFailures = 0;
    for (const item of split.messageGuests) {
      if (!item.phone) {
        messageFailures += 1;
        continue;
      }
      messagesSent += 1;
    }

    const dispatchPromise = dispatchKosherMessageRound({
      user,
      invitation,
      schedule,
      guests: split.kosherGuests,
    });
    const firstDispatch = await dispatchPromise;
    const continued = await continueKosherMessageDials({ maxCalls: 200 });
    const attempts = await IvrCallAttempt.find({ scheduleId: schedule._id }).lean();
    const secondDispatch = await dispatchKosherMessageRound({
      user,
      invitation,
      schedule,
      guests: split.kosherGuests,
    });
    const attemptsAfterRerun = await IvrCallAttempt.countDocuments({ scheduleId: schedule._id });
    const activeAfter = await countActiveOutboundCalls();
    const queuedAfter = attempts.filter((row) => row.status === "queued").length;

    const sample = attempts.filter((row) => row.telnyxCallControlId).slice(0, 5);
    const rsvpGuests = [];
    for (const attempt of sample) {
      rsvpGuests.push(
        await InvitationGuest.create({
          _id: attempt.guestId,
          invitationId: invitation._id,
          name: "אורח תשובה",
          phone: attempt.phone,
          token: `tok-${String(attempt.guestId)}`,
          rsvp: "pending",
        })
      );
    }
    await applyIvrRsvpToGuest({
      guestId: String(sample[0].guestId),
      invitationId: String(invitation._id),
      rsvp: "yes",
      attendingCount: 4,
      round: 1,
      callAttemptId: String(sample[0]._id),
    });
    await applyIvrRsvpToGuest({
      guestId: String(sample[1].guestId),
      invitationId: String(invitation._id),
      rsvp: "no",
      round: 1,
      callAttemptId: String(sample[1]._id),
    });
    await applyIvrRsvpToGuest({
      guestId: String(sample[2].guestId),
      invitationId: String(invitation._id),
      rsvp: "maybe",
      round: 1,
      callAttemptId: String(sample[2]._id),
    });
    await IvrCallAttempt.updateOne(
      { _id: sample[3]._id },
      { $set: { status: "no_answer", answered: false, rsvpApplied: false, flowStep: "done" } }
    );
    await IvrCallAttempt.updateOne(
      { _id: sample[4]._id },
      { $set: { status: "failed", answered: false, rsvpApplied: false, error: "DIAL_FAILED", flowStep: "done" } }
    );
    const refreshed = await InvitationGuest.find({
      _id: { $in: sample.map((row) => row.guestId) },
    }).lean();
    const byId = new Map(refreshed.map((row) => [String(row._id), row]));
    const rsvpResults = {
      yes: byId.get(String(sample[0].guestId))?.rsvp,
      yesCount: byId.get(String(sample[0].guestId))?.arrivedCount,
      no: byId.get(String(sample[1].guestId))?.rsvp,
      maybe: byId.get(String(sample[2].guestId))?.rsvp,
      noAnswer: byId.get(String(sample[3].guestId))?.rsvp,
      dialFailed: byId.get(String(sample[4].guestId))?.rsvp,
    };

    report.push({
      id: "round1-1000",
      eligible: 1000,
      messages: messagesSent,
      messageFailures,
      kosherRouted: firstDispatch.routed,
      dialedInline: firstDispatch.dialed,
      continued: continued.dialed,
      attempts: attempts.length,
      active: activeAfter,
      queued: queuedAfter,
      duplicatesAfterRerun: attemptsAfterRerun - attempts.length,
      secondDispatchRouted: secondDispatch.routed,
      rsvpResults,
      passed:
        messagesSent === 800 &&
        attempts.length === 200 &&
        overlap.length === 0 &&
        attemptsAfterRerun === 200 &&
        rsvpResults.yes === "yes" &&
        rsvpResults.yesCount === 4 &&
        rsvpResults.no === "no" &&
        rsvpResults.maybe === "maybe" &&
        rsvpResults.noAnswer === "pending" &&
        rsvpResults.dialFailed === "pending",
    });
    assert.equal(messagesSent, 800);
    assert.equal(attempts.length, 200);
    assert.equal(attemptsAfterRerun, 200);
    assert.equal(rsvpResults.yes, "yes");
    assert.equal(rsvpResults.yesCount, 4);
    assert.equal(rsvpResults.no, "no");
    assert.equal(rsvpResults.maybe, "maybe");
    assert.equal(rsvpResults.noAnswer, "pending");
    assert.equal(rsvpResults.dialFailed, "pending");

    const isolated = await makeCustomer(true);
    const isolatedGuests = [guest("0527100301"), guest("0527100302"), guest("0505550303")];
    const isolatedSplit = await partitionMessageRoundGuests({
      user: isolated.user,
      schedule: isolated.schedule,
      guests: isolatedGuests,
    });
    let isolatedMessages = 0;
    try {
      throw new Error("SIMULATED_MESSAGE_FAILURE");
    } catch {
      messageFailures += 1;
    }
    const callsDespiteMessageFailure = await dispatchKosherMessageRound({
      user: isolated.user,
      invitation: isolated.invitation,
      schedule: isolated.schedule,
      guests: isolatedSplit.kosherGuests,
    });
    const quietInvitation = {
      ...isolated.invitation.toObject(),
      kosherCallAudio: { status: "missing" },
    };
    const regularDespiteCallFailure = isolatedSplit.messageGuests.length;
    for (const item of isolatedSplit.messageGuests) {
      if (item.phone) isolatedMessages += 1;
    }
    const failedNarration = await dispatchKosherMessageRound({
      user: isolated.user,
      invitation: quietInvitation,
      schedule: isolated.schedule,
      guests: [guest("0527600304")],
    });
    report.push({
      id: "channel-isolation",
      messagesDespiteCallFailure: isolatedMessages,
      regularDespiteCallFailure,
      callsDespiteMessageFailure: callsDespiteMessageFailure.routed,
      narrationFailed: failedNarration.failed,
      passed:
        isolatedMessages === regularDespiteCallFailure &&
        callsDespiteMessageFailure.routed === 2 &&
        failedNarration.failed === 1,
    });
    assert.equal(callsDespiteMessageFailure.routed, 2);
    assert.equal(failedNarration.failed, 1);
    assert.equal(isolatedMessages, 1);

    const big = [
      ...Array.from({ length: 1300 }, (_, index) => guest(`0532${String(100000 + index)}`)),
      ...Array.from({ length: 700 }, (_, index) => guest(`05276${String(10000 + index)}`)),
    ];
    const bigSplit = await partitionMessageRoundGuests({ user, schedule, guests: big });
    assert.equal(bigSplit.messageGuests.length, 1300);
    assert.equal(bigSplit.kosherGuests.length, 700);

    await IvrCallAttempt.deleteMany({});
    const otherUsers = [0, 1].map(() => new mongoose.Types.ObjectId());
    await IvrCallAttempt.insertMany(
      Array.from({ length: 500 }, (_, index) => ({
        userId: otherUsers[index % 2],
        invitationId: new mongoose.Types.ObjectId(),
        guestId: new mongoose.Types.ObjectId(),
        round: 1,
        runId: "other-event",
        phone: `+9725000${String(10000 + index)}`,
        channel: "outbound_ivr",
        direction: "outbound",
        origin: "",
        status: "ringing",
        flowStep: "dialing",
        answered: false,
        rsvpApplied: false,
        durationSeconds: 0,
        dtmfDigits: [],
        processedWebhookEventIds: [],
        dialLockedAt: new Date(Date.now() - 60_000),
        telnyxCallControlId: `busy-${index}`,
      }))
    );
    const crowded = await makeCustomer(true);
    const crowdedGuests = Array.from({ length: 20 }, (_, index) => guest(`05271${String(20000 + index)}`));
    const crowdedSplit = await partitionMessageRoundGuests({
      user: crowded.user,
      schedule: crowded.schedule,
      guests: crowdedGuests,
    });
    const crowdedDispatch = await dispatchKosherMessageRound({
      user: crowded.user,
      invitation: crowded.invitation,
      schedule: crowded.schedule,
      guests: crowdedSplit.kosherGuests,
    });
    const activeWhileFull = await countActiveOutboundCalls();
    const queuedWhileFull = await IvrCallAttempt.countDocuments({
      scheduleId: crowded.schedule._id,
      status: "queued",
    });
    await IvrCallAttempt.updateOne(
      { telnyxCallControlId: "busy-0" },
      { $set: { status: "completed", flowStep: "done", endedAt: new Date(), answered: true } }
    );
    const released = await continueKosherMessageDials({ maxCalls: 1 });
    const activeAfterRelease = await countActiveOutboundCalls();
    report.push({
      id: "shared-cap-with-other-events",
      eligibleKosher: 700,
      eligibleMessages: 1300,
      otherActiveBefore: 500,
      newCallDialedWhileFull: crowdedDispatch.dialed,
      queuedWhileFull,
      releasedDialed: released.dialed,
      activeAfterRelease,
      passed:
        bigSplit.kosherGuests.length === 700 &&
        crowdedDispatch.dialed === 0 &&
        queuedWhileFull === 20 &&
        activeWhileFull === 500 &&
        released.dialed === 1 &&
        activeAfterRelease === 500,
    });
    assert.equal(crowdedDispatch.dialed, 0);
    assert.equal(queuedWhileFull, 20);
    assert.equal(activeWhileFull, 500);
    assert.equal(released.dialed, 1);
    assert.equal(activeAfterRelease, 500);

    console.log(
      `IVR_ROUND1_SIM ${JSON.stringify({
        realTelnyxCalls: 0,
        realMessages: 0,
        telnyxMocks,
        networkCalls,
        scriptUsesEventTitle: script.includes(eventTitle),
        report,
      })}`
    );
    assert.equal(networkCalls, telnyxMocks);
    assert.ok(report.every((row) => row.passed === true));
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    globalThis.fetch = originalFetch;
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
});
