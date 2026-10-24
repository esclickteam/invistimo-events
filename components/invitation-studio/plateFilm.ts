import { fitCqw } from "@/lib/invitationStudio/details";
import { envelopeTimeline } from "@/lib/invitationStudio/envelopeTimeline";
import type { PlateDesign, StudioMusic } from "@/lib/invitationStudio/types";

type Line = { text: string; color: string; font: string; weight: number; size: number; gap?: number };

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image"));
    image.src = src;
  });
}

async function keyedSeal() {
  const image = await loadImage("/invitation-studio/plates/asset-wax-seal.jpg");
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
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
  return canvas;
}

function cover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  scale = 1
) {
  const sourceWidth = "naturalWidth" in image ? image.naturalWidth : width;
  const sourceHeight = "naturalHeight" in image ? image.naturalHeight : height;
  const ratio = sourceWidth / sourceHeight;
  const frame = width / height;
  let drawWidth = width;
  let drawHeight = height;
  if (ratio > frame) {
    drawHeight = height;
    drawWidth = height * ratio;
  } else {
    drawWidth = width;
    drawHeight = width / ratio;
  }
  drawWidth *= scale;
  drawHeight *= scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawPoster(
  context: CanvasRenderingContext2D,
  plate: PlateDesign,
  width: number,
  height: number,
  heroAlpha: number,
  metaAlpha: number
) {
  const details = plate.details;
  const names = [details.brideName, details.groomName].map((item) => item.trim()).filter(Boolean);
  const unit = width / 100;
  const inset = plate.inset;
  const top = (inset.top / 100) * height;
  const bottom = height - (inset.bottom / 100) * height;
  const center = width / 2;
  const maxWidth = width * (1 - (inset.left + inset.right) / 100);
  const hero: Line[] = [];
  const meta: Line[] = [];
  const add = (bucket: Line[], text: string, color: string, font: string, weight: number, size: number, gap = 0.45) => {
    if (!text.trim()) return;
    bucket.push({ text, color, font, weight, size: size * unit, gap });
  };
  if (details.showBasad) add(hero, details.basad, plate.accent, plate.textFont, 500, 2, 0.7);
  add(hero, details.opening, plate.muted, plate.textFont, 400, 2.05, 0.85);
  names.forEach((name, index) => {
    if (index > 0) add(hero, "ו", plate.accent, plate.nameFont, 400, Math.max(3.2, (plate.nameSize || 12) * 0.26), 0.3);
    add(hero, name, plate.ink, plate.nameFont, 400, fitCqw(name, plate.nameSize || 12, 6), 0.12);
  });
  add(
    meta,
    [details.weekday, details.hebrewDate, details.gregorianDate].filter(Boolean).join("  ·  "),
    plate.ink,
    plate.textFont,
    500,
    2.3,
    0.65
  );
  add(
    meta,
    [details.reception ? `קבלת פנים ${details.reception}` : "", details.ceremony ? `חופה וקידושין ${details.ceremony}` : ""]
      .filter(Boolean)
      .join("   ·   "),
    plate.ink,
    plate.textFont,
    500,
    2.15,
    0.65
  );
  add(meta, details.venue, plate.ink, plate.nameFont, 500, 3.05, 0.35);
  add(meta, details.address, plate.muted, plate.textFont, 400, 2.1, 0.55);
  add(
    meta,
    [
      details.brideParents ? `הורי הכלה ${details.brideParents}${details.brideParentsMemory ? " ז״ל" : ""}` : "",
      details.groomParents ? `הורי החתן ${details.groomParents}${details.groomParentsMemory ? " ז״ל" : ""}` : "",
    ]
      .filter(Boolean)
      .join("  ·  "),
    plate.muted,
    plate.textFont,
    400,
    1.85,
    0.3
  );
  add(
    meta,
    [details.brideFamily ? `משפחת ${details.brideFamily}` : "", details.groomFamily ? `משפחת ${details.groomFamily}` : ""]
      .filter(Boolean)
      .join("  ·  "),
    plate.muted,
    plate.textFont,
    400,
    1.85,
    0.5
  );
  add(meta, details.closing, plate.ink, plate.textFont, 400, 2.15, 0.35);
  add(meta, details.extra, plate.muted, plate.textFont, 400, 2, 0.3);

  const paintLines = (lines: Line[], y: number, alpha: number) => {
    context.save();
    context.globalAlpha = alpha;
    context.textAlign = "center";
    context.direction = "rtl";
    lines.forEach((line) => {
      context.fillStyle = line.color;
      context.font = `${line.weight} ${line.size}px "${line.font}", "Times New Roman", serif`;
      y += line.size;
      context.fillText(line.text, center, y, maxWidth);
      y += line.size * (line.gap || 0.45);
    });
    context.restore();
    return y;
  };
  const heroBottom = paintLines(hero, top, heroAlpha);
  if (heroAlpha > 0.04 && names.length) {
    context.save();
    context.globalAlpha = heroAlpha;
    context.fillStyle = plate.accent;
    const ruleWidth = width * 0.12;
    context.fillRect(center - ruleWidth / 2, heroBottom + unit * 0.8, ruleWidth, Math.max(1, unit * 0.12));
    context.restore();
  }
  const metaHeight = meta.reduce((sum, line) => sum + line.size * (1 + (line.gap || 0.45)), 0);
  paintLines(meta, Math.max(heroBottom + unit * 4, bottom - metaHeight), metaAlpha);
}

function envelopeBox(width: number, height: number) {
  const x = width * 0.06;
  const y = height * 0.035;
  const boxWidth = width * 0.88;
  const boxHeight = height * 0.93;
  return { x, y, boxWidth, boxHeight, mouthY: y + boxHeight * 0.42 };
}

/** Pocket only — open mouth so the invitation art shows through, not blank paper. */
function drawEnvelopePocket(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  alpha: number
) {
  const { x, y, boxWidth, boxHeight, mouthY } = envelopeBox(width, height);
  const bottom = y + boxHeight;
  context.save();
  context.globalAlpha = alpha;
  context.beginPath();
  context.moveTo(x, mouthY);
  context.lineTo(x + boxWidth * 0.5, mouthY - boxHeight * 0.08);
  context.lineTo(x + boxWidth, mouthY);
  context.lineTo(x + boxWidth, bottom - 18);
  context.quadraticCurveTo(x + boxWidth, bottom, x + boxWidth - 18, bottom);
  context.lineTo(x + 18, bottom);
  context.quadraticCurveTo(x, bottom, x, bottom - 18);
  context.closePath();
  const wash = context.createLinearGradient(x, mouthY, x, bottom);
  wash.addColorStop(0, "#f8efe3");
  wash.addColorStop(0.55, "#e7d3b6");
  wash.addColorStop(1, "#d9c2a2");
  context.fillStyle = wash;
  context.fill();
  context.strokeStyle = "rgba(110, 72, 36, 0.18)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x + 8, mouthY + 4);
  context.lineTo(x + boxWidth * 0.5, mouthY + boxHeight * 0.22);
  context.lineTo(x + boxWidth - 8, mouthY + 4);
  context.stroke();
  context.restore();
}

function drawEnvelopeFlap(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  flap: number,
  seal: HTMLCanvasElement | null,
  sealVisible: boolean,
  alpha: number
) {
  const { x, y, boxWidth, boxHeight } = envelopeBox(width, height);
  const closedHeight = boxHeight * 0.46;
  const openLift = (1 - Math.max(0, Math.min(1, flap))) * closedHeight * 1.15;
  const tipY = y + closedHeight - openLift;
  if (tipY <= y + 4 && flap < 0.08) return;
  context.save();
  context.globalAlpha = alpha * Math.min(1, flap + 0.15);
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + boxWidth, y);
  context.lineTo(x + boxWidth / 2, Math.max(y + 4, tipY));
  context.closePath();
  const flapWash = context.createLinearGradient(x, y, x, tipY);
  flapWash.addColorStop(0, "#fffaf3");
  flapWash.addColorStop(0.72, "#f0d8b8");
  flapWash.addColorStop(1, "#e2c39a");
  context.fillStyle = flapWash;
  context.fill();
  if (seal && sealVisible) {
    const sealWidth = boxWidth * 0.2;
    context.globalAlpha = alpha * Math.min(1, (flap - 0.35) / 0.35);
    context.drawImage(
      seal,
      x + boxWidth / 2 - sealWidth / 2,
      y + boxHeight * 0.14,
      sealWidth,
      sealWidth
    );
  }
  context.restore();
}

