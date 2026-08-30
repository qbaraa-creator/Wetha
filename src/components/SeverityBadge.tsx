import { SEVERITY_GLYPHS, SEVERITY_SHORT_LABELS } from '../config/appConfig';
import type { Severity } from '../domain/types';

/**
 * القسم 18.1 — اللون ليس الوسيلة الوحيدة: كل شارة تحمل رمزًا ونصًا.
 */
export function SeverityBadge({
  severity,
  label,
  title
}: {
  severity: Severity | null;
  label?: string;
  title?: string;
}) {
  if (!severity) {
    // حالة بلا لون مُعتمد: رياح متقلبة أو بيانات غائبة — تبقى موصوفة بنص صريح.
    return (
      <span className="badge badge--neutral" title={title}>
        <span className="badge__glyph" aria-hidden="true">
          ○
        </span>
        <span>{label ?? 'لا بيانات'}</span>
      </span>
    );
  }

  return (
    <span className={`badge badge--${severity}`} title={title}>
      <span className="badge__glyph" aria-hidden="true">
        {SEVERITY_GLYPHS[severity]}
      </span>
      <span>{label ?? SEVERITY_SHORT_LABELS[severity]}</span>
    </span>
  );
}

/**
 * توزيع ساعات كل لون: «أخضر 6س · برتقالي 11س · أحمر 7س» (القسم 9.2.ج).
 * الحالات الصفرية تُحذف: «أخضر 0س» يشغل مساحة ويزاحم القيم التي تحمل معنى،
 * وغياب اللون من السطر يقول الشيء نفسه.
 */
export function SeverityCounts({
  counts,
  labelledBy
}: {
  counts: Record<Severity, number>;
  labelledBy?: string;
}) {
  const order: Severity[] = ['green', 'orange', 'red'];
  const shown = order.filter((severity) => counts[severity] > 0);

  if (shown.length === 0) {
    return (
      <p className="counts" aria-labelledby={labelledBy}>
        لا ساعات مصنّفة
      </p>
    );
  }

  return (
    <p className="counts" aria-labelledby={labelledBy}>
      {shown.map((severity, index) => (
        <span key={severity} className={`counts__item counts__item--${severity}`}>
          {index > 0 ? <span className="counts__sep" aria-hidden="true"> · </span> : null}
          <span className="counts__glyph" aria-hidden="true">
            {SEVERITY_GLYPHS[severity]}
          </span>
          {SEVERITY_SHORT_LABELS[severity]} {counts[severity]}س
        </span>
      ))}
    </p>
  );
}
