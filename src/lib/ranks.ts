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

export type PlayerFactionStat = {
  faction_id: string;
  axis: "playing" | "against";
  level: number;
  games_played: number;
  win_rate: number;
};

const AXIS_WEIGHT = { playing: 0.6, against: 0.4 } as const;

function statWeight(s: PlayerFactionStat): number {
  return s.games_played * AXIS_WEIGHT[s.axis];
}

// Weighted average of all faction levels: playing counts 60%, against 40%,
// and factions with more games carry proportionally more influence.
export function calculateOverallLevel(stats: PlayerFactionStat[]): number {
  let weighted = 0;
  let total = 0;
  for (const s of stats) {
    const w = statWeight(s);
    weighted += s.level * w;
    total += w;
  }
  return total > 0 ? Math.round(weighted / total) : 0;
}

// The overall rank title is flavoured by the alliance carrying the most
// weighted games; ties and empty stats fall back to Order.
export function getDominantAlliance(
  stats: PlayerFactionStat[],
  allianceOf: Map<string, GrandAlliance>
): GrandAlliance {
  const weights = new Map<GrandAlliance, number>();
  for (const s of stats) {
    const alliance = allianceOf.get(s.faction_id);
    if (!alliance) continue;
    weights.set(alliance, (weights.get(alliance) ?? 0) + statWeight(s));
  }
  let best: GrandAlliance = "Order";
  let bestWeight = 0;
  for (const alliance of ALLIANCES) {
    const w = weights.get(alliance) ?? 0;
    if (w > bestWeight) {
      best = alliance;
      bestWeight = w;
    }
  }
  return best;
}

// Strongest army = the played faction with the highest proficiency level
// from logged games; ties favour more games played. Distinct from the main
// army, which the player chooses themselves (profiles.primary_faction_id).
export function pickStrongestArmy(
  stats: PlayerFactionStat[]
): PlayerFactionStat | null {
  const playing = stats.filter((s) => s.axis === "playing");
  if (playing.length === 0) return null;
  return playing.reduce((best, s) =>
    s.level > best.level ||
    (s.level === best.level && s.games_played > best.games_played)
      ? s
      : best
  );
}

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
