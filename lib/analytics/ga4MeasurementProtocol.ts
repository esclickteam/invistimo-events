import {
  Ga4MeasurementHttpError,
  Ga4MeasurementNetworkError,
  type GenerateLeadPayload,
} from "@/lib/analytics/contactInquiryMeasurement";

const COLLECT_URL = "https://www.google-analytics.com/mp/collect";

export async function sendGa4GenerateLead(input: {
  measurementId: string;
  apiSecret: string;
  payload: GenerateLeadPayload;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = input.fetchImpl || fetch;
  const url = new URL(COLLECT_URL);
  url.searchParams.set("measurement_id", input.measurementId);
  url.searchParams.set("api_secret", input.apiSecret);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.payload),
    });
  } catch {
    throw new Ga4MeasurementNetworkError();
  }

  if (!response.ok) {
    throw new Ga4MeasurementHttpError(response.status);
  }
}
