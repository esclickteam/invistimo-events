"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import EventDetailsForm from "@/app/components/EventDetailsForm";
import EventInvitationSettings from "@/app/components/EventInvitationSettings";

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [event, setEvent] = useState<any | null>(null);
  const [invitation, setInvitation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const invitationIdFromUrl = useMemo(() => {
    const fromQuery =
      searchParams.get("invitationId") ||
      searchParams.get("id") ||
      searchParams.get("inviteId") ||
      "";

    if (fromQuery) return fromQuery;

    const fromParams =
      String(
        params?.invitationId ||
          params?.inviteId ||
          params?.id ||
          params?.eventId ||
          ""
      ) || "";

    if (fromParams) return fromParams;

    const parts = pathname.split("/").filter(Boolean);
    const invitationsIndex = parts.findIndex((part) => part === "invitations");

    if (invitationsIndex >= 0 && parts[invitationsIndex + 1]) {
      return parts[invitationsIndex + 1];
    }

    return "";
  }, [params, pathname, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);

        /*
          ✅ מצב חדש ונכון:
          העמוד נטען לפי invitationId מתוך ה-URL:
          /dashboard/invitations/[invitationId]/edit
        */
        if (invitationIdFromUrl) {
          const invitationRes = await fetch(
            `/api/invitations/${invitationIdFromUrl}`,
            {
              credentials: "include",
              cache: "no-store",
            }
          );

          if (invitationRes.ok) {
            const invitationData = await invitationRes.json();

            if (
              !cancelled &&
              invitationData?.success &&
              invitationData?.invitation
            ) {
              setInvitation(invitationData.invitation);
              setEvent(invitationData.event || null);
              setLoading(false);
              return;
            }
          }
        }

        /*
          ✅ fallback ישן:
          אם נכנסת מנתיב ישן בלי invitationId,
          עדיין ננסה לטעון אירוע ואז הזמנה לפי eventId.
        */
        const eventRes = await fetch("/api/events", {
          credentials: "include",
          cache: "no-store",
        });

        if (!eventRes.ok) {
          if (!cancelled) setLoading(false);
          return;
        }

        const eventData = await eventRes.json();

        if (!eventData?.success || !eventData.event) {
          if (!cancelled) setLoading(false);
          return;
        }

        const loadedEvent = eventData.event;
        const loadedEventId = loadedEvent._id || loadedEvent.id;

        if (!cancelled) {
          setEvent(loadedEvent);
        }

        if (!loadedEventId) {
          if (!cancelled) setLoading(false);
          return;
        }

        const invitationRes = await fetch(
          `/api/invitations/by-event/${loadedEventId}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!invitationRes.ok) {
          if (!cancelled) setLoading(false);
          return;
        }

        const invitationData = await invitationRes.json();

        if (!cancelled && invitationData?.success) {
          setInvitation(invitationData.invitation || null);
        }
      } catch (err) {
        console.error("❌ Failed to load page data:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [invitationIdFromUrl]);

  /* =========================
     Loading
  ========================= */
  if (loading) {
    return (
      <div
        dir="rtl"
        className="
          min-h-screen
          bg-[#F6F1EA]
          px-4
          py-8
          md:px-8
          md:py-10
        "
      >
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center">
          <div
            className="
              relative
              w-full
              max-w-[520px]
              overflow-hidden
              rounded-[34px]
              border
              border-[#E3D0B8]
              bg-[#FFFDF9]
              px-8
              py-10
              text-center
              shadow-[0_24px_75px_rgba(92,65,35,0.14)]
            "
          >
            <div
              className="
                pointer-events-none
                absolute
                -left-20
                -top-20
                h-48
                w-48
                rounded-full
                bg-[#D9B46F]/25
                blur-3xl
              "
            />

            <div className="relative z-10">
              <div
                className="
                  mx-auto
                  mb-5
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  bg-gradient-to-l
                  from-[#B8844F]
                  via-[#D4A762]
                  to-[#E7C98D]
                  text-2xl
                  text-white
                  shadow-[0_14px_30px_rgba(184,132,79,0.30)]
                "
              >
                ✦
              </div>

              <h2 className="text-xl font-black text-[#241A14]">
                טוען פרטי אירוע
              </h2>

              <p className="mt-2 text-sm font-semibold text-[#8A7B69]">
                אנחנו מכינים את מסך העריכה עבורך…
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
    ✅ חשוב:
    לא בודקים !event.
    גם אם ה-Event בסיסי/ריק, עדיין יש הזמנה וצריך לאפשר לערוך.
  */
  if (!invitation) {
    return (
      <div
        dir="rtl"
        className="
          min-h-screen
          bg-[#F6F1EA]
          px-4
          py-8
          md:px-8
          md:py-10
        "
      >
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center">
          <div
            className="
              relative
              w-full
              max-w-[620px]
              overflow-hidden
              rounded-[34px]
              border
              border-[#E3D0B8]
              bg-[#FFFDF9]
              px-8
              py-10
              text-center
              shadow-[0_24px_75px_rgba(92,65,35,0.14)]
            "
          >
            <div
              className="
                pointer-events-none
                absolute
                -right-24
                -bottom-24
                h-64
                w-64
                rounded-full
                bg-[#B8844F]/14
                blur-3xl
              "
            />

            <div className="relative z-10">
              <div
                className="
                  mx-auto
                  mb-5
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-[24px]
                  border
                  border-[#D9B46F]/45
                  bg-[#FFF9EF]
                  text-3xl
                  shadow-sm
                "
              >
                ℹ️
              </div>

              <h2 className="text-2xl font-black text-[#241A14]">
                עדיין אין הזמנה לעריכה
              </h2>

              <p className="mx-auto mt-3 max-w-[480px] text-sm font-semibold leading-relaxed text-[#8A7B69]">
                לא נמצאה הזמנה מתאימה לעריכה. חזרי למסך ההזמנות ופתחי את
                ההזמנה הרצויה.
              </p>

              <button
                type="button"
                onClick={() => router.back()}
                className="
                  mt-7
                  h-[48px]
                  rounded-2xl
                  bg-gradient-to-l
                  from-[#B8844F]
                  via-[#D4A762]
                  to-[#E7C98D]
                  px-8
                  text-sm
                  font-black
                  text-white
                  shadow-[0_14px_30px_rgba(184,132,79,0.30)]
                  transition
                  hover:-translate-y-0.5
                  hover:shadow-[0_18px_38px_rgba(184,132,79,0.38)]
                "
              >
                חזרה לדשבורד
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentTitle =
    invitation?.title ||
    invitation?.eventTitle ||
    event?.title ||
    "האירוע שלך";

  /* =========================
     Render
  ========================= */
  return (
    <div
      dir="rtl"
      className="
        min-h-screen
        overflow-x-hidden
        bg-[#F6F1EA]
        px-4
        py-6
        md:px-8
        md:py-8
      "
    >
      <main className="mx-auto w-full max-w-[1540px]">
        {/* HERO */}
        <section
          className="
            relative
            mb-7
            overflow-hidden
            rounded-[38px]
            border
            border-[#E3D0B8]
            bg-[#FFFDF9]
            shadow-[0_24px_75px_rgba(92,65,35,0.13)]
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              inset-0
              bg-gradient-to-l
              from-[#F8EBD7]
              via-[#FFF8EE]
              to-[#FFFFFF]
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -left-24
              -top-24
              h-72
              w-72
              rounded-full
              bg-[#D9B46F]/25
              blur-3xl
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -right-28
              -bottom-28
              h-80
              w-80
              rounded-full
              bg-[#B8844F]/16
              blur-3xl
            "
          />

          <div className="absolute right-10 top-8 rotate-[-10deg] text-5xl text-[#B8844F]/45">
            ✦
          </div>

          <div className="relative z-10 px-6 py-7 md:px-9 md:py-8">
            <button
              type="button"
              onClick={() => router.back()}
              className="
                mb-6
                inline-flex
                h-[42px]
                items-center
                gap-2
                rounded-full
                border
                border-[#D9B46F]/45
                bg-white/75
                px-5
                text-sm
                font-black
                text-[#6B5437]
                shadow-sm
                transition
                hover:bg-white
                hover:shadow-md
              "
            >
              <span>←</span>
              <span>חזרה</span>
            </button>

            <div
              className="
                grid
                grid-cols-1
                gap-6
                xl:grid-cols-[minmax(0,1fr)_360px]
                xl:items-end
              "
            >
              <div>
                <div
                  className="
                    mb-3
                    inline-flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-[#D9B46F]/45
                    bg-white/70
                    px-4
                    py-1.5
                    text-xs
                    font-black
                    text-[#8B5E34]
                    shadow-sm
                  "
                >
                  ✨ ניהול האירוע
                </div>

                <h1
                  className="
                    text-3xl
                    font-black
                    tracking-tight
                    text-[#241A14]
                    md:text-5xl
                  "
                >
                  עריכת אירוע
                </h1>

                <p
                  className="
                    mt-3
                    max-w-[780px]
                    text-sm
                    font-semibold
                    leading-relaxed
                    text-[#7B6857]
                    md:text-base
                  "
                >
                  כאן אפשר לעדכן את פרטי האירוע ואת האפשרויות שיופיעו לאורחים
                  בזמן אישור ההגעה — בצורה מסודרת, נקייה ומותאמת להזמנה.
                </p>
              </div>

              <div
                className="
                  rounded-[28px]
                  border
                  border-[#E3D6C3]
                  bg-white/78
                  p-5
                  shadow-[0_14px_38px_rgba(91,63,31,0.08)]
                  backdrop-blur-[2px]
                "
              >
                <p className="text-xs font-black text-[#8A7B69]">
                  אירוע נוכחי
                </p>

                <h3 className="mt-1 line-clamp-1 text-xl font-black text-[#241A14]">
                  {currentTitle}
                </h3>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#FFF9EF] px-4 py-3">
                    <p className="text-[11px] font-black text-[#8A7B69]">
                      סטטוס
                    </p>
                    <p className="mt-1 text-sm font-black text-[#B8844F]">
                      פעיל
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FFF9EF] px-4 py-3">
                    <p className="text-[11px] font-black text-[#8A7B69]">
                      הגדרות
                    </p>
                    <p className="mt-1 text-sm font-black text-[#B8844F]">
                      זמינות לעריכה
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <section
          className="
            grid
            grid-cols-1
            gap-6
            xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]
            xl:items-start
          "
        >
          {/* צד ימין – פרטי האירוע */}
          <div className="min-w-0">
            <div
              className="
                mb-4
                flex
                items-center
                justify-between
                gap-3
                rounded-[24px]
                border
                border-[#E7DED1]
                bg-white/75
                px-5
                py-4
                shadow-sm
              "
            >
              <div>
                <h2 className="text-lg font-black text-[#241A14]">
                  פרטי האירוע
                </h2>
                <p className="mt-1 text-xs font-bold text-[#8A7B69]">
                  שם, סוג, תאריך, שעה ומיקום
                </p>
              </div>

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-2xl
                  bg-[#FFF4DF]
                  text-xl
                  text-[#B8844F]
                "
              >
                ✎
              </div>
            </div>

            <EventDetailsForm
              event={invitation}
              onSaved={() => {
                router.refresh();
              }}
            />
          </div>

          {/* צד שמאל – הגדרות הזמנה */}
          <div className="min-w-0">
            <div
              className="
                mb-4
                flex
                items-center
                justify-between
                gap-3
                rounded-[24px]
                border
                border-[#E7DED1]
                bg-white/75
                px-5
                py-4
                shadow-sm
              "
            >
              <div>
                <h2 className="text-lg font-black text-[#241A14]">
                  הגדרות הזמנה
                </h2>
                <p className="mt-1 text-xs font-bold text-[#8A7B69]">
                  אפשרויות שיופיעו לאורחים
                </p>
              </div>

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-2xl
                  bg-[#FFF4DF]
                  text-xl
                  text-[#B8844F]
                "
              >
                ⚙️
              </div>
            </div>

            <EventInvitationSettings invitationId={invitation._id} />
          </div>
        </section>
      </main>
    </div>
  );
}