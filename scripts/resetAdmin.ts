import dotenv from "dotenv";
import bcrypt from "bcryptjs";

/* ======================================================
   LOAD ENV FIRST
====================================================== */
dotenv.config({ path: ".env.local" });
dotenv.config();

/* ======================================================
   מטרה:
   שחזור / יצירת משתמש אדמין כדי לפתור מצב שבו לא מצליחים
   להתחבר ל-/admin (השרת מחזיר 401 "מייל או סיסמה שגויים").

   401 בהתחברות אומר שאחד מהשניים קורה:
   1. אין משתמש עם המייל הזה בבסיס הנתונים, או
   2. הסיסמה לא תואמת ל-hash ששמור במסד.

   הסקריפט הזה מוודא שיש משתמש אדמין פעיל עם סיסמה ידועה.

   שימוש:
     npm run reset-admin -- <email> <password>

   או עם ברירת מחדל דרך משתני סביבה:
     ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run reset-admin
====================================================== */

async function resetAdmin() {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI לא נטען.");
      console.error("תוודא שיש קובץ .env.local בשורש הפרויקט עם:");
      console.error("MONGO_URI=...");
      process.exit(1);
    }

    /* ==================================================
       קלט: CLI args -> env vars -> ברירת מחדל
    ================================================== */
    const argEmail = process.argv[2];
    const argPassword = process.argv[3];

    const email = String(argEmail || process.env.ADMIN_EMAIL || "")
      .trim()
      .toLowerCase();

    const password = String(argPassword || process.env.ADMIN_PASSWORD || "");

    if (!email || !password) {
      console.error("❌ חסרים מייל או סיסמה.");
      console.error("");
      console.error("שימוש:");
      console.error("  npm run reset-admin -- admin@example.com MyPassword123");
      console.error("");
      console.error("או:");
      console.error(
        "  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=MyPassword123 npm run reset-admin"
      );
      process.exit(1);
    }

    if (password.length < 6) {
      console.error("❌ הסיסמה חייבת להיות באורך של לפחות 6 תווים.");
      process.exit(1);
    }

    const dbModule = await import("../lib/db");
    const userModule = await import("../models/User");

    const db = dbModule.default || dbModule.connectDB;
    const User = userModule.default;

    await db();

    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await User.findOne({ email }).select("+password");

    if (existingUser) {
      console.log("⚠️ נמצא משתמש קיים עם המייל הזה — מעדכן לאדמין ומאפס סיסמה.");

      existingUser.role = "admin";
      existingUser.password = hashedPassword;
      existingUser.needsPasswordSetup = false;
      existingUser.isActive = true;

      // ניקוי טוקן איפוס סיסמה ישן אם קיים
      existingUser.resetPasswordToken = undefined;
      existingUser.resetPasswordExpires = undefined;

      await existingUser.save();

      console.log("✅ המשתמש הקיים עודכן לאדמין וסיסמתו אופסה:");
      console.log({
        id: String(existingUser._id),
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        isActive: existingUser.isActive,
      });
    } else {
      const user = await User.create({
        name: "מנהל מערכת",
        email,
        password: hashedPassword,
        role: "admin",
        needsPasswordSetup: false,
        isActive: true,
      });

      console.log("✅ נוצר משתמש אדמין חדש בהצלחה:");
      console.log({
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });
    }

    console.log("");
    console.log("עכשיו אפשר להתחבר ב-/login עם:");
    console.log(`אימייל: ${email}`);
    console.log(`סיסמה: ${password}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ שגיאה בשחזור/יצירת אדמין:", error);
    process.exit(1);
  }
}

resetAdmin();
