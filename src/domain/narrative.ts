import { formatHour12 } from './time';
import { DIRECTION_NAMES_AR } from './wind';
import type { DirectionCode, DirectionSegment } from './types';

/**
 * القسم 5.6 — صيغة عرض تحولات الاتجاه.
 * مثال: «شمالية غربية من 12:00 ص إلى 11:00 ص، ثم غربية من 11:00 ص إلى 6:00 م،
 * ثم شمالية غربية حتى نهاية اليوم.»
 */
export function formatDirectionNarrative(segments: DirectionSegment[]): string {
  if (segments.length === 0) return '—';

  const parts = segments.map((segment, index) => {
    const name = DIRECTION_NAMES_AR[segment.direction];
    const isLastOfDay = index === segments.length - 1 && segment.endHourExclusive >= 24;
    const prefix = index === 0 ? '' : 'ثم ';

    if (isLastOfDay && segments.length > 1) {
      return `${prefix}${name} حتى نهاية اليوم`;
    }
    return `${prefix}${name} من ${formatHour12(segment.startHour)} إلى ${formatHour12(
      segment.endHourExclusive
    )}`;
  });

  return parts.join('، ');
}

/** التقريب المرئي إلى أقرب عدد صحيح؛ القيمة الخام تبقى للحسابات (القسم 17). */
export function displayNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return String(Math.round(value));
}

export function displayRange(min: number | null, max: number | null): string {
  if (min === null || max === null) return '—';
  const low = Math.round(min);
  const high = Math.round(max);
  return low === high ? String(low) : `${low}–${high}`;
}

/**
 * القسم 5.5 — نص الاتجاه العام أو وصف الرياح بالمتقلبة.
 * `short` صيغة مختصرة بلا بادئة، تصلح وسمًا داخل شارة الحالة فتحمل الشارة
 * الاتجاه واللون معًا بدل تكرارهما في سطرين.
 */
export function formatDominantDirection(day: {
  dominantDirection: DirectionCode | null;
  variableDirections?: [DirectionCode, DirectionCode];
}): { text: string; short: string; direction: DirectionCode | null; isVariable: boolean } {
  if (day.dominantDirection) {
    const name = DIRECTION_NAMES_AR[day.dominantDirection];
    return {
      text: `الاتجاه العام: ${name}`,
      short: name,
      direction: day.dominantDirection,
      isVariable: false
    };
  }
  if (day.variableDirections) {
    const [first, second] = day.variableDirections;
    const pair = `${DIRECTION_NAMES_AR[first]} / ${DIRECTION_NAMES_AR[second]}`;
    return {
      text: `رياح متقلبة: ${pair}`,
      short: `متقلبة · ${pair}`,
      direction: null,
      isVariable: true
    };
  }
  return { text: 'الاتجاه العام: —', short: '—', direction: null, isVariable: false };
}
