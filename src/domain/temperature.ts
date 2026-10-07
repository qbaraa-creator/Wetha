import { TEMPERATURE_THRESHOLDS_C } from '../config/appConfig';
import type { Severity } from './types';

/** تصنيف الحرارة الساعية بالقيمة الخام قبل أي تقريب. */
export function getTemperatureSeverity(temperatureC: number): Severity {
  if (temperatureC < TEMPERATURE_THRESHOLDS_C.greenMaxExclusive) return 'green';
  if (temperatureC < TEMPERATURE_THRESHOLDS_C.redMinInclusive) return 'orange';
  return 'red';
}
