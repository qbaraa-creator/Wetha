import type { LocationConfig } from '../config/appConfig';
import type { NormalizedForecast } from '../domain/types';

/**
 * القسم 12.4 — طبقة مزود مستقلة.
 * مكونات الواجهة لا تقرأ استجابة أي مزود مباشرة؛ تقرأ NormalizedForecast فقط.
 */
export interface WeatherProvider {
  readonly id: string;
  getSevenDayForecast(location: LocationConfig): Promise<NormalizedForecast>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly transient: boolean
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
