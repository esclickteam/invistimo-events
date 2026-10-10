import {
  CUSTOMER_ADDITIONAL_TERMS,
  CUSTOMER_CANCELLATION_TERMS,
  CUSTOMER_ENGAGEMENT_TERMS,
  CUSTOMER_PAYMENT_TERMS,
  type DetailSection,
} from "@/lib/salesDocumentTerms";

export const QUOTE_TERMS_VERSION = "2026-10-10-seating-delay-30";

export const QUOTE_APPROVAL_SECTION: DetailSection = {
  title: "אישור הצעת המחיר, תנאי ההתקשרות ותקנון האתר",
  items: [
    "ביצוע תשלום בגין הצעת מחיר זו מהווה אישור מצד הלקוח כי קרא ועיין בפרטי הצעת המחיר, בתנאי ההתקשרות המפורטים בה ובתקנון האתר של Invistimo, וכי הוא מסכים ומאשר אותם.",
    "ידוע ללקוח כי במסגרת הקמת המשתמש והגדרת הסיסמה במערכת, יידרש לאשר גם את קריאת תקנון האתר ואת ההסכמה לתנאיו.",
    "מובהר כי לאחר ביצוע התשלום והקמת המשתמש במערכת, ייחשב הלקוח כמי שאישר את הצעת המחיר, את תנאי ההתקשרות המפורטים בה ואת תקנון האתר, בכפוף להוראות הדין.",
  ],
};

export const INCIDENT_REPORTING_SECTION: DetailSection = {
  title: "דיווח על תקלות, בעיות וטענות",
  items: [
    "הלקוח מתחייב לפנות ל־Invistimo בהקדם האפשרי עם גילוי כל תקלה, בעיה, קושי, אי־התאמה, חוסר הבנה או טענה הנוגעים למערכת, להזמנות, לאישורי ההגעה, להודעות, לקישורים, לסידור ההושבה או לכל שירות אחר הניתן על ידי Invistimo.",
    "באחריות הלקוח למסור פרטים רלוונטיים ולאפשר ל־Invistimo לבדוק את הנושא ולטפל בו בזמן אמת, ככל שניתן.",
    "אי־דיווח במועד, או ביצוע פעולות עצמאיות מבלי לאפשר ל־Invistimo לבדוק את הנושא, עלולים למנוע אפשרות לאיתור מקור התקלה או למתן פתרון.",
    "במקרים שבהם הלקוח לא דיווח על הבעיה בהקדם האפשרי, וכתוצאה מכך נמנעה מ־Invistimo אפשרות סבירה לבדוק, לתקן או לצמצם את הנזק, Invistimo לא תישא באחריות לנזק שנגרם או הוחמר עקב אי־הדיווח, בכפוף להוראות הדין.",
    "אין בהעלאת טענה בדיעבד, כשלעצמה, כדי להוכיח שהתרחשה תקלה או שהאחריות לה מוטלת על Invistimo.",
  ],
};

export function quoteEngagementTerms(): DetailSection[] {
  return [
    ...CUSTOMER_ENGAGEMENT_TERMS,
    INCIDENT_REPORTING_SECTION,
    QUOTE_APPROVAL_SECTION,
  ];
}

const QUOTE_EVENT_DETAILS_ITEMS = [
  "באחריות הלקוח להזין את פרטי האירוע ולהוסיף את תמונת ההזמנה בעמוד עריכת פרטי האירוע.",
  "הקישור בהודעת התזכורת מבוסס על הפרטים והתמונה שהוזנו בעמוד עריכת פרטי האירוע.",
  "באחריות הלקוח לבדוק את הקישור ואת תצוגתו לפני השליחה.",
];

export function quoteAdditionalTerms(): DetailSection[] {
  return CUSTOMER_ADDITIONAL_TERMS.map((section) => {
    if (section.title !== "תנאים נוספים") return section;

    const items = [...section.items];
    const anchorIndex = items.findIndex((item) =>
      item.startsWith("באחריות הלקוח לבדוק את פרטי האירוע"),
    );
    const insertAt = anchorIndex >= 0 ? anchorIndex + 1 : items.length;
    const missing = QUOTE_EVENT_DETAILS_ITEMS.filter((item) => !items.includes(item));
    items.splice(insertAt, 0, ...missing);
    return { ...section, items };
  });
}

