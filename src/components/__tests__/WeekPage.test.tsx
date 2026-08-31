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

    const outlook = screen.getByRole('region', { name: 'أفضل أوقات الأنشطة الخارجية' });
    expect(within(outlook).getAllByRole('article')).toHaveLength(6);
    expect(
      within(outlook).queryByRole('heading', { name: /الأربعاء 19\/08\/2026/ })
    ).not.toBeInTheDocument();
    expect(
      within(outlook).getByRole('heading', { name: /الخميس 20\/08\/2026/, level: 4 })
    ).toBeVisible();
    expect(within(outlook).getByText('أفضل الأوقات المتبقية اليوم')).toBeVisible();
    expect(within(outlook).getByText('شمالية أو شمالية غربية')).toBeVisible();
    expect(within(outlook).getByText('سرعة 15–أقل من 25 كم/س')).toBeVisible();
    expect(within(outlook).getByText('رطوبة أقل من 50%')).toBeVisible();
  });

  it('يعرض شريطًا مركبًا ومحورًا واحدًا فقط لكل يوم وتفاصيل مطوية افتراضيًا', () => {
    const forecast = makeTestForecast();
    const { container } = render(
      <WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />
    );

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
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);

    const summary = screen.getByText('تفاصيل الأربعاء');
    const details = summary.closest('details');
    expect(details).not.toHaveAttribute('open');
    await user.click(summary);
    expect(details).toHaveAttribute('open');
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
      forecast.days[0].hours[hour].windSpeedKmh = 20;
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
    // الشريط الساعي انتقل داخل لوحة التفاصيل، فالمحطة التالية هي فاتح اللوحة
    // لا الشريط نفسه.
    await user.tab();
    expect(document.activeElement?.tagName.toLowerCase()).toBe('summary');
    expect(document.activeElement).toHaveTextContent(/^تفاصيل/);
  });

  it('يضع الشريط الساعي داخل لوحة التفاصيل لا في الطبقة الأولى', () => {
    const forecast = makeTestForecast();
    const { container } = render(
      <WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />
    );

    // jsdom لا يخفي محتوى <details> المغلق، فيُتحقق من موضع الشريط في الشجرة
    // بدل الاعتماد على ظهوره — والمتصفح هو من يخرجه من ترتيب Tab.
    const bars = container.querySelectorAll('.hourbar');
    expect(bars.length).toBeGreaterThan(0);
    bars.forEach((bar) => expect(bar.closest('details')).not.toBeNull());
    // الطبقة الأولى صارت صفوف الفترات
    expect(container.querySelectorAll('.day-row__parts .daypart').length).toBe(
      forecast.days.length * 5
    );
  });

  it('يشرح الفرق بين الرقم واللون مرة واحدة ويسمي المتوسط ووحدة السرعة', () => {
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);
    expect(screen.getAllByText(/^الأرقام: مدى سرعة الرياح ومتوسط الرطوبة/)).toHaveLength(1);
    expect(screen.getAllByText('المتوسط')).toHaveLength(7);
    expect(screen.getAllByText('مدى · كم/س')).toHaveLength(7);
  });

  it('يشرح الأكثر تكرارًا والتعادل وحدود الماضي داخل مفتاح القراءة', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const forecast = makeTestForecast();
    render(<WeekPage forecast={forecast} ranking={rankWeek(forecast.days)} now={now} />);
    await user.click(screen.getByRole('button', { name: 'مفتاح الألوان وكيفية القراءة' }));
    expect(screen.getByRole('heading', { name: 'قراءة فترات اليوم' })).toBeVisible();
    expect(screen.getByText(/الفترة ذات الحدود المتقطعة انقضت/)).toHaveTextContent(
      'والتعادل للأشد'
    );
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
