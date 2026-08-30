"use client";

import type { ReactNode } from "react";
import TransportationGuestSection from "@/app/components/TransportationGuestSection";
import { RSVP_COPY } from "@/lib/rsvp/guestRsvpLogic";
import type { GuestRsvpController } from "@/lib/rsvp/useGuestRsvpController";
import HeartBurst, { HeartBurstStyles } from "./HeartBurst";
import { GiftSection, PublicEventNoteSection } from "./GuestRsvpExtras";
import type { RsvpAppearance } from "./rsvpAppearances";
import { personalRsvpAppearance } from "./rsvpAppearances";

export type GuestRsvpCopy = {
  heading?: string;
  success?: string;
  updateLabel?: string;
  yesLabel?: string;
  noLabel?: string;
  submitLabel?: string;
  countLabel?: string;
  notesLabel?: string;
  publicNote?: string;
};

type Props = {
  controller: GuestRsvpController;
  appearance?: RsvpAppearance;
  showHeading?: boolean;
  showTransportation?: boolean;
  showGiftAndNote?: boolean;
  allowUpdateAfterSubmit?: boolean;
  /** Override default Hebrew strings (wedding-site editor). */
  copy?: GuestRsvpCopy;
  /** Editor-only: render the thank-you state so it can be styled on canvas. */
  forceSent?: boolean;
  /** Wedding visual editor: labels are content-editable, submit is inert. */
  editable?: boolean;
};

function RsvpLabel({
  path,
  label,
  editable,
  children,
  className,
}: {
  path: string;
  label: string;
  editable?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={className}
      data-ww-path={path}
      data-ww-label={editable ? label : undefined}
      data-ww-edit={editable ? "text" : undefined}
      contentEditable={editable || undefined}
      suppressContentEditableWarning={editable}
      spellCheck={editable || undefined}
      style={editable ? { whiteSpace: "pre-wrap", outline: "none" } : undefined}
    >
      {children}
    </span>
  );
}

