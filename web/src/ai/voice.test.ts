import { describe, expect, it } from 'vitest';
import { genderOf } from './voice';

describe('genderOf', () => {
  it('uses the case file gender when present', () => {
    expect(genderOf({ name: 'Zohra Khan', gender: 'male' })).toBe('male');
  });
  it('guesses from first names for older AI-written cases', () => {
    expect(genderOf({ name: "Zohra 'Speedy' Khan" })).toBe('female');
    expect(genderOf({ name: 'Sana Malik' })).toBe('female');
    expect(genderOf({ name: "Imran 'Puncture' Ahmed" })).toBe('male');
    expect(genderOf({ name: "Farhan 'Meter' Siddiqui" })).toBe('male');
    expect(genderOf({ name: 'Hamza Ali' })).toBe('male');
    expect(genderOf({ name: 'Dadi Amma' })).toBe('female');
    expect(genderOf({ name: 'Uncle Tariq' })).toBe('male');
  });
});
