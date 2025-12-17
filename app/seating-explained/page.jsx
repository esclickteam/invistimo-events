"use client";

import { motion } from "framer-motion";

export default function SeatingExplainedPage() {
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  };

  const transition = { duration: 0.7, ease: "easeOut" };

  return (
    <div className="overflow-hidden">
      {/* בלוק פתיח */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={transition}
        className="relative bg-gradient-to-br from-[#f9f4ee] to-[#f2e7db] py-24 text-center px-6"
      >
        <h1 className="text-5xl font-bold text-[#4a2e15] mb-6">
          סידורי הושבה חכמים
        </h1>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto">
          צרו בקלות מפת אולם אמיתית, שיבצו אורחים בזמן אמת, ושלחו להם הודעה עם
          מספר השולחן שלהם – הכל במקום אחד.
        </p>
        <div className="mt-12 max-w-5xl mx-auto">
          <img
            src="/sit1.png"
            alt="ממשק הוספת שולחן במפת הושבה"
            className="rounded-2xl shadow-xl border mx-auto w-full object-contain"
          />
        </div>
      </motion.section>

      {/* בלוק הושבה בזמן אמת */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={transition}
        className="bg-[#eef3f9] py-24 px-8 text-center"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-semibold mb-6 text-[#1d3f78]">
            שיבוץ אורחים בזמן אמת
          </h2>
          <p className="text-gray-700 max-w-3xl mx-auto mb-10 leading-relaxed">
            גוררים את האורחים מהתפריט הצדדי אל השולחן הרצוי, או משייכים ישירות
            דרך השולחן עצמו. ההושבה מתעדכנת אוטומטית ברשימת האורחים ובדשבורד –
            הכל בזמן אמת וללא טעויות.
          </p>
          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-xl border">
            <video
              src="/video/sit2.mp4"
              controls
              playsInline
              className="w-full h-auto aspect-video object-cover"
            />
          </div>
        </div>
      </motion.section>

      {/* בלוק דשבורד */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={transition}
        className="bg-[#fff8f6] py-24 px-8 text-center"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-semibold mb-6 text-[#784b2f]">
            שליטה מלאה מהדשבורד
          </h2>
          <p className="text-gray-700 max-w-3xl mx-auto mb-10 leading-relaxed">
            ניתן לערוך הושבה של כל אורח ישירות מהדשבורד – כפתור{" "}
            <strong>“הושבה אישית”</strong> מסמן את מיקומו במפה ומאפשר לשנות
            שולחן או כיסא בקלות.
          </p>
          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-xl border">
            <img
              src="/sit3.png"
              alt="מסך דשבורד עם אפשרות הושבה אישית"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </motion.section>

      {/* בלוק שליחת הודעות */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={transition}
        className="bg-[#f4f0fa] py-24 px-8 text-center"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-semibold mb-6 text-[#3f3175]">
            שליחת הודעות לאורחים
          </h2>
          <p className="text-gray-700 max-w-3xl mx-auto mb-10 leading-relaxed">
            לאחר שההושבה הושלמה, ניתן לשלוח לאורחים הודעה אוטומטית עם מספר
            השולחן שלהם – ישירות מתוך המערכת, בלחיצה אחת בלבד.
          </p>
          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-xl border">
            <video
              src="/video/sit4.mp4"
              controls
              playsInline
              className="w-full h-auto aspect-video object-cover"
            />
          </div>
        </div>
      </motion.section>

      {/* בלוק CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={transition}
        className="bg-gradient-to-br from-[#fdfaf6] to-[#fff8f2] py-28 text-center"
      >
        <h3 className="text-4xl font-semibold mb-6 text-[#4a2e15]">
          מוכנים להתחיל?
        </h3>
        <p className="text-gray-700 mb-10 text-lg max-w-xl mx-auto">
          הצטרפו עכשיו ותתחילו לתכנן את סידור ההושבה שלכם – בצורה מקצועית,
          חכמה ומדויקת.
        </p>
        <a
          href="/pricing"
          className="inline-block bg-[#1d3f78] text-white px-10 py-4 rounded-2xl text-lg shadow hover:bg-[#162c5a] transition-all duration-300"
        >
          התחילו לבנות הושבה
        </a>
      </motion.section>
    </div>
  );
}
