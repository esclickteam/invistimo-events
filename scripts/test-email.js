require("dotenv").config({ path: ".env.local" });

console.log("📧 ALERT_EMAIL =", process.env.ALERT_EMAIL);
console.log(
  "🔑 RESEND_API_KEY (prefix) =",
  process.env.RESEND_API_KEY?.slice(0, 8)
);

const {
  notifyAdminPurchase,
} = require("../lib/notifyAdminPurchase.node");

async function run() {
  try {
    await notifyAdminPurchase({
      email: "test@invistimo.com",
      amount: 199,
      currency: "ils",
      type: "TEST – Node script",
      details: "בדיקה ידנית דרך node + env debug",
    });

    console.log("✅ Test email sent successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed:", err);
    process.exit(1);
  }
}

run();
