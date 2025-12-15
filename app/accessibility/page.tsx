export default function AccessibilityPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      {/* כותרת ראשית */}
      <header className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">הצהרת נגישות</h1>
        <p className="text-sm text-[#7b6754]">
          עודכן לאחרונה: 15.12.2025
        </p>
      </header>

      <div className="space-y-16 text-[17px] leading-relaxed text-[#5c4632]">

        {/* סעיף 1 */}
        <section className="relative pr-6">
          <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
          <p>
            מפעילת אתר <strong>Invistimo</strong> רואה חשיבות עליונה במתן שירות
            שוויוני, מכבד, נגיש ומקצועי לכלל הציבור, לרבות אנשים עם מוגבלויות.
          </p>
          <p className="mt-3">
            אנו פועלים על מנת לאפשר לכל אדם שימוש נוח, עצמאי ושוויוני באתר
            ובשירותים הדיגיטליים המוצעים בו, ככל שניתן, ובהתאם להוראות הדין.
          </p>
        </section>

        {/* סעיף 2 */}
        <section className="relative pr-6">
          <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
          <h2 className="text-2xl font-bold mb-4">מהות האתר</h2>
          <p>
            Invistimo הינו אתר ופלטפורמה טכנולוגית מבוססת תוכנה כשירות (SaaS),
            המיועדת לניהול, תכנון והפקת אירועים, לרבות יצירה וניהול של הזמנות
            דיגיטליות, אישורי הגעה (RSVP), ניהול אורחים, סידורי הושבה, שליחת
            הודעות, תשלומים ושירותים נלווים.
          </p>
          <p className="mt-3">
            מדובר באתר דינמי, עתיר תוכן ופונקציונליות, הכולל ממשקים טכנולוגיים
            מתקדמים, רכיבים אינטראקטיביים ושילוב שירותי צד ג’.
          </p>
        </section>

        {/* סעיף 3 */}
        <section className="relative pr-6">
          <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
          <h2 className="text-2xl font-bold mb-4">התאמות נגישות באתר</h2>
          <p>
            האתר פותח ומנוהל תוך שאיפה לעמידה בהוראות חוק שוויון זכויות לאנשים
            עם מוגבלות, התשנ"ח–1998, תקנות שוויון זכויות לאנשים עם מוגבלות
            (התאמות נגישות לשירות), התשע"ג–2013, והנחיות התקן הישראלי ת"י 5568,
            המבוסס על WCAG 2.1 ברמה AA, ככל שניתן ובהתאם לאופי האתר.
          </p>
          <p className="mt-3">במסגרת זו בוצעו ומבוצעות באתר התאמות נגישות, בין היתר:</p>
          <ul className="list-disc pr-6 mt-3 space-y-2">
            <li>שימוש במבנה סמנטי תקני וברור</li>
            <li>אפשרות ניווט באמצעות מקלדת</li>
            <li>התאמה לקוראי מסך נפוצים</li>
            <li>ניגודיות צבעים מספקת</li>
            <li>שימוש בפונטים קריאים ובגדלי טקסט נוחים</li>
            <li>כפתורים וקישורים ברורים ובעלי משמעות</li>
            <li>התאמה לתצוגה רספונסיבית במגוון מכשירים</li>
            <li>מבנה עמודים עקבי וברור</li>
          </ul>
        </section>

        {/* סעיף 4 */}
<section className="relative pr-6">
  <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
  <h2 className="text-2xl font-bold mb-4">שימוש בשירותי צד ג’</h2>

  <p>
    האתר עושה שימוש, בין היתר, בשירותים, מערכות ורכיבים של צדדים שלישיים,
    כגון:
  </p>

  <ul className="list-disc pr-6 mt-3 space-y-2">
    <li>שירותי סליקה ותשלומים</li>
    <li>שירותי הודעות (SMS, WhatsApp)</li>
    <li>שירותי ענן, אחסון ו־API</li>
    <li>רכיבי תוכנה וספריות חיצוניות</li>
  </ul>

  <p className="mt-3">
    רמת הנגישות של רכיבים ושירותים אלו תלויה, בין היתר, במדיניות וביישום של
    ספקי צד ג’, ואינה נמצאת בשליטתה המלאה של מפעילת האתר.
  </p>

  <p className="mt-3">
    יחד עם זאת, מפעילת האתר עושה מאמץ לבחור ספקים העומדים בסטנדרטים מקובלים
    של נגישות, ולשלבם באתר באופן מיטבי.
  </p>
