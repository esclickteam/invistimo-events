"use client";

type Props = {
  scheduledAt: Date | null;
  onChange: (date: Date | null) => void;
};

export default function SendTiming({ scheduledAt, onChange }: Props) {
  const isScheduled = scheduledAt !== null;

  return (
    <section className="border rounded-xl p-4 bg-gray-50 space-y-4">
      <h3 className="font-semibold">⏱️ תזמון שליחה</h3>

      {/* שליחה מיידית */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          checked={!isScheduled}
          onChange={() => onChange(null)}
        />
        <span>שליחה מיידית</span>
      </label>

      {!isScheduled && (
        <p className="text-xs text-orange-600 ml-6">
          ⚠️ ההודעה תישלח מיד ולא ניתן לבטל את השליחה
        </p>
      )}

      {/* שליחה מתוזמנת */}
      <label className="flex items-center gap-2 cursor-pointer mt-2">
        <input
          type="radio"
          checked={isScheduled}
          onChange={() => {
            const now = new Date();
            now.setMinutes(now.getMinutes() + 10); // ברירת מחדל
            onChange(now);
          }}
        />
        <span>שליחה מתוזמנת</span>
      </label>

      {isScheduled && (
        <div className="ml-6 space-y-3">
          <div className="flex gap-3">
            <input
              type="date"
              className="border rounded-lg p-2 flex-1"
              value={toDateInput(scheduledAt)}
              onChange={(e) =>
                onChange(
                  mergeDateAndTime(e.target.value, toTimeInput(scheduledAt))
                )
              }
            />

            <input
              type="time"
              className="border rounded-lg p-2 flex-1"
              value={toTimeInput(scheduledAt)}
              onChange={(e) =>
                onChange(
                  mergeDateAndTime(toDateInput(scheduledAt), e.target.value)
                )
              }
            />
          </div>

          <p className="text-xs text-green-600">
            ✔ ניתן לערוך או לבטל את ההודעה עד מועד השליחה
          </p>
        </div>
      )}
    </section>
  );
}

/* ================= HELPERS ================= */

function toDateInput(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function toTimeInput(date: Date | null) {
  if (!date) return "";
  return date.toTimeString().slice(0, 5);
}

function mergeDateAndTime(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}
