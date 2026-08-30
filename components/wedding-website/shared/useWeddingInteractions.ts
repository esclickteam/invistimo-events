"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type DragEvent } from "react";
import { DEMO_GUEST_UPLOADS, WEDDING_DEMO_CONTENT } from "@/config/weddingWebsite/demoContent";
import type { GuestUploadItem } from "@/types/weddingWebsite";
import { useWeddingSite } from "../editable/WeddingSiteContext";

export function useCountdownTimer(targetDate: string, targetTime: string) {
  const target = `${targetDate}T${targetTime}:00`;
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

export function useRsvpDemo() {
  const [rsvp, setRsvp] = useState<"yes" | "no" | "">("");
  const [count, setCount] = useState(1);
  const [sent, setSent] = useState(false);
  return { rsvp, setRsvp, count, setCount, sent, setSent };
}

export function useGuestbook() {
  const [message, setMessage] = useState("");
  const [items, setItems] = useState(WEDDING_DEMO_CONTENT.guestbookMessages);

  const addMessage = () => {
    if (!message.trim()) return;
    setItems((prev) => [
      { name: "אורח", message: message.trim(), date: new Date().toLocaleDateString("he-IL") },
      ...prev,
    ]);
    setMessage("");
  };

  return { message, setMessage, items, addMessage };
}

export function useGuestUpload() {
  const live = useWeddingSite()?.live;
  const shareId = live?.shareId || "";
  const token = live?.token || "";
  const invitationId = live?.invitationId || "";
  const role = live?.role || "demo";
  const persist =
    role === "couple" || (role === "guest" && Boolean(shareId && token));

  const [items, setItems] = useState<GuestUploadItem[]>(persist ? [] : DEMO_GUEST_UPLOADS);
  const [dragging, setDragging] = useState(false);
  const [uploaderName, setUploaderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const canUpload = persist || role === "demo";
  const uploadHint =
    role === "demo"
      ? "בתצוגה זו התמונות לא נשמרות. באתר החי הן נשמרות ל-3 חודשים."
      : persist
        ? "התמונות נשמרות במאגר ל-3 חודשים ואז נמחקות."
        : "להעלאת תמונות השתמשו בקישור האישי שנשלח אליכם.";

  const load = useCallback(async () => {
    if (!persist) return;
    try {
      const url = shareId
        ? `/api/w/${shareId}/uploads`
        : `/api/wedding-website/event-uploads?invitationId=${encodeURIComponent(invitationId)}`;
      const res = await fetch(url, { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.items)) {
        setItems(data.items);
      }
    } catch {
      // keep current album
    }
  }, [persist, shareId, invitationId]);

  useEffect(() => {
    load();
  }, [load]);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;

      if (!persist) {
        const next = list.map((file, i) => ({
          id: `local-${Date.now()}-${i}`,
          type: file.type.startsWith("video/") ? ("video" as const) : ("image" as const),
          url: URL.createObjectURL(file),
          name: file.name,
          uploadedBy: uploaderName.trim() || "אורח",
          createdAt: new Date().toISOString(),
        }));
        setItems((prev) => [...next, ...prev]);
        return;
      }

      setUploading(true);
      setError("");
      try {
        for (const file of list) {
          const fd = new FormData();
          fd.append("file", file);
          if (uploaderName.trim()) fd.append("uploadedBy", uploaderName.trim());
          if (token) fd.append("token", token);
          if (invitationId) fd.append("invitationId", invitationId);

          const endpoint = shareId
            ? `/api/w/${shareId}/uploads`
            : "/api/wedding-website/event-uploads";
          const res = await fetch(endpoint, {
            method: "POST",
            credentials: "include",
            body: fd,
          });
          const data = await res.json().catch(() => null);
          if (!res.ok || !data?.item) {
            throw new Error(data?.message || data?.error || "UPLOAD_FAILED");
          }
          setItems((prev) => [data.item, ...prev.filter((item) => item.id !== data.item.id)]);
        }
      } catch {
        setError("לא הצלחנו להעלות את הקובץ. נסו שוב.");
      } finally {
        setUploading(false);
      }
    },
    [persist, uploaderName, token, invitationId, shareId]
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!canUpload) return;
    if (e.dataTransfer.files.length) void processFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!canUpload) return;
    if (e.target.files?.length) void processFiles(e.target.files);
    e.currentTarget.value = "";
  };

  return {
    items,
    dragging,
    setDragging,
    uploaderName,
    setUploaderName,
    onDrop,
    onFileChange,
    canUpload,
    uploadHint,
    uploading,
    error,
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