function drawEnvelopeCard(
  context: CanvasRenderingContext2D,
  plate: PlateDesign,
  art: HTMLImageElement,
  width: number,
  height: number,
  rise: number
) {
  const scale = 0.68 + rise * 0.32;
  const reveal = rise <= 0 ? 1 : Math.min(1, Math.max(0.35, rise / 0.12));
  context.save();
  context.globalAlpha = reveal;
  context.translate(width / 2, height / 2 + (1 - rise) * height * 0.18);
  context.scale(scale, scale);
  context.translate(-width / 2, -height / 2);
  cover(context, art, width, height, 1);
  drawPoster(context, plate, width, height, 1, 1);
  context.restore();
}

function paint(context: CanvasRenderingContext2D, plate: PlateDesign, art: HTMLImageElement, seal: HTMLCanvasElement | null, width: number, height: number, time: number) {
  context.clearRect(0, 0, width, height);
  context.save();
  context.beginPath();
  context.rect(0, 0, width, height);
  context.clip();
  const duration = Math.max(1, plate.durationMs / 1000);
  const progress = Math.max(0, Math.min(1, time / duration));

  if (plate.animation === "envelope") {
    const { flap, rise, envelopeAlpha, sealVisible, cardAbovePocket } = envelopeTimeline(time);
    context.fillStyle = "#14110e";
    context.fillRect(0, 0, width, height);
    if (!cardAbovePocket) {
      drawEnvelopeCard(context, plate, art, width, height, rise);
      drawEnvelopePocket(context, width, height, envelopeAlpha);
    } else {
      drawEnvelopePocket(context, width, height, envelopeAlpha);
      drawEnvelopeCard(context, plate, art, width, height, rise);
    }
    drawEnvelopeFlap(context, width, height, flap, seal, sealVisible, envelopeAlpha);
  } else if (plate.animation === "floral") {
    const scale = 1.2 - Math.min(1, time / 5.6) * 0.2;
    cover(context, art, width, height, scale);
    const hero = Math.max(0, Math.min(1, (time - 0.75) / 1.15));
    const meta = Math.max(0, Math.min(1, (time - 1.85) / 1.1));
    drawPoster(context, plate, width, height, hero, meta);
    for (let index = 0; index < 8; index += 1) {
      const life = ((time * 0.35 + index * 0.17) % 1);
      context.globalAlpha = life < 0.2 ? life / 0.2 : 1 - life;
      context.fillStyle = "rgba(236,190,196,0.85)";
      context.beginPath();
      context.ellipse(width * (0.12 + (index % 4) * 0.22), height * (0.16 + life * 0.5), width * 0.045, height * 0.018, index, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
  } else if (plate.animation === "gold") {
    const wake = Math.max(0, Math.min(1, time / 2.2));
    context.filter = `brightness(${0.38 + wake * 0.62}) saturate(${0.45 + wake * 0.55})`;
    cover(context, art, width, height, 1);
    context.filter = "none";
    if (plate.medallion) {
      context.globalAlpha = Math.max(0, Math.min(1, (time - 0.35) / 1.15));
      context.fillStyle = "#e7c56a";
      context.font = `400 ${width * 0.062}px "${plate.nameFont}", serif`;
      context.textAlign = "center";
      const initials = [plate.details.brideName, plate.details.groomName].filter(Boolean).map((name) => name.slice(0, 1)).join("  ·  ");
      context.fillText(initials, width / 2, height * 0.2);
      context.globalAlpha = 1;
    }
    drawPoster(
      context,
      plate,
      width,
      height,
      Math.max(0, Math.min(1, (time - 0.9) / 1.15)),
      Math.max(0, Math.min(1, (time - 2.15) / 1.1))
    );
    for (let index = 0; index < 16; index += 1) {
      const life = (time * 0.45 + index * 0.09) % 1;
      context.globalAlpha = Math.sin(life * Math.PI);
      context.fillStyle = "#f0d48a";
      context.beginPath();
      context.arc(width * (0.15 + ((index * 37) % 70) / 100), height * (0.2 + life * 0.55), 2.2, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  } else if (plate.animation === "silk") {
    cover(context, art, width, height, 1);
    drawPoster(
      context,
      plate,
      width,
      height,
      Math.max(0, Math.min(1, (time - 1.35) / 1.15)),
      Math.max(0, Math.min(1, (time - 2.15) / 1.1))
    );
    const travel = Math.max(0, Math.min(1, (time - 0.3) / 2.5));
    context.save();
    context.globalAlpha = 1 - travel;
    context.translate(width * travel * 1.15, 0);
    context.fillStyle = "#f3e6cf";
    context.fillRect(-width * 0.1, height * 0.34, width * 1.2, height * 0.22);
    context.restore();
  } else if (plate.animation === "zoom") {
    const scale = 1.32 - Math.min(1, time / 7.2) * 0.32;
    cover(context, art, width, height, scale);
    drawPoster(
      context,
      plate,
      width,
      height,
      Math.max(0, Math.min(1, (time - 0.55) / 1.15)),
      Math.max(0, Math.min(1, (time - 1.7) / 1.1))
    );
  } else if (plate.animation === "reveal") {
    const bloom = Math.min(1, time / 6.2);
    cover(context, art, width, height, 1.2 - bloom * 0.2);
    drawPoster(
      context,
      plate,
      width,
      height,
      Math.max(0, Math.min(1, (time - 0.4) / 1.15)),
      Math.max(0, Math.min(1, (time - 2) / 1.1))
    );
  } else if (plate.animation === "glow") {
    const wake = Math.max(0, Math.min(1, time / 2.6));
    context.filter = `brightness(${0.38 + wake * 0.62}) saturate(${0.5 + wake * 0.5})`;
    cover(context, art, width, height, 1);
    context.filter = "none";
    const glow = Math.max(0, Math.min(1, (time - 0.25) / 2.2));
    const gradient = context.createRadialGradient(width / 2, height * 0.44, width * 0.02, width / 2, height * 0.44, width * 0.46);
    gradient.addColorStop(0, `rgba(232,197,106,${0.4 * glow})`);
    gradient.addColorStop(1, "rgba(232,197,106,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    for (let index = 0; index < 18; index += 1) {
      const life = (time * 0.32 + index * 0.08) % 1;
      context.globalAlpha = Math.sin(life * Math.PI) * 0.9;
      context.fillStyle = "#f0d48a";
      context.beginPath();
      context.arc(width * (0.1 + ((index * 37) % 80) / 100), height * (0.62 + life * 0.3), 2.4, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    drawPoster(
      context,
      plate,
      width,
      height,
      Math.max(0, Math.min(1, (time - 0.7) / 1.15)),
      Math.max(0, Math.min(1, (time - 2.05) / 1.1))
    );
  } else {
    cover(context, art, width, height, 1);
    drawPoster(context, plate, width, height, 1, 1);
  }
  context.restore();
  void progress;
}

export async function recordPlateFilm(plate: PlateDesign, onProgress?: (ratio: number) => void) {
  const width = 720;
  const height = 1280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  await document.fonts.load(`600 ${width * 0.05}px "${plate.nameFont}"`);
  await document.fonts.load(`500 ${width * 0.03}px "${plate.textFont}"`);
  await document.fonts.ready;
  const art = await loadImage(plate.art);
  const seal = plate.animation === "envelope" ? await keyedSeal() : null;
  const speed = Math.max(0.6, Math.min(1.6, plate.speed || 1));
  const durationMs = plate.durationMs / speed;
  const fps = 18;
  const frames = Math.max(1, Math.round((durationMs / 1000) * fps));
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
    ? "video/webm;codecs=vp8"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.start();
  const started = performance.now();
  for (let frame = 0; frame < frames; frame += 1) {
    paint(context, { ...plate, speed: 1, durationMs }, art, seal, width, height, (frame / fps) * speed);
    track.requestFrame();
    onProgress?.(frame / frames);
    const target = started + ((frame + 1) * 1000) / fps;
    const wait = target - performance.now();
    if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
  }
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((item) => item.stop());
  return new Blob(chunks, { type: "video/webm" });
}

export async function downloadPlateMp4(plate: PlateDesign, music: StudioMusic | null | undefined, onProgress?: (ratio: number) => void) {
  const webm = await recordPlateFilm(plate, onProgress);
  const body = new FormData();
  body.append("video", webm, "invite.webm");
  body.append("music", JSON.stringify(music || { mode: "none" }));
  body.append("speed", String(plate.speed || 1));
  const response = await fetch("/api/invitation-studio/export", {
    method: "POST",
    credentials: "include",
    body,
  });
  if (!response.ok) throw new Error("export");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${plate.id}.mp4`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
