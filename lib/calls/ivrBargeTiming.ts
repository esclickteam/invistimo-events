/**
 * Latency between Telnyx occurred_at timestamps.
 * Server receive time is not used.
 */

export function ivrBargeLatency(input: {
  digitAt?: Date | string | null;
  stoppedAt?: Date | string | null;
  followUpAt?: Date | string | null;
}) {
  const digit = instantMs(input.digitAt);
  const stopped = instantMs(input.stoppedAt);
  const followUp = instantMs(input.followUpAt);
  const stopMs = digit != null && stopped != null ? stopped - digit : null;
  const followUpMs = digit != null && followUp != null ? followUp - digit : null;
  const overlap = stopped != null && followUp != null && followUp < stopped;
  return { stopMs, followUpMs, overlap };
}

function instantMs(value: Date | string | null | undefined) {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}
