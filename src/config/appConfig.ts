/**
 * الإعداد المركزي الوحيد للمنتج.
 * كل عتبة ولون وموقع يُعدّل من هنا فقط — لا داخل المكونات ولا داخل دوال العمل.
 * مرجع: PRD الأقسام 5.1، 5.2، 6.1، 12.2، 15.1، 18.2، 20.
 */

import type { DirectionCode, Severity } from '../domain/types';

/** القسم 12.2 — الموقع. تغييره لاحقًا لا يتطلب تعديل أي منطق. */
export const LOCATION = {
  id: 'jeddah',
  nameAr: 'جدة',
  latitude: 21.5433,
  longitude: 39.1728,
  timezone: 'Asia/Riyadh'
} as const;

export type LocationConfig = typeof LOCATION;

/** عدد أيام التوقع: اليوم + ستة أيام (القسم 1.3). */
export const FORECAST_DAYS = 7;

/**
 * القسم 5.2 — عتبات السرعة المستمرة بوحدة كم/س.
 * `≤ redMaxKmh` أحمر · `> redMaxKmh و ≤ orangeMaxKmh` برتقالي · `> orangeMaxKmh` أخضر.
 */
export const SPEED_THRESHOLDS = {
  redMaxKmh: 15,
  orangeMaxKmh: 25
} as const;

/**
 * القسم 6.1 — عتبات الرطوبة النسبية.
 * `< greenMaxExclusive` أخضر · `حتى orangeMaxInclusive` برتقالي · `>` أحمر.
 */
export const HUMIDITY_THRESHOLDS = {
  greenMaxExclusive: 50,
  orangeMaxInclusive: 70
} as const;

/** القسم 5.1 — لون كل قطاع من القطاعات الثمانية. */
export const DIRECTION_SEVERITY: Record<DirectionCode, Severity> = {
  N: 'green',
  NW: 'green',
  NE: 'orange',
  E: 'orange',
  W: 'orange',
  SE: 'red',
  S: 'red',
  SW: 'red'
};

/** حدود قطاعات الاتجاه بالدرجات — للعرض في مفتاح الألوان فقط؛ الحساب في degreeToDirection. */
export const DIRECTION_SECTORS: DirectionCode[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** الاتجاه العام يتطلب هذه النسبة من ساعات اليوم الصالحة، وإلا فالرياح «متقلبة» (القسم 5.5). */
export const DOMINANT_DIRECTION_MIN_SHARE = 0.5;

/** القسم 5.6 — أقل عدد ساعات متتالية يثبّت تحول الاتجاه. */
export const DIRECTION_CHANGE_MIN_HOURS = 2;

/** القسم 9.2 — أقصى عدد فترات اتجاه تُذكر نصًا في بطاقة الأسبوع. */
export const WEEK_CARD_MAX_SEGMENTS = 3;

/** القسم 15.1 — سياسة التحديث. */
export const REFRESH_POLICY = {
  staleAfterMs: 30 * 60 * 1000,
  intervalMs: 60 * 60 * 1000,
  requestTimeoutMs: 10_000,
  maxRetries: 1
} as const;

/** القسم 15.2 — إصدار مخطط التخزين؛ يُزاد عند أي تغيير غير متوافق في النموذج الداخلي. */
export const STORAGE_SCHEMA_VERSION = 1;

/** القسم 18.2 — ألوان الحالات. */
export const SEVERITY_COLORS: Record<Severity | 'neutral', { base: string; surface: string }> = {
  green: { base: '#15803D', surface: '#DCFCE7' },
  orange: { base: '#C2410C', surface: '#FFEDD5' },
  red: { base: '#B91C1C', surface: '#FEE2E2' },
  neutral: { base: '#475569', surface: '#F1F5F9' }
};

/** القسم 18.3 — كل لون يصاحبه اسم صريح؛ اللون ليس الوسيلة الوحيدة. */
export const SEVERITY_LABELS: Record<Severity, string> = {
  green: 'أخضر · مناسب',
  orange: 'برتقالي · متوسط',
  red: 'أحمر · غير مناسب'
};

export const SEVERITY_SHORT_LABELS: Record<Severity, string> = {
  green: 'أخضر',
  orange: 'برتقالي',
  red: 'أحمر'
};

/** رموز نمطية تُغني عن الاعتماد على اللون وحده (القسم 18.1). */
export const SEVERITY_GLYPHS: Record<Severity, string> = {
  green: '●',
  orange: '◐',
  red: '▲'
};

/** القسم 12.1 — نسبة مصدر البيانات المطلوبة بموجب الترخيص (FR-16). */
export const DATA_ATTRIBUTION = {
  label: 'بيانات الطقس: Open-Meteo',
  href: 'https://open-meteo.com/'
} as const;
