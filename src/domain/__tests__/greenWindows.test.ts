import { makeFullDay } from './testHelpers';
import { findGreenWindows } from '../greenWindows';

describe('تلخيص الساعات الخضراء', () => {
  const hours = makeFullDay(
    '2026-08-19',
    { direction: 'NW', speed: 20, gust: 35, humidity: 40 },
    {
      2: { speed: 10 },
      3: { humidity: 60 },
      4: { speed: 10, humidity: 80 }
    }
  ).slice(0, 6);

  it('يجمع ساعات الرياح المتتالية ويكسر النطاق عند تغير الحالة', () => {
    expect(findGreenWindows(hours, 'wind')).toEqual([
      { startHour: 0, endHourExclusive: 2 },
      { startHour: 3, endHourExclusive: 4 },
      { startHour: 5, endHourExclusive: 6 }
    ]);
  });

  it('يلخص الرطوبة باستقلال عن لون الرياح', () => {
    expect(findGreenWindows(hours, 'humidity')).toEqual([
      { startHour: 0, endHourExclusive: 3 },
      { startHour: 5, endHourExclusive: 6 }
    ]);
  });

  it('يستبعد ساعات اليوم التي مضت من ملخص القادم', () => {
    expect(findGreenWindows(hours, 'humidity', 2)).toEqual([
      { startHour: 2, endHourExclusive: 3 },
      { startHour: 5, endHourExclusive: 6 }
    ]);
  });
});
