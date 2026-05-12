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
              invitation.previewImage ||
              invitation.headerImageUrl ||
              "",
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

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-[60vh] flex items-center justify-center text-gray-500"
      >
        טוען…
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="
        min-h-screen
        bg-[#F7F3EE]
        px-4
        py-8
      "
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="relative text-center space-y-3">
          <div
            className="
              pointer-events-none
              absolute
              inset-x-0
              -top-8
              mx-auto
              h-32
              max-w-4xl
              rounded-full
              bg-gradient-to-l
              from-[#2563EB]/10
              via-[#E6C983]/15
              to-transparent
              blur-3xl
            "
          />

          <div className="relative inline-flex items-center justify-center gap-3">
            <span
              className="
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                bg-white
                shadow-[0_14px_35px_rgba(31,41,55,0.10)]
                text-3xl
              "
            >
              ✉️
            </span>

            <h1
              className="
                text-4xl
                md:text-5xl
                font-black
                text-[#1F2937]
                tracking-tight
              "
            >
              שליחת הודעות
            </h1>
          </div>

          <p className="relative text-base md:text-lg text-[#6B7280]">
            ניהול ושליחה חכמה של הודעות לאורחים לפי סבבים
          </p>
        </header>

        {/* Main Tabs */}
        <section
          className="
            max-w-4xl
            mx-auto
            rounded-[28px]
            bg-white/85
            border
            border-white
            shadow-[0_18px_60px_rgba(31,41,55,0.08)]
            p-2
            backdrop-blur
          "
        >
          <div className="grid grid-cols-3 gap-2">
            <TabButton
              label="אישור הגעה"
              icon="✅"
              active={activeTab === "rsvp"}
              onClick={() => setActiveTab("rsvp")}
            />

            <TabButton
              label="תזכורות"
              icon="🔔"
              active={activeTab === "reminder"}
              onClick={() => setActiveTab("reminder")}
            />

            <TabButton
              label="הודעת תודה"
              icon="🎁"
              active={activeTab === "thankyou"}
              onClick={() => setActiveTab("thankyou")}
            />
          </div>
        </section>

        {/* Content */}
        <main
          className="
            max-w-6xl
            mx-auto
            rounded-[34px]
            bg-white
            border
            border-[#ECE7DF]
            shadow-[0_24px_80px_rgba(31,41,55,0.10)]
            overflow-hidden
          "
        >
          {activeTab === "rsvp" && (
            <RsvpTab invitationId={invitationId} {...meta} />
          )}

          {activeTab === "reminder" && (
            <ReminderTab invitationId={invitationId} {...meta} />
          )}

          {activeTab === "thankyou" && (
            <ThankYouTab invitationId={invitationId} {...meta} />
          )}
        </main>
      </div>
    </div>
  );
}

/* ================= Tab Button ================= */

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative
        flex
        items-center
        justify-center
        gap-2
        rounded-[22px]
        px-5
        py-4
        text-sm
        md:text-base
        font-extrabold
        transition-all
        duration-200
        ${
          active
            ? `
              bg-gradient-to-l
              from-[#2563EB]
              to-[#1D4ED8]
              text-white
              shadow-[0_14px_32px_rgba(37,99,235,0.28)]
              scale-[1.01]
            `
            : `
              bg-[#F1F2F4]
              text-[#374151]
              hover:bg-[#E8EAEE]
            `
        }
      `}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>

      {active && (
        <span
          className="
            absolute
            inset-x-8
            -bottom-1
            h-1
            rounded-full
            bg-[#E6C983]
          "
        />
      )}
    </button>
  );
}