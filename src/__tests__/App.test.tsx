// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
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

describe('التطبيق الرئيسي', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TEST_NOW));
    window.location.hash = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('يعرض صفحة واحدة بلا تبويبات أو مسار يوم مكرر', () => {
    window.location.hash = '#/day/2026-08-19';
    mockedUseForecast.mockReturnValue(state());
    render(<App />);

    expect(screen.getByRole('main', { name: 'توقعات جدة' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'فسحة', level: 1 })).toBeVisible();
    expect(screen.getByText('جدة')).toBeVisible();
    expect(screen.queryByText('طقس جدة')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'التنقل الرئيسي' })).not.toBeInTheDocument();
    expect(screen.queryByText('اليوم المختار')).not.toBeInTheDocument();
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
      state({
        status: 'error',
        forecast: null,
        source: null,
        errorMessage: 'تعذر الاتصال',
        refresh
      })
    );
    render(<App />);

    expect(screen.getByRole('alert')).toHaveTextContent('تعذر الاتصال');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(refresh).toHaveBeenCalledOnce();
  });
});
