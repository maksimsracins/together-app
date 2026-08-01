// How many AI reports a non-premium couple gets before generation is gated.
// Shared between report.ts (enforces it) and couples.ts (reports it to the
// client so the UI can show an upgrade prompt instead of silently doing
// nothing once the scheduler skips a couple for being over quota).
export const FREE_REPORT_LIMIT = 1;
