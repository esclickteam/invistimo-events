"use client";

import React, { useEffect, useMemo, useState } from "react";

type UpgradeOfferCardUser = {
  _id?: string;
  id?: string;
  trialStartedAt?: string | Date | null;
  earlyBirdExpiresAt?: string | Date | null;
  hasPaid?: boolean;
};

type UpgradeOfferCardProps = {
  user?: UpgradeOfferCardUser | null;
};

const EARLY_BIRD_DISMISSED_PREFIX = "bizuplyEarlyBirdDismissed";

function getDismissKey(userId: string) {
  return userId
    ? `${EARLY_BIRD_DISMISSED_PREFIX}:${userId}`
    : EARLY_BIRD_DISMISSED_PREFIX;
}

function formatTimeLeft(expiresAt: string | Date) {
  const expiresTime = new Date(expiresAt).getTime();
  const diff = expiresTime - Date.now();

  if (!Number.isFinite(expiresTime) || diff <= 0) {
    return "Offer expired";
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

export default function UpgradeOfferCard({ user }: UpgradeOfferCardProps) {
  const [showOffer, setShowOffer] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [loading, setLoading] = useState(false);

  const userId = String(user?._id || user?.id || "");

  const dismissKey = useMemo(() => {
    return getDismissKey(userId);
  }, [userId]);

  const trialStart = useMemo(() => {
    if (!user?.trialStartedAt) return null;

    const date = new Date(user.trialStartedAt);
    return Number.isFinite(date.getTime()) ? date : null;
  }, [user?.trialStartedAt]);

  const isOfferExpired = useMemo(() => {
    if (!user?.earlyBirdExpiresAt) return false;

    const expiresTime = new Date(user.earlyBirdExpiresAt).getTime();
    if (!Number.isFinite(expiresTime)) return false;

    return expiresTime <= Date.now();
  }, [user?.earlyBirdExpiresAt]);

  useEffect(() => {
    if (!user || !trialStart) {
      setShowOffer(false);
      return;
    }

    const dismissedInCurrentLogin =
      typeof window !== "undefined" &&
      sessionStorage.getItem(dismissKey) === "true";

    const daysPassed =
      (Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24);

    const shouldShow =
      daysPassed >= 3 &&
      !user.hasPaid &&
      !dismissedInCurrentLogin &&
      !isOfferExpired;

    setShowOffer(Boolean(shouldShow));
  }, [user, trialStart, user?.hasPaid, isOfferExpired, dismissKey]);

  useEffect(() => {
    if (!user?.earlyBirdExpiresAt) {
      setTimeLeft("");
      return;
    }

    const update = () => {
      if (!user?.earlyBirdExpiresAt) return;
      setTimeLeft(formatTimeLeft(user.earlyBirdExpiresAt));
    };

    update();

    const timer = window.setInterval(update, 60 * 1000);

    return () => window.clearInterval(timer);
  }, [user?.earlyBirdExpiresAt]);

  const handleClose = () => {
    setShowOffer(false);

    if (typeof window !== "undefined") {
      sessionStorage.setItem(dismissKey, "true");
    }
  };

  const handleUpgrade = async () => {
    if (loading || isOfferExpired) return;

    try {
      setLoading(true);

      const res = await fetch("/api/payments/early-bird-session", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Payment redirect failed");
      }

      if (!data?.url) {
        throw new Error("Missing checkout URL");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Payment redirect failed:", err);
      alert("Payment redirect failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!showOffer) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="
        fixed inset-0 z-[999999]
        flex items-center justify-center
        bg-black/45 px-4
        pointer-events-auto
      "
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="
          relative z-[1000000]
          w-full max-w-[430px]
          overflow-hidden rounded-[28px]
          border border-white/70
          bg-white
          p-6 text-center
          shadow-[0_28px_90px_rgba(15,23,42,0.28)]
          pointer-events-auto
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#7C3AED] via-[#EC4899] to-[#F59E0B]" />

        <button
          type="button"
          aria-label="Close offer"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClose();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="
            absolute right-4 top-4 z-[1000001]
            flex h-9 w-9 items-center justify-center
            rounded-full border border-slate-200
            bg-white text-2xl font-bold leading-none text-slate-500
            shadow-sm transition
            hover:bg-slate-50 hover:text-slate-900
            active:scale-95
            pointer-events-auto
          "
        >
          ×
        </button>

        <div
          className="
            mx-auto mb-4 inline-flex items-center gap-2
            rounded-full border border-violet-100
            bg-violet-50 px-4 py-2
            text-sm font-extrabold text-violet-700
          "
        >
          🎁 Limited-time offer
        </div>

        <h2 className="mb-2 text-3xl font-black tracking-tight text-slate-950">
          First Month Only{" "}
          <span className="text-violet-700">$99</span>
          <span className="ml-2 align-middle text-lg font-black text-slate-400 line-through">
            $119
          </span>
        </h2>

        <p className="mb-4 text-sm font-bold text-emerald-600">
          Save $20 on your first month
        </p>

        {timeLeft && (
          <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            ⏳ Offer ends in <strong>{timeLeft}</strong>
          </p>
        )}

        <p className="mb-4 text-[15px] leading-7 text-slate-600">
          Unlock <strong className="text-slate-950">BizUply</strong>{" "}
          automations, CRM, messaging and AI tools.
          <br />
          Special early upgrade pricing — no commitment.
        </p>

        <p className="mb-5 text-sm text-slate-500">
          Then <strong className="text-slate-800">$119/month</strong>. Cancel
          anytime.
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleUpgrade();
          }}
          disabled={loading || isOfferExpired}
          className="
            relative z-[1000001]
            w-full rounded-2xl
            bg-gradient-to-r from-[#6D28D9] to-[#DB2777]
            px-5 py-4
            text-base font-black text-white
            shadow-[0_16px_36px_rgba(109,40,217,0.28)]
            transition
            hover:scale-[1.01]
            active:scale-[0.99]
            disabled:cursor-not-allowed disabled:opacity-60
            pointer-events-auto
          "
        >
          {loading ? "Redirecting to checkout..." : "Upgrade for $99"}
        </button>

        <p className="mt-4 text-xs font-semibold text-slate-400">
          Your trial stays active • No obligation
        </p>
      </div>
    </div>
  );
}