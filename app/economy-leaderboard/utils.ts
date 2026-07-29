import type { LeaderboardEntry, Metric, RankedEntry } from './types';

const scoreOf = (entry: LeaderboardEntry, metric: Metric): number =>
  metric === 'total' ? entry.total_points : entry.leaderboard_points;

const otherMetric = (metric: Metric): Metric => (metric === 'total' ? 'season' : 'total');

/** Positions under a given metric. Ties break on user id so ordering is stable. */
function positionsFor(entries: LeaderboardEntry[], metric: Metric): Map<string, number> {
  return new Map(
    [...entries]
      .sort((a, b) => scoreOf(b, metric) - scoreOf(a, metric) || a.user_id.localeCompare(b.user_id))
      .map((entry, index) => [entry.user_id, index + 1])
  );
}

/**
 * Re-ranks the roster for the selected metric and records where each member
 * would sit under the other one, which is what drives the movement chips.
 */
export function rankEntries(entries: LeaderboardEntry[], metric: Metric): RankedEntry[] {
  if (entries.length === 0) return [];

  const primary = positionsFor(entries, metric);
  const alternate = positionsFor(entries, otherMetric(metric));
  const leaderScore = Math.max(...entries.map((entry) => scoreOf(entry, metric)), 0);

  return entries
    .map((entry) => {
      const score = scoreOf(entry, metric);
      return {
        ...entry,
        position: primary.get(entry.user_id) ?? entry.rank,
        alternatePosition: alternate.get(entry.user_id) ?? entry.rank,
        score,
        shareOfLeader: leaderScore > 0 ? score / leaderScore : 0,
      };
    })
    .sort((a, b) => a.position - b.position);
}

export function poolSummary(ranked: RankedEntry[]) {
  const total = ranked.reduce((sum, entry) => sum + entry.score, 0);
  return {
    total,
    leader: ranked[0]?.score ?? 0,
    average: ranked.length ? Math.round(total / ranked.length) : 0,
    tracked: ranked.length,
  };
}

/**
 * The season metric is only worth exposing when it actually says something
 * different from the lifetime total.
 */
export function hasDistinctSeasonData(entries: LeaderboardEntry[]): boolean {
  return (
    entries.some((entry) => entry.leaderboard_points > 0) &&
    entries.some((entry) => entry.leaderboard_points !== entry.total_points)
  );
}
