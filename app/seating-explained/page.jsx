"use client";

import { motion } from "framer-motion";

export default function SeatingExplainedPage() {
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  const transition = { duration: 0.6, ease: "easeOut" };

  return (
    <div className="flex flex-col gap-20 py-20">
      {/* כותרת ראשית */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={transition}
        className="text-center px-6"
      >
        <h1 className="text-4xl font-bold mb-4 text-[#4a2e15]">
          סידורי הושבה חכמים
        </h1>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto">
          תכננו את מפת האולם שלכם, שיבצו אורחים בקלות, ושלחו הודעות אוטומטיות –
          הכל בזמן אמת.
        </p>
      </motion.section>

      {/* בלוק 1 */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={transition}
        className="bg-[#f9f4ee] py-16 px-8 rounded-3xl shadow-md max-w-6xl mx-auto"
      >
        <h2 className="text-2xl font-semibold mb-4 text-[#4a2e15]">
          1. הוספת שולחן ובניית מפת אולם
        </h2>
        <p className="text-gray-700 leading-relaxed mb-6">
          הוסיפו שולחנות לפי הצורה והגודל הרצויים, ומקמו אותם על גבי מפת האולם.
          ניתן גם להעלות{" "}
          <strong>סקיצה אמיתית של האולם</strong> שקיבלתם מהמקום, ולהניח מעליה
          את השולחנות, הרחבה, הבמה והבר – לדיוק מושלם בתכנון.
        </p>
        <img
          src="/sit1.png"
          alt="הוספת שולחן חדש במפת הושבה"
          className="rounded-xl shadow-lg w-full border"
        />
        <p className="text-gray-600 text-sm text-center mt-4">
          הוספת שולחן בלחיצה אחת – עגול, מרובע או אבירים.
        </p>
      </motion.section>

      {/* בלוק 2 */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={transition}
        className="bg-[#eef3f9] py-16 px-8 rounded-3xl shadow-md max-w-6xl mx-auto"
      >
        <h2 className="text-2xl font-semibold mb-4 text-[#1d3f78]">
          2. הושבה בפועל – גרירת אורחים והעדכונים בזמן אמת
        </h2>
        <p className="text-gray-700 leading-relaxed mb-6">
          אחרי שמפת האולם מוכנה, אפשר להתחיל בשיבוץ האורחים:
        </p>
        <ul className="list-disc mr-6 text-gray-700 leading-relaxed mb-6">
          <li>
            <strong>מתוך רשימת האורחים:</strong> גוררים את האורח לשולחן הרצוי.
          </li>
          <li>
            <strong>מתוך השולחן עצמו:</strong> נכנסים לשולחן ומשייכים אליו
            אורחים ישירות.
          </li>
        </ul>
        <p className="text-gray-700 leading-relaxed mb-6">
          ההושבה מסתנכרנת בזמן אמת גם ברשימת האורחים וגם בדשבורד – כך שתמיד
          תראו תמונה עדכנית של מצב ההושבה.
        </p>
        <video
          src="/video/sit2.mp4"
          controls
          className="w-full rounded-xl shadow-lg border"
        />
        <p className="text-gray-600 text-sm text-center mt-4">
          שיבוץ דינמי בזמן אמת – כל שינוי מתעדכן מיידית במערכת.
        </p>
      </motion.section>

      {/* בלוק 3 */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={transition}
        className="bg-[#fff8f6] py-16 px-8 rounded-3xl shadow-md max-w-6xl mx-auto"
      >
        <h2 className="text-2xl font-semibold mb-4 text-[#784b2f]">
          3. עריכת הושבה מדשבורד – הושבה אישית לכל אורח
        </h2>
        <p className="text-gray-700 leading-relaxed mb-6">
          גם דרך הדשבורד ניתן לערוך הושבה. לכל אורח יש כפתור{" "}
          <strong>“הושבה אישית”</strong> – בלחיצה אחת תראו בדיוק היכן הוא יושב,
          ותוכלו לשנות את המיקום שלו מידית. פתרון מושלם לשינויים של הרגע האחרון.
        </p>
        <img
          src="/sit3.png"
          alt="מסך דשבורד עם כפתור הושבה אישית"
          className="rounded-xl shadow-lg w-full border"
        />
        <p className="text-gray-600 text-sm text-center mt-4">
          ניהול מלא של ההושבה מהדשבורד – עדכונים מיידיים לכל אורח.
        </p>
      </motion.section>

      {/* בלוק 4 */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={transition}
        className="bg-[#f4f0fa] py-16 px-8 rounded-3xl shadow-md max-w-6xl mx-auto"
      >
        <h2 className="text-2xl font-semibold mb-4 text-[#3f3175]">
          4. שליחת הודעות עם מספר השולחן
        </h2>
        <p className="text-gray-700 leading-relaxed mb-6">
          לאחר שכל האורחים שובצו במקומם, ניתן לשלוח הודעות אוטומטיות עם מספר
          השולחן שלהם – ישירות מתוך המערכת.
        </p>
        <video
          src="/video/sit4.mp4"
          controls
          className="w-full rounded-xl shadow-lg border"
        />
        <p className="text-gray-600 text-sm text-center mt-4">
          שליחת הודעות מותאמות לכל אורח – חכמה, מהירה ואוטומטית.
        </p>
      </motion.section>

      {/* בלוק סיום */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        transition={transition}
        className="text-center bg-gradient-to-br from-[#fdfaf6] to-[#fff8f2] py-20 px-8 rounded-3xl shadow-lg max-w-5xl mx-auto"
      >
        <h3 className="text-3xl font-semibold mb-4 text-[#4a2e15]">
          מוכנים להתחיל?
        </h3>
        <p className="text-gray-700 mb-8 text-lg">
          התחילו לתכנן את סידור ההושבה שלכם עכשיו – זה אינטואיטיבי, מדויק ומרגיש
          כמו קסם ✨
        </p>
        <a
  href="/pricing"
  className="bg-[#1d3f78] text-white px-8 py-4 rounded-2xl text-lg shadow hover:bg-[#162c5a] transition-all duration-300"
>
  התחילו לבנות הושבה
</a>
      </motion.section>
    </div>
  );
}
