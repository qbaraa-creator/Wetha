/**
 * تجهيزة استجابة Open-Meteo السليمة — يشترك فيها اختبار المزود واختبار التخزين،
 * فيبقى شكل «البيانات الصحيحة» معرّفًا في مكان واحد.
 */
const DATES = Array.from({ length: 7 }, (_, index) => `2026-08-${19 + index}`);
const HOURS = DATES.flatMap((date) =>
  Array.from({ length: 24 }, (_, hour) => `${date}T${String(hour).padStart(2, '0')}:00`)
);

/** استجابة سليمة كاملة: سبعة أيام × ٢٤ ساعة، بكل كتل الوحدات التي يعيدها المزود. */
export function fixture() {
  return {
    timezone: 'Asia/Riyadh',
    hourly_units: {
      relative_humidity_2m: '%',
      wind_speed_10m: 'km/h',
      wind_direction_10m: '°',
      wind_gusts_10m: 'km/h'
    } as Record<string, string>,
    daily_units: {
      sunrise: 'iso8601',
      sunset: 'iso8601',
      moon_phase: 'fraction',
      wind_direction_10m_dominant: '°'
    } as Record<string, string>,
    current_units: {
      relative_humidity_2m: '%',
      wind_speed_10m: 'km/h',
      wind_direction_10m: '°',
      wind_gusts_10m: 'km/h'
    } as Record<string, string>,
    current: {
      time: '2026-08-19T03:00',
      relative_humidity_2m: 74,
      wind_speed_10m: 12,
      wind_direction_10m: 315,
      wind_gusts_10m: 26
    } as Record<string, number | string | null>,
    hourly: {
      time: [...HOURS],
      relative_humidity_2m: HOURS.map(() => 74) as Array<number | null | undefined>,
      wind_speed_10m: HOURS.map(() => 20) as Array<number | null | undefined>,
      wind_direction_10m: HOURS.map(() => 315) as Array<number | null | undefined>,
      wind_gusts_10m: HOURS.map(() => 31) as Array<number | null | undefined>
    },
    daily: {
      time: [...DATES],
      sunrise: DATES.map((date) => `${date}T06:02`) as Array<string | null>,
      sunset: DATES.map((date) => `${date}T18:50`) as Array<string | null>,
      moon_phase: DATES.map(() => 0.227) as Array<number | null>,
      wind_speed_10m_max: DATES.map(() => 20),
      wind_gusts_10m_max: DATES.map(() => 31),
      wind_direction_10m_dominant: DATES.map(() => 331) as Array<number | null>
    }
  };
}
