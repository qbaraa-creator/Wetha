import {
  displayNumber,
  displayRange,
  formatDirectionNarrative,
  formatDominantDirection
} from '../domain/narrative';
import { moonPhaseName } from '../domain/moon';
import { arabicDayName, formatDateDMY, formatIsoTime, nowInRiyadh } from '../domain/time';
import { getDirectionSeverity } from '../domain/wind';
import type { DailySummary, NormalizedForecast, WeekRanking } from '../domain/types';
import { HourBar } from './HourBar';
import { Legend } from './Legend';
import { Num } from './Num';
import { SeverityBadge, SeverityCounts } from './SeverityBadge';
import { MoonIcon } from './icons';

interface WeekPageProps {
  forecast: NormalizedForecast;
  ranking: WeekRanking;
  onOpenDay: (date: string) => void;
}

function summaryDayLabel(days: DailySummary[], date: string | null) {
  if (!date) return '—';
  const day = days.find((item) => item.date === date);
  if (!day) return '—';
  return (
    <>
      {arabicDayName(date)} <Num>{formatDateDMY(date)}</Num>
    </>
  );
}

export function WeekPage({ forecast, ranking, onOpenDay }: WeekPageProps) {
  const now = nowInRiyadh();
  const days = forecast.days;

  const greenDay = days.find((day) => day.date === ranking.bestGreenWindDate);
  // القسم 9.2.ب يختار دائمًا يومًا فائزًا؛ إن كانت ساعاته الخضراء صفرًا فالعنوان مضلل،
  // فتتحول البطاقة إلى «أقل ساعات حمراء» — وهو بالضبط ما فضّه فض التعادل.
  const hasGreenWindHours = (greenDay?.windHoursBySeverity.green ?? 0) > 0;
  const mostHumid = days.find((day) => day.date === ranking.mostHumidDate);
  const leastHumid = days.find((day) => day.date === ranking.leastHumidDate);

  return (
    <div className="week">
      <section className="week-summary" aria-label="ملخص الأسبوع">
        <article className="summary-card">
          <h2>{hasGreenWindHours ? 'أكثر ساعات رياح خضراء' : 'أقل ساعات رياح حمراء'}</h2>
          <p className="summary-card__value">{summaryDayLabel(days, ranking.bestGreenWindDate)}</p>
          <p className="summary-card__detail">
            {!greenDay ? (
              '—'
            ) : hasGreenWindHours ? (
              <>
                <Num>{greenDay.windHoursBySeverity.green}</Num> ساعة خضراء
              </>
            ) : (
              <>
                <Num>{greenDay.windHoursBySeverity.red}</Num> ساعة حمراء — لا توجد ساعات رياح خضراء هذا
                الأسبوع
              </>
            )}
          </p>
        </article>

        <article className="summary-card">
          <h2>الأكثر رطوبة</h2>
          <p className="summary-card__value">{summaryDayLabel(days, ranking.mostHumidDate)}</p>
          <p className="summary-card__detail">
            {mostHumid?.humidityMean !== null && mostHumid
              ? <>متوسط <Num>{displayNumber(mostHumid.humidityMean)}%</Num></>
              : '—'}
          </p>
        </article>

        <article className="summary-card">
          <h2>الأقل رطوبة</h2>
          <p className="summary-card__value">{summaryDayLabel(days, ranking.leastHumidDate)}</p>
          <p className="summary-card__detail">
            {leastHumid?.humidityMean !== null && leastHumid
              ? <>متوسط <Num>{displayNumber(leastHumid.humidityMean)}%</Num></>
              : '—'}
          </p>
        </article>
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
            onOpen={() => onOpenDay(day.date)}
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
  onOpen: () => void;
}

function DayRow({ day, isToday, nowHour, isMostHumid, isLeastHumid, onOpen }: DayRowProps) {
  const dominant = formatDominantDirection(day);
  const narrative = formatDirectionNarrative(day.directionSegments);
  const dayName = arabicDayName(day.date);
  const dateText = formatDateDMY(day.date);
  const dimBefore = nowHour === null ? null : Math.floor(nowHour);

  return (
    <article className={`day-row${isToday ? ' day-row--today' : ''}`}>
      <header className="day-row__head">
        <button type="button" className="day-row__open" onClick={onOpen}>
          <span className="day-row__name">
            {dayName}
            {isToday ? <span className="chip chip--today">اليوم</span> : null}
          </span>
          <span className="day-row__date">
            <Num>{dateText}</Num>
          </span>
        </button>
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

      {/* شريطان بمحور زمني واحد: المحور يُرسم مع الشريط الأخير ويخدم الاثنين
          لأنهما في العمود نفسه وبالعرض نفسه. */}
      <div className={`day-row__map${nowHour !== null ? ' day-row__map--has-now' : ''}`}>
        <span className="day-row__map-label">رياح</span>
        <HourBar
          hours={day.hours}
          kind="wind"
          label={`شريط الرياح الساعي ليوم ${dayName} ${dateText}`}
          nowHour={nowHour}
          dimBefore={dimBefore}
        />
        <span className="day-row__map-label">رطوبة</span>
        <HourBar
          hours={day.hours}
          kind="humidity"
          label={`شريط الرطوبة الساعي ليوم ${dayName} ${dateText}`}
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
