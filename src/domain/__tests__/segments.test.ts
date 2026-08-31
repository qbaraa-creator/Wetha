import { describe, expect, it } from 'vitest';
import { buildHumiditySegments, buildWindSegments, smoothDirectionJitter } from '../segments';
import { makeHours } from './testHelpers';

describe('القسم 21.4 — التجميع الزمني', () => {
  it('1) NW,NW,W,NW,NW مع ساعة W غير حمراء تدمج إلى فترة NW واحدة', () => {
    const hours = makeHours('2026-08-19', [
      { direction: 'NW', speed: 20 },
      { direction: 'NW', speed: 20 },
      { direction: 'W', speed: 20 },
      { direction: 'NW', speed: 20 },
      { direction: 'NW', speed: 20 }
    ]);
    const smoothed = smoothDirectionJitter(hours);

    expect(smoothed.map((point) => point.direction)).toEqual(['NW', 'NW', 'NW', 'NW', 'NW']);
    expect(smoothed[2].directionSmoothed).toBe(true);

    const segments = buildWindSegments(smoothed);
    expect(segments).toHaveLength(1);
    expect(segments[0].direction).toBe('NW');
    expect(segments[0].startHour).toBe(0);
    expect(segments[0].endHourExclusive).toBe(5);
  });

  it('الدمج يعيد حساب اللون من الاتجاه الجديد', () => {
    const hours = makeHours('2026-08-19', [
      { direction: 'NW', speed: 20 },
      { direction: 'NW', speed: 20 },
      { direction: 'W', speed: 20 },
      { direction: 'NW', speed: 20 },
      { direction: 'NW', speed: 20 }
    ]);
    expect(hours[2].windSeverity).toBe('orange');

    const smoothed = smoothDirectionJitter(hours);
    expect(smoothed[2].windSeverity).toBe('green');
    expect(buildWindSegments(smoothed)).toHaveLength(1);
  });

  it('2) NW,NW,S,NW,NW تبقى ساعة S فترة حمراء مستقلة', () => {
    const hours = makeHours('2026-08-19', [
      { direction: 'NW', speed: 30 },
      { direction: 'NW', speed: 30 },
      { direction: 'S', speed: 30 },
      { direction: 'NW', speed: 30 },
      { direction: 'NW', speed: 30 }
    ]);
    const smoothed = smoothDirectionJitter(hours);

    expect(smoothed[2].direction).toBe('S');
    expect(smoothed[2].windSeverity).toBe('red');

    const segments = buildWindSegments(smoothed);
    expect(segments).toHaveLength(3);
    expect(segments[1].severity).toBe('red');
    expect(segments[1].startHour).toBe(2);
    expect(segments[1].endHourExclusive).toBe(3);
  });

  it('3) NW,NW,W,W,W يبدأ التحول إلى W عند أول ساعة W', () => {
    const hours = makeHours('2026-08-19', [
      { direction: 'NW', speed: 20 },
      { direction: 'NW', speed: 20 },
      { direction: 'W', speed: 20 },
      { direction: 'W', speed: 20 },
      { direction: 'W', speed: 20 }
    ]);
    const smoothed = smoothDirectionJitter(hours);
    expect(smoothed.map((point) => point.direction)).toEqual(['NW', 'NW', 'W', 'W', 'W']);

    const segments = buildWindSegments(smoothed);
    expect(segments).toHaveLength(2);
    expect(segments[1].direction).toBe('W');
    expect(segments[1].startHour).toBe(2);
  });

  it('4) اتجاه ثابت N مع 14 و18 و27 و35 ينتج أحمر ثم أخضر ممتد ثم أحمر', () => {
    const hours = makeHours('2026-08-19', [
      { direction: 'N', speed: 14 },
      { direction: 'N', speed: 18 },
      { direction: 'N', speed: 27 },
      { direction: 'N', speed: 35 }
    ]);
    const segments = buildWindSegments(smoothDirectionJitter(hours));
    expect(segments.map((segment) => segment.severity)).toEqual(['red', 'green', 'red']);
    expect(segments[1]).toMatchObject({
      startHour: 1,
      endHourExclusive: 3,
      reasonCode: 'direction-and-speed-ok'
    });
  });

  it('يعيد تقييم استثناء السرعة بعد تنعيم الاتجاه ولا يغير البيانات الأصلية', () => {
    const hours = makeHours('2026-08-19', [
      { direction: 'NW', speed: 30 },
      { direction: 'W', speed: 30 },
      { direction: 'NW', speed: 30 }
    ]);
    const smoothed = smoothDirectionJitter(hours);
    expect(hours[1]).toMatchObject({
      direction: 'W',
      speedSeverity: 'orange',
      windSeverity: 'orange'
    });
    expect(smoothed[1]).toMatchObject({
      direction: 'NW',
      rawDirection: 'W',
      speedSeverity: 'green',
      windSeverity: 'green'
    });
    expect(buildWindSegments(smoothed)).toHaveLength(1);
  });

  it('5) رطوبة 49 ثم 50 ثم 65 تنتج أخضر ثم برتقالي ثم أحمر', () => {
    const hours = makeHours('2026-08-19', [{ humidity: 49 }, { humidity: 50 }, { humidity: 65 }]);
    const segments = buildHumiditySegments(hours);
    expect(segments.map((segment) => segment.severity)).toEqual(['green', 'orange', 'red']);
    expect(segments[0].minValue).toBe(49);
    expect(segments[2].maxValue).toBe(65);
  });

  it('لا تُخفى فترة الرطوبة ذات الساعة الواحدة', () => {
    const hours = makeHours('2026-08-19', [{ humidity: 80 }, { humidity: 40 }, { humidity: 80 }]);
    expect(buildHumiditySegments(hours)).toHaveLength(3);
  });

  it('الساعة الناقصة تقطع الفترة ولا تدخل فيها', () => {
    const hours = makeHours('2026-08-19', [
      { direction: 'NW', speed: 20 },
      { direction: null, speed: null },
      { direction: 'NW', speed: 20 }
    ]);
    const segments = buildWindSegments(smoothDirectionJitter(hours));
    expect(segments).toHaveLength(2);
    expect(segments[0].endHourExclusive).toBe(1);
    expect(segments[1].startHour).toBe(2);
  });

  it('ساعة وحيدة في طرف اليوم لا تُدمج لعدم إحاطتها', () => {
    const hours = makeHours('2026-08-19', [
      { direction: 'W', speed: 20 },
      { direction: 'NW', speed: 20 },
      { direction: 'NW', speed: 20 }
    ]);
    const smoothed = smoothDirectionJitter(hours);
    expect(smoothed[0].direction).toBe('W');
  });

  it('أعلى هبّة داخل الفترة تُسجَّل مع وقتها', () => {
    const hours = makeHours('2026-08-19', [
      { direction: 'NW', speed: 20, gust: 28 },
      { direction: 'NW', speed: 21, gust: 35 },
      { direction: 'NW', speed: 22, gust: 30 }
    ]);
    const [segment] = buildWindSegments(smoothDirectionJitter(hours));
    expect(segment.peakGustKmh).toBe(35);
    expect(segment.peakGustTimeIso).toBe('2026-08-19T01:00');
  });
});
