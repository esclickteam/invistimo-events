import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_ASSUMPTIONS,
  allocateAlcoholicDemand,
  computeCostComparison,
  computeQuantities,
  normalizeGuests,
  vibeServingDefaults,
  type EventInputs,
  type SelectedDrink,
} from "../../app/(marketing)/info/guides/wedding-alcohol-calculator/calcLogic";

function drink(partial: Partial<SelectedDrink> & Pick<SelectedDrink, "id" | "category" | "label">): SelectedDrink {
  return {
    catalogId: null,
    packageMl: 700,
    unitPrice: null,
    venueIncludedUnits: 0,
    manualUnits: null,
    manualPurchaseUnits: null,
    isNonAlcoholic: partial.category === "non_alcoholic",
    ...partial,
  };
}

function baseInputs(over: Partial<EventInputs> = {}): EventInputs {
  return {
    eventType: "wedding",
    expectedGuests: 200,
    legalAgeGuests: 160,
    expectedDrinkers: 100,
    youngLegalAgeGuests: 30,
    duration: "5",
    vibe: "mixed",
    season: "unspecified",
    venueProvidesAlcohol: "unsure",
    bar: {
      welcomeBar: true,
      danceFloorBar: false,
      wineBeerWithMeal: true,
      venuePackageIncludesSome: false,
      venueProvidesSoftDrinks: false,
      cocktailStation: false,
      wineOnTables: false,
    },
    assumptions: { ...DEFAULT_ASSUMPTIONS },
    drinks: [],
    ...over,
  };
}

test("normalizeGuests clamps drinkers to legal-age and legal-age to expected", () => {
  const n = normalizeGuests({
    expectedGuests: 100,
    legalAgeGuests: 150,
    expectedDrinkers: 140,
    youngLegalAgeGuests: 200,
  });
  assert.equal(n.expectedGuests, 100);
  assert.equal(n.legalAgeGuests, 100);
  assert.equal(n.expectedDrinkers, 100);
  assert.equal(n.youngLegalAgeGuests, 100);
});

test("allows zero drinkers and never invents alcohol for minors", () => {
  const r = computeQuantities(
    baseInputs({
      expectedGuests: 120,
      legalAgeGuests: 40,
      expectedDrinkers: 0,
      drinks: [drink({ id: "v1", category: "vodka", label: "וודקה" })],
    })
  );
  assert.equal(r.drinkers, 0);
  assert.equal(r.rows[0].plannedUnitsMid, 0);
  assert.ok(r.warnings.some((w) => w.includes("0") || w.includes("לשתות")));
});

test("does not auto-inflate servings solely because duration is longer", () => {
  const drinks = [drink({ id: "v1", category: "vodka", label: "וודקה" })];
  const shortEv = computeQuantities(baseInputs({ duration: "upto3", drinks }));
  const longEv = computeQuantities(baseInputs({ duration: "6", drinks }));
  assert.equal(shortEv.servingsLow, longEv.servingsLow);
  assert.equal(shortEv.servingsHigh, longEv.servingsHigh);
  assert.ok(shortEv.assumptions.some((a) => a.includes("משך האירוע")));
});

test("allocates demand across categories without treating every guest as drinking every type", () => {
  const drinks = [
    drink({ id: "v1", category: "vodka", label: "וודקה א" }),
    drink({ id: "v2", category: "vodka", label: "וודקה ב" }),
    drink({ id: "w1", category: "wine", label: "יין" }),
  ];
  const map = allocateAlcoholicDemand(100, drinks, 0.15);
  const vodkaTotal = (map.get("v1") || 0) + (map.get("v2") || 0);
  const wine = map.get("w1") || 0;
  // Two categories → ~50 each; two vodkas share the vodka category
  assert.ok(Math.abs(vodkaTotal - 50) < 0.01);
  assert.ok(Math.abs(wine - 50) < 0.01);
  assert.ok(Math.abs((map.get("v1") || 0) - 25) < 0.01);
});

test("cocktail share is taken first then remainder split — no full double count", () => {
  const drinks = [
    drink({ id: "c1", category: "cocktails", label: "קוקטיילים" }),
    drink({ id: "v1", category: "vodka", label: "וודקה" }),
  ];
  const map = allocateAlcoholicDemand(100, drinks, 0.2);
  assert.ok(Math.abs((map.get("c1") || 0) - 20) < 0.01);
  assert.ok(Math.abs((map.get("v1") || 0) - 80) < 0.01);
});

test("venue included units reduce purchase without wiping planned range", () => {
  const r = computeQuantities(
    baseInputs({
      expectedDrinkers: 80,
      drinks: [
        drink({
          id: "v1",
          category: "vodka",
          label: "וודקה",
          packageMl: 700,
          venueIncludedUnits: 5,
          unitPrice: 100,
        }),
      ],
    })
  );
  const row = r.rows[0];
  assert.ok(row.plannedUnitsMid > 0);
  assert.equal(row.toPurchaseMid, Math.max(0, row.plannedUnitsMid - 5));
  assert.equal(row.costMid, row.toPurchaseMid * 100);
});

