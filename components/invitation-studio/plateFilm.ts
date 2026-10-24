import type { PlateDesign, StudioMusic } from "@/lib/invitationStudio/types";

type Line = { text: string; color: string; font: string; weight: number; size: number };

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

function linesFor(plate: PlateDesign, width: number): Line[] {
  const details = plate.details;
  const names = [details.brideName, details.groomName].map((item) => item.trim()).filter(Boolean);
  const unit = width / 100;
  const lines: Line[] = [];
  const push = (text: string, color: string, font: string, weight: number, size: number) => {
    if (text.trim()) lines.push({ text, color, font, weight, size: size * unit });
  };
  if (details.showBasad) push(details.basad, plate.accent, plate.textFont, 500, 2.15);
  push(details.opening, plate.muted, plate.textFont, 500, 2.5);
  names.forEach((name, index) => {
    if (index > 0) push("ו", plate.ink, plate.nameFont, 500, 3);
    push(name, plate.ink, plate.nameFont, 650, names.length > 1 ? 5.4 : 6.2);
  });
  push(details.weekday, plate.ink, plate.textFont, 500, 2.4);
  push(details.hebrewDate, plate.ink, plate.nameFont, 650, 3.2);
  push(details.gregorianDate, plate.muted, plate.textFont, 500, 2.3);
  if (details.reception || details.ceremony) {
    push(
      [details.reception ? `קבלת פנים ${details.reception}` : "", details.ceremony ? `חופה ${details.ceremony}` : ""]
        .filter(Boolean)
        .join("   ·   "),
      plate.ink,
      plate.textFont,
      600,
      2.5
    );
  }
  push(details.venue, plate.ink, plate.nameFont, 650, 3.3);
  push(details.address, plate.muted, plate.textFont, 500, 2.3);
  if (details.brideParents) push(`הורי הכלה · ${details.brideParents}${details.brideParentsMemory ? " ז״ל" : ""}`, plate.muted, plate.textFont, 500, 2.15);
  if (details.groomParents) push(`הורי החתן · ${details.groomParents}${details.groomParentsMemory ? " ז״ל" : ""}`, plate.muted, plate.textFont, 500, 2.15);
  if (details.brideFamily) push(`משפחת ${details.brideFamily}`, plate.muted, plate.textFont, 500, 2.15);
  if (details.groomFamily) push(`משפחת ${details.groomFamily}`, plate.muted, plate.textFont, 500, 2.15);
  push(details.closing, plate.ink, plate.textFont, 500, 2.5);
  push(details.extra, plate.muted, plate.textFont, 500, 2.2);
  return lines;
}

function drawCopy(context: CanvasRenderingContext2D, plate: PlateDesign, width: number, height: number, alpha: number) {
  const lines = linesFor(plate, width);
  const inset = plate.inset;
  const top = (inset.top / 100) * height;
  const bottom = height - (inset.bottom / 100) * height;
  const center = width / 2;
  const maxWidth = width * (1 - (inset.left + inset.right) / 100);
  const total = lines.reduce((sum, line) => sum + line.size * 1.45, 0);
  let y = top + Math.max(0, (bottom - top - total) / 2);
  context.save();
  context.globalAlpha = alpha;
  context.textAlign = "center";
  context.direction = "rtl";
  lines.forEach((line) => {
    context.fillStyle = line.color;
    context.font = `${line.weight} ${line.size}px "${line.font}", "Times New Roman", serif`;
    y += line.size;
    context.fillText(line.text, center, y, maxWidth);
    y += line.size * 0.45;
  });
  context.restore();
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawEnvelope(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  flap: number,
  seal: HTMLCanvasElement | null,
  alpha: number
) {
  const x = width * 0.06;
  const y = height * 0.035;
  const boxWidth = width * 0.88;
  const boxHeight = height * 0.93;
  context.save();
  context.globalAlpha = alpha;
  roundRect(context, x, y, boxWidth, boxHeight, 18);
  context.fillStyle = "#f4e7d4";
  context.fill();
  const flapHeight = boxHeight * 0.46 * Math.max(0, flap);
  if (flapHeight > 4) {
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + boxWidth, y);
    context.lineTo(x + boxWidth / 2, y + flapHeight);
    context.closePath();
    context.fillStyle = "#fbf6ee";
    context.fill();
  }
  if (seal && flap > 0.35) {
    const sealWidth = boxWidth * 0.2;
    context.drawImage(seal, x + boxWidth / 2 - sealWidth / 2, y + boxHeight * 0.16, sealWidth, sealWidth);
  }
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
    const card = Math.max(0, Math.min(1, (time - 2.15) / 2.2));
    const flap = time < 1.05 ? 1 : Math.max(0, 1 - (time - 1.05) / 1.35);
    const envelopeAlpha = time < 4.7 ? 1 : Math.max(0, 1 - (time - 4.7) / 0.7);
    context.save();
    const scale = 0.68 + card * 0.32;
    context.globalAlpha = card === 0 ? 0 : Math.min(1, card / 0.16);
    context.translate(width / 2, height / 2 + (1 - card) * height * 0.18);
    context.scale(scale, scale);
    context.translate(-width / 2, -height / 2);
    cover(context, art, width, height, 1);
    drawCopy(context, plate, width, height, 1);
    context.restore();
    drawEnvelope(context, width, height, flap, seal, envelopeAlpha);
  } else if (plate.animation === "floral") {
    const scale = 1.2 - Math.min(1, time / 5.6) * 0.2;
    cover(context, art, width, height, scale);
    const text = Math.max(0, Math.min(1, (time - 0.85) / 1.25));
    drawCopy(context, plate, width, height, text);
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
    context.globalAlpha = Math.max(0, Math.min(1, (time - 0.35) / 1.15));
    context.fillStyle = "#e7c56a";
    context.font = `600 ${width * 0.027}px "${plate.nameFont}", serif`;
    context.textAlign = "center";
    const initials = [plate.details.brideName, plate.details.groomName].filter(Boolean).map((name) => name.slice(0, 1)).join(" · ");
    context.fillText(initials, width / 2, height * 0.185);
    context.globalAlpha = 1;
    const text = Math.max(0, Math.min(1, (time - 0.4) / 1.6));
    drawCopy(context, plate, width, height, text);
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
    const text = Math.max(0, Math.min(1, (time - 1.45) / 1.25));
    drawCopy(context, plate, width, height, text);
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
    const text = Math.max(0, Math.min(1, (time - 0.7) / 1.25));
    drawCopy(context, plate, width, height, text);
  } else {
    cover(context, art, width, height, 1);
    drawCopy(context, plate, width, height, 1);
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
  const fps = 12;
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
