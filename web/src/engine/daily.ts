import type { CaseFile } from './types';
import type { Accusation, Score } from './truth';

/** Local calendar day as YYYY-MM-DD. Everyone in the same day gets the same case. */
export function dayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Deterministic daily pick: days since 2026-01-01, modulo case count. */
export function dailyCase(cases: CaseFile[], day: string): CaseFile {
  const [y, m, dd] = day.split('-').map(Number);
  const days = Math.floor((Date.UTC(y, m - 1, dd) - Date.UTC(2026, 0, 1)) / 86_400_000);
  return cases[((days % cases.length) + cases.length) % cases.length];
}

/** Class codes: 4–8 letters/digits, upper-case. Used by classroom mode. */
export function normalizeClassCode(s: string): string | null {
  const c = s.trim().toUpperCase();
  return /^[A-Z0-9]{4,8}$/.test(c) ? c : null;
}

export interface Skill { key: 'questioning' | 'evidence' | 'logic' | 'motive'; label: string; stars: 1 | 2 | 3; tip: string }

/** Critical-thinking report for students/teachers: what reasoning the player showed, not just the score. */
export function reasoningReport(c: CaseFile, a: Accusation, s: Score, questions: number, found: string[]): Skill[] {
  const contradicting = c.clues.filter((x) => x.contradicts && found.includes(x.id));
  const pickedClue = c.clues.find((x) => x.id === a.clueId);
  const q: Skill['stars'] = questions <= 12 ? 3 : questions <= 20 ? 2 : 1;
  const ev: Skill['stars'] = found.length >= Math.ceil(c.clues.length * 0.66) ? 3 : found.length >= 2 ? 2 : 1;
  const lo: Skill['stars'] = s.culprit && s.clue ? 3 : contradicting.length > 0 ? 2 : 1;
  const mo: Skill['stars'] = s.motive ? 3 : s.culprit ? 2 : 1;
  return [
    { key: 'questioning', label: 'Questioning', stars: q, tip: q === 3 ? 'Focused, efficient questions.' : 'Ask about specific times, places and objects instead of general questions.' },
    { key: 'evidence', label: 'Evidence', stars: ev, tip: ev === 3 ? 'You gathered most of the evidence.' : `You found ${found.length} of ${c.clues.length} clues. Question every suspect.` },
    { key: 'logic', label: 'Logic', stars: lo, tip: lo === 3 ? 'Your proof directly breaks the culprit\'s story.' : pickedClue && !pickedClue.contradicts ? 'Your proof was true but did not contradict anyone. Look for a clue that breaks an alibi.' : 'Find the clue that contradicts someone\'s alibi.' },
    { key: 'motive', label: 'Motive', stars: mo, tip: mo === 3 ? 'You understood why it happened.' : 'Think about who gained from the crime and who had a secret.' },
  ];
}