test("manual override freezes quantity", () => {
  const r = computeQuantities(
    baseInputs({
      drinks: [
        drink({
          id: "v1",
          category: "vodka",
          label: "וודקה",
          manualUnits: 12,
        }),
      ],
    })
  );
  assert.equal(r.rows[0].plannedUnitsLow, 12);
  assert.equal(r.rows[0].plannedUnitsHigh, 12);
  assert.equal(r.rows[0].isManual, true);
});

test("manual purchase units override toPurchase independently of planned range", () => {
  const r = computeQuantities(
    baseInputs({
      expectedDrinkers: 80,
      drinks: [
        drink({
          id: "v1",
          category: "vodka",
          label: "וודקה",
          venueIncludedUnits: 2,
          manualPurchaseUnits: 7,
          unitPrice: 90,
        }),
      ],
    })
  );
  assert.equal(r.rows[0].toPurchaseMid, 7);
  assert.equal(r.rows[0].costMid, 630);
  assert.ok(r.rows[0].plannedUnitsMid >= 0);
});

test("non-alcoholic water planning uses guest count; venue soft drinks zeros purchase", () => {
  const withVenue = computeQuantities(
    baseInputs({
      expectedGuests: 100,
      bar: {
        welcomeBar: true,
        danceFloorBar: false,
        wineBeerWithMeal: false,
        venuePackageIncludesSome: false,
        venueProvidesSoftDrinks: true,
        cocktailStation: false,
        wineOnTables: false,
      },
      drinks: [drink({ id: "water", category: "non_alcoholic", label: "מים מינרליים", packageMl: 500 })],
    })
  );
  assert.equal(withVenue.rows[0].toPurchaseMid, 0);

  const withoutVenue = computeQuantities(
    baseInputs({
      expectedGuests: 100,
      drinks: [drink({ id: "water", category: "non_alcoholic", label: "מים מינרליים", packageMl: 500 })],
    })
  );
  assert.ok(withoutVenue.rows[0].plannedUnitsMid > 0);
});

test("cost comparison does not declare winner when a side is empty", () => {
  const c = computeCostComparison(
    {
      bottleCost: 0,
      corkageMode: "none",
      corkagePerBottle: 0,
      corkagePerGuest: 0,
      corkageFlat: 0,
      corkageGuestCount: 0,
      transport: 0,
      coolingStorage: 0,
      ice: 0,
      bartenders: 0,
      softMixers: 0,
      extraEquipment: 0,
      expectedSealedReturn: 0,
    },
    {
      packageTotal: 8000,
      perGuestPrice: 0,
      perGuestCount: 0,
      brandUpgrades: 0,
      cocktailStationExtra: 0,
      extraBartenders: 0,
      notIncludedServices: 0,
      taxesExtras: 0,
    }
  );
  assert.equal(c.canDeclareWinner, false);
  assert.equal(c.cheaperSide, "unknown");
  assert.ok(c.caveats.some((x) => x.includes("חסרים נתונים")));
});

test("corkage per guest and sealed-return caveat", () => {
  const c = computeCostComparison(
    {
      bottleCost: 5000,
      corkageMode: "per_guest",
      corkagePerBottle: 0,
      corkagePerGuest: 20,
      corkageFlat: 0,
      corkageGuestCount: 100,
      transport: 200,
      coolingStorage: 0,
      ice: 100,
      bartenders: 1500,
      softMixers: 0,
      extraEquipment: 0,
      expectedSealedReturn: 400,
    },
    {
      packageTotal: 9000,
      perGuestPrice: 0,
      perGuestCount: 0,
      brandUpgrades: 500,
      cocktailStationExtra: 0,
      extraBartenders: 0,
      notIncludedServices: 0,
      taxesExtras: 0,
    }
  );
  assert.equal(c.selfTotalBeforeReturn, 5000 + 2000 + 200 + 100 + 1500);
  assert.equal(c.selfTotalAfterExpectedReturn, c.selfTotalBeforeReturn - 400);
  assert.equal(c.venueTotal, 9500);
  assert.equal(c.canDeclareWinner, true);
  assert.ok(c.caveats.some((x) => x.includes("החזר") || x.includes("סגורים")));
});

test("vibe defaults differ but remain editable planning ranges", () => {
  const calm = vibeServingDefaults("calm_family");
  const party = vibeServingDefaults("party");
  assert.ok(calm.servingsPerDrinkerHigh < party.servingsPerDrinkerHigh);
});

test("young legal-age guests do not change alcohol servings math", () => {
  const drinks = [drink({ id: "v1", category: "vodka", label: "וודקה" })];
  const a = computeQuantities(baseInputs({ youngLegalAgeGuests: 0, drinks }));
  const b = computeQuantities(baseInputs({ youngLegalAgeGuests: 80, drinks }));
  assert.equal(a.servingsLow, b.servingsLow);
  assert.equal(a.rows[0].plannedUnitsMid, b.rows[0].plannedUnitsMid);
  assert.ok(b.assumptions.some((x) => x.includes("הרכב קהל")));
});
