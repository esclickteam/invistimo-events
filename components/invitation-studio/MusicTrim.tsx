"use client";

import { useEffect, useRef, useState } from "react";
import { startStudioAudio, type StudioPlayback } from "@/lib/invitationStudio/audio";
import type { StudioMusic } from "@/lib/invitationStudio/types";

function sourceOf(music: StudioMusic) {
  if (music.mode === "library") return "/invitation-studio/music/evening-motif.wav";
  if (music.mode === "upload") return music.dataUrl || "";
  return "";
}

export default function MusicTrim({
  music,
  onChange,
}: {
  music: StudioMusic;
  onChange: (next: StudioMusic) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const musicRef = useRef(music);
  const drag = useRef<"start" | "end" | null>(null);
  const playback = useRef<StudioPlayback | null>(null);
  const [duration, setDuration] = useState(16);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [status, setStatus] = useState("");
  musicRef.current = music;

  useEffect(() => {
    const src = sourceOf(music);
    if (!src) return;
    let cancelled = false;
    const context = new AudioContext();
    fetch(src)
      .then((response) => response.arrayBuffer())
      .then((buffer) => context.decodeAudioData(buffer.slice(0)))
      .then((audio) => {
        if (cancelled) return;
        const raw = audio.getChannelData(0);
        const bars = 160;
        const size = Math.max(1, Math.floor(raw.length / bars));
        const next: number[] = [];
        for (let index = 0; index < bars; index += 1) {
          let peak = 0;
          for (let sample = 0; sample < size; sample += 12) peak = Math.max(peak, Math.abs(raw[index * size + sample] || 0));
          next.push(peak);
        }
        setPeaks(next);
        setDuration(audio.duration);
        const current = musicRef.current;
        const end = current.end > 0 && current.end <= audio.duration + 0.05 ? current.end : Math.min(12, audio.duration);
        if (Math.abs(end - current.end) > 0.05 || current.start > end) {
          onChange({ ...current, start: Math.min(current.start, Math.max(0, end - 0.4)), end });
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("לא הצלחנו לקרוא את גל הקול");
      })
      .finally(() => context.close().catch(() => undefined));
    return () => {
      cancelled = true;
    };
  }, [music.mode, music.dataUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks.length) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 84;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const startX = (music.start / duration) * width;
    const endX = (music.end / duration) * width;
    peaks.forEach((peak, index) => {
      const x = (index / peaks.length) * width;
      context.fillStyle = x >= startX && x <= endX ? "#8a5a25" : "#e4d7c6";
      const bar = Math.max(2, peak * (height - 10));
      context.fillRect(x, (height - bar) / 2, Math.max(1.5, width / peaks.length - 1), bar);
    });
    context.fillStyle = "rgba(138,90,37,0.12)";
    context.fillRect(startX, 0, Math.max(0, endX - startX), height);
    context.fillStyle = "#2d241c";
    context.fillRect(startX - 1.5, 0, 3, height);
    context.fillRect(endX - 1.5, 0, 3, height);
  }, [peaks, music.start, music.end, duration]);

  function timeAt(clientX: number) {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  }

  function move(clientX: number) {
    if (!drag.current) return;
    const time = timeAt(clientX);
    if (drag.current === "start") {
      onChange({ ...music, start: Math.max(0, Math.min(time, music.end - 0.4)) });
    } else {
      onChange({ ...music, end: Math.min(duration, Math.max(time, music.start + 0.4)) });
    }
  }

  const selected = Math.max(0, music.end - music.start);

  return (
    <div className="mt-3 space-y-3">
      <canvas
        ref={canvasRef}
        className="h-24 w-full cursor-ew-resize rounded-2xl bg-[#f6f1ea]"
        onPointerDown={(event) => {
          const time = timeAt(event.clientX);
          drag.current = Math.abs(time - music.start) <= Math.abs(time - music.end) ? "start" : "end";
          event.currentTarget.setPointerCapture(event.pointerId);
          move(event.clientX);
        }}
        onPointerMove={(event) => move(event.clientX)}
        onPointerUp={() => {
          drag.current = null;
        }}
      />
      <p className="text-xs font-bold text-[#6d5b4b]">
        הקטע שנבחר: {selected.toFixed(1)} שניות · {music.start.toFixed(1)}–{music.end.toFixed(1)}
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm font-bold">
        <label>
          Fade In
          <input
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={music.fadeIn}
            onChange={(event) => onChange({ ...music, fadeIn: Number(event.target.value) })}
            className="mt-1 w-full"
          />
        </label>
        <label>
          Fade Out
          <input
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={music.fadeOut}
            onChange={(event) => onChange({ ...music, fadeOut: Number(event.target.value) })}
            className="mt-1 w-full"
          />
        </label>
        <label>
          עוצמה
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={music.volume}
            onChange={(event) => onChange({ ...music, volume: Number(event.target.value) })}
            className="mt-1 w-full"
          />
        </label>
        <label>
          סנכרון לאנימציה
          <select
            value={music.sync}
            onChange={(event) => onChange({ ...music, sync: event.target.value as StudioMusic["sync"] })}
            className="mt-1 w-full rounded-xl border px-2 py-2"
          >
            <option value="start">עם פתיחת ההזמנה</option>
            <option value="names">כשהשמות מופיעים</option>
            <option value="details">כשפרטי האירוע נכנסים</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        className="rounded-full bg-[#2d241c] px-4 py-2 text-sm font-bold text-white"
        onClick={() => {
          playback.current?.stop();
          playback.current = startStudioAudio(music, 1, true);
          setStatus("מנגן את הקטע שנבחר");
        }}
      >
        השמעת הקטע בלבד
      </button>
      {status ? <p className="text-xs text-[#6d5b4b]">{status}</p> : null}
    </div>
  );
}
