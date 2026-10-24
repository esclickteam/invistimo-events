"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startStudioAudio, type StudioPlayback } from "@/lib/invitationStudio/audio";
import { STUDIO_FONT_STYLESHEET } from "@/lib/invitationStudio/fonts";
import { fitCqw, parentLine } from "@/lib/invitationStudio/details";
import type { PlateAnimation, PlateDesign, StudioMusic } from "@/lib/invitationStudio/types";
import styles from "./plate.module.css";

const SEAL = "/invitation-studio/plates/asset-wax-seal.jpg";

function useStudioFonts() {
  useEffect(() => {
    if (document.getElementById("studio-fonts")) return;
    const link = document.createElement("link");
    link.id = "studio-fonts";
    link.rel = "stylesheet";
    link.href = STUDIO_FONT_STYLESHEET;
    document.head.appendChild(link);
  }, []);
}

function useChroma(src: string) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = frame.data;
      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        if (green > 150 && green > red + 40 && green > blue + 40) data[index + 3] = 0;
      }
      context.putImageData(frame, 0, 0);
      if (!cancelled) setUrl(canvas.toDataURL("image/png"));
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return url;
}

function Line({
  text,
  color,
  font,
  size,
  weight = 500,
  delay = 0,
}: {
  text: string;
  color: string;
  font: string;
  size: number;
  weight?: number;
  delay?: number;
}) {
  if (!text.trim()) return null;
  return (
    <p
      className={styles.line}
      style={{
        color,
        fontFamily: `${font}, "Times New Roman", serif`,
        fontSize: `${size}cqw`,
        fontWeight: weight,
        animationDelay: `${delay}ms`,
      }}
    >
      {text}
    </p>
  );
}

