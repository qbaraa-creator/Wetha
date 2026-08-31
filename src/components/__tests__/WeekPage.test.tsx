// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rankWeek } from '../../domain/ranking';
import { nowInRiyadh } from '../../domain/time';
import { TEST_NOW, makeTestForecast } from '../../test/forecast';
import { WeekPage } from '../WeekPage';

describe('صفحة الأسبوع', () => {
  const now = nowInRiyadh(new Date(TEST_NOW));
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TEST_NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('يعرض أفضل أوقات اليوم والأيام السبعة وفق المعايير الثلاثة', () => {
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);

    const outlook = screen.getByRole('region', { name: 'أفضل أوقات الفسحة' });
    expect(within(outlook).getAllByRole('article')).toHaveLength(6);
    expect(
      within(outlook).queryByRole('heading', { name: /الأربعاء 19\/08\/2026/ })
    ).not.toBeInTheDocument();
    expect(
      within(outlook).getByRole('heading', { name: /الخميس 20\/08\/2026/, level: 4 })
    ).toBeVisible();
    expect(within(outlook).getByText('أفضل الأوقات المتبقية اليوم')).toBeVisible();
    expect(within(outlook).getByText('شمالية أو شمالية غربية')).toBeVisible();
    expect(within(outlook).getByText('سرعة 15–أقل من 35 كم/س')).toBeVisible();
    expect(within(outlook).getByText('رطوبة أقل من 50%')).toBeVisible();
  });

  it('يعرض شريطًا موحدًا ومحورًا واحدًا فقط لكل يوم وتفاصيل مطوية افتراضيًا', () => {
    const forecast = makeTestForecast();
    const { container } = render(
      <WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />
    );

    expect(container.querySelectorAll('.hourbar__track')).toHaveLength(7);
    expect(container.querySelectorAll('.hourbar__axis')).toHaveLength(7);
    expect(container.querySelectorAll('.hourbar__lane')).toHaveLength(7 * 24);
    expect(container.querySelectorAll('details')).toHaveLength(7);
    expect(container.querySelectorAll('details[open]')).toHaveLength(0);
  });

  it('يفتح التفاصيل الأصلية ويُبقي سرد التحولات متاحًا', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);

    const summary = screen.getByText('تفاصيل الأربعاء');
    const details = summary.closest('details');
    expect(details).not.toHaveAttribute('open');
    const bar = screen.getByRole('listbox', { name: /ليوم الأربعاء/ });
    fireEvent.keyDown(bar, { key: 'Home' });
    await user.click(summary);
    expect(details).toHaveAttribute('open');
    expect(bar.getAttribute('aria-activedescendant')).toMatch(/-h0$/);
    expect(details?.querySelector('.part-measurements')).not.toBeNull();
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
      forecast.days[0].hours[hour].windSpeedKmh = 30;
      forecast.days[0].hours[hour].humidity = 40;
    }
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);

    expect(screen.getByRole('region', { name: 'أفضل الأوقات المتبقية اليوم' })).toHaveTextContent(
      '1:00 م–3:00 م'
    );
  });

  it('يعرض الاتجاه المتقلب بالأخضر عندما يكون الاتجاهان أخضرين', () => {
    const forecast = makeTestForecast();
    forecast.days[0].dominantDirection = null;
    forecast.days[0].variableDirections = ['NW', 'N'];
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);

    expect(screen.getByLabelText('متقلبة · شمالية غربية / شمالية، الحالة أخضر')).toBeVisible();
  });

  it('لا يعرض نقطة خضراء عندما لا توجد فترة تحقق المعايير الثلاثة', () => {
    const forecast = makeTestForecast();
    forecast.days[0].hours.forEach((hour) => {
      hour.direction = 'W';
    });
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);

    const todayRegion = screen.getByRole('region', { name: 'أفضل الأوقات المتبقية اليوم' });
    expect(within(todayRegion).getByText('لا توجد فترة مناسبة متبقية اليوم')).toBeVisible();
    expect(within(todayRegion).queryByLabelText('الحالة أخضر')).not.toBeInTheDocument();
  });

  it('يفصل اسم اليوم عن شارة اليوم في الاسم النصي', () => {
    const forecast = makeTestForecast();
    const { container } = render(
      <WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />
    );
    expect(container.querySelector('.day-row--today .day-row__name')).toHaveTextContent(
      'الأربعاء اليوم'
    );
  });

  it('يوفر محطة Tab مسماة لشريط الأيام مع وصف التمرير', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);

    const days = screen.getByRole('group', { name: 'توقعات الأنشطة للأيام التالية' });
    expect(days).toHaveAttribute('tabindex', '0');
    expect(days).toHaveAccessibleDescription(
      'استخدم السهمين الأيمن والأيسر للتمرير بين الأيام، وHome وEnd لأول يوم وآخر يوم.'
    );
    await user.tab();
    expect(days).toHaveFocus();
    // الشريط أساسي ومتاح قبل فتح التفاصيل، بمحطة Tab واحدة لليوم.
    await user.tab();
    expect(screen.getByRole('listbox', { name: /ليوم الأربعاء/ })).toHaveFocus();
    await user.tab();
    expect(document.activeElement?.tagName.toLowerCase()).toBe('summary');
    expect(document.activeElement).toHaveTextContent(/^تفاصيل/);
  });

  it('يعرض الشريط أساسًا لكل يوم ويحذف بطاقات الفترات دون نقلها للتفاصيل', () => {
    const forecast = makeTestForecast();
    const { container } = render(
      <WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />
    );

    const bars = container.querySelectorAll('.hourbar');
    expect(bars).toHaveLength(7);
    bars.forEach((bar) => expect(bar.closest('details')).toBeNull());
    expect(container.querySelectorAll('.dayparts, .daypart, .day-row__parts')).toHaveLength(0);
    expect(container.querySelectorAll('details .hourbar')).toHaveLength(0);
    expect(screen.queryByText(/من \d+ س مطابقة/)).not.toBeInTheDocument();
  });

  it('يحذف النصوص الزائدة ويبقي أرقام الفترات داخل التفاصيل', () => {
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);
    expect(screen.queryByText(/^الشريط يبيّن المطابقة لشروطك ساعة بساعة/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^للمشي، الجلوس في الحديقة والبر/)).not.toBeInTheDocument();
    expect(screen.queryByText('أفضل أوقات الأنشطة الخارجية')).not.toBeInTheDocument();
    const tables = document.querySelectorAll('.part-measurements');
    expect(tables).toHaveLength(7);
    tables.forEach((table) => {
      expect(table.closest('details')).not.toBeNull();
      expect(table).toHaveTextContent('مدى الرياح');
      expect(table).toHaveTextContent('متوسط الرطوبة');
    });
  });

  it('يعرض المصفوفة وحدود التقييم والماضي داخل مفتاح مطوي', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);
    expect(
      screen.queryByRole('table', { name: 'مصفوفة اتجاه الرياح وسرعتها والرطوبة' })
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'كيف يُحسب التقييم؟' }));
    const matrix = screen.getByRole('table', { name: 'مصفوفة اتجاه الرياح وسرعتها والرطوبة' });
    expect(matrix).toBeVisible();
    const northSpeedRow = within(matrix)
      .getByRole('rowheader', { name: /السرعة.*شمالية \/ شمالية غربية/ })
      .closest('tr')!;
    expect(
      within(northSpeedRow)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
    ).toEqual(['15 إلى أقل من 35', '—', 'أقل من 15، أو 35 فأكثر']);
    const otherSpeedRow = within(matrix)
      .getByRole('rowheader', { name: /السرعة.*بقية الاتجاهات/ })
      .closest('tr')!;
    expect(
      within(otherSpeedRow)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
    ).toEqual(['15 إلى أقل من 25', '25 إلى أقل من 35']);
    expect(screen.getByRole('heading', { name: 'قراءة فترات اليوم' })).toBeVisible();
    expect(screen.getByText(/الفترة ذات الحدود المتقطعة انقضت/)).toHaveTextContent(
      'جدول «أرقام الفترات» داخل التفاصيل'
    );
    expect(screen.getByText(/هذا تقييم لتفضيلاتك، وليس حكمًا على سلامة الخروج/)).toBeVisible();
  });

  it.each([null, 0, 45, 100])('يظهر احتمال المطر فقط إن كان موجبًا: %s', (probability) => {
    const forecast = makeTestForecast();
    forecast.days.forEach((day) => {
      day.precipitationProbabilityMax = null;
    });
    forecast.days[0].precipitationProbabilityMax = probability;
    const { container } = render(
      <WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />
    );
    const badges = container.querySelectorAll('.day-row__rain');
    expect(badges).toHaveLength(probability !== null && probability > 0 ? 1 : 0);
    if (badges.length) expect(badges[0]).toHaveTextContent(`${probability}%`);
  });

  it('يمرر بطاقة كاملة بالأسهم ويصل للطرفين وفق RTL بلا اعتراض التمرير الرأسي', () => {
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);
    const days = screen.getByRole('group', { name: 'توقعات الأنشطة للأيام التالية' });
    const scrollBy = vi.fn();
    const scrollTo = vi.fn();
    Object.defineProperties(days, {
      clientWidth: { configurable: true, value: 270 },
      scrollWidth: { configurable: true, value: 1457 },
      scrollBy: { value: scrollBy },
      scrollTo: { value: scrollTo }
    });
    days.style.direction = 'rtl';
    days.style.columnGap = '9px';
    const card = within(days).getAllByRole('article')[0];
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      ...card.getBoundingClientRect(),
      width: 235
    });

    expect(fireEvent.keyDown(days, { key: 'ArrowLeft' })).toBe(false);
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -244, behavior: 'auto' });
    fireEvent.keyDown(days, { key: 'ArrowRight' });
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 244, behavior: 'auto' });
    fireEvent.keyDown(days, { key: 'End' });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: -1187, behavior: 'auto' });
    fireEvent.keyDown(days, { key: 'Home' });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'auto' });
    expect(fireEvent.keyDown(days, { key: 'ArrowDown' })).toBe(true);
    expect(fireEvent.keyDown(days, { key: 'ArrowLeft', ctrlKey: true })).toBe(true);

    Object.defineProperty(days, 'scrollWidth', { value: 270 });
    expect(fireEvent.keyDown(days, { key: 'ArrowLeft' })).toBe(true);
    expect(scrollBy).toHaveBeenCalledTimes(2);
  });
});
