require("dotenv").config();

// 👈 טעינה כמו בסקריפטים הישנים
const { notifyAdminPurchase } = require("../lib/notifyAdminPurchase");

async function run() {
  console.log("🚀 Starting admin purchase email test...");

  try {
    await notifyAdminPurchase({
      email: "test-user@example.com",
      amount: 429,
      currency: "ils",
      type: "TEST PURCHASE",
      details: "בדיקת מייל ידנית ללא Stripe",
    });

    console.log("✅ notifyAdminPurchase finished without throwing");
  } catch (err) {
    console.error("❌ Test script failed", err);
  }

  console.log("🏁 Test finished");
}

run();
