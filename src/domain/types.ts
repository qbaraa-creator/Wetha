/** النموذج الداخلي الموحد — PRD القسم 13. */

export type Severity = 'green' | 'orange' | 'red';

export type DirectionCode = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

/** سبب لون الرياح، يُترجم للعرض في src/domain/wind.ts. */
export type WindReasonCode =
  | 'speed-low'
  | 'speed-strong'
  | 'speed-severe'
  | 'direction-red'
  | 'direction-orange'
  | 'direction-and-speed-ok';

export interface HourlyWeatherPoint {
  timeIso: string;
  localDate: string;
  localHour: number;
  humidity: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  windDegree: number | null;
  /** الاتجاه المعتمد بعد تنعيم التذبذب (القسم 5.6). */
  direction: DirectionCode | null;
  /** الاتجاه كما اشتُق من الدرجة الخام قبل التنعيم — للتحقق والتفاصيل الساعية. */
  rawDirection: DirectionCode | null;
  /** هل دُمجت هذه الساعة مع اتجاه محيط؟ */
  directionSmoothed: boolean;
  directionSeverity: Severity | null;
  speedSeverity: Severity | null;
  windSeverity: Severity | null;
  humiditySeverity: Severity | null;
}

export interface TimeSegment {
  startIso: string;
  endIsoExclusive: string;
  /** ساعة البداية 0–23 وساعة النهاية 1–24 بتوقيت الرياض — لرسم المحور. */
  startHour: number;
  endHourExclusive: number;
  severity: Severity;
  direction?: DirectionCode;
  minValue: number;
  maxValue: number;
  peakGustKmh?: number;
  peakGustTimeIso?: string;
  reasonCode?: WindReasonCode;
}

/** فترة اتجاه فقط — لسرد تحولات الاتجاه (القسم 5.6). */
export interface DirectionSegment {
  startHour: number;
  endHourExclusive: number;
  direction: DirectionCode;
}

export interface DailySummary {
  date: string;
  dominantDirection: DirectionCode | null;
  variableDirections?: [DirectionCode, DirectionCode];
  windMinKmh: number | null;
  windMaxKmh: number | null;
  gustMaxKmh: number | null;
  gustMaxTimeIso: string | null;
  windHoursBySeverity: Record<Severity, number>;
  humidityMin: number | null;
  humidityMean: number | null;
  humidityMax: number | null;
  humidityMinTimeIso: string | null;
  humidityMaxTimeIso: string | null;
  humidityHoursBySeverity: Record<Severity, number>;
  windSegments: TimeSegment[];
  humiditySegments: TimeSegment[];
  directionSegments: DirectionSegment[];
  /** العظمى والصغرى بالدرجة المئوية — عرض فقط، لا تدخل أي تصنيف لون. */
  temperatureMaxC: number | null;
  temperatureMinC: number | null;
  /** أعلى احتمال هطول في اليوم بالنسبة المئوية؛ يُخفى عند الصفر. */
  precipitationProbabilityMax: number | null;
  sunriseIso: string | null;
  sunsetIso: string | null;
  moonPhaseIndex: number | null;
  hours: HourlyWeatherPoint[];
  /** فحص اتساق مع الحقول اليومية للمزود (القسم 12.3) — لا يُعرض للمستخدم. */
  providerDominantDirection: DirectionCode | null;
}

export interface CurrentConditions {
  timeIso: string | null;
  humidity: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  windDegree: number | null;
  direction: DirectionCode | null;
  windSeverity: Severity | null;
  humiditySeverity: Severity | null;
}

export interface NormalizedForecast {
  locationId: string;
  timezone: string;
  fetchedAtIso: string;
  current: CurrentConditions | null;
  days: DailySummary[];
  /** أخطاء تقنية غير حاجبة: حقل مرفوض، وحدة غير متوقعة، ساعات ناقصة (القسم 16). */
  warnings: string[];
}

export interface WeekRanking {
  mostHumidDate: string | null;
  leastHumidDate: string | null;
  bestGreenWindDate: string | null;
}
