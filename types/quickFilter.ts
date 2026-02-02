export type QuickFilter =
  | "all"              // הכל
  | "yes"              // מגיעים
  | "no"               // לא מגיעים
  | "pending"          // ⭐ ממתינים (טאב ראשי)
  | "noTable"          // בלי שולחן

  // 🔽 תת־טאבים של "ממתינים" – סינון לפי סבב שיחות אחרון
  | "call_answered"    // ענה לשיחה
  | "call_no_answer"   // לא ענה
  | "call_confirmed";  // אישר בשיחה
