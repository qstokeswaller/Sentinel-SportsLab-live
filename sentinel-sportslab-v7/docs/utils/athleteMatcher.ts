// @ts-nocheck
// ═══════════════════════════════════════════════════════════════════════
// Athlete Name Matcher — shared fuzzy matching + unmatched detection
// Used by all CSV import flows across the platform
// ═══════════════════════════════════════════════════════════════════════

export interface MatchResult {
    csvName: string;
    matched: boolean;
    athleteId?: string;
    athleteName?: string;
}

/**
 * Try to match a CSV name to an athlete in the roster.
 * Uses: exact match → bidirectional substring → token overlap.
 */
export function matchAthleteName(
    csvName: string,
    athletes: { id: string; name: string }[]
): MatchResult {
    const raw = (csvName || '').trim().toLowerCase();
    if (!raw) return { csvName, matched: false };

    // Pass 1: exact match
    const exact = athletes.find(a => a.name.toLowerCase() === raw);
    if (exact) return { csvName, matched: true, athleteId: exact.id, athleteName: exact.name };

    // Pass 2: bidirectional substring
    const sub = athletes.find(a =>
        a.name.toLowerCase().includes(raw) || raw.includes(a.name.toLowerCase())
    );
    if (sub) return { csvName, matched: true, athleteId: sub.id, athleteName: sub.name };

    // Pass 3: token overlap (handles "J. Smith" vs "John Smith")
    const rawTokens = raw.split(/\s+/);
    let bestMatch: { athlete: typeof athletes[0]; score: number } | null = null;
    for (const a of athletes) {
        const aTokens = a.name.toLowerCase().split(/\s+/);
        let matched = 0;
        for (const rt of rawTokens) {
            if (aTokens.some(at => at === rt || at.startsWith(rt) || rt.startsWith(at))) matched++;
        }
        const score = matched / Math.max(rawTokens.length, aTokens.length);
        if (score >= 0.5 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { athlete: a, score };
        }
    }
    if (bestMatch) return { csvName, matched: true, athleteId: bestMatch.athlete.id, athleteName: bestMatch.athlete.name };

    return { csvName, matched: false };
}

/**
 * Process all CSV rows, returning matched rows and unique unmatched names.
 * `nameExtractor` pulls the athlete name from each row.
 */
export function processAthleteMatching<T>(
    rows: T[],
    athletes: { id: string; name: string }[],
    nameExtractor: (row: T) => string
): {
    matchedRows: (T & { _athleteId: string; _athleteName: string })[];
    unmatchedNames: { csvName: string; rowCount: number }[];
    unmatchedRows: (T & { _csvName: string })[];
} {
    const matchedRows: any[] = [];
    const unmatchedMap = new Map<string, number>();
    const unmatchedRows: any[] = [];

    for (const row of rows) {
        const name = nameExtractor(row);
        if (!name?.trim()) continue;

        const result = matchAthleteName(name, athletes);
        if (result.matched) {
            matchedRows.push({ ...row, _athleteId: result.athleteId, _athleteName: result.athleteName });
        } else {
            const key = name.trim();
            unmatchedMap.set(key, (unmatchedMap.get(key) || 0) + 1);
            unmatchedRows.push({ ...row, _csvName: key });
        }
    }

    const unmatchedNames = Array.from(unmatchedMap.entries()).map(([csvName, rowCount]) => ({ csvName, rowCount }));

    return { matchedRows, unmatchedNames, unmatchedRows };
}
