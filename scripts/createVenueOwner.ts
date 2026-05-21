import dotenv from "dotenv";
import bcrypt from "bcryptjs";

/* ======================================================
   LOAD ENV FIRST
====================================================== */
dotenv.config({ path: ".env.local" });
dotenv.config();

async function createVenueOwner() {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI לא נטען.");
      console.error("תוודאי שיש קובץ .env.local בשורש הפרויקט עם:");
      console.error("MONGO_URI=...");
      process.exit(1);
    }

    const dbModule = await import("../lib/db");
    const userModule = await import("../models/User");

    const db = dbModule.default || dbModule.connectDB;
    const User = userModule.default;

    await db();

    console.log("🚀 Creating venue owner user...");

    const email = "venue@test.com";
    const password = "VenueOwner!2026";
    const name = "בעל אולם בדיקה";

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("⚠️ משתמש כבר קיים:");

      existingUser.role = "venue_owner";
      existingUser.hasPaid = true;
      existingUser.isTrial = false;
      existingUser.isActive = true;
      existingUser.venueOwner = true;
      existingUser.packageName = "ניהול אולמות";
      existingUser.priceKey = "venue_owner_manual";

      existingUser.accessModules = {
        ...(existingUser.accessModules || {}),
        rsvpSeating: existingUser.accessModules?.rsvpSeating ?? true,
        eventProduction: existingUser.accessModules?.eventProduction ?? false,

        venues: true,
        venueDashboard: true,
        venueCrm: true,
        venueCalendar: true,
        venueMenus: true,
        venueStaff: true,
      };

      existingUser.planLimits = {
        ...(existingUser.planLimits || {}),
        smsLimit: existingUser.planLimits?.smsLimit ?? 0,
      };

      existingUser.smsUsed = existingUser.smsUsed ?? 0;

      await existingUser.save();

      console.log("✅ המשתמש הקיים עודכן לבעל אולם:");
      console.log({
        id: String(existingUser._id),
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        hasPaid: existingUser.hasPaid,
        isTrial: existingUser.isTrial,
        isActive: existingUser.isActive,
        venueOwner: existingUser.venueOwner ?? true,
      });

      console.log("");
      console.log("אפשר להתחבר עם:");
      console.log(`אימייל: ${email}`);
      console.log(`סיסמה: ${password}`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,

      role: "venue_owner",

      hasPaid: true,
      isTrial: false,
      isActive: true,

      venueOwner: true,

      accessModules: {
        rsvpSeating: true,
        eventProduction: false,

        venues: true,
        venueDashboard: true,
        venueCrm: true,
        venueCalendar: true,
        venueMenus: true,
        venueStaff: true,
      },

      packageName: "ניהול אולמות",
      priceKey: "venue_owner_manual",

      planLimits: {
        smsLimit: 0,
      },

      smsUsed: 0,
    });

    console.log("✅ נוצר משתמש בעל אולם בהצלחה:");
    console.log({
      id: String(user._id),
      name: user.name,
      email: user.email,
      password,
      role: user.role,
      hasPaid: user.hasPaid,
      isTrial: user.isTrial,
      isActive: user.isActive,
      venueOwner: user.venueOwner ?? true,
    });

    console.log("");
    console.log("עכשיו תתחברי באתר עם:");
    console.log(`אימייל: ${email}`);
    console.log(`סיסמה: ${password}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ שגיאה ביצירת משתמש בעל אולם:", error);
    process.exit(1);
  }
}

createVenueOwner();