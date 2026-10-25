/**
 * Wedding invitation design gallery for /invitations/chatuna.
 *
 * Product reality: Invistimo digital invitations are uploaded images (or an
 * in-system invite) connected to a personal RSVP link. There is no live
 * template picker in create-invite. These eight styles are original design
 * assets for the marketing gallery and for the paid custom-design addon —
 * labeled as inspiration / custom-design examples, not as one-click product
 * templates.
 */

export type InvitationDesignId =
  | "classic-ivory"
  | "silk-champagne"
  | "botanical-elegance"
  | "modern-editorial"
  | "pearl-romance"
  | "midnight-luxury"
  | "olive-garden"
  | "timeless-monogram";

export type InvitationDesign = {
  id: InvitationDesignId;
  name: string;
  nameHe: string;
  tagline: string;
  description: string;
  palette: string[];
  animated: boolean;
  weddingStyle: string;
  availability: "inspiration";
  availabilityNote: string;
};

export const INVITATION_DESIGNS: InvitationDesign[] = [
  {
    id: "classic-ivory",
    name: "Classic Ivory",
    nameHe: "קלאסיק אייבורי",
    tagline: "רקע אייבורי, מסגרת דקה, טיפוגרפיה קלאסית",
    description:
      "עיצוב על־זמני עם רקע שמנת, קו זהב עדין וטיפוגרפיה מסודרת — מתאים לחתונה קלאסית באולם.",
    palette: ["#F7F1E6", "#E8D9C0", "#C9A962", "#2C241C"],
    animated: false,
    weddingStyle: "חתונה קלאסית באולם",
    availability: "inspiration",
    availabilityNote: "השראה לעיצוב אישי",
  },
  {
    id: "silk-champagne",
    name: "Silk & Champagne",
    nameHe: "סילק אנד שמפניה",
    tagline: "סאטן שמפניה, אור רך ופרטים עדינים",
    description:
      "גווני שמפניה עם תחושת סאטן רכה — לערב יוקרתי בלי עומס ויזואלי.",
    palette: ["#F3E6D0", "#D4B483", "#A67C3D", "#3A2E22"],
    animated: true,
    weddingStyle: "חתונת ערב יוקרתית",
    availability: "inspiration",
    availabilityNote: "השראה לעיצוב אישי · הדגמת תנועה",
  },
  {
    id: "botanical-elegance",
    name: "Botanical Elegance",
    nameHe: "בוטניקל אלגנס",
    tagline: "פרחים לבנים ועלים עדינים, בלי עומס",
    description:
      "פריחה עדינה ומסגרת ירוקה־זית — מתאים לחתונת גן או חופה בטבע.",
    palette: ["#F8F5EE", "#DDE5D4", "#7A8F6A", "#2F3329"],
    animated: true,
    weddingStyle: "חתונת גן",
    availability: "inspiration",
    availabilityNote: "השראה לעיצוב אישי · הדגמת תנועה",
  },
  {
    id: "modern-editorial",
    name: "Modern Editorial",
    nameHe: "מודרן אדיטוריאל",
    tagline: "טיפוגרפיה גדולה, מינימליזם ואסתטיקת מגזין",
    description:
      "קומפוזיציה נקייה עם שמות בולטים ושוליים רחבים — לחתונה מודרנית.",
    palette: ["#FAFAF7", "#EAE6DC", "#1A1A1A", "#8A7A62"],
    animated: false,
    weddingStyle: "חתונה מודרנית",
    availability: "inspiration",
    availabilityNote: "השראה לעיצוב אישי",
  },
  {
    id: "pearl-romance",
    name: "Pearl Romance",
    nameHe: "פרל רומנס",
    tagline: "גווני פנינה וטקסטורות יוקרתיות",
    description:
      "פנינה רכה עם נגיעות בורדו עדין — לחתונה רומנטית ואינטימית.",
    palette: ["#F4EEE8", "#E6D5CF", "#8B4A55", "#2C2426"],
    animated: false,
    weddingStyle: "חתונה רומנטית",
    availability: "inspiration",
    availabilityNote: "השראה לעיצוב אישי",
  },
  {
    id: "midnight-luxury",
    name: "Midnight Luxury",
    nameHe: "מידנייט לקשרי",
    tagline: "שחור עמוק וזהב מעודן",
    description:
      "רקע שחור־רך עם זהב שמפניה — לערב חגיגי ומלא אופי.",
    palette: ["#14110F", "#2A221C", "#C9A962", "#F3E7D2"],
    animated: true,
    weddingStyle: "חתונת ערב יוקרתית",
    availability: "inspiration",
    availabilityNote: "השראה לעיצוב אישי · הדגמת תנועה",
  },
  {
    id: "olive-garden",
    name: "Olive Garden",
    nameHe: "אוליב גארדן",
    tagline: "גווני זית, שמנת ואווירה טבעית",
    description:
      "זית ושמנת עם טיפוגרפיה חמה — לחתונת גן או אירוע כפרי־אלגנטי.",
    palette: ["#F3EFE4", "#C5C4A0", "#6B7348", "#2C2A20"],
    animated: false,
    weddingStyle: "חתונת גן",
    availability: "inspiration",
    availabilityNote: "השראה לעיצוב אישי",
  },
  {
    id: "timeless-monogram",
    name: "Timeless Monogram",
    nameHe: "טיימלס מונוגרמה",
    tagline: "מונוגרמה של ראשי תיבות ומסגרת אלגנטית",
    description:
      "מונוגרמה במרכז, מסגרת כפולה ועיצוב על־זמני — לחתונה אינטימית או קלאסית.",
    palette: ["#F6F0E6", "#DED0B8", "#8B6914", "#241E18"],
    animated: false,
    weddingStyle: "חתונה אינטימית",
    availability: "inspiration",
    availabilityNote: "השראה לעיצוב אישי",
  },
];

