export async function sendSMS({
  to,
  message,
}: {
  to: string;
  message: string;
}) {
  const payload = {
    key: process.env.SMS4FREE_KEY,
    user: process.env.SMS4FREE_USER,
    pass: process.env.SMS4FREE_PASS,
    sender: process.env.SMS4FREE_SENDER,
    recipient: to,
    msg: message,
  };

  const res = await fetch(
    "https://api.sms4free.co.il/ApiSMS/v2/SendSMS",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();

  if (data.status !== 0) {
    throw new Error("SMS4Free send failed");
  }

  return true;
}
