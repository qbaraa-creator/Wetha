import { DIRECTION_SECTORS, FORECAST_DAYS, type LocationConfig } from '../config/appConfig';
import { buildHourlyPoint } from '../domain/segments';
import { buildDailySummary } from '../domain/summary';
import { moonPhaseIndex } from '../domain/moon';
import { isoDatePart, isValidDateIso, isValidHourIso } from '../domain/time';
import { DIRECTION_NAMES_AR, degreeToDirection, getWindSeverity } from '../domain/wind';
import { getHumiditySeverity } from '../domain/humidity';
import type {
  CurrentConditions,
  DailySummary,
  DirectionCode,
  HourlyWeatherPoint,
  NormalizedForecast
} from '../domain/types';
import { ProviderError, type WeatherProvider } from './types';

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

const HOURLY_FIELDS = [
  'relative_humidity_2m',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m'
] as const;

const DAILY_FIELDS = [
  'sunrise',
  'sunset',
  'moon_phase',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'wind_direction_10m_dominant'
] as const;

const CURRENT_FIELDS = [
  'relative_humidity_2m',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m'
] as const;

/** الوحدات المتوقعة؛ أي انحراف يرفض الحقل ولا يُحوَّل صامتًا (القسم 16). */
const EXPECTED_HOURLY_UNITS: Record<string, string> = {
  relative_humidity_2m: '%',
  wind_speed_10m: 'km/h',
  wind_direction_10m: '°',
  wind_gusts_10m: 'km/h'
};

const EXPECTED_DAILY_UNITS: Record<string, string> = {
  sunrise: 'iso8601',
  sunset: 'iso8601',
  moon_phase: 'fraction',
  wind_direction_10m_dominant: '°'
};

/** وحدات `current` تُفحص مستقلة: المزود يصفها في كتلة خاصة قد تنحرف وحدها. */
const EXPECTED_CURRENT_UNITS: Record<string, string> = {
  relative_humidity_2m: '%',
  wind_speed_10m: 'km/h',
  wind_direction_10m: '°',
  wind_gusts_10m: 'km/h'
};

/**
 * القسم 16 — مجالات القيم المقبولة. ما يخرج عنها يصير `null` ولا يُقصّ ولا يُخمَّن:
 * رطوبة 140% أو سرعة سالبة خطأ في المصدر، وتمريره ملوّنًا أسوأ من غيابه.
 */
const RANGES = {
  humidity: (value: number) => value >= 0 && value <= 100,
  speed: (value: number) => value >= 0,
  gust: (value: number) => value >= 0,
  degree: (value: number) => value >= 0 && value <= 360,
  moonPhase: (value: number) => value >= 0 && value <= 1
} as const;

type NumberArray = Array<number | null>;
type StringArray = Array<string | null>;

interface OpenMeteoResponse {
  timezone?: string;
  hourly_units?: Record<string, string>;
  daily_units?: Record<string, string>;
  current_units?: Record<string, string>;
  current?: Record<string, number | string | null>;
  hourly?: { time?: string[] } & Record<string, unknown>;
  daily?: { time?: string[] } & Record<string, unknown>;
}

export function buildForecastUrl(location: LocationConfig): string {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: CURRENT_FIELDS.join(','),
    hourly: HOURLY_FIELDS.join(','),
    daily: DAILY_FIELDS.join(','),
    timezone: location.timezone,
    wind_speed_unit: 'kmh',
    forecast_days: String(FORECAST_DAYS)
  });
  return `${ENDPOINT}?${params.toString()}`;
}

/**
 * مواضع المحور الزمني الصالحة: صيغة سليمة، وتاريخ موجود، وتصاعد صارم.
 * ما يُسقط هنا يُسقط من كل المصفوفات المتوازية معه، فلا تنزلق القيم على ساعة أخرى.
 */
function readTimeAxis(
  raw: unknown,
  isValid: (value: unknown) => boolean,
  scope: string,
  warnings: string[]
): { times: string[]; indices: number[]; rawLength: number } {
  const source = Array.isArray(raw) ? raw : [];
  const times: string[] = [];
  const indices: number[] = [];
  let previous: string | null = null;
  let dropped = 0;

  source.forEach((value, index) => {
    if (!isValid(value) || (previous !== null && (value as string) <= previous)) {
      dropped += 1;
      return;
    }
    previous = value as string;
    times.push(value as string);
    indices.push(index);
  });

  if (dropped > 0) {
    warnings.push(
      `${scope}.time: أُسقط ${dropped} طابعًا زمنيًا غير صالح أو مكرر أو خارج الترتيب.`
    );
  }
  return { times, indices, rawLength: source.length };
}

