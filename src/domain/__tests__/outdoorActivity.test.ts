import { describe, expect, it } from 'vitest';
import { findOutdoorActivityWindows, isOutdoorActivityHour } from '../outdoorActivity';
import { makeHours } from './testHelpers';

describe('فترات الأنشطة الخارجية', () => {
  it('لا يقبل الساعة إلا باجتماع الاتجاه والسرعة والرطوبة المناسبة', () => {
    const [suitable, wrongDirection, lowSpeed, strongWind, highHumidity] = makeHours('2026-08-19', [
      { direction: 'NW', speed: 20, humidity: 45 },
      { direction: 'W', speed: 20, humidity: 45 },
      { direction: 'N', speed: 14.9, humidity: 45 },
      { direction: 'N', speed: 25, humidity: 45 },
      { direction: 'N', speed: 20, humidity: 50 }
    ]);

    expect(isOutdoorActivityHour(suitable)).toBe(true);
    expect(isOutdoorActivityHour(wrongDirection)).toBe(false);
    expect(isOutdoorActivityHour(lowSpeed)).toBe(false);
    expect(isOutdoorActivityHour(strongWind)).toBe(false);
    expect(isOutdoorActivityHour(highHumidity)).toBe(false);
  });

  it('يقبل حدي البداية للسرعة والرطوبة ويرفض الحد الأعلى للسرعة', () => {
    const [speedStart, humidityEdge, speedEnd] = makeHours('2026-08-19', [
      { direction: 'N', speed: 15, humidity: 49.9 },
      { direction: 'NW', speed: 24.99, humidity: 49.99 },
      { direction: 'NW', speed: 25, humidity: 49 }
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
