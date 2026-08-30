import { describe, expect, it } from 'vitest';
import { isNormalizedForecast, parseStoredForecast } from '../forecastSchema';
import { fixture } from '../../providers/__tests__/openMeteoFixture';
import { normalizeOpenMeteoResponse } from '../../providers/openMeteo';
import { LOCATION, STORAGE_SCHEMA_VERSION } from '../../config/appConfig';
import type { NormalizedForecast } from '../../domain/types';

const FETCHED_AT = '2026-08-19T03:05:00.000Z';

/** توقع حقيقي مرّ بالتطبيع ثم بدورة JSON، تمامًا كما يخرج من التخزين. */
function storedRecord(): Record<string, unknown> {
  const forecast = normalizeOpenMeteoResponse(fixture(), LOCATION, FETCHED_AT);
  return JSON.parse(
    JSON.stringify({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      locationId: LOCATION.id,
      fetchedAtIso: forecast.fetchedAtIso,
      forecast
    })
  );
}

/** يعدّل نسخة من السجل السليم عبر مسار حقول مفصول بنقاط. */
function corrupt(path: string, value: unknown): Record<string, unknown> {
  const record = storedRecord();
  const keys = path.split('.');
  let target = record as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) {
    target = target[key] as Record<string, unknown>;
  }
  if (value === undefined) delete target[keys[keys.length - 1]];
  else target[keys[keys.length - 1]] = value;
  return record;
}

describe('مدقق التخزين — يقبل السليم', () => {
  it('يقبل سجلًا خرج من التطبيع ومرّ بدورة JSON', () => {
    const record = parseStoredForecast(storedRecord(), LOCATION.id);
    expect(record).not.toBeNull();
    expect(record?.forecast.days).toHaveLength(7);
  });

  it('يقبل التوقع بلا لقطة آنية', () => {
    expect(parseStoredForecast(corrupt('forecast.current', null), LOCATION.id)).not.toBeNull();
  });
});

describe('مدقق التخزين — غلاف السجل', () => {
  it.each([
    ['ليس كائنًا', 'نص'],
    ['فارغ', null],
    ['مصفوفة', []]
  ])('يرفض ما هو %s', (_label, value) => {
    expect(parseStoredForecast(value, LOCATION.id)).toBeNull();
  });

  it('يرفض إصدار مخطط مختلفًا', () => {
    expect(parseStoredForecast(corrupt('schemaVersion', STORAGE_SCHEMA_VERSION + 1), LOCATION.id)).toBeNull();
  });

  it('يرفض موقعًا مختلفًا', () => {
    expect(parseStoredForecast(storedRecord(), 'riyadh')).toBeNull();
  });

  it('يرفض تناقض الموقع بين الغلاف والتوقع', () => {
    expect(parseStoredForecast(corrupt('forecast.locationId', 'riyadh'), LOCATION.id)).toBeNull();
  });

  it('يرفض وقت جلب غير صالح', () => {
    expect(parseStoredForecast(corrupt('fetchedAtIso', 'أمس'), LOCATION.id)).toBeNull();
    expect(parseStoredForecast(corrupt('fetchedAtIso', undefined), LOCATION.id)).toBeNull();
  });
});

