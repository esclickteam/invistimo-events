/**
 * Controlled stop for the live 360dialog sender.
 * Both values must be set together. Unset means sends continue.
 * Deploying this file does not pause any queue.
 */
export const DIALOG_SEND_PAUSE_ENV = "INVISTIMO_DIALOG_SEND_PAUSED";
export const DIALOG_SEND_PAUSE_CONFIRM_ENV = "INVISTIMO_DIALOG_SEND_PAUSE_CONFIRM";
export const DIALOG_SEND_PAUSE_PHRASE = "PAUSE_INVISTIMO_DIALOG_SENDS";

export function dialogSendsArePaused(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return (
    env[DIALOG_SEND_PAUSE_ENV] === "YES" &&
    env[DIALOG_SEND_PAUSE_CONFIRM_ENV] === DIALOG_SEND_PAUSE_PHRASE
  );
}

export function isDialogSendPauseError(error: unknown) {
  const err = error as { code?: string; message?: string } | null;
  return (
    err?.code === "INVISTIMO_DIALOG_SEND_PAUSED" ||
    err?.message === "INVISTIMO_DIALOG_SEND_PAUSED"
  );
}

/**
 * A claim that has not reached 360dialog is released back to pending.
 * A request already on the wire blocks the provider switch until it finishes.
 */
export function inFlightDialogSendDecision(input: {
  paused: boolean;
  claimed: boolean;
  requestStarted: boolean;
}) {
  if (!input.claimed) {
    return { callProvider: false, releaseClaim: false, blocksProviderSwitch: false };
  }
  if (input.requestStarted) {
    return { callProvider: false, releaseClaim: false, blocksProviderSwitch: true };
  }
  if (input.paused) {
    return { callProvider: false, releaseClaim: true, blocksProviderSwitch: false };
  }
  return { callProvider: true, releaseClaim: false, blocksProviderSwitch: false };
}

export function dialogSendPausePlan(env: NodeJS.ProcessEnv = process.env) {
  const paused = dialogSendsArePaused(env);
  return {
    paused,
    armed: paused,
    sendsContinue: !paused && !outboundWhatsappSendsBlocked(env),
    pauseRequires: [DIALOG_SEND_PAUSE_ENV, DIALOG_SEND_PAUSE_CONFIRM_ENV],
    resumeBy:
      "customer sends stay held until Bizuply is the provider and both release values are set; unsetting only the 360dialog pause does not send",
  };
}

export const BIZUPLY_SEND_RELEASE_ENV = "INVISTIMO_BIZUPLY_SENDS";
export const BIZUPLY_SEND_RELEASE_CONFIRM_ENV = "INVISTIMO_BIZUPLY_SEND_CONFIRM";
export const BIZUPLY_SEND_RELEASE_PHRASE = "RELEASE_INVISTIMO_BIZUPLY_SENDS";

function providerSelection(env: NodeJS.ProcessEnv) {
  return String(env.WHATSAPP_PROVIDER ?? "dialog").trim().toLowerCase();
}

export function bizuplyCustomerSendsReleased(
  env: NodeJS.ProcessEnv = process.env
) {
  const provider = providerSelection(env);
  return (
    (provider === "bizuply" || provider === "biz") &&
    env[BIZUPLY_SEND_RELEASE_ENV] === "RELEASED" &&
    env[BIZUPLY_SEND_RELEASE_CONFIRM_ENV] === BIZUPLY_SEND_RELEASE_PHRASE
  );
}

/**
 * 360dialog stays paused by the existing pair.
 * Bizuply stays held until a separate release, so switching the provider
 * cannot start customer rounds by itself.
 * A legacy 360dialog-only probe is allowed only while 360dialog is still
 * the selected provider and the pause is not armed.
 */
export function outboundWhatsappSendsBlocked(
  env: NodeJS.ProcessEnv = process.env
) {
  if (dialogSendsArePaused(env)) return true;
  const provider = providerSelection(env);
  if (provider === "bizuply" || provider === "biz") {
    return !bizuplyCustomerSendsReleased(env);
  }
  return false;
}

export function legacyDialogProbeAllowed(
  env: NodeJS.ProcessEnv = process.env
) {
  const provider = providerSelection(env);
  return (
    (provider === "" || provider === "dialog" || provider === "360dialog" || provider === "d360") &&
    !outboundWhatsappSendsBlocked(env)
  );
}
