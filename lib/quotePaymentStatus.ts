export const QUOTE_PAYMENT_CONFIRMED_LABEL = "מאושר – תשלום בוצע";

export function isAdminPaymentConfirmed(value: unknown) {
  if (value === true) return true;
  if (!value || typeof value !== "object") return false;
  return (value as { adminPaymentConfirmed?: unknown }).adminPaymentConfirmed === true;
}

export function quoteCustomerStatusLabel(
  status: string | undefined,
  paymentConfirmed: boolean,
) {
  if (paymentConfirmed) return QUOTE_PAYMENT_CONFIRMED_LABEL;

  switch (status) {
    case "draft":
      return "טיוטה";
    case "sent":
      return "נשלח";
    case "viewed":
      return "נצפה";
    case "signed":
      return "נחתם";
    case "expired":
      return "פג תוקף";
    default:
      return status || "לא ידוע";
  }
}

export function quoteShowsExpiredNotice(input: {
  status?: string;
  expired?: boolean;
  paymentConfirmed?: boolean;
}) {
  if (input.paymentConfirmed) return false;
  return Boolean(input.expired) || input.status === "expired";
}
