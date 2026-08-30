import { describe, expect, it } from 'vitest';
import { rankBestGreenWindDay, rankHumidityDays } from '../ranking';
import { buildDailySummary } from '../summary';
import { makeFullDay } from './testHelpers';
import type { DailySummary } from '../types';

const noAstronomy = {
  sunriseIso: null,
  sunsetIso: null,
  moonPhaseIndex: null,
  providerDominantDirection: null
};

function day(date: string, humidity: number, extras: Record<number, { humidity: number }> = {}): DailySummary {
  return buildDailySummary(date, makeFullDay(date, { direction: 'NW', speed: 20, humidity }, extras), noAstronomy);
}

describe('القسم 6.4 — أكثر وأقل يوم رطوبة', () => {
  it('يعتمد المتوسط الساعي', () => {
    const days = [day('2026-08-19', 40), day('2026-08-20', 80), day('2026-08-21', 60)];
    expect(rankHumidityDays(days)).toEqual({
      mostHumidDate: '2026-08-20',
      leastHumidDate: '2026-08-19'
    });
  });

  it('عند تعادل المتوسط يرجّح الأكثر رطوبة بعدد الساعات الحمراء', () => {
    // المتوسط نفسه (60) لكن الثاني فيه ساعات أعلى من 70%.
    const a = day('2026-08-19', 60);
    const b = day('2026-08-20', 60, { 0: { humidity: 20 }, 1: { humidity: 100 } });
    expect(a.humidityMean).toBeCloseTo(60, 5);
    expect(b.humidityMean).toBeCloseTo(60, 5);
    expect(b.humidityHoursBySeverity.red).toBeGreaterThan(a.humidityHoursBySeverity.red);
    expect(rankHumidityDays([a, b]).mostHumidDate).toBe('2026-08-20');
  });

  it('عند تعادل المتوسط يرجّح الأقل رطوبة بعدد الساعات الخضراء', () => {
    const a = day('2026-08-19', 60);
    const b = day('2026-08-20', 60, { 0: { humidity: 20 }, 1: { humidity: 100 } });
    expect(rankHumidityDays([a, b]).leastHumidDate).toBe('2026-08-20');
  });

  it('التعادل الكامل يحسم بالأقرب زمنيًا', () => {
    const a = day('2026-08-19', 60);
    const b = day('2026-08-20', 60);
    expect(rankHumidityDays([a, b]).mostHumidDate).toBe('2026-08-19');
    expect(rankHumidityDays([a, b]).leastHumidDate).toBe('2026-08-19');
  });

  it('اليوم بلا بيانات رطوبة يُستبعد من الترتيب', () => {
    const withData = day('2026-08-19', 55);
    const empty = buildDailySummary(
      '2026-08-20',
      makeFullDay('2026-08-20', { direction: null, speed: null, humidity: null }),
      noAstronomy
    );
    expect(rankHumidityDays([withData, empty]).mostHumidDate).toBe('2026-08-19');
  });
});

describe('القسم 9.2.ب — أكثر ساعات رياح خضراء', () => {
  it('يختار اليوم الأكثر ساعات خضراء', () => {
    const green = buildDailySummary(
      '2026-08-19',
      makeFullDay('2026-08-19', { direction: 'NW', speed: 30, humidity: 50 }),
      noAstronomy
    );
    const orange = buildDailySummary(
      '2026-08-20',
      makeFullDay('2026-08-20', { direction: 'NW', speed: 20, humidity: 50 }),
      noAstronomy
    );
    expect(rankBestGreenWindDay([orange, green])).toBe('2026-08-19');
  });

  it('عند تعادل الخضراء يرجّح الأقل ساعات حمراء', () => {
    const a = buildDailySummary(
      '2026-08-19',
      makeFullDay('2026-08-19', { direction: 'NW', speed: 20 }, { 0: { direction: 'S', speed: 20 }, 1: { direction: 'S', speed: 20 } }),
      noAstronomy
    );
    const b = buildDailySummary(
      '2026-08-20',
      makeFullDay('2026-08-20', { direction: 'NW', speed: 20 }),
      noAstronomy
    );
    expect(a.windHoursBySeverity.green).toBe(b.windHoursBySeverity.green);
    expect(rankBestGreenWindDay([a, b])).toBe('2026-08-20');
  });
});
