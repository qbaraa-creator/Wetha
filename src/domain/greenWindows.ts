import type { HourlyWeatherPoint } from './types';

export type GreenMetric = 'wind' | 'humidity';

export interface GreenWindow {
  startHour: number;
  endHourExclusive: number;
}

/**
 * يجمع الساعات الخضراء المتتالية في نطاقات سهلة القراءة.
 * يبقى مسارا الرياح والرطوبة مستقلين؛ الدمج هنا زمني فقط ولا يصنع «تقييم طقس عام».
 */
export function findGreenWindows(
  hours: HourlyWeatherPoint[],
  metric: GreenMetric,
  fromHour = 0
): GreenWindow[] {
  const severityKey = metric === 'wind' ? 'windSeverity' : 'humiditySeverity';
  const greenHours = new Set(
    hours
      .filter((point) => point.localHour >= fromHour && point[severityKey] === 'green')
      .map((point) => point.localHour)
  );

  const windows: GreenWindow[] = [];
  let start: number | null = null;

  for (let hour = Math.max(0, Math.floor(fromHour)); hour <= 24; hour += 1) {
    const isGreen = hour < 24 && greenHours.has(hour);
    if (isGreen && start === null) start = hour;
    if (!isGreen && start !== null) {
      windows.push({ startHour: start, endHourExclusive: hour });
      start = null;
    }
  }

  return windows;
}

