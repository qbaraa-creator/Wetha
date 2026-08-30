import { LOCATION } from '../config/appConfig';
import { normalizeOpenMeteoResponse } from '../providers/openMeteo';
import { fixture } from '../providers/__tests__/openMeteoFixture';
import type { NormalizedForecast } from '../domain/types';

export const TEST_NOW = '2026-08-19T09:00:00.000Z';

export function makeTestForecast(): NormalizedForecast {
  return normalizeOpenMeteoResponse(fixture(), LOCATION, TEST_NOW);
}
