import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  CreditCard,
  Gift,
  Heart,
  MapPin,
  Navigation,
  Smartphone,
  Sparkles,
  PartyPopper,
  CarFront,
} from "lucide-react";

import dbConnect from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import CheckInPassClient from "@/app/check-in/pass/CheckInPassClient";
import { loadGuestPassForEventDetailsLink } from "@/lib/checkIn/loadGuestPass";
import { shouldOpenCheckInQrFirst } from "@/lib/messages/reminderNavigationLink";
import CopyButton from "./CopyButton";
import WazeNavButton from "@/app/components/WazeNavButton";
import PersistMissingEventPin from "@/app/components/PersistMissingEventPin";
import {
  getGoogleMapsLinkForTarget,
  hasExactCoordinates,
  parseCoord,
  resolveNavTarget,
  resolveWazeNavTarget,
  shouldShowNavButton,
} from "@/lib/navigationLinks";
import {
  persistParkingPin,
  resolveAndPersistEventLocation,
} from "@/lib/persistEventMapPin";
import { withResolvedMapPin } from "@/lib/resolveMapPin";
import {
  eventTypeGreeting,
  eventTypeHeadline,
  resolveCentralEventDetails,
} from "@/lib/eventDetails/centralEventDetails";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    shareId: string;
  }>;
  searchParams?: Promise<{
    token?: string;
    details?: string;
  }>;
};

type SafeLocation = {
  name?: string;
  address?: string;
  lat?: number | string | null;
  lng?: number | string | null;
};

type ParkingSettings = {
  enabled: boolean;
  name: string;
  address: string;
  lat: number | string | null;
  lng: number | string | null;
  instructions: string;
};

type ScheduleItem = {
  time: string;
  title: string;
  description: string;
};

type ScheduleSettings = {
  enabled: boolean;
  items: ScheduleItem[];
};

