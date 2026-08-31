import { getHumiditySeverity } from './humidity';
import { worseSeverity } from './severity';
import { DIRECTION_NAMES_AR, getDirectionSeverity, getSpeedBand, getSpeedSeverity } from './wind';
import type { HourlyWeatherPoint, Severity } from './types';

export type ActivityReasonCode =
  | 'direction'
  | 'speed-low'
  | 'speed-strong'
  | 'speed-severe'
  | 'humidity-elevated'
  | 'humidity-high';

export interface ActivityReason {
  code: ActivityReasonCode;
  severity: 'orange' | 'red';
}

export interface ActivityAssessment {
  /** null يعني أن معيارًا لازمًا مفقود، ولو عُرف سبب آخر لعدم المطابقة. */
  severity: Severity | null;
  reasons: ActivityReason[];
  missing: string[];
}

export const ACTIVITY_REASON_LABELS: Record<ActivityReasonCode, string> = {
  direction: 'اتجاه غير مفضّل',
  'speed-low': 'رياح أقل من المفضّل',
  'speed-strong': 'رياح قوية',
  'speed-severe': 'رياح شديدة',
  'humidity-elevated': 'رطوبة أعلى من المفضّل',
  'humidity-high': 'رطوبة مرتفعة'
};

/** تقييم تفضيلات، لا تقييم سلامة: المصدر المشترك للشريط ونوافذ الأنشطة. */
export function assessActivityHour(point: HourlyWeatherPoint): ActivityAssessment {
  const reasons: ActivityReason[] = [];
  const missing: string[] = [];
  let severity: Severity = 'green';
  const add = (value: Severity, code: ActivityReasonCode) => {
    severity = worseSeverity(severity, value);
    if (value !== 'green') reasons.push({ code, severity: value });
  };

  if (point.direction === null) missing.push('اتجاه الرياح');
  else add(getDirectionSeverity(point.direction), 'direction');

  if (
    point.windSpeedKmh === null ||
    !Number.isFinite(point.windSpeedKmh) ||
    point.windSpeedKmh < 0
  ) {
    missing.push('سرعة الرياح');
  } else {
    const band = getSpeedBand(point.windSpeedKmh);
    if (band !== 'green') {
      add(getSpeedSeverity(point.windSpeedKmh, point.direction), `speed-${band}`);
    }
  }

  if (
    point.humidity === null ||
    !Number.isFinite(point.humidity) ||
    point.humidity < 0 ||
    point.humidity > 100
  ) {
    missing.push('الرطوبة');
  } else {
    const humiditySeverity = getHumiditySeverity(point.humidity);
    add(humiditySeverity, humiditySeverity === 'red' ? 'humidity-high' : 'humidity-elevated');
  }

  return {
    severity: missing.length ? null : severity,
    // تقديم الأسباب الأشد لا يعني إسقاط بقية الأسباب.
    reasons: reasons.sort((a, b) => Number(b.severity === 'red') - Number(a.severity === 'red')),
    missing
  };
}

export function describeActivityAssessment(
  assessment: ActivityAssessment,
  point?: HourlyWeatherPoint
): string {
  if (assessment.severity === 'green') return 'مطابق لشروطك';
  const parts = assessment.reasons.map((reason) =>
    reason.code === 'direction' && point?.direction
      ? `${ACTIVITY_REASON_LABELS[reason.code]}: ${DIRECTION_NAMES_AR[point.direction]}`
      : ACTIVITY_REASON_LABELS[reason.code]
  );
  if (assessment.missing.length) {
    parts.unshift(`تقييم غير مكتمل — بيانات غير متاحة: ${assessment.missing.join('، ')}`);
  }
  return parts.join(' · ');
}

export interface ActivityWindow {
  startHour: number;
  endHourExclusive: number;
}

/**
 * ساعة مناسبة للنشاط الخارجي فقط عندما تتزامن الشروط الثلاثة:
 * اتجاه شمالي/شمالي غربي، سرعة ضمن المجال الأخضر، ورطوبة ضمن المجال الأخضر.
 */
export function isOutdoorActivityHour(point: HourlyWeatherPoint): boolean {
  return assessActivityHour(point).severity === 'green';
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
