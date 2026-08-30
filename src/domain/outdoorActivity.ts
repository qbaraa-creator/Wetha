import { HUMIDITY_THRESHOLDS, SPEED_THRESHOLDS } from '../config/appConfig';
import type { HourlyWeatherPoint } from './types';

export interface ActivityWindow {
  startHour: number;
  endHourExclusive: number;
}

/**
 * ساعة مناسبة للنشاط الخارجي فقط عندما تتزامن الشروط الثلاثة:
 * اتجاه شمالي/شمالي غربي، سرعة ضمن المجال الأخضر، ورطوبة ضمن المجال الأخضر.
 */
export function isOutdoorActivityHour(point: HourlyWeatherPoint): boolean {
  const directionSuitable = point.direction === 'N' || point.direction === 'NW';
  const speedSuitable =
    point.windSpeedKmh !== null &&
    point.windSpeedKmh >= SPEED_THRESHOLDS.greenMinKmh &&
    point.windSpeedKmh < SPEED_THRESHOLDS.strongMinKmh;
  const humiditySuitable =
    point.humidity !== null && point.humidity < HUMIDITY_THRESHOLDS.greenMaxExclusive;

  return directionSuitable && speedSuitable && humiditySuitable;
}

/** يجمع الساعات المناسبة المتتالية في فترات، مع إمكان استبعاد ساعات اليوم الماضية. */
export function findOutdoorActivityWindows(
  hours: HourlyWeatherPoint[],
  fromHour = 0
): ActivityWindow[] {
  const suitableHours = new Set(
    hours
      .filter((point) => point.localHour >= fromHour && isOutdoorActivityHour(point))
      .map((point) => point.localHour)
  );

  const windows: ActivityWindow[] = [];
  let start: number | null = null;

  for (let hour = Math.max(0, Math.floor(fromHour)); hour <= 24; hour += 1) {
    const suitable = hour < 24 && suitableHours.has(hour);
    if (suitable && start === null) start = hour;
    if (!suitable && start !== null) {
      windows.push({ startHour: start, endHourExclusive: hour });
      start = null;
    }
  }

  return windows;
}
