const SMS_PER_RECORD_DEFAULT = 3;

export function resolveUserLimits({
  records,
  smsPerRecord = SMS_PER_RECORD_DEFAULT,
  includeCalls,
}: {
  records: number;
  smsPerRecord?: number;
  includeCalls: boolean;
}) {
  const maxMessages = records * smsPerRecord;

  return {
    guests: records,
    maxMessages,
    includeCalls,
    planLimits: {
      maxGuests: records,
      smsEnabled: true,
      smsLimit: maxMessages,
      seatingEnabled: true,
      remindersEnabled: true,
    },
  };
}
