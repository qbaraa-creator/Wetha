import type { DayPartSummary } from '../domain/dayParts';
import { displayNumber, displayRange } from '../domain/narrative';
import { formatHour12, formatHourCompact } from '../domain/time';
import { Num, TimeRange } from './Num';

/** الأرقام محفوظة داخل التفاصيل كي لا تزاحم القرار وأسبابه على الجوال. */
export function DayPartMeasurements({ parts }: { parts: DayPartSummary[] }) {
  return (
    <table className="part-measurements">
      <caption>أرقام الفترات</caption>
      <thead>
        <tr>
          <th scope="col">الفترة</th>
          <th scope="col">
            مدى الرياح
            <br />
            <small>كم/س</small>
          </th>
          <th scope="col">متوسط الرطوبة</th>
        </tr>
      </thead>
      <tbody>
        {parts.map((part) => (
          <tr key={part.id} className={part.isPast ? 'is-past' : undefined}>
            <th scope="row">
              {part.labelAr}
              <span className="part-measurements__time" aria-hidden="true">
                <TimeRange>
                  {formatHourCompact(part.startHour)}–{formatHourCompact(part.endHourExclusive)}
                </TimeRange>
              </span>
              <span className="sr-only">
                {' '}
                من {formatHour12(part.startHour)} إلى {formatHour12(part.endHourExclusive)}
                {part.isPast ? '، فترة انقضت' : ''}
                {part.hourCount === 0 ? '، لا بيانات لهذه الفترة' : ''}
              </span>
            </th>
            <td>
              <Num>{displayRange(part.windMinKmh, part.windMaxKmh)}</Num>
            </td>
            <td>
              <Num>{part.humidityMean === null ? '—' : `${displayNumber(part.humidityMean)}%`}</Num>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
