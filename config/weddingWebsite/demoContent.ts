import type { WeddingSiteContent } from "@/types/weddingWebsite";
import { WW_IMAGES } from "./media";

export const WEDDING_DEMO_CONTENT: WeddingSiteContent = {
  coupleNames: "עמית & בן",
  coupleShort: "A & B",
  weddingDate: "2026-09-18",
  weddingTime: "19:30",
  venueName: "אולמי הירקון",
  venueAddress: "רחוב רוקח 12, תל אביב",
  venueLat: 32.1007,
  venueLng: 34.7754,
  heroSubtitle: "שמחים ונרגשים להזמין אתכם לחגוג איתנו את היום הגדול",
  invitationText: "שמחים להזמין אתכם לחגוג איתנו.",
  welcomeText: "ברוכים הבאים לאתר החתונה שלנו.",
  romanticQuote: "אהבה היא להביט יחד באותו כיוון.",
  hashtag: "#AmitAndBen2026",
  storyParagraphs: [
    "נפגשנו, צחקנו, ובנינו יחד בית. עכשיו מתחיל הפרק הבא — איתכם.",
  ],
  howWeMet: "נפגשנו בערב חברים — ומאז אנחנו ביחד.",
  proposalStory: "בשקיעה על הים — כריעה על ברך, והתשובה הייתה כן.",
  schedule: [
    { time: "18:30", title: "קבלת פנים", description: "כיבוד ומוזיקה" },
    { time: "19:30", title: "חופה", description: "טקס החופה" },
    { time: "20:15", title: "ריקודים", description: "רחבת ריקודים" },
    { time: "22:00", title: "עוגה", description: "חגיגה מתוקה" },
  ],
  dressCode: "חגיגי אלגנטי.",
  accommodations: [
    { name: "מלון דן תל אביב", note: "קוד: AMITBEN2026", link: "#" },
    { name: "Brown TLV", note: "5 דקות מהאולם", link: "#" },
  ],
  transportation: [
    { title: "חנייה", description: "חניון באולם — חינם לאורחים" },
    { title: "הסעות", description: "פרטים יישלחו ב-SMS" },
  ],
  faq: [
    { question: "האם ילדים מוזמנים?", answer: "כן — נשמח לדעת מראש." },
    { question: "עד מתי לאשר הגעה?", answer: "עד 1.9.2026." },
  ],
  giftsNote: "הנוכחות שלכם היא המתנה.",
  giftLinks: {
    creditUrl: "",
    payboxUrl: "",
    bitPhone: "",
    bitUrl: "",
  },
  contactPhone: "",
  contactNote: "לשאלות — פנו אלינו.",
  galleryUrls: [],
  heroImageUrl: "",
  videoUrl: "",
  rsvpText: "נשמח שתאשרו הגעה.",
  parkingText: "חניון באולם — חינם לאורחים.",
  guestbookMessages: [
    { name: "מיכל & יוני", message: "מחכים לחגוג איתכם!", date: "12.7.2026" },
  ],
  playlistNote: "יש שיר שחייב? שלחו לנו.",
  footerNote: "נתראה בחתונה!",
  wazeUrl: "https://waze.com/ul?q=%D7%90%D7%95%D7%9C%D7%9E%D7%99%20%D7%94%D7%99%D7%A8%D7%A7%D7%95%D7%9F%20%D7%AA%D7%9C%20%D7%90%D7%91%D7%99%D7%91&navigate=yes",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=%D7%90%D7%95%D7%9C%D7%9E%D7%99%20%D7%94%D7%99%D7%A8%D7%A7%D7%95%D7%9F%20%D7%AA%D7%9C%20%D7%90%D7%91%D7%99%D7%91",
};

export const DEMO_GUEST_UPLOADS = [
  {
    id: "1",
    type: "image" as const,
    url: WW_IMAGES.coupleClose,
    name: "rehearsal-dinner.jpg",
    uploadedBy: "שירה",
    createdAt: "2026-07-20",
  },
  {
    id: "2",
    type: "image" as const,
    url: WW_IMAGES.aisleWalk,
    name: "couple-friends.jpg",
    uploadedBy: "אור",
    createdAt: "2026-07-21",
  },
  {
    id: "3",
    type: "image" as const,
    url: WW_IMAGES.florals,
    name: "florals.jpg",
    uploadedBy: "יוני",
    createdAt: "2026-07-22",
  },
];

/** Empty editable defaults for a new WeddingWebsite document */
export const EMPTY_WEDDING_CONTENT_OVERRIDES: Partial<WeddingSiteContent> = {
  heroSubtitle: "",
  invitationText: "",
  storyParagraphs: [],
  howWeMet: "",
  proposalStory: "",
  schedule: [],
  dressCode: "",
  accommodations: [],
  transportation: [],
  faq: [],
  giftsNote: "",
  contactPhone: "",
  contactNote: "",
  galleryUrls: [],
  heroImageUrl: "",
  videoUrl: "",
  rsvpText: "",
  parkingText: "",
  playlistNote: "",
  footerNote: "",
};
