import { describe, expect, it } from 'vitest';
import { STARTER_CASES } from './cases';
import { dailyCase, dayKey, normalizeClassCode, reasoningReport } from './daily';
import { scoreAccusation } from './truth';

const c = STARTER_CASES[0];

describe('daily case', () => {
  it('formats the day key', () => { expect(dayKey(new Date(2026, 10, 5))).toBe('2026-11-05'); });
  it('same day gives the same case, next day rotates', () => {
    expect(dailyCase(STARTER_CASES, '2026-11-12').id).toBe(dailyCase(STARTER_CASES, '2026-11-12').id);
    expect(dailyCase(STARTER_CASES, '2026-11-12').id).not.toBe(dailyCase(STARTER_CASES, '2026-11-13').id);
  });
  it('works for dates before the epoch too', () => { expect(dailyCase(STARTER_CASES, '2025-12-30')).toBeDefined(); });
});

describe('classroom', () => {
  it('normalizes and validates class codes', () => {
    expect(normalizeClassCode(' lhr7b ')).toBe('LHR7B');
    expect(normalizeClassCode('ab')).toBeNull();
    expect(normalizeClassCode('bad code!')).toBeNull();
  });
  it('reasoning report rewards breaking the alibi', () => {
    const a = { suspectId: 'farhan', motive: 'Gambling debt', clueId: 'c2' };
    const r = reasoningReport(c, a, scoreAccusation(c, a, 8), 8, ['c1', 'c2', 'c3', 'c4']);
    expect(r.find((x) => x.key === 'logic')!.stars).toBe(3);
    expect(r.find((x) => x.key === 'questioning')!.stars).toBe(3);
  });
  it('reasoning report explains a weak proof', () => {
    const a = { suspectId: 'sana', motive: 'x', clueId: 'c1' };
    const r = reasoningReport(c, a, scoreAccusation(c, a, 25), 25, ['c1']);
    expect(r.find((x) => x.key === 'logic')!.stars).toBe(1);
    expect(r.find((x) => x.key === 'logic')!.tip).toMatch(/did not contradict/);
    expect(r.find((x) => x.key === 'questioning')!.stars).toBe(1);
  });
});
