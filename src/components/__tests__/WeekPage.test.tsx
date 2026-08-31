// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rankWeek } from '../../domain/ranking';
import { nowInRiyadh } from '../../domain/time';
import { TEST_NOW, makeTestForecast } from '../../test/forecast';
import { WeekPage } from '../WeekPage';

describe('صفحة الأسبوع', () => {
  const now = nowInRiyadh(new Date(TEST_NOW));
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TEST_NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('يعرض أفضل أوقات اليوم والأيام السبعة وفق المعايير الثلاثة', () => {
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);

    const outlook = screen.getByRole('region', { name: 'أفضل أوقات الأنشطة الخارجية' });
    expect(within(outlook).getAllByRole('article')).toHaveLength(6);
    expect(
      within(outlook).queryByRole('heading', { name: /الأربعاء 19\/08\/2026/ })
    ).not.toBeInTheDocument();
    expect(
      within(outlook).getByRole('heading', { name: /الخميس 20\/08\/2026/, level: 4 })
    ).toBeVisible();
    expect(within(outlook).getByText('أفضل الأوقات المتبقية اليوم')).toBeVisible();
    expect(within(outlook).getByText('شمالية أو شمالية غربية')).toBeVisible();
    expect(within(outlook).getByText('سرعة 15–أقل من 25 كم/س')).toBeVisible();
    expect(within(outlook).getByText('رطوبة أقل من 50%')).toBeVisible();
  });

  it('يعرض شريطًا مركبًا ومحورًا واحدًا فقط لكل يوم وتفاصيل مطوية افتراضيًا', () => {
    const forecast = makeTestForecast();
    const { container } = render(
      <WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />
    );

    expect(container.querySelectorAll('.hourbar__track')).toHaveLength(7);
    expect(container.querySelectorAll('.hourbar__axis')).toHaveLength(7);
    expect(container.querySelectorAll('.hourbar__lane')).toHaveLength(7 * 24 * 2);
    expect(container.querySelectorAll('details')).toHaveLength(7);
    expect(container.querySelectorAll('details[open]')).toHaveLength(0);
  });

  it('يفتح التفاصيل الأصلية ويُبقي سرد التحولات متاحًا', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);

    const summary = screen.getByText('تفاصيل الأربعاء');
    const details = summary.closest('details');
    expect(details).not.toHaveAttribute('open');
    await user.click(summary);
    expect(details).toHaveAttribute('open');
    expect(screen.getAllByText('ساعات الرياح')[0]).toBeInTheDocument();
  });

  it('يجمع ساعات النشاط المتزامنة ويستبعد الماضي من اليوم', () => {
    const forecast = makeTestForecast();
    forecast.days[0].hours.forEach((hour) => {
      hour.direction = 'W';
      hour.windSpeedKmh = 20;
      hour.humidity = 60;
    });
    for (const hour of [13, 14]) {
      forecast.days[0].hours[hour].direction = 'NW';
      forecast.days[0].hours[hour].windSpeedKmh = 20;
      forecast.days[0].hours[hour].humidity = 40;
    }
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);

    expect(screen.getByRole('region', { name: 'أفضل الأوقات المتبقية اليوم' })).toHaveTextContent(
      '1:00 م–3:00 م'
    );
  });

  it('يعرض الاتجاه المتقلب بالأخضر عندما يكون الاتجاهان أخضرين', () => {
    const forecast = makeTestForecast();
    forecast.days[0].dominantDirection = null;
    forecast.days[0].variableDirections = ['NW', 'N'];
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);

    expect(screen.getByLabelText('متقلبة · شمالية غربية / شمالية، الحالة أخضر')).toBeVisible();
  });

  it('لا يعرض نقطة خضراء عندما لا توجد فترة تحقق المعايير الثلاثة', () => {
    const forecast = makeTestForecast();
    forecast.days[0].hours.forEach((hour) => {
      hour.direction = 'W';
    });
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);

    const todayRegion = screen.getByRole('region', { name: 'أفضل الأوقات المتبقية اليوم' });
    expect(within(todayRegion).getByText('لا توجد فترة مناسبة متبقية اليوم')).toBeVisible();
    expect(within(todayRegion).queryByLabelText('الحالة أخضر')).not.toBeInTheDocument();
  });

  it('يفصل اسم اليوم عن شارة اليوم في الاسم النصي', () => {
    const forecast = makeTestForecast();
    const { container } = render(
      <WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />
    );
    expect(container.querySelector('.day-row--today .day-row__name')).toHaveTextContent(
      'الأربعاء اليوم'
    );
  });

  it('يوفر محطة Tab مسماة لشريط الأيام مع وصف التمرير', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);

    const days = screen.getByRole('group', { name: 'توقعات الأنشطة للأيام التالية' });
    expect(days).toHaveAttribute('tabindex', '0');
    expect(days).toHaveAccessibleDescription(
      'استخدم السهمين الأيمن والأيسر للتمرير بين الأيام، وHome وEnd لأول يوم وآخر يوم.'
    );
    await user.tab();
    expect(days).toHaveFocus();
    await user.tab();
    expect(screen.getAllByRole('listbox')[0]).toHaveFocus();
  });

  it('يمرر بطاقة كاملة بالأسهم ويصل للطرفين وفق RTL بلا اعتراض التمرير الرأسي', () => {
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);
    const days = screen.getByRole('group', { name: 'توقعات الأنشطة للأيام التالية' });
    const scrollBy = vi.fn();
    const scrollTo = vi.fn();
    Object.defineProperties(days, {
      clientWidth: { configurable: true, value: 270 },
      scrollWidth: { configurable: true, value: 1457 },
      scrollBy: { value: scrollBy },
      scrollTo: { value: scrollTo }
    });
    days.style.direction = 'rtl';
    days.style.columnGap = '9px';
    const card = within(days).getAllByRole('article')[0];
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      ...card.getBoundingClientRect(),
      width: 235
    });

    expect(fireEvent.keyDown(days, { key: 'ArrowLeft' })).toBe(false);
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -244, behavior: 'auto' });
    fireEvent.keyDown(days, { key: 'ArrowRight' });
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 244, behavior: 'auto' });
    fireEvent.keyDown(days, { key: 'End' });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: -1187, behavior: 'auto' });
    fireEvent.keyDown(days, { key: 'Home' });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'auto' });
    expect(fireEvent.keyDown(days, { key: 'ArrowDown' })).toBe(true);
    expect(fireEvent.keyDown(days, { key: 'ArrowLeft', ctrlKey: true })).toBe(true);

    Object.defineProperty(days, 'scrollWidth', { value: 270 });
    expect(fireEvent.keyDown(days, { key: 'ArrowLeft' })).toBe(true);
    expect(scrollBy).toHaveBeenCalledTimes(2);
  });
});
