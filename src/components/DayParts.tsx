import { SEVERITY_GLYPHS, SEVERITY_SHORT_LABELS } from '../config/appConfig';
import type { DayPartSummary } from '../domain/dayParts';
import { displayNumber, displayRange } from '../domain/narrative';
import { formatHour12, formatHourCompact } from '../domain/time';
import { DIRECTION_NAMES_AR } from '../domain/wind';
import { Num, TimeRange } from './Num';

/**
 * الطبقة الأولى في بطاقة اليوم: صفوف مسمّاة بدل 24 خلية.
 *
 * الشريط الساعي كان يضع 24 هدفًا عرض كل منها ~10 بكسل على شاشة 320، ولا يحمل
 * إلا اللون، فلا تُقرأ قيمة واحدة بلا سحب. هنا كل فترة صف كامل العرض يحمل
 * رقمه ونصّه وحالته بلا أي تفاعل، والساعات تبقى متاحة في لوحة التفاصيل.
 *
 * لكل مؤشر حالته الخاصة معروضة بجانب رقمه. الصف نفسه يبقى محايد اللون عمدًا:
 * صبغه بحالة واحدة كان سيوحي بتقييم طقس عام يخلط المسارين، وهو ما ينفيه مفتاح
 * القراءة صراحة. الرياح والرطوبة مساران مستقلان هنا كما في بقية التطبيق.
 */
export function DayPartList({ parts }: { parts: DayPartSummary[] }) {
  return (
    <ul className="dayparts">
      {parts.map((part) => (
        <DayPartRow key={part.id} part={part} />
      ))}
    </ul>
  );
}

function severityLabel(severity: DayPartSummary['windSeverity']): string {
  return severity ? SEVERITY_SHORT_LABELS[severity] : 'لا بيانات';
}

function DayPartRow({ part }: { part: DayPartSummary }) {
  const hasData = part.hourCount > 0 && (part.windSeverity !== null || part.humidityMean !== null);

  const accessibleSummary = [
    `${part.labelAr} من ${formatHour12(part.startHour)} إلى ${formatHour12(part.endHourExclusive)}`,
    part.dominantDirection ? `اتجاه ${DIRECTION_NAMES_AR[part.dominantDirection]}` : null,
    part.windMinKmh === null
      ? 'سرعة غير متاحة'
      : `مدى سرعة الرياح ${displayRange(part.windMinKmh, part.windMaxKmh)} كيلومتر في الساعة، الحالة الأكثر تكرارًا ${severityLabel(part.windSeverity)}`,
    part.humidityMean === null
      ? 'رطوبة غير متاحة'
      : `متوسط الرطوبة ${displayNumber(part.humidityMean)} بالمئة، الحالة الأكثر تكرارًا ${severityLabel(part.humiditySeverity)}`,
    part.isPast ? 'فترة انقضت' : null
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li
      className={['daypart', part.isPast ? 'is-past' : '', hasData ? '' : 'is-empty']
        .filter(Boolean)
        .join(' ')}
    >
      <span className="sr-only">{accessibleSummary}</span>

      <span className="daypart__when" aria-hidden="true">
        <span className="daypart__label">{part.labelAr}</span>
        <TimeRange>
          {formatHourCompact(part.startHour)}–{formatHourCompact(part.endHourExclusive)}
        </TimeRange>
      </span>

      <span className="daypart__metric daypart__metric--wind" aria-hidden="true">
        <span
          className={`daypart__dot daypart__dot--${part.windSeverity ?? 'none'}`}
          title={`الحالة الأكثر تكرارًا للرياح: ${severityLabel(part.windSeverity)}`}
        >
          {part.windSeverity ? SEVERITY_GLYPHS[part.windSeverity] : '○'}
        </span>
        <Num>{displayRange(part.windMinKmh, part.windMaxKmh)}</Num>
      </span>

      <span className="daypart__metric daypart__metric--humidity" aria-hidden="true">
        <span
          className={`daypart__dot daypart__dot--${part.humiditySeverity ?? 'none'}`}
          title={`الحالة الأكثر تكرارًا للرطوبة: ${severityLabel(part.humiditySeverity)}`}
        >
          {part.humiditySeverity ? SEVERITY_GLYPHS[part.humiditySeverity] : '○'}
        </span>
        <Num>{part.humidityMean === null ? '—' : `${displayNumber(part.humidityMean)}%`}</Num>
      </span>
    </li>
  );
}
