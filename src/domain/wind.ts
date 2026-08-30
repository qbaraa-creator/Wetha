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

/** القسم 5.2 — لون السرعة وحدها. */
export function getSpeedSeverity(speedKmh: number): Severity {
  if (speedKmh <= SPEED_THRESHOLDS.redMaxKmh) return 'red';
  if (speedKmh <= SPEED_THRESHOLDS.orangeMaxKmh) return 'orange';
  return 'green';
}

/** القسم 5.3 — حالة الرياح المركبة = الأسوأ بين لون الاتجاه ولون السرعة. */
export function getWindSeverity(direction: DirectionCode, speedKmh: number): Severity {
  return worseSeverity(getDirectionSeverity(direction), getSpeedSeverity(speedKmh));
}

/** سبب اللون بلغة قصيرة (القسم 5.7). */
export function getWindReasonCode(direction: DirectionCode, speedKmh: number): WindReasonCode {
  const speedSeverity = getSpeedSeverity(speedKmh);
  const directionSeverity = getDirectionSeverity(direction);
  const final = worseSeverity(directionSeverity, speedSeverity);

  if (final === 'red') {
    return speedSeverity === 'red' ? 'speed-low' : 'direction-red';
  }
  if (final === 'orange') {
    return speedSeverity === 'orange' ? 'speed-mid' : 'direction-orange';
  }
  return 'direction-and-speed-ok';
}

export function describeWindReason(code: WindReasonCode, direction?: DirectionCode): string {
  switch (code) {
    case 'speed-low':
      return `السرعة ${SPEED_THRESHOLDS.redMaxKmh} كم/س أو أقل`;
    case 'speed-mid':
      return `السرعة بين ${SPEED_THRESHOLDS.redMaxKmh} و${SPEED_THRESHOLDS.orangeMaxKmh}`;
    case 'direction-red':
      return direction ? `اتجاه ${DIRECTION_NAMES_AR[direction]}` : 'اتجاه غير مناسب';
    case 'direction-orange':
      return direction ? `اتجاه ${DIRECTION_NAMES_AR[direction]}` : 'اتجاه متوسط';
    case 'direction-and-speed-ok':
      return 'اتجاه وسرعة مناسبان';
  }
}
