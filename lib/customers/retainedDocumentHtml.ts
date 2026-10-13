function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
}

function money(value: unknown) {
  const amount = Number(value || 0);
  return `₪${amount.toLocaleString("he-IL")}`;
}

function sourceOf(doc: any) {
  if (doc?.type === "agreement" && doc?.immutableSignedCopy) {
    return { ...doc, ...doc.immutableSignedCopy, sms: doc.sms, token: doc.token };
  }
  return doc || {};
}

export function buildRetainedDocumentHtml(doc: any) {
  const source = sourceOf(doc);
  const client = source.client || {};
  const event = source.event || {};
  const signature = source.signature || {};
  const agreement = source.agreement || {};
  const totals = source.totals || {};
  const isAgreement = source.type === "agreement" || doc?.type === "agreement";
  const title = isAgreement ? "הסכם" : "הצעת מחיר";
  const signatureImage = String(
    signature.signatureDataUrl || agreement.signatureDataUrl || ""
  );
  const safeImage = signatureImage.startsWith("data:image/")
    ? signatureImage
    : "";
  const amount =
    totals.grossAmountAfterDiscount ??
    totals.grossAmount ??
    source.selectedPackage?.price ??
    0;

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} ${escapeHtml(source.token || "")}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #1f2937; }
    h1 { margin-bottom: 4px; }
    .muted { color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    td { border-bottom: 1px solid #e5e7eb; padding: 8px 0; vertical-align: top; }
    td:first-child { width: 180px; color: #6b7280; }
    img { max-width: 280px; background: #fff; border: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="muted">עותק שמור. תוכן הסכם חתום נלקח מהעותק הקבוע.</p>
  <table>
    <tr><td>לקוח</td><td>${escapeHtml(client.fullName)}</td></tr>
    <tr><td>אימייל</td><td>${escapeHtml(client.email)}</td></tr>
    <tr><td>טלפון</td><td>${escapeHtml(client.phone)}</td></tr>
    <tr><td>תעודת זהות</td><td>${escapeHtml(client.idNumber || signature.idNumber || "")}</td></tr>
    <tr><td>אירוע</td><td>${escapeHtml(event.name)}</td></tr>
    <tr><td>תאריך אירוע</td><td>${escapeHtml(event.date)}</td></tr>
    <tr><td>חבילה</td><td>${escapeHtml(source.selectedPackage?.title)}</td></tr>
    <tr><td>סכום</td><td>${escapeHtml(money(amount))}</td></tr>
    <tr><td>סטטוס</td><td>${escapeHtml(source.status)}</td></tr>
    <tr><td>נוצר</td><td>${formatDate(doc?.createdAt)}</td></tr>
    <tr><td>נשלח</td><td>${formatDate(doc?.sms?.sentAt || source.smsSentAt)}</td></tr>
    <tr><td>נחתם</td><td>${formatDate(signature.signedAt || source.signedAt)}</td></tr>
    <tr><td>שם החותם</td><td>${escapeHtml(signature.fullName || agreement.signatureFullName || "")}</td></tr>
    <tr><td>טלפון חותם</td><td>${escapeHtml(signature.phone || agreement.signaturePhone || "")}</td></tr>
    <tr><td>כתובת IP</td><td>${escapeHtml(source.audit?.signedIp || signature.signedIp || "")}</td></tr>
    <tr><td>דפדפן</td><td>${escapeHtml(source.audit?.signedUserAgent || signature.signedUserAgent || "")}</td></tr>
  </table>
  ${
    safeImage
      ? `<h2>חתימה</h2><img alt="חתימה" src="${safeImage}" />`
      : ""
  }
</body>
</html>`;
}
