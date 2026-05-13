"use client";

import { useEffect, useState } from "react";
import RsvpTab from "./tabs/RsvpTab";
import ReminderTab from "./tabs/ReminderTab";
import ThankYouTab from "./tabs/ThankYouTab";

/* ================= TYPES ================= */

type TabKey = "rsvp" | "reminder" | "thankyou";

type MessageMeta = {
  invitationTitle: string;
  eventDate: string;
  eventLocation: string;
  eventType?: string;
  giftCreditUrl?: string;
  headerImageUrl?: string;
  lat?: number;
  lng?: number;
};

/* ================= DEFAULTS ================= */

const EMPTY_META: MessageMeta = {
  invitationTitle: "",
  eventDate: "",
  eventLocation: "",
  eventType: "",
  giftCreditUrl: "",
  headerImageUrl: "",
  lat: undefined,
  lng: undefined,
};

/* ================= HELPERS ================= */

function formatEventDate(value: any): string {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("he-IL");
}

/* ================= COMPONENT ================= */

export default function NewMessagesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("rsvp");

  const [meta, setMeta] = useState<MessageMeta>(EMPTY_META);
  const [invitationId, setInvitationId] = useState<string>("");

  const [loading, setLoading] = useState(true);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/invitations/my", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();
        const invitation = data?.invitation;
        const event = invitation?.event;

        if (invitation) {
          setInvitationId(invitation._id);

          setMeta({
            invitationTitle: invitation.title || "",
            eventDate: formatEventDate(event?.date || invitation.eventDate),
            eventLocation:
              invitation.location?.address ||
              invitation.location?.name ||
              event?.location?.address ||
              event?.location?.name ||
              "",
            eventType: event?.eventType || invitation.eventType || "",
            giftCreditUrl: event?.giftCreditUrl || invitation.giftCreditUrl || "",
            headerImageUrl:
              invitation.previewImage || invitation.headerImageUrl || "",
            lat: invitation.location?.lat ?? event?.location?.lat,
            lng: invitation.location?.lng ?? event?.location?.lng,
          });
        }
      } catch (err) {
        console.error("❌ Failed to load invitation data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="
          min-h-screen
          bg-[#F8F4EE]
          flex
          items-center
          justify-center
          px-4
        "
      >
        <div
          className="
            flex
            flex-col
            items-center
            gap-4
            rounded-[32px]
            border
            border-[#E8DED0]
            bg-white/80
            px-10
            py-8
            shadow-[0_24px_70px_rgba(80,55,35,0.10)]
            backdrop-blur-xl
          "
        >
          <div
            className="
              h-11
              w-11
              rounded-full
              border-4
              border-[#E7D7BE]
              border-t-[#A77832]
              animate-spin
            "
          />

          <p className="text-sm font-extrabold text-[#7A6754]">
            טוען את מרכז ההודעות…
          </p>
        </div>
      </div>
    );
  }

  /* ================= RENDER ================= */

  return (
    <div
      dir="rtl"
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#F8F4EE]
        px-4
        pb-14
        pt-8
        md:px-8
        md:pt-12
      "
    >
      {/* Background decoration */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_top_right,rgba(183,135,62,0.18),transparent_34%),radial-gradient(circle_at_top_left,rgba(110,72,48,0.10),transparent_30%),linear-gradient(180deg,#FBF8F3_0%,#F6EFE6_100%)]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          right-[-120px]
          top-24
          h-[360px]
          w-[360px]
          rounded-full
          bg-[#E8D0A8]/30
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          left-[-150px]
          top-72
          h-[420px]
          w-[420px]
          rounded-full
          bg-[#B78A4B]/10
          blur-3xl
        "
      />

      <div className="relative z-10 mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <header className="text-center">
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
              border-white/80
              bg-white/85
              text-3xl
              shadow-[0_18px_45px_rgba(89,64,38,0.13)]
              backdrop-blur-xl
            "
          >
            💌
          </div>

          <div
            className="
              mx-auto
              mb-3
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-[#E4D4BF]
              bg-white/70
              px-4
              py-2
              text-xs
              font-black
              text-[#9B6A2D]
              shadow-sm
            "
          >
            <span>ניהול הודעות לאורחים</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#C9A25C]" />
            <span>SMS / WhatsApp</span>
          </div>

          <h1
            className="
              text-4xl
              font-black
              tracking-tight
              text-[#2D241D]
              md:text-6xl
            "
          >
            שליחת הודעות
          </h1>

          <p
            className="
              mx-auto
              mt-4
              max-w-2xl
              text-sm
              font-medium
              leading-7
              text-[#7B6A5B]
              md:text-base
            "
          >
            שליחה חכמה של אישורי הגעה, תזכורות והודעות תודה לפי סבבים,
            סטטוסים וקהל יעד רלוונטי.
          </p>
        </header>

        {/* Tabs */}
        <section
          className="
            mx-auto
            max-w-5xl
            rounded-[30px]
            border
            border-white/80
            bg-white/75
            p-2
            shadow-[0_22px_70px_rgba(70,48,28,0.10)]
            backdrop-blur-xl
          "
        >
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <TabButton
              label="אישור הגעה"
              description="שליחת סבבי RSVP"
              icon="✅"
              active={activeTab === "rsvp"}
              onClick={() => setActiveTab("rsvp")}
            />

            <TabButton
              label="תזכורות"
              description="תזכורת לפני האירוע"
              icon="🔔"
              active={activeTab === "reminder"}
              onClick={() => setActiveTab("reminder")}
            />

            <TabButton
              label="הודעת תודה"
              description="שליחה לאחר האירוע"
              icon="🎁"
              active={activeTab === "thankyou"}
              onClick={() => setActiveTab("thankyou")}
            />
          </div>
        </section>

        {/* Content */}
        <main
          className="
            relative
            mx-auto
            max-w-6xl
            overflow-hidden
            rounded-[42px]
            border
            border-[#E6D8C5]
            bg-white/82
            shadow-[0_30px_90px_rgba(72,48,28,0.13)]
            backdrop-blur-xl
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              inset-x-0
              top-0
              h-32
              bg-gradient-to-b
              from-[#F5E8D4]/80
              to-transparent
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              right-0
              top-0
              h-full
              w-1
              bg-gradient-to-b
              from-[#C69A51]
              via-[#E7D3AA]
              to-transparent
            "
          />

          <div className="relative z-10">
            {activeTab === "rsvp" && (
              <RsvpTab invitationId={invitationId} {...meta} />
            )}

            {activeTab === "reminder" && (
              <ReminderTab invitationId={invitationId} {...meta} />
            )}

            {activeTab === "thankyou" && (
              <ThankYouTab invitationId={invitationId} {...meta} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ================= Tab Button ================= */

function TabButton({
  label,
  description,
  icon,
  active,
  onClick,
}: {
  label: string;
  description: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group
        relative
        overflow-hidden
        rounded-[24px]
        px-5
        py-4
        text-right
        transition-all
        duration-300
        ${
          active
            ? `
              bg-gradient-to-br
              from-[#A36C22]
              via-[#C5964D]
              to-[#8B5A22]
              text-white
              shadow-[0_18px_38px_rgba(139,90,34,0.26)]
              scale-[1.01]
            `
            : `
              bg-[#F3EEE8]
              text-[#3A3028]
              hover:bg-[#EEE5DA]
              hover:shadow-[0_12px_28px_rgba(82,58,34,0.08)]
            `
        }
      `}
    >
      <div
        className="
          relative
          z-10
          flex
          items-center
          justify-between
          gap-4
        "
      >
        <div className="flex items-center gap-3">
          <span
            className={`
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-[18px]
              text-lg
              shadow-sm
              ${
                active
                  ? "bg-white/20 text-white"
                  : "bg-white text-[#A36C22]"
              }
            `}
          >
            {icon}
          </span>

          <div>
            <div
              className={`
                text-base
                font-black
                ${active ? "text-white" : "text-[#2E261F]"}
              `}
            >
              {label}
            </div>

            <div
              className={`
                mt-0.5
                text-xs
                font-bold
                ${active ? "text-white/75" : "text-[#8A7A6B]"}
              `}
            >
              {description}
            </div>
          </div>
        </div>

        {active && (
          <span
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-full
              bg-white
              text-sm
              font-black
              text-[#9B671F]
              shadow-sm
            "
          >
            ✓
          </span>
        )}
      </div>

      {active && (
        <>
          <div
            className="
              pointer-events-none
              absolute
              -left-10
              -top-10
              h-28
              w-28
              rounded-full
              bg-white/16
              blur-xl
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              inset-x-10
              bottom-0
              h-1
              rounded-full
              bg-[#F1DDA9]
            "
          />
        </>
      )}
    </button>
  );
}