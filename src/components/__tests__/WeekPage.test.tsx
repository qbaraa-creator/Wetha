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

  it('يعرض ملخص خمسة أيام لكل من الرياح والرطوبة', () => {
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} />);

    const outlook = screen.getByRole('region', { name: 'الساعات المناسبة خلال 5 أيام' });
    expect(within(outlook).getAllByRole('article')).toHaveLength(5);
    expect(within(outlook).getAllByText('رياح')).toHaveLength(5);
    expect(within(outlook).getAllByText('رطوبة')).toHaveLength(5);
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

  it('يجمع الساعات الخضراء المتتالية في الملخص ويستبعد الماضي من اليوم', () => {
    const forecast = makeTestForecast();
    for (const hour of [13, 14]) {
      forecast.days[0].hours[hour].windSeverity = 'green';
      forecast.days[0].hours[hour].humiditySeverity = 'green';
    }
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} />);

    const firstDay = screen.getByRole('heading', { name: /الأربعاء 19\/08\/2026/ }).closest('article');
    expect(firstDay).not.toBeNull();
    expect(within(firstDay!).getAllByText('1:00 م–3:00 م')).toHaveLength(2);
  });
});
