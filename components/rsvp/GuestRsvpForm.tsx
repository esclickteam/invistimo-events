"use client";

import TransportationGuestSection from "@/app/components/TransportationGuestSection";
import { RSVP_COPY } from "@/lib/rsvp/guestRsvpLogic";
import type { GuestRsvpController } from "@/lib/rsvp/useGuestRsvpController";
import HeartBurst, { HeartBurstStyles } from "./HeartBurst";
import { GiftSection, PublicEventNoteSection } from "./GuestRsvpExtras";
import type { RsvpAppearance } from "./rsvpAppearances";
import { personalRsvpAppearance } from "./rsvpAppearances";

type Props = {
  controller: GuestRsvpController;
  appearance?: RsvpAppearance;
  showHeading?: boolean;
  showTransportation?: boolean;
  showGiftAndNote?: boolean;
  allowUpdateAfterSubmit?: boolean;
};

export default function GuestRsvpForm({
  controller,
  appearance = personalRsvpAppearance,
  showHeading = true,
  showTransportation = false,
  showGiftAndNote = true,
  allowUpdateAfterSubmit = true,
}: Props) {
  const {
    sent,
    isSubmitting,
    form,
    activeMenuOptions,
    giftOptions,
    publicEventNote,
    heartTrigger,
    errorMessage,
    chooseYes,
    chooseNo,
    decrementCount,
    incrementCount,
    toggleNote,
    handleSubmit,
    resetSent,
    shareId,
    token,
    selectedGuest,
  } = controller;

  const guestToken = String(selectedGuest?.token || token || "").trim();

  if (sent) {
    return (
      <div data-rsvp-core="1" data-rsvp-state="success">
        <div className={appearance.success}>
          {RSVP_COPY.success}
          {allowUpdateAfterSubmit ? (
            <button type="button" onClick={resetSent} className={appearance.updateLink}>
              רוצים לעדכן?
            </button>
          ) : null}
        </div>
        {showTransportation && shareId && guestToken ? (
          <div className="mt-6">
            <TransportationGuestSection shareId={shareId} guestToken={guestToken} hideGuestIdentity />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div data-rsvp-core="1" data-rsvp-state="form">
      <HeartBurst triggerKey={heartTrigger} />
      <HeartBurstStyles />

      <form onSubmit={handleSubmit} className={appearance.form}>
        {appearance.glowA ? <div className={appearance.glowA} /> : null}
        {appearance.glowB ? <div className={appearance.glowB} /> : null}

        <div className={appearance.inner}>
          {showHeading ? (
            <div className={appearance.headingWrap}>
              <h2 className={appearance.heading}>{RSVP_COPY.heading}</h2>
            </div>
          ) : (
            <h2 className="sr-only">{RSVP_COPY.heading}</h2>
          )}

          <div className={appearance.yesNoGrid}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={chooseYes}
              className={appearance.yesButton(form.rsvp === "yes")}
            >
              {RSVP_COPY.yesLabel}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={chooseNo}
              className={appearance.noButton(form.rsvp === "no")}
            >
              {RSVP_COPY.noLabel}
            </button>
          </div>

          {form.rsvp === "yes" && (
            <div className={appearance.countBox}>
              <div className={appearance.countLabel}>{RSVP_COPY.countLabel}</div>

              <div className={appearance.countRow}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={decrementCount}
                  className={appearance.countButton}
                  aria-label="הפחתת מספר אורחים"
                >
                  −
                </button>

                <div className={appearance.countValue}>{form.arrivedCount}</div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={incrementCount}
                  className={appearance.countButton}
                  aria-label="הוספת אורח"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {form.rsvp === "yes" && activeMenuOptions.length > 0 && (
            <div className={appearance.notesBox}>
              <label className={appearance.notesLabel}>{RSVP_COPY.notesLabel}</label>

              <div className={appearance.notesGrid}>
                {activeMenuOptions.map((opt) => (
                  <label key={opt.key} className={appearance.noteItem(form.notes.includes(opt.label))}>
                    <input
                      type="checkbox"
                      disabled={isSubmitting}
                      checked={form.notes.includes(opt.label)}
                      onChange={(e) => toggleNote(opt.label, e.target.checked)}
                      className={appearance.checkboxClass}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className={appearance.submit}>
            {isSubmitting ? RSVP_COPY.submitting : RSVP_COPY.submit}
          </button>

          {errorMessage ? <p className={appearance.error}>{errorMessage}</p> : null}

          {showGiftAndNote ? (
            <>
              <PublicEventNoteSection note={publicEventNote} />
              <div className="mt-5">
                <GiftSection giftOptions={giftOptions} />
              </div>
            </>
          ) : null}
        </div>
      </form>

      {showTransportation && shareId && guestToken ? (
        <div className="mt-6">
          <TransportationGuestSection shareId={shareId} guestToken={guestToken} hideGuestIdentity />
        </div>
      ) : null}
    </div>
  );
}