/**
 * يقرأ حقلًا رقميًا بطول المحور الزمني تمامًا.
 * المصفوفة الأقصر تُكمَّل بـ `null` بدل تمرير `undefined` إلى الحساب،
 * والأطول يُهمل فائضها، وكل قيمة غير منتهية أو خارج المجال تصير `null`.
 */
function readNumbers(
  container: Record<string, unknown> | undefined,
  field: string,
  rejected: Set<string>,
  axis: { indices: number[]; rawLength: number },
  inRange: (value: number) => boolean,
  scope: string,
  warnings: string[]
): NumberArray {
  if (rejected.has(field)) return new Array(axis.indices.length).fill(null);

  const source = container?.[field];
  if (!Array.isArray(source)) {
    warnings.push(`الحقل ${scope}.${field} ليس مصفوفة فاعتُبر مفقودًا.`);
    return new Array(axis.indices.length).fill(null);
  }
  if (source.length !== axis.rawLength) {
    warnings.push(
      `الحقل ${scope}.${field} طوله ${source.length} بينما المحور الزمني ${axis.rawLength}.`
    );
  }

  let invalid = 0;
  const values = axis.indices.map((index) => {
    const value = source[index];
    if (value === null || value === undefined) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || !inRange(value)) {
      invalid += 1;
      return null;
    }
    return value;
  });

  if (invalid > 0) {
    warnings.push(`الحقل ${scope}.${field}: ${invalid} قيمة غير رقمية أو خارج المجال أُفرغت.`);
  }
  return values;
}

/** نظير `readNumbers` للحقول النصية الزمنية (الشروق والغروب). */
function readTimes(
  container: Record<string, unknown> | undefined,
  field: string,
  rejected: Set<string>,
  axis: { indices: number[]; rawLength: number },
  scope: string,
  warnings: string[]
): StringArray {
  if (rejected.has(field)) return new Array(axis.indices.length).fill(null);

  const source = container?.[field];
  if (!Array.isArray(source)) {
    warnings.push(`الحقل ${scope}.${field} ليس مصفوفة فاعتُبر مفقودًا.`);
    return new Array(axis.indices.length).fill(null);
  }
  if (source.length !== axis.rawLength) {
    warnings.push(
      `الحقل ${scope}.${field} طوله ${source.length} بينما المحور الزمني ${axis.rawLength}.`
    );
  }

  let invalid = 0;
  const values = axis.indices.map((index) => {
    const value = source[index];
    if (value === null || value === undefined) return null;
    if (!isValidHourIso(value)) {
      invalid += 1;
      return null;
    }
    return value;
  });

  if (invalid > 0) {
    warnings.push(`الحقل ${scope}.${field}: ${invalid} وقتًا بصيغة غير صالحة أُفرغ.`);
  }
  return values;
}

function checkUnits(
  actual: Record<string, string> | undefined,
  expected: Record<string, string>,
  scope: string,
  warnings: string[]
): Set<string> {
  const rejected = new Set<string>();
  Object.entries(expected).forEach(([field, unit]) => {
    const received = actual?.[field];
    if (received === undefined) {
      warnings.push(`الحقل ${scope}.${field} غير موجود في الاستجابة.`);
      rejected.add(field);
      return;
    }
    if (received !== unit) {
      warnings.push(`الحقل ${scope}.${field} عاد بوحدة غير متوقعة (${received} بدل ${unit}) فرُفض.`);
      rejected.add(field);
    }
  });
  return rejected;
}

/** أقصر مسافة بين قطاعين على البوصلة الثمانية: 0 تطابق، 1 تجاور، 4 تعاكس. */
function sectorDistance(first: DirectionCode, second: DirectionCode): number {
  const gap = Math.abs(DIRECTION_SECTORS.indexOf(first) - DIRECTION_SECTORS.indexOf(second));
  return Math.min(gap, DIRECTION_SECTORS.length - gap);
}

