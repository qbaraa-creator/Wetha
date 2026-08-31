// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { useRiyadhClock } from '../useRiyadhClock';

describe('ساعة واجهة الرياض', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('تستيقظ عند رأس الساعة وتنقل شارة اليوم بعد منتصف الليل', () => {
    vi.setSystemTime(new Date('2026-08-19T20:59:30.000Z'));
    const { result } = renderHook(() => useRiyadhClock());

    expect(result.current).toEqual({ dateIso: '2026-08-19', hour: 23, minute: 59 });
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current).toEqual({ dateIso: '2026-08-20', hour: 0, minute: 0 });
  });

  it('تقرأ الوقت فور العودة إلى التطبيق بعد تجميد المؤقتات', () => {
    vi.setSystemTime(new Date('2026-08-19T09:00:00.000Z'));
    const { result } = renderHook(() => useRiyadhClock());

    vi.setSystemTime(new Date('2026-08-20T09:00:00.000Z'));
    act(() => window.dispatchEvent(new Event('focus')));
    expect(result.current.dateIso).toBe('2026-08-20');
  });
});
