import { STORAGE_SCHEMA_VERSION, TEMPERATURE_LIMITS_C } from '../config/appConfig';
import { isValidDateIso, isValidHourIso, isValidInstantIso } from '../domain/time';
import type {
  CurrentConditions,
  DailySummary,
  DirectionCode,
  DirectionSegment,
  HourlyWeatherPoint,
  NormalizedForecast,
  Severity,
  TimeSegment
} from '../domain/types';

/**
 * مدقق Runtime لما يُقرأ من IndexedDB أو localStorage.
 *
 * ما يُخزَّن اليوم كتبه إصدار سابق من التطبيق، أو عبثت به يد، أو حُفظ ناقصًا
 * عند إغلاق التبويب. `days.length` وحده لا يقول إن الشكل سليم: يوم بلا
 * `windHoursBySeverity` يُسقط صفحة الأسبوع، و`hours` بلا `localHour` يُفرغ
 * كل الأشرطة. لذا يُتحقق من كل حقل يقرأه العرض قبل قبول السجل.
 *
 * القاعدة: أي انحراف يعني رفض السجل كله والعودة للشبكة — لا ترقيع جزئي،
 * لأن نصف توقع صامت أسوأ من غيابه.
 */

const DIRECTIONS = new Set<string>(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
const SEVERITIES = new Set<string>(['green', 'orange', 'red']);
const SEVERITY_KEYS: Severity[] = ['green', 'orange', 'red'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isNullableNumber = (value: unknown): value is number | null =>
  value === null || isFiniteNumber(value);

const isNullableTemperature = (value: unknown): value is number | null =>
  value === null ||
  (isFiniteNumber(value) && value >= TEMPERATURE_LIMITS_C.min && value <= TEMPERATURE_LIMITS_C.max);

const isNullableHourIso = (value: unknown): value is string | null =>
  value === null || isValidHourIso(value);

const END_OF_DAY_ISO = /^\d{4}-\d{2}-\d{2}T24:00(:00)?$/;

/**
 * نهاية الفترة حصرية، والنموذج الداخلي يكتب منتصف ليل اليوم التالي `T24:00`
 * (انظر `buildIso`)، وهي ساعة لا يقبلها فحص الطوابع الساعية العادي.
 */
const isExclusiveEndIso = (value: unknown): value is string =>
  isValidHourIso(value) ||
  (typeof value === 'string' && END_OF_DAY_ISO.test(value) && isValidDateIso(value.slice(0, 10)));

const isDirection = (value: unknown): value is DirectionCode =>
  typeof value === 'string' && DIRECTIONS.has(value);

const isNullableDirection = (value: unknown): value is DirectionCode | null =>
  value === null || isDirection(value);

const isSeverity = (value: unknown): value is Severity =>
  typeof value === 'string' && SEVERITIES.has(value);

const isNullableSeverity = (value: unknown): value is Severity | null =>
  value === null || isSeverity(value);

/** عدّاد ساعات لكل لون: الأعداد الثلاثة موجودة وصحيحة وغير سالبة. */
function isSeverityCounts(value: unknown): value is Record<Severity, number> {
  if (!isRecord(value)) return false;
  return SEVERITY_KEYS.every((key) => {
    const count = value[key];
    return isFiniteNumber(count) && count >= 0 && Number.isInteger(count) && count <= 24;
  });
}

function isHourlyPoint(value: unknown): value is HourlyWeatherPoint {
  if (!isRecord(value)) return false;
  return (
    isValidHourIso(value.timeIso) &&
    isValidDateIso(value.localDate) &&
    isFiniteNumber(value.localHour) &&
    value.localHour >= 0 &&
    value.localHour <= 23 &&
    isNullableNumber(value.humidity) &&
    isNullableNumber(value.windSpeedKmh) &&
    isNullableNumber(value.windGustKmh) &&
    isNullableNumber(value.windDegree) &&
    isNullableDirection(value.direction) &&
    isNullableDirection(value.rawDirection) &&
    typeof value.directionSmoothed === 'boolean' &&
    isNullableSeverity(value.directionSeverity) &&
    isNullableSeverity(value.speedSeverity) &&
    isNullableSeverity(value.windSeverity) &&
    isNullableSeverity(value.humiditySeverity)
  );
}

function isTimeSegment(value: unknown): value is TimeSegment {
  if (!isRecord(value)) return false;
  return (
    isValidHourIso(value.startIso) &&
    isExclusiveEndIso(value.endIsoExclusive) &&
    isFiniteNumber(value.startHour) &&
    isFiniteNumber(value.endHourExclusive) &&
    value.startHour >= 0 &&
    value.endHourExclusive <= 24 &&
    value.startHour < value.endHourExclusive &&
    isSeverity(value.severity) &&
    isFiniteNumber(value.minValue) &&
    isFiniteNumber(value.maxValue) &&
    (value.direction === undefined || isDirection(value.direction)) &&
    (value.peakGustKmh === undefined || isNullableNumber(value.peakGustKmh)) &&
    (value.peakGustTimeIso === undefined || isNullableHourIso(value.peakGustTimeIso))
  );
}

function isDirectionSegment(value: unknown): value is DirectionSegment {
  if (!isRecord(value)) return false;
  return (
    isFiniteNumber(value.startHour) &&
    isFiniteNumber(value.endHourExclusive) &&
    value.startHour >= 0 &&
    value.endHourExclusive <= 24 &&
    value.startHour < value.endHourExclusive &&
    isDirection(value.direction)
  );
}

function isDailySummary(value: unknown): value is DailySummary {
  if (!isRecord(value)) return false;
  if (!isValidDateIso(value.date)) return false;
  if (!Array.isArray(value.hours) || value.hours.length === 0) return false;
  if (!value.hours.every(isHourlyPoint)) return false;
  // كل ساعة يجب أن تنتمي لليوم نفسه، وإلا انتهى الشريط بساعات يوم آخر
  if (!value.hours.every((hour) => (hour as HourlyWeatherPoint).localDate === value.date)) {
    return false;
  }
  if (!Array.isArray(value.windSegments) || !value.windSegments.every(isTimeSegment)) return false;
  if (!Array.isArray(value.humiditySegments) || !value.humiditySegments.every(isTimeSegment)) {
    return false;
  }
  if (
    !Array.isArray(value.directionSegments) ||
    !value.directionSegments.every(isDirectionSegment)
  ) {
    return false;
  }

  return (
    isNullableDirection(value.dominantDirection) &&
    (value.variableDirections === undefined ||
      (Array.isArray(value.variableDirections) &&
        value.variableDirections.length === 2 &&
        value.variableDirections.every(isDirection))) &&
    isNullableNumber(value.windMinKmh) &&
    isNullableNumber(value.windMaxKmh) &&
    isNullableNumber(value.gustMaxKmh) &&
    isNullableHourIso(value.gustMaxTimeIso) &&
    isSeverityCounts(value.windHoursBySeverity) &&
    isNullableNumber(value.humidityMin) &&
    isNullableNumber(value.humidityMean) &&
    isNullableNumber(value.humidityMax) &&
    isNullableHourIso(value.humidityMinTimeIso) &&
    isNullableHourIso(value.humidityMaxTimeIso) &&
    isSeverityCounts(value.humidityHoursBySeverity) &&
    isNullableTemperature(value.temperatureMaxC) &&
    isNullableTemperature(value.temperatureMinC) &&
    (value.temperatureMaxC === null ||
      value.temperatureMinC === null ||
      value.temperatureMaxC >= value.temperatureMinC) &&
    (value.precipitationProbabilityMax === null ||
      (isFiniteNumber(value.precipitationProbabilityMax) &&
        value.precipitationProbabilityMax >= 0 &&
        value.precipitationProbabilityMax <= 100)) &&
    isNullableHourIso(value.sunriseIso) &&
    isNullableHourIso(value.sunsetIso) &&
    (value.moonPhaseIndex === null ||
      (isFiniteNumber(value.moonPhaseIndex) &&
        Number.isInteger(value.moonPhaseIndex) &&
        value.moonPhaseIndex >= 0 &&
        value.moonPhaseIndex <= 7)) &&
    isNullableDirection(value.providerDominantDirection)
  );
}

function isCurrentConditions(value: unknown): value is CurrentConditions {
  if (!isRecord(value)) return false;
  return (
    isNullableHourIso(value.timeIso) &&
    isNullableNumber(value.humidity) &&
    isNullableNumber(value.windSpeedKmh) &&
    isNullableNumber(value.windGustKmh) &&
    isNullableNumber(value.windDegree) &&
    isNullableDirection(value.direction) &&
    isNullableSeverity(value.windSeverity) &&
    isNullableSeverity(value.humiditySeverity)
  );
}

export function isNormalizedForecast(value: unknown): value is NormalizedForecast {
  if (!isRecord(value)) return false;
  return (
    typeof value.locationId === 'string' &&
    value.locationId.length > 0 &&
    typeof value.timezone === 'string' &&
    value.timezone.length > 0 &&
    isValidInstantIso(value.fetchedAtIso) &&
    (value.current === null || isCurrentConditions(value.current)) &&
    Array.isArray(value.warnings) &&
    value.warnings.every((warning) => typeof warning === 'string') &&
    Array.isArray(value.days) &&
    value.days.length > 0 &&
    value.days.every(isDailySummary)
  );
}

export interface StoredForecast {
  schemaVersion: number;
  locationId: string;
  fetchedAtIso: string;
  forecast: NormalizedForecast;
}

/** يقبل السجل المحفوظ أو يرفضه كاملًا؛ لا يُصلح ولا يُكمل الناقص. */
export function parseStoredForecast(value: unknown, locationId: string): StoredForecast | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== STORAGE_SCHEMA_VERSION) return null;
  if (value.locationId !== locationId) return null;
  if (!isValidInstantIso(value.fetchedAtIso)) return null;
  if (!isNormalizedForecast(value.forecast)) return null;
  // السجل يقول موقعًا والتوقع بداخله يقول آخر: تناقض يُرفض بدل ترجيح أحدهما
  if (value.forecast.locationId !== locationId) return null;

  return {
    schemaVersion: value.schemaVersion,
    locationId: value.locationId,
    fetchedAtIso: value.fetchedAtIso,
    forecast: value.forecast
  };
}
