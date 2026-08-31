import { describe, expect, it } from 'vitest';
import { DAY_PARTS } from '../../config/appConfig';
import { summarizeDayParts } from '../dayParts';
import { makeFullDay } from './testHelpers';
const DATE = '2026-08-19';
describe('أرقام الفترات داخل التفاصيل', () => {
  it('يغطي الساعات الأربع والعشرين مرة واحدة بلا تداخل ولا التفاف', () => {
    const covered = new Set<number>();
    DAY_PARTS.forEach((part) => {
      expect(part.startHour).toBeLessThan(part.endHourExclusive);
      for (let hour = part.startHour; hour < part.endHourExclusive; hour += 1) {
        expect(covered.has(hour)).toBe(false);
        covered.add(hour);
      }
    });
    expect(covered.size).toBe(24);
  });
  it('يبقي الفترات مرتبة زمنيًا', () => {
    const starts = DAY_PARTS.map((part) => part.startHour);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });
  it('يوزّع الساعات على الفترات بأعدادها الصحيحة', () => {
    const parts = summarizeDayParts(
      makeFullDay(DATE, { direction: 'NW', speed: 20, humidity: 40 })
    );
    expect(parts.map((part) => part.hourCount)).toEqual([6, 6, 4, 3, 5]);
    expect(parts.map((part) => part.labelAr)).toEqual(['فجر', 'صباح', 'ظهر', 'عصر', 'ليل']);
  });
  it('يحسب المدى والمتوسط من القيم الصالحة وحدها', () => {
    const day = makeFullDay(
      DATE,
      { direction: 'NW', speed: 20, humidity: 40 },
      { 6: { speed: 30, humidity: 60 }, 7: { speed: null, humidity: null } }
    );
    const morning = summarizeDayParts(day)[1];
    expect(morning.windMinKmh).toBe(20);
    expect(morning.windMaxKmh).toBe(30);
    expect(morning.humidityMean).toBeCloseTo((60 + 40 * 4) / 5, 5);
  });
  it('لا يختلق قيمًا للفترة الناقصة', () => {
    const parts = summarizeDayParts([]);
    expect(parts.every((part) => part.hourCount === 0)).toBe(true);
    expect(
      parts.every(
        (part) => part.windMinKmh === null && part.windMaxKmh === null && part.humidityMean === null
      )
    ).toBe(true);
  });
  it('الفترة المنقضية تعتمد نهاية الفترة لا بدايتها', () => {
    const day = makeFullDay(DATE, { direction: 'NW', speed: 20, humidity: 40 });
    expect(summarizeDayParts(day, 13).map((part) => part.isPast)).toEqual([
      true,
      true,
      false,
      false,
      false
    ]);
  });
  it('اليوم غير الحالي لا فترة منقضية فيه', () => {
    const day = makeFullDay(DATE, { direction: 'NW', speed: 20, humidity: 40 });
    expect(summarizeDayParts(day).every((part) => !part.isPast)).toBe(true);
  });
});
