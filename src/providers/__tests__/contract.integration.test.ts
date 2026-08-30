import { describe, expect, it } from 'vitest';
import { buildForecastUrl, normalizeOpenMeteoResponse } from '../openMeteo';
import { LOCATION } from '../../config/appConfig';

/**
 * اختبار تكامل يتحقق من عقد المزود الفعلي — خاصة وحدة `moon_phase` (القسم 7.2).
 * لا يعمل افتراضيًا حتى لا يعتمد بناء المشروع على الشبكة:
 *   RUN_INTEGRATION=1 npm test
 */
const enabled = process.env.RUN_INTEGRATION === '1';

describe.runIf(enabled)('عقد Open-Meteo الفعلي', () => {
  it('يعيد الحقول والوحدات المتوقعة', async () => {
    const response = await fetch(buildForecastUrl(LOCATION));
    expect(response.ok).toBe(true);

    const payload = await response.json();
    expect(payload.timezone).toBe('Asia/Riyadh');
    expect(payload.hourly_units.wind_speed_10m).toBe('km/h');
    expect(payload.hourly_units.relative_humidity_2m).toBe('%');
    expect(payload.hourly_units.wind_direction_10m).toBe('°');
    expect(payload.hourly_units.wind_gusts_10m).toBe('km/h');
    expect(payload.daily_units.moon_phase).toBe('fraction');
    // كتلة current_units تُفحص مستقلة في التطبيع، فلا بد أن يعيدها المزود فعلًا
    expect(payload.current_units.wind_speed_10m).toBe('km/h');
    expect(payload.current_units.relative_humidity_2m).toBe('%');
    expect(payload.current_units.wind_direction_10m).toBe('°');
    expect(payload.current_units.wind_gusts_10m).toBe('km/h');
    expect(payload.daily.time).toHaveLength(7);
    expect(payload.hourly.time).toHaveLength(7 * 24);

    payload.daily.moon_phase.forEach((phase: number) => {
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThanOrEqual(1);
    });
  }, 20_000);

  /* التشديد لا ينفع إن أطلق تحذيرات على استجابة سليمة؛ هذا ما يقيسه الاختبار. */
  it('يمر بالتطبيع المشدَّد بلا تحذيرات', async () => {
    const response = await fetch(buildForecastUrl(LOCATION));
    const payload = await response.json();
    const forecast = normalizeOpenMeteoResponse(payload, LOCATION, new Date().toISOString());

    expect(forecast.warnings).toEqual([]);
    expect(forecast.days).toHaveLength(7);
    expect(forecast.days.every((day) => day.hours.length === 24)).toBe(true);
    expect(forecast.current).not.toBeNull();
    expect(forecast.timezone).toBe(LOCATION.timezone);
  }, 20_000);
});
