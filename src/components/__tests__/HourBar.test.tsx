// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { makeFullDay } from '../../domain/__tests__/testHelpers';
import { HourBar } from '../HourBar';

const hours = makeFullDay('2026-08-19', {
  direction: 'NW',
  speed: 20,
  gust: 31,
  humidity: 60
});

function renderBar() {
  render(<HourBar hours={hours} label="شريط اختبار" showAxis />);
  return screen.getByRole('listbox', { name: 'شريط اختبار' });
}

describe('الشريط الساعي', () => {
  it('يدعم لوحة المفاتيح وaria-activedescendant', () => {
    const track = renderBar();

    fireEvent.keyDown(track, { key: 'ArrowLeft' });
    expect(track.getAttribute('aria-activedescendant')).toMatch(/-h0$/);
    expect(screen.getByText(/12:00 ص · قادمة من/)).toBeVisible();

    fireEvent.keyDown(track, { key: 'End' });
    expect(track.getAttribute('aria-activedescendant')).toMatch(/-h23$/);
    expect(screen.getByText(/11:00 م · قادمة من/)).toBeVisible();

    fireEvent.keyDown(track, { key: 'Home' });
    expect(track.getAttribute('aria-activedescendant')).toMatch(/-h0$/);

    fireEvent.keyDown(track, { key: 'Escape' });
    expect(track).not.toHaveAttribute('aria-activedescendant');
  });

  it('يحسب ساعات اللمس والسحب من كامل المسار مع احترام RTL', () => {
    const track = renderBar();
    track.style.direction = 'rtl';
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 240,
      bottom: 44,
      width: 240,
      height: 44,
      toJSON: () => ({})
    });

    fireEvent.pointerDown(track, { clientX: 239, pointerId: 1, pointerType: 'touch' });
    expect(track.getAttribute('aria-activedescendant')).toMatch(/-h0$/);

    fireEvent.pointerMove(track, { clientX: 120, pointerId: 1, pointerType: 'touch' });
    expect(track.getAttribute('aria-activedescendant')).toMatch(/-h12$/);

    fireEvent.pointerMove(track, { clientX: 0, pointerId: 1, pointerType: 'touch' });
    expect(track.getAttribute('aria-activedescendant')).toMatch(/-h23$/);

    fireEvent.pointerUp(track, { clientX: 0, pointerId: 1, pointerType: 'touch' });
    expect(track.getAttribute('aria-activedescendant')).toMatch(/-h23$/);
  });

  it('يوقف السحب عند pointercancel ويبقي آخر اختيار', () => {
    const track = renderBar();
    track.style.direction = 'rtl';
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 240,
      bottom: 44,
      width: 240,
      height: 44,
      toJSON: () => ({})
    });

    fireEvent.pointerDown(track, { clientX: 120, pointerId: 2, pointerType: 'touch' });
    fireEvent.pointerCancel(track, { clientX: 120, pointerId: 2, pointerType: 'touch' });
    const selected = track.getAttribute('aria-activedescendant');
    fireEvent.pointerMove(track, { clientX: 0, pointerId: 2, pointerType: 'touch' });
    expect(track.getAttribute('aria-activedescendant')).toBe(selected);
  });

  it('يبقي 24 option بطبقتين ومحورًا واحدًا عند طلبه', () => {
    const track = renderBar();
    expect(track.querySelectorAll('[role="option"]')).toHaveLength(24);
    expect(track.querySelectorAll('.hourbar__lane--wind')).toHaveLength(24);
    expect(track.querySelectorAll('.hourbar__lane--humidity')).toHaveLength(24);
    expect(document.querySelectorAll('.hourbar__axis')).toHaveLength(1);
  });

  it('لا يكرر أسماء الألوان في القراءة المرئية', () => {
    const track = renderBar();
    fireEvent.keyDown(track, { key: 'Home' });
    const readout = document.querySelector('.hourbar__readout');
    expect(readout).toHaveTextContent(/سرعة 20 كم\/س/);
    expect(readout).not.toHaveTextContent(/أخضر|برتقالي|أحمر/);
    expect(readout).toHaveAttribute('aria-hidden', 'true');
    expect(readout).not.toHaveAttribute('aria-live');
  });
});