export default function InvitationPlate({
  plate,
  play = false,
  cue = false,
  guestName = "",
  music,
  onReplay,
}: {
  plate: PlateDesign;
  play?: boolean;
  cue?: boolean;
  guestName?: string;
  music?: StudioMusic | null;
  onReplay?: () => void;
}) {
  useStudioFonts();
  const seal = useChroma(SEAL);
  const details = plate.details;
  const speed = plate.speed || 1;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const playback = useRef<StudioPlayback | null>(null);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const active = cue ? started : play;
  const names = [details.brideName, details.groomName].map((item) => item.trim()).filter(Boolean);
  const greeting =
    guestName && details.guestGreeting.includes("{name}")
      ? details.guestGreeting.replaceAll("{name}", guestName)
      : "";
  const dust = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        left: 12 + ((index * 37) % 76),
        top: 18 + ((index * 23) % 62),
        delay: (index % 8) * 0.18,
      })),
    []
  );
  useEffect(() => () => playback.current?.stop(), []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node || !active) return;
    const apply = () => {
      node.getAnimations({ subtree: true }).forEach((item) => {
        item.playbackRate = speed;
      });
    };
    apply();
    const timer = window.setTimeout(apply, 50);
    return () => window.clearTimeout(timer);
  }, [active, speed, plate.animation]);

  function openInvitation() {
    playback.current?.stop();
    setMuted(false);
    setStarted(false);
    if (music && music.mode !== "none") playback.current = startStudioAudio(music, speed);
    window.setTimeout(() => setStarted(true), 30);
    onReplay?.();
  }

  function toggleMute() {
    if (!playback.current && music && music.mode !== "none") {
      playback.current = startStudioAudio(music, speed, true);
      setMuted(false);
      return;
    }
    const next = !muted;
    playback.current?.setMuted(next);
    setMuted(next);
  }

  const animClass: Record<PlateAnimation, string> = {
    none: "",
    envelope: styles.animEnvelope,
    floral: styles.animFloral,
    gold: styles.animGold,
    silk: styles.animSilk,
    zoom: styles.animZoom,
  };
  const inset = plate.inset;
  return (
    <div>
    <div
      ref={stageRef}
      className={`${styles.stage} ${active ? styles.playing : ""} ${animClass[plate.animation] || ""}`}
      data-testid="invitation-plate"
      data-animation={plate.animation}
      data-playing={active ? "true" : "false"}
      style={{ animationDuration: `${plate.durationMs / speed}ms` }}
    >
      {active && plate.animation === "envelope" ? <div className={styles.pocket} /> : null}
      <div className={styles.card}>
        <img
          className={`${styles.art} ${plate.animation === "zoom" || plate.animation === "floral" ? styles.art : ""}`}
          src={plate.art}
          alt=""
        />
        {plate.medallion && names.length ? (
          <div className={styles.medallion} style={{ fontFamily: plate.nameFont }}>
            {names.map((name) => name.slice(0, 1)).join(" · ")}
          </div>
        ) : null}
        <div
          className={styles.copy}
          style={{
            top: `${inset.top}%`,
            right: `${inset.right}%`,
            bottom: `${inset.bottom}%`,
            left: `${inset.left}%`,
          }}
        >
          {details.showBasad ? (
            <Line text={details.basad} color={plate.accent} font={plate.textFont} size={2.15} delay={200} />
          ) : null}
          <Line text={details.opening} color={plate.muted} font={plate.textFont} size={2.7} delay={450} />
          <div className={styles.names} style={{ color: plate.ink, fontFamily: plate.nameFont }}>
            {names.map((name, index) => (
              <div key={`${name}-${index}`}>
                {index > 0 ? <div className={styles.and}>ו</div> : null}
                <div style={{ fontSize: `${fitCqw(name, names.length > 1 ? 5.6 : 6.4, 8)}cqw`, fontWeight: 650 }}>
                  {name}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.dates}>
            <Line text={details.weekday} color={plate.ink} font={plate.textFont} size={2.5} delay={900} />
            <Line text={details.hebrewDate} color={plate.ink} font={plate.nameFont} size={3.3} weight={650} delay={1050} />
            <Line text={details.gregorianDate} color={plate.muted} font={plate.textFont} size={2.4} delay={1150} />
          </div>
          <div className={styles.times} style={{ color: plate.ink, fontFamily: plate.textFont }}>
            {details.reception ? (
              <div>
                <small style={{ color: plate.muted }}>קבלת פנים</small>
                <b>{details.reception}</b>
              </div>
            ) : null}
            {details.ceremony ? (
              <div>
                <small style={{ color: plate.muted }}>חופה וקידושין</small>
                <b>{details.ceremony}</b>
              </div>
            ) : null}
          </div>
          <p className={styles.venue} style={{ color: plate.ink, fontFamily: plate.nameFont }}>
            {details.venue}
          </p>
          <p className={styles.address} style={{ color: plate.muted, fontFamily: plate.textFont }}>
            {details.address}
          </p>
          <div className={styles.parents} style={{ color: plate.muted, fontFamily: plate.textFont }}>
            {details.brideParents ? <p>הורי הכלה · {parentLine(details.brideParents, details.brideParentsMemory)}</p> : null}
            {details.groomParents ? <p>הורי החתן · {parentLine(details.groomParents, details.groomParentsMemory)}</p> : null}
            {details.brideFamily ? <p>משפחת {details.brideFamily}</p> : null}
            {details.groomFamily ? <p>משפחת {details.groomFamily}</p> : null}
          </div>
          <Line text={details.closing} color={plate.ink} font={plate.textFont} size={2.7} delay={1500} />
          <Line text={details.extra} color={plate.muted} font={plate.textFont} size={2.3} delay={1650} />
          <Line text={greeting} color={plate.accent} font={plate.textFont} size={2.5} delay={1800} />
        </div>
        {plate.animation === "floral"
          ? [12, 70, 18, 78].map((left, index) => (
              <span
                key={left}
                className={styles.petal}
                style={{ left: `${left}%`, top: index < 2 ? "8%" : "78%", animationDelay: `${0.2 + index * 0.25}s` }}
              />
            ))
          : null}
        {plate.animation === "gold"
          ? dust.map((item) => (
              <span
                key={`${item.left}-${item.top}`}
                className={styles.dust}
                style={{ left: `${item.left}%`, top: `${item.top}%`, animationDelay: `${item.delay}s` }}
              />
            ))
          : null}
        {active && plate.animation === "gold" ? <div className={styles.sheen} /> : null}
        {active && plate.animation === "silk" ? <div className={styles.ribbon} /> : null}
      </div>
      {active && plate.animation === "envelope" ? (
        <div className={styles.flapLayer}>
          <div className={styles.flap} />
          {seal ? <img className={styles.seal} src={seal} alt="" /> : null}
        </div>
      ) : null}
    </div>
      {cue || onReplay ? (
        <div className="mt-3 flex gap-2">
          <button type="button" data-testid="plate-open" className="flex-1 rounded-full bg-[#2d241c] px-4 py-2 text-sm font-bold text-white" onClick={openInvitation}>
            {music && music.mode !== "none" ? "פתיחה עם מוזיקה" : started ? "צפייה שוב" : "צפייה בהזמנה"}
          </button>
          {music && music.mode !== "none" && started ? (
            <button type="button" data-testid="plate-mute" className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-bold" onClick={toggleMute}>
              {muted ? "השמעה" : "השתקה"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
