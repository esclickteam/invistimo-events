export type QuickFilter =
  | "all"
  | "yes"
  | "no"
  | "pending"
  | "noTable"

  // 🔽 ממתינים – לפי סבב שיחה אחרון
  | "call_answered"    // status === "answered"
  | "call_no_answer"   // status === "no_answer"
  | "call_will_reply"; // status === "will_reply"
