import CutoverProbeEvent from "@/models/CutoverProbeEvent";
import {
  CUTOVER_PROBE_ID,
  CUTOVER_PROBE_PHONE_WINDOW_MS,
  type CutoverProbeDecision,
  type CutoverProbeRegistry,
  acceptProbeEvent,
  emptyCutoverProbeRegistry,
  probeEventKey,
  registerCutoverProbeWamid,
} from "@/lib/whatsapp/cutoverProbe";

export async function loadCutoverProbeRegistry(): Promise<CutoverProbeRegistry> {
  const rows = await CutoverProbeEvent.find({
    probeId: CUTOVER_PROBE_ID,
    role: "registration",
  })
    .select("wamid createdAt")
    .lean();
  const cutoff = Date.now() - CUTOVER_PROBE_PHONE_WINDOW_MS;
  let registry = emptyCutoverProbeRegistry();
  for (const row of rows) {
    const createdAt = new Date(row.createdAt || 0).getTime();
    registry = registerCutoverProbeWamid(registry, String(row.wamid || ""), {
      isolatePhone: Number.isFinite(createdAt) && createdAt >= cutoff,
    });
  }
  return registry;
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
  const key = probeEventKey(decision);
  const existing = await CutoverProbeEvent.findOne({
    probeId: CUTOVER_PROBE_ID,
    role: decision.eventType,
    wamid: decision.wamid,
    providerStatus: decision.providerStatus,
  })
    .select("_id")
    .lean();
  const seen = new Set(existing ? [key] : []);
  const accepted = acceptProbeEvent(seen, decision);
  if (!accepted.stored) return accepted;
  await CutoverProbeEvent.create({
    probeId: CUTOVER_PROBE_ID,
    role: decision.eventType,
    wamid: decision.wamid,
    contextWamid: decision.contextWamid,
    direction: decision.direction,
    providerStatus: decision.providerStatus,
    duplicate: false,
  });
  return accepted;
}
