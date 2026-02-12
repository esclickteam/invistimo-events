export async function sendWhatsAppTemplate(to: string) {
  const res = await fetch("https://waba-v2.360dialog.io/messages", {
    method: "POST",
    headers: {
      "D360-API-KEY": process.env.WHATSAPP_API_KEY!,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",   // ✅ חשוב
      to: to,                         // 972XXXXXXXXX בלי +
      type: "template",
      template: {
        name: "invistimo_test",
        language: {
          code: "he"
        }
      }
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`WhatsApp send failed: ${error}`);
  }

  return res.json();
}