</section>


      {/* סעיף 5 */}
<section className="relative pr-6">
  <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
  <h2 className="text-2xl font-bold mb-4">מגבלות נגישות אפשריות</h2>

  <p>
    על אף מאמצינו להשיג נגישות מיטבית לכלל חלקי האתר, ייתכן כי:
  </p>

  <ul className="list-disc pr-6 mt-3 space-y-2">
    <li>חלקים מסוימים באתר טרם הונגשו במלואם</li>
    <li>קיימות מגבלות נגישות הנובעות משימוש ברכיבי צד ג’</li>
    <li>
      תכנים מסוימים, בעיקר תכנים דינמיים או עתידיים, עשויים לדרוש התאמות
      נוספות
    </li>
  </ul>

  <p className="mt-3">
    מפעילת האתר פועלת באופן שוטף לזיהוי, טיפול ושיפור של רכיבי נגישות,
    בהתאם לצרכים, לטכנולוגיה המתפתחת ולמשוב המתקבל מהמשתמשים.
  </p>
</section>


        {/* סעיף 6 */}
<section className="relative pr-6">
  <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
  <h2 className="text-2xl font-bold mb-4">אחריות ושימוש באתר</h2>

  <p>
    מובהר כי האתר והשירותים מוצעים כמות שהם (AS IS), וכי מפעילת האתר אינה
    יכולה להבטיח נגישות מלאה ומוחלטת בכל עת ובכל רכיב.
  </p>

  <p className="mt-3">
    יחד עם זאת, מפעילת האתר מחויבת לעשות מאמץ סביר ומתמשך לשיפור רמת
    הנגישות ולהסרת חסמים ככל שיתגלו.
  </p>
</section>


        {/* סעיף 7 */}
<section className="relative pr-6">
  <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />

  <h2 className="text-2xl font-bold mb-4">פנייה בנושא נגישות</h2>

  <p>
    אם נתקלתם בקושי, בעיית נגישות, תקלה טכנית או חסם כלשהו בעת השימוש
    באתר, נשמח לקבל פנייה ולטפל בה בהקדם האפשרי.
  </p>

  <p className="mt-3">
    ניתן לפנות אלינו באמצעות:
  </p>

  <ul className="list-disc pr-6 mt-2 space-y-1">
    <li>טופס יצירת קשר באתר</li>
    <li>
      דוא״ל:&nbsp;
      <strong>support@invistimo.com</strong>
    </li>
  </ul>

  <p className="mt-3">
    לצורך טיפול יעיל, מומלץ לציין:
  </p>

  <ul className="list-disc pr-6 mt-2 space-y-1">
    <li>תיאור הבעיה</li>
    <li>כתובת העמוד שבו התרחשה</li>
    <li>סוג הדפדפן והמכשיר</li>
    <li>אמצעי נגישות שבו נעשה שימוש (ככל שרלוונטי)</li>
  </ul>
</section>


        {/* סעיף 8 */}
        <section className="relative pr-6">
          <span className="absolute right-0 top-2 h-full w-[2px] bg-[#eadfce]" />
          <h2 className="text-2xl font-bold mb-4">עדכון הצהרת הנגישות</h2>
          <p>
            הצהרת נגישות זו עודכנה לאחרונה בתאריך 15.12.2025.
            מפעילת האתר שומרת לעצמה את הזכות לעדכן הצהרה זו מעת לעת,
            בהתאם לשינויים באתר, בדרישות הדין ובהתפתחויות טכנולוגיות.
          </p>
        </section>

      </div>
    </div>
  );
}