export const VENUE_SEATING_QUOTE_TERM_SECTIONS: DetailSection[] = [
  {
    title: "אחריות למפת ההושבה",
    items: [
      "הלקוח אחראי לוודא שמפת ההושבה, מספרי השולחנות, כמות המקומות, הרשומות והשיבוצים במערכת תואמים למצב בפועל באולם. באחריותו לתאם מראש מול האולם את הסקיצה הסופית ולמסור לצוות מידע מדויק ומעודכן. הצוות יסייע בטיפול בפערים בזמן אמת בהתאם לנסיבות, אך אינו מחליף את אחריות הלקוח להכנת התכנון המקורי.",
    ],
  },
  {
    title: "שינויים בתנאי ההושבה ובלוחות הזמנים",
    items: [
      "מחיר שירותי ההושבה נקבע בהתאם ללוחות הזמנים, שעת הגעת הצוות, שעת תחילת ההושבה, משך השירות, היקף העבודה, מספר אנשי הצוות ותנאי ביצוע השירות כפי שנמסרו ל־Invistimo וסוכמו מראש.",
      "הלקוח מתחייב להודיע ל־Invistimo בכתב, לפחות 48 שעות לפני מועד האירוע, על כל שינוי בלוחות הזמנים שנמסרו מראש, לרבות שינוי בשעת קבלת הפנים, החופה, תחילת ההושבה, פתיחת האולם, סדר האירוע, סדר התנהלות האירוע או אופן ביצוע שירות ההושבה.",
      "שינוי כאמור אינו מבטיח אפשרות להתאמת שעות עבודת הצוות, וההתאמה כפופה לזמינות וליכולת התפעולית של Invistimo.",
      "מובהר כי שינוי מהותי בתנאי ההושבה עשוי להיחשב לשינוי בהיקף השירות, גם כאשר שעות עבודת הצוות הכוללות אינן מתארכות.",
      "בין המקרים הרלוונטיים: (1) הושבה שתוכננה להתקיים במהלך קבלת הפנים, אך בפועל ניתן להתחיל בה רק לאחר החופה. (2) דחיית תחילת ההושבה בשל החלטת האולם, הלקוח, מנהל האירוע או מי מטעמם. (3) עיכוב בחופה או בלוחות הזמנים המשפיע על תחילת ההושבה. (4) צורך לבצע הושבה של מספר רב של אורחים בפרק זמן קצר משמעותית מהמתוכנן. (5) אי מוכנות האולם, עמדת ההושבה, השולחנות או הכיסאות בשעה שנקבעה. (6) שינוי מהותי בסידור השולחנות, מספריהם או הקיבולת שלהם ביחס למפה שהועברה מראש. (7) שינוי משמעותי ברגע האחרון בשיבוץ האורחים או במפת ההושבה, המחייב היערכות חריגה. (8) פיצול ההושבה למספר שלבים שלא תוכננו מראש. (9) עיכוב הנגרם בשל היעדר איש קשר מוסמך או עיכוב בקבלת החלטות הנדרשות לביצוע ההושבה. (10) שינוי מהותי בהנחיות האולם, מנהל האירוע או מי מטעם הלקוח. (11) דרישה להארכת עבודת הצוות מעבר לשעות שסוכמו. (12) דרישה לביצוע משימות נוספות שאינן כלולות בשירות שנרכש.",
      "בהיעדר קביעה מפורשת אחרת בהצעת המחיר או בהסכמה בכתב בין הצדדים, שעת תחילת שירות ההושבה באולם תהיה שעת תחילת קבלת הפנים של האירוע.",
    ],
  },
  {
    title: "שינויים ועיכובים בלוחות הזמנים ובשעת החופה",
    items: [
      "באחריות הלקוח לעדכן את Invistimo ואת צוות ההושבה בהקדם האפשרי על כל שינוי בלוחות הזמנים של האירוע, לרבות שינוי בשעת קבלת הפנים, תחילת החופה, סיומה או מועד תחילת ההושבה.",
      "על שינוי מתוכנן וידוע מראש יש למסור הודעה בכתב לפחות 48 שעות לפני האירוע. שינוי שנודע ללקוח פחות מ־48 שעות לפני האירוע מחייב הודעה מיידית ל־Invistimo עם היוודעו.",
      "במקרה שבו הלקוח לא מסר הודעה במועד, תהיה Invistimo רשאית, לפי שיקול דעתה הבלעדי ובהתאם לזמינות הצוות, לקבוע אם ניתן להיערך לשינוי ולבצע את השירות בהתאם ללוח הזמנים החדש.",
      "Invistimo לא תהיה מחויבת להיענות לשינוי שלא תואם ואושר מראש, ולא תישא באחריות לעיכובים, לקשיים או לפגיעה בביצוע השירות שנגרמו כתוצאה מאי־מסירת ההודעה במועד, ככל שניתן היה למנוע אותם באמצעות הודעה מוקדמת, ובכפוף להוראות הדין.",
      "במקרה של עיכוב צפוי או בפועל של 15 דקות ומעלה בשעת תחילת החופה או בסיומה, על הלקוח או איש הקשר המורשה מטעמו לעדכן את צוות Invistimo באופן מיידי, כדי לאפשר היערכות והתאמת עבודת הצוות בהתאם לנסיבות.",
      "כל שינוי בלוחות הזמנים כפוף לזמינות הצוות ולשיקול דעתה הבלעדי של Invistimo, ואין בו כדי לחייב את החברה להאריך את שעות השירות מעבר למוסכם או להעמיד כוח אדם נוסף ללא הסכמה מראש.",
      "מובהר כי עיכוב בחופה כשלעצמו אינו גורר חיוב אוטומטי. ככל שהעיכוב גורם גם לדחייה של 30 דקות או יותר בתחילת שירות ההושבה, יחול סעיף העיכוב בהושבה בהתאם לתנאיו.",
      "ככל שהשינוי גורם לדחייה של 30 דקות או יותר בתחילת שירות ההושבה, תהיה Invistimo רשאית לחייב בתוספת של 500 ₪ בהתאם לסעיף העיכוב בהושבה ולפי שיקול דעתה הבלעדי. אין לגבות פעמיים תוספת של 500 ₪ בגין אותו פרק עיכוב. לדוגמה, אם החופה התחילה ב־12:35 במקום ב־12:00, וההושבה שהייתה אמורה להתחיל בשעת קבלת הפנים נדחתה עד לאחר החופה, סעיף הדחייה בהושבה מאפשר חיוב אחד של 500 ₪, לפי שיקול דעת Invistimo, ולא שני חיובים נפרדים.",
    ],
  },
  {
    title: "דחייה בתחילת שירות ההושבה",
    items: [
      "כאשר צוות Invistimo התייצב במועד שנקבע לצורך מתן שירותי ההושבה, אך תחילת ההושבה נדחתה ב־30 דקות או יותר, בשל נסיבות שאינן באחריות Invistimo, תהיה Invistimo רשאית, לפי שיקול דעתה הבלעדי, לחייב את הלקוח בתוספת תשלום בסך 500 ₪.",
      "הוראה זו תחול, בין היתר, במקרה של שינוי בהנחיות האולם, דחיית תחילת ההושבה, שינוי בלוחות הזמנים או כל נסיבה אחרת שאינה באחריות Invistimo, אשר מונעת מהצוות להתחיל בעבודתו במועד.",
      "בהיעדר שעת תחילת הושבה אחרת שנקבעה במפורש בהצעת המחיר או בהסכמה בכתב בין הצדדים, שעת תחילת ההושבה המוסכמת תהיה שעת תחילת קבלת הפנים של האירוע.",
      "התוספת עשויה לחול גם אם העיכוב לא הביא להארכת משך העבודה הכולל של הצוות. אין באמור כדי לחייב את Invistimo להאריך את שעות עבודת הצוות או להבטיח את זמינותו מעבר למועד שסוכם.",
    ],
  },
  {
    title: "עבודה חריגה, עומס בלתי מתוכנן ושינויים מהותיים",
    items: [
      "כאשר שינוי בלתי מתוכנן בתנאי ההושבה מחייב את הצוות לבצע עבודה נוספת או עבודה מוגברת באופן מהותי שאינה כלולה בהיקף השירות המקורי, עשויה לחול תוספת תשלום נפרדת, בהתאם לתעריף מפורש שהוצג ואושר מראש בהצעת המחיר.",
      "בכלל זה: ארגון מחדש של מפת הושבה שאינה תואמת את האולם, שינוי רחב בשיבוץ האורחים, דחיסת ההושבה לפרק זמן קצר באופן מהותי או שינוי חריג במתכונת השירות.",
      "אין לקבוע חיוב אוטומטי או סכום נוסף בגין עבודה חריגה שאינה נמדדת בשעות, כל עוד לא הוגדר ואושר עבורה תעריף ברור מראש. אין לגבות פעמיים בגין אותה חריגה.",
    ],
  },
  {
    title: "הארכת שעות השירות",
    items: [
      "ככל שתידרש הארכת עבודת צוות ההושבה או המתנתו מעבר לשעות השירות שסוכמו, תהיה Invistimo רשאית, לפי שיקול דעתה הבלעדי ובכפוף לזמינות הצוות, לאשר את הארכת השירות בתוספת תשלום של 500 ₪ לכל שעה נוספת או חלק ממנה, עבור צוות ההושבה שנקבע בהזמנה.",
      "הארכת השירות תתאפשר אך ורק בהתאם לזמינות אנשי הצוות, ליכולת התפעולית של Invistimo ולאישור החברה.",
      "מובהר כי Invistimo אינה מתחייבת להאריך את שעות השירות מעבר למסגרת שסוכמה, גם כאשר הלקוח מבקש זאת או מסכים לשלם את התוספת.",
      "עיכוב בתחילת ההושבה אינו מאריך באופן אוטומטי את שעות השירות שנרכשו.",
      "לא ייגבה תשלום נוסף עבור שעות או פעולות שכבר כלולות בחבילה, או עבור חריגה שנגרמה באחריות Invistimo.",
      "לא ייגבה חיוב כפול בגין אותו פרק זמן מכוח סעיף הדחייה וסעיף השעות הנוספות. ככל שקיים חיוב בגין דחיית תחילת ההושבה לצד חיוב בגין שעות נוספות, יש להפריד בפירוט החיוב בין שתי העילות.",
    ],
  },
  {
    title: "מסירת אנשי קשר עד 24 שעות לפני האירוע",
    items: [
      "הלקוח מתחייב להעביר ל־Invistimo, בכתב, לא יאוחר מ־24 שעות לפני תחילת האירוע, את פרטיו של איש קשר מוסמך מטעמו שיהיה זמין לאורך כל זמן פעילות צוות ההושבה.",
      "הפרטים יכללו שם מלא, מספר טלפון נייד ותפקיד או קשר לבעלי האירוע.",
      "באחריות הלקוח לוודא שאיש הקשר מודע למינויו, מסכים לקבל את הפניות, מכיר את מפת ההושבה ואת הנחיות האירוע, ומוסמך לקבל החלטות תפעוליות ולתת מענה בזמן אמת.",
      "הלקוח רשאי למסור פרטים של יותר מאיש קשר אחד, ובמקרה כזה עליו להבהיר את תחומי הסמכות של כל אחד מהם.",
      "אנשי צוות Invistimo יתנהלו בנושאים התפעוליים של ההושבה מול אנשי הקשר שהוגדרו ונמסרו על ידי הלקוח בלבד.",
      "הצוות אינו מחויב לקבל הוראות מגורמים אחרים באולם, לרבות קרובי משפחה, אורחים או נציגים שלא הוסמכו לכך על ידי הלקוח, ואינו מחויב לפנות לבני הזוג במהלך האירוע לצורך קבלת החלטות שוטפות.",
      "הוראה זו אינה מונעת תיאום מקצועי הכרחי עם צוות האולם בנושאי בטיחות, גישה, לוגיסטיקה והפעלת השירות, אך אין בתיאום כזה כדי להעניק לאולם סמכות להתחייב בשם הלקוח.",
      "אם הלקוח לא מסר איש קשר במועד, מסר פרטים שגויים, או שאיש הקשר אינו זמין או אינו מוסמך לקבל החלטות, האחריות לעיכובים ולתוצאות הנובעות מכך תחול על הלקוח, ככל שאינן נובעות ממעשה או מחדל שבאחריות Invistimo.",
    ],
  },
  {
    title: "איש קשר המורשה לחתום על רזרבות",
    items: [
      "באחריות הלקוח לדאוג לכך שבין אנשי הקשר שמסר יהיה לפחות אדם אחד הנוכח באולם בזמן ההושבה, בעל סמכות מלאה לאשר ולחתום מול האולם על פתיחת שולחנות רזרבה, תוספת מקומות וכל התחייבות כספית הנובעת מכך.",
      "איש הקשר חייב להיות זמין לקבלת החלטות בזמן אמת.",
      "צוות Invistimo רשאי להציג את מצב ההושבה, להמליץ על פתרונות, לשקף את מספר המקומות הפנויים ולסייע בצמצום הצורך בפתיחת רזרבות.",
      "פתיחת רזרבות, אישור תוספת כספית או חתימה על התחייבויות מול האולם הם באחריות הלקוח או הגורם שהוסמך על ידו בלבד.",
      "אנשי צוות Invistimo אינם מוסמכים לחתום בשם הלקוח, להתחייב לתשלום מול האולם או לקבל החלטות כספיות המחייבות אותו.",
    ],
  },
  {
    title: "תשלום יתרת שירות ההושבה",
    items: [
      "יתרת התשלום בגין שירותי ההושבה באולם תשולם ביום האירוע, מיד עם סיום עבודת צוות Invistimo.",
      "באחריותו הבלעדית של הלקוח להיערך מראש להסדרת התשלום במועד, לרבות דאגה לאמצעי תשלום זמין או להסמכת איש קשר מטעמו שיהיה נוכח באירוע ומורשה לבצע את התשלום בפועל.",
      "היעדרות בני הזוג, עיסוקם במהלך האירוע, אי־זמינות איש הקשר או היעדר אמצעי תשלום אינם מהווים עילה לדחיית התשלום.",
      "הלקוח מתחייב להסדיר את מלוא יתרת התשלום במועד, ללא עיכובים וללא צורך בפנייה חוזרת מצד Invistimo לצורך גבייתו, בכפוף לזכויותיו על פי דין.",
      "גם כאשר התשלום בפועל מתבצע באמצעות גורם אחר שמונה על ידי הלקוח, האחריות להסדרת התשלום נותרת על הלקוח שהזמין את השירות.",
    ],
  },
];

