import type { WeddingDemoContent } from "@/types/weddingWebsite";

export const WEDDING_DEMO_CONTENT: WeddingDemoContent = {
  coupleNames: "עמית & בן",
  coupleShort: "A & B",
  weddingDate: "2026-09-18",
  weddingTime: "19:30",
  venueName: "אולמי הירקון",
  venueAddress: "רחוב רוקח 12, תל אביב",
  heroSubtitle: "שמחים ונרגשים להזמינ אתכם לחגוג איתנו את היום הגדול",
  invitationText:
    "באהבה רבה, אנחנו מזמינים אתכם לחגוג איתנו את יום נישואינו. נשמח לראות אתכם בין אורחינו היקרים, לחלוק איתנו רגעים של שמחה, ריקודים ואהבה.",
  storyParagraphs: [
    "הכול התחיל במפגש קטן שלא תכננו — צחוק אחד, מבט אחד, והרגשה שמישהו מבין אותך בלי מילים.",
    "מאז, כל יום איתכם הפך לזיכרון: טיולים, בישולים, שיחות עד מאוחר, וחלומות שנבנו יחד.",
    "היום אנחנו סוגרים פרק אחד ופותחים פרק חדש — ואתם חלק מהסיפור שלנו.",
  ],
  howWeMet:
    "נפגשנו בערב של חברים משותפים. בן הגיע עם גיטרה, עמית עם חיוך שקט. שיחה אחת הפכה ללילה שלם, ומאז לא הפסקנו לדבר.",
  proposalStory:
    "בשקיעה על הים, בין גלים ונרות, בן ברך על ברך והשאלה הייתה אחת: 'תתנשאי לי?' התשובה הייתה ברורה — כן, אלף פעמים כן.",
  schedule: [
    { time: "18:30", title: "קבלת פנים", description: "כיבוד קל, מוזיקה וחיבוקים" },
    { time: "19:30", title: "חופה", description: "טקס החופה באווירה מרגשת" },
    { time: "20:15", title: "ריקודים", description: "רחבת ריקודים פתוחה לכולם" },
    { time: "22:00", title: "עוגה", description: "חגיגה מתוקה עם הזוג" },
    { time: "23:30", title: "סיום", description: "להתראות עד הבא — תודה שבאתם" },
  ],
  dressCode: "חגיגי אלגנטי — גוונים חמים, זהב, שמפניה ושחור עדין. נשמח שתבואו מוקפדים ומרגשים.",
  accommodations: [
    { name: "מלון דן תל אביב", note: "10% הנחה לקוד: AMITBEN2026", link: "#" },
    { name: "Brown TLV", note: "5 דקות מהאולם — חדרים מוגבלים", link: "#" },
    { name: "Airbnb באזור", note: "מומלץ להזמין מראש", link: "#" },
  ],
  transportation: [
    { title: "חנייה", description: "חניון תת-קרקעי באולם — חינם לאורחים" },
    { title: "הסעות", description: "קווי הסעה ממרכז ומצפון — פרטים יישלחו ב-SMS" },
    { title: "Waze", description: "חפשו 'אולמי הירקון תל אביב'" },
  ],
  faq: [
    { question: "האם ילדים מוזמנים?", answer: "מוזמנים! נשמח לדעת מראש כדי להכין מנות ילדים." },
    { question: "עד מתי לאשר הגעה?", answer: "עד 1.9.2026 — נשמח לדעת מראש." },
    { question: "מתנות?", answer: "הנוכחות שלכם היא המתנה הגדולה — ואם בכל זאת, קישור ביט נמצא למטה." },
    { question: "צילום?", answer: "מותר ואף מעודד! העלו תמונות וסרטונים באזור 'זיכרונות מהאירוע'." },
  ],
  giftsNote:
    "הנוכחות שלכם היא המתנה הכי משמעותית. לחובבי מתנה דיגיטלית — אפשר דרך הקישור למטה.",
  guestbookMessages: [
    { name: "מיכל & יוני", message: "מחכים לחגוג איתכם! אתם זוג מדהים.", date: "12.7.2026" },
    { name: "דנה", message: "כל כך שמחה בשבילכם. יהיה אירוע מושלם!", date: "15.7.2026" },
    { name: "משפחת לוי", message: "בהצלחה! אוהבים אתכם.", date: "18.7.2026" },
  ],
  playlistNote: "יש לכם שיר שחייב להישמע? שלחו לנו הצעה — נשלב ברשימת השמעה!",
  footerNote: "תודה שאתם חלק מהסיפור שלנו. נתראה בחתונה!",
  guestMessageTitle: "השאירו לנו כמה מילים ❤️",
  guestMessageDescription: "נשמח לקרוא ברכה, איחול או הודעה מכם.",
  rsvpSuccessMessage: "✓ תודה! תשובתך התקבלה",
  rsvpUpdateLabel: "רוצים לעדכן?",
  rsvpYesLabel: "מגיע/ה",
  rsvpNoLabel: "לא מגיע/ה",
  rsvpSubmitLabel: "שליחת אישור הגעה",
  rsvpCountLabel: "כמה מגיעים?",
  rsvpNotesLabel: "בקשות מיוחדות:",
  sections: {
    hero: true,
    countdown: true,
    invitation: true,
    "our-story": true,
    gallery: true,
    "event-details": true,
    schedule: true,
    location: true,
    "dress-code": true,
    transportation: true,
    faq: true,
    rsvp: true,
    gifts: true,
    guestbook: true,
    "guest-message": true,
    footer: true,
  },
};

export const DEMO_GUEST_UPLOADS = [
  {
    id: "1",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
    name: "rehearsal-dinner.jpg",
    uploadedBy: "שירה",
    createdAt: "2026-07-20",
  },
  {
    id: "2",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    name: "couple-friends.jpg",
    uploadedBy: "אור",
    createdAt: "2026-07-21",
  },
  {
    id: "3",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80",
    name: "dance-preview.jpg",
    uploadedBy: "יוני",
    createdAt: "2026-07-22",
  },
];
