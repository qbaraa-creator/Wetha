import type { Severity } from './types';

/** ترتيب الشدة: أخضر < برتقالي < أحمر (القسم 5.3). */
const RANK: Record<Severity, number> = { green: 0, orange: 1, red: 2 };

export function severityRank(value: Severity): number {
  return RANK[value];
}

/** الحالة الأسوأ بين قيمتين — المرجع الأعلى عند تعارض لون الاتجاه ولون السرعة. */
export function worseSeverity(a: Severity, b: Severity): Severity {
  return RANK[a] >= RANK[b] ? a : b;
}
