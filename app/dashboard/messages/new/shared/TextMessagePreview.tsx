"use client";

type Props = {
  channel: "sms" | "whatsapp";
  text: string;
  loading?: boolean;
  blocked?: boolean;
};

export default function TextMessagePreview({
  channel,
  text,
  loading,
  blocked,
}: Props) {
  return (
    <div className="w-full flex justify-center mt-6 mb-8">
      <div className="relative w-[260px] h-[520px] bg-black rounded-[48px] p-3 shadow-2xl">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[22px] bg-black rounded-b-2xl" />

        <div className="relative w-full h-full bg-[#f5f5f5] rounded-[38px] overflow-hidden">
          {/* HEADER */}
          <div className="bg-gray-100 text-center py-2 text-[11px] font-semibold text-gray-600 border-b">
            INVISTIMO · {channel === "sms" ? "SMS" : "WhatsApp"}
          </div>

          {/* BODY */}
          <div className="flex justify-center items-center h-full p-4">
            <div
              className={`rounded-3xl px-4 py-3 text-sm max-w-[85%]
                whitespace-pre-wrap break-words
                ${
                  blocked
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-200 text-gray-900"
                }`}
            >
              {loading ? "טוען תצוגה מקדימה…" : text}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