describe('مدقق التخزين — عمق التوقع', () => {
  it.each([
    ['التوقع غائب', 'forecast', undefined],
    ['الأيام غائبة', 'forecast.days', undefined],
    ['الأيام فارغة', 'forecast.days', []],
    ['الأيام ليست مصفوفة', 'forecast.days', { length: 7 }],
    ['المنطقة الزمنية غائبة', 'forecast.timezone', undefined],
    ['التحذيرات ليست مصفوفة نصوص', 'forecast.warnings', [1, 2]]
  ])('يرفض حين %s', (_label, path, value) => {
    expect(parseStoredForecast(corrupt(path, value), LOCATION.id)).toBeNull();
  });

  it('يرفض يومًا بلا عدّاد ساعات — وهو ما كان يمر سابقًا', () => {
    const record = corrupt('forecast.days.0.windHoursBySeverity', undefined);
    expect((record.forecast as NormalizedForecast).days).toHaveLength(7);
    expect(parseStoredForecast(record, LOCATION.id)).toBeNull();
  });

  it('يرفض عدّادًا ناقص لون', () => {
    expect(
      parseStoredForecast(
        corrupt('forecast.days.0.humidityHoursBySeverity', { green: 1, orange: 2 }),
        LOCATION.id
      )
    ).toBeNull();
  });

  it('يرفض عدّادًا سالبًا أو كسريًا', () => {
    expect(
      parseStoredForecast(
        corrupt('forecast.days.0.windHoursBySeverity', { green: -1, orange: 2, red: 3 }),
        LOCATION.id
      )
    ).toBeNull();
    expect(
      parseStoredForecast(
        corrupt('forecast.days.0.windHoursBySeverity', { green: 1.5, orange: 2, red: 3 }),
        LOCATION.id
      )
    ).toBeNull();
  });

  it('يرفض تاريخ يوم غير صالح', () => {
    expect(parseStoredForecast(corrupt('forecast.days.2.date', '2026-02-31'), LOCATION.id)).toBeNull();
  });

  it('يرفض يومًا بلا ساعات', () => {
    expect(parseStoredForecast(corrupt('forecast.days.0.hours', []), LOCATION.id)).toBeNull();
  });

  it('يرفض ساعة بلا localHour أو بساعة خارج 0–23', () => {
    expect(parseStoredForecast(corrupt('forecast.days.0.hours.3.localHour', undefined), LOCATION.id)).toBeNull();
    expect(parseStoredForecast(corrupt('forecast.days.0.hours.3.localHour', 26), LOCATION.id)).toBeNull();
  });

  it('يرفض ساعة تنتمي ليوم آخر', () => {
    expect(parseStoredForecast(corrupt('forecast.days.0.hours.3.localDate', '2026-08-25'), LOCATION.id)).toBeNull();
  });

  it('يرفض قيمة رقمية صارت نصًا بعد التحريف', () => {
    expect(parseStoredForecast(corrupt('forecast.days.0.hours.3.windSpeedKmh', '20'), LOCATION.id)).toBeNull();
  });

  it('يرفض اتجاهًا أو حالة خارج المجموعة المعتمدة', () => {
    expect(parseStoredForecast(corrupt('forecast.days.0.hours.3.direction', 'NNW'), LOCATION.id)).toBeNull();
    expect(parseStoredForecast(corrupt('forecast.days.0.hours.3.windSeverity', 'yellow'), LOCATION.id)).toBeNull();
    expect(parseStoredForecast(corrupt('forecast.days.0.dominantDirection', 'شمالية'), LOCATION.id)).toBeNull();
  });

  it('يرفض طور قمر خارج 0–7', () => {
    expect(parseStoredForecast(corrupt('forecast.days.0.moonPhaseIndex', 9), LOCATION.id)).toBeNull();
  });

  it('يرفض فترة بحدود مقلوبة أو حالة مجهولة', () => {
    expect(parseStoredForecast(corrupt('forecast.days.0.windSegments.0.endHourExclusive', 0), LOCATION.id)).toBeNull();
    expect(parseStoredForecast(corrupt('forecast.days.0.humiditySegments.0.severity', 'grey'), LOCATION.id)).toBeNull();
  });

  it('يرفض وقت شروق بصيغة تالفة', () => {
    expect(parseStoredForecast(corrupt('forecast.days.0.sunriseIso', '06:02'), LOCATION.id)).toBeNull();
  });

  it('يرفض لقطة آنية بحقل محرّف', () => {
    expect(parseStoredForecast(corrupt('forecast.current.windDegree', 'شمال'), LOCATION.id)).toBeNull();
  });

  it('NaN و Infinity لا يمران عبر المدقق', () => {
    const record = storedRecord();
    const forecast = record.forecast as NormalizedForecast;
    forecast.days[0].hours[0].humidity = Number.NaN;
    expect(parseStoredForecast(record, LOCATION.id)).toBeNull();

    const other = storedRecord();
    (other.forecast as NormalizedForecast).days[0].humidityMean = Number.POSITIVE_INFINITY;
    expect(parseStoredForecast(other, LOCATION.id)).toBeNull();
  });
});

describe('isNormalizedForecast مستقلًا', () => {
  it('يميّز التوقع الكامل عن الشكل السطحي', () => {
    const forecast = normalizeOpenMeteoResponse(fixture(), LOCATION, FETCHED_AT);
    expect(isNormalizedForecast(forecast)).toBe(true);
    // الشكل الذي كان يمر بفحص `days.length` وحده
    expect(isNormalizedForecast({ days: [{}], locationId: 'jeddah' })).toBe(false);
  });
});
