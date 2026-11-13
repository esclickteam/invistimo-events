/**
 * Cookie consent record for the marketing site.
 * Version changes force a new choice. Do not store personal data here.
 */

export const CONSENT_POLICY_VERSION = "2026-11-13";
export const CONSENT_STORAGE_KEY = "invistimo-consent";
export const CONSENT_COOKIE_NAME = "invistimo_consent";
/** Short signal the server can read without parsing the consent record. */
export const ANALYTICS_SIGNAL_COOKIE = "invistimo_analytics";
/** Six months. The record is renewed when the visitor chooses again. */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export const CONSENT_CHANGED_EVENT = "invistimo-consent";
export const OPEN_COOKIE_SETTINGS_EVENT = "invistimo:open-cookie-settings";

export type ConsentChoices = {
  necessary: true;
  analytics: boolean;
  functional: boolean;
};

export type ConsentRecord = {
  version: string;
  choices: ConsentChoices;
  updatedAt: string;
};

export function defaultConsentChoices(): ConsentChoices {
  return {
    necessary: true,
    analytics: false,
    functional: false,
  };
}

export function isAnalyticsBrowserCookie(name: string) {
  const cookieName = name.trim();
  if (!cookieName || cookieName === CONSENT_COOKIE_NAME) return false;
  return (
    cookieName === "_ga" ||
    cookieName.startsWith("_ga_") ||
    cookieName === "_gid" ||
    cookieName.startsWith("_gat")
  );
}
