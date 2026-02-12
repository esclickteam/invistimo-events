export async function sendWhatsAppMessage(
  to: string,
  text: string
) {
  const res = await fetch(
    "https://waba-v2.360dialog.io/v1/messages",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        type: "text",
        text: {
          body: text,
        },
      }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`WhatsApp send failed: ${error}`);
  }

  return res.json();
}
