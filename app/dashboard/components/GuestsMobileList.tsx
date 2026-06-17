"use client";

import type { ReactNode } from "react";
import { RSVP_LABELS } from "@/lib/rsvp";

/* ============================================================
   Types
============================================================ */
export type Guest = {
  id?: string;
  _id: string;

  name: string;
  phone: string;
  token: string;

  relation?: string;

  groupId?: string | null;

  tableId?: string | null;
  tableName?: string;
  tableNumber?: number;

  rsvp: "yes" | "no" | "pending";
  guestsCount: number;

  arrivedCount?: number;
  actualArrivedCount?: number;

  notes?: string;

  createdAt?: string;
  updatedAt?: string;
  respondedAt?: string;
  rsvpRespondedAt?: string;
  rsvpUpdatedAt?: string;
  lastResponseAt?: string;

  callRounds?: {
    roundNumber: number;
    status?: string;

    answerStatus?: "answered" | "no_answer" | null;

    resultStatus?:
      | "yes"
      | "no"
      | "will_reply"
      | "callback"
      | "no_answer"
      | "needs_correction"
      | null;

    amount?: number;

    notes?:
      | string
      | {
          text: string;
          createdAt?: string;
          createdBy?: string;
        }[];

    calledAt?: string;
    updatedAt?: string;
  }[];
};

type GuestAction = (guest: Guest) => void | Promise<void>;

type Props = {
  guests: Guest[];

  onOpenInviteLink?: GuestAction;
  onCopyInviteLink?: GuestAction;
  onCall?: GuestAction;
  onWhatsApp?: GuestAction;
  onEdit: GuestAction;
  onDelete: GuestAction;

  /*
    תמיכה ישנה כדי לא לשבור קריאות קיימות.
    במובייל לא מציגים כיסא.
  */
  onMessage?: GuestAction;
  onSeat?: GuestAction;
  onInviteLink?: GuestAction;
};

/* ============================================================
   Helpers
============================================================ */
function StatusBadge({ rsvp }: { rsvp: Guest["rsvp"] }) {
  const styles: Record<Guest["rsvp"], string> = {
    yes: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    no: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`
        rounded-full
        px-3
        py-1
        text-xs
        font-black
        ${styles[rsvp]}
      `}
    >
      {RSVP_LABELS[rsvp]}
    </span>
  );
}

function formatPhone(phone?: string) {
  if (!phone) return "";

  const digits = String(phone).replace(/\D/g, "");

  if (digits.startsWith("0")) return digits;

  if (digits.length === 9 && digits.startsWith("5")) {
    return `0${digits}`;
  }

  return digits;
}

function getTableLabel(guest: Guest) {
  if (guest.tableName && String(guest.tableName).trim()) {
    return String(guest.tableName).trim();
  }

  if (guest.tableNumber) {
    return String(guest.tableNumber);
  }

  return "—";
}

function ActionButton({
  title,
  children,
  onClick,
  danger = false,
}: {
  title: string;
  children: ReactNode;
  onClick: () => void | Promise<void>;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void onClick();
      }}
      title={title}
      aria-label={title}
      className={`
        flex
        h-11
        w-11
        shrink-0
        items-center
        justify-center
        rounded-2xl
        border
        text-[20px]
        shadow-sm
        transition
        hover:-translate-y-0.5
        active:scale-95
        ${
          danger
            ? "border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
            : "border-[#E7D8C6] bg-white hover:bg-[#FBF7EF]"
        }
      `}
    >
      {children}
    </button>
  );
}

function ActionGroup({
  title,
  children,
  align = "right",
}: {
  title: string;
  children: ReactNode;
  align?: "right" | "left";
}) {
  return (
    <div
      dir="rtl"
      className={`
        min-w-0
        ${align === "left" ? "text-left" : "text-right"}
      `}
    >
      <div
        className={`
          mb-2
          text-xs
          font-black
          text-[#7B6A58]
          ${align === "left" ? "text-left" : "text-right"}
        `}
      >
        {title}
      </div>

      <div
        className={`
          flex
          flex-nowrap
          items-center
          gap-2
          ${align === "left" ? "justify-start" : "justify-end"}
        `}
      >
        {children}
      </div>
    </div>
  );
}

