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

  const [beforeUpload, afterUploadRaw] = pdfUrl.split(uploadMarker);

  const cleanAfterUpload = afterUploadRaw.split("?")[0];

  const pathWithoutExtension = cleanAfterUpload.replace(
    /\.(pdf|png|jpg|jpeg|webp)$/i,
    ""
  );

  return `${beforeUpload}${uploadMarker}pg_${safePage},w_1800,c_limit,q_auto:best,f_jpg/${pathWithoutExtension}.jpg`;
}