export type InviteImageMode = "portrait" | "square";

export type ImageInfo = {
  width: number;
  height: number;
  aspectRatio: number;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result || ""));
    };

    reader.onerror = () => {
      reject(new Error("FILE_READ_FAILED"));
    };

    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    img.src = src;
  });
}

const MAX_PAYLOAD_BYTES = 3 * 1024 * 1024;
const MAX_SIDE = 4096;

/**
 * Keeps a JPEG or PNG that already fits the upload and WhatsApp limits.
 * A larger file is scaled down with its own aspect ratio. No plate and no
 * added white, black, or transparent margin.
 */
export async function compressInviteImageFile(
  file: File,
  mode?: InviteImageMode
): Promise<{ base64: string; info: ImageInfo; mode: InviteImageMode }> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;
  const aspectRatio =
    naturalWidth && naturalHeight ? naturalWidth / naturalHeight : 1;

  const detectedMode: InviteImageMode =
    mode ||
    (aspectRatio > 0.9 && aspectRatio < 1.1 ? "square" : "portrait");

  const keepOriginal =
    (file.type === "image/jpeg" || file.type === "image/png") &&
    file.size <= MAX_PAYLOAD_BYTES &&
    naturalWidth > 0 &&
    naturalHeight > 0 &&
    naturalWidth <= MAX_SIDE &&
    naturalHeight <= MAX_SIDE;

  if (keepOriginal) {
    return {
      base64: dataUrl,
      mode: detectedMode,
      info: {
        width: naturalWidth,
        height: naturalHeight,
        aspectRatio,
      },
    };
  }

  let scale = Math.min(MAX_SIDE / naturalWidth, MAX_SIDE / naturalHeight, 1);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";

  let width = 1;
  let height = 1;
  let base64 = "";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    width = Math.max(1, Math.round(naturalWidth * scale));
    height = Math.max(1, Math.round(naturalHeight * scale));
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    base64 =
      mime === "image/png"
        ? canvas.toDataURL("image/png")
        : await shrinkBase64IfNeeded(
            canvas,
            canvas.toDataURL("image/jpeg", 0.92),
            MAX_PAYLOAD_BYTES
          );
    if (estimateDataUrlBytes(base64) <= MAX_PAYLOAD_BYTES) break;
    scale *= 0.75;
  }

  if (estimateDataUrlBytes(base64) > MAX_PAYLOAD_BYTES) {
    throw new Error("IMAGE_TOO_LARGE_AFTER_COMPRESSION");
  }

  return {
    base64,
    mode: detectedMode,
    info: {
      width,
      height,
      aspectRatio: width / height,
    },
  };
}

function estimateDataUrlBytes(dataUrl: string): number {
  return new Blob([dataUrl]).size;
}

async function shrinkBase64IfNeeded(
  canvas: HTMLCanvasElement,
  initialBase64: string,
  maxBytes: number
): Promise<string> {
  let quality = 0.88;
  let base64 = initialBase64;

  while (estimateDataUrlBytes(base64) > maxBytes && quality > 0.45) {
    quality -= 0.08;
    base64 = canvas.toDataURL("image/jpeg", quality);
  }

  return base64;
}