const RETIRED_SEATING_SECTION_TITLES = new Set([
  "תשלום בגין דחייה מהותית של תחילת ההושבה",
  "חובת תשלום בסיום עבודת הצוות",
]);

const RETIRED_SEATING_ITEM_SNIPPETS = [
  "60 דקות",
  "תחילת ההושבה נדחתה ב־15 דקות",
  "דחייה של 15 דקות ומעלה בתחילת שירות ההושבה",
  "דחייה קצרה מ",
  "נמסרה והוסכמה מראש",
  "כאשר נקבע בהזמנה כי יתרת התשלום",
];

const STANDARD_TERM_TITLES = new Set([
  "תנאי התקשרות",
  "תנאי תשלום",
  "תנאי ביטול",
  "תנאים נוספים",
  QUOTE_APPROVAL_SECTION.title,
  INCIDENT_REPORTING_SECTION.title,
  ...VENUE_SEATING_QUOTE_TERM_SECTIONS.map((section) => section.title),
  ...RETIRED_SEATING_SECTION_TITLES,
]);

function asSections(value: unknown): DetailSection[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((section) => {
    if (!section || typeof section !== "object") return [];
    const record = section as { title?: unknown; items?: unknown };
    const title = typeof record.title === "string" ? record.title : "";
    const items = Array.isArray(record.items)
      ? record.items.filter((item): item is string => typeof item === "string")
      : [];
    if (!title) return [];
    return [{ title, items }];
  });
}

