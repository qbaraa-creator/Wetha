import { describe, expect, it } from 'vitest';
import {
  addDays,
  arabicDayName,
  formatDateDMY,
  formatDayLength,
  formatHour12,
  formatIsoTime,
  nowInRiyadh
} from '../time';
import { moonPhaseIndex, moonPhaseName } from '../moon';

describe('القسم 21.6 — الوقت', () => {
  it('يقرأ لحظة الرياض بغض النظر عن منطقة الجهاز', () => {
    // 2026-08-19T21:30Z = 2026-08-20T00:30 بتوقيت الرياض (+03).
    const result = nowInRiyadh(new Date('2026-08-19T21:30:00Z'));
    expect(result.dateIso).toBe('2026-08-20');
    expect(result.hour).toBe(0);
    expect(result.minute).toBe(30);
  });

  it('يعرض الوقت بنظام 12 ساعة مع ص/م', () => {
    expect(formatHour12(0)).toBe('12:00 ص');
    expect(formatHour12(11)).toBe('11:00 ص');
    expect(formatHour12(12)).toBe('12:00 م');
    expect(formatHour12(18)).toBe('6:00 م');
    expect(formatHour12(24)).toBe('12:00 ص');
    expect(formatIsoTime('2026-08-19T06:02')).toBe('6:02 ص');
    expect(formatIsoTime(null)).toBe('—');
  });

  it('يعرض التاريخ بصيغة DD/MM/YYYY واسم اليوم بالعربية', () => {
    expect(formatDateDMY('2026-08-19')).toBe('19/08/2026');
    expect(arabicDayName('2026-08-19')).toBe('الأربعاء');
  });

  it('يحسب طول النهار من الفرق', () => {
    expect(formatDayLength('2026-08-19T06:02', '2026-08-19T18:50')).toBe('12 س 48 د');
  });

  it('ينتقل بين الأيام عبر حدود الشهر', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
  });
});

describe('القسم 7.2 — مرحلة القمر', () => {
  it('يحوّل الكسر إلى فهرس 0..7', () => {
    expect(moonPhaseIndex(0)).toBe(0);
    expect(moonPhaseIndex(0.25)).toBe(2);
    expect(moonPhaseIndex(0.5)).toBe(4);
    expect(moonPhaseIndex(0.75)).toBe(6);
    expect(moonPhaseIndex(1)).toBe(0);
    expect(moonPhaseIndex(0.227)).toBe(2);
  });

  it('يعيد الاسم العربي للمرحلة', () => {
    expect(moonPhaseName(0)).toBe('محاق');
    expect(moonPhaseName(4)).toBe('بدر');
    expect(moonPhaseName(null)).toBe('—');
  });
});
