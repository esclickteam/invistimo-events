const BRAND = "Invistimo";

export function coupleNamesFromTitle(title?: string | null) {
  const clean = String(title || "").trim();
  if (!clean || clean === "הזמנה חדשה" || clean === "אירוע חדש" || clean === "האירוע שלך") {
    return "הזוג";
  }
  return clean;
}

export function buildWeddingChallengesSms(params: {
  coupleNames: string;
  personalLink: string;
  template?: "full" | "short";
}) {
  const names = coupleNamesFromTitle(params.coupleNames);
  const link = String(params.personalLink || "").trim();

  if (params.template === "short") {
    return [
      `חתונת ${names} 💍`,
      "הכרטיס האישי שלכם מחכה לכם 🎉",
      "לחצו וגרדו:",
      link,
      BRAND,
    ].join("\n");
  }

  return [
    `ברוכים הבאים לחתונה של ${names} 💍`,
    "מחכה לכם חוויה מיוחדת שתרים את הרחבה 🎉",
    "לחצו לפתיחת הכרטיס האישי שלכם:",
    link,
    BRAND,
  ].join("\n");
}

export function smsMentionsGiveaway(text: string) {
  return /הגרל|פרס|giveaway/i.test(text);
}
