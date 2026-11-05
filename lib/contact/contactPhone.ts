export const CONTACT_FORM_LEAD_SOURCE = "website";
export const CONTACT_FORM_LEAD_PROVIDER = "contact_form";

export type ContactLeadInput = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  submissionId?: string;
  pagePath?: string;
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

export function normalizeContactPhone(value: unknown) {
  let digits = String(value || "")
    .trim()
    .replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("972")) {
    digits = `0${digits.slice(3)}`;
  }

  return digits;
}

/** Israeli mobile, VoIP, or landline. */
export function isValidContactPhone(value: unknown) {
  const phone = normalizeContactPhone(value);
  return /^(05\d{8}|07\d{8}|0[23489]\d{7})$/.test(phone);
}

export function buildContactLeadNotes(input: ContactLeadInput) {
  return [
    "פנייה מטופס יצירת הקשר באתר.",
    "לא נשלחה הודעה אוטומטית לפונה.",
    input.submissionId ? `מזהה פנייה: ${input.submissionId}` : "",
    input.pagePath ? `עמוד: ${input.pagePath}` : "",
    input.referrerHost ? `מקור: ${input.referrerHost}` : "",
    input.utmSource ? `utm_source: ${input.utmSource}` : "",
    input.utmMedium ? `utm_medium: ${input.utmMedium}` : "",
    input.utmCampaign ? `utm_campaign: ${input.utmCampaign}` : "",
    input.utmContent ? `utm_content: ${input.utmContent}` : "",
    input.utmTerm ? `utm_term: ${input.utmTerm}` : "",
    `שם: ${input.name}`,
    input.email ? `אימייל: ${input.email}` : "אימייל: לא הושאר",
    `טלפון: ${input.phone}`,
    input.subject ? `נושא: ${input.subject}` : "",
    "הודעה:",
    input.message,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildContactLeadPayload(input: ContactLeadInput) {
  return {
    fullName: input.name,
    email: input.email,
    phone: input.phone,
    status: "lead" as const,
    leadStatus: "new" as const,
    leadSource: CONTACT_FORM_LEAD_SOURCE,
    leadProvider: CONTACT_FORM_LEAD_PROVIDER,
    source: CONTACT_FORM_LEAD_SOURCE,
    interestedService: input.subject || "פנייה מטופס יצירת קשר",
    notes: buildContactLeadNotes(input),
    campaignName: "מהאתר",
    formName: "טופס יצירת קשר",
    adName: "",
    facebookLeadId: "",
    submissionId: input.submissionId || "",
    inquiryPagePath: input.pagePath || "",
    referrerHost: input.referrerHost || "",
    utmSource: input.utmSource || "",
    utmMedium: input.utmMedium || "",
    utmCampaign: input.utmCampaign || "",
    utmContent: input.utmContent || "",
    utmTerm: input.utmTerm || "",
    totalPrice: 0,
    paidAmount: 0,
    balance: 0,
  };
}
