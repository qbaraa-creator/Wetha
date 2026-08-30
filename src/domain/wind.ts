import { DIRECTION_SEVERITY, SPEED_THRESHOLDS } from '../config/appConfig';
import { worseSeverity } from './severity';
import type { DirectionCode, Severity, WindReasonCode } from './types';

const SECTORS: DirectionCode[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export const DIRECTION_NAMES_AR: Record<DirectionCode, string> = {
  N: 'شمالية',
  NE: 'شمالية شرقية',
  E: 'شرقية',
  SE: 'جنوبية شرقية',
  S: 'جنوبية',
  SW: 'جنوبية غربية',
  W: 'غربية',
  NW: 'شمالية غربية'
};

/** تطبيع الدرجة إلى المجال [0, 360). */
export function normalizeDegrees(value: number): number {
  const remainder = value % 360;
  return remainder < 0 ? remainder + 360 : remainder;
}

/** القسم 5.1 — تقريب الدرجة إلى أحد ثمانية قطاعات. */
export function degreeToDirection(value: number): DirectionCode {
  const index = Math.floor((normalizeDegrees(value) + 22.5) / 45) % 8;
  return SECTORS[index];
}

export function getDirectionSeverity(direction: DirectionCode): Severity {
  return DIRECTION_SEVERITY[direction];
}

/**
 * حالة وصف يضم أكثر من اتجاه — مثل «متقلبة · شمالية غربية / شمالية».
 * نأخذ الحالة الأشد بين الاتجاهات؛ فإذا كانا أخضرين تبقى الشارة خضراء،
 * ولا تصبح محايدة لمجرد غياب اتجاه سائد واحد.
 */
export function getCombinedDirectionSeverity(
  directions: DirectionCode[] | undefined
): Severity | null {
  if (!directions?.length) return null;
  return directions
    .map(getDirectionSeverity)
    .reduce((combined, severity) => worseSeverity(combined, severity));
}

export type WindSpeedBand = 'low' | 'green' | 'strong' | 'severe';

/** النطاق الوصفي للسرعة؛ يبقي «منخفضة» و«شديدة» منفصلتين رغم أن لونهما أحمر. */
export function getSpeedBand(speedKmh: number): WindSpeedBand {
  if (speedKmh < SPEED_THRESHOLDS.greenMinKmh) return 'low';
  if (speedKmh < SPEED_THRESHOLDS.strongMinKmh) return 'green';
  if (speedKmh < SPEED_THRESHOLDS.severeMinKmh) return 'strong';
  return 'severe';
}

/** لون السرعة وحدها: منخفضة/شديدة أحمر، المناسبة أخضر، والقوية برتقالي. */
export function getSpeedSeverity(speedKmh: number): Severity {
  const band = getSpeedBand(speedKmh);
  if (band === 'green') return 'green';
  if (band === 'strong') return 'orange';
  return 'red';
}

/** القسم 5.3 — حالة الرياح المركبة = الأسوأ بين لون الاتجاه ولون السرعة. */
export function getWindSeverity(direction: DirectionCode, speedKmh: number): Severity {
  return worseSeverity(getDirectionSeverity(direction), getSpeedSeverity(speedKmh));
}

/** سبب اللون بلغة قصيرة (القسم 5.7). */
export function getWindReasonCode(direction: DirectionCode, speedKmh: number): WindReasonCode {
  const speedBand = getSpeedBand(speedKmh);
  const speedSeverity = getSpeedSeverity(speedKmh);
  const directionSeverity = getDirectionSeverity(direction);
  const final = worseSeverity(directionSeverity, speedSeverity);

  if (final === 'red') {
    if (speedBand === 'low') return 'speed-low';
    if (speedBand === 'severe') return 'speed-severe';
    return 'direction-red';
  }
  if (final === 'orange') {
    return speedBand === 'strong' ? 'speed-strong' : 'direction-orange';
  }
  return 'direction-and-speed-ok';
}

export function describeWindReason(code: WindReasonCode, direction?: DirectionCode): string {
  switch (code) {
    case 'speed-low':
      return `السرعة أقل من ${SPEED_THRESHOLDS.greenMinKmh} كم/س`;
    case 'speed-strong':
      return `رياح قوية من ${SPEED_THRESHOLDS.strongMinKmh} إلى أقل من ${SPEED_THRESHOLDS.severeMinKmh} كم/س`;
    case 'speed-severe':
      return `رياح شديدة ${SPEED_THRESHOLDS.severeMinKmh} كم/س فأكثر`;
    case 'direction-red':
      return direction ? `اتجاه ${DIRECTION_NAMES_AR[direction]}` : 'اتجاه غير مناسب';
    case 'direction-orange':
      return direction ? `اتجاه ${DIRECTION_NAMES_AR[direction]}` : 'اتجاه متوسط';
    case 'direction-and-speed-ok':
      return 'اتجاه وسرعة مناسبان';
  }
}
