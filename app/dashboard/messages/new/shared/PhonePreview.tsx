"use client";

/* ================= TYPES ================= */

type SmsPreviewProps = {
  channel: "sms";
  text: string;
};

type WhatsappPreviewProps = {
  channel: "whatsapp";
  text: string;
  headerImageUrl?: string;
  showRsvpButton?: boolean;
};

type Props = SmsPreviewProps | WhatsappPreviewProps;

/* ================= COMPONENT ================= */

export default function PhonePreview(props: Props) {
  const { channel, text } = props;

  return (
    <div className="w-[320px] mx-auto">
      <p className="text-xs text-gray-500 mb-2 text-center">
        תצוגה מקדימה – כך האורח יקבל את ההודעה
      </p>

      <div className="bg-black rounded-[36px] p-3 shadow-xl">
        <div
          className={`rounded-[28px] overflow-hidden ${
            channel === "sms" ? "bg-white" : ""
          }`}
          style={
            channel === "whatsapp"
              ? {
                  backgroundImage: "url('/whatsapp-bg.png')",
                  backgroundRepeat: "repeat",
                }
              : undefined
          }
        >
          {/* HEADER */}
          <div className="bg-gray-100 text-center py-2 text-xs font-semibold">
            INVISTIMO · {channel === "sms" ? "SMS" : "WhatsApp"}
          </div>

          {/* CONTENT */}
          <div className="p-4">
            {channel === "sms" ? (
              /* ================= SMS ================= */
              <div className="flex justify-center">
                <div className="rounded-2xl p-3 text-sm max-w-[90%] whitespace-pre-wrap leading-relaxed break-words bg-gray-200 text-gray-900">
                  {text.split("\n").map((line, i) => (
                    <p key={i}>{line || <span>&nbsp;</span>}</p>
                  ))}
                </div>
              </div>
            ) : (
              /* ================= WHATSAPP ================= */
              <div className="max-w-[92%] mx-auto">
                {/* HEADER IMAGE */}
                {props.headerImageUrl ? (
                  <img
                    src={props.headerImageUrl}
                    alt="Invitation"
                    className="w-full h-[160px] object-cover rounded-t-2xl border border-b-0 border-gray-200"
                  />
                ) : (
                  <div className="w-full h-[160px] bg-gray-200 rounded-t-2xl border border-b-0 border-gray-200 flex items-center justify-center text-xs text-gray-500">
                    אין תמונת הזמנה
                  </div>
                )}

                {/* MESSAGE */}
                <div className="bg-[#dcf8c6] text-gray-900 border border-gray-200 border-t-0 rounded-b-2xl p-3 text-sm whitespace-pre-wrap leading-relaxed break-words">
                  {text.split("\n").map((line, i) => (
                    <p key={i}>{line || <span>&nbsp;</span>}</p>
                  ))}
                </div>

                {/* CTA BUTTON */}
                {props.showRsvpButton && (
                  <button
                    type="button"
                    disabled
                    className="mt-2 w-full bg-white border border-gray-200 rounded-xl py-2 text-sm font-medium text-[#1d6fb8]"
                  >
                    אישור הגעה
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
