"use client";

import { useState } from "react";
import { Button } from "./ui";

async function sha256(file: File) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function Uploader({
  eventId,
  onDone,
}: {
  eventId: string;
  onDone?: () => void;
}) {
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function uploadFile(file: File) {
    const checksumSha256 = await sha256(file);
    const initRes = await fetch("/api/upload/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        totalBytes: file.size,
        checksumSha256,
      }),
    });
    const init = await initRes.json();
    if (!init.ok) throw new Error(init.error || "init failed");
    if (init.data.duplicate) {
      setStatus(`קובץ כפול — כבר קיים (${init.data.status})`);
      return;
    }

    const { uploadId, uploadToken, chunkSize } = init.data as {
      uploadId: string;
      uploadToken: string;
      chunkSize: number;
    };

    let offset = 0;
    while (offset < file.size) {
      const chunk = file.slice(offset, offset + chunkSize);
      const res = await fetch("/api/upload/chunk", {
        method: "PUT",
        headers: {
          "x-upload-id": uploadId,
          "x-upload-token": uploadToken,
          "x-upload-offset": String(offset),
          "Content-Type": "application/octet-stream",
        },
        body: chunk,
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "chunk failed");
      offset = json.data.receivedBytes;
      setProgress((p) => ({
        ...p,
        [file.name]: Math.round((offset / file.size) * 100),
      }));
    }

    const complete = await fetch("/api/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId, uploadToken }),
    });
    const done = await complete.json();
    if (!done.ok) throw new Error(done.error || "complete failed");
    setStatus(`הועלה בהצלחה · סטטוס: ${done.data.status}`);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setStatus("");
    try {
      for (const file of Array.from(files)) {
        await uploadFile(file);
      }
      onDone?.();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "שגיאת העלאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface p-5">
      <h3 className="font-display text-2xl mb-2">העלאת תמונות וסרטונים</h3>
      <p className="text-sm text-[var(--muted)] mb-4">
        תמיכה בהעלאה מרובה, חידוש מקטעים ומד התקדמות. מהטלפון אפשר לבחור מהגלריה או
        לצלם.
      </p>
      <label className="btn-gold inline-flex cursor-pointer">
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          capture="environment"
          className="hidden"
          disabled={busy}
          onChange={(e) => onFiles(e.target.files)}
        />
        {busy ? "מעלה…" : "בחירת קבצים"}
      </label>
      <div className="mt-4 space-y-2">
        {Object.entries(progress).map(([name, pct]) => (
          <div key={name}>
            <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
              <span className="truncate max-w-[70%]">{name}</span>
              <span>{pct}%</span>
            </div>
            <div className="progress-bar">
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      {status ? <p className="mt-3 text-sm">{status}</p> : null}
      {busy ? null : (
        <Button
          type="button"
          variant="ghost"
          className="mt-3 text-sm"
          onClick={() => onDone?.()}
        >
          סיום
        </Button>
      )}
    </div>
  );
}