export const DEMO_COUPLE = {
  bride: "מיה",
  groom: "אלון",
  monogram: "מ · א",
  opener: "בשמחה גדולה ובהתרגשות,\nמזמינים אתכם לחגוג איתנו את יום נישואינו",
  weekday: "יום חמישי",
  date: "17.06.2027",
  venue: "גן האירועים נוף הגליל",
  address: "דרך הכרמים 12, הגליל התחתון",
  reception: "19:00",
  chuppah: "20:00",
  closing: "נשמח לראותכם איתנו ברגע המיוחד שלנו",
  brideParents: "רחל ודוד כהן",
  groomParents: "מיכל ויוסי לוי",
  disclaimer: "המחשה בלבד · פרטים בדויים",
} as const;

export const ANIMATION_DEMOS = [
  {
    id: "envelope",
    title: "פתיחת מעטפה",
    description: "מעטפה אלגנטית נפתחת וחושפת הזמנה.",
    concept: true,
  },
  {
    id: "satin",
    title: "סאטן ושמפניה",
    description: "סרט סאטן נע בעדינות וחושף את שמות בני הזוג.",
    concept: true,
  },
  {
    id: "bloom",
    title: "פריחה עדינה",
    description: "אלמנטים פרחוניים נחשפים בהדרגה סביב ההזמנה.",
    concept: true,
  },
  {
    id: "cinematic",
    title: "טיפוגרפיה קולנועית",
    description: "שמות בני הזוג ותאריך החתונה מופיעים ברצף אנימציה נקי.",
    concept: true,
  },
] as const;

export const CUSTOMIZE_OPTIONS = [
  {
    title: "שמות בני הזוג",
    text: "ניתן לעדכן דרך פרטי האירוע במערכת.",
    status: "supported" as const,
  },
  {
    title: "תאריך ושעות האירוע",
    text: "תאריך, קבלת פנים וחופה מתעדכנים בפרטי האירוע.",
    status: "supported" as const,
  },
  {
    title: "שם האולם וכתובת",
    text: "כולל אפשרות לקישור ניווט (Waze) כשהוגדר באירוע.",
    status: "supported" as const,
  },
  {
    title: "טקסט ההזמנה ושמות ההורים",
    text: "תלוי בסוג הקובץ: בהזמנה שהועלתה כתמונה — דרך קובץ מעודכן; בעיצוב אישי — דרך שירות העיצוב.",
    status: "depends" as const,
  },
  {
    title: "צבעים, פונטים ואלמנטים גרפיים",
    text: "אין עורך תבניות פעיל לבחירת צבעים ופונטים. ניתן להעלות עיצוב מוכן או להזמין עיצוב אישי.",
    status: "custom" as const,
  },
  {
    title: "אנימציות",
    text: "אנימציות אינן חלק מעורך ההזמנות הפעיל. ניתן להזמין עיצוב מונפש כשירות עיצוב אישי.",
    status: "custom" as const,
  },
  {
    title: "קישור אישי ואישורי הגעה",
    text: "במסלולים המתאימים ההזמנה מחוברת לקישור האישי ולאישור ההגעה.",
    status: "supported" as const,
  },
] as const;

