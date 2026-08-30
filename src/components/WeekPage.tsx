import {
  displayNumber,
  displayRange,
  formatDirectionNarrative,
  formatDominantDirection
} from '../domain/narrative';
import { findGreenWindows, type GreenWindow } from '../domain/greenWindows';
import { moonPhaseName } from '../domain/moon';
import { arabicDayName, formatDateDMY, formatHour12, formatIsoTime, nowInRiyadh } from '../domain/time';
import { getDirectionSeverity } from '../domain/wind';
import type { DailySummary, NormalizedForecast, WeekRanking } from '../domain/types';
import { HourBar } from './HourBar';
import { Legend } from './Legend';
import { Num, TimeRange } from './Num';
import { SeverityBadge, SeverityCounts } from './SeverityBadge';
import { MoonIcon } from './icons';

interface WeekPageProps {
  forecast: NormalizedForecast;
  ranking: WeekRanking;
}

function GreenWindowList({ windows }: { windows: GreenWindow[] }) {
  if (windows.length === 0) return <span className="green-outlook__none">لا توجد</span>;
  return (
    <span className="green-outlook__windows">
      {windows.map((window, index) => (
        <span key={`${window.startHour}-${window.endHourExclusive}`}>
          {index > 0 ? ' · ' : ''}
          <TimeRange>
            {formatHour12(window.startHour)}–{formatHour12(window.endHourExclusive)}
          </TimeRange>
        </span>
      ))}
    </span>
  );
}

export function WeekPage({ forecast, ranking }: WeekPageProps) {
  const now = nowInRiyadh();
  const days = forecast.days;
  const futureDays = days.filter((day) => day.date >= now.dateIso);
  const outlookDays = (futureDays.length > 0 ? futureDays : days).slice(0, 5);

  return (
    <div className="week">
      <section className="green-outlook" aria-labelledby="green-outlook-title">
        <header className="green-outlook__head">
          <h2 id="green-outlook-title">الساعات المناسبة خلال 5 أيام</h2>
          <p>الرياح والرطوبة معروضتان كلٌّ على حدة.</p>
        </header>
        <div className="green-outlook__days">
          {outlookDays.map((day) => {
            const fromHour = day.date === now.dateIso ? now.hour : 0;
            return (
              <article className="green-outlook__day" key={day.date}>
                <h3>
                  {arabicDayName(day.date)} <Num>{formatDateDMY(day.date)}</Num>
                </h3>
                <p>
                  <span className="green-outlook__metric">
                    <SeverityBadge severity="green" /> رياح
                  </span>
                  <GreenWindowList windows={findGreenWindows(day.hours, 'wind', fromHour)} />
                </p>
                <p>
                  <span className="green-outlook__metric">
                    <SeverityBadge severity="green" /> رطوبة
                  </span>
                  <GreenWindowList windows={findGreenWindows(day.hours, 'humidity', fromHour)} />
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="week-days">
        {days.map((day) => (
          <DayRow
            key={day.date}
            day={day}
            isToday={day.date === now.dateIso}
            nowHour={day.date === now.dateIso ? now.hour + now.minute / 60 : null}
            isMostHumid={day.date === ranking.mostHumidDate}
            isLeastHumid={day.date === ranking.leastHumidDate}
          />
        ))}
      </div>

      <Legend />
    </div>
  );
}

interface DayRowProps {
  day: DailySummary;
  isToday: boolean;
  nowHour: number | null;
  isMostHumid: boolean;
  isLeastHumid: boolean;
}

function DayRow({ day, isToday, nowHour, isMostHumid, isLeastHumid }: DayRowProps) {
  const dominant = formatDominantDirection(day);
  const narrative = formatDirectionNarrative(day.directionSegments);
  const dayName = arabicDayName(day.date);
  const dateText = formatDateDMY(day.date);
  const dimBefore = nowHour === null ? null : Math.floor(nowHour);

  return (
    <article className={`day-row${isToday ? ' day-row--today' : ''}`}>
      <header className="day-row__head">
        <div className="day-row__identity">
          <h2 className="day-row__name">
            {dayName}
            {isToday ? <span className="chip chip--today">اليوم</span> : null}
          </h2>
          <span className="day-row__date">
            <Num>{dateText}</Num>
          </span>
        </div>
        <div className="day-row__flags">
          {isMostHumid ? <span className="chip chip--most">الأكثر رطوبة</span> : null}
          {isLeastHumid ? <span className="chip chip--least">الأقل رطوبة</span> : null}
        </div>
      </header>

      <div className="day-row__facts">
        {/* الشارة تحمل الاتجاه ولونه معًا؛ النص الكامل يبقى في `title` وفي صفحة اليوم. */}
        <p className="day-row__line">
          <span className="sr-only">الاتجاه العام:</span>
          <SeverityBadge
            severity={dominant.direction ? getDirectionSeverity(dominant.direction) : null}
            label={dominant.short}
            title={dominant.text}
          />
        </p>

        <p className="day-row__numbers">
          <span>
            السرعة <Num>{displayRange(day.windMinKmh, day.windMaxKmh)}</Num> <small>كم/س</small>
          </span>
          <span>
            هبّة <Num>{displayNumber(day.gustMaxKmh)}</Num> <small>كم/س</small>{' '}
            {day.gustMaxTimeIso ? `عند ${formatIsoTime(day.gustMaxTimeIso)}` : ''}
          </span>
          <span>
            رطوبة <Num>{displayNumber(day.humidityMean)}%</Num>
          </span>
        </p>
      </div>

      {/* شريط واحد بطبقتين: الأعلى للرياح والأسفل للرطوبة. */}
      <div className={`day-row__map${nowHour !== null ? ' day-row__map--has-now' : ''}`}>
        <span className="day-row__map-labels" aria-hidden="true">
          <span>رياح</span>
          <span>رطوبة</span>
        </span>
        <HourBar
          hours={day.hours}
          label={`شريط الرياح والرطوبة الساعي ليوم ${dayName} ${dateText}`}
          nowHour={nowHour}
          dimBefore={dimBefore}
          showAxis
        />
      </div>

      <details className="day-row__details">
        <summary>تفاصيل {dayName}</summary>
        <div className="day-row__details-body">
          <div className="day-row__detail-group">
            <h3>ساعات الرياح</h3>
            <SeverityCounts counts={day.windHoursBySeverity} />
            <p className="day-row__narrative">{narrative.text}</p>
          </div>

          <div className="day-row__detail-group">
            <h3>ساعات الرطوبة</h3>
            <SeverityCounts counts={day.humidityHoursBySeverity} />
            <p>
              أدنى <Num>{displayNumber(day.humidityMin)}%</Num> · متوسط{' '}
              <Num>{displayNumber(day.humidityMean)}%</Num> · أعلى{' '}
              <Num>{displayNumber(day.humidityMax)}%</Num>
            </p>
          </div>

          <div className="day-row__detail-group day-row__astro">
            <h3>الشمس والقمر</h3>
            <p>
              <span className="label">الشروق</span> {formatIsoTime(day.sunriseIso)}
            </p>
            <p>
              <span className="label">الغروب</span> {formatIsoTime(day.sunsetIso)}
            </p>
            <p className="day-row__moon">
              <MoonIcon index={day.moonPhaseIndex} />
              <span>{moonPhaseName(day.moonPhaseIndex)}</span>
            </p>
          </div>
        </div>
      </details>
    </article>
  );
}
