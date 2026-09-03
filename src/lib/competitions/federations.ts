/**
 * Seeded federation data. Stored on the competition as plain text, so a future
 * Settings tab can let each coach edit these lists without a data migration.
 *
 * Sources: IPF Technical Rulebook (eff. 2026-03-01), WRPF rulebook, IPL
 * classification standards. Verify before a season — federations move classes.
 */

export interface Federation {
  ageCategories: readonly string[];
  weightClasses: { male: readonly string[]; female: readonly string[] };
}

// IPL and WRPF share the pre-2011 "round number" classes; only the women's top end differs.
const LEGACY_MEN = [
  "52",
  "56",
  "60",
  "67.5",
  "75",
  "82.5",
  "90",
  "100",
  "110",
  "125",
  "140",
  "140+",
];
const LEGACY_WOMEN = [
  "44",
  "48",
  "52",
  "56",
  "60",
  "67.5",
  "75",
  "82.5",
  "90",
  "90+",
];

export const FEDERATIONS: Record<string, Federation> = {
  IPF: {
    ageCategories: [
      "Sub-Junior",
      "Junior",
      "Open",
      "Master 1",
      "Master 2",
      "Master 3",
      "Master 4",
    ],
    weightClasses: {
      // 53 / 43 are sub-junior and junior only.
      male: ["53", "59", "66", "74", "83", "93", "105", "120", "120+"],
      female: ["43", "47", "52", "57", "63", "69", "76", "84", "84+"],
    },
  },
  WRPF: {
    ageCategories: [
      "Teen",
      "Sub-Junior",
      "Junior",
      "Open",
      "Master 1",
      "Master 2",
      "Master 3",
      "Master 4",
      "Master 5",
    ],
    weightClasses: { male: LEGACY_MEN, female: LEGACY_WOMEN },
  },
  IPL: {
    ageCategories: [
      "Teen",
      "Junior",
      "Open",
      "Sub-Master",
      "Master 40-44",
      "Master 45-49",
      "Master 50-54",
      "Master 55-59",
      "Master 60-64",
      "Master 65-69",
      "Master 70-74",
      "Master 75-79",
      "Master 80+",
    ],
    weightClasses: { male: LEGACY_MEN, female: LEGACY_WOMEN },
  },
};

export const FEDERATION_NAMES = Object.keys(FEDERATIONS);

export const COMPETITION_TYPES = [
  "Qualifier",
  "National",
  "Regional",
  "World",
  "Special event",
] as const;

export type Sex = "male" | "female";

/**
 * Weight classes to offer for an athlete. Pending athletes have no
 * `athlete_profiles` row yet, so sex is unknown — offer both, labelled.
 */
export function weightClassGroups(
  federation: string,
  sex: Sex | null,
): { label: string; classes: readonly string[] }[] {
  const fed = FEDERATIONS[federation];
  if (!fed) return [];
  if (sex)
    return [
      {
        label: sex === "male" ? "Men" : "Women",
        classes: fed.weightClasses[sex],
      },
    ];
  return [
    { label: "Men", classes: fed.weightClasses.male },
    { label: "Women", classes: fed.weightClasses.female },
  ];
}
