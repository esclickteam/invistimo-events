export async function sendWhatsAppMessage(to: string, text: string) {
  const res = await fetch("https://waba-v2.360dialog.io/v1/messages", {
    method: "POST",
    headers: {
      "D360-API-KEY": process.env.WHATSAPP_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",   // ✅ חובה
      to: to,                          // מספר בפורמט בינלאומי בלי +
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
