import { describe, expect, it } from 'vitest';
import { DAY_PARTS } from '../../config/appConfig';
import { summarizeDayParts } from '../dayParts';
import { makeFullDay } from './testHelpers';

const DATE = '2026-08-19';

describe('تقسيم اليوم إلى فترات', () => {
  it('يغطي الساعات الأربع والعشرين مرة واحدة بلا تداخل ولا التفاف', () => {
    const covered = new Set<number>();
    DAY_PARTS.forEach((part) => {
      expect(part.startHour).toBeLessThan(part.endHourExclusive);
      for (let hour = part.startHour; hour < part.endHourExclusive; hour += 1) {
        expect(covered.has(hour)).toBe(false); // لا تداخل
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

  it('يحسب المدى والمتوسط من الساعات الصالحة وحدها', () => {
    const day = makeFullDay(
      DATE,
      { direction: 'NW', speed: 20, humidity: 40 },
      { 6: { speed: 30, humidity: 60 }, 7: { speed: null, humidity: null } }
    );
    const morning = summarizeDayParts(day)[1];
    expect(morning.windMinKmh).toBe(20);
    expect(morning.windMaxKmh).toBe(30);
    // الساعة الفارغة لا تسحب المتوسط نحو الصفر
    expect(morning.humidityMean).toBeCloseTo((60 + 40 * 4) / 5, 5);
  });

  it('الفترة بلا بيانات إطلاقًا تبقى بلا حالة بدل أن تُصنَّف', () => {
    const day = makeFullDay(DATE, { direction: null, speed: null, humidity: null });
    const parts = summarizeDayParts(day);
    expect(parts.every((part) => part.windSeverity === null)).toBe(true);
    expect(parts.every((part) => part.humidityMean === null)).toBe(true);
  });
});

describe('حالة الفترة تُحسم بالأغلبية', () => {
  it('ساعة واحدة رديئة لا تصبغ الفترة كلها', () => {
    // الصباح 6–12: خمس ساعات خضراء وواحدة حمراء
    const day = makeFullDay(
      DATE,
      { direction: 'NW', speed: 20, humidity: 40 },
      { 6: { direction: 'S', speed: 20 } }
    );
    const morning = summarizeDayParts(day)[1];
    expect(morning.windSeverity).toBe('green');
  });

  it('الأغلبية الرديئة تظهر رديئة', () => {
    const bad = Object.fromEntries(
      [6, 7, 8, 9].map((hour) => [hour, { direction: 'S' as const, speed: 20 }])
    );
    const morning = summarizeDayParts(
      makeFullDay(DATE, { direction: 'NW', speed: 20, humidity: 40 }, bad)
    )[1];
    expect(morning.windSeverity).toBe('red');
  });

  it('التعادل يُحسم للأسوأ', () => {
    // الظهر 12–16: ساعتان خضراوان وساعتان حمراوان
    const day = makeFullDay(
      DATE,
      { direction: 'NW', speed: 20, humidity: 40 },
      { 12: { direction: 'S', speed: 20 }, 13: { direction: 'S', speed: 20 } }
    );
    expect(summarizeDayParts(day)[2].windSeverity).toBe('red');
  });
});

describe('تمييز الفترات المنقضية', () => {
  it('يعتمد نهاية الفترة لا بدايتها', () => {
    const day = makeFullDay(DATE, { direction: 'NW', speed: 20, humidity: 40 });
    // الساعة 13: الفجر والصباح انقضيا، والظهر (12–16) ما زال جاريًا
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
    expect(summarizeDayParts(day, null).every((part) => !part.isPast)).toBe(true);
  });
});
