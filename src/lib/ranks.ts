export type GrandAlliance = "Order" | "Chaos" | "Death" | "Destruction";

export type Rank = {
  title: string;
  tierName: string;
  color: string;
  glow: boolean;
};

export const ALLIANCES: GrandAlliance[] = [
  "Order",
  "Chaos",
  "Death",
  "Destruction",
];

type Tier = {
  min: number;
  tierName: string;
  color: string;
  glow: boolean;
  titles: Record<GrandAlliance, string>;
};

// Highest tier whose `min` the level reaches wins. Colors are intentional
// hexes from the rank spec, not palette tokens.
const TIERS: Tier[] = [
  {
    min: 0,
    tierName: "Untested",
    color: "#9b9183",
    glow: false,
    titles: {
      Order: "Untested",
      Chaos: "Untested",
      Death: "Untested",
      Destruction: "Untested",
    },
  },
  {
    min: 1,
    tierName: "Recruit",
    color: "#8B6914",
    glow: false,
    titles: {
      Order: "Freeguild Soldier",
      Chaos: "Marauder",
      Death: "Grave Servant",
      Destruction: "Mob Fighter",
    },
  },
  {
    min: 3,
    tierName: "Warrior",
    color: "#B87333",
    glow: false,
    titles: {
      Order: "Stormcast Initiate",
      Chaos: "Bloodreaver",
      Death: "Cairn Wraith",
      Destruction: "Ironjaw Brute",
    },
  },
  {
    min: 6,
    tierName: "Veteran",
    color: "#A8A9AD",
    glow: false,
    titles: {
      Order: "Knight-Questor",
      Chaos: "Chosen Warrior",
      Death: "Tomb Herald",
      Destruction: "Warchanter",
    },
  },
  {
    min: 10,
    tierName: "Champion",
    color: "#C9A24B",
    glow: false,
    titles: {
      Order: "Lord-Celestant",
      Chaos: "Exalted Champion",
      Death: "Mortarch's Blade",
      Destruction: "Megaboss",
    },
  },
  {
    min: 15,
    tierName: "Exemplar",
    color: "#FFD700",
    glow: false,
    titles: {
      Order: "Knight-Exemplar",
      Chaos: "Daemon Prince",
      Death: "Mortarch",
      Destruction: "Orruk Warclan Chief",
    },
  },
  {
    min: 21,
    tierName: "Legendary",
    color: "#8B0000",
    glow: true,
    titles: {
      Order: "Celestant-Prime",
      Chaos: "Everchosen",
      Death: "Nagash's Chosen",
      Destruction: "Foot of Gork",
    },
  },
];

export function getRank(level: number, alliance: GrandAlliance): Rank {
  const clamped = Math.max(0, Math.floor(level));
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (clamped >= t.min) tier = t;
  }
  return {
    title: tier.titles[alliance],
    tierName: tier.tierName,
    color: tier.color,
    glow: tier.glow,
  };
}
