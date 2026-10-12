/**
 * IVR narration uses the event name from event details.
 * No live TTS, no dials, no deletion of stored recordings.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  contentHashForComposedInbound,
  contentHashForComposedIntro,
  IVR_COMPOSE_VERSION,
  IVR_INBOUND_COMPOSE_VERSION,
} from "../../lib/calls/ivrComposeIntro";
import {
  classifyStoredAiNarration,
  ivrSpokenNameHash,
  mergeRetainedAudioClips,
  resolveSpokenIvrEventName,
} from "../../lib/calls/ivrSpokenEventName";
import { IVR_GLOBAL_PACK_TEXTS } from "../../lib/calls/ivrScript";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

test("spoken name comes from event details, not a narration field", () => {
  assert.equal(
    resolveSpokenIvrEventName({
      invitation: { title: "החתונה של דניאל ונועה" },
      event: { title: "שם אחר", hostsNames: "אחרים" },
    }),
    "החתונה של דניאל ונועה"
  );

  assert.equal(
    resolveSpokenIvrEventName({
      invitation: { title: "הזמנה חדשה", eventType: "wedding", hostsNames: "דניאל ונועה" },
    }),
    "החתונה של דניאל ונועה"
  );

  assert.equal(
    resolveSpokenIvrEventName({
      invitation: { title: "ערב חברה", eventType: "other" },
    }),
    "ערב חברה"
  );

  const before = resolveSpokenIvrEventName({
    invitation: { title: "החתונה של דניאל ונועה" },
  });
  const after = resolveSpokenIvrEventName({
    invitation: { title: "החתונה של מאיה ויואב" },
  });
  assert.notEqual(before, after);
});

test("a separate narration name does not override event details", () => {
  const spoken = resolveSpokenIvrEventName({
    invitation: { title: "החתונה של דניאל ונועה" },
  });
  assert.equal(spoken, "החתונה של דניאל ונועה");
  assert.equal(spoken.includes("שם לקריינות"), false);
});

test("unchanged event name reuses the stored AI file", () => {
  const spokenName = "החתונה של דניאל ונועה";
  const voiceId = "voice-female";
  const nameHash = ivrSpokenNameHash({ spokenName, voiceId, voiceGender: "female" });
  const pack = {
    beforeHash: "before",
    afterHash: "after",
    inboundBeforeHash: "in-before",
    inboundAfterHash: "in-after",
    voiceId,
  };
  const composeHash = contentHashForComposedIntro({
    beforeHash: pack.beforeHash,
    eventNameHash: nameHash,
    afterHash: pack.afterHash,
    voiceId,
  });
  const inboundHash = contentHashForComposedInbound({
    beforeHash: pack.inboundBeforeHash,
    eventNameHash: nameHash,
    afterHash: pack.inboundAfterHash,
    voiceId,
  });
  const cfg = {
    audioMode: "ai",
    voiceGender: "female",
    eventName: spokenName,
    eventNamePronunciation: "",
    eventNameAudio: {
      status: "ready",
      contentHash: nameHash,
      r2Key: "name-key",
      publicToken: "name-token",
      approved: true,
    },
    composedIntroAudio: {
      status: "ready",
      composeVersion: IVR_COMPOSE_VERSION,
      contentHash: composeHash,
      r2Key: "composed-key",
      publicToken: "composed-token",
      approved: true,
    },
    composedInboundAudio: {
      status: "ready",
      composeVersion: IVR_INBOUND_COMPOSE_VERSION,
      contentHash: inboundHash,
      eventNameContentHash: nameHash,
      r2Key: "inbound-key",
      approved: true,
    },
    recordingApproval: {
      approved: true,
      audioMode: "ai",
      audioContentHash: composeHash,
      audioPublicToken: "composed-token",
    },
  };

  assert.equal(
    classifyStoredAiNarration({
      spokenName,
      voiceGender: "female",
      pack,
      cfg,
      composeVersion: IVR_COMPOSE_VERSION,
      inboundComposeVersion: IVR_INBOUND_COMPOSE_VERSION,
    }),
    "ready"
  );

  assert.equal(
    classifyStoredAiNarration({
      spokenName: "החתונה של מאיה ויואב",
      voiceGender: "female",
      pack,
      cfg,
      composeVersion: IVR_COMPOSE_VERSION,
      inboundComposeVersion: IVR_INBOUND_COMPOSE_VERSION,
    }),
    "rebuild"
  );
});

test("matching clips without client approval are auto-approved, not rebuilt", () => {
  const spokenName = "החתונה של דניאל ונועה";
  const voiceId = "voice-female";
  const nameHash = ivrSpokenNameHash({ spokenName, voiceId, voiceGender: "female" });
  const pack = {
    beforeHash: "before",
    afterHash: "after",
    inboundBeforeHash: "in-before",
    inboundAfterHash: "in-after",
    voiceId,
  };
  const kind = classifyStoredAiNarration({
    spokenName,
    voiceGender: "female",
    pack,
    cfg: {
      audioMode: "self_recorded",
      voiceGender: "female",
      eventName: spokenName,
      eventNamePronunciation: "",
      eventNameAudio: {
        status: "ready",
        contentHash: nameHash,
        r2Key: "name-key",
        publicToken: "name-token",
        approved: false,
      },
      composedIntroAudio: {
        status: "ready",
        composeVersion: IVR_COMPOSE_VERSION,
        contentHash: contentHashForComposedIntro({
          beforeHash: pack.beforeHash,
          eventNameHash: nameHash,
          afterHash: pack.afterHash,
          voiceId,
        }),
        r2Key: "composed-key",
        publicToken: "composed-token",
        approved: false,
      },
      composedInboundAudio: {
        status: "ready",
        composeVersion: IVR_INBOUND_COMPOSE_VERSION,
        contentHash: contentHashForComposedInbound({
          beforeHash: "in-before",
          eventNameHash: nameHash,
          afterHash: "in-after",
          voiceId,
        }),
        eventNameContentHash: nameHash,
        r2Key: "inbound-key",
      },
      recordingApproval: { approved: false, audioMode: "self_recorded" },
    },
    composeVersion: IVR_COMPOSE_VERSION,
    inboundComposeVersion: IVR_INBOUND_COMPOSE_VERSION,
  });
  assert.equal(kind, "approve");
});

test("older clips are retained and not discarded", () => {
  const kept = mergeRetainedAudioClips(
    [{ publicToken: "old", r2Key: "old-key", contentType: "audio/mpeg" }],
    [{ publicToken: "new", r2Key: "new-key", contentType: "audio/mpeg" }]
  );
  assert.deepEqual(
    kept.map((clip) => clip.publicToken),
    ["old", "new"]
  );
});

test("fixed narration wording is unchanged", () => {
  assert.equal(
    IVR_GLOBAL_PACK_TEXTS.introBeforeEventName,
    "שלום, אנחנו מתקשרים בנוגע לאירוע"
  );
  assert.match(IVR_GLOBAL_PACK_TEXTS.introAfterEventName, /הקישו 1/);
  assert.match(IVR_GLOBAL_PACK_TEXTS.introAfterEventName, /הקישו 2/);
  assert.match(IVR_GLOBAL_PACK_TEXTS.introAfterEventName, /הקישו 3/);
});

test("pending calls refresh narration without touching attempt history", () => {
  const rootSrc = (rel: string) =>
    readFileSync(path.join(root, rel), "utf8");
  const dialer = rootSrc("lib/calls/ivrDialer.ts");
  const auto = rootSrc("lib/calls/ivrAutoNarration.ts");
  const upload = rootSrc("app/api/ivr/audio/upload/route.ts");
  const panel = rootSrc("app/components/IvrRoundsPanel.jsx");
  assert.match(dialer, /withCurrentIvrNarration/);
  assert.match(dialer, /audioMode: "ai"/);
  assert.equal(dialer.includes("resolveReadySelfAudio"), false);
  assert.match(auto, /retainedAudioClips/);
  assert.equal(auto.includes("IvrCallAttempt"), false);
  assert.match(upload, /SELF_RECORDING_REMOVED/);
  assert.equal(upload.includes("deleteObject"), false);
  assert.equal(panel.includes("הקלטה אישית"), false);
  assert.equal(panel.includes("אני מאשר"), false);
});
