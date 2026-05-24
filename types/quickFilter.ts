export type QuickFilter =
  | "all"
  | "yes"
  | "no"
  | "pending"
  | "noTable"

  // 🔽 ממתינים – לפי סטטוס שיחה אחרון
  | "call_answered" // ענה
  | "call_no_answer" // לא ענה

  // 🔽 מתחת ל"ענה" – לפי תוצאת השיחה
  | "call_answered_yes" // ענה + מגיע
  | "call_answered_no" // ענה + לא מגיע
  | "call_will_reply" // ענה + ישיב בהודעה
  | "call_needs_correction"; // ענה + ממתין לתיקון