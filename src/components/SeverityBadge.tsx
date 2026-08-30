import { SEVERITY_GLYPHS, SEVERITY_SHORT_LABELS } from '../config/appConfig';
import type { Severity } from '../domain/types';

/** اللون يصاحبه رمز نمطي، واسم الحالة يبقى لقارئات الشاشة من دون تكراره بصريًا. */
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
    <span
      className={`badge badge--${severity}${label ? '' : ' badge--icon-only'}`}
      title={title ?? SEVERITY_SHORT_LABELS[severity]}
      aria-label={
        label
          ? `${label}، الحالة ${SEVERITY_SHORT_LABELS[severity]}`
          : `الحالة ${SEVERITY_SHORT_LABELS[severity]}`
      }
    >
      <span className="badge__glyph" aria-hidden="true">
        {SEVERITY_GLYPHS[severity]}
      </span>
      {label ? <span>{label}</span> : null}
    </span>
  );
}

/**
 * توزيع ساعات الحالات: رمز + عدد، بينما يبقى اسم الحالة في الوصف المسموع.
 * الحالات الصفرية تُحذف لأنها تشغل مساحة وتزاحم القيم التي تحمل معنى،
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
        <span
          key={severity}
          className={`counts__item counts__item--${severity}`}
          aria-label={`${SEVERITY_SHORT_LABELS[severity]} ${counts[severity]} ساعات`}
          title={SEVERITY_SHORT_LABELS[severity]}
        >
          {index > 0 ? <span className="counts__sep" aria-hidden="true"> · </span> : null}
          <span className="counts__glyph" aria-hidden="true">
            {SEVERITY_GLYPHS[severity]}
          </span>
          <span aria-hidden="true">{counts[severity]}س</span>
        </span>
      ))}
    </p>
  );
}
