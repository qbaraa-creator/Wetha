import { useState } from 'react';
import { SEVERITY_SHORT_LABELS } from '../config/appConfig';
import {
  displayNumber,
  displayRange,
  formatDirectionNarrative,
  formatDominantDirection,
  formatSegmentRange
} from '../domain/narrative';
import { moonPhaseName } from '../domain/moon';
import {
  arabicDayName,
  formatDateDMY,
  formatDayLength,
  formatIsoTime,
  nowInRiyadh
} from '../domain/time';
import { DIRECTION_NAMES_AR, describeWindReason, getDirectionSeverity } from '../domain/wind';
import type { CurrentConditions, DailySummary, TimeSegment } from '../domain/types';
import { HourBar } from './HourBar';
import { Num, TimeRange } from './Num';
import { SeverityBadge, SeverityCounts } from './SeverityBadge';
import { MoonIcon, WindSourceArrow } from './icons';

interface DayPageProps {
  day: DailySummary;
  current: CurrentConditions | null;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function DayPage({
  day,
  current,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onToday
}: DayPageProps) {
  const now = nowInRiyadh();
  const isToday = day.date === now.dateIso;
  const nowHour = isToday ? now.hour + now.minute / 60 : null;
  const dominant = formatDominantDirection(day);
  const narrative = formatDirectionNarrative(day.directionSegments);

  return (
    <div className="day">
      <header className="day__head">
        <div className="day__title">
          <h2>
            {arabicDayName(day.date)}
            {isToday ? <span className="chip chip--today">اليوم</span> : null}
          </h2>
          <p className="day__date">
            <Num>{formatDateDMY(day.date)}</Num>
          </p>
        </div>
        <nav className="day__nav" aria-label="التنقل بين الأيام">
          <button type="button" onClick={onPrevious} disabled={!hasPrevious}>
            <span aria-hidden="true">→</span> السابق
          </button>
          <button type="button" onClick={onToday}>
            اليوم
          </button>
          <button type="button" onClick={onNext} disabled={!hasNext}>
            التالي <span aria-hidden="true">←</span>
          </button>
        </nav>
      </header>

      {isToday && current ? <NowSnapshot current={current} /> : null}

      <section className="card" aria-labelledby="day-summary-title">
        <h3 id="day-summary-title">ملخص اليوم</h3>
        <div className="day-summary">
          <div className="day-summary__block">
            <div className="day-summary__row">
              <SeverityBadge
                severity={dominant.direction ? getDirectionSeverity(dominant.direction) : null}
                label={dominant.short}
              />
              <span>{dominant.text}</span>
            </div>
            <p>
              مدى السرعة <Num>{displayRange(day.windMinKmh, day.windMaxKmh)}</Num>{' '}
              <small>كم/س</small>
            </p>
            <p>
              أعلى هبّة <Num>{displayNumber(day.gustMaxKmh)}</Num> <small>كم/س</small>
              {day.gustMaxTimeIso ? ` عند ${formatIsoTime(day.gustMaxTimeIso)}` : ''}
            </p>
            <SeverityCounts counts={day.windHoursBySeverity} />
          </div>

          <div className="day-summary__block">
            <p>
              الرطوبة أدنى <Num>{displayNumber(day.humidityMin)}%</Num> · متوسط{' '}
              <Num>{displayNumber(day.humidityMean)}%</Num> · أعلى{' '}
              <Num>{displayNumber(day.humidityMax)}%</Num>
            </p>
            <p className="muted">
              الأدنى عند {formatIsoTime(day.humidityMinTimeIso)} · الأعلى عند{' '}
              {formatIsoTime(day.humidityMaxTimeIso)}
            </p>
            <SeverityCounts counts={day.humidityHoursBySeverity} />
          </div>
        </div>
        <p className="day-summary__narrative">{narrative.text}</p>
      </section>

      <section className="card" aria-labelledby="day-map-title">
        <h3 id="day-map-title">خريطة اليوم</h3>
        <div className="daymap">
          <div className="daymap__line">
            <span className="daymap__label">الرياح</span>
            <HourBar
              hours={day.hours}
              kind="wind"
              label="خط الرياح الساعي"
              nowHour={nowHour}
              dimBefore={nowHour === null ? null : Math.floor(nowHour)}
            />
          </div>
          <div className="daymap__line">
            <span className="daymap__label">الرطوبة</span>
            <HourBar
              hours={day.hours}
              kind="humidity"
              label="خط الرطوبة الساعي"
              nowHour={nowHour}
              dimBefore={nowHour === null ? null : Math.floor(nowHour)}
              showAxis
            />
          </div>
        </div>
        <p className="muted">
          الاتجاه عند نقاط التحول:{' '}
          {day.directionSegments.length
            ? day.directionSegments.map((segment, index) => (
                <span key={segment.startHour}>
                  {index > 0 ? ' · ' : ''}
                  {DIRECTION_NAMES_AR[segment.direction]}{' '}
                  <TimeRange>
                    {formatSegmentRange(segment.startHour, segment.endHourExclusive)}
                  </TimeRange>
                </span>
              ))
            : '—'}
        </p>
      </section>

      <section className="card" aria-labelledby="wind-segments-title">
        <h3 id="wind-segments-title">فترات الرياح</h3>
        <SegmentList segments={day.windSegments} kind="wind" />
      </section>

      <section className="card" aria-labelledby="humidity-segments-title">
        <h3 id="humidity-segments-title">فترات الرطوبة</h3>
        <SegmentList segments={day.humiditySegments} kind="humidity" />
      </section>

      <section className="card sunmoon" aria-labelledby="sunmoon-title">
        <h3 id="sunmoon-title">الشمس والقمر</h3>
        <div className="sunmoon__grid">
          <p>
            <span className="label">الشروق</span> {formatIsoTime(day.sunriseIso)}
          </p>
          <p>
            <span className="label">الغروب</span> {formatIsoTime(day.sunsetIso)}
          </p>
          <p>
            <span className="label">طول النهار</span>{' '}
            {formatDayLength(day.sunriseIso, day.sunsetIso)}
          </p>
          <p className="sunmoon__moon">
            <MoonIcon index={day.moonPhaseIndex} size={26} />
            <span>{moonPhaseName(day.moonPhaseIndex)}</span>
          </p>
        </div>
      </section>

      <HourlyDetails day={day} />
    </div>
  );
}

function NowSnapshot({ current }: { current: CurrentConditions }) {
  return (
    <section className="card now" aria-labelledby="now-title">
      <h3 id="now-title">لقطة الآن</h3>
      <div className="now__grid">
        <div className="now__cell">
          <span className="label">الاتجاه</span>
          <div className="now__direction">
            <WindSourceArrow degree={current.windDegree} direction={current.direction} />
            <div>
              <strong>
                {current.direction ? DIRECTION_NAMES_AR[current.direction] : '—'}{' '}
                {current.windDegree !== null ? <Num>{`${Math.round(current.windDegree)}°`}</Num> : ''}
              </strong>
              <p className="muted">قادمة من</p>
            </div>
          </div>
        </div>

        <div className="now__cell">
          <span className="label">السرعة</span>
          <strong>
            <Num>{displayNumber(current.windSpeedKmh)}</Num> <small>كم/س</small>
          </strong>
          <SeverityBadge severity={current.windSeverity} />
        </div>

        <div className="now__cell">
          <span className="label">الهبّة</span>
          <strong>
            <Num>{displayNumber(current.windGustKmh)}</Num> <small>كم/س</small>
          </strong>
          <p className="muted">لا تدخل في اللون</p>
        </div>

        <div className="now__cell">
          <span className="label">الرطوبة</span>
          <strong>
            <Num>{displayNumber(current.humidity)}%</Num>
          </strong>
          <SeverityBadge severity={current.humiditySeverity} />
        </div>
      </div>
      <p className="muted now__note">
        القيم توقع نموذجي وليست قياس محطة لحظية في موقعك.
      </p>
    </section>
  );
}

function SegmentList({ segments, kind }: { segments: TimeSegment[]; kind: 'wind' | 'humidity' }) {
  if (segments.length === 0) {
    return <p className="muted">لا توجد فترات صالحة لهذا اليوم.</p>;
  }

  return (
    <ul className="segments">
      {segments.map((segment) => (
        <li key={`${segment.startIso}-${segment.severity}`} className={`segments__item segments__item--${segment.severity}`}>
          <span className="segments__time">
            <TimeRange>{formatSegmentRange(segment.startHour, segment.endHourExclusive)}</TimeRange>
          </span>
          {kind === 'wind' ? (
            <>
              <span className="segments__direction">
                {segment.direction ? DIRECTION_NAMES_AR[segment.direction] : '—'}
              </span>
              <span>
                <Num>{displayRange(segment.minValue, segment.maxValue)}</Num> <small>كم/س</small>
              </span>
              <span className="muted">
                هبّات حتى <Num>{displayNumber(segment.peakGustKmh ?? null)}</Num> كم/س
                {segment.peakGustTimeIso ? ` (${formatIsoTime(segment.peakGustTimeIso)})` : ''}
              </span>
              <SeverityBadge severity={segment.severity} />
              <span className="segments__reason">
                {segment.reasonCode ? describeWindReason(segment.reasonCode, segment.direction) : ''}
              </span>
            </>
          ) : (
            <>
              <span>
                <Num>{displayRange(segment.minValue, segment.maxValue)}%</Num>
              </span>
              <SeverityBadge severity={segment.severity} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

/** القسم 10.8 — قسم مطوي افتراضيًا للتحقق من صحة التلخيص. */
function HourlyDetails({ day }: { day: DailySummary }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="card" aria-labelledby="hourly-title">
      <button
        type="button"
        className="collapse__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span id="hourly-title">التفاصيل بالساعة</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        <div className="table-wrap">
          <table className="hourly">
            <thead>
              <tr>
                <th scope="col">الوقت</th>
                <th scope="col">الاتجاه</th>
                <th scope="col">الدرجة</th>
                <th scope="col">السرعة</th>
                <th scope="col">الهبّة</th>
                <th scope="col">الرطوبة</th>
                <th scope="col">حالة الرياح</th>
                <th scope="col">حالة الرطوبة</th>
              </tr>
            </thead>
            <tbody>
              {day.hours.map((point) => (
                <tr key={point.timeIso}>
                  <td>{formatIsoTime(point.timeIso)}</td>
                  <td>
                    {point.direction ? DIRECTION_NAMES_AR[point.direction] : '—'}
                    {point.directionSmoothed ? (
                      <span className="hourly__flag" title="اتجاه مُدمج مع الساعات المحيطة">
                        *
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <Num>{point.windDegree === null ? '—' : `${Math.round(point.windDegree)}°`}</Num>
                  </td>
                  <td>
                    <Num>{displayNumber(point.windSpeedKmh)}</Num>
                  </td>
                  <td>
                    <Num>{displayNumber(point.windGustKmh)}</Num>
                  </td>
                  <td>
                    <Num>{displayNumber(point.humidity)}</Num>
                  </td>
                  <td>
                    {point.windSeverity ? (
                      <SeverityBadge
                        severity={point.windSeverity}
                        label={SEVERITY_SHORT_LABELS[point.windSeverity]}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {point.humiditySeverity ? (
                      <SeverityBadge
                        severity={point.humiditySeverity}
                        label={SEVERITY_SHORT_LABELS[point.humiditySeverity]}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">* اتجاه مُنعَّم وفق قاعدة الساعتين في القسم 5.6.</p>
        </div>
      ) : null}
    </section>
  );
}
