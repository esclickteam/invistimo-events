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
  CarFront,
} from "lucide-react";

import dbConnect from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import CopyButton from "./CopyButton";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{
    shareId: string;
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

function getLocationValue(invitation: any, event: any): SafeLocation {
  const invitationLocation = invitation?.location || {};
  const eventLocation = event?.location || {};

  return {
    name:
      cleanString(invitationLocation?.name) ||
      cleanString(eventLocation?.name) ||
      cleanString(invitation?.venueName) ||
      cleanString(event?.venueName),

    address:
      cleanString(invitationLocation?.address) ||
      cleanString(eventLocation?.address) ||
      cleanString(invitation?.address) ||
      cleanString(event?.address),

    lat:
      invitationLocation?.lat ??
      eventLocation?.lat ??
      invitation?.lat ??
      event?.lat ??
      null,

    lng:
      invitationLocation?.lng ??
      eventLocation?.lng ??
      invitation?.lng ??
      event?.lng ??
      null,
  };
}

function buildGoogleMapsUrl(location: SafeLocation, customUrl?: unknown) {
  const savedUrl = normalizeUrl(customUrl);
  if (savedUrl) return savedUrl;

  const lat = cleanString(location.lat);
  const lng = cleanString(location.lng);
  const address = cleanString(location.address || location.name);

  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${lat},${lng}`
    )}`;
  }

  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address
    )}`;
  }

  return "";
}

function buildWazeUrl(location: SafeLocation, customUrl?: unknown) {
  const savedUrl = normalizeUrl(customUrl);
  if (savedUrl) return savedUrl;

  const lat = cleanString(location.lat);
  const lng = cleanString(location.lng);
  const address = cleanString(location.address || location.name);

  if (lat && lng) {
    return `https://waze.com/ul?ll=${encodeURIComponent(
      `${lat},${lng}`
    )}&navigate=yes`;
  }

  if (address) {
    return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
  }

  return "";
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

function getGiftSettings(publicEventPage: any) {
  const gifts = publicEventPage?.gifts || {};

  return {
    creditUrl: normalizeUrl(gifts?.creditUrl || publicEventPage?.creditUrl),
    payboxUrl: normalizeUrl(gifts?.payboxUrl || publicEventPage?.payboxUrl),
    bitPhone: cleanString(gifts?.bitPhone || publicEventPage?.bitPhone),
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
    lat: parking?.lat ?? null,
    lng: parking?.lng ?? null,
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
    note?.enabled === false || publicEventPage?.noteEnabled === false
      ? false
      : true;

  const text =
    cleanString(note?.text || publicEventPage?.noteText) ||
    "האירוע מתקיים בהתאם להנחיות פיקוד העורף, יש מרחב מוגן במקום.";

  return { enabled, text };
}

function DarkButton({
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
      "
    >
      {children}
    </a>
  );
}

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

export default async function PublicEventInfoPage({ params }: PageProps) {
  const { shareId } = await params;

  const safeShareId = cleanString(shareId);

  await dbConnect();

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

  const title = getInvitationTitle(invitation, event);

  const eventDate = getEventDate(invitation, event);
  const eventTime = getEventTime(invitation, event);

  const dateLabel = formatHebrewDate(eventDate);

  const baseLocation = getLocationValue(invitation, event);
  const navigationSettings = getNavigationSettings(publicEventPage);

  const location: SafeLocation = {
    name: navigationSettings.venueName || baseLocation.name,
    address: navigationSettings.address || baseLocation.address,
    lat: baseLocation.lat,
    lng: baseLocation.lng,
  };

  const wazeUrl = buildWazeUrl(location, navigationSettings.wazeUrl);
  const googleMapsUrl = buildGoogleMapsUrl(
    location,
    navigationSettings.googleMapsUrl
  );

  const parking = getParkingSettings(publicEventPage);
  const parkingLocation: SafeLocation = {
    name: parking.name,
    address: parking.address,
    lat: parking.lat,
    lng: parking.lng,
  };

  const parkingWazeUrl =
    parking.enabled &&
    (parking.name || parking.address || parking.lat || parking.lng)
      ? buildWazeUrl(parkingLocation)
      : "";

  const parkingGoogleMapsUrl =
    parking.enabled &&
    (parking.name || parking.address || parking.lat || parking.lng)
      ? buildGoogleMapsUrl(parkingLocation)
      : "";

  const schedule = getScheduleSettings(publicEventPage);
  const hasSchedule = schedule.enabled && schedule.items.length > 0;

  const coupleImage = getCoupleImageSettings(publicEventPage);
  const hasCoupleImage = coupleImage.enabled && coupleImage.url;

  const gifts = getGiftSettings(publicEventPage);
  const hasGifts = Boolean(gifts.creditUrl || gifts.payboxUrl || gifts.bitPhone);

  const note = getNoteSettings(publicEventPage);

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-hidden bg-[#F6EFE6] text-[#2F2924]"
    >
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute right-[-120px] top-[-120px] h-[330px] w-[330px] rounded-full bg-[#E6CDB2]/45 blur-3xl" />
        <div className="absolute bottom-[-130px] left-[-120px] h-[360px] w-[360px] rounded-full bg-[#D9BFA3]/40 blur-3xl" />
        <div className="absolute left-1/2 top-[30%] h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-white/45 blur-3xl" />
      </div>

      <section className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-5 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-xs font-black text-[#7A6049] shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" />
            פרטי האירוע
          </div>
        </div>

        <div className="overflow-hidden rounded-[2.2rem] border border-white/80 bg-white/82 shadow-[0_28px_100px_rgba(89,64,43,0.20)] backdrop-blur-xl">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#F1DFC9] via-[#F8EFE5] to-[#FFFFFF] px-6 pb-8 pt-10 text-center sm:px-10 sm:pt-12">
            <div className="absolute right-6 top-6 h-16 w-16 rounded-full border border-white/70 bg-white/35" />
            <div className="absolute bottom-6 left-7 h-12 w-12 rounded-full border border-white/70 bg-white/35" />

            <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-white shadow-[0_18px_50px_rgba(107,78,52,0.16)]">
              <Heart className="h-8 w-8 fill-[#C54D64] text-[#C54D64]" />
            </div>

            <p className="relative text-sm font-black text-[#8B6B50]">
              מחכים לראותכם באירוע
            </p>

            <h1 className="relative mt-3 text-3xl font-black leading-tight text-[#2F2924] sm:text-4xl">
              {title}
            </h1>

            {(dateLabel || eventTime) && (
              <div className="relative mx-auto mt-7 grid max-w-xl grid-cols-2 gap-3">
                {dateLabel && (
                  <div className="rounded-3xl border border-white/80 bg-white/70 p-4 text-right shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-black text-[#8B6B50]">
                      <CalendarDays className="h-4 w-4" />
                      תאריך
                    </div>

                    <p className="mt-2 text-sm font-black leading-6 text-[#2F2924] sm:text-base">
                      {dateLabel}
                    </p>
                  </div>
                )}

                {eventTime && (
                  <div className="rounded-3xl border border-white/80 bg-white/70 p-4 text-right shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-black text-[#8B6B50]">
                      <Clock className="h-4 w-4" />
                      שעה
                    </div>

                    <p className="mt-2 text-sm font-black leading-6 text-[#2F2924] sm:text-base">
                      {eventTime}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
            {(location.name || location.address || wazeUrl || googleMapsUrl) && (
              <SectionShell
                title="הגעה וניווט לאירוע"
                icon={
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#F3E4D1] to-[#E8D4BC] shadow-sm">
                    <MapPin className="h-7 w-7 text-[#8A6748]" />
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

                {(wazeUrl || googleMapsUrl) && (
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {wazeUrl && (
                      <DarkButton href={wazeUrl}>
                        <Navigation className="h-4 w-4 transition group-hover:-translate-x-0.5" />
                        Waze
                      </DarkButton>
                    )}

                    {googleMapsUrl && (
                      <LightButton href={googleMapsUrl}>
                        <MapPin className="h-4 w-4 text-[#9A6B43] transition group-hover:-translate-x-0.5" />
                        מפות
                      </LightButton>
                    )}
                  </div>
                )}
              </SectionShell>
            )}

            {parking.enabled &&
              (parking.name ||
                parking.address ||
                parking.instructions ||
                parkingWazeUrl ||
                parkingGoogleMapsUrl) && (
                <SectionShell
                  title="חניה והוראות הגעה"
                  icon={
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#F3E4D1] to-[#E8D4BC] shadow-sm">
                      <CarFront className="h-7 w-7 text-[#8A6748]" />
                      <span className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#8A6748] shadow-sm">
                        P
                      </span>
                    </div>
                  }
                >
                  {parking.name && (
                    <p className="mt-3 text-base font-black text-[#3C332B]">
                      {parking.name}
                    </p>
                  )}

                  {parking.address &&
                    !isSameText(parking.address, parking.name) && (
                      <p className="mt-1 text-sm font-bold leading-7 text-[#746A61]">
                        {parking.address}
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
                        <DarkButton href={parkingWazeUrl}>
                          <Navigation className="h-4 w-4 transition group-hover:-translate-x-0.5" />
                          Waze לחניה
                        </DarkButton>
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
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#F3E4D1] to-[#E8D4BC] shadow-sm">
                    <Clock className="h-7 w-7 text-[#8A6748]" />
                  </div>
                }
              >
                <div className="relative mt-5 space-y-4">
                  <div className="absolute bottom-4 right-[18px] top-4 w-px bg-gradient-to-b from-[#D7B992] via-[#E6D4BF] to-transparent" />

                  {schedule.items.map((item, index) => (
                    <div key={`${item.time}-${item.title}-${index}`} className="relative flex gap-4">
                      <div className="relative z-10 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E2C9A9] bg-[#FFF8EF] shadow-sm">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#B8844F]" />
                      </div>

                      <div className="flex-1 rounded-[24px] border border-[#E8D9CB] bg-gradient-to-l from-white to-[#FFF9F2] p-4 shadow-[0_12px_30px_rgba(98,70,42,0.08)]">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          {item.title && (
                            <h3 className="text-base font-black text-[#2F2924]">
                              {item.title}
                            </h3>
                          )}

                          {item.time && (
                            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#F3E4D1] px-3 py-1.5 text-sm font-black text-[#7A5739]">
                              <Clock className="h-3.5 w-3.5" />
                              {item.time}
                            </div>
                          )}
                        </div>

                        {item.description && (
                          <p className="mt-2 whitespace-pre-line text-sm font-bold leading-7 text-[#746A61]">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionShell>
            )}

            {hasGifts && (
              <SectionShell
                title="מתנות לזוג"
                icon={
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#F4DEE3] to-[#F7EEF0] shadow-sm">
                    <Gift className="h-7 w-7 text-[#B94D63]" />
                  </div>
                }
              >
                <p className="mt-2 text-sm font-bold leading-7 text-[#746A61]">
                  ניתן לשלוח מתנה בדרך שנוחה לכם.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {gifts.creditUrl && (
                    <a
                      href={gifts.creditUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        group
                        flex
                        min-h-[132px]
                        flex-col
                        items-center
                        justify-center
                        gap-3
                        rounded-[26px]
                        border
                        border-[#E8D9CB]
                        bg-gradient-to-b
                        from-white
                        to-[#FFF7EE]
                        px-4
                        py-5
                        text-center
                        shadow-[0_14px_34px_rgba(98,70,42,0.10)]
                        transition
                        hover:-translate-y-1
                        hover:shadow-[0_20px_44px_rgba(98,70,42,0.16)]
                      "
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E4D1] shadow-sm">
                        <CreditCard className="h-5 w-5 text-[#8A6748]" />
                      </span>

                      <span>
                        <span className="block text-sm font-black text-[#2F2924]">
                          אשראי
                        </span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-[#8A8178]">
                          תשלום מאובטח
                        </span>
                      </span>

                      <span className="text-lg font-black text-[#8A6748] transition group-hover:-translate-x-1">
                        ←
                      </span>
                    </a>
                  )}

                  {gifts.payboxUrl && (
                    <a
                      href={gifts.payboxUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        group
                        flex
                        min-h-[132px]
                        flex-col
                        items-center
                        justify-center
                        gap-3
                        rounded-[26px]
                        border
                        border-[#E8D9CB]
                        bg-gradient-to-b
                        from-white
                        to-[#F5F8FF]
                        px-4
                        py-5
                        text-center
                        shadow-[0_14px_34px_rgba(73,108,168,0.10)]
                        transition
                        hover:-translate-y-1
                        hover:shadow-[0_20px_44px_rgba(73,108,168,0.16)]
                      "
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF3FF] shadow-sm">
                        <Smartphone className="h-5 w-5 text-[#496CA8]" />
                      </span>

                      <span>
                        <span className="block text-sm font-black text-[#2F2924]">
                          PayBox
                        </span>
                        <span className="mt-1 block text-xs font-bold leading-5 text-[#8A8178]">
                          פתיחה בקישור
                        </span>
                      </span>

                      <span className="text-lg font-black text-[#8A6748] transition group-hover:-translate-x-1">
                        ←
                      </span>
                    </a>
                  )}

                  {gifts.bitPhone && (
                    <div
                      className="
                        flex
                        min-h-[132px]
                        flex-col
                        items-center
                        justify-center
                        gap-3
                        rounded-[26px]
                        border
                        border-[#E8D9CB]
                        bg-gradient-to-b
                        from-white
                        to-[#FFF3F6]
                        px-4
                        py-5
                        text-center
                        shadow-[0_14px_34px_rgba(185,77,99,0.10)]
                        transition
                        hover:-translate-y-1
                        hover:shadow-[0_20px_44px_rgba(185,77,99,0.16)]
                      "
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4DEE3] shadow-sm">
                        <Heart className="h-5 w-5 fill-[#B94D63] text-[#B94D63]" />
                      </span>

                      <span>
                        <span className="block text-sm font-black text-[#2F2924]">
                          Bit
                        </span>

                        <span
                          className="mt-1 block text-sm font-black tracking-wide text-[#2F2924]"
                          dir="ltr"
                        >
                          {gifts.bitPhone}
                        </span>
                      </span>

                      <CopyButton value={gifts.bitPhone} />
                    </div>
                  )}
                </div>
              </SectionShell>
            )}

            {note.enabled && note.text && (
              <section className="rounded-[2rem] border border-[#E7D7C7] bg-[#F8F0E7] p-5 text-center shadow-sm">
                <p className="whitespace-pre-line text-sm font-bold leading-7 text-[#665A50]">
                  {note.text}
                </p>
              </section>
            )}

            {hasCoupleImage && (
              <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 p-4 shadow-[0_18px_50px_rgba(98,70,42,0.12)]">
                <div className="relative overflow-hidden rounded-[1.7rem] bg-[#F8F0E7]">
                  <img
                    src={coupleImage.url}
                    alt="תמונת הזוג / האירוע"
                    className="h-[260px] w-full object-cover sm:h-[360px]"
                  />

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-5 py-5 text-right">
                    <p className="text-sm font-black text-white/90">
                      מחכים לראותכם ❤️
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-[2rem] border border-white/80 bg-white/70 p-5 text-center shadow-sm">
              <p className="text-lg font-black text-[#2F2924]">
                נשמח לראותכם ❤️
              </p>
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