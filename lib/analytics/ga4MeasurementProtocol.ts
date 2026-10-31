import {
  GA4_MP_TIMEOUT_MS,
  Ga4MeasurementHttpError,
  Ga4MeasurementNetworkError,
  Ga4MeasurementTimeoutError,
  type GenerateLeadPayload,
} from "@/lib/analytics/contactInquiryMeasurement";

const COLLECT_URL = "https://www.google-analytics.com/mp/collect";

export async function sendGa4GenerateLead(input: {
  measurementId: string;
  apiSecret: string;
  payload: GenerateLeadPayload;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}) {
  const fetchImpl = input.fetchImpl || fetch;
  const timeoutMs = input.timeoutMs ?? GA4_MP_TIMEOUT_MS;
  const url = new URL(COLLECT_URL);
  url.searchParams.set("measurement_id", input.measurementId);
  url.searchParams.set("api_secret", input.apiSecret);
  const controller = new AbortController();

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Ga4MeasurementTimeoutError());
    }, timeoutMs);
  });

  const request = Promise.resolve()
    .then(() =>
      fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.payload),
        signal: controller.signal,
      })
    )
    .then((response) => {
      if (!response.ok) throw new Ga4MeasurementHttpError(response.status);
      return response;
    })
    .catch((error: unknown) => {
      if (error instanceof Ga4MeasurementHttpError) throw error;
      if (error instanceof Ga4MeasurementTimeoutError) throw error;
      if (controller.signal.aborted) throw new Ga4MeasurementTimeoutError();
      throw new Ga4MeasurementNetworkError();
    });

  // A late rejection after the other side wins must not surface as unhandled.
  void timeout.catch(() => {});
  void request.catch(() => {});

  try {
    await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
