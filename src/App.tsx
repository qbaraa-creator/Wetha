import { useMemo } from 'react';
import { DATA_ATTRIBUTION, LOCATION } from './config/appConfig';
import { rankWeek } from './domain/ranking';
import { formatDateDMY, formatHour12, nowInRiyadh } from './domain/time';
import { useForecast } from './state/useForecast';
import { useRiyadhClock } from './state/useRiyadhClock';
import { Num } from './components/Num';
import { WeekPage } from './components/WeekPage';
import { CalendarIcon, ClockIcon, LocationIcon, RefreshIcon } from './components/icons';

/** وقت آخر تحديث بتوقيت الرياض. */
function formatFetchedAt(fetchedAtIso: string): string {
  const moment = nowInRiyadh(new Date(fetchedAtIso));
  return `${formatHour12(moment.hour, moment.minute)} · ${formatDateDMY(moment.dateIso)}`;
}

export default function App() {
  const { status, forecast, source, isRefreshing, errorMessage, refresh } = useForecast();
  const now = useRiyadhClock();

  const ranking = useMemo(
    () =>
      forecast
        ? rankWeek(forecast.days)
        : { mostHumidDate: null, leastHumidDate: null, bestGreenWindDate: null },
    [forecast]
  );

  const days = forecast?.days ?? [];
  const hasToday = days.some((day) => day.date === now.dateIso);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__location" aria-hidden="true">
            <LocationIcon size={21} />
          </span>
          <div>
            <p className="app-header__eyebrow">توقعات الرياح والرطوبة</p>
            <h1>طقس {LOCATION.nameAr}</h1>
          </div>
        </div>

        <button
          type="button"
          className={`refresh${isRefreshing ? ' refresh--busy' : ''}`}
          onClick={refresh}
          disabled={isRefreshing}
          aria-live="polite"
        >
          <RefreshIcon size={17} />
          <span>{isRefreshing ? 'جارٍ التحديث…' : 'تحديث'}</span>
        </button>

        <div className="app-header__meta">
          {days.length ? (
            <p className="app-header__range">
              <CalendarIcon size={15} />
              <span className="sr-only">فترة التوقع:</span>
              <Num>{formatDateDMY(days[0].date)}</Num>
              <span aria-hidden="true">–</span>
              <Num>{formatDateDMY(days[days.length - 1].date)}</Num>
            </p>
          ) : null}
          <p className="app-header__updated">
            <ClockIcon size={15} />
            {forecast
              ? `آخر تحديث ${formatFetchedAt(forecast.fetchedAtIso)}`
              : 'لم يتم التحديث بعد'}
          </p>
        </div>
      </header>

      {source === 'cache' && forecast ? (
        hasToday ? (
          <p className="banner banner--cache" role="status">
            بيانات محفوظة — آخر تحديث {formatFetchedAt(forecast.fetchedAtIso)}
          </p>
        ) : (
          <p className="banner banner--warn" role="status">
            بيانات قديمة لا تشمل اليوم — آخر تحديث {formatFetchedAt(forecast.fetchedAtIso)}
          </p>
        )
      ) : null}

      {/* التفاصيل التقنية للتحذيرات تذهب إلى سجل المطوّر؛ هنا جملة واحدة تكفي. */}
      {forecast && forecast.warnings.length > 0 ? (
        <p className="banner banner--note" role="status">
          بعض قيم هذا الأسبوع وصلت ناقصة أو غير متوقعة، وتُركت خاناتها بلا لون.
        </p>
      ) : null}

      {errorMessage && forecast ? (
        <p className="banner banner--warn" role="status">
          تعذّر التحديث الآن: {errorMessage}
        </p>
      ) : null}

      <main className="app-main" aria-label="توقعات جدة">
        {status === 'loading' ? <Skeleton /> : null}

        {status === 'error' ? (
          <section className="empty" role="alert">
            <h2>تعذّر جلب التوقع</h2>
            <p>{errorMessage ?? 'لا توجد بيانات محفوظة على هذا الجهاز.'}</p>
            <button type="button" className="refresh" onClick={refresh} disabled={isRefreshing}>
              إعادة المحاولة
            </button>
          </section>
        ) : null}

        {status === 'ready' && forecast ? (
          <WeekPage forecast={forecast} ranking={ranking} now={now} />
        ) : null}
      </main>

      <footer className="app-footer">
        <p>
          <a href={DATA_ATTRIBUTION.href} target="_blank" rel="noreferrer noopener">
            {DATA_ATTRIBUTION.label}
          </a>
        </p>
        <p className="muted">القيم توقعات نموذجية بتوقيت الرياض، وليست قياسات محطة محلية لحظية.</p>
      </footer>
    </div>
  );
}

/** القسم 16 — هيكل يحافظ على شكل الصفوف والأشرطة بلا قيم وهمية. */
function Skeleton() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="جارٍ تحميل التوقع">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="skeleton__row">
          <div className="skeleton__title" />
          <div className="skeleton__bar" />
        </div>
      ))}
    </div>
  );
}
