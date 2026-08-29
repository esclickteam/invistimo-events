export type QuickFilter =
  | "all"
  | "yes"
  | "no"
  | "pending"
  | "noTable"
  | "opened"
  | "notOpened"

  // 🔽 סבבי שיחות
  | "call_round_1" // סבב 1
  | "call_round_2" // סבב 2
  | "call_round_3" // סבב 3

  // 🔽 מענה בשיחה
  | "call_answered" // ענה
  | "call_no_answer" // לא ענה

  // 🔽 מתחת ל"ענה"
  | "call_answered_yes" // ענה + מגיע
  | "call_answered_no" // ענה + לא מגיע
  | "call_will_reply" // ענה + ישיב בהודעה
  | "call_callback" // ענה + חזרה בסבב הבא

  // 🔽 מתחת ל"לא ענה"
  | "call_no_answer_result" // לא ענה
  | "call_needs_correction"; // דורש תיקון