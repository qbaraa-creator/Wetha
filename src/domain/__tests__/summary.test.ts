import { describe, expect, it } from 'vitest';
import { buildDailySummary, resolveDominantDirection } from '../summary';
import { smoothDirectionJitter } from '../segments';
import { makeFullDay, makeHours } from './testHelpers';

const noAstronomy = {
  sunriseIso: null,
  sunsetIso: null,
  moonPhaseIndex: null,
  providerDominantDirection: null
};

describe('القسم 5.5 — الاتجاه العام', () => {
  it('القطاع الأكثر حضورًا يصبح الاتجاه العام عند بلوغه 50%', () => {
    const hours = makeFullDay(
      '2026-08-19',
      { direction: 'NW', speed: 20 },
      {
        0: { direction: 'W', speed: 20 },
        1: { direction: 'W', speed: 20 }
      }
    );
    const result = resolveDominantDirection(smoothDirectionJitter(hours));
    expect(result.dominantDirection).toBe('NW');
    expect(result.variableDirections).toBeUndefined();
  });

  it('إذا لم يبلغ أي قطاع 50% تُوصف الرياح بالمتقلبة مع أعلى اتجاهين', () => {
    const specs = Array.from({ length: 24 }, (_, hour) => {
      if (hour < 9) return { direction: 'NW' as const, speed: 20 };
      if (hour < 17) return { direction: 'W' as const, speed: 20 };
      return { direction: 'S' as const, speed: 20 };
    });
    const hours = makeHours('2026-08-19', specs);
    const result = resolveDominantDirection(smoothDirectionJitter(hours));
    expect(result.dominantDirection).toBeNull();
    expect(result.variableDirections).toEqual(['NW', 'W']);
  });

  it('التعادل يُرجَّح بمجموع السرعات', () => {
    const specs = Array.from({ length: 24 }, (_, hour) =>
      hour < 12 ? { direction: 'NW' as const, speed: 10 } : { direction: 'NE' as const, speed: 30 }
    );
    const result = resolveDominantDirection(makeHours('2026-08-19', specs));
    expect(result.dominantDirection).toBe('NE');
  });
});

describe('القسمان 6.3 و21.5 — ملخص اليوم', () => {
  it('يحسب الشمالية الغربية بسرعة 30 خضراء في العداد والفترات مع بقاء 35 حمراء', () => {
    const hours = makeFullDay(
      '2026-08-19',
      { direction: 'NW', speed: 30, humidity: 40 },
      {
        12: { direction: 'NW', speed: 35, humidity: 40 }
      }
    );
    const summary = buildDailySummary('2026-08-19', hours, noAstronomy);
    expect(summary.windHoursBySeverity).toEqual({ green: 23, orange: 0, red: 1 });
    expect(summary.windSegments.map((segment) => segment.severity)).toEqual([
      'green',
      'red',
      'green'
    ]);
  });
  it('مجموع ساعات كل لون يساوي عدد الساعات الصالحة', () => {
    const hours = makeFullDay(
      '2026-08-19',
      { direction: 'NW', speed: 20, humidity: 55 },
      {
        3: { direction: null, speed: null, humidity: null }
      }
    );
    const summary = buildDailySummary('2026-08-19', hours, noAstronomy);
    const windTotal =
      summary.windHoursBySeverity.green +
      summary.windHoursBySeverity.orange +
      summary.windHoursBySeverity.red;
    const humidityTotal =
      summary.humidityHoursBySeverity.green +
      summary.humidityHoursBySeverity.orange +
      summary.humidityHoursBySeverity.red;
    expect(windTotal).toBe(23);
    expect(humidityTotal).toBe(23);
  });

  it('القيمة المفقودة لا تدخل المتوسط', () => {
    const hours = makeHours('2026-08-19', [{ humidity: 40 }, { humidity: null }, { humidity: 60 }]);
    const summary = buildDailySummary('2026-08-19', hours, noAstronomy);
    expect(summary.humidityMean).toBe(50);
    expect(summary.humidityMin).toBe(40);
    expect(summary.humidityMax).toBe(60);
    expect(summary.humidityMaxTimeIso).toBe('2026-08-19T02:00');
  });

  it('أعلى هبّة تُعرض مع الساعة الصحيحة', () => {
    const hours = makeFullDay(
      '2026-08-19',
      { direction: 'NW', speed: 20, gust: 30 },
      {
        17: { direction: 'NW', speed: 20, gust: 52 }
      }
    );
    const summary = buildDailySummary('2026-08-19', hours, noAstronomy);
    expect(summary.gustMaxKmh).toBe(52);
    expect(summary.gustMaxTimeIso).toBe('2026-08-19T17:00');
  });

  it('يوم بلا بيانات لا يُسقط الملخص', () => {
    const hours = makeFullDay('2026-08-19', { direction: null, speed: null, humidity: null });
    const summary = buildDailySummary('2026-08-19', hours, noAstronomy);
    expect(summary.dominantDirection).toBeNull();
    expect(summary.humidityMean).toBeNull();
    expect(summary.windSegments).toHaveLength(0);
  });
});
