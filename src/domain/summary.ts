import { DOMINANT_DIRECTION_MIN_SHARE } from '../config/appConfig';
import {
  buildDirectionSegments,
  buildHumiditySegments,
  buildWindSegments,
  smoothDirectionJitter
} from './segments';
import type { DailySummary, DirectionCode, HourlyWeatherPoint, Severity } from './types';

const EMPTY_COUNTS = (): Record<Severity, number> => ({ green: 0, orange: 0, red: 0 });

export interface DominantDirectionResult {
  dominantDirection: DirectionCode | null;
  variableDirections?: [DirectionCode, DirectionCode];
}

/**
 * القسم 5.5 — الاتجاه العام يُحسب من الساعات بعد التنعيم.
 * التعادل يُرجّح بمجموع سرعات الرياح، وإذا لم يبلغ الأول 50% من الساعات الصالحة فالرياح متقلبة.
 */
export function resolveDominantDirection(points: HourlyWeatherPoint[]): DominantDirectionResult {
  const counts = new Map<DirectionCode, { hours: number; speedSum: number }>();
  let validHours = 0;

  points.forEach((point) => {
    if (!point.direction) return;
    validHours += 1;
    const entry = counts.get(point.direction) ?? { hours: 0, speedSum: 0 };
    entry.hours += 1;
    entry.speedSum += point.windSpeedKmh ?? 0;
    counts.set(point.direction, entry);
  });

  if (validHours === 0 || counts.size === 0) {
    return { dominantDirection: null };
  }

  const ordered = [...counts.entries()].sort((a, b) => {
    if (b[1].hours !== a[1].hours) return b[1].hours - a[1].hours;
    return b[1].speedSum - a[1].speedSum;
  });

  const [topDirection, topEntry] = ordered[0];
  if (topEntry.hours / validHours >= DOMINANT_DIRECTION_MIN_SHARE || ordered.length === 1) {
    return { dominantDirection: topDirection };
  }

  return {
    dominantDirection: null,
    variableDirections: [topDirection, ordered[1][0]]
  };
}

export interface AstronomyInput {
  sunriseIso: string | null;
  sunsetIso: string | null;
  moonPhaseIndex: number | null;
  providerDominantDirection: DirectionCode | null;
}

/** القسمان 6.3 و10.3 — ملخص اليوم الكامل. القيم المفقودة لا تدخل أي متوسط أو مقارنة. */
export function buildDailySummary(
  date: string,
  rawPoints: HourlyWeatherPoint[],
  astronomy: AstronomyInput
): DailySummary {
  const hours = smoothDirectionJitter(rawPoints);

  const speeds = hours
    .map((point) => point.windSpeedKmh)
    .filter((value): value is number => value !== null);

  let gustMaxKmh: number | null = null;
  let gustMaxTimeIso: string | null = null;
  hours.forEach((point) => {
    if (point.windGustKmh === null) return;
    if (gustMaxKmh === null || point.windGustKmh > gustMaxKmh) {
      gustMaxKmh = point.windGustKmh;
      gustMaxTimeIso = point.timeIso;
    }
  });

  const windHoursBySeverity = EMPTY_COUNTS();
  hours.forEach((point) => {
    if (point.windSeverity) windHoursBySeverity[point.windSeverity] += 1;
  });

  const humidityHoursBySeverity = EMPTY_COUNTS();
  let humidityMin: number | null = null;
  let humidityMax: number | null = null;
  let humidityMinTimeIso: string | null = null;
  let humidityMaxTimeIso: string | null = null;
  let humiditySum = 0;
  let humidityCount = 0;

  hours.forEach((point) => {
    if (point.humiditySeverity) humidityHoursBySeverity[point.humiditySeverity] += 1;
    if (point.humidity === null) return;
    humiditySum += point.humidity;
    humidityCount += 1;
    if (humidityMin === null || point.humidity < humidityMin) {
      humidityMin = point.humidity;
      humidityMinTimeIso = point.timeIso;
    }
    if (humidityMax === null || point.humidity > humidityMax) {
      humidityMax = point.humidity;
      humidityMaxTimeIso = point.timeIso;
    }
  });

  const { dominantDirection, variableDirections } = resolveDominantDirection(hours);

  return {
    date,
    dominantDirection,
    variableDirections,
    windMinKmh: speeds.length ? Math.min(...speeds) : null,
    windMaxKmh: speeds.length ? Math.max(...speeds) : null,
    gustMaxKmh,
    gustMaxTimeIso,
    windHoursBySeverity,
    humidityMin,
    humidityMean: humidityCount ? humiditySum / humidityCount : null,
    humidityMax,
    humidityMinTimeIso,
    humidityMaxTimeIso,
    humidityHoursBySeverity,
    windSegments: buildWindSegments(hours),
    humiditySegments: buildHumiditySegments(hours),
    directionSegments: buildDirectionSegments(hours),
    sunriseIso: astronomy.sunriseIso,
    sunsetIso: astronomy.sunsetIso,
    moonPhaseIndex: astronomy.moonPhaseIndex,
    hours,
    providerDominantDirection: astronomy.providerDominantDirection
  };
}
