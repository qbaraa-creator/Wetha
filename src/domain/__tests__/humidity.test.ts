import { describe, expect, it } from 'vitest';
import { getHumiditySeverity } from '../humidity';

describe('القسم 21.3 — عتبات الرطوبة', () => {
  it.each([
    [49.9, 'green'],
    [50, 'orange'],
    [70, 'orange'],
    [70.1, 'red'],
    [0, 'green'],
    [100, 'red']
  ])('%s% ← %s', (value, expected) => {
    expect(getHumiditySeverity(value as number)).toBe(expected);
  });
});
