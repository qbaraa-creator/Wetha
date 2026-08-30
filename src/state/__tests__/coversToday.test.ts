import { afterEach, describe, expect, it, vi } from 'vitest';
import { coversToday } from '../useForecast';
import { fixture } from '../../providers/__tests__/openMeteoFixture';
import { normalizeOpenMeteoResponse } from '../../providers/openMeteo';
import { LOCATION } from '../../config/appConfig';

const forecast = normalizeOpenMeteoResponse(
  fixture(),
  LOCATION,
  '2026-08-19T03:05:00.000Z'
);

/** التجهيزة تغطي 19–25 أغسطس 2026 بتوقيت الرياض. */
function pretendNow(utcIso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(utcIso));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('البيانات المحفوظة التي لا تشمل اليوم', () => {
  it('تشمل اليوم حين يقع ضمن الأيام', () => {
    pretendNow('2026-08-22T09:00:00.000Z');
    expect(coversToday(forecast)).toBe(true);
  });

  it('لا تشمل اليوم بعد انقضاء الأسبوع', () => {
    pretendNow('2026-08-26T09:00:00.000Z');
    expect(coversToday(forecast)).toBe(false);
  });

  it('لا تشمل اليوم قبل بداية الأسبوع', () => {
    pretendNow('2026-08-18T09:00:00.000Z');
    expect(coversToday(forecast)).toBe(false);
  });

  it('تحسم الحدّ بتوقيت الرياض لا بتوقيت الجهاز', () => {
    // 25 أغسطس 21:30 UTC = 26 أغسطس 00:30 بالرياض، فالأسبوع لم يعد يشمل اليوم
    pretendNow('2026-08-25T21:30:00.000Z');
    expect(coversToday(forecast)).toBe(false);
  });

  it('بلا توقع محفوظ لا شيء يشمل اليوم', () => {
    expect(coversToday(null)).toBe(false);
  });
});
