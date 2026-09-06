export type MissionCategory =
  | "dancefloor"
  | "shots"
  | "table"
  | "chaos"
  | "cheeky"
  | "boss";

export type MissionDifficulty = "easy" | "medium" | "hard";

export type MissionPacingMode = "immediate" | "timed" | "admin";

export type GiveawayRevealMode =
  | "after_first"
  | "after_second"
  | "manual";

export type AssignmentStatus =
  | "assigned"
  | "revealed"
  | "completed"
  | "skipped"
  | "expired";

export type GuestLiveScreen =
  | "not_started"
  | "ended"
  | "intro"
  | "mission_revealed"
  | "completed"
  | "giveaway_revealed"
  | "no_more"
  | "max_reached"
  | "expired"
  | "winner";

export type MissionDefinition = {
  id: string;
  category: MissionCategory;
  text: string;
  difficulty: MissionDifficulty;
  requiresAlcohol: boolean;
  minPeople: number;
  maxPeople: number | null;
  tableBased: boolean;
  cooldownWeight: number;
  boss: boolean;
  minTables: number;
  hint?: string;
  active?: boolean;
};

export type EnabledCategories = Record<MissionCategory, boolean>;

export type WeddingChallengeSettings = {
  enabled: boolean;
  startAt: string | null;
  endAt: string | null;
  maxMissionsPerGuest: number;
  allowAlcoholMissions: boolean;
  pacingMode: MissionPacingMode;
  cooldownMinutes: number;
  tableCooldownMinutes: number;
  tableCooldownMissions: number;
  skipEnabled: boolean;
  maxSkipsPerGuest: number;
  enabledCategories: EnabledCategories;
  giveaway: {
    enabled: boolean;
    prizeText: string;
    prizeCost: number;
    revealMode: GiveawayRevealMode;
    bossEntries: 2 | 3;
    maxEntriesPerGuest: number | null;
    autoDrawAtEnd: boolean;
    revealedByAdmin: boolean;
    winnerGuestId: string | null;
    winnerName: string;
    drawnAt: string | null;
  };
  sms: {
    template: "full" | "short";
    sentAt: string | null;
    sentCount: number;
  };
};

export type AssignmentGuest = {
  guestId: string;
  tableId: string | null;
  isAdult: boolean;
  completedMissionIds: string[];
  skippedMissionIds: string[];
  lastMissionCategory: MissionCategory | null;
  recentCategories: MissionCategory[];
  completedCount: number;
  lastCompletedAt: string | null;
};

export type TableAssignmentSnapshot = {
  tableId: string | null;
  tableSize: number;
  activeGuestCount: number;
  eventTableCount: number;
  activeMissionIds: string[];
  recentMissionIds: string[];
  recentCategories: MissionCategory[];
};

export type AssignmentInput = {
  guest: AssignmentGuest;
  table: TableAssignmentSnapshot;
  settings: Pick<
    WeddingChallengeSettings,
    | "maxMissionsPerGuest"
    | "allowAlcoholMissions"
    | "enabledCategories"
    | "tableCooldownMinutes"
    | "tableCooldownMissions"
    | "cooldownMinutes"
  >;
  missions?: MissionDefinition[];
  now?: Date | string;
  random?: () => number;
};

export type AssignmentResult = {
  mission: MissionDefinition | null;
  reason:
    | "assigned"
    | "max_reached"
    | "none_eligible"
    | "alcohol_blocked"
    | "categories_disabled";
  excludedMissionIds: string[];
  relaxationLevel: number;
};
