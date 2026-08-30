// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rankWeek } from '../../domain/ranking';
import { TEST_NOW, makeTestForecast } from '../../test/forecast';
import { WeekPage } from '../WeekPage';

describe('صفحة الأسبوع', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TEST_NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('يعرض أفضل أوقات اليوم والأيام السبعة وفق المعايير الثلاثة', () => {
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} />);

    const outlook = screen.getByRole('region', { name: 'أفضل أوقات الأنشطة الخارجية' });
    expect(within(outlook).getAllByRole('article')).toHaveLength(7);
    expect(within(outlook).getByText('أفضل الأوقات المتبقية اليوم')).toBeVisible();
    expect(within(outlook).getByText('شمالية أو شمالية غربية')).toBeVisible();
    expect(within(outlook).getByText('سرعة 15–أقل من 25 كم/س')).toBeVisible();
    expect(within(outlook).getByText('رطوبة أقل من 50%')).toBeVisible();
  });

  it('يعرض شريطًا مركبًا ومحورًا واحدًا فقط لكل يوم وتفاصيل مطوية افتراضيًا', () => {
    const forecast = makeTestForecast();
    const { container } = render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} />);

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
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} />);

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
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} />);

    const firstDay = screen.getByRole('heading', { name: /الأربعاء 19\/08\/2026/ }).closest('article');
    expect(firstDay).not.toBeNull();
    expect(within(firstDay!).getByText('1:00 م–3:00 م')).toBeVisible();
    expect(screen.getByRole('region', { name: 'أفضل الأوقات المتبقية اليوم' })).toHaveTextContent(
      '1:00 م–3:00 م'
    );
  });

  it('يعرض الاتجاه المتقلب بالأخضر عندما يكون الاتجاهان أخضرين', () => {
    const forecast = makeTestForecast();
    forecast.days[0].dominantDirection = null;
    forecast.days[0].variableDirections = ['NW', 'N'];
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} />);

    expect(
      screen.getByLabelText('متقلبة · شمالية غربية / شمالية، الحالة أخضر')
    ).toBeVisible();
  });

  it('لا يعرض نقطة خضراء عندما لا توجد فترة تحقق المعايير الثلاثة', () => {
    const forecast = makeTestForecast();
    forecast.days[0].hours.forEach((hour) => {
      hour.direction = 'W';
    });
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} />);

    const firstDay = screen.getByRole('heading', { name: /الأربعاء 19\/08\/2026/ }).closest('article');
    expect(within(firstDay!).getByText('لا توجد فترة تحقق المعايير')).toBeVisible();
    expect(within(firstDay!).queryByLabelText('الحالة أخضر')).not.toBeInTheDocument();
  });
});
