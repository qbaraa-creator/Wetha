import type { DailySummary, WeekRanking } from './types';

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;

/** القسم 6.4 — أكثر أيام الأسبوع رطوبة وأقلها مع قواعد فض التعادل بالترتيب المحدد. */
export function rankHumidityDays(days: DailySummary[]): {
  mostHumidDate: string | null;
  leastHumidDate: string | null;
} {
  const candidates = days.filter((day) => day.humidityMean !== null);
  if (candidates.length === 0) {
    return { mostHumidDate: null, leastHumidDate: null };
  }

  const mostHumid = [...candidates].sort((a, b) => {
    const meanA = roundToOneDecimal(a.humidityMean as number);
    const meanB = roundToOneDecimal(b.humidityMean as number);
    if (meanA !== meanB) return meanB - meanA;
    if (a.humidityHoursBySeverity.red !== b.humidityHoursBySeverity.red) {
      return b.humidityHoursBySeverity.red - a.humidityHoursBySeverity.red;
    }
    const maxA = a.humidityMax ?? -Infinity;
    const maxB = b.humidityMax ?? -Infinity;
    if (maxA !== maxB) return maxB - maxA;
    return a.date.localeCompare(b.date);
  })[0];

  const leastHumid = [...candidates].sort((a, b) => {
    const meanA = roundToOneDecimal(a.humidityMean as number);
    const meanB = roundToOneDecimal(b.humidityMean as number);
    if (meanA !== meanB) return meanA - meanB;
    if (a.humidityHoursBySeverity.green !== b.humidityHoursBySeverity.green) {
      return b.humidityHoursBySeverity.green - a.humidityHoursBySeverity.green;
    }
    const minA = a.humidityMin ?? Infinity;
    const minB = b.humidityMin ?? Infinity;
    if (minA !== minB) return minA - minB;
    return a.date.localeCompare(b.date);
  })[0];

  return { mostHumidDate: mostHumid.date, leastHumidDate: leastHumid.date };
}

/** القسم 9.2.ب — أكثر يوم ساعات رياح خضراء؛ التعادل: أقل ساعات حمراء ثم الأقرب زمنيًا. */
export function rankBestGreenWindDay(days: DailySummary[]): string | null {
  if (days.length === 0) return null;

  const best = [...days].sort((a, b) => {
    if (a.windHoursBySeverity.green !== b.windHoursBySeverity.green) {
      return b.windHoursBySeverity.green - a.windHoursBySeverity.green;
    }
    if (a.windHoursBySeverity.red !== b.windHoursBySeverity.red) {
      return a.windHoursBySeverity.red - b.windHoursBySeverity.red;
    }
    return a.date.localeCompare(b.date);
  })[0];

  return best.date;
}

export function rankWeek(days: DailySummary[]): WeekRanking {
  return {
    ...rankHumidityDays(days),
    bestGreenWindDate: rankBestGreenWindDay(days)
  };
}
