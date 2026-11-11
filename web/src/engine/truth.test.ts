import { describe, expect, it } from 'vitest';
import { STARTER_CASES } from './cases';
import { checkReply, contradictions, revealClues, scoreAccusation, validateCase } from './truth';

const anarkali = STARTER_CASES[0];
const sana = anarkali.suspects.find((s) => s.id === 'sana')!;
const farhan = anarkali.suspects.find((s) => s.id === 'farhan')!;

describe('starter cases', () => {
  it('every starter case is valid and fair', () => {
    for (const c of STARTER_CASES) expect(validateCase(c)).toEqual([]);
  });
});

describe('revealClues', () => {
  it('reveals clues from the asked suspect by keyword', () => {
    expect(revealClues(anarkali, 'sana', 'When was the power cut?', []).map((c) => c.id)).toContain('c1');
    expect(revealClues(anarkali, 'sana', 'When was the power cut?', []).map((c) => c.id)).not.toContain('c2');
    expect(revealClues(anarkali, 'sana', 'Who was at the back counter when the lights came back?', []).map((c) => c.id)).toContain('c2');
  });
  it('does not reveal clues held by other suspects', () => {
    expect(revealClues(anarkali, 'mian', 'When was the power cut?', [])).toEqual([]);
  });
  it('does not reveal a clue twice', () => {
    expect(revealClues(anarkali, 'sana', 'power?', ['c1']).map((c) => c.id)).not.toContain('c1');
  });
});

describe('contradictions', () => {
  it('flags the culprit once a contradicting clue is found', () => {
    expect(contradictions(anarkali, ['c2'])).toEqual([{ suspectId: 'farhan', clueId: 'c2' }]);
    expect(contradictions(anarkali, ['c1'])).toEqual([]);
  });
});

describe('checkReply', () => {
  it('accepts a normal in-character reply', () => {
    expect(checkReply(anarkali, sana, 'The lights went out at 7:10. I ran to the generator.').ok).toBe(true);
  });
  it('rejects breaking character', () => {
    expect(checkReply(anarkali, sana, 'As an AI language model, I cannot say.').ok).toBe(false);
  });
  it('rejects confessions', () => {
    expect(checkReply(anarkali, farhan, 'Fine, I took the locket.').ok).toBe(false);
    expect(checkReply(anarkali, farhan, 'It was me.').ok).toBe(false);
  });
  it('rejects an innocent inventing facts about the culprit', () => {
    expect(checkReply(anarkali, sana, 'Farhan Qureshi was near the back counter right before 7:10.').ok).toBe(false);
    expect(checkReply(anarkali, sana, 'Mr. Qureshi was near the back counter.').ok).toBe(false);
    const bilal = anarkali.suspects.find((s) => s.id === 'bilal')!;
    expect(checkReply(anarkali, bilal, 'Farhan went out for chai at 7:20.').ok).toBe(true);
  });
  it('rejects an innocent naming the culprit outright', () => {
    expect(checkReply(anarkali, sana, 'Farhan stole it, obviously.').ok).toBe(false);
  });
});

describe('scoreAccusation', () => {
  it('full marks for culprit, motive and key clue with few questions', () => {
    const s = scoreAccusation(anarkali, { suspectId: 'farhan', motive: 'Gambling debt', clueId: 'c2' }, 8);
    expect(s.points).toBe(110);
    expect(s.rank).toBe('Master Detective');
  });
  it('wrong suspect scores zero', () => {
    expect(scoreAccusation(anarkali, { suspectId: 'sana', motive: 'Gambling debt', clueId: 'c2' }, 5).points).toBe(0);
  });
});

describe('validateCase', () => {
  it('rejects a case with two culprits', () => {
    const bad = structuredClone(anarkali);
    bad.suspects[1].isCulprit = true;
    expect(validateCase(bad)).toContain('need exactly 1 culprit');
  });
  it('rejects an unfair case with no contradicting clue', () => {
    const bad = structuredClone(anarkali);
    bad.clues = bad.clues.map((c) => ({ ...c, contradicts: undefined }));
    expect(validateCase(bad)).toContain('no clue contradicts the culprit (unfair case)');
  });
});
