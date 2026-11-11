import type { CaseFile, Clue, Suspect } from './types';

/** Clues revealed by asking `suspectId` this question (keyword match, case-insensitive). */
export function revealClues(c: CaseFile, suspectId: string, question: string, found: string[]): Clue[] {
  const q = question.toLowerCase();
  return c.clues.filter(
    (cl) => cl.from === suspectId && !found.includes(cl.id) && cl.keywords.some((k) => q.includes(k.toLowerCase())),
  );
}

/** Suspects whose story is contradicted by clues the player has found. */
export function contradictions(c: CaseFile, found: string[]): { suspectId: string; clueId: string }[] {
  return c.clues
    .filter((cl) => cl.contradicts && found.includes(cl.id))
    .map((cl) => ({ suspectId: cl.contradicts!, clueId: cl.id }));
}

/** Words that would mean a suspect confessed or the AI broke character. */
const CONFESSION = [/\bi (stole|took|did it|killed|robbed)\b/i, /\bit was me\b/i, /\bmain ne (chori|churaya)/i];
const BREAK_CHARACTER = [/\bas an ai\b/i, /\blanguage model\b/i, /\bi am an ai\b/i, /\bi'm an ai\b/i, /\bsystem prompt\b/i];

export type ReplyCheck = { ok: true } | { ok: false; reason: string };

/**
 * Rule check on a suspect reply. Innocents must not confess; nobody confesses
 * (the player must earn the solution); nobody breaks character; nobody names the
 * culprit outright; replies stay short.
 */
export function checkReply(c: CaseFile, s: Suspect, reply: string): ReplyCheck {
  if (!reply.trim()) return { ok: false, reason: 'empty' };
  if (BREAK_CHARACTER.some((r) => r.test(reply))) return { ok: false, reason: 'broke character' };
  if (CONFESSION.some((r) => r.test(reply))) return { ok: false, reason: 'confession' };
  if (!s.isCulprit) {
    const culprit = c.suspects.find((x) => x.isCulprit)!;
    const first = culprit.name.split(' ')[0].toLowerCase();
    if (new RegExp(`\\b${first}\\b[^.]{0,40}\\b(stole|took it|is the thief|did it|is guilty)\\b`, 'i').test(reply)) {
      return { ok: false, reason: 'named culprit' };
    }
    // Innocents may only talk about the culprit if their own facts mention them.
    const parts = culprit.name.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
    const knowsCulprit = s.knows.some((k) => parts.some((p) => k.toLowerCase().includes(p)));
    if (!knowsCulprit && parts.some((p) => new RegExp(`\\b${p}\\b`, 'i').test(reply))) return { ok: false, reason: 'invented fact about culprit' };
  }
  if (reply.split(/\s+/).length > 90) return { ok: false, reason: 'too long' };
  return { ok: true };
}

export interface Accusation { suspectId: string; motive: string; clueId: string }
export interface Score { points: number; max: number; culprit: boolean; motive: boolean; clue: boolean; rank: string }

export function scoreAccusation(c: CaseFile, a: Accusation, questionsAsked: number): Score {
  const culprit = a.suspectId === c.solution.culprit;
  const motive = culprit && a.motive === c.solution.motive;
  const keyClue = c.clues.find((x) => x.id === c.solution.keyClue);
  const clue = culprit && (a.clueId === c.solution.keyClue || (!!keyClue && c.clues.find((x) => x.id === a.clueId)?.contradicts === c.solution.culprit));
  let points = (culprit ? 60 : 0) + (motive ? 20 : 0) + (clue ? 20 : 0);
  if (culprit && questionsAsked <= 12) points += 10; // efficient detective bonus
  const rank = points >= 100 ? 'Master Detective' : points >= 80 ? 'Inspector' : points >= 60 ? 'Sergeant' : 'Constable';
  return { points, max: 110, culprit, motive, clue, rank };
}

/** Validate a case file (used for cloud-generated cases). Returns error list; empty means valid. */
export function validateCase(x: unknown): string[] {
  const e: string[] = [];
  const c = x as CaseFile;
  if (!c || typeof c !== 'object') return ['not an object'];
  for (const k of ['id', 'title', 'city', 'intro', 'what'] as const) if (typeof c[k] !== 'string' || !c[k]) e.push(`missing ${k}`);
  if (!Array.isArray(c.suspects) || c.suspects.length !== 4) e.push('need exactly 4 suspects');
  if (!Array.isArray(c.clues) || c.clues.length < 4) e.push('need at least 4 clues');
  if (!Array.isArray(c.motives) || c.motives.length < 3) e.push('need at least 3 motives');
  if (e.length) return e;
  const ids = new Set(c.suspects.map((s) => s.id));
  if (ids.size !== 4) e.push('suspect ids must be unique');
  const culprits = c.suspects.filter((s) => s.isCulprit);
  if (culprits.length !== 1) e.push('need exactly 1 culprit');
  if (culprits[0] && !culprits[0].lie) e.push('culprit needs a lie');
  for (const s of c.suspects) {
    if (!s.name || !s.alibi || !Array.isArray(s.knows) || s.knows.length === 0 || !s.secret) e.push(`suspect ${s.id} incomplete`);
  }
  for (const cl of c.clues) {
    if (!cl.id || !cl.text || !Array.isArray(cl.keywords) || cl.keywords.length === 0) e.push(`clue ${cl.id} incomplete`);
    if (cl.from !== 'scene' && !ids.has(cl.from)) e.push(`clue ${cl.id} from unknown suspect`);
    if (cl.contradicts && !ids.has(cl.contradicts)) e.push(`clue ${cl.id} contradicts unknown suspect`);
  }
  const sol = c.solution;
  if (!sol || !ids.has(sol.culprit)) e.push('solution culprit unknown');
  else if (!c.suspects.find((s) => s.id === sol.culprit)?.isCulprit) e.push('solution culprit is not marked culprit');
  if (sol && !c.motives.includes(sol.motive)) e.push('solution motive not in motives');
  if (sol && !c.clues.some((cl) => cl.id === sol.keyClue)) e.push('key clue missing');
  if (sol && !c.clues.some((cl) => cl.contradicts === sol.culprit)) e.push('no clue contradicts the culprit (unfair case)');
  return e;
}
