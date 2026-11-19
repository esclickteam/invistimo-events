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
    sendsContinue: !paused,
    pauseRequires: [DIALOG_SEND_PAUSE_ENV, DIALOG_SEND_PAUSE_CONFIRM_ENV],
    resumeBy: "unset both pause variables, then let the existing cron claim pending and scheduled rows",
  };
}
