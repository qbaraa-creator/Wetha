// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
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

  it('لا تسمي يومًا ذا صفر ساعات خضراء بأنه الأفضل أخضر', () => {
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} onOpenDay={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'أقل ساعات رياح حمراء' })).toBeVisible();
    expect(screen.getByText(/لا توجد ساعات رياح خضراء هذا الأسبوع/)).toBeVisible();
  });

  it('يعرض محورًا واحدًا فقط لكل يوم وتفاصيل مطوية افتراضيًا', () => {
    const forecast = makeTestForecast();
    const { container } = render(
      <WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} onOpenDay={vi.fn()} />
    );

    expect(container.querySelectorAll('.hourbar__axis')).toHaveLength(7);
    expect(container.querySelectorAll('details')).toHaveLength(7);
    expect(container.querySelectorAll('details[open]')).toHaveLength(0);
  });

  it('يفتح التفاصيل الأصلية ويُبقي سرد التحولات متاحًا', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} onOpenDay={vi.fn()} />);

    const summary = screen.getByText('تفاصيل الأربعاء');
    const details = summary.closest('details');
    expect(details).not.toHaveAttribute('open');
    await user.click(summary);
    expect(details).toHaveAttribute('open');
    expect(screen.getAllByText('ساعات الرياح')[0]).toBeInTheDocument();
  });

  it('يفتح التاريخ الصحيح من زر اليوم', () => {
    const onOpenDay = vi.fn();
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} onOpenDay={onOpenDay} />);

    fireEvent.click(screen.getByRole('button', { name: /الأربعاء.*19\/08\/2026/ }));
    expect(onOpenDay).toHaveBeenCalledWith('2026-08-19');
  });
});
