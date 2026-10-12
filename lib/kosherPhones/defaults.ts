/**
 * Initial kosher mobile prefixes. Inserted once into KosherPhonePrefix.
 * After that, the database is the source of truth — this list is not reapplied.
 */
export const DEFAULT_KOSHER_PREFIXES: Array<{
  prefix: string;
  carrier: string;
}> = [
  { prefix: "05271", carrier: "סלקום" },
  { prefix: "05276", carrier: "סלקום" },
  { prefix: "05041", carrier: "פלאפון" },
  { prefix: "05832", carrier: "גולן טלקום" },
  { prefix: "05484", carrier: "פרטנר" },
  { prefix: "05485", carrier: "פרטנר" },
  { prefix: "05331", carrier: "הוט מובייל" },
  { prefix: "05341", carrier: "הוט מובייל" },
  { prefix: "05351", carrier: "הוט מובייל" },
  { prefix: "05532", carrier: "פרי טלקום" },
  { prefix: "05552", carrier: "אנטל" },
  { prefix: "05567", carrier: "רמי לוי" },
  { prefix: "055400", carrier: "רמי לוי" },
  { prefix: "055401", carrier: "רמי לוי" },
  { prefix: "055402", carrier: "רמי לוי" },
  { prefix: "055403", carrier: "יוסי תקשורת – מילתא" },
];
