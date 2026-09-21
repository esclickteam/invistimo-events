import { SaveTextScreen } from "@/src/records";

export default function ReminderSms() {
  return (
    <SaveTextScreen
      title="הודעת תזכורת"
      helper="עריכת גוף הודעת התזכורת. ניתן להשתמש ב-{{tableName}}."
      path="/api/admin/reminder-sms-template"
      field="reminderSmsBody"
      method="PUT"
    />
  );
}
