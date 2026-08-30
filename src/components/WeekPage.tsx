import {
  displayNumber,
  displayRange,
  formatDirectionNarrative,
  formatDominantDirection
} from '../domain/narrative';
import { moonPhaseName } from '../domain/moon';
import {
  findOutdoorActivityWindows,
  type ActivityWindow
} from '../domain/outdoorActivity';
import { arabicDayName, formatDateDMY, formatHour12, formatIsoTime, nowInRiyadh } from '../domain/time';
import { getCombinedDirectionSeverity } from '../domain/wind';
import type { DailySummary, NormalizedForecast, WeekRanking } from '../domain/types';
import { HourBar } from './HourBar';
import { Legend } from './Legend';
import { Num, TimeRange } from './Num';
import { SeverityBadge, SeverityCounts } from './SeverityBadge';
import {
  ChevronIcon,
  CompassIcon,
  DropletIcon,
  GustIcon,
  InfoIcon,
  MoonIcon,
  SparklesIcon,
  SunIcon,
  WindIcon
} from './icons';

interface WeekPageProps {
  forecast: NormalizedForecast;
  ranking: WeekRanking;
}

function ActivityWindowList({
  windows,
  emptyText = 'لا توجد فترة تحقق المعايير'
}: {
  windows: ActivityWindow[];
  emptyText?: string;
}) {
  if (windows.length === 0) {
    return (
      <span className="green-outlook__none">
        <span aria-hidden="true">○</span> {emptyText}
      </span>
    );
  }

  const totalHours = windows.reduce(
    (total, window) => total + window.endHourExclusive - window.startHour,
    0
  );
  const hoursLabel =
    totalHours === 1
      ? 'ساعة واحدة مناسبة للنشاط الخارجي'
      : totalHours === 2
        ? 'ساعتان مناسبتان للنشاط الخارجي'
        : `${totalHours} ساعات مناسبة للنشاط الخارجي`;

  return (
    <span className="green-outlook__result">
      <span className="green-outlook__count" aria-label={hoursLabel}>
        <SeverityBadge severity="green" />
        <Num>{totalHours}س</Num>
      </span>
      <span className="green-outlook__windows">
      {windows.map((window) => (
        <span className="green-outlook__window" key={`${window.startHour}-${window.endHourExclusive}`}>
          <TimeRange>
            {formatHour12(window.startHour)}–{formatHour12(window.endHourExclusive)}
          </TimeRange>
        </span>
      ))}
      </span>
    </span>
  );
}

