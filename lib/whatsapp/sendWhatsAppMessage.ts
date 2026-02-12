export async function sendWhatsAppMessage(to: string, text: string) {
  const res = await fetch("https://waba-v2.360dialog.io/v1/messages", {
    method: "POST",
    headers: {
      "D360-API-KEY": process.env.WHATSAPP_API_KEY!, // ❗ לא Authorization
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: "whatsapp",
      to,
      type: "text",
      text: {
        body: text,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`WhatsApp send failed: ${error}`);
  }

  return res.json();
}