export default function GuestRsvpForm({
  controller,
  appearance = personalRsvpAppearance,
  showHeading = true,
  showTransportation = false,
  showGiftAndNote = true,
  allowUpdateAfterSubmit = true,
  copy,
  forceSent = false,
  editable = false,
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
  const heading = copy?.heading || RSVP_COPY.heading;
  const successMessage = copy?.success || RSVP_COPY.success;
  const updateLabel = copy?.updateLabel || "רוצים לעדכן?";
  const yesLabel = copy?.yesLabel || RSVP_COPY.yesLabel;
  const noLabel = copy?.noLabel || RSVP_COPY.noLabel;
  const submitLabel = copy?.submitLabel || RSVP_COPY.submit;
  const countLabel = copy?.countLabel || RSVP_COPY.countLabel;
  const notesLabel = copy?.notesLabel || RSVP_COPY.notesLabel;
  const note = {
    enabled: Boolean(copy?.publicNote?.trim() || publicEventNote.enabled),
    text: (copy?.publicNote || publicEventNote.text || "").trim(),
  };

  if (sent || forceSent) {
    return (
      <div data-rsvp-core="1" data-rsvp-state="success">
        <div data-rsvp-card="1" className={appearance.form}>
          {appearance.glowA ? <div className={appearance.glowA} /> : null}
          {appearance.glowB ? <div className={appearance.glowB} /> : null}
          <div className={appearance.inner}>
            <p className={appearance.success}>
              <RsvpLabel path="rsvpSuccessMessage" label="הודעת תודה" editable={editable}>
                {successMessage}
              </RsvpLabel>
            </p>
            {allowUpdateAfterSubmit ? (
              forceSent ? (
                <p className={appearance.updateLink}>
                  <RsvpLabel path="rsvpUpdateLabel" label="קישור עדכון תשובה" editable={editable}>
                    {updateLabel}
                  </RsvpLabel>
                </p>
              ) : (
                <button type="button" onClick={resetSent} className={appearance.updateLink}>
                  {updateLabel}
                </button>
              )
            ) : null}
          </div>
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

      <form
        onSubmit={(event) => {
          if (editable) {
            event.preventDefault();
            return;
          }
          handleSubmit(event);
        }}
        data-rsvp-card="1"
        className={appearance.form}
      >
        {appearance.glowA ? <div className={appearance.glowA} /> : null}
        {appearance.glowB ? <div className={appearance.glowB} /> : null}

        <div className={appearance.inner}>
          {showHeading ? (
            <div className={appearance.headingWrap}>
              <h2 className={appearance.heading}>
                <RsvpLabel path="rsvpSubtitle" label="משנה לאישור הגעה" editable={editable}>
                  {heading}
                </RsvpLabel>
              </h2>
            </div>
          ) : (
            <h2 className="sr-only">{heading}</h2>
          )}

          <div className={appearance.yesNoGrid}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={chooseYes}
              className={appearance.yesButton(form.rsvp === "yes")}
            >
              <RsvpLabel path="rsvpYesLabel" label="כפתור מגיע" editable={editable}>
                {yesLabel}
              </RsvpLabel>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={chooseNo}
              className={appearance.noButton(form.rsvp === "no")}
            >
              <RsvpLabel path="rsvpNoLabel" label="כפתור לא מגיע" editable={editable}>
                {noLabel}
              </RsvpLabel>
            </button>
          </div>

          {form.rsvp === "yes" && (
            <div className={appearance.countBox}>
              <div className={appearance.countLabel}>
                <RsvpLabel path="rsvpCountLabel" label="כותרת מספר אורחים" editable={editable}>
                  {countLabel}
                </RsvpLabel>
              </div>

              <div className={appearance.countRow}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={decrementCount}
                  className={appearance.countButton}
                  aria-label="הפחתת מספר אורחים"
                  data-rsvp-interactive="1"
                >
                  −
                </button>

                <div className={appearance.countValue} data-rsvp-interactive="1">
                  {form.arrivedCount}
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={incrementCount}
                  className={appearance.countButton}
                  aria-label="הוספת אורח"
                  data-rsvp-interactive="1"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {form.rsvp === "yes" && activeMenuOptions.length > 0 && (
            <div className={appearance.notesBox}>
              <label className={appearance.notesLabel}>
                <RsvpLabel path="rsvpNotesLabel" label="כותרת בקשות מיוחדות" editable={editable}>
                  {notesLabel}
                </RsvpLabel>
              </label>

              <div className={appearance.notesGrid}>
                {activeMenuOptions.map((opt) => (
                  <label
                    key={opt.key}
                    className={appearance.noteItem(form.notes.includes(opt.label))}
                    data-rsvp-interactive="1"
                  >
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

          <button
            type={editable ? "button" : "submit"}
            disabled={isSubmitting}
            className={appearance.submit}
            data-rsvp-submit="1"
          >
            <RsvpLabel path="rsvpSubmitLabel" label="כפתור שליחה" editable={editable}>
              {isSubmitting ? RSVP_COPY.submitting : submitLabel}
            </RsvpLabel>
          </button>

          {errorMessage ? <p className={appearance.error}>{errorMessage}</p> : null}

          {showGiftAndNote ? (
            <>
              {note.enabled && note.text ? (
                <section className="mt-7 w-full overflow-hidden rounded-[30px] border border-[#eadfce] bg-white/90 p-6 text-center shadow-[0_20px_70px_rgba(92,66,38,0.12)] backdrop-blur">
                  <p className="mx-auto mt-4 max-w-sm whitespace-pre-line text-base font-bold leading-8 text-[#5a4634]">
                    <RsvpLabel path="rsvpNote" label="הערת אישור הגעה" editable={editable}>
                      {note.text}
                    </RsvpLabel>
                  </p>
                </section>
              ) : null}
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
