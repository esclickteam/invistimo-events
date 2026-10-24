import type { InvitationDetails } from "@/lib/invitationStudio/types";

export function emptyDetails(): InvitationDetails {
  return {
    showBasad: true,
    basad: "בס״ד",
    brideName: "",
    groomName: "",
    opening: "",
    weekday: "",
    hebrewDate: "",
    gregorianDate: "",
    reception: "",
    ceremony: "",
    venue: "",
    address: "",
    brideParents: "",
    groomParents: "",
    brideFamily: "",
    groomFamily: "",
    brideParentsMemory: false,
    groomParentsMemory: false,
    closing: "",
    extra: "",
    guestGreeting: "",
  };
}

export const SAMPLE_DETAILS: InvitationDetails = {
  showBasad: true,
  basad: "בס״ד",
  brideName: "נועה",
  groomName: "דניאל",
  opening: "בְּשִׂמְחָה גְּדוֹלָה אנו מתכבדים להזמינכם לחתונת ילדינו",
  weekday: "יום חמישי",
  hebrewDate: "כ״ג באייר תשפ״ז",
  gregorianDate: "10 ביוני 2027",
  reception: "19:30",
  ceremony: "20:30",
  venue: "אולם הגן",
  address: "הרצליה, רחוב הנשיא 12",
  brideParents: "רחל ויוסף כהן",
  groomParents: "מיכל ואבי לוי",
  brideFamily: "כהן",
  groomFamily: "לוי",
  brideParentsMemory: false,
  groomParentsMemory: false,
  closing: "נשמח לראותכם בשמחתנו",
  extra: "",
  guestGreeting: "{name}, שמרנו לכם מקום",
};

export const EDITED_DETAILS: InvitationDetails = {
  ...SAMPLE_DETAILS,
  brideName: "מאיה",
  groomName: "איתי",
  opening: "ליבנו מלא שמחה, ונשמח שתחלקו איתנו את הערב",
  weekday: "יום ראשון",
  hebrewDate: "ב׳ בסיוון תשפ״ח",
  gregorianDate: "16 במאי 2028",
  reception: "18:30",
  ceremony: "19:30",
  venue: "גן ורדים",
  address: "תל אביב, שדרות רוטשילד 22",
  brideParents: "דנה ואורן ברק",
  groomParents: "יעל ועומר שמש",
  brideFamily: "ברק",
  groomFamily: "שמש",
  closing: "מחכים לכם באהבה",
};

const DETAIL_KEYS = Object.keys(emptyDetails()) as Array<keyof InvitationDetails>;

export function sanitizeDetails(raw: unknown, current?: InvitationDetails): InvitationDetails {
  const next = { ...(current || emptyDetails()) };
  if (!raw || typeof raw !== "object") return next;
  const source = raw as Record<string, unknown>;
  for (const key of DETAIL_KEYS) {
    if (!(key in source)) continue;
    if (key === "showBasad" || key === "brideParentsMemory" || key === "groomParentsMemory") {
      next[key] = Boolean(source[key]);
    } else {
      next[key] = String(source[key] ?? "").replace(/\u0000/g, "").slice(0, 180);
    }
  }
  return next;
}

export function parentLine(names: string, memory: boolean) {
  const clean = names.trim();
  if (!clean) return "";
  return memory ? `${clean} ז״ל` : clean;
}

export function fitCqw(text: string, base: number, comfortable: number) {
  const length = text.trim().length;
  if (!length || length <= comfortable) return base;
  return Math.max(base * 0.62, base * (comfortable / length));
}
