"use client";

import { useEffect, useRef, useState } from "react";

type HallStatus = "active" | "maintenance" | "closed";

export type AutoSaveHall = {
  id: string;
  name: string;
  subtitle: string;
  capacity: number;
  monthlyEvents: number;
  upcomingEvents: number;
  occupancyRate: number;
  monthlyRevenue: number;
  nextEventAt: string;
  status: HallStatus;
  image: string;
};

type AutoSaveState = "idle" | "saving" | "saved" | "error";

export function useAutoSaveHall(
  hall: AutoSaveHall | null,
  onSaved?: (hall: AutoSaveHall) => void
) {
  const [state, setState] = useState<AutoSaveState>("idle");
  const [error, setError] = useState("");

  const firstRunRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hall) return;

    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setState("saving");
    setError("");

    timerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/venues/dashboard/halls/${hall.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(hall),
        });

        const data = await response.json();

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "שמירה אוטומטית נכשלה");
        }

        setState("saved");

        if (data.hall) {
          onSaved?.(data.hall);
        } else {
          onSaved?.(hall);
        }
      } catch (err) {
        console.error("Auto save hall failed:", err);

        setState("error");
        setError(
          err instanceof Error ? err.message : "שמירה אוטומטית נכשלה"
        );
      }
    }, 700);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [hall, onSaved]);

  return {
    state,
    error,
    isSaving: state === "saving",
    isSaved: state === "saved",
    isError: state === "error",
  };
}