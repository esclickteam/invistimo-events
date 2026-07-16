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

/**
 * Compresses an invitation image for upload.
 * Scales down to max 1080×1920 (portrait) or 1080×1080 (square)
 * and exports as JPEG to keep payloads under server body limits.
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

  const maxWidth = 1080;
  const maxHeight = detectedMode === "square" ? 1080 : 1920;
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);

  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const base64 = canvas.toDataURL("image/jpeg", 0.88);

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
