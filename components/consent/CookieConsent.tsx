"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import {
  CONSENT_CHANGED_EVENT,
  OPEN_COOKIE_SETTINGS_EVENT,
  type ConsentRecord,
} from "@/lib/consent/policy";
import {
  clearGoogleAnalyticsCookies,
  ensureGoogleConsentDefault,
  loadGoogleAnalyticsScript,
  setMeasurementTransportBlocked,
  updateGoogleAnalyticsConsent,
} from "@/lib/consent/googleConsent";
import { createConsentRecord, readConsent, writeConsent } from "@/lib/consent/storage";
import {
  GA_MEASUREMENT_ID,
  analyticsAllowed,
  contentGroup,
  isGaMeasurementId,
} from "@/lib/seo/analytics";

function applyRecord(record: ConsentRecord | null, pathname: string) {
  ensureGoogleConsentDefault();
  const granted = record?.choices.analytics === true;
  const measureHere = granted && analyticsAllowed(pathname);
  setMeasurementTransportBlocked(!measureHere);
  updateGoogleAnalyticsConsent(measureHere);
  if (!granted) {
    clearGoogleAnalyticsCookies();
    return;
  }
  if (!measureHere || !isGaMeasurementId(GA_MEASUREMENT_ID)) return;
  window.gtag?.("js", new Date());
  window.gtag?.("config", GA_MEASUREMENT_ID, {
    page_path: pathname,
    content_group: contentGroup(pathname),
    anonymize_ip: true,
    send_page_view: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  void loadGoogleAnalyticsScript(GA_MEASUREMENT_ID);
}

export default function CookieConsent() {
  const pathname = usePathname() || "/";
  const titleId = useId();
  const descriptionId = useId();
  const offer = analyticsAllowed(pathname);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [savedNote, setSavedNote] = useState("");

  const persist = useCallback(
    (next: { analytics: boolean; functional: boolean }) => {
      const created = createConsentRecord(next);
      writeConsent(created);
      setAnalytics(created.choices.analytics);
      setFunctional(created.choices.functional);
      setVisible(false);
      setCustomizing(false);
      setSavedNote("הבחירה נשמרה במכשיר זה.");
      applyRecord(created, pathname);
      window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT));
    },
    [pathname]
  );

  useEffect(() => {
    const stored = readConsent();
    setAnalytics(stored?.choices.analytics === true);
    setFunctional(stored?.choices.functional === true);
    setReady(true);
    applyRecord(stored, pathname);
    setVisible(offer && !stored);
  }, [offer, pathname]);

  useEffect(() => {
    return () => {
      setMeasurementTransportBlocked(true);
      updateGoogleAnalyticsConsent(false);
    };
  }, []);

  useEffect(() => {
    const open = () => {
      const stored = readConsent();
      setAnalytics(stored?.choices.analytics === true);
      setFunctional(stored?.choices.functional === true);
      setCustomizing(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    window.__invistimoConsentReady = true;
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, []);

  if (!ready || !visible) {
    return (
      <p className="sr-only" aria-live="polite">
        {savedNote}
      </p>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-3 pb-3 sm:px-5 sm:pb-5">
      <section
        dir="rtl"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="pointer-events-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-[920px] overflow-y-auto rounded-2xl bg-white text-[#1A1A1A] shadow-[0_10px_40px_rgba(20,16,12,0.16)] ring-1 ring-black/5"
      >
        <div className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="flex min-w-0 items-start gap-3">
            <CookieMark />
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-bold leading-6 text-[#1A1A1A]">
                עוגיות באתר
              </h2>
              <p id={descriptionId} className="mt-1 text-[13px] leading-5 text-[#3F3F3F] sm:text-sm sm:leading-6">
                אנחנו משתמשים בעוגיות הכרחיות כדי שהאתר יעבוד. מדידה וכלים לא חיוניים נטענים רק אחרי הסכמה.{" "}
                <Link href="/privacy" className="font-semibold text-[#1A1A1A] underline underline-offset-2">
                  מדיניות הפרטיות
                </Link>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0 md:items-center md:gap-3">
            {customizing ? (
              <button type="button" className={primaryButton} onClick={() => persist({ analytics, functional })}>
                שמירת הבחירה
              </button>
            ) : (
              <button
                type="button"
                className={primaryButton}
                onClick={() => persist({ analytics: true, functional: true })}
              >
                אישור הכול
              </button>
            )}
            <button
              type="button"
              className={primaryButton}
              aria-label="דחיית עוגיות לא חיוניות"
              onClick={() => persist({ analytics: false, functional: false })}
            >
              דחייה
            </button>
            {customizing ? (
              <button type="button" className={textButton} onClick={() => setCustomizing(false)}>
                חזרה
              </button>
            ) : (
              <button type="button" className={textButton} onClick={() => setCustomizing(true)}>
                הגדרות
              </button>
            )}
          </div>
        </div>

        {customizing ? (
          <fieldset className="grid gap-3 border-0 px-4 pb-4 sm:px-5 sm:pb-5">
            <legend className="sr-only">קטגוריות עוגיות</legend>
            <Choice
              title="חיוניות"
              description="התחברות, אבטחת הפעלה ושמירת הבחירה הזו. תמיד פעילות."
              checked
              disabled
            />
            <Choice
              title="מדידה וניתוח"
              description="Google Analytics למדידת שימוש בעמודים הציבוריים, בלי פרסום מותאם."
              checked={analytics}
              onChange={setAnalytics}
            />
            <Choice
              title="פונקציונליות לא חיונית"
              description="תוסף הנגישות של UserWay באתר השיווקי."
              checked={functional}
              onChange={setFunctional}
            />
          </fieldset>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {savedNote}
        </p>
      </section>
    </div>
  );
}

function CookieMark() {
  return (
    <span
      className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F8E7B0]"
      aria-hidden
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" fill="#F3C14B" />
        <circle cx="9" cy="10" r="1.15" fill="#7A4E12" />
        <circle cx="13.6" cy="8.6" r="0.9" fill="#7A4E12" />
        <circle cx="14.2" cy="13.1" r="1.15" fill="#7A4E12" />
        <circle cx="10" cy="14.4" r="0.8" fill="#7A4E12" />
      </svg>
    </span>
  );
}

function Choice({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-start gap-3 rounded-xl border border-[#ECECEC] bg-[#FAFAFA] px-3 py-3">
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[#42182F]"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span>
        <span className="block text-sm font-black text-[#42182F]">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-[#5C4636]">{description}</span>
      </span>
    </label>
  );
}

const primaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2C2C2C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4A46A]";

const textButton =
  "col-span-2 inline-flex min-h-11 items-center justify-center px-2 text-sm font-semibold text-[#1A1A1A] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4A46A] md:col-auto";