export function WeekPage({ forecast, ranking }: WeekPageProps) {
  const now = nowInRiyadh();
  const days = forecast.days;
  const futureDays = days.filter((day) => day.date >= now.dateIso);
  const outlookDays = (futureDays.length > 0 ? futureDays : days).slice(0, 7);
  const today = days.find((day) => day.date === now.dateIso) ?? null;
  const todayWindows = today ? findOutdoorActivityWindows(today.hours, now.hour) : [];

  return (
    <div className="week">
      <section className="green-outlook" aria-labelledby="green-outlook-title">
        <header className="green-outlook__head">
          <span className="section-icon" aria-hidden="true">
            <SparklesIcon size={20} />
          </span>
          <div>
            <h2 id="green-outlook-title">أفضل أوقات الأنشطة الخارجية</h2>
            <p>للمشي، الجلوس في الحديقة والبر خلال الأيام السبعة القادمة</p>
          </div>
        </header>

        <div className="green-outlook__criteria" aria-label="معايير الوقت المناسب">
          <span><CompassIcon size={16} /> شمالية أو شمالية غربية</span>
          <span><WindIcon size={16} /> سرعة 15–أقل من 25 كم/س</span>
          <span><DropletIcon size={16} /> رطوبة أقل من 50%</span>
        </div>

        <section className="green-outlook__today" aria-labelledby="today-activity-title">
          <div>
            <span className="chip chip--today">اليوم</span>
            <h3 id="today-activity-title">أفضل الأوقات المتبقية اليوم</h3>
            {today ? <Num>{formatDateDMY(today.date)}</Num> : null}
          </div>
          {today ? (
            <ActivityWindowList windows={todayWindows} emptyText="لا توجد فترة مناسبة متبقية اليوم" />
          ) : (
            <span className="green-outlook__none">بيانات اليوم غير متاحة</span>
          )}
        </section>

        <div className="green-outlook__week-title">
          <h3>نظرة الأيام السبعة</h3>
          <span>تتحقق الشروط الثلاثة في الوقت نفسه</span>
        </div>
        <div className="green-outlook__days">
          {outlookDays.map((day) => {
            const fromHour = day.date === now.dateIso ? now.hour : 0;
            return (
              <article
                className={`green-outlook__day${day.date === now.dateIso ? ' green-outlook__day--today' : ''}`}
                key={day.date}
              >
                <h3 aria-label={`${arabicDayName(day.date)} ${formatDateDMY(day.date)}`}>
                  <span>{arabicDayName(day.date)}</span>
                  <Num>{formatDateDMY(day.date)}</Num>
                </h3>
                <ActivityWindowList windows={findOutdoorActivityWindows(day.hours, fromHour)} />
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
  const directionSeverity = getCombinedDirectionSeverity(
    dominant.direction ? [dominant.direction] : day.variableDirections
  );
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
        <p className="day-row__line">
          <span className="day-row__line-icon" aria-hidden="true">
            <CompassIcon size={17} />
          </span>
          <span className="sr-only">الاتجاه العام:</span>
          <SeverityBadge
            severity={directionSeverity}
            label={dominant.short}
            title={dominant.text}
          />
        </p>

        <dl className="day-row__stats">
          <div className="day-row__stat">
            <dt><WindIcon size={16} /> السرعة</dt>
            <dd><Num>{displayRange(day.windMinKmh, day.windMaxKmh)}</Num> <small>كم/س</small></dd>
          </div>
          <div className="day-row__stat">
            <dt><GustIcon size={16} /> أعلى هبّة</dt>
            <dd>
              <Num>{displayNumber(day.gustMaxKmh)}</Num> <small>كم/س</small>
              {day.gustMaxTimeIso ? <small> · {formatIsoTime(day.gustMaxTimeIso)}</small> : null}
            </dd>
          </div>
          <div className="day-row__stat">
            <dt><DropletIcon size={16} /> متوسط الرطوبة</dt>
            <dd><Num>{displayNumber(day.humidityMean)}%</Num></dd>
          </div>
        </dl>
      </div>

      {/* شريط واحد بطبقتين: الأعلى للرياح والأسفل للرطوبة. */}
      <div className={`day-row__map${nowHour !== null ? ' day-row__map--has-now' : ''}`}>
        <div className="day-row__map-head" aria-hidden="true">
          <span><WindIcon size={15} /> رياح <i className="lane-mark lane-mark--wind" /></span>
          <span><DropletIcon size={15} /> رطوبة <i className="lane-mark lane-mark--humidity" /></span>
          <small>اسحب على الشريط لقراءة الساعة</small>
        </div>
        <HourBar
          hours={day.hours}
          label={`شريط الرياح والرطوبة الساعي ليوم ${dayName} ${dateText}`}
          nowHour={nowHour}
          dimBefore={dimBefore}
          showAxis
        />
      </div>

      <details className="day-row__details">
        <summary>
          <span><InfoIcon size={16} /> تفاصيل {dayName}</span>
          <ChevronIcon size={18} />
        </summary>
        <div className="day-row__details-body">
          <div className="day-row__detail-group">
            <h3><WindIcon size={16} /> ساعات الرياح</h3>
            <SeverityCounts counts={day.windHoursBySeverity} />
            <p className="day-row__narrative">{narrative.text}</p>
          </div>

          <div className="day-row__detail-group">
            <h3><DropletIcon size={16} /> ساعات الرطوبة</h3>
            <SeverityCounts counts={day.humidityHoursBySeverity} />
            <p>
              أدنى <Num>{displayNumber(day.humidityMin)}%</Num> · متوسط{' '}
              <Num>{displayNumber(day.humidityMean)}%</Num> · أعلى{' '}
              <Num>{displayNumber(day.humidityMax)}%</Num>
            </p>
          </div>

          <div className="day-row__detail-group day-row__astro">
            <h3><SunIcon size={16} /> الشمس والقمر</h3>
            <p>
              <SunIcon size={16} /> <span className="label">الشروق</span> {formatIsoTime(day.sunriseIso)}
            </p>
            <p>
              <SunIcon size={16} setting /> <span className="label">الغروب</span> {formatIsoTime(day.sunsetIso)}
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
