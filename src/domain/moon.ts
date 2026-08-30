/** القسم 7.2 — مراحل القمر الثماني. */

export const MOON_PHASE_NAMES_AR = [
  'محاق',
  'هلال متزايد',
  'التربيع الأول',
  'أحدب متزايد',
  'بدر',
  'أحدب متناقص',
  'التربيع الأخير',
  'هلال متناقص'
] as const;

/** يطبّع قيمة الدورة القمرية إلى المجال [0, 1). */
export function normalizeMoonPhase(phase: number): number {
  const remainder = phase % 1;
  return remainder < 0 ? remainder + 1 : remainder;
}

/**
 * المزود يعيد `moon_phase` بوحدة `fraction` من 0 إلى 1 (تحقق تكامل في providers/openMeteo).
 * الفهرس 0..7 وفق جدول القسم 7.2.
 */
export function moonPhaseIndex(phase: number): number {
  return Math.round(normalizeMoonPhase(phase) * 8) % 8;
}

export function moonPhaseName(index: number | null): string {
  if (index === null || index < 0 || index > 7) return '—';
  return MOON_PHASE_NAMES_AR[index];
}
