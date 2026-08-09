/**
 * Next.js instrumentation — boot-time environment safety checks.
 * Runs once in the Node.js runtime (not Edge).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  try {
    const { assertEnvironmentSafety } = await import("@/lib/env/safetyGuards");
    // Soft-fail at register so builds aren't blocked when env incomplete;
    // hard-fail happens on connectDB() for request traffic.
    assertEnvironmentSafety({ throwOnError: false });
  } catch (err) {
    console.error("[instrumentation] env safety check failed:", err);
  }
}
