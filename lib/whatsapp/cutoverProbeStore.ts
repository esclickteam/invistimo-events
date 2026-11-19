import CutoverProbeEvent from "@/models/CutoverProbeEvent";
import {
  CUTOVER_PROBE_ID,
  type CutoverProbeDecision,
  type CutoverProbeRegistry,
  registryFromRegistrations,
} from "@/lib/whatsapp/cutoverProbe";

export async function loadCutoverProbeRegistry(): Promise<CutoverProbeRegistry> {
  const rows = await CutoverProbeEvent.find({
    probeId: CUTOVER_PROBE_ID,
    role: "registration",
  })
    .select("wamid createdAt")
    .lean();
  return registryFromRegistrations(rows);
}

export async function registerCutoverProbeSend(wamid: string) {
  const id = String(wamid || "").trim();
  if (!id) throw new Error("CUTOVER_PROBE_WAMID_REQUIRED");
  await CutoverProbeEvent.updateOne(
    {
      probeId: CUTOVER_PROBE_ID,
      role: "registration",
      wamid: id,
      providerStatus: "",
    },
    {
      $setOnInsert: {
        probeId: CUTOVER_PROBE_ID,
        role: "registration",
        wamid: id,
        contextWamid: "",
        direction: "outbound",
        providerStatus: "",
        duplicate: false,
      },
    },
    { upsert: true }
  );
  return { probeId: CUTOVER_PROBE_ID, wamid: id };
}

export async function recordCutoverProbe(decision: CutoverProbeDecision) {
  if (decision.ensureRegistration) {
    await registerCutoverProbeSend(decision.wamid);
  }
  const result = await CutoverProbeEvent.updateOne(
    {
      probeId: CUTOVER_PROBE_ID,
      role: decision.eventType,
      wamid: decision.wamid,
      providerStatus: decision.providerStatus,
    },
    {
      $setOnInsert: {
        probeId: CUTOVER_PROBE_ID,
        role: decision.eventType,
        wamid: decision.wamid,
        contextWamid: decision.contextWamid,
        direction: decision.direction,
        providerStatus: decision.providerStatus,
        duplicate: false,
      },
    },
    { upsert: true }
  );
  const stored = Number(result.upsertedCount || 0) > 0;
  return { ...decision, duplicate: !stored, stored };
}
