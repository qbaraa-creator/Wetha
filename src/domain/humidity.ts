import { HUMIDITY_THRESHOLDS } from '../config/appConfig';
import type { Severity } from './types';

/** القسم 6.1 — التصنيف الساعي للرطوبة بالقيمة الخام قبل أي تقريب. */
export function getHumiditySeverity(humidity: number): Severity {
  if (humidity < HUMIDITY_THRESHOLDS.greenMaxExclusive) return 'green';
  if (humidity <= HUMIDITY_THRESHOLDS.orangeMaxInclusive) return 'orange';
  return 'red';
}