function isRetiredSeatingItem(item: string) {
  return RETIRED_SEATING_ITEM_SNIPPETS.some((snippet) => item.includes(snippet));
}

function withoutRetiredSeatingText(sections: DetailSection[]) {
  return sections
    .filter((section) => !RETIRED_SEATING_SECTION_TITLES.has(section.title))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !isRetiredSeatingItem(item)),
    }))
    .filter((section) => section.items.length > 0);
}

function paymentTermsForQuote(existing: unknown): DetailSection[] {
  const preserved = withoutRetiredSeatingText(
    asSections(existing).filter((section) => !STANDARD_TERM_TITLES.has(section.title)),
  );
  return [...CUSTOMER_PAYMENT_TERMS, ...preserved];
}

function syncVenueSeatingDetails(existing: unknown): DetailSection[] {
  const serviceSections = withoutRetiredSeatingText(
    asSections(existing).filter((section) => !STANDARD_TERM_TITLES.has(section.title)),
  );
  return [...serviceSections, ...VENUE_SEATING_QUOTE_TERM_SECTIONS];
}

function isVenueSeatingUpsell(record: Record<string, unknown>) {
  const key = String(record.key || "");
  const title = String(record.title || "").trim();
  return key === "venueSeating" || title === "הושבה באולם";
}

