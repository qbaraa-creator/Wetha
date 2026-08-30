import { buildHourlyPoint } from '../segments';
import { buildIso } from '../time';
import type { HourlyWeatherPoint } from '../types';

export const DIRECTION_DEGREES = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315
} as const;

export interface HourSpec {
  direction?: keyof typeof DIRECTION_DEGREES | null;
  speed?: number | null;
  gust?: number | null;
  humidity?: number | null;
}

export function makeHours(date: string, specs: HourSpec[]): HourlyWeatherPoint[] {
  return specs.map((spec, index) =>
    buildHourlyPoint({
      timeIso: buildIso(date, index),
      humidity: spec.humidity ?? null,
      windSpeedKmh: spec.speed ?? null,
      windGustKmh: spec.gust ?? null,
      windDegree:
        spec.direction === null || spec.direction === undefined
          ? null
          : DIRECTION_DEGREES[spec.direction]
    })
  );
}

/** يوم كامل 24 ساعة بقيم ثابتة، مع إمكانية استبدال ساعات محددة. */
export function makeFullDay(
  date: string,
  base: HourSpec,
  overrides: Record<number, HourSpec> = {}
): HourlyWeatherPoint[] {
  const specs = Array.from({ length: 24 }, (_, hour) => ({ ...base, ...overrides[hour] }));
  return makeHours(date, specs);
}
