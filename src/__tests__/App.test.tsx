// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { useForecast, type ForecastState } from '../state/useForecast';
import { TEST_NOW, makeTestForecast } from '../test/forecast';

vi.mock('../state/useForecast', () => ({
  useForecast: vi.fn()
}));

const mockedUseForecast = vi.mocked(useForecast);

function state(overrides: Partial<ForecastState> = {}): ForecastState {
  return {
    status: 'ready',
    forecast: makeTestForecast(),
    source: 'network',
    isRefreshing: false,
    errorMessage: null,
    refresh: vi.fn(),
    ...overrides
  };
}

function setHash(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

describe('التطبيق والتنقل الرئيسي', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TEST_NOW));
    window.location.hash = '#/week';
    vi.mocked(window.scrollTo).mockClear();
    Object.defineProperty(window.history, 'scrollRestoration', {
      configurable: true,
      writable: true,
      value: 'auto'
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ينقل التركيز إلى main ويعيد التمرير عند فتح يوم والرجوع', () => {
    mockedUseForecast.mockReturnValue(state());
    render(<App />);

    expect(screen.getByRole('main', { name: 'صفحة الأسبوع' })).toBeVisible();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /الأربعاء.*19\/08\/2026/ }));
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    const dayMain = screen.getByRole('main', { name: /صفحة اليوم — الأربعاء 19\/08\/2026/ });
    expect(dayMain).toHaveFocus();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);

    act(() => setHash('#/week'));
    expect(screen.getByRole('main', { name: 'صفحة الأسبوع' })).toHaveFocus();
  });

  it('يعرض التحذير المبسط ولا يسرّب تفاصيل المزود', () => {
    const forecast = makeTestForecast();
    forecast.warnings = ['hourly.wind_speed_10m عاد بطول غير متوقع'];
    mockedUseForecast.mockReturnValue(state({ forecast }));
    render(<App />);

    expect(screen.getByText(/بعض قيم هذا الأسبوع وصلت ناقصة/)).toBeVisible();
    expect(screen.queryByText(/wind_speed_10m/)).not.toBeInTheDocument();
  });

  it('يميز البيانات المحفوظة التي لا تشمل اليوم', () => {
    vi.setSystemTime(new Date('2026-08-30T09:00:00.000Z'));
    mockedUseForecast.mockReturnValue(state({ source: 'cache' }));
    render(<App />);
    expect(screen.getByText(/بيانات قديمة لا تشمل اليوم/)).toBeVisible();
  });

  it('يعرض حالة الخطأ وزر إعادة المحاولة', () => {
    const refresh = vi.fn();
    mockedUseForecast.mockReturnValue(
      state({ status: 'error', forecast: null, source: null, errorMessage: 'تعذر الاتصال', refresh })
    );
    render(<App />);

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر الاتصال');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(refresh).toHaveBeenCalledOnce();
  });
});
