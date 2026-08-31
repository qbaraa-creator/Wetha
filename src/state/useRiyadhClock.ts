import { useCallback, useEffect, useState } from 'react';
import { msUntilNextHour, nowInRiyadh, type RiyadhNow } from '../domain/time';

/**
 * ساعة واجهة محاذية لرأس الساعة بتوقيت الرياض.
 * التحديث عند العودة يغطي مسار PWA الذي قد تجمّد فيه المتصفح والمؤقّتات بالخلفية.
 */
export function useRiyadhClock(): RiyadhNow {
  const [now, setNow] = useState<RiyadhNow>(() => nowInRiyadh());
  const tick = useCallback(() => setNow(nowInRiyadh()), []);

  useEffect(() => {
    let timer = 0;

    const scheduleNextHour = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        tick();
        scheduleNextHour();
      }, msUntilNextHour());
    };

    const onVisible = () => {
      if (!document.hidden) tick();
    };

    scheduleNextHour();
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [tick]);

  return now;
}
