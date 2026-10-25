/**
 * Visual bottle catalog for the wedding alcohol planning calculator.
 * Images are locally hosted product photos (Wikimedia Commons / Unsplash).
 * Brand names are trademarks of their owners. Invistimo does not sell alcohol
 * and does not claim sales rankings or verified market prices.
 */

export type BottleCategoryId =
  | "vodka"
  | "whiskey"
  | "arak"
  | "gin"
  | "rum"
  | "tequila"
  | "wine"
  | "beer"
  | "cocktails"
  | "non_alcoholic";

export type BottleCatalogItem = {
  id: string;
  category: BottleCategoryId;
  brandHe: string;
  brandEn: string;
  styleHe: string;
  /** Typical package size in ml for planning; user can change */
  defaultMl: number;
  imageSrc: string;
  imageAlt: string;
  /** Optional subtype tag for filters */
  subtype?: string;
  /** Shown first in category gallery before "הצג עוד" */
  popular?: boolean;
};

export const CATEGORY_META: Record<
  BottleCategoryId,
  { labelHe: string; description: string; alcohol: boolean }
> = {
  vodka: {
    labelHe: "וודקה",
    description: "וודקה רגילה ופרימיום לתכנון הבר",
    alcohol: true,
  },
  whiskey: {
    labelHe: "וויסקי",
    description: "בלנדד, סינגל מאלט ובורבון",
    alcohol: true,
  },
  arak: {
    labelHe: "ערק ומשקאות אניס",
    description: "ערק, אוזו ומשקאות אניס",
    alcohol: true,
  },
  gin: {
    labelHe: "ג'ין",
    description: "ג'ין קלאסי ופרימיום",
    alcohol: true,
  },
  rum: {
    labelHe: "רום",
    description: "רום לבן וכהה",
    alcohol: true,
  },
  tequila: {
    labelHe: "טקילה",
    description: "בלנקו ורפוסדו",
    alcohol: true,
  },
  wine: {
    labelHe: "יין",
    description: "אדום, לבן, רוזה ומבעבע",
    alcohol: true,
  },
  beer: {
    labelHe: "בירה",
    description: "בקבוקים ופחיות לתכנון",
    alcohol: true,
  },
  cocktails: {
    labelHe: "קוקטיילים",
    description: "על בסיס משקאות נבחרים או ללא אלכוהול",
    alcohol: true,
  },
  non_alcoholic: {
    labelHe: "ללא אלכוהול",
    description: "מים, סודה, משקאות קלים ומוקטיילים",
    alcohol: false,
  },
};

const B = "/images/rsvp/guides/alcohol/bottles";

