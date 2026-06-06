"use client";
import React, { useEffect, useMemo, useState } from "react";
import "./UpgradeOfferCard.css";
import API from "../api";

export default function UpgradeOfferCard({ user }) {
  const [showOffer, setShowOffer] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [loading, setLoading] = useState(false);

  const trialStart = useMemo(
    () => (user?.trialStartedAt ? new Date(user.trialStartedAt) : null),
    [user?.trialStartedAt]
  );

  // Show only after 3 days from trial start (and only if not paid)
  useEffect(() => {
    if (!trialStart) return;

    const daysPassed =
      (Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24);

    if (daysPassed >= 3 && !user?.hasPaid) {
      setShowOffer(true);
    } else {
      setShowOffer(false);
    }
  }, [trialStart, user?.hasPaid]);

  // Countdown (based on earlyBirdExpiresAt from your DB)
  useEffect(() => {
    if (!user?.earlyBirdExpiresAt) {
      setTimeLeft("");
      return;
    }

    const update = () => {
      const diff = new Date(user.earlyBirdExpiresAt).getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft("Offer expired");
        return;
      }

      const totalMinutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      setTimeLeft(`${hours}h ${minutes}m`);
    };

    update();
    const timer = setInterval(update, 60 * 1000);
    return () => clearInterval(timer);
  }, [user?.earlyBirdExpiresAt]);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const { data } = await API.post("/payments/early-bird-session");
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert("Payment redirect failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!showOffer) return null;

  return (
    <div className="upgrade-card">
      <div className="header-line" />

      <h2>🎁 Limited-Time Early Upgrade</h2>

      <p className="subtitle">
        Upgrade now to unlock <strong>BizUply</strong>&apos;s smart automations,
        CRM, and AI tools — with a limited-time discount.
      </p>

      {timeLeft && (
        <p className="countdown">
          ⏳ Offer ends in <strong>{timeLeft}</strong>
        </p>
      )}

      <button className="upgrade-btn" onClick={handleUpgrade} disabled={loading}>
        {loading ? "Redirecting to checkout..." : "Upgrade & Claim Discount"}
      </button>

      <button className="back-btn" onClick={() => (window.location.href = "/dashboard")}>
        ← Back to Dashboard
      </button>

      <p className="note">
        Your trial remains active. You won&apos;t lose access during the free period.
      </p>
    </div>
  );
}
