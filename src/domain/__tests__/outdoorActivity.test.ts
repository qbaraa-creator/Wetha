import { describe, expect, it } from 'vitest';
import {
  assessActivityHour,
  describeActivityAssessment,
  findOutdoorActivityWindows,
  isOutdoorActivityHour
} from '../outdoorActivity';
import type { DirectionCode, Severity } from '../types';
import { makeHours } from './testHelpers';

describe('فترات الأنشطة الخارجية', () => {
  it('لا يقبل الساعة إلا باجتماع الاتجاه والسرعة والرطوبة المناسبة', () => {
    const [suitable, wrongDirection, lowSpeed, severeWind, highHumidity] = makeHours('2026-08-19', [
      { direction: 'NW', speed: 20, humidity: 45 },
      { direction: 'W', speed: 20, humidity: 45 },
      { direction: 'N', speed: 14.9, humidity: 45 },
      { direction: 'N', speed: 35, humidity: 45 },
      { direction: 'N', speed: 20, humidity: 50 }
    ]);

    expect(isOutdoorActivityHour(suitable)).toBe(true);
    expect(isOutdoorActivityHour(wrongDirection)).toBe(false);
    expect(isOutdoorActivityHour(lowSpeed)).toBe(false);
    expect(isOutdoorActivityHour(severeWind)).toBe(false);
    expect(isOutdoorActivityHour(highHumidity)).toBe(false);
  });

  it('يقبل حدي البداية للسرعة والرطوبة ويرفض الحد الأعلى للسرعة', () => {
    const [speedStart, humidityEdge, speedEnd] = makeHours('2026-08-19', [
      { direction: 'N', speed: 15, humidity: 49.9 },
      { direction: 'NW', speed: 34.99, humidity: 49.99 },
      { direction: 'NW', speed: 35, humidity: 49 }
    ]);

    expect(isOutdoorActivityHour(speedStart)).toBe(true);
    expect(isOutdoorActivityHour(humidityEdge)).toBe(true);
    expect(isOutdoorActivityHour(speedEnd)).toBe(false);
  });

  it('يجمع الساعات المتتالية ويفصلها عند فشل أي معيار', () => {
    const hours = makeHours('2026-08-19', [
      { direction: 'N', speed: 18, humidity: 40 },
      { direction: 'NW', speed: 20, humidity: 45 },
      { direction: 'W', speed: 20, humidity: 45 },
      { direction: 'N', speed: 22, humidity: 49 },
      { direction: 'N', speed: 22, humidity: 66 }
    ]);

    expect(findOutdoorActivityWindows(hours)).toEqual([
      { startHour: 0, endHourExclusive: 2 },
      { startHour: 3, endHourExclusive: 4 }
    ]);
  });

  it('يستبعد ساعات اليوم الماضية', () => {
    const hours = makeHours(
      '2026-08-19',
      Array.from({ length: 6 }, () => ({ direction: 'N' as const, speed: 20, humidity: 40 }))
    );
    expect(findOutdoorActivityWindows(hours, 3)).toEqual([{ startHour: 3, endHourExclusive: 6 }]);
  });
});

