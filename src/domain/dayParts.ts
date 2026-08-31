import { DAY_PARTS, type DayPartId } from '../config/appConfig';
import type { HourlyWeatherPoint } from './types';

export interface DayPartSummary {
  id: DayPartId;
  labelAr: string;
  startHour: number;
  endHourExclusive: number;
  /** عدد الساعات التي وصلت فعلًا ضمن الفترة، أيًا كانت قيمها. */
  hourCount: number;
  windMinKmh: number | null;
  windMaxKmh: number | null;
  humidityMean: number | null;
  /** كل ساعات الفترة انقضت بالفعل — لحدود الجدول المتقطعة داخل التفاصيل. */
  isPast: boolean;
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

    return {
      id: part.id,
      labelAr: part.labelAr,
      startHour: part.startHour,
      endHourExclusive: part.endHourExclusive,
      hourCount: points.length,
      windMinKmh: speeds.length ? Math.min(...speeds) : null,
      windMaxKmh: speeds.length ? Math.max(...speeds) : null,
      humidityMean: humidities.length
        ? humidities.reduce((sum, value) => sum + value, 0) / humidities.length
        : null,
      isPast: nowHour !== null && nowHour >= part.endHourExclusive
    };
  });
}