/** يحوّل استجابة Open-Meteo الخام إلى النموذج الداخلي — دالة نقية قابلة للاختبار. */
export function normalizeOpenMeteoResponse(
  payload: OpenMeteoResponse,
  location: LocationConfig,
  fetchedAtIso: string
): NormalizedForecast {
  const warnings: string[] = [];

  /*
   * المنطقة الزمنية تُفحص أولًا وتحجب الاستجابة كلها عند الاختلاف.
   * كل ساعة في هذا المنتج تُقرأ من نص السلسلة بلا إزاحة (القسم 1.3)، فمنطقة
   * أخرى تعني أن كل ساعة وكل تاريخ وكل حد يوم مزاح — لا يُنقذها تحذير.
   */
  if (payload.timezone !== location.timezone) {
    throw new ProviderError(
      payload.timezone === undefined
        ? 'استجابة المزود بلا منطقة زمنية، وتعذّر التأكد أن الساعات بتوقيت الرياض.'
        : `المزود أعاد المنطقة الزمنية ${payload.timezone} بدل ${location.timezone}؛ كل الساعات مزاحة فرُفضت الاستجابة.`,
      false
    );
  }

  const hourlyAxis = readTimeAxis(payload.hourly?.time, isValidHourIso, 'hourly', warnings);
  const dailyAxis = readTimeAxis(payload.daily?.time, isValidDateIso, 'daily', warnings);

  if (hourlyAxis.times.length === 0 || dailyAxis.times.length === 0) {
    throw new ProviderError('استجابة المزود لا تحتوي على سلسلة زمنية صالحة.', false);
  }
  if (dailyAxis.times.length !== FORECAST_DAYS) {
    warnings.push(`عدد الأيام ${dailyAxis.times.length} بدل ${FORECAST_DAYS}.`);
  }

  const rejectedHourly = checkUnits(payload.hourly_units, EXPECTED_HOURLY_UNITS, 'hourly', warnings);
  const rejectedDaily = checkUnits(payload.daily_units, EXPECTED_DAILY_UNITS, 'daily', warnings);
  const rejectedCurrent = checkUnits(
    payload.current_units,
    EXPECTED_CURRENT_UNITS,
    'current',
    warnings
  );

  const humidity = readNumbers(payload.hourly, 'relative_humidity_2m', rejectedHourly, hourlyAxis, RANGES.humidity, 'hourly', warnings);
  const speed = readNumbers(payload.hourly, 'wind_speed_10m', rejectedHourly, hourlyAxis, RANGES.speed, 'hourly', warnings);
  const degree = readNumbers(payload.hourly, 'wind_direction_10m', rejectedHourly, hourlyAxis, RANGES.degree, 'hourly', warnings);
  const gust = readNumbers(payload.hourly, 'wind_gusts_10m', rejectedHourly, hourlyAxis, RANGES.gust, 'hourly', warnings);

  const pointsByDate = new Map<string, HourlyWeatherPoint[]>();
  hourlyAxis.times.forEach((timeIso, index) => {
    const point = buildHourlyPoint({
      timeIso,
      humidity: humidity[index],
      windSpeedKmh: speed[index],
      windGustKmh: gust[index],
      windDegree: degree[index]
    });
    const bucket = pointsByDate.get(point.localDate) ?? [];
    bucket.push(point);
    pointsByDate.set(point.localDate, bucket);
  });

  const sunrise = readTimes(payload.daily, 'sunrise', rejectedDaily, dailyAxis, 'daily', warnings);
  const sunset = readTimes(payload.daily, 'sunset', rejectedDaily, dailyAxis, 'daily', warnings);
  const moonPhase = readNumbers(payload.daily, 'moon_phase', rejectedDaily, dailyAxis, RANGES.moonPhase, 'daily', warnings);
  const dominantDegree = readNumbers(payload.daily, 'wind_direction_10m_dominant', rejectedDaily, dailyAxis, RANGES.degree, 'daily', warnings);

  const days: DailySummary[] = dailyAxis.times.map((date, index) => {
    const points = (pointsByDate.get(date) ?? []).sort((a, b) => a.localHour - b.localHour);
    if (points.length < 24) {
      warnings.push(`اليوم ${date} وصل بـ${points.length} ساعة بدل 24.`);
    }
    const phase = moonPhase[index];
    const providerDegree = dominantDegree[index];
    return buildDailySummary(date, points, {
      sunriseIso: sunrise[index],
      sunsetIso: sunset[index],
      moonPhaseIndex: phase === null ? null : moonPhaseIndex(phase),
      providerDominantDirection: providerDegree === null ? null : degreeToDirection(providerDegree)
    });
  });

  /*
   * القسم 12.3 — الاتجاه اليومي للمزود ليس مصدر عرض، بل شاهد على تلخيصنا.
   *
   * الحقلان لا يُحسبان بالطريقة نفسها: المزود يعطي متجهًا يوميًا مرجّحًا بالسرعة،
   * ونحن نعطي القطاع السائد بعد تنعيم الساعتين (القسم 5.5). لذا الاختلاف بقطاع
   * واحد أثر حدودي طبيعي يتكرر كل يوم تقريبًا، والتحذير عليه يُفرغ التنبيه من
   * معناه. يُنبَّه فقط على تباعد قطاعين فأكثر — وهو ما يشي بخلل فعلي في القراءة.
   */
  days.forEach((day) => {
    if (!day.providerDominantDirection || !day.dominantDirection) return;
    if (sectorDistance(day.providerDominantDirection, day.dominantDirection) < 2) return;
    warnings.push(
      `اليوم ${day.date}: اتجاه المزود اليومي ${DIRECTION_NAMES_AR[day.providerDominantDirection]} ` +
        `يخالف المحسوب ${DIRECTION_NAMES_AR[day.dominantDirection]}.`
    );
  });

  const current = normalizeCurrent(payload.current, rejectedCurrent, warnings);

  return {
    locationId: location.id,
    timezone: payload.timezone,
    fetchedAtIso,
    current,
    days,
    warnings
  };
}