describe('مصفوفة الملاءمة الموحّدة', () => {
  // قيم متوقعة مستقلة عن دوال الإنتاج: كل القطاعات × نطاقات السرعة × نطاقات الرطوبة.
  const directions: [DirectionCode, number][] = [
    ['N', 0],
    ['NW', 0],
    ['NE', 1],
    ['E', 1],
    ['W', 1],
    ['SE', 2],
    ['S', 2],
    ['SW', 2]
  ];
  const speeds = [
    [14, 2],
    [20, 0],
    [30, 1],
    [40, 2]
  ];
  const humidities = [
    [40, 0],
    [55, 1],
    [70, 2]
  ];
  const cases = directions.flatMap(([direction, d]) =>
    speeds.flatMap(([speed, s]) =>
      humidities.map(([humidity, h]) => ({
        direction,
        speed,
        humidity,
        expected: (['green', 'orange', 'red'] as Severity[])[
          Math.max(d, speed === 30 && (direction === 'N' || direction === 'NW') ? 0 : s, h)
        ]
      }))
    )
  );

  it.each(cases)('$direction / $speed كم/س / $humidity% = $expected', ({ expected, ...spec }) => {
    const point = makeHours('2026-08-19', [spec])[0];
    expect(assessActivityHour(point).severity).toBe(expected);
    expect(isOutdoorActivityHour(point)).toBe(expected === 'green');
  });

  it.each([
    [14.99, 49.99, 'red'],
    [15, 49.99, 'green'],
    [24.99, 49.99, 'green'],
    [25, 49.99, 'green'],
    [34.99, 49.99, 'green'],
    [35, 49.99, 'red'],
    [20, 50, 'orange'],
    [20, 64.99, 'orange'],
    [20, 65, 'red'],
    [20, 100, 'red']
  ])('يفحص الحدود الخام قبل التقريب: %s / %s', (speed, humidity, expected) => {
    const point = makeHours('2026-08-19', [
      { direction: 'NW', speed: Number(speed), humidity: Number(humidity) }
    ])[0];
    expect(assessActivityHour(point).severity).toBe(expected);
  });

  it('يحفظ جميع الأسباب ولا يخفي البرتقالي عند وجود سبب أحمر', () => {
    const point = makeHours('2026-08-19', [{ direction: 'S', speed: 29, humidity: 70 }])[0];
    const assessment = assessActivityHour(point);
    expect(assessment.reasons.map((reason) => reason.code)).toEqual([
      'direction',
      'humidity-high',
      'speed-strong'
    ]);
    expect(describeActivityAssessment(assessment, point)).toBe(
      'اتجاه غير مفضّل: جنوبية · رطوبة مرتفعة · رياح قوية'
    );
  });

  it.each(['N', 'NW'] as const)(
    'استثناء سرعة %s لا يلغي سبب الرطوبة أو حد الشديدة',
    (direction) => {
      const hours = makeHours('2026-08-19', [
        { direction, speed: 30, humidity: 40 },
        { direction, speed: 30, humidity: 55 },
        { direction, speed: 30, humidity: 65 },
        { direction, speed: 35, humidity: 40 }
      ]);
      expect(
        hours.map((hour) => assessActivityHour(hour).reasons.map((reason) => reason.code))
      ).toEqual([[], ['humidity-elevated'], ['humidity-high'], ['speed-severe']]);
    }
  );

  it('يجمع نافذة تعبر سرعة 25 دون قطعها بين الشمالي والشمالي الغربي', () => {
    const hours = makeHours('2026-08-19', [
      { direction: 'N', speed: 24, humidity: 40 },
      { direction: 'NW', speed: 25, humidity: 40 },
      { direction: 'N', speed: 34.99, humidity: 40 },
      { direction: 'NW', speed: 35, humidity: 40 }
    ]);
    expect(findOutdoorActivityWindows(hours)).toEqual([{ startHour: 0, endHourExclusive: 3 }]);
  });

  it.each([
    { direction: null, speed: 20, humidity: 40 },
    { direction: 'N' as const, speed: null, humidity: 40 },
    { direction: 'S' as const, speed: 20, humidity: null },
    { direction: 'N' as const, speed: -1, humidity: 40 },
    { direction: 'N' as const, speed: Infinity, humidity: 40 },
    { direction: 'N' as const, speed: 20, humidity: NaN },
    { direction: 'N' as const, speed: 20, humidity: -1 },
    { direction: 'N' as const, speed: 20, humidity: 101 }
  ])('البيانات الناقصة أو غير الصالحة محايدة: %j', (spec) => {
    const point = makeHours('2026-08-19', [spec])[0];
    const assessment = assessActivityHour(point);
    expect(assessment.severity).toBeNull();
    expect(isOutdoorActivityHour(point)).toBe(false);
    expect(describeActivityAssessment(assessment, point)).toContain('تقييم غير مكتمل');
  });

  it('لا يستخدم الألوان المخزنة أو الهبّة بدل القياسات المعتمدة', () => {
    const point = makeHours('2026-08-19', [
      { direction: 'NW', speed: 20, humidity: 40, gust: 60 }
    ])[0];
    point.windSeverity = 'red';
    point.humiditySeverity = 'red';
    expect(describeActivityAssessment(assessActivityHour(point), point)).toBe('مطابق لشروطك');
  });

  it('يفصل النافذة عند ساعة ناقصة ويقبل التحول من شمالية إلى شمالية غربية', () => {
    const hours = makeHours('2026-08-19', [
      { direction: 'N', speed: 20, humidity: 40 },
      { direction: 'NW', speed: 20, humidity: 40 },
      { direction: 'NW', speed: 20, humidity: null },
      { direction: 'NW', speed: 20, humidity: 40 }
    ]);
    expect(findOutdoorActivityWindows(hours)).toEqual([
      { startHour: 0, endHourExclusive: 2 },
      { startHour: 3, endHourExclusive: 4 }
    ]);
  });
});
