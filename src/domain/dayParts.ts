import { DAY_PARTS, type DayPartId } from '../config/appConfig';
import { worseSeverity } from './severity';
import type { DirectionCode, HourlyWeatherPoint, Severity } from './types';

export interface DayPartSummary {
  id: DayPartId;
  labelAr: string;
  startHour: number;
  endHourExclusive: number;
  /** عدد الساعات التي وصلت فعلًا ضمن الفترة، أيًا كانت قيمها. */
  hourCount: number;
  windSeverity: Severity | null;
  humiditySeverity: Severity | null;
  windMinKmh: number | null;
  windMaxKmh: number | null;
  gustMaxKmh: number | null;
  humidityMean: number | null;
  dominantDirection: DirectionCode | null;
  /** كل ساعات الفترة انقضت بالفعل — للتخفيت البصري في بطاقة اليوم. */
  isPast: boolean;
}

/**
 * حالة الفترة = الحالة الأكثر تكرارًا بين ساعاتها، والتعادل يُحسم للأسوأ.
 *
 * لم نأخذ أسوأ ساعة لأن ساعة واحدة رديئة كانت ستصبغ الصباح كله؛ ولا الأولى
 * لأنها لا تمثل الفترة. الأغلبية تصف ما سيجده الخارج فعلًا خلال الفترة،
 * والتفصيل الساعي يبقى متاحًا في لوحة التفاصيل لمن أراد الدقة.
 */
function majoritySeverity(values: Array<Severity | null>): Severity | null {
  const counts = new Map<Severity, number>();
  values.forEach((value) => {
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  if (counts.size === 0) return null;

  let winner: Severity | null = null;
  let best = 0;
  counts.forEach((count, severity) => {
    if (count > best) {
      best = count;
      winner = severity;
    } else if (count === best && winner) {
      winner = worseSeverity(winner, severity);
    }
  });
  return winner;
}

function dominantOf(points: HourlyWeatherPoint[]): DirectionCode | null {
  const counts = new Map<DirectionCode, number>();
  points.forEach((point) => {
    if (point.direction) counts.set(point.direction, (counts.get(point.direction) ?? 0) + 1);
  });
  let winner: DirectionCode | null = null;
  let best = 0;
  counts.forEach((count, direction) => {
    if (count > best) {
      best = count;
      winner = direction;
    }
  });
  return winner;
}

const finite = (values: Array<number | null>): number[] =>
  values.filter((value): value is number => value !== null);

/**
 * يقسّم ساعات اليوم إلى الفترات المعرَّفة في الإعداد.
 * الفترات لا تتداخل ولا تلتف حول منتصف الليل، فكل ساعة تقع في فترة واحدة بالضبط.
 * `nowHour` يمرَّر لليوم الحالي فقط لتمييز الفترات المنقضية.
 */
export function summarizeDayParts(
  hours: HourlyWeatherPoint[],
  nowHour: number | null = null
): DayPartSummary[] {
  return DAY_PARTS.map((part) => {
    const points = hours.filter(
      (point) => point.localHour >= part.startHour && point.localHour < part.endHourExclusive
    );
    const speeds = finite(points.map((point) => point.windSpeedKmh));
    const humidities = finite(points.map((point) => point.humidity));
    const gusts = finite(points.map((point) => point.windGustKmh));

    return {
      id: part.id,
      labelAr: part.labelAr,
      startHour: part.startHour,
      endHourExclusive: part.endHourExclusive,
      hourCount: points.length,
      windSeverity: majoritySeverity(points.map((point) => point.windSeverity)),
      humiditySeverity: majoritySeverity(points.map((point) => point.humiditySeverity)),
      windMinKmh: speeds.length ? Math.min(...speeds) : null,
      windMaxKmh: speeds.length ? Math.max(...speeds) : null,
      gustMaxKmh: gusts.length ? Math.max(...gusts) : null,
      humidityMean: humidities.length
        ? humidities.reduce((sum, value) => sum + value, 0) / humidities.length
        : null,
      dominantDirection: dominantOf(points),
      isPast: nowHour !== null && nowHour >= part.endHourExclusive
    };
  });
}