export const PROCESS_STEPS = [
  {
    n: "01",
    title: "בוחרים עיצוב",
    text: "מעלים הזמנה שכבר עיצבתם, או מזמינים עיצוב אישי לפי סגנון שאהבתם.",
  },
  {
    n: "02",
    title: "מוסיפים את פרטי החתונה",
    text: "שמות, תאריך, שעות, מקום וכל המידע שתרצו לשתף עם האורחים.",
  },
  {
    n: "03",
    title: "בודקים איך ההזמנה נראית",
    text: "פותחים תצוגה מקדימה בטלפון ובמחשב לפני השליחה.",
  },
  {
    n: "04",
    title: "משתפים עם האורחים",
    text: "בהתאם למסלול השירות ולערוצי השליחה הנתמכים בחבילה.",
  },
  {
    n: "05",
    title: "ממשיכים לאישורי הגעה",
    text: "כאשר השירות משולב, האורחים ממשיכים מההזמנה לאישור ההגעה שלהם.",
  },
] as const;

export const PRINT_VS_DIGITAL = [
  {
    aspect: "חוויית קבלה",
    digital: "נפתחת בטלפון, מיידית ונגישה",
    print: "פריט מוחשי ומגע אישי",
  },
  {
    aspect: "שיתוף",
    digital: "קישור אישי בערוצים הנתמכים",
    print: "מסירה או שליחה פיזית",
  },
  {
    aspect: "עדכון פרטים",
    digital: "בקישור פעיל מהמערכת — לפי יכולות השירות",
    print: "דורש הדפסה מחדש",
  },
  {
    aspect: "חיבור לאישורי הגעה",
    digital: "אפשרי במסלולים המתאימים",
    print: "בדרך כלל נפרד מההזמנה",
  },
  {
    aspect: "שמירה כמזכרת",
    digital: "נשמרת במכשיר או בקישור",
    print: "נשמרת פיזית באלבום",
  },
  {
    aspect: "התאמה לסגנון",
    digital: "עיצוב שהועלה או עיצוב אישי",
    print: "נייר, הטבעות וגימורים מיוחדים",
  },
] as const;

export const WEDDING_STYLE_IDEAS = [
  {
    title: "חתונת גן",
    text: "גווני ירוק, שמנת, פרחים עדינים וטיפוגרפיה טבעית.",
    designId: "botanical-elegance" as InvitationDesignId,
  },
  {
    title: "חתונה קלאסית באולם",
    text: "אייבורי, זהב עדין, מסגרות אלגנטיות וטיפוגרפיה על־זמנית.",
    designId: "classic-ivory" as InvitationDesignId,
  },
  {
    title: "חתונת ערב יוקרתית",
    text: "שחור, שמפניה, אור רך ונגיעות מתכתיות.",
    designId: "midnight-luxury" as InvitationDesignId,
  },
  {
    title: "חתונה רומנטית",
    text: "פרחים עדינים, גווני פנינה וטקסטורות רכות.",
    designId: "pearl-romance" as InvitationDesignId,
  },
  {
    title: "חתונה מודרנית",
    text: "קומפוזיציה נקייה, טיפוגרפיה בולטת וצבעוניות מאופקת.",
    designId: "modern-editorial" as InvitationDesignId,
  },
  {
    title: "חתונה אינטימית",
    text: "עיצוב אישי וחם, עם דגש על שמות בני הזוג והמסר.",
    designId: "timeless-monogram" as InvitationDesignId,
  },
] as const;

