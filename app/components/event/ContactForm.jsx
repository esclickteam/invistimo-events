"use client";

import { useState } from "react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();

      setSuccess("הפנייה נשלחה בהצלחה! ניצור קשר בהקדם.");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setError("אירעה שגיאה בשליחת הפנייה. נסו שוב מאוחר יותר.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="max-w-3xl mx-auto px-6 py-24">
      <h2 className="text-4xl font-bold mb-10 text-center">יצירת קשר</h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white rounded-2xl p-8 shadow-sm border border-[#eadfce]"
      >
        <Input label="שם מלא" value={name} onChange={setName} required />
        <Input
          label="כתובת דוא״ל"
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="example@email.com"
          required
        />

        <Input label="נושא הפנייה" value={subject} onChange={setSubject} />

        <Textarea
          label="תוכן ההודעה"
          value={message}
          onChange={setMessage}
          required
        />

        {success && <Alert type="success">{success}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        <button
          disabled={loading}
          className="w-full rounded-full border-2 border-[#c7a17a] py-3 font-semibold hover:bg-[#c7a17a] hover:text-white transition"
        >
          {loading ? "שולח..." : "שליחת פנייה"}
        </button>
      </form>

      <p className="text-center mt-8 text-sm">
        או במייל ישיר: <strong>support@invistimo.com</strong>
      </p>
    </section>
  );
}

/* קומפוננטות קטנות */
function Input({ label, value, onChange, ...props }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[#d6c7b6] px-4 py-3 focus:ring-2 focus:ring-[#c7a17a]"
      />
    </div>
  );
}

function Textarea({ label, value, onChange, ...props }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <textarea
        {...props}
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[#d6c7b6] px-4 py-3 focus:ring-2 focus:ring-[#c7a17a]"
      />
    </div>
  );
}

function Alert({ type, children }) {
  const styles =
    type === "success"
      ? "bg-green-50 border-green-200 text-green-800"
      : "bg-red-50 border-red-200 text-red-800";

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}
