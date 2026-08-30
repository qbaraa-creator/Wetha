// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { TEST_NOW, makeTestForecast } from '../../test/forecast';
import { DayPage } from '../DayPage';

const handlers = {
  hasPrevious: false,
  hasNext: true,
  onPrevious: vi.fn(),
  onNext: vi.fn(),
  onToday: vi.fn()
};

describe('صفحة اليوم', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TEST_NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('تعرض لقطة الآن لليوم الحالي فقط', () => {
    const forecast = makeTestForecast();
    const { rerender } = render(
      <DayPage day={forecast.days[0]} current={forecast.current} {...handlers} />
    );
    expect(screen.getByRole('heading', { name: 'لقطة الآن' })).toBeVisible();

    rerender(<DayPage day={forecast.days[1]} current={forecast.current} {...handlers} />);
    expect(screen.queryByRole('heading', { name: 'لقطة الآن' })).not.toBeInTheDocument();
  });

  it('تبقي التفاصيل الساعية مطوية ثم تعرض 24 صفًا عند فتحها', () => {
    const forecast = makeTestForecast();
    const { container } = render(
      <DayPage day={forecast.days[0]} current={forecast.current} {...handlers} />
    );
    const toggle = screen.getByRole('button', { name: /التفاصيل بالساعة/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelectorAll('table.hourly tbody tr')).toHaveLength(24);
  });

  it('تعرض خطين ساعيين بمحور واحد مشترك', () => {
    const forecast = makeTestForecast();
    const { container } = render(
      <DayPage day={forecast.days[0]} current={forecast.current} {...handlers} />
    );
    expect(screen.getAllByRole('listbox')).toHaveLength(2);
    expect(container.querySelectorAll('.hourbar__axis')).toHaveLength(1);
  });
});