function syncUpsell(upsell: unknown) {
  if (!upsell || typeof upsell !== "object") return upsell;
  const record = upsell as Record<string, unknown>;
  if (!isVenueSeatingUpsell(record)) return upsell;

  return {
    ...record,
    customerDetails: syncVenueSeatingDetails(record.customerDetails),
  };
}

function syncSummary(summary: unknown, paymentTerms: DetailSection[]) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return summary;
  }

  const record = summary as Record<string, unknown>;
  const upsells = Array.isArray(record.upsells)
    ? record.upsells.map((upsell) => syncUpsell(upsell))
    : record.upsells;

  return {
    ...record,
    engagementTerms: quoteEngagementTerms(),
    paymentTerms: paymentTermsForQuote(record.paymentTerms ?? paymentTerms),
    cancellationTerms: CUSTOMER_CANCELLATION_TERMS,
    additionalTerms: quoteAdditionalTerms(),
    upsells,
  };
}

export function withCurrentQuoteTerms<T extends Record<string, unknown>>(document: T): T {
  if (String(document.type || "") !== "quote") return document;

  const paymentTerms = paymentTermsForQuote(document.paymentTerms);
  const upsells = Array.isArray(document.upsells)
    ? document.upsells.map((upsell) => syncUpsell(upsell))
    : document.upsells;

  return {
    ...document,
    engagementTerms: quoteEngagementTerms(),
    paymentTerms,
    cancellationTerms: CUSTOMER_CANCELLATION_TERMS,
    additionalTerms: quoteAdditionalTerms(),
    upsells,
    customerDealSummary: syncSummary(document.customerDealSummary, paymentTerms),
  };
}