function normalizeCurrent(
  source: Record<string, number | string | null> | undefined,
  rejectedFields: Set<string>,
  warnings: string[]
): CurrentConditions | null {
  if (!source) return null;

  const readNumber = (field: string, inRange: (value: number) => boolean): number | null => {
    if (rejectedFields.has(field)) return null;
    const value = source[field];
    if (value === null || value === undefined) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || !inRange(value)) {
      warnings.push(`الحقل current.${field} غير رقمي أو خارج المجال فأُفرغ.`);
      return null;
    }
    return value;
  };

  const humidity = readNumber('relative_humidity_2m', RANGES.humidity);
  const windSpeedKmh = readNumber('wind_speed_10m', RANGES.speed);
  const windDegree = readNumber('wind_direction_10m', RANGES.degree);
  const direction = windDegree === null ? null : degreeToDirection(windDegree);

  if (source.time !== undefined && source.time !== null && !isValidHourIso(source.time)) {
    warnings.push('الحقل current.time بصيغة غير صالحة فأُفرغ.');
  }

  return {
    timeIso: isValidHourIso(source.time) ? source.time : null,
    humidity,
    windSpeedKmh,
    windGustKmh: readNumber('wind_gusts_10m', RANGES.gust),
    windDegree,
    direction,
    windSeverity:
      direction === null || windSpeedKmh === null ? null : getWindSeverity(direction, windSpeedKmh),
    humiditySeverity: humidity === null ? null : getHumiditySeverity(humidity)
  };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

export function createOpenMeteoProvider(options: {
  timeoutMs: number;
  maxRetries: number;
}): WeatherProvider {
  return {
    id: 'open-meteo',
    async getSevenDayForecast(location) {
      const url = buildForecastUrl(location);
      let lastError: unknown;

      for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
        try {
          const response = await fetchWithTimeout(url, options.timeoutMs);
          if (!response.ok) {
            throw new ProviderError(
              `المزود أعاد الحالة ${response.status}.`,
              response.status >= 500 || response.status === 429
            );
          }
          const payload = (await response.json()) as OpenMeteoResponse;
          const normalized = normalizeOpenMeteoResponse(payload, location, new Date().toISOString());
          if (normalized.days.length === 0) {
            throw new ProviderError('استجابة المزود بلا أيام صالحة.', false);
          }
          return normalized;
        } catch (error) {
          lastError = error;
          const transient =
            (error instanceof ProviderError && error.transient) ||
            (error instanceof DOMException && error.name === 'AbortError') ||
            error instanceof TypeError;
          if (!transient || attempt === options.maxRetries) break;
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new ProviderError('تعذّر جلب البيانات من المزود.', true);
    }
  };
}

/** تُصدَّر لأغراض اختبار التكامل مع عقد المزود (القسم 7.2). */
export const __testing = {
  EXPECTED_CURRENT_UNITS,
  EXPECTED_DAILY_UNITS,
  EXPECTED_HOURLY_UNITS,
  isoDatePart
};
