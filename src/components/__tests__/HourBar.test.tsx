// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { makeFullDay } from '../../domain/__tests__/testHelpers';
import { describeHour, HourBar } from '../HourBar';

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
  it('يعرض 30 كم/س شمالية خضراء دون سبب قوي وهمي ويظل سبب الرطوبة ظاهرًا', () => {
    const pointHours = makeFullDay(
      '2026-08-19',
      { direction: 'N', speed: 30, humidity: 40 },
      {
        1: { direction: 'NW', speed: 30, humidity: 55 },
        2: { direction: 'N', speed: 35, humidity: 40 }
      }
    );
    render(<HourBar hours={pointHours} label="استثناء السرعة" />);
    const track = screen.getByRole('listbox');
    fireEvent.keyDown(track, { key: 'Home' });
    expect(document.querySelector('.hourbar__readout')).toHaveTextContent('مطابق لشروطك');
    expect(document.querySelector('.hourbar__readout')).not.toHaveTextContent('رياح قوية');
    fireEvent.keyDown(track, { key: 'ArrowLeft' });
    expect(document.querySelector('.hourbar__readout')).toHaveTextContent('رطوبة أعلى من المفضّل');
    expect(document.querySelector('.hourbar__readout')).not.toHaveTextContent('رياح قوية');
    fireEvent.keyDown(track, { key: 'ArrowLeft' });
    expect(document.querySelector('.hourbar__readout')).toHaveTextContent('رياح شديدة');
  });
  it('لا يبدل القراءة بمرور الفأرة ويبقي الاختيار عند مغادرة الشريط وفقد التركيز', () => {
    const track = renderBar();
    fireEvent.pointerMove(track, { clientX: 120, pointerType: 'mouse' });
    expect(track).not.toHaveAttribute('aria-activedescendant');
    fireEvent.keyDown(track, { key: 'Home' });
    fireEvent.pointerLeave(track, { pointerType: 'mouse' });
    fireEvent.blur(track, { relatedTarget: document.body });
    expect(track.getAttribute('aria-activedescendant')).toMatch(/-h0$/);
    expect(document.querySelector('.hourbar__readout')).toHaveTextContent('رطوبة 60%');
    fireEvent.keyDown(track, { key: 'Escape' });
    expect(document.querySelector('.hourbar__readout')).toBeNull();
  });
  it('لا يقرب قيم الحدود بطريقة تناقض السبب', () => {
    const edge = makeFullDay('2026-08-19', { direction: 'N', speed: 14.9, humidity: 49.9 });
    render(<HourBar hours={edge} label="قيم حدودية" />);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Home' });
    const readout = document.querySelector('.hourbar__readout');
    expect(readout).toHaveTextContent('رياح أقل من المفضّل');
    expect(readout).toHaveTextContent('سرعة 14.9 كم/س');
    expect(readout).toHaveTextContent('رطوبة 49.9%');
  });
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

  it('يبقي 24 option بحالة موحدة لكل ساعة ومحور واحد', () => {
    const track = renderBar();
    expect(track.querySelectorAll('[role="option"]')).toHaveLength(24);
    expect(track.querySelectorAll('.hourbar__lane')).toHaveLength(24);
    expect(track.querySelectorAll('.hourbar__lane--orange')).toHaveLength(24);
    expect(track.querySelectorAll('.hourbar__lane--wind, .hourbar__lane--humidity')).toHaveLength(
      0
    );
    expect(track).toHaveAttribute('aria-orientation', 'horizontal');
    expect(document.querySelectorAll('.hourbar__axis')).toHaveLength(1);
  });

  it('يعرض سبب البرتقالي مع قيم الساعة مرئيًا وفي وصف الوصول', () => {
    const track = renderBar();
    fireEvent.keyDown(track, { key: 'Home' });
    expect(document.querySelector('.hourbar__decision')).toHaveTextContent('رطوبة أعلى من المفضّل');
    expect(screen.getAllByRole('option')[0]).toHaveAccessibleName(/رطوبة أعلى من المفضّل/);
    expect(document.querySelector('.hourbar__readout')).toHaveTextContent('رطوبة 60%');
  });

  it('يعرض جميع الأسباب حتى مع اختلاف درجاتها ولا يعتمد على Hover', () => {
    const badHours = makeFullDay('2026-08-19', { direction: 'S', speed: 29, humidity: 70 });
    render(<HourBar hours={badHours} label="أسباب متعددة" />);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Home' });
    expect(document.querySelector('.hourbar__decision')).toHaveTextContent(
      'اتجاه غير مفضّل: جنوبية · رطوبة مرتفعة · رياح قوية'
    );
    expect(document.querySelectorAll('.hourbar__lane--red')).toHaveLength(24);
    expect(describeHour(badHours[0])).toContain('رياح قوية');
  });

  it('يبين نقص البيانات مع السبب المعروف ولا يصنف الساعة', () => {
    const incomplete = makeFullDay('2026-08-19', { direction: 'S', speed: 20, humidity: null });
    render(<HourBar hours={incomplete} label="بيانات ناقصة" />);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Home' });
    expect(document.querySelectorAll('.hourbar__lane--missing')).toHaveLength(24);
    expect(document.querySelector('.hourbar__decision')).toHaveTextContent(
      'بيانات غير متاحة: الرطوبة'
    );
    expect(document.querySelector('.hourbar__decision')).toHaveTextContent(
      'اتجاه غير مفضّل: جنوبية'
    );
  });

  it('يبقي الخلية الغائبة محايدة ويعلن عدم وجود بيانات', () => {
    render(<HourBar hours={[]} label="ساعات غائبة" />);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'End' });
    expect(document.querySelectorAll('.hourbar__lane--missing')).toHaveLength(24);
    expect(document.querySelector('.hourbar__readout')).toHaveTextContent('لا بيانات لهذه الساعة');
  });

  it('يسمي الحالة المطابقة دون إظهار أسماء الألوان', () => {
    render(
      <HourBar
        hours={makeFullDay('2026-08-19', { direction: 'NW', speed: 20, humidity: 40 })}
        label="ساعات مطابقة"
      />
    );
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Home' });
    expect(document.querySelector('.hourbar__decision')).toHaveTextContent('مطابق لشروطك');
    expect(document.querySelectorAll('.hourbar__lane--green')).toHaveLength(24);
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
