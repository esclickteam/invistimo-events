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
} from "lucide-react";

import dbConnect from "@/lib/db";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";

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

function cleanString(value: unknown) {
  return String(value || "").trim();
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

function getPublicSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.invistimo.com";

  return raw.replace(/\/+$/, "");
}

function getEventTypeLabel(eventType: unknown) {
  const value = cleanString(eventType).toLowerCase();

  const map: Record<string, string> = {
    wedding: "חתונה",
    henna: "חינה",
    bar_mitzvah: "בר מצווה",
    bat_mitzvah: "בת מצווה",
    birthday: "יום הולדת",
    brit: "ברית",
    brita: "בריתה",
    business: "אירוע עסקי",
    other: "אירוע",
  };

  return map[value] || "אירוע";
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

function formatShortHebrewDate(value: unknown) {
  if (!value) return "";

  const date = new Date(value as string | Date);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
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
    bitUrl: normalizeUrl(gifts?.bitUrl || publicEventPage?.bitUrl),
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
      ? `פרטי האירוע - ${cleanString((invitation as any)?.title) || "Invistimo"}`
      : "פרטי האירוע";

    return {
      title,
      description: "פרטי האירוע, ניווט ומתנות",
      robots: {
        index: false,
        follow: false,
      },
    };
  } catch {
    return {
      title: "פרטי האירוע",
      description: "פרטי האירוע, ניווט ומתנות",
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
  const eventType = getEventTypeLabel(
    (invitation as any)?.eventType || event?.eventType
  );

  const eventDate = getEventDate(invitation, event);
  const eventTime = getEventTime(invitation, event);

  const dateLabel = formatHebrewDate(eventDate);
  const shortDateLabel = formatShortHebrewDate(eventDate);

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

  const gifts = getGiftSettings(publicEventPage);
  const hasGifts = Boolean(
    gifts.creditUrl || gifts.payboxUrl || gifts.bitPhone || gifts.bitUrl
  );

  const note = getNoteSettings(publicEventPage);

  const publicUrl = `${getPublicSiteUrl()}/e/${safeShareId}`;

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
              מחכים לראותכם ב{eventType}
            </p>

            <h1 className="relative mt-3 text-3xl font-black leading-tight text-[#2F2924] sm:text-4xl">
              {title}
            </h1>

            {(dateLabel || eventTime) && (
              <div className="relative mx-auto mt-7 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                {dateLabel && (
                  <div className="rounded-3xl border border-white/80 bg-white/70 p-4 text-right shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-black text-[#8B6B50]">
                      <CalendarDays className="h-4 w-4" />
                      תאריך
                    </div>

                    <p className="mt-2 text-base font-black text-[#2F2924]">
                      {dateLabel}
                    </p>

                    {shortDateLabel && (
                      <p className="mt-1 text-xs font-bold text-[#8A8178]">
                        {shortDateLabel}
                      </p>
                    )}
                  </div>
                )}

                {eventTime && (
                  <div className="rounded-3xl border border-white/80 bg-white/70 p-4 text-right shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-black text-[#8B6B50]">
                      <Clock className="h-4 w-4" />
                      שעה
                    </div>

                    <p className="mt-2 text-base font-black text-[#2F2924]">
                      {eventTime}
                    </p>

                    <p className="mt-1 text-xs font-bold text-[#8A8178]">
                      מומלץ להגיע בזמן
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
            {(location.name || location.address || wazeUrl || googleMapsUrl) && (
              <section className="rounded-[2rem] border border-[#EFE4D8] bg-[#FFFDFC] p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3E4D1]">
                    <MapPin className="h-6 w-6 text-[#8A6748]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-black text-[#2F2924]">
                      הגעה וניווט לאירוע
                    </h2>

                    {location.name && (
                      <p className="mt-3 text-base font-black text-[#3C332B]">
                        {location.name}
                      </p>
                    )}

                    {location.address && (
                      <p className="mt-1 text-sm font-bold leading-7 text-[#746A61]">
                        {location.address}
                      </p>
                    )}

                    {(wazeUrl || googleMapsUrl) && (
                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {wazeUrl && (
                          <a
                            href={wazeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#2F2924] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#2F2924]/15 transition hover:scale-[1.01]"
                          >
                            <Navigation className="h-4 w-4" />
                            פתח ב־Waze
                          </a>
                        )}

                        {googleMapsUrl && (
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#E7D7C7] bg-white px-5 py-3 text-sm font-black text-[#2F2924] shadow-sm transition hover:scale-[1.01]"
                          >
                            <MapPin className="h-4 w-4" />
                            פתח במפות
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {hasGifts && (
              <section className="rounded-[2rem] border border-[#EFE4D8] bg-[#FFFDFC] p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F4DEE3]">
                    <Gift className="h-6 w-6 text-[#B94D63]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-black text-[#2F2924]">
                      מתנות לזוג
                    </h2>

                    <p className="mt-2 text-sm font-bold leading-7 text-[#746A61]">
                      ניתן לשלוח מתנה בדרך שנוחה לכם.
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-3">
                      {gifts.creditUrl && (
                        <a
                          href={gifts.creditUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-14 items-center justify-between rounded-2xl border border-[#E8D9CB] bg-white px-4 py-3 text-right shadow-sm transition hover:scale-[1.01]"
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3E4D1]">
                              <CreditCard className="h-5 w-5 text-[#8A6748]" />
                            </span>

                            <span>
                              <span className="block text-sm font-black text-[#2F2924]">
                                מתנה באשראי
                              </span>
                              <span className="block text-xs font-bold text-[#8A8178]">
                                תשלום מאובטח בקישור
                              </span>
                            </span>
                          </span>

                          <span className="text-lg font-black text-[#8A6748]">
                            ←
                          </span>
                        </a>
                      )}

                      {gifts.payboxUrl && (
                        <a
                          href={gifts.payboxUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-14 items-center justify-between rounded-2xl border border-[#E8D9CB] bg-white px-4 py-3 text-right shadow-sm transition hover:scale-[1.01]"
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF3FF]">
                              <Smartphone className="h-5 w-5 text-[#496CA8]" />
                            </span>

                            <span>
                              <span className="block text-sm font-black text-[#2F2924]">
                                PayBox
                              </span>
                              <span className="block text-xs font-bold text-[#8A8178]">
                                פתיחה ישירה באפליקציה / בדפדפן
                              </span>
                            </span>
                          </span>

                          <span className="text-lg font-black text-[#8A6748]">
                            ←
                          </span>
                        </a>
                      )}

                      {(gifts.bitUrl || gifts.bitPhone) && (
                        <a
                          href={gifts.bitUrl || `tel:${gifts.bitPhone}`}
                          target={gifts.bitUrl ? "_blank" : undefined}
                          rel={gifts.bitUrl ? "noopener noreferrer" : undefined}
                          className="flex min-h-14 items-center justify-between rounded-2xl border border-[#E8D9CB] bg-white px-4 py-3 text-right shadow-sm transition hover:scale-[1.01]"
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4DEE3]">
                              <Heart className="h-5 w-5 fill-[#B94D63] text-[#B94D63]" />
                            </span>

                            <span>
                              <span className="block text-sm font-black text-[#2F2924]">
                                Bit
                              </span>

                              {gifts.bitPhone ? (
                                <span className="block text-xs font-bold text-[#8A8178]">
                                  מספר לביט: {gifts.bitPhone}
                                </span>
                              ) : (
                                <span className="block text-xs font-bold text-[#8A8178]">
                                  פתיחה בקישור
                                </span>
                              )}
                            </span>
                          </span>

                          <span className="text-lg font-black text-[#8A6748]">
                            ←
                          </span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {note.enabled && note.text && (
              <section className="rounded-[2rem] border border-[#E7D7C7] bg-[#F8F0E7] p-5 text-center shadow-sm">
                <p className="text-sm font-bold leading-7 text-[#665A50]">
                  {note.text}
                </p>
              </section>
            )}

            <section className="rounded-[2rem] border border-white/80 bg-white/70 p-5 text-center shadow-sm">
              <p className="text-lg font-black text-[#2F2924]">
                נשמח לראותכם ❤️
              </p>

              <p className="mt-2 break-all text-xs font-bold text-[#8A8178]">
                {publicUrl}
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