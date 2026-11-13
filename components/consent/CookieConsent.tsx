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
    <section
      dir="rtl"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-[#C5A582] bg-[#F7F1E8] text-[#3E2D20] shadow-[0_-12px_40px_rgba(66,24,47,0.12)]"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:py-5">
        <div className="max-w-3xl">
          <h2 id={titleId} className="text-lg font-black text-[#42182F]">
            {customizing ? "התאמת עוגיות" : "עוגיות באתר Invistimo"}
          </h2>
          <p id={descriptionId} className="mt-2 text-sm leading-6 text-[#5C4636]">
            עוגיות חיוניות נדרשות להפעלת האתר. מדידה וכלים לא חיוניים כבויים עד שתבחרו.
            אפשר לשנות את הבחירה בכל עת דרך „הגדרות עוגיות” בתחתית האתר.
          </p>
          <p className="mt-2 text-sm leading-6">
            <Link href="/cookies" className="font-bold text-[#842B4C] underline underline-offset-4">
              מדיניות העוגיות
            </Link>
            <span aria-hidden> · </span>
            <Link href="/privacy" className="font-bold text-[#842B4C] underline underline-offset-4">
              מדיניות הפרטיות
            </Link>
          </p>
        </div>

        {customizing ? (
          <fieldset className="grid gap-3 border-0 p-0">
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

        <div className="grid gap-2 sm:grid-cols-3">
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
            className={secondaryButton}
            onClick={() => persist({ analytics: false, functional: false })}
          >
            דחיית עוגיות לא חיוניות
          </button>
          {customizing ? (
            <button type="button" className={secondaryButton} onClick={() => setCustomizing(false)}>
              חזרה
            </button>
          ) : (
            <button type="button" className={secondaryButton} onClick={() => setCustomizing(true)}>
              התאמה אישית
            </button>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {savedNote}
        </p>
      </div>
    </section>
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
    <label htmlFor={id} className="flex items-start gap-3 border border-[#E4D4BC] bg-[#FFF9F2] px-3 py-3">
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
  "inline-flex min-h-12 items-center justify-center rounded-none border border-[#42182F] bg-[#42182F] px-4 py-3 text-sm font-bold text-[#FFF8F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A582]";

const secondaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-none border border-[#842B4C] bg-[#FFF9F2] px-4 py-3 text-sm font-bold text-[#42182F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A582]";
