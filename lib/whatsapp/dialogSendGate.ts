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