const TERM_FIELDS = [
  "engagementTerms",
  "paymentTerms",
  "cancellationTerms",
  "additionalTerms",
  "upsells",
  "customerDealSummary",
] as const;

export function buildQuoteTermsUpdate(document: Record<string, unknown>) {
  if (String(document.type || "") !== "quote") return null;

  const updated = withCurrentQuoteTerms(document);
  const hasArchive =
    document.customerTermsArchive &&
    typeof document.customerTermsArchive === "object" &&
    !Array.isArray(document.customerTermsArchive);

  const set: Record<string, unknown> = {
    quoteTermsVersion: QUOTE_TERMS_VERSION,
  };

  for (const field of TERM_FIELDS) {
    if (updated[field] !== undefined) {
      set[field] = updated[field];
    }
  }

  const priorTerms = {
    quoteTermsVersion: String(document.quoteTermsVersion || ""),
    engagementTerms: document.engagementTerms ?? null,
    paymentTerms: document.paymentTerms ?? null,
    cancellationTerms: document.cancellationTerms ?? null,
    additionalTerms: document.additionalTerms ?? null,
    upsells: document.upsells ?? null,
    customerDealSummary: document.customerDealSummary ?? null,
  };

  if (!hasArchive) {
    set.customerTermsArchive = priorTerms;
  } else if (String(document.quoteTermsVersion || "") !== QUOTE_TERMS_VERSION) {
    const archive = document.customerTermsArchive as Record<string, unknown>;
    const history = Array.isArray(archive.history) ? archive.history : [];
    set.customerTermsArchive = {
      ...archive,
      history: [...history, priorTerms],
    };
  }

  return set;
}