/* ============================================================
   Component
============================================================ */
export default function GuestsMobileList({
  guests,

  onOpenInviteLink,
  onCopyInviteLink,
  onCall,
  onWhatsApp,
  onEdit,
  onDelete,

  // תמיכה ישנה
  onMessage,
  onInviteLink,
}: Props) {
  const handleOpenInviteLink = onOpenInviteLink || onInviteLink;
  const handleWhatsApp = onWhatsApp || onMessage;

  if (!guests || guests.length === 0) {
    return (
      <div
        className="
          rounded-[22px]
          border
          border-[#E7DED1]
          bg-white
          py-10
          text-center
          text-sm
          font-bold
          text-gray-500
          shadow-sm
        "
      >
        לא נמצאו תוצאות
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {guests.map((g) => {
        const arrived = Number(g.arrivedCount ?? 0);

        return (
          <div
            key={g._id}
            dir="rtl"
            className="
              rounded-[22px]
              border
              border-[#E7DED1]
              bg-white
              px-4
              py-4
              shadow-[0_10px_28px_rgba(30,27,46,0.08)]
            "
          >
            {/* ================= Header ================= */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-lg font-black leading-tight text-[#4A2E1B]">
                  {g.name || "ללא שם"}
                </div>

                <div className="mt-1 text-base text-gray-500">
                  {formatPhone(g.phone) || "ללא טלפון"}
                </div>

                <div className="mt-2 text-sm text-[#6B5A4A]">
                  {g.relation?.trim() || "ללא קרבה"}
                </div>
              </div>

              <StatusBadge rsvp={g.rsvp} />
            </div>

            {/* ================= Stats ================= */}
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-gray-50 py-3">
                <div className="text-xs text-gray-500">מוזמנים</div>
                <div className="text-lg font-black text-[#6B451E]">
                  {g.guestsCount || 0}
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 py-3">
                <div className="text-xs text-gray-500">מגיעים</div>
                <div className="text-lg font-black text-[#6B451E]">
                  {arrived}
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 py-3">
                <div className="text-xs text-gray-500">שולחן</div>
                <div className="text-lg font-black text-[#6B451E]">
                  {getTableLabel(g)}
                </div>
              </div>
            </div>

            {/* ================= Notes ================= */}
            {g.notes?.trim() ? (
              <div
                className="
                  mt-3
                  rounded-2xl
                  border
                  border-[#EFE4D5]
                  bg-[#FFFCF7]
                  px-4
                  py-3
                  text-sm
                  leading-6
                  text-[#4A3B30]
                "
              >
                {g.notes.trim()}
              </div>
            ) : null}

            {/* ================= Actions ================= */}
            <div className="mt-4 border-t border-[#E7DED1] pt-4">
              <div
                dir="ltr"
                className="
                  flex
                  w-full
                  items-end
                  justify-between
                  gap-4
                  overflow-x-auto
                  pb-1
                "
              >
                {/* פעולות — צד שמאל */}
                <ActionGroup title="פעולות" align="left">
                  {onCall ? (
                    <ActionButton
                      title="מעקב סבבי שיחה"
                      onClick={() => onCall(g)}
                    >
                      📞
                    </ActionButton>
                  ) : null}

                  {handleWhatsApp ? (
                    <ActionButton
                      title="שליחת וואטסאפ אישי"
                      onClick={() => handleWhatsApp(g)}
                    >
                      💬
                    </ActionButton>
                  ) : null}

                  <ActionButton title="עריכת מוזמן" onClick={() => onEdit(g)}>
                    ✏️
                  </ActionButton>

                  <ActionButton
                    title="מחיקת מוזמן"
                    onClick={() => onDelete(g)}
                    danger
                  >
                    🗑️
                  </ActionButton>
                </ActionGroup>

                {/* הזמנת אורח — צד ימין */}
                <ActionGroup title="הזמנת אורח" align="right">
                  {handleOpenInviteLink ? (
                    <ActionButton
                      title="פתיחת קישור הזמנה"
                      onClick={() => handleOpenInviteLink(g)}
                    >
                      🔗
                    </ActionButton>
                  ) : null}

                  {onCopyInviteLink ? (
                    <ActionButton
                      title="העתקת קישור הזמנה"
                      onClick={() => onCopyInviteLink(g)}
                    >
                      📋
                    </ActionButton>
                  ) : null}
                </ActionGroup>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}