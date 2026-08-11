"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { DEMO_GUEST_UPLOADS, WEDDING_DEMO_CONTENT } from "@/config/weddingWebsite/demoContent";
import type { GuestUploadItem } from "@/types/weddingWebsite";
import { useWeddingGuest, useWeddingSite } from "./WeddingSiteContext";

export function useCountdownTimer(targetDate: string, targetTime: string) {
  const target = `${targetDate}T${targetTime || "00:00"}:00`;
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return time;
}

/** Demo-only local RSVP state (marketing gallery) */
export function useRsvpDemo() {
  const [rsvp, setRsvp] = useState<"yes" | "no" | "">("");
  const [count, setCount] = useState(1);
  const [sent, setSent] = useState(false);
  return { rsvp, setRsvp, count, setCount, sent, setSent };
}

/**
 * Live RSVP when guest token exists; falls back to local demo state otherwise.
 * Uses the same backend as /invite — never duplicates InvitationGuest records.
 */
export function useWeddingRsvp() {
  const { mode } = useWeddingSite();
  const guest = useWeddingGuest();
  const [rsvp, setRsvp] = useState<"yes" | "no" | "">(
    guest?.rsvp === "yes" || guest?.rsvp === "no" ? guest.rsvp : ""
  );
  const [count, setCount] = useState(
    Math.max(1, guest?.arrivedCount || guest?.guestsCount || 1)
  );
  const [notes, setNotes] = useState(guest?.notes || "");
  const [sent, setSent] = useState(
    guest?.rsvp === "yes" || guest?.rsvp === "no"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!guest) return;
    if (guest.rsvp === "yes" || guest.rsvp === "no") {
      setRsvp(guest.rsvp);
      setSent(true);
    }
    setCount(Math.max(1, guest.arrivedCount || guest.guestsCount || 1));
    setNotes(guest.notes || "");
  }, [guest]);

  const submit = useCallback(async () => {
    if (!rsvp) {
      setError("נא לבחור האם תגיעו");
      return false;
    }

    // Demo gallery — local only
    if (mode === "demo" || !guest?.token || !guest.canSubmitRsvp) {
      if (mode === "demo") {
        setSent(true);
        setError("");
        return true;
      }
      setError(
        guest?.token
          ? "לא ניתן לשלוח אישור כרגע"
          : "הקישור האישי חסר — פתחו את האתר מההודעה שקיבלתם"
      );
      return false;
    }

    try {
      setSaving(true);
      setError("");
      const res = await fetch(
        `/api/invitationGuests/respondByToken/${encodeURIComponent(guest.token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rsvp,
            arrivedCount: rsvp === "yes" ? count : 0,
            notes,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.error || "שגיאה בשמירת האישור");
        return false;
      }
      setSent(true);
      return true;
    } catch {
      setError("שגיאת רשת — נסו שוב");
      return false;
    } finally {
      setSaving(false);
    }
  }, [rsvp, count, notes, guest, mode]);

  return {
    rsvp,
    setRsvp,
    count,
    setCount,
    notes,
    setNotes,
    sent,
    setSent,
    saving,
    error,
    submit,
    guestName: guest?.name || "",
    isLive: mode === "live" && Boolean(guest?.token),
    canSubmit: mode === "demo" || Boolean(guest?.canSubmitRsvp),
  };
}

export function useGuestbook() {
  const { content } = useWeddingSite();
  const [message, setMessage] = useState("");
  const [items, setItems] = useState(
    content.guestbookMessages?.length
      ? content.guestbookMessages
      : WEDDING_DEMO_CONTENT.guestbookMessages
  );

  const addMessage = () => {
    if (!message.trim()) return;
    setItems((prev) => [
      {
        name: "אורח",
        message: message.trim(),
        date: new Date().toLocaleDateString("he-IL"),
      },
      ...prev,
    ]);
    setMessage("");
  };

  return { message, setMessage, items, addMessage };
}

export function useGuestUpload() {
  const [items, setItems] = useState<GuestUploadItem[]>(DEMO_GUEST_UPLOADS);
  const [dragging, setDragging] = useState(false);
  const [uploaderName, setUploaderName] = useState("");

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const next = Array.from(files).map((file, i) => ({
        id: `local-${Date.now()}-${i}`,
        type: file.type.startsWith("video/")
          ? ("video" as const)
          : ("image" as const),
        url: URL.createObjectURL(file),
        name: file.name,
        uploadedBy: uploaderName.trim() || "אורח",
        createdAt: new Date().toLocaleDateString("he-IL"),
      }));
      setItems((prev) => [...next, ...prev]);
    },
    [uploaderName]
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files);
  };

  return {
    items,
    dragging,
    setDragging,
    uploaderName,
    setUploaderName,
    onDrop,
    onFileChange,
  };
}

export function usePlaylistDemo() {
  const [song, setSong] = useState("");
  const [songs, setSongs] = useState(["אהבתיה — Static", "עוד יהיה — Noa Kirel"]);
  const addSong = () => {
    if (!song.trim()) return;
    setSongs((prev) => [song.trim(), ...prev]);
    setSong("");
  };
  return { song, setSong, songs, addSong };
}

export function useFaqAccordion(initial: number | null = 0) {
  const [open, setOpen] = useState<number | null>(initial);
  return { open, toggle: (i: number) => setOpen((o) => (o === i ? null : i)) };
}
