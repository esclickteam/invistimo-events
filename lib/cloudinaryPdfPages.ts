export function buildCloudinaryPdfPageImageUrl(
  pdfUrl: string,
  pageNumber: number
) {
  if (!pdfUrl) return "";

  const safePage = Math.max(1, Number(pageNumber || 1));
  const uploadMarker = "/upload/";

  if (!pdfUrl.includes(uploadMarker)) {
    return pdfUrl;
  }

  const [beforeUpload, afterUpload] = pdfUrl.split(uploadMarker);
  const cleanAfterUpload = afterUpload.split("?")[0];

  const imagePath = cleanAfterUpload.replace(/\.pdf$/i, ".png");

  return `${beforeUpload}${uploadMarker}pg_${safePage},w_1800,q_auto:best,f_png/${imagePath}`;
}