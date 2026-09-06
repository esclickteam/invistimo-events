export const WEDDING_CHALLENGES_PRICE_ILS = 299;
export const WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS = 99;
export const WEDDING_CHALLENGES_MAX_GUESTS = 800;
export const WEDDING_CHALLENGES_GUEST_LIMIT_MESSAGE = "החבילה כוללת עד 800 רשומות";
export const BUYME_PRIZE_VALUES_ILS = [100, 200, 300, 500] as const;
export const BUYME_PRIZE_MIN_ILS = 50;
export const BUYME_PRIZE_MAX_ILS = 2000;

export const MAX_MISSIONS_PER_GUEST = 5;
export const DEFAULT_MAX_MISSIONS_PER_GUEST = 5;
export const DEFAULT_MAX_SKIPS_PER_GUEST = 1;

export const DEFAULT_TABLE_COOLDOWN_MINUTES = 12;
export const DEFAULT_TABLE_COOLDOWN_MISSIONS = 3;
export const DEFAULT_GUEST_COOLDOWN_MINUTES = 0;

export const ACTIVE_TABLE_WINDOW_MS = 8 * 60 * 1000;
export const BOSS_MIN_COMPLETED_BEFORE = 2;

export const CATEGORY_WEIGHTS = {
  dancefloor: 35,
  table: 20,
  chaos: 20,
  cheeky: 15,
  shots: 8,
  boss: 2,
} as const;

export const CATEGORY_LABELS = {
  dancefloor: "משימת רחבה",
  shots: "משימת צ’ייסרים",
  table: "משימת שולחן",
  chaos: "משימת כאוס",
  cheeky: "קצת חוצפה",
  boss: "משימת בוס 🔥",
} as const;

export const CATEGORY_SHORT_LABELS = {
  dancefloor: "רחבה",
  shots: "צ’ייסרים",
  table: "שולחן",
  chaos: "כאוס",
  cheeky: "קצת חוצפה",
  boss: "משימת בוס 🔥",
} as const;

export const LIVE_PATH_PREFIX = "/live";