export const PRE_SEND_CHECKS = [
  "שמות בני הזוג כתובים נכון",
  "התאריך והיום בשבוע תואמים",
  "שעת קבלת הפנים נכונה",
  "שעת החופה נכונה",
  "שם האולם והכתובת נכונים",
  "קישור הניווט נפתח כראוי, אם קיים",
  "שמות ההורים מופיעים נכון",
  "הטקסט קריא בטלפון",
  "ההזמנה נפתחת ללא חיתוכים",
  "אם משולבים אישורי הגעה — הקישור עובד",
] as const;

export const INVITATION_FAQS = [
  {
    q: "מהי הזמנה דיגיטלית לחתונה?",
    a: "הזמנה דיגיטלית היא הזמנה שניתן לפתוח בטלפון או במחשב. היא מציגה את פרטי החתונה בעיצוב שנבחר, ויכולה להיות משותפת באמצעות קישור. בחבילות המתאימות אפשר לשלב אותה גם עם אישורי הגעה.",
  },
  {
    q: "איך יוצרים הזמנה דיגיטלית לחתונה?",
    a: "מעלים הזמנה קיימת או משתמשים בהזמנה שבמערכת, מוסיפים את פרטי האירוע, בודקים את התוצאה ומשתפים עם האורחים בהתאם לאפשרויות השירות.",
  },
  {
    q: "האם אפשר להשתמש בהזמנה שכבר עיצבנו?",
    a: "כן. ב־Invistimo ניתן להשתמש בעיצוב הזמנה קיים ולהעלות אותו למערכת, בפורמטים JPEG, PNG או WebP.",
  },
  {
    q: "האם אפשר לבחור תבנית מוכנה?",
    a: "כרגע אין ספריית תבניות לבחירה בעורך. אפשר להעלות עיצוב מוכן, להיעזר בדוגמאות ההשראה בעמוד זה, או להזמין עיצוב אישי כתוספת בתשלום.",
  },
  {
    q: "האם יש הזמנות דיגיטליות עם אנימציה?",
    a: "עורך ההזמנות הפעיל אינו כולל בחירת אנימציות. הדגמות התנועה בעמוד הן קונספט לעיצוב אישי. ניתן לבדוק עיצוב מונפש במסגרת שירות העיצוב האישי.",
  },
  {
    q: "מה כוללת הזמנה מלאה לחתונה?",
    a: "בדרך כלל היא כוללת את שמות בני הזוג, תאריך, מיקום, שעת קבלת פנים ושעת חופה. אפשר לשלב גם משפט אישי, שמות ההורים ופרטים נוספים בהתאם לסגנון ההזמנה.",
  },
  {
    q: "האם חייבים לציין את שמות ההורים?",
    a: "לא. זו בחירה אישית של בני הזוג. אפשר לכלול את שמות ההורים והמשפחות בהתאם למסורת, להעדפה ולסגנון העיצוב.",
  },
  {
    q: "האם אפשר לשנות את הטקסט בהזמנה?",
    a: "בהזמנה שהועלתה כקובץ מעוצב, אופן השינוי תלוי בסוג הקובץ — בדרך כלל מעדכנים את הקובץ ומעלים גרסה חדשה. פרטי האירוע במערכת (תאריך, שעה, מיקום) מתעדכנים בנפרד.",
  },
  {
    q: "האם אפשר לשנות את ההזמנה אחרי ששלחנו אותה?",
    a: "כאשר ההזמנה מוצגת מתוך המערכת ומתעדכנת בקישור פעיל, ניתן לעדכן פרטים בהתאם ליכולות השירות. קובץ תמונה שנשלח ונשמר אצל אורח לא בהכרח יתעדכן אוטומטית.",
  },
  {
    q: "האם ההזמנה מתאימה למובייל?",
    a: "כן. הזמנה דיגיטלית צריכה להיות קריאה ונוחה לצפייה בטלפון. מומלץ לבדוק את התצוגה לפני השליחה, במיוחד כאשר משתמשים בעיצוב שהועלה מבחוץ.",
  },
  {
    q: "האם אפשר לשלוח הזמנה דיגיטלית ב־WhatsApp?",
    a: "כן, ניתן לשתף קישור להזמנה ב־WhatsApp בהתאם לאפשרויות השליחה והשירות שנבחר. יש להבחין בין שיתוף ידני לבין שליחה דרך חבילת הודעות.",
  },
  {
    q: "האם אפשר להוסיף קישור ל־Waze?",
    a: "אם הוגדר מיקום עם קישור ניווט בפרטי האירוע, האורחים יכולים לנווט בהתאם. מומלץ לבדוק שהקישור נפתח כראוי לפני השליחה.",
  },
  {
    q: "האם אפשר להוסיף אישורי הגעה להזמנה?",
    a: "כן. במסלולים המתאימים אפשר לשלב את ההזמנה עם קישור אישי לאישור הגעה, כך שהאורחים יכולים לצפות בהזמנה ולהשיב דרך המערכת.",
  },
  {
    q: "מה ההבדל בין Save the Date להזמנה דיגיטלית?",
    a: "Save the Date נועד להודיע על התאריך מראש. ההזמנה הדיגיטלית כוללת את פרטי האירוע המלאים, ולעיתים גם קישור להמשך תהליך אישורי ההגעה.",
  },
  {
    q: "מתי כדאי לשלוח הזמנה לחתונה?",
    a: "לחתונות רבות אפשר לשקול לשלוח הזמנה רשמית כחודש עד חודש וחצי לפני האירוע. כאשר יש אורחים מחו״ל או תאריך סמוך לחגים ולחופשות, כדאי למסור מידע מוקדם יותר.",
  },
  {
    q: "האם כדאי לשלוח הזמנה לפני אישורי ההגעה?",
    a: "לעיתים כן. אפשר לשלוח הזמנה תחילה, ולאסוף אישורי הגעה במועד מאוחר יותר כדי לקבל תשובות מעודכנות יותר.",
  },
  {
    q: "מה ההבדל בין הזמנה דיגיטלית לאתר חתונה?",
    a: "הזמנה דיגיטלית ממוקדת בהזמנת האורחים ובפרטי האירוע. אתר חתונה יכול לכלול תוכן נוסף ומבנה רחב יותר. ב־Invistimo מדובר ברכיבים נפרדים.",
  },
  {
    q: "האם אפשר לעצב הזמנה אישית?",
    a: "כן. עיצוב הזמנה בהתאמה אישית הוא תוספת במחשבון החבילות — 200 ₪ בחבילת הודעות ו־150 ₪ בחבילות שיחות — ואינו כלול אוטומטית בכל חבילה.",
  },
  {
    q: "האם הזמנה דיגיטלית מחליפה הזמנה מודפסת?",
    a: "עבור זוגות רבים היא יכולה להספיק, ואחרים מעדיפים לשלב גם הזמנות מודפסות. זו בחירה עיצובית ואישית.",
  },
  {
    q: "כמה עולה הזמנה דיגיטלית לחתונה?",
    a: "הזמנה דיגיטלית מלאה כלולה בחבילות Invistimo. מחיר החבילה נקבע במחשבון לפי מספר רשומות וסוג שירות. עיצוב אישי הוא תוספת נפרדת.",
  },
  {
    q: "האם אפשר לשלב הזמנה דיגיטלית עם סידורי הושבה?",
    a: "ההזמנה עצמה אינה מערכת הושבה, אך ניתן לשלב שירותי הזמנה, אישורי הגעה והושבה במסגרת פתרון ניהול האירוע, בהתאם לחבילה.",
  },
  {
    q: "האם אפשר לראות דוגמה לפני שקונים?",
    a: "כן. בעמוד זה יש גלריית השראה, דוגמה מלאה, והדגמות תנועה. אפשר גם לצפות בדוגמת הזמנה חיה ובאתרי חתונה לדוגמה.",
  },
] as const;

export const REAL_EXAMPLE_INVITE = {
  src: "/marketing/invites/invite-wedding-mia-alon.webp",
  alt: "דוגמת הזמנה דיגיטלית לחתונה של מיה ואלון — המחשה ממסכי Invistimo",
  width: 1024,
  height: 1536,
} as const;
