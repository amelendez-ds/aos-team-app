// Matchup assessment shared by the captain's proficiency matrix and the
// pairing helper. All tuning lives here.

export type MatchupTier = "strong" | "fair" | "weak" | "unknown";

export type MatchupCell = {
  level: number;
  winRate: number; // 0..1
  gamesPlayed: number;
};

// Proficiency level carries most of the signal; win rate (0..1) adds up to
// 5 points so a proven good matchup outranks an equally-practised poor one.
export function matchupScore(cell: MatchupCell | undefined): number {
  if (!cell || (cell.gamesPlayed === 0 && cell.level === 0)) return 0;
  return cell.level + 5 * cell.winRate;
}

export function matchupTier(cell: MatchupCell | undefined): MatchupTier {
  if (!cell || (cell.gamesPlayed === 0 && cell.level === 0)) return "unknown";
  const score = matchupScore(cell);
  if (score >= 6) return "strong";
  if (score >= 2.5) return "fair";
  return "weak";
}

// Backgrounds for matrix/grid cells, readable on the dark surface.
export const TIER_CELL_CLASS: Record<MatchupTier, string> = {
  strong: "bg-win/25 text-win",
  fair: "bg-gold/20 text-gold",
  weak: "bg-loss/25 text-loss",
  unknown: "bg-bg text-muted",
};

// Best one-to-one assignment of players (rows) to factions (columns),
// maximising the summed score. Sizes are capped at 6×6, so exhaustive
// search (≤ 6! = 720 candidates) beats wiring up a Hungarian solver.
export function bestAssignment(scores: number[][]): (number | null)[] {
  const rows = scores.length;
  const cols = rows > 0 ? scores[0].length : 0;
  let best: (number | null)[] = Array(rows).fill(null);
  let bestTotal = -1;

  const assigned: (number | null)[] = Array(rows).fill(null);
  const usedCols = new Set<number>();

  function walk(row: number, total: number) {
    if (row === rows) {
      if (total > bestTotal) {
        bestTotal = total;
        best = [...assigned];
      }
      return;
    }
    for (let c = 0; c < cols; c++) {
      if (usedCols.has(c)) continue;
      usedCols.add(c);
      assigned[row] = c;
      walk(row + 1, total + scores[row][c]);
      usedCols.delete(c);
      assigned[row] = null;
    }
    // More rows than columns: this row may go unassigned.
    if (cols < rows) walk(row + 1, total);
  }

  walk(0, 0);
  return best;
}
