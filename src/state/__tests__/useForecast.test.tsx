// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { makeTestForecast, TEST_NOW } from '../../test/forecast';
import { useForecast } from '../useForecast';

const mocks = vi.hoisted(() => ({
  getSevenDayForecast: vi.fn(),
  loadForecast: vi.fn(),
  saveForecast: vi.fn()
}));

vi.mock('../../providers/openMeteo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../providers/openMeteo')>();
  return {
    ...actual,
    createOpenMeteoProvider: () => ({ getSevenDayForecast: mocks.getSevenDayForecast })
  };
});

vi.mock('../../storage/forecastStore', () => ({
  loadForecast: mocks.loadForecast,
  saveForecast: mocks.saveForecast
}));

describe('جدولة تحديث التوقع', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TEST_NOW));
    const forecast = makeTestForecast();
    mocks.loadForecast.mockResolvedValue({
      schemaVersion: 2,
      locationId: forecast.locationId,
      fetchedAtIso: forecast.fetchedAtIso,
      forecast
    });
    mocks.getSevenDayForecast.mockResolvedValue(forecast);
    mocks.saveForecast.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  async function settleInitialLoad() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('يجلب عند رأس الساعة التالية لا بعد ساعة من لحظة فتح التطبيق', async () => {
    vi.setSystemTime(new Date('2026-08-19T09:15:00.000Z'));
    renderHook(() => useForecast());
    await settleInitialLoad();

    act(() => vi.advanceTimersByTime(44 * 60_000 + 59_000));
    expect(mocks.getSevenDayForecast).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTime(1_000));
    expect(mocks.getSevenDayForecast).toHaveBeenCalledOnce();
  });

  it('يتحقق من القِدم ويجلب فور عودة التركيز', async () => {
    renderHook(() => useForecast());
    await settleInitialLoad();

    vi.setSystemTime(new Date('2026-08-19T09:31:00.000Z'));
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(mocks.getSevenDayForecast).toHaveBeenCalledOnce();
  });
});
