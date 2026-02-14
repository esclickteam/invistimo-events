"use client";

type Props = {
  templateKey: "rsvp" | "table" | "custom";
  previewText: string;
  headerImageUrl?: string;
  hasGiftButton?: boolean;
};

export default function WhatsappTemplatePreview({
  templateKey,
  previewText,
  headerImageUrl,
  hasGiftButton,
}: Props) {
  return (
    <div className="mx-auto bg-black rounded-[36px] p-3 shadow-xl">
      <div
        className="rounded-[28px] overflow-hidden"
        style={{
          backgroundImage: "url('/whatsapp-bg.png')",
          backgroundRepeat: "repeat",
        }}
      >
        {/* HEADER */}
        <div className="bg-gray-100 text-center py-2 text-xs font-semibold">
          INVISTIMO · WhatsApp
        </div>

        {/* BODY */}
        <div className="p-4">
          <div className="max-w-[92%] mx-auto">
            {/* HEADER IMAGE – RSVP בלבד */}
            {templateKey === "rsvp" && (
              headerImageUrl ? (
                <img
                  src={headerImageUrl}
                  className="w-full h-[170px] object-cover rounded-t-2xl border border-b-0"
                />
              ) : (
                <div className="h-[170px] bg-gray-200 rounded-t-2xl flex items-center justify-center text-xs text-gray-500">
                  אין תמונת הזמנה
                </div>
              )
            )}

            {/* MESSAGE */}
            <div className="bg-[#dcf8c6] border border-gray-200 rounded-b-2xl p-3 text-sm whitespace-pre-wrap leading-relaxed">
              {previewText.split("\n").map((l, i) => (
                <p key={i}>{l || <span>&nbsp;</span>}</p>
              ))}
            </div>

            {/* CTA */}
            {templateKey === "rsvp" && (
              <button
                disabled
                className="mt-2 w-full bg-white border rounded-xl py-2 text-sm font-medium text-[#1d6fb8]"
              >
                אישור הגעה
              </button>
            )}

            {templateKey === "table" && (
              <div className="mt-2 border-t bg-white">
                <div className="py-3 text-center text-sm text-[#1d6fb8]">
                  🔗 ניווט לאירוע
                </div>
                {hasGiftButton && (
                  <div className="border-t py-3 text-center text-sm text-[#1d6fb8]">
                    🔗 מתנה באשראי
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
