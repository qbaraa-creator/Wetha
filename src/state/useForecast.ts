import { useCallback, useEffect, useRef, useState } from 'react';
import { LOCATION, REFRESH_POLICY } from '../config/appConfig';
import { createOpenMeteoProvider } from '../providers/openMeteo';
import { loadForecast, saveForecast } from '../storage/forecastStore';
import { nowInRiyadh } from '../domain/time';
import type { NormalizedForecast } from '../domain/types';

export type ForecastStatus = 'loading' | 'ready' | 'error';
export type ForecastSource = 'network' | 'cache';

export interface ForecastState {
  status: ForecastStatus;
  forecast: NormalizedForecast | null;
  source: ForecastSource | null;
  isRefreshing: boolean;
  errorMessage: string | null;
  refresh: () => void;
}

const provider = createOpenMeteoProvider({
  timeoutMs: REFRESH_POLICY.requestTimeoutMs,
  maxRetries: REFRESH_POLICY.maxRetries
});

function ageMs(fetchedAtIso: string): number {
  return Date.now() - new Date(fetchedAtIso).getTime();
}

/** توقع لا يشمل تاريخ اليوم بتوقيت الرياض لم يعد صالحًا للقراءة اليومية. */
export function coversToday(forecast: NormalizedForecast | null): boolean {
  if (!forecast) return false;
  const today = nowInRiyadh().dateIso;
  return forecast.days.some((day) => day.date === today);
}

/**
 * تفاصيل التحذيرات تقنية (أسماء حقول ووحدات وأطوال مصفوفات) ولا تفيد القارئ،
 * فتذهب إلى سجل المطوّر بينما تُعرض للمستخدم جملة واحدة مبسطة (القسم 16).
 */
function logWarnings(source: string, warnings: string[]): void {
  if (warnings.length === 0) return;
  console.warn(`[forecast:${source}] ${warnings.length} تحذيرًا من طبقة البيانات`, warnings);
}

/** القسم 15 — التحديث والتخزين والعمل دون اتصال. */
export function useForecast(): ForecastState {
  const [forecast, setForecast] = useState<NormalizedForecast | null>(null);
  const [source, setSource] = useState<ForecastSource | null>(null);
  const [status, setStatus] = useState<ForecastStatus>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /** يمنع إطلاق طلبين متوازيين بسبب الضغط المتكرر (القسم 15.1). */
  const inFlight = useRef(false);
  const hasData = useRef(false);

  const fetchNow = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsRefreshing(true);

    try {
      const fresh = await provider.getSevenDayForecast(LOCATION);
      logWarnings('network', fresh.warnings);
      setForecast(fresh);
      setSource('network');
      setStatus('ready');
      setErrorMessage(null);
      hasData.current = true;
      await saveForecast(fresh);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'تعذّر الوصول إلى مصدر البيانات.';
      setErrorMessage(message);
      if (!hasData.current) setStatus('error');
    } finally {
      inFlight.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = await loadForecast(LOCATION.id);
      if (cancelled) return;

      if (stored) {
        logWarnings('cache', stored.forecast.warnings);
        setForecast(stored.forecast);
        setSource('cache');
        setStatus('ready');
        hasData.current = true;
        // تحديث خلفي إذا تجاوز آخر جلب المهلة، أو إذا لم يعد المحفوظ يشمل اليوم
        // مهما كان عمره — أسبوع بلا تاريخ اليوم لا يجيب سؤال المستخدم أصلًا.
        if (
          ageMs(stored.fetchedAtIso) > REFRESH_POLICY.staleAfterMs ||
          !coversToday(stored.forecast)
        ) {
          void fetchNow();
        }
        return;
      }

      void fetchNow();
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchNow]);

  useEffect(() => {
    const timer = window.setInterval(() => void fetchNow(), REFRESH_POLICY.intervalMs);
    const onOnline = () => void fetchNow();
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', onOnline);
    };
  }, [fetchNow]);

  return {
    status,
    forecast,
    source,
    isRefreshing,
    errorMessage,
    refresh: () => void fetchNow()
  };
}
