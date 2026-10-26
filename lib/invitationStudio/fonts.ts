import type { StudioFont } from "@/lib/invitationStudio/types";

/**
 * Hebrew faces under the SIL Open Font License.
 * Commercial invitation use is allowed. No paid or scraped fonts.
 */
export const STUDIO_FONTS: Array<{
  family: StudioFont;
  note: string;
}> = [
  { family: "Frank Ruhl Libre", note: "סריפי, תומך ניקוד" },
  { family: "David Libre", note: "סריפי קלאסי, תומך ניקוד" },
  { family: "Miriam Libre", note: "סריפי רך, תומך ניקוד" },
  { family: "Alef", note: "סנס עברי, תומך ניקוד" },
  { family: "Assistant", note: "סנס מודרני" },
  { family: "Heebo", note: "הגופן של Invistimo" },
  { family: "Rubik", note: "סנס גיאומטרי" },
  { family: "Secular One", note: "כותרת עבה" },
];

export const STUDIO_FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Alef:wght@400;700&family=Assistant:wght@300;400;600;700&family=Bellefair&family=David+Libre:wght@400;500;700&family=Frank+Ruhl+Libre:wght@300;400;500;700&family=Heebo:wght@300;400;500;700;800&family=Miriam+Libre:wght@400;700&family=Rubik:wght@400;500;700&family=Secular+One&display=swap";

export function isApprovedStudioFont(family: string): family is StudioFont {
  return STUDIO_FONTS.some((font) => font.family === family);
}
