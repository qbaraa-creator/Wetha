import { worseSeverity } from './severity';
import {
  degreeToDirection,
  getDirectionSeverity,
  getSpeedSeverity,
  getWindReasonCode
} from './wind';
import { getHumiditySeverity } from './humidity';
import { isoDatePart, isoHourPart, buildIso } from './time';
import type {
  DirectionSegment,
  HourlyWeatherPoint,
  TimeSegment
} from './types';

/** يبني نقطة ساعية بكل تصنيفاتها من القيم الخام (بلا تنعيم بعد). */
export function buildHourlyPoint(input: {
  timeIso: string;
  humidity: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  windDegree: number | null;
}): HourlyWeatherPoint {
  const direction = input.windDegree === null ? null : degreeToDirection(input.windDegree);
  const directionSeverity = direction === null ? null : getDirectionSeverity(direction);
  const speedSeverity = input.windSpeedKmh === null ? null : getSpeedSeverity(input.windSpeedKmh);
  const windSeverity =
    directionSeverity === null || speedSeverity === null
      ? null
      : worseSeverity(directionSeverity, speedSeverity);

  return {
    timeIso: input.timeIso,
    localDate: isoDatePart(input.timeIso),
    localHour: isoHourPart(input.timeIso),
    humidity: input.humidity,
    windSpeedKmh: input.windSpeedKmh,
    windGustKmh: input.windGustKmh,
    windDegree: input.windDegree,
    direction,
    rawDirection: direction,
    directionSmoothed: false,
    directionSeverity,
    speedSeverity,
    windSeverity,
    humiditySeverity: input.humidity === null ? null : getHumiditySeverity(input.humidity)
  };
}

/**
 * القسم 5.6 — تنعيم تذبذب الاتجاه.
 * ساعة وحيدة باتجاه مختلف محاطة باتجاه واحد تُدمج معه، ويُعاد حساب لونها من الاتجاه الجديد
 * (قرار التنفيذ: الدمج يغيّر الاتجاه واللون معًا، ولذلك وُضع استثناء الساعة الحمراء).
 * الساعة التي حالتها الخام حمراء لا تُدمج أبدًا حتى تبقى ظاهرة.
 */
export function smoothDirectionJitter(points: HourlyWeatherPoint[]): HourlyWeatherPoint[] {
  const output = points.map((point) => ({ ...point }));

  for (let index = 1; index < output.length - 1; index += 1) {
    const previous = output[index - 1];
    const current = output[index];
    const next = output[index + 1];

    if (!previous.direction || !current.direction || !next.direction) continue;
    if (current.direction === previous.direction) continue;
    if (previous.direction !== next.direction) continue;
    if (current.windSeverity === 'red') continue;

    const merged = previous.direction;
    const directionSeverity = getDirectionSeverity(merged);
    current.direction = merged;
    current.directionSmoothed = true;
    current.directionSeverity = directionSeverity;
    current.windSeverity =
      current.speedSeverity === null
        ? null
        : worseSeverity(directionSeverity, current.speedSeverity);
  }

  return output;
}

interface RunBoundaries {
  start: number;
  endExclusive: number;
}

function collectRuns<T>(
  points: HourlyWeatherPoint[],
  keyOf: (point: HourlyWeatherPoint) => T | null
): Array<RunBoundaries & { key: T }> {
  const runs: Array<RunBoundaries & { key: T }> = [];

  for (let index = 0; index < points.length; index += 1) {
    const key = keyOf(points[index]);
    if (key === null) continue;

    const last = runs[runs.length - 1];
    if (last && last.endExclusive === index && last.key === key) {
      last.endExclusive = index + 1;
      continue;
    }
    runs.push({ key, start: index, endExclusive: index + 1 });
  }

  return runs;
}

function segmentBounds(points: HourlyWeatherPoint[], run: RunBoundaries) {
  const first = points[run.start];
  const last = points[run.endExclusive - 1];
  const endHourExclusive = last.localHour + 1;
  return {
    startIso: first.timeIso,
    endIsoExclusive: buildIso(first.localDate, endHourExclusive),
    startHour: first.localHour,
    endHourExclusive
  };
}

/**
 * القسم 5.7 — فترة رياح واحدة طالما بقي قطاع الاتجاه وحالة الرياح المركبة ثابتين.
 * الساعات ناقصة البيانات تقطع الفترة ولا تدخل فيها (القسم 16).
 */
export function buildWindSegments(points: HourlyWeatherPoint[]): TimeSegment[] {
  const runs = collectRuns(points, (point) =>
    point.direction === null || point.windSeverity === null || point.windSpeedKmh === null
      ? null
      : `${point.direction}|${point.windSeverity}`
  );

  return runs.map((run) => {
    const slice = points.slice(run.start, run.endExclusive);
    const speeds = slice.map((point) => point.windSpeedKmh as number);
    const bounds = segmentBounds(points, run);
    const direction = slice[0].direction!;

    let peakGustKmh: number | undefined;
    let peakGustTimeIso: string | undefined;
    slice.forEach((point) => {
      if (point.windGustKmh === null) return;
      if (peakGustKmh === undefined || point.windGustKmh > peakGustKmh) {
        peakGustKmh = point.windGustKmh;
        peakGustTimeIso = point.timeIso;
      }
    });

    const representativeSpeed = Math.min(...speeds);

    return {
      ...bounds,
      severity: slice[0].windSeverity!,
      direction,
      minValue: Math.min(...speeds),
      maxValue: Math.max(...speeds),
      peakGustKmh,
      peakGustTimeIso,
      reasonCode: getWindReasonCode(direction, representativeSpeed)
    };
  });
}

/** القسم 6.2 — تجميع الساعات المتجاورة ذات لون الرطوبة نفسه؛ فترة الساعة الواحدة لا تُخفى. */
export function buildHumiditySegments(points: HourlyWeatherPoint[]): TimeSegment[] {
  const runs = collectRuns(points, (point) =>
    point.humiditySeverity === null || point.humidity === null ? null : point.humiditySeverity
  );

  return runs.map((run) => {
    const slice = points.slice(run.start, run.endExclusive);
    const values = slice.map((point) => point.humidity as number);
    return {
      ...segmentBounds(points, run),
      severity: run.key,
      minValue: Math.min(...values),
      maxValue: Math.max(...values)
    };
  });
}

/** فترات الاتجاه وحده — لسرد «شمالية غربية من … ثم غربية من …» (القسم 5.6). */
export function buildDirectionSegments(points: HourlyWeatherPoint[]): DirectionSegment[] {
  const runs = collectRuns(points, (point) => point.direction);
  return runs.map((run) => {
    const slice = points.slice(run.start, run.endExclusive);
    return {
      startHour: slice[0].localHour,
      endHourExclusive: slice[slice.length - 1].localHour + 1,
      direction: run.key
    };
  });
}
