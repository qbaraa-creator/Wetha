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

/** عتبات السرعة المستمرة بوحدة كم/س — المجالات نصف مفتوحة لمنع تداخل الحدود. */
export const SPEED_THRESHOLDS = {
  greenMinKmh: 15,
  strongMinKmh: 25,
  severeMinKmh: 35
} as const;

/** تبقى السرعة القوية مناسبة لهذه الاتجاهات، دون تجاوز حد الرياح الشديدة. */
export const STRONG_WIND_GREEN_DIRECTIONS: readonly DirectionCode[] = ['N', 'NW'];

/**
 * عتبات الرطوبة النسبية: أقل من 50 أخضر، 50–أقل من 65 برتقالي، و65 فأكثر أحمر.
 */
export const HUMIDITY_THRESHOLDS = {
  greenMaxExclusive: 50,
  redMinInclusive: 65
} as const;

/** حدود صلاحية الحرارة بالمئوية؛ مشتركة بين المزود والتخزين، وليست عتبات راحة. */
export const TEMPERATURE_LIMITS_C = { min: -90, max: 60 } as const;

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

/**
 * فترات اليوم التي تُعرض أرقامها داخل تفاصيل بطاقة اليوم.
 *
 * لا تتداخل ولا تلتف حول منتصف الليل: كل ساعة من 0 إلى 23 تقع في فترة واحدة
 * بالضبط، فيبقى الترتيب المعروض هو الترتيب الزمني ولا تظهر ساعات أول اليوم
 * في آخر القائمة. الحدود مختارة لسؤال «متى أخرج؟» لا لتقسيم فلكي.
 */
export const DAY_PARTS = [
  { id: 'dawn', labelAr: 'فجر', startHour: 0, endHourExclusive: 6 },
  { id: 'morning', labelAr: 'صباح', startHour: 6, endHourExclusive: 12 },
  { id: 'noon', labelAr: 'ظهر', startHour: 12, endHourExclusive: 16 },
  { id: 'afternoon', labelAr: 'عصر', startHour: 16, endHourExclusive: 19 },
  { id: 'night', labelAr: 'ليل', startHour: 19, endHourExclusive: 24 }
] as const;

export type DayPartId = (typeof DAY_PARTS)[number]['id'];

/** القسم 15.1 — سياسة التحديث. */
export const REFRESH_POLICY = {
  staleAfterMs: 30 * 60 * 1000,
  requestTimeoutMs: 10_000,
  maxRetries: 1
} as const;

/** الإصدار 4 يبطل التصنيفات المحفوظة قبل توسيع السرعة المناسبة للشمالية والشمالية الغربية. */
export const STORAGE_SCHEMA_VERSION = 4;

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