type CoupleImageSettings = {
  enabled: boolean;
  url: string;
  publicId: string;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeForCompare(value: unknown) {
  return cleanString(value).replace(/\s+/g, " ").toLowerCase();
}

function isSameText(a: unknown, b: unknown) {
  const first = normalizeForCompare(a);
  const second = normalizeForCompare(b);

  return Boolean(first && second && first === second);
}

function isValidUrl(value: unknown) {
  const url = cleanString(value);

  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(value: unknown) {
  const url = cleanString(value);
  return isValidUrl(url) ? url : "";
}

function formatHebrewDate(value: unknown) {
  if (!value) return "";

  const date = new Date(value as string | Date);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function eventNavCustom(settings: {
  wazeUrl?: string;
  googleMapsUrl?: string;
}) {
  return {
    wazeUrl: settings.wazeUrl || "",
    googleMapsUrl: settings.googleMapsUrl || "",
  };
}

function getInvitationTitle(invitation: any, event: any) {
  return (
    cleanString(invitation?.title) ||
    cleanString(event?.title) ||
    cleanString(invitation?.eventName) ||
    cleanString(event?.eventName) ||
    "האירוע"
  );
}

function getEventDate(invitation: any, event: any) {
  return (
    invitation?.eventDate ||
    invitation?.date ||
    event?.eventDate ||
    event?.date ||
    ""
  );
}

function getEventTime(invitation: any, event: any) {
  return (
    cleanString(invitation?.eventTime) ||
    cleanString(invitation?.time) ||
    cleanString(event?.eventTime) ||
    cleanString(event?.time)
  );
}

function getPublicEventPage(invitation: any) {
  return invitation?.publicEventPage || {};
}

function getGiftSettings(event: any, invitation: any) {
  const central = resolveCentralEventDetails(event, invitation).gifts;
  return {
    creditUrl: central.creditEnabled ? normalizeUrl(central.creditUrl) : "",
    payboxUrl: central.payboxEnabled ? normalizeUrl(central.payboxUrl) : "",
    bitPhone: central.bitEnabled ? cleanString(central.bitPhone) : "",
  };
}

function getNavigationSettings(publicEventPage: any) {
  const navigation = publicEventPage?.navigation || {};

  return {
    venueName: cleanString(navigation?.venueName || publicEventPage?.venueName),
    address: cleanString(navigation?.address || publicEventPage?.address),
    wazeUrl: normalizeUrl(navigation?.wazeUrl || publicEventPage?.wazeUrl),
    googleMapsUrl: normalizeUrl(
      navigation?.googleMapsUrl || publicEventPage?.googleMapsUrl
    ),
  };
}

function getParkingSettings(publicEventPage: any): ParkingSettings {
  const parking = publicEventPage?.parking || {};

  return {
    enabled: parking?.enabled === true,
    name: cleanString(parking?.name),
    address: cleanString(parking?.address),
    lat: parseCoord(parking?.lat),
    lng: parseCoord(parking?.lng),
    instructions: cleanString(parking?.instructions),
  };
}

function getScheduleSettings(publicEventPage: any): ScheduleSettings {
  const schedule = publicEventPage?.schedule || {};

  const items = Array.isArray(schedule?.items)
    ? schedule.items
        .map((item: any) => ({
          time: cleanString(item?.time),
          title: cleanString(item?.title),
          description: cleanString(item?.description),
        }))
        .filter(
          (item: ScheduleItem) => item.time || item.title || item.description
        )
    : [];

  return {
    enabled: schedule?.enabled === true,
    items,
  };
}

function getCoupleImageSettings(publicEventPage: any): CoupleImageSettings {
  const coupleImage = publicEventPage?.coupleImage || {};

  return {
    enabled: coupleImage?.enabled === true,
    url: normalizeUrl(coupleImage?.url),
    publicId: cleanString(coupleImage?.publicId),
  };
}

function getNoteSettings(publicEventPage: any) {
  const note = publicEventPage?.note || {};

  const enabled =
    note?.enabled === true || publicEventPage?.noteEnabled === true;

  const text =
    cleanString(note?.text || publicEventPage?.noteText) ||
    "האירוע מתקיים בהתאם להנחיות פיקוד העורף, יש מרחב מוגן במקום.";

  return { enabled, text };
}

const darkNavButtonClassName = `
        group
        inline-flex
        min-h-14
        items-center
        justify-center
        gap-2
        rounded-[22px]
        bg-gradient-to-l
        from-[#2F2924]
        via-[#4A3A30]
        to-[#6B513F]
        px-4
        py-3
        text-sm
        font-black
        text-white
        shadow-[0_14px_34px_rgba(47,41,36,0.22)]
        transition
        hover:-translate-y-0.5
        hover:shadow-[0_18px_40px_rgba(47,41,36,0.30)]
      `;

function LightButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="
        group
        inline-flex
        min-h-14
        items-center
        justify-center
        gap-2
        rounded-[22px]
        border
        border-[#E6D4BF]
        bg-gradient-to-l
        from-white
        to-[#FFF7EE]
        px-4
        py-3
        text-sm
        font-black
        text-[#3A2E27]
        shadow-[0_12px_28px_rgba(98,70,42,0.10)]
        transition
        hover:-translate-y-0.5
        hover:shadow-[0_16px_34px_rgba(98,70,42,0.16)]
      "
    >
      {children}
    </a>
  );
}

function SectionShell({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-[#EFE4D8] bg-[#FFFDFC] p-5 shadow-[0_16px_42px_rgba(98,70,42,0.07)] sm:p-6">
      <div className="flex items-start gap-3">
        {icon}

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-[#2F2924]">{title}</h2>
          {children}
        </div>
      </div>
    </section>
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { shareId } = await params;

  try {
    await dbConnect();

    const invitation = await Invitation.findOne({ shareId })
      .select("title eventType eventDate eventTime")
      .lean();

    const title = invitation
      ? `פרטי האירוע - ${
          cleanString((invitation as any)?.title) || "Invistimo"
        }`
      : "פרטי האירוע";

    return {
      title,
      description: "פרטי האירוע, ניווט, לו״ז ומתנות",
      robots: {
        index: false,
        follow: false,
      },
    };
  } catch {
    return {
      title: "פרטי האירוע",
      description: "פרטי האירוע, ניווט, לו״ז ומתנות",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

export default async function PublicEventInfoPage({
  params,
  searchParams,
}: PageProps) {
  const { shareId } = await params;
  const query = (await searchParams) || {};

  const safeShareId = cleanString(shareId);
  const guestToken = cleanString(query.token);

  await dbConnect();

  if (
    shouldOpenCheckInQrFirst({
      checkInEnabled: true,
      guestToken,
      details: query.details,
    })
  ) {
    const pass = await loadGuestPassForEventDetailsLink({
      shareId: safeShareId,
      guestToken,
    });
    if (pass) {
      return <CheckInPassClient initialPass={pass} />;
    }
  }

  const invitation = await Invitation.findOne({ shareId: safeShareId }).lean();

  if (!invitation) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#F7F0E7] px-4 py-10 text-[#2F2924]"
      >
        <section className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center">
          <div className="w-full rounded-[2rem] border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_90px_rgba(90,66,44,0.18)] backdrop-blur">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4E7D7]">
              <MapPin className="h-7 w-7 text-[#8A6748]" />
            </div>

            <h1 className="text-2xl font-black text-[#2F2924]">
              לא מצאנו את האירוע
            </h1>

            <p className="mt-3 text-sm leading-7 text-[#75695F]">
              ייתכן שהקישור שגוי או שהאירוע כבר לא פעיל.
            </p>

            <Link
              href="/"
              className="mt-7 inline-flex items-center justify-center rounded-2xl bg-[#2F2924] px-6 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.01]"
            >
              חזרה לעמוד הבית
            </Link>
          </div>
        </section>
      </main>
    );
  }

  let event: any = null;

  const eventId =
    (invitation as any)?.eventId ||
    (invitation as any)?.event ||
    (invitation as any)?.event_id;

  if (eventId) {
    try {
      event = await Event.findById(eventId).lean();
    } catch {
      event = null;
    }
  }

  const publicEventPage = getPublicEventPage(invitation);

  if (publicEventPage?.enabled === false) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#F7F0E7] px-4 py-10 text-[#2F2924]"
      >
        <section className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center">
          <div className="w-full rounded-[2rem] border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_90px_rgba(90,66,44,0.18)] backdrop-blur">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4E7D7]">
              <Sparkles className="h-7 w-7 text-[#8A6748]" />
            </div>

            <h1 className="text-2xl font-black text-[#2F2924]">
              עמוד האירוע אינו פעיל כרגע
            </h1>

            <p className="mt-3 text-sm leading-7 text-[#75695F]">
              הזוג עדיין לא הפעיל את עמוד פרטי האירוע.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const central = resolveCentralEventDetails(event, invitation);
  const hostsNames = cleanString(central.hostsNames);
  const title = eventTypeHeadline(
    central.eventType,
    hostsNames,
    central.title || getInvitationTitle(invitation, event)
  );
  const greeting = eventTypeGreeting(central.eventType);

  const eventDate = central.date || getEventDate(invitation, event);
  const eventTime = central.time || getEventTime(invitation, event);
  const receptionTime = central.receptionTime;
  const ceremonyTime = central.ceremonyTime;

  const dateLabel = formatHebrewDate(eventDate);

  const navigationSettings = getNavigationSettings(publicEventPage);

  const location: SafeLocation = await resolveAndPersistEventLocation(
    invitation,
    event
  );
  if (!location.name && navigationSettings.venueName) {
    location.name = navigationSettings.venueName;
  }
  if (!location.address && navigationSettings.address) {
    location.address = navigationSettings.address;
  }

  const navCustom = eventNavCustom(navigationSettings);
  const navTarget = resolveNavTarget(location, navCustom);
  const wazeTarget = resolveWazeNavTarget(location, navCustom);
  const allowWaze = shouldShowNavButton((invitation as any)?.showWaze);
  const allowGoogleMaps = shouldShowNavButton(
    (invitation as any)?.showGoogleMaps
  );
  const googleMapsUrl = allowGoogleMaps
    ? getGoogleMapsLinkForTarget(navTarget) || ""
    : "";
  const mapsNavHref = cleanString(central.googleMapsUrl) || googleMapsUrl;
  const hasWaze =
    allowWaze &&
    Boolean(
      (wazeTarget.lat != null && wazeTarget.lng != null) ||
        wazeTarget.query ||
        wazeTarget.wazeUrlOnly
    );

  const parking = getParkingSettings(publicEventPage);

  const parkingName = cleanString(parking.name);
  const parkingAddress = cleanString(parking.address);
  const shouldShowParkingAddress =
    Boolean(parkingAddress) && !isSameText(parkingAddress, parkingName);

  const parkingLocation: SafeLocation = await withResolvedMapPin({
    name: parkingName,
    address: parkingAddress,
    lat: parking.lat,
    lng: parking.lng,
  });
  const parkingLat = parseCoord(parkingLocation.lat);
  const parkingLng = parseCoord(parkingLocation.lng);
  if (
    parking.enabled &&
    !hasExactCoordinates(parking) &&
    parkingLat != null &&
    parkingLng != null
  ) {
    await persistParkingPin({
      invitationId: invitation._id,
      pin: { lat: parkingLat, lng: parkingLng },
    });
  }

  const parkingTarget = resolveNavTarget(parkingLocation);
  const parkingGoogleMapsUrl =
    allowGoogleMaps &&
    parking.enabled &&
    (parkingName || parkingAddress || parking.lat || parking.lng)
      ? getGoogleMapsLinkForTarget(parkingTarget)
      : "";
  const parkingWazeUrl =
    allowWaze &&
    parking.enabled &&
    (parkingName || parkingAddress || parking.lat || parking.lng) &&
    ((parkingTarget.lat != null && parkingTarget.lng != null) ||
      parkingTarget.query ||
      parkingTarget.wazeUrlOnly)
      ? "waze"
      : "";

  const schedule = getScheduleSettings(publicEventPage);
  const hasSchedule = schedule.enabled && schedule.items.length > 0;

  const coupleImage = getCoupleImageSettings(publicEventPage);
  const heroImageUrl =
    normalizeUrl(central.eventImageUrl) ||
    (coupleImage.enabled ? coupleImage.url : "") ||
    "";
  const hasCoupleImage = Boolean(heroImageUrl);

  const gifts = getGiftSettings(event, invitation);
  const hasGifts = Boolean(gifts.creditUrl || gifts.payboxUrl || gifts.bitPhone);

  const baseNote = getNoteSettings(publicEventPage);
  const note = {
    enabled: Boolean(baseNote.enabled || central.guestNote),
    text: central.guestNote || baseNote.text,
  };

  const venueCity = central.city;

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-hidden bg-[#F3E9DC] text-[#2F2924]"
      style={{
        fontFamily:
          '"Frank Ruhl Libre", "Heebo", "Assistant", "Segoe UI", sans-serif',
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700&family=Heebo:wght@400;600;700;800&display=swap"
      />
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes softGlow {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.85; }
        }
        @keyframes floatSpark {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute right-[-120px] top-[-120px] h-[330px] w-[330px] rounded-full bg-[#E8D5B8]/60 blur-3xl" />
        <div className="absolute bottom-[-130px] left-[-120px] h-[360px] w-[360px] rounded-full bg-[#C9B089]/40 blur-3xl" />
        <div
          className="absolute left-1/2 top-24 h-40 w-40 -translate-x-1/2 rounded-full bg-[#F0D9A8]/35 blur-3xl"
          style={{ animation: "softGlow 5s ease-in-out infinite" }}
        />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col px-0 pb-10 sm:max-w-2xl sm:px-4 sm:py-8">
        <div className="overflow-hidden border-white/80 bg-white/92 shadow-[0_28px_100px_rgba(89,64,43,0.20)] backdrop-blur-xl sm:rounded-[2.2rem] sm:border">
          {/* Hero — full-bleed image plane */}
          <div className="relative min-h-[48vh] overflow-hidden bg-gradient-to-b from-[#EDE2D2] via-[#F5EEE4] to-[#FFFDF9] sm:min-h-[420px]">
            {hasCoupleImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImageUrl}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#F6E8D4_0%,_#E5D2B6_45%,_#CDB894_100%)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1C1612]/85 via-[#2F2924]/35 to-[#2F2924]/10" />
            <div
              className="pointer-events-none absolute left-6 top-8 text-[#F5E6D0]/70"
              style={{ animation: "floatSpark 3.2s ease-in-out infinite" }}
            >
              <Heart className="h-5 w-5 fill-current" />
            </div>
            <div
              className="pointer-events-none absolute right-8 top-14 text-[#F5E6D0]/55"
              style={{ animation: "floatSpark 3.8s ease-in-out infinite 0.4s" }}
            >
              <Sparkles className="h-5 w-5" />
            </div>

            <div className="relative flex min-h-[48vh] flex-col justify-end px-6 pb-9 pt-16 text-center sm:min-h-[420px] sm:px-10">
              <p
                className="text-sm font-semibold tracking-[0.08em] text-[#F5E6D0]/95"
                style={{ animation: "fadeUp 0.7s ease-out both" }}
              >
                {greeting}
              </p>
              {hostsNames ? (
                <h1
                  className="mt-3 text-[2.05rem] font-bold leading-[1.15] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:text-5xl"
                  style={{
                    fontFamily: '"Frank Ruhl Libre", serif',
                    animation: "fadeUp 0.85s ease-out both",
                  }}
                >
                  {hostsNames}
                </h1>
              ) : (
                <h1
                  className="mt-3 text-[2.05rem] font-bold leading-[1.15] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:text-5xl"
                  style={{
                    fontFamily: '"Frank Ruhl Libre", serif',
                    animation: "fadeUp 0.85s ease-out both",
                  }}
                >
                  {title}
                </h1>
              )}
              {hostsNames ? (
                <p
                  className="mt-2 text-base font-semibold text-[#F8EFE3]/92"
                  style={{ animation: "fadeUp 0.95s ease-out both" }}
                >
                  {title}
                </p>
              ) : null}
              {dateLabel && (
                <p
                  className="mt-4 inline-flex self-center rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-[#F8EFE3] backdrop-blur-sm"
                  style={{ animation: "fadeUp 1.05s ease-out both" }}
                >
                  {dateLabel}
                  {eventTime ? ` · ${eventTime}` : ""}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
            <PersistMissingEventPin
              shareId={safeShareId}
              location={location}
            />

            {(dateLabel || eventTime || receptionTime || ceremonyTime) && (
              <SectionShell
                title="מתי?"
                icon={
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F4EADB]">
                    <CalendarDays className="h-6 w-6 text-[#8A6748]" />
                  </div>
                }
              >
                <div className="mt-3 space-y-2 text-sm font-bold text-[#4A4038]">
                  {dateLabel && <p>{dateLabel}</p>}
                  {receptionTime && <p>קבלת פנים: {receptionTime}</p>}
                  {ceremonyTime && <p>חופה / טקס: {ceremonyTime}</p>}
                  {eventTime && !receptionTime && !ceremonyTime && (
                    <p>שעה: {eventTime}</p>
                  )}
                  {eventTime && (receptionTime || ceremonyTime) && (
                    <p>שעת האירוע: {eventTime}</p>
                  )}
                </div>
              </SectionShell>
            )}

            {(location.name || location.address || hasWaze || googleMapsUrl) && (
              <SectionShell
                title="איפה?"
                icon={
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F4EADB]">
                    <MapPin className="h-6 w-6 text-[#8A6748]" />
                  </div>
                }
              >
                {location.name && (
                  <p className="mt-3 text-base font-black text-[#3C332B]">
                    {location.name}
                  </p>
                )}

                {location.address &&
                  !isSameText(location.address, location.name) && (
                    <p className="mt-1 text-sm font-bold leading-7 text-[#746A61]">
                      {location.address}
                    </p>
                  )}

                {venueCity && (
                  <p className="mt-1 text-sm font-bold text-[#746A61]">
                    {venueCity}
                  </p>
                )}

                {(hasWaze || mapsNavHref) && (
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {hasWaze && (
                      <WazeNavButton
                        location={location}
                        custom={navCustom}
                        className={darkNavButtonClassName}
                      >
                        <Navigation className="h-4 w-4 transition group-hover:-translate-x-0.5" />
                        ניווט ב-Waze
                      </WazeNavButton>
                    )}

                    {mapsNavHref && (
                      <LightButton href={mapsNavHref}>
                        <MapPin className="h-4 w-4 text-[#9A6B43] transition group-hover:-translate-x-0.5" />
                        ניווט ב-Google Maps
                      </LightButton>
                    )}
                  </div>
                )}
              </SectionShell>
            )}

            {parking.enabled &&
              (parkingName ||
                parkingAddress ||
                parking.instructions ||
                parkingWazeUrl ||
                parkingGoogleMapsUrl) && (
                <SectionShell
                  title="חניה והוראות הגעה"
                  icon={
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-white shadow-[0_0_28px_rgba(56,189,248,0.35)]">
                      <CarFront className="h-7 w-7 text-[#0EA5E9] drop-shadow-[0_0_8px_rgba(14,165,233,0.65)]" />

                      <span className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#0EA5E9] shadow-[0_0_14px_rgba(14,165,233,0.45)]">
                        P
                      </span>
                    </div>
                  }
                >
                  {parkingName && (
                    <p className="mt-3 text-base font-black text-[#3C332B]">
                      {parkingName}
                    </p>
                  )}

                  {shouldShowParkingAddress && (
                    <p className="mt-1 text-sm font-bold leading-7 text-[#746A61]">
                      {parkingAddress}
                    </p>
                  )}

                  {parking.instructions && (
                    <p className="mt-4 whitespace-pre-line rounded-2xl bg-[#F8F0E7] px-4 py-3 text-sm font-bold leading-7 text-[#665A50]">
                      {parking.instructions}
                    </p>
                  )}

                  {(parkingWazeUrl || parkingGoogleMapsUrl) && (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {parkingWazeUrl && (
                        <WazeNavButton
                          location={parkingLocation}
                          className={darkNavButtonClassName}
                        >
                          <Navigation className="h-4 w-4 transition group-hover:-translate-x-0.5" />
                          Waze לחניה
                        </WazeNavButton>
                      )}

                      {parkingGoogleMapsUrl && (
                        <LightButton href={parkingGoogleMapsUrl}>
                          <MapPin className="h-4 w-4 text-[#9A6B43] transition group-hover:-translate-x-0.5" />
                          מפות לחניה
                        </LightButton>
                      )}
                    </div>
                  )}
                </SectionShell>
              )}

            {hasSchedule && (
              <SectionShell
                title="לו״ז האירוע"
                icon={
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#F3E8FF] via-[#FAF5FF] to-white shadow-[0_0_28px_rgba(124,58,237,0.30)]">
                    <PartyPopper className="h-7 w-7 text-[#7C3AED] drop-shadow-[0_0_8px_rgba(124,58,237,0.55)]" />
                  </div>
                }
              >
                <div className="relative mt-5 overflow-hidden rounded-[28px] border border-[#EADCCA] bg-gradient-to-br from-[#FFFDFC] via-[#FFF9F2] to-[#F8F0E7] p-4 shadow-[0_14px_36px_rgba(98,70,42,0.08)]">
                  <div className="pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full bg-white/70 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-[#E6CDB2]/30 blur-3xl" />

                  <div className="relative grid gap-3">
                    {schedule.items.map((item, index) => (
                      <div
                        key={`${item.time}-${item.title}-${index}`}
                        className="relative flex items-stretch gap-3"
                      >
                        <div className="flex w-[82px] shrink-0 items-center justify-center">
                          {item.time && (
                            <div className="inline-flex min-w-[74px] items-center justify-center gap-1.5 rounded-full border border-[#E7D3BD] bg-white/85 px-3 py-2 text-sm font-black text-[#7A5739] shadow-[0_8px_20px_rgba(98,70,42,0.08)]">
                              <Clock className="h-3.5 w-3.5 text-[#7C3AED]" />
                              {item.time}
                            </div>
                          )}
                        </div>

                        <div className="relative flex justify-center">
                          <div className="absolute bottom-[-12px] top-[-12px] w-px bg-[#E2CDB6]" />
                          <div className="relative mt-4 h-3 w-3 rounded-full border-2 border-white bg-[#B8844F] shadow-[0_0_0_4px_rgba(232,217,203,0.65)]" />
                        </div>

                        <div className="min-w-0 flex-1 rounded-[22px] border border-[#E8D9CB] bg-white/88 px-4 py-4 shadow-[0_10px_24px_rgba(98,70,42,0.06)]">
                          {item.title && (
                            <h3 className="text-base font-black text-[#2F2924]">
                              {item.title}
                            </h3>
                          )}

                          {item.description && (
                            <p className="mt-1 whitespace-pre-line text-sm font-bold leading-7 text-[#746A61]">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionShell>
            )}

            {hasGifts && (
              <section className="rounded-[2rem] border border-[#E8D4B4] bg-gradient-to-br from-[#FFF9F0] via-white to-[#F7F0E6] p-5 shadow-[0_18px_48px_rgba(98,70,42,0.10)] sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F4EADB]">
                    <Gift className="h-6 w-6 text-[#8A6748]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-black text-[#2F2924]">
                      רוצים לשמח אותנו במתנה?
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-[#7A6A5A]">
                      בחרו את הדרך הנוחה לכם — אשראי, PayBox או Bit
                    </p>
                    <div className="mt-5 grid grid-cols-1 gap-3">
                      {gifts.creditUrl && (
                        <a
                          href={gifts.creditUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[22px] bg-gradient-to-l from-[#24190F] via-[#3A2A1C] to-[#5A4028] px-4 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(36,25,15,0.22)] transition hover:-translate-y-0.5"
                        >
                          <CreditCard className="h-4 w-4" />
                          מתנה באשראי
                        </a>
                      )}

                      {gifts.payboxUrl && (
                        <a
                          href={gifts.payboxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[22px] border border-[#C9D7F0] bg-gradient-to-l from-white to-[#EEF4FF] px-4 py-3 text-sm font-black text-[#2F3B55] shadow-[0_12px_28px_rgba(73,108,168,0.12)] transition hover:-translate-y-0.5"
                        >
                          <Smartphone className="h-4 w-4 text-[#496CA8]" />
                          מתנה ב-PayBox
                        </a>
                      )}

                      {gifts.bitPhone && (
                        <div className="flex flex-col items-center gap-3 rounded-[22px] border border-[#E8D9CB] bg-white px-4 py-5 shadow-sm">
                          <p className="text-xs font-black tracking-wide text-[#8A6A43]">
                            העברה ב-Bit
                          </p>
                          <span
                            className="text-xl font-black tracking-wide text-[#2F2924]"
                            dir="ltr"
                          >
                            {gifts.bitPhone}
                          </span>
                          <CopyButton value={gifts.bitPhone} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {note.enabled && note.text && (
              <section className="rounded-[2rem] border border-[#E7D7C7] bg-[#F8F0E7] p-5 text-center shadow-sm">
                <p className="whitespace-pre-line text-sm font-bold leading-7 text-[#665A50]">
                  {note.text}
                </p>
              </section>
            )}

            <section className="rounded-[2rem] border border-white/80 bg-white/70 p-5 text-center shadow-sm">
              <p className="text-lg font-black text-[#2F2924]">{greeting}</p>
            </section>
          </div>
        </div>

        <p className="mt-6 text-center text-xs font-bold text-[#8A8178]">
          נבנה באמצעות Invistimo
        </p>
      </section>
    </main>
  );
}