"use client";

import React, { useEffect, useMemo, useState } from "react";
import "./UpgradeOfferCard.css";
import API from "../api";

const EARLY_BIRD_DISMISSED_PREFIX = "bizuplyEarlyBirdDismissed";

function getDismissKey(userId) {
  return userId
    ? `${EARLY_BIRD_DISMISSED_PREFIX}:${userId}`
    : EARLY_BIRD_DISMISSED_PREFIX;
}

function formatTimeLeft(expiresAt) {
  const diff = new Date(expiresAt).getTime() - Date.now();

  if (!Number.isFinite(diff) || diff <= 0) {
    return "Offer expired";
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

export default function UpgradeOfferCard({ user }) {
  const [showOffer, setShowOffer] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [loading, setLoading] = useState(false);

  const userId = user?._id || user?.id || "";

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
      !user?.hasPaid &&
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
      setTimeLeft(formatTimeLeft(user.earlyBirdExpiresAt));
    };

    update();

    const timer = setInterval(update, 60 * 1000);

    return () => clearInterval(timer);
  }, [user?.earlyBirdExpiresAt]);

  const handleClose = async () => {
    // סוגר מיידית במסך
    setShowOffer(false);

    // שומר רק לסשן הנוכחי, לא לתמיד
    if (typeof window !== "undefined") {
      sessionStorage.setItem(dismissKey, "true");
    }

    // לא מחכים לשרת כדי לסגור
    try {
      await API.post("/users/mark-earlybird-modal-seen");
    } catch (err) {
      console.warn("Could not mark earlybird modal as seen:", err);
    }
  };

  const handleUpgrade = async () => {
    if (loading || isOfferExpired) return;

    try {
      setLoading(true);

      const { data } = await API.post("/payments/early-bird-session");

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
    <div className="offer-overlay" role="dialog" aria-modal="true">
      <div className="offer-card">
        <button
          type="button"
          className="offer-close"
          onClick={handleClose}
          aria-label="Close offer"
        >
          ×
        </button>

        <span className="offer-badge">🎁 Limited-time offer</span>

        <h2 className="offer-title">
          First Month Only{" "}
          <span className="price-highlight">$99</span>
          <span className="price-original">$119</span>
        </h2>

        <p className="offer-save">Save $20 on your first month</p>

        {timeLeft && (
          <p className="offer-timer">
            Offer ends in <strong>{timeLeft}</strong>
          </p>
        )}

        <p className="offer-desc">
          Unlock <strong>BizUply</strong> automations, CRM, messaging and AI
          tools.
          <br />
          Special early upgrade pricing — no commitment.
        </p>

        <p className="offer-note">
          Then <strong>$119/month</strong>. Cancel anytime.
        </p>

        <button
          type="button"
          className="offer-upgrade-btn"
          onClick={handleUpgrade}
          disabled={loading || isOfferExpired}
        >
          {loading ? "Redirecting to checkout..." : "Upgrade for $99"}
        </button>

        <p className="offer-footer">
          Your trial stays active • No obligation
        </p>
      </div>
    </div>
  );
}