import { describe, expect, it } from 'vitest';
import { buildForecastUrl, normalizeOpenMeteoResponse } from '../openMeteo';
import { ProviderError } from '../types';
import { LOCATION } from '../../config/appConfig';
import { fixture } from './openMeteoFixture';

const FETCHED_AT = '2026-08-19T03:05:00.000Z';
const normalize = (payload: ReturnType<typeof fixture>) =>
  normalizeOpenMeteoResponse(payload, LOCATION, FETCHED_AT);
const hasWarning = (warnings: string[], needle: string) =>
  warnings.some((warning) => warning.includes(needle));

describe('طبقة المزود — القسم 12', () => {
  it('يبني الطلب بكل الحقول والوحدات المطلوبة', () => {
    const url = buildForecastUrl(LOCATION);
    expect(url).toContain('latitude=21.5433');
    expect(url).toContain('longitude=39.1728');
    expect(url).toContain('timezone=Asia%2FRiyadh');
    expect(url).toContain('wind_speed_unit=kmh');
    expect(url).toContain('forecast_days=7');
    expect(url).toContain('moon_phase');
    expect(url).toContain('wind_gusts_10m');
  });

  it('يحوّل الاستجابة السليمة بلا تحذيرات', () => {
    const forecast = normalize(fixture());
    expect(forecast.days).toHaveLength(7);
    expect(forecast.warnings).toEqual([]);

    const [day] = forecast.days;
    expect(day.hours).toHaveLength(24);
    expect(day.dominantDirection).toBe('NW');
    expect(day.windSegments[0].severity).toBe('green');
    expect(day.humiditySegments[0].severity).toBe('red');
    expect(day.gustMaxKmh).toBe(31);
    expect(day.moonPhaseIndex).toBe(2);
    expect(day.sunriseIso).toBe('2026-08-19T06:02');
    expect(day.providerDominantDirection).toBe('NW'); // 331° يقع في قطاع NW
  });

  it('يعبّئ لقطة الآن بحالتها المركبة', () => {
    const forecast = normalize(fixture());
    expect(forecast.current?.direction).toBe('NW');
    expect(forecast.current?.windSeverity).toBe('red');
    expect(forecast.current?.humiditySeverity).toBe('red');
  });

  it('يمرر القيم الناقصة كما هي بلا تخمين', () => {
    const payload = fixture();
    payload.hourly.wind_speed_10m[5] = null;
    payload.hourly.relative_humidity_2m[6] = null;
    const [day] = normalize(payload).days;
    expect(day.hours[5].windSpeedKmh).toBeNull();
    expect(day.hours[5].windSeverity).toBeNull();
    expect(day.hours[6].humidity).toBeNull();
    expect(
      day.windHoursBySeverity.green + day.windHoursBySeverity.orange + day.windHoursBySeverity.red
    ).toBe(23);
  });

  it('يرفض الحقل ذا الوحدة غير المتوقعة ولا يحوّله صامتًا', () => {
    const payload = fixture();
    payload.hourly_units.wind_speed_10m = 'mp/h';
    const forecast = normalize(payload);
    expect(hasWarning(forecast.warnings, 'hourly.wind_speed_10m')).toBe(true);
    expect(forecast.days[0].windMaxKmh).toBeNull();
    expect(forecast.days[0].windSegments).toHaveLength(0);
  });
});

describe('طول المصفوفات مطابق للمحور الزمني', () => {
  it('المصفوفة الأقصر تُكمَّل فراغًا ولا تُسرّب undefined', () => {
    const payload = fixture();
    payload.hourly.wind_speed_10m = payload.hourly.wind_speed_10m.slice(0, 100);
    const forecast = normalize(payload);

    expect(hasWarning(forecast.warnings, 'طوله 100 بينما المحور الزمني 168')).toBe(true);
    const allHours = forecast.days.flatMap((day) => day.hours);
    expect(allHours).toHaveLength(168);
    expect(allHours.slice(100).every((hour) => hour.windSpeedKmh === null)).toBe(true);
    expect(allHours.every((hour) => hour.windSpeedKmh !== undefined)).toBe(true);
    // ساعة بلا سرعة تبقى بلا لون بدل أن تُصنّف حمراء
    expect(allHours.slice(100).every((hour) => hour.windSeverity === null)).toBe(true);
  });

  it('المصفوفة الأطول يُهمل فائضها مع تحذير', () => {
    const payload = fixture();
    payload.hourly.relative_humidity_2m = [...payload.hourly.relative_humidity_2m, 10, 20, 30];
    const forecast = normalize(payload);

    expect(hasWarning(forecast.warnings, 'طوله 171 بينما المحور الزمني 168')).toBe(true);
    expect(forecast.days.flatMap((day) => day.hours)).toHaveLength(168);
  });

  it('الحقل غير المصفوفة يُعامل كمفقود لا كقيمة', () => {
    const payload = fixture();
    (payload.hourly as Record<string, unknown>).wind_gusts_10m = 31;
    const forecast = normalize(payload);
    expect(hasWarning(forecast.warnings, 'ليس مصفوفة')).toBe(true);
    expect(forecast.days[0].gustMaxKmh).toBeNull();
  });

  it('undefined و NaN و Infinity كلها تصير فراغًا', () => {
    const payload = fixture();
    payload.hourly.relative_humidity_2m[0] = undefined;
    payload.hourly.relative_humidity_2m[1] = Number.NaN;
    payload.hourly.relative_humidity_2m[2] = Number.POSITIVE_INFINITY;
    payload.hourly.relative_humidity_2m[3] = Number.NEGATIVE_INFINITY;
    const [day] = normalize(payload).days;

    expect(day.hours.slice(0, 4).map((hour) => hour.humidity)).toEqual([null, null, null, null]);
    expect(day.hours.slice(0, 4).every((hour) => hour.humiditySeverity === null)).toBe(true);
    // المتوسط يُحسب من الساعات الصالحة وحدها ولا يتحول إلى NaN
    expect(Number.isFinite(day.humidityMean as number)).toBe(true);
    expect(day.humidityMean).toBe(74);
  });
});

describe('التحقق من مجالات القيم', () => {
  it('الرطوبة خارج 0–100 تُفرَّغ', () => {
    const payload = fixture();
    payload.hourly.relative_humidity_2m[0] = 140;
    payload.hourly.relative_humidity_2m[1] = -5;
    const forecast = normalize(payload);
    expect(forecast.days[0].hours[0].humidity).toBeNull();
    expect(forecast.days[0].hours[1].humidity).toBeNull();
    expect(hasWarning(forecast.warnings, 'خارج المجال')).toBe(true);
  });

  it('السرعة والهبّة السالبتان تُفرَّغان', () => {
    const payload = fixture();
    payload.hourly.wind_speed_10m[0] = -1;
    payload.hourly.wind_gusts_10m[0] = -3;
    const [day] = normalize(payload).days;
    expect(day.hours[0].windSpeedKmh).toBeNull();
    expect(day.hours[0].windGustKmh).toBeNull();
  });

  it('الدرجة خارج 0–360 تُفرَّغ فلا يُشتق منها اتجاه', () => {
    const payload = fixture();
    payload.hourly.wind_direction_10m[0] = 400;
    payload.hourly.wind_direction_10m[1] = -10;
    const [day] = normalize(payload).days;
    expect(day.hours[0].windDegree).toBeNull();
    expect(day.hours[0].direction).toBeNull();
    expect(day.hours[1].direction).toBeNull();
  });

  it('طور القمر خارج 0–1 يُفرَّغ', () => {
    const payload = fixture();
    payload.daily.moon_phase[0] = 1.5;
    expect(normalize(payload).days[0].moonPhaseIndex).toBeNull();
  });
});

describe('التحقق من الأوقات والتواريخ', () => {
  it('يُسقط الطوابع الزمنية غير الصالحة ولا يزيح القيم عن ساعاتها', () => {
    const payload = fixture();
    payload.hourly.time[3] = '2026-08-19T25:00'; // ساعة مستحيلة
    payload.hourly.time[4] = 'ليس وقتًا';
    payload.hourly.relative_humidity_2m[5] = 33;
    const forecast = normalize(payload);

    expect(hasWarning(forecast.warnings, 'hourly.time')).toBe(true);
    const [day] = forecast.days;
    expect(day.hours).toHaveLength(22);
    // الساعة 5 ما زالت تحمل قيمتها رغم إسقاط موضعين قبلها
    expect(day.hours.find((hour) => hour.localHour === 5)?.humidity).toBe(33);
  });

  it('يُسقط التاريخ غير الموجود في التقويم', () => {
    const payload = fixture();
    payload.daily.time[2] = '2026-02-31';
    const forecast = normalize(payload);
    expect(forecast.days).toHaveLength(6);
    expect(hasWarning(forecast.warnings, 'daily.time')).toBe(true);
  });

  it('يُسقط التواريخ المكررة', () => {
    const payload = fixture();
    payload.daily.time[3] = payload.daily.time[2];
    const forecast = normalize(payload);
    expect(forecast.days).toHaveLength(6);
    expect(new Set(forecast.days.map((day) => day.date)).size).toBe(6);
  });

  it('يُسقط ما يخرج عن الترتيب التصاعدي', () => {
    const payload = fixture();
    payload.daily.time[4] = '2026-08-01';
    const forecast = normalize(payload);
    expect(forecast.days).toHaveLength(6);
    expect(forecast.days.map((day) => day.date)).toEqual(
      [...forecast.days.map((day) => day.date)].sort()
    );
  });

  it('الشروق بصيغة تالفة يُفرَّغ ولا يُسقط اليوم', () => {
    const payload = fixture();
    payload.daily.sunrise[0] = '06:02';
    const forecast = normalize(payload);
    expect(forecast.days[0].sunriseIso).toBeNull();
    expect(forecast.days[0].sunsetIso).toBe('2026-08-19T18:50');
    expect(hasWarning(forecast.warnings, 'daily.sunrise')).toBe(true);
  });

  it('يرفض الاستجابة بلا محور زمني صالح إطلاقًا', () => {
    const payload = fixture();
    payload.hourly.time = ['لا شيء', 'ولا هذا'];
    expect(() => normalize(payload)).toThrow(ProviderError);
  });
});

describe('وحدات current تُفحص مستقلة عن hourly', () => {
  it('انحراف وحدة في current وحده يُفرِّغ حقل اللقطة لا الساعات', () => {
    const payload = fixture();
    payload.current_units.wind_speed_10m = 'mp/h';
    const forecast = normalize(payload);

    expect(hasWarning(forecast.warnings, 'current.wind_speed_10m')).toBe(true);
    expect(forecast.current?.windSpeedKmh).toBeNull();
    expect(forecast.current?.windSeverity).toBeNull();
    // الساعات سليمة لأن hourly_units لم تتغير
    expect(forecast.days[0].windMaxKmh).toBe(20);
  });

  it('غياب كتلة current_units يُفرِّغ اللقطة ولا يستعير وحدات hourly', () => {
    const payload = fixture();
    delete (payload as Partial<ReturnType<typeof fixture>>).current_units;
    const forecast = normalize(payload);
    expect(forecast.current?.windSpeedKmh).toBeNull();
    expect(forecast.current?.humidity).toBeNull();
    expect(forecast.days[0].windMaxKmh).toBe(20);
  });

  it('قيمة current خارج المجال تُفرَّغ مع تحذير', () => {
    const payload = fixture();
    payload.current.relative_humidity_2m = 130;
    const forecast = normalize(payload);
    expect(forecast.current?.humidity).toBeNull();
    expect(hasWarning(forecast.warnings, 'current.relative_humidity_2m')).toBe(true);
  });

  it('وقت current بصيغة غير صالحة يُفرَّغ', () => {
    const payload = fixture();
    payload.current.time = '2026-08-19 03:00';
    const forecast = normalize(payload);
    expect(forecast.current?.timeIso).toBeNull();
    expect(hasWarning(forecast.warnings, 'current.time')).toBe(true);
  });
});

describe('المنطقة الزمنية حاجبة', () => {
  it('يرفض الاستجابة كاملة عند اختلاف المنطقة الزمنية', () => {
    const payload = fixture();
    payload.timezone = 'Europe/Berlin';
    expect(() => normalize(payload)).toThrow(/Europe\/Berlin/);
    expect(() => normalize(payload)).toThrow(ProviderError);
  });

  it('يرفض الاستجابة بلا منطقة زمنية', () => {
    const payload = fixture();
    delete (payload as Partial<ReturnType<typeof fixture>>).timezone;
    expect(() => normalize(payload)).toThrow(ProviderError);
  });

  it('نقص حقل منفرد يبقى تحذيرًا غير حاجب', () => {
    const payload = fixture();
    delete (payload.hourly as Record<string, unknown>).wind_gusts_10m;
    delete payload.hourly_units.wind_gusts_10m;
    const forecast = normalize(payload);
    expect(forecast.days).toHaveLength(7);
    expect(hasWarning(forecast.warnings, 'wind_gusts_10m')).toBe(true);
  });
});

describe('مقارنة الاتجاه اليومي بالمحسوب', () => {
  it('ينبّه عند تعارض اتجاه المزود مع المحسوب', () => {
    const payload = fixture();
    payload.daily.wind_direction_10m_dominant[0] = 180; // جنوبية بينما الساعات شمالية غربية
    const forecast = normalize(payload);

    expect(forecast.days[0].providerDominantDirection).toBe('S');
    expect(forecast.days[0].dominantDirection).toBe('NW');
    expect(hasWarning(forecast.warnings, 'يخالف المحسوب')).toBe(true);
  });

  it('لا ينبّه عند الاتفاق', () => {
    expect(hasWarning(normalize(fixture()).warnings, 'يخالف المحسوب')).toBe(false);
  });

  it('لا ينبّه على فرق قطاع واحد — أثر حدودي لا خلل', () => {
    const payload = fixture();
    payload.daily.wind_direction_10m_dominant[0] = 0; // شمالية، وهي جارة الشمالية الغربية
    const forecast = normalize(payload);

    expect(forecast.days[0].providerDominantDirection).toBe('N');
    expect(forecast.days[0].dominantDirection).toBe('NW');
    expect(hasWarning(forecast.warnings, 'يخالف المحسوب')).toBe(false);
  });

  it('ينبّه على التعاكس التام', () => {
    const payload = fixture();
    payload.daily.wind_direction_10m_dominant[0] = 135; // جنوبية شرقية مقابل شمالية غربية
    expect(hasWarning(normalize(payload).warnings, 'يخالف المحسوب')).toBe(true);
  });
});

describe('الحرارة واحتمال الهطول', () => {
  it('يقبل حدي صلاحية الحرارة بالضبط كما يقبلهما التخزين', () => {
    const payload = fixture();
    payload.daily.temperature_2m_max[0] = 60;
    payload.daily.temperature_2m_min[0] = -90;
    const forecast = normalize(payload);
    expect(forecast.days[0].temperatureMaxC).toBe(60);
    expect(forecast.days[0].temperatureMinC).toBe(-90);
    expect(forecast.warnings).toEqual([]);
  });
  it('يمرر العظمى والصغرى والاحتمال كما وصلت', () => {
    const [day] = normalize(fixture()).days;
    expect(day.temperatureMaxC).toBe(38.3);
    expect(day.temperatureMinC).toBe(31.4);
    expect(day.precipitationProbabilityMax).toBe(0);
  });

  it('يطلب الحقول الثلاثة من المزود', () => {
    const url = buildForecastUrl(LOCATION);
    expect(url).toContain('temperature_2m_max');
    expect(url).toContain('temperature_2m_min');
    expect(url).toContain('precipitation_probability_max');
  });

  it('الوحدة غير المتوقعة للحرارة تُفرغ الحقل ولا تُحوَّل صامتة', () => {
    const payload = fixture();
    payload.daily_units.temperature_2m_max = '°F';
    const forecast = normalize(payload);
    expect(hasWarning(forecast.warnings, 'temperature_2m_max')).toBe(true);
    expect(forecast.days[0].temperatureMaxC).toBeNull();
    // الصغرى سليمة الوحدة فتبقى
    expect(forecast.days[0].temperatureMinC).toBe(31.4);
  });

  it('الاحتمال خارج 0–100 يُفرَّغ', () => {
    const payload = fixture();
    payload.daily.precipitation_probability_max[0] = 130;
    payload.daily.precipitation_probability_max[1] = -5;
    const forecast = normalize(payload);
    expect(forecast.days[0].precipitationProbabilityMax).toBeNull();
    expect(forecast.days[1].precipitationProbabilityMax).toBeNull();
  });

  it('الحرارة خارج المجال الأرضي تُفرَّغ', () => {
    const payload = fixture();
    payload.daily.temperature_2m_max[0] = 999;
    expect(normalize(payload).days[0].temperatureMaxC).toBeNull();
  });

  it('العظمى الأقل من الصغرى تُفرِّغ الاثنتين مع تحذير', () => {
    const payload = fixture();
    payload.daily.temperature_2m_max[0] = 20;
    payload.daily.temperature_2m_min[0] = 35;
    const forecast = normalize(payload);
    expect(forecast.days[0].temperatureMaxC).toBeNull();
    expect(forecast.days[0].temperatureMinC).toBeNull();
    expect(hasWarning(forecast.warnings, 'أقل من الصغرى')).toBe(true);
  });

  it('غياب الحقول لا يحجب اليوم', () => {
    const payload = fixture();
    delete (payload.daily as Record<string, unknown>).temperature_2m_max;
    delete payload.daily_units.temperature_2m_max;
    const forecast = normalize(payload);
    expect(forecast.days).toHaveLength(7);
    expect(forecast.days[0].temperatureMaxC).toBeNull();
    expect(forecast.days[0].temperatureMinC).toBe(31.4);
  });
});

describe('اليوم ناقص الساعات', () => {
  it('ينبّه دون إسقاط اليوم', () => {
    const payload = fixture();
    payload.hourly.time = payload.hourly.time.slice(0, 20);
    const forecast = normalize(payload);
    expect(forecast.days[0].hours).toHaveLength(20);
    expect(hasWarning(forecast.warnings, '20 ساعة')).toBe(true);
  });
});
