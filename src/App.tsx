import { useEffect, useMemo, useRef, useState } from 'react';
import { DATA_ATTRIBUTION, LOCATION } from './config/appConfig';
import { rankWeek } from './domain/ranking';
import { arabicDayName, formatDateDMY, formatHour12, nowInRiyadh } from './domain/time';
import { useForecast } from './state/useForecast';
import { DayPage } from './components/DayPage';
import { Num } from './components/Num';
import { WeekPage } from './components/WeekPage';

type Route = { name: 'week' } | { name: 'day'; date: string };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [section, value] = hash.split('/');
  if (section === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) {
    return { name: 'day', date: value };
  }
  return { name: 'week' };
}

function setHash(route: Route) {
  window.location.hash = route.name === 'week' ? '#/week' : `#/day/${route.date}`;
}

/** وقت آخر تحديث بتوقيت الرياض. */
function formatFetchedAt(fetchedAtIso: string): string {
  const moment = nowInRiyadh(new Date(fetchedAtIso));
  return `${formatHour12(moment.hour, moment.minute)} · ${formatDateDMY(moment.dateIso)}`;
}

export default function App() {
  const { status, forecast, source, isRefreshing, errorMessage, refresh } = useForecast();
  const [route, setRoute] = useState<Route>(parseHash);
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRoute = useRef(true);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // المتصفح يستعيد موضع التمرير عند تغيّر الـ hash، فتفتح صفحة اليوم من منتصفها
  // ويغطي الرأس اللاصق بدايتها. نتولى التمرير بأنفسنا بدلًا منه.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  const ranking = useMemo(
    () => (forecast ? rankWeek(forecast.days) : { mostHumidDate: null, leastHumidDate: null, bestGreenWindDate: null }),
    [forecast]
  );

  const days = forecast?.days ?? [];
  const today = nowInRiyadh().dateIso;
  const hasToday = days.some((day) => day.date === today);

  const selectedDate =
    route.name === 'day' && days.some((day) => day.date === route.date)
      ? route.date
      : hasToday
        ? today
        : days[0]?.date;

  const selectedIndex = days.findIndex((day) => day.date === selectedDate);
  const selectedDay = selectedIndex >= 0 ? days[selectedIndex] : null;

  const goToWeek = () => setHash({ name: 'week' });
  const goToDay = (date: string) => setHash({ name: 'day', date });

  const routeKey = route.name === 'day' ? `day/${selectedDate ?? ''}` : 'week';
  const pageTitle =
    route.name === 'day' && selectedDay
      ? `صفحة اليوم — ${arabicDayName(selectedDay.date)} ${formatDateDMY(selectedDay.date)}`
      : 'صفحة الأسبوع';

  // عند تغيّر الصفحة: التمرير للأعلى ونقل التركيز إلى المحتوى بدل بقائه على <body>،
  // حتى تبدأ قارئة الشاشة ولوحة المفاتيح من أول الصفحة الجديدة (القسم 21.7).
  useEffect(() => {
    if (isFirstRoute.current) {
      isFirstRoute.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [routeKey]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__main">
          <h1>{LOCATION.nameAr}</h1>
          {days.length ? (
            <p className="app-header__range">
              <Num>{formatDateDMY(days[0].date)}</Num> — <Num>{formatDateDMY(days[days.length - 1].date)}</Num>
            </p>
          ) : null}
        </div>

        <div className="app-header__side">
          <p className="app-header__updated">
            {forecast ? `آخر تحديث ${formatFetchedAt(forecast.fetchedAtIso)}` : 'لم يتم التحديث بعد'}
          </p>
          <button
            type="button"
            className="refresh"
            onClick={refresh}
            disabled={isRefreshing}
            aria-live="polite"
          >
            {isRefreshing ? 'جارٍ التحديث…' : 'تحديث'}
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="التنقل الرئيسي">
        <button
          type="button"
          className={route.name === 'week' ? 'is-active' : ''}
          aria-current={route.name === 'week' ? 'page' : undefined}
          onClick={goToWeek}
        >
          الأسبوع
        </button>
        <button
          type="button"
          className={route.name === 'day' ? 'is-active' : ''}
          aria-current={route.name === 'day' ? 'page' : undefined}
          onClick={() => selectedDate && goToDay(selectedDate)}
          disabled={!selectedDate}
        >
          اليوم المختار
        </button>
      </nav>

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

      {/* اسم المنطقة هو عنوان الصفحة، وإليها ينتقل التركيز بعد كل تنقل،
          فتنطق قارئة الشاشة الصفحة الجديدة مرة واحدة بلا تكرار. */}
      <main className="app-main" ref={mainRef} tabIndex={-1} aria-label={pageTitle}>
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
          route.name === 'day' && selectedDay ? (
            <DayPage
              day={selectedDay}
              current={forecast.current}
              hasPrevious={selectedIndex > 0}
              hasNext={selectedIndex < days.length - 1}
              onPrevious={() => goToDay(days[selectedIndex - 1].date)}
              onNext={() => goToDay(days[selectedIndex + 1].date)}
              onToday={() => goToDay(hasToday ? today : days[0].date)}
            />
          ) : (
            <WeekPage forecast={forecast} ranking={ranking} onOpenDay={goToDay} />
          )
        ) : null}
      </main>

      <footer className="app-footer">
        <p>
          <a href={DATA_ATTRIBUTION.href} target="_blank" rel="noreferrer noopener">
            {DATA_ATTRIBUTION.label}
          </a>
        </p>
        <p className="muted">
          القيم توقعات نموذجية بتوقيت الرياض، وليست قياسات محطة محلية لحظية.
        </p>
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
          <div className="skeleton__bar" />
        </div>
      ))}
    </div>
  );
}