export const BOTTLE_CATALOG: BottleCatalogItem[] = [
  // Vodka
  {
    id: "absolut",
    category: "vodka",
    brandHe: "אבסולוט",
    brandEn: "Absolut",
    styleHe: "וודקה",
    defaultMl: 700,
    imageSrc: `${B}/absolut-vodka.png`,
    imageAlt: "בקבוק אבסולוט וודקה",
    subtype: "regular",
    popular: true,
  },
  {
    id: "grey-goose",
    category: "vodka",
    brandHe: "גריי גוס",
    brandEn: "Grey Goose",
    styleHe: "וודקה פרימיום",
    defaultMl: 700,
    imageSrc: `${B}/grey-goose.jpg`,
    imageAlt: "בקבוק גריי גוס וודקה",
    subtype: "premium",
    popular: true,
  },
  {
    id: "smirnoff",
    category: "vodka",
    brandHe: "סמירנוף",
    brandEn: "Smirnoff",
    styleHe: "וודקה",
    defaultMl: 700,
    imageSrc: `${B}/smirnoff-vodka.jpg`,
    imageAlt: "בקבוק סמירנוף וודקה",
    subtype: "regular",
    popular: true,
  },
  {
    id: "finlandia",
    category: "vodka",
    brandHe: "פינלנדיה",
    brandEn: "Finlandia",
    styleHe: "וודקה",
    defaultMl: 700,
    imageSrc: `${B}/finlandia-suomi.jpg`,
    imageAlt: "בקבוק פינלנדיה וודקה",
    subtype: "regular",
    popular: true,
  },
  {
    id: "belvedere",
    category: "vodka",
    brandHe: "בלבדר",
    brandEn: "Belvedere",
    styleHe: "וודקה פרימיום",
    defaultMl: 700,
    imageSrc: `${B}/belvedere-infusions.jpg`,
    imageAlt: "בקבוק בלבדר וודקה",
    subtype: "premium",
  },

  // Whiskey
  {
    id: "johnnie-walker-black",
    category: "whiskey",
    brandHe: "ג'וני ווקר בלאק",
    brandEn: "Johnnie Walker Black",
    styleHe: "בלנדד סקוטש",
    defaultMl: 700,
    imageSrc: `${B}/johnnie-walker-black.jpg`,
    imageAlt: "בקבוק ג'וני ווקר בלאק לייבל",
    subtype: "blended",
    popular: true,
  },
  {
    id: "chivas-12",
    category: "whiskey",
    brandHe: "צ'יוואס 12",
    brandEn: "Chivas Regal 12",
    styleHe: "בלנדד סקוטש",
    defaultMl: 700,
    imageSrc: `${B}/chivas-scotch.jpg`,
    imageAlt: "בקבוק צ'יוואס ריגל",
    subtype: "blended",
    popular: true,
  },
  {
    id: "jameson",
    category: "whiskey",
    brandHe: "ג'יימסון",
    brandEn: "Jameson",
    styleHe: "וויסקי אירי",
    defaultMl: 700,
    imageSrc: `${B}/jameson.jpg`,
    imageAlt: "בקבוק ג'יימסון",
    subtype: "blended",
    popular: true,
  },
  {
    id: "jack-daniels",
    category: "whiskey",
    brandHe: "ג'ק דניאלס",
    brandEn: "Jack Daniel's",
    styleHe: "טנסי / בורבון-סטייל",
    defaultMl: 700,
    imageSrc: `${B}/jack-daniels.jpg`,
    imageAlt: "בקבוק ג'ק דניאלס",
    subtype: "bourbon",
    popular: true,
  },
  {
    id: "macallan",
    category: "whiskey",
    brandHe: "מקאלן",
    brandEn: "Macallan",
    styleHe: "סינגל מאלט",
    defaultMl: 700,
    imageSrc: `${B}/macallan.jpg`,
    imageAlt: "בקבוקי מקאלן סינגל מאלט",
    subtype: "single_malt",
  },

  // Arak / anise
  {
    id: "arak-classic",
    category: "arak",
    brandHe: "ערק קלאסי",
    brandEn: "Arak",
    styleHe: "ערק",
    defaultMl: 700,
    imageSrc: `${B}/arak.jpg`,
    imageAlt: "בקבוק ערק",
    subtype: "arak",
    popular: true,
  },
  {
    id: "arak-rayan",
    category: "arak",
    brandHe: "ערק ריאן",
    brandEn: "Arak Rayan",
    styleHe: "ערק",
    defaultMl: 700,
    imageSrc: `${B}/arak-rayan.jpg`,
    imageAlt: "בקבוק ערק ריאן",
    subtype: "arak",
  },
  {
    id: "ouzo",
    category: "arak",
    brandHe: "אוזו",
    brandEn: "Ouzo",
    styleHe: "משקה אניס",
    defaultMl: 700,
    imageSrc: `${B}/ouzo.jpg`,
    imageAlt: "בקבוק אוזו",
    subtype: "ouzo",
    popular: true,
  },

  // Gin
  {
    id: "bombay",
    category: "gin",
    brandHe: "בומביי ספייר",
    brandEn: "Bombay Sapphire",
    styleHe: "ג'ין",
    defaultMl: 700,
    imageSrc: `${B}/bombay-sapphire.jpg`,
    imageAlt: "בקבוק בומביי ספייר",
    subtype: "regular",
    popular: true,
  },
  {
    id: "tanqueray",
    category: "gin",
    brandHe: "טנקיריי",
    brandEn: "Tanqueray",
    styleHe: "ג'ין",
    defaultMl: 700,
    imageSrc: `${B}/tanqueray.png`,
    imageAlt: "בקבוק טנקיריי ג'ין",
    subtype: "regular",
    popular: true,
  },
  {
    id: "hendricks",
    category: "gin",
    brandHe: "הנדריקס",
    brandEn: "Hendrick's",
    styleHe: "ג'ין פרימיום",
    defaultMl: 700,
    imageSrc: `${B}/hendricks.png`,
    imageAlt: "בקבוק הנדריקס ג'ין",
    subtype: "premium",
    popular: true,
  },
  {
    id: "gordons",
    category: "gin",
    brandHe: "גורדון",
    brandEn: "Gordon's",
    styleHe: "ג'ין",
    defaultMl: 700,
    imageSrc: `${B}/gordons-gin.jpg`,
    imageAlt: "בקבוק גורדון ג'ין",
    subtype: "regular",
  },

  // Rum
  {
    id: "bacardi",
    category: "rum",
    brandHe: "בקרדי",
    brandEn: "Bacardi",
    styleHe: "רום לבן",
    defaultMl: 700,
    imageSrc: `${B}/bacardi.jpg`,
    imageAlt: "בקבוק בקרדי רום",
    subtype: "white",
    popular: true,
  },
  {
    id: "havana-club",
    category: "rum",
    brandHe: "הוואנה קלאב",
    brandEn: "Havana Club",
    styleHe: "רום כהה",
    defaultMl: 700,
    imageSrc: `${B}/havana-especial.jpg`,
    imageAlt: "בקבוק הוואנה קלאב",
    subtype: "dark",
    popular: true,
  },
  {
    id: "captain-morgan",
    category: "rum",
    brandHe: "קפטן מורגן",
    brandEn: "Captain Morgan",
    styleHe: "רום מתובל",
    defaultMl: 700,
    imageSrc: `${B}/captain-morgan.jpg`,
    imageAlt: "בקבוק קפטן מורגן",
    subtype: "dark",
  },

  // Tequila
  {
    id: "jose-cuervo",
    category: "tequila",
    brandHe: "חוסה קוארבו",
    brandEn: "José Cuervo",
    styleHe: "טקילה בלנקו",
    defaultMl: 700,
    imageSrc: `${B}/jose-cuervo.jpg`,
    imageAlt: "בקבוק חוסה קוארבו",
    subtype: "blanco",
    popular: true,
  },
  {
    id: "patron",
    category: "tequila",
    brandHe: "פאטרון",
    brandEn: "Patrón",
    styleHe: "טקילה פרימיום",
    defaultMl: 700,
    imageSrc: `${B}/patron.jpg`,
    imageAlt: "בקבוק פאטרון טקילה",
    subtype: "blanco",
    popular: true,
  },
  {
    id: "olmeca",
    category: "tequila",
    brandHe: "אולמקה",
    brandEn: "Olmeca",
    styleHe: "טקילה",
    defaultMl: 700,
    imageSrc: `${B}/olmeca.jpg`,
    imageAlt: "בקבוק אולמקה טקילה",
    subtype: "reposado",
  },

  // Wine — non-branded or clearly labeled as style examples
  {
    id: "red-wine",
    category: "wine",
    brandHe: "יין אדום",
    brandEn: "Red wine",
    styleHe: "יין אדום",
    defaultMl: 750,
    imageSrc: `${B}/red-wine.jpg`,
    imageAlt: "בקבוק יין אדום לדוגמה",
    subtype: "red",
    popular: true,
  },
  {
    id: "white-wine",
    category: "wine",
    brandHe: "יין לבן",
    brandEn: "White wine",
    styleHe: "יין לבן",
    defaultMl: 750,
    imageSrc: `${B}/white-wine-generic.jpg`,
    imageAlt: "בקבוק יין לבן לדוגמה",
    subtype: "white",
    popular: true,
  },
  {
    id: "rose-wine",
    category: "wine",
    brandHe: "רוזה",
    brandEn: "Rosé",
    styleHe: "יין רוזה",
    defaultMl: 750,
    imageSrc: `${B}/rose-wine-generic.jpg`,
    imageAlt: "יין רוזה לדוגמה",
    subtype: "rose",
  },
  {
    id: "prosecco",
    category: "wine",
    brandHe: "פרוסקו / מבעבע",
    brandEn: "Prosecco",
    styleHe: "יין מבעבע",
    defaultMl: 750,
    imageSrc: `${B}/prosecco.jpg`,
    imageAlt: "בקבוק פרוסקו",
    subtype: "sparkling",
    popular: true,
  },
  {
    id: "champagne-style",
    category: "wine",
    brandHe: "שמפניה / מבעבע",
    brandEn: "Sparkling",
    styleHe: "יין מבעבע",
    defaultMl: 750,
    imageSrc: `${B}/champagne-flute.jpg`,
    imageAlt: "שמפניה וכוסות לדוגמה",
    subtype: "sparkling",
  },

  // Beer
  {
    id: "heineken",
    category: "beer",
    brandHe: "הייניקן",
    brandEn: "Heineken",
    styleHe: "בירה בבקבוק",
    defaultMl: 330,
    imageSrc: `${B}/heineken.jpg`,
    imageAlt: "בקבוק הייניקן",
    subtype: "bottle",
    popular: true,
  },
  {
    id: "corona",
    category: "beer",
    brandHe: "קורונה",
    brandEn: "Corona",
    styleHe: "בירה בבקבוק",
    defaultMl: 330,
    imageSrc: `${B}/corona.jpg`,
    imageAlt: "בקבוק קורונה",
    subtype: "bottle",
    popular: true,
  },
  {
    id: "carlsberg",
    category: "beer",
    brandHe: "קרלסברג",
    brandEn: "Carlsberg",
    styleHe: "בירה בבקבוק",
    defaultMl: 330,
    imageSrc: `${B}/carlsberg.jpg`,
    imageAlt: "בקבוק קרלסברג",
    subtype: "bottle",
  },
  {
    id: "tuborg",
    category: "beer",
    brandHe: "טובורג",
    brandEn: "Tuborg",
    styleHe: "בירה בבקבוק",
    defaultMl: 330,
    imageSrc: `${B}/tuborg.jpg`,
    imageAlt: "בקבוק טובורג",
    subtype: "bottle",
    popular: true,
  },
  {
    id: "goldstar",
    category: "beer",
    brandHe: "גולדסטאר / מכבי",
    brandEn: "Goldstar / Maccabee",
    styleHe: "בירה ישראלית",
    defaultMl: 330,
    imageSrc: `${B}/goldstar-maccabee.jpg`,
    imageAlt: "בירה גולדסטאר ומכבי",
    subtype: "bottle",
    popular: true,
  },
  {
    id: "guinness",
    category: "beer",
    brandHe: "גינס",
    brandEn: "Guinness",
    styleHe: "סטאוט",
    defaultMl: 440,
    imageSrc: `${B}/guinness.jpg`,
    imageAlt: "גינס",
    subtype: "can",
  },
];

export const PACKAGE_SIZE_OPTIONS = [330, 375, 440, 500, 700, 750, 1000, 1500] as const;

export function bottlesByCategory(category: BottleCategoryId) {
  return BOTTLE_CATALOG.filter((b) => b.category === category);
}

export function findBottle(id: string) {
  return BOTTLE_CATALOG.find((b) => b.id === id);
}
