import { LOCATION } from '../config/appConfig';

/**
 * كل التوقيت في هذا المنتج بتوقيت `Asia/Riyadh` مهما كانت منطقة الجهاز (القسم 1.3).
 * المزود يُطلب منه `timezone=Asia/Riyadh` فيعيد سلاسل ISO محلية بلا إزاحة،
 * لذا تُقرأ التواريخ والساعات من نص السلسلة مباشرة بلا تحويل.
 */

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const HOUR_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/** يرفض ما يمرّ من التعبير النمطي لكنه ليس تاريخًا حقيقيًا مثل 2026-02-31. */
function isRealCalendarDate(dateIso: string): boolean {
  const [year, month, day] = dateIso.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** '2026-08-19' فقط — بصيغة صحيحة وتاريخ موجود فعلًا. */
export function isValidDateIso(value: unknown): value is string {
  return typeof value === 'string' && DATE_ISO.test(value) && isRealCalendarDate(value);
}

/** '2026-08-19T06:02' أو بثوانٍ — بتاريخ وساعة ودقيقة ضمن المجال. */
export function isValidHourIso(value: unknown): value is string {
  if (typeof value !== 'string' || !HOUR_ISO.test(value)) return false;
  if (!isRealCalendarDate(value.slice(0, 10))) return false;
  return Number(value.slice(11, 13)) <= 23 && Number(value.slice(14, 16)) <= 59;
}

/** لحظة مطلقة قابلة للتحويل إلى Date — تُستعمل لوقت الجلب المحفوظ. */
export function isValidInstantIso(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

/** '2026-08-19T06:02' → '2026-08-19' */
export function isoDatePart(timeIso: string): string {
  return timeIso.slice(0, 10);
}

/** '2026-08-19T06:02' → 6 */
export function isoHourPart(timeIso: string): number {
  return Number(timeIso.slice(11, 13));
}

export function isoMinutePart(timeIso: string): number {
  return Number(timeIso.slice(14, 16));
}

export function buildIso(dateIso: string, hour: number): string {
  return `${dateIso}T${String(hour).padStart(2, '0')}:00`;
}

/** لحظة الآن بتوقيت الرياض، مستقلة عن إعداد الجهاز. */
export function nowInRiyadh(reference: Date = new Date()): {
  dateIso: string;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LOCATION.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(reference);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';

  return {
    dateIso: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute'))
  };
}

/** '2026-08-19' → '19/08/2026' (القسم 17). */
export function formatDateDMY(dateIso: string): string {
  const [year, month, day] = dateIso.split('-');
  return `${day}/${month}/${year}`;
}

export function arabicDayName(dateIso: string): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return DAY_NAMES_AR[weekday];
}

/** نظام 12 ساعة مع ص/م (القسم 17). الساعة 24 تُعرض كمنتصف الليل. */
export function formatHour12(hour: number, minute = 0): string {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized < 12 ? 'ص' : 'م';
  const display = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${display}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function formatIsoTime(timeIso: string | null): string {
  if (!timeIso) return '—';
  return formatHour12(isoHourPart(timeIso), isoMinutePart(timeIso));
}

/** فرق الشروق والغروب بصيغة «12 س 48 د» (القسم 10.7). */
export function formatDayLength(sunriseIso: string | null, sunsetIso: string | null): string {
  if (!sunriseIso || !sunsetIso) return '—';
  const start = isoHourPart(sunriseIso) * 60 + isoMinutePart(sunriseIso);
  const end = isoHourPart(sunsetIso) * 60 + isoMinutePart(sunsetIso);
  const total = end - start;
  if (total <= 0) return '—';
  return `${Math.floor(total / 60)} س ${total % 60} د`;
}

export function addDays(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}
