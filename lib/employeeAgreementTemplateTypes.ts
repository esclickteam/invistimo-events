export const EMPLOYEE_AGREEMENT_TEMPLATE_TYPES = {
  PHONE_REPRESENTATIVE: "phone_representative_agreement",
  TERMINATION: "termination_request",
} as const;

export type EmployeeAgreementTemplateType =
  (typeof EMPLOYEE_AGREEMENT_TEMPLATE_TYPES)[keyof typeof EMPLOYEE_AGREEMENT_TEMPLATE_TYPES];

export const DEFAULT_TEMPLATE_TYPE: EmployeeAgreementTemplateType =
  EMPLOYEE_AGREEMENT_TEMPLATE_TYPES.PHONE_REPRESENTATIVE;

export const TEMPLATE_TYPE_LABELS: Record<EmployeeAgreementTemplateType, string> = {
  phone_representative_agreement:
    "הסכם לעובדים - נציג טלפוני אישורי הגעה",
  termination_request: "בקשה לסיום העסקה",
};

export const TEMPLATE_TYPE_DEFAULT_NAMES: Record<
  EmployeeAgreementTemplateType,
  string
> = {
  phone_representative_agreement:
    "תבנית הסכם עבודה - נציג טלפוני אישורי הגעה",
  termination_request: "תבנית בקשה לסיום העסקה",
};

const VALID_TYPES = new Set<string>(Object.values(EMPLOYEE_AGREEMENT_TEMPLATE_TYPES));

export function normalizeTemplateType(
  value: unknown
): EmployeeAgreementTemplateType {
  const type = typeof value === "string" ? value.trim() : "";

  if (VALID_TYPES.has(type)) {
    return type as EmployeeAgreementTemplateType;
  }

  return DEFAULT_TEMPLATE_TYPE;
}

export function getTemplateTypeLabel(type: EmployeeAgreementTemplateType): string {
  return TEMPLATE_TYPE_LABELS[type] || TEMPLATE_TYPE_LABELS[DEFAULT_TEMPLATE_TYPE];
}

export function getTemplateDefaultName(type: EmployeeAgreementTemplateType): string {
  return (
    TEMPLATE_TYPE_DEFAULT_NAMES[type] ||
    TEMPLATE_TYPE_DEFAULT_NAMES[DEFAULT_TEMPLATE_TYPE]
  );
}
