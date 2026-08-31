// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { summarizeDayParts } from '../../domain/dayParts';
import { makeFullDay } from '../../domain/__tests__/testHelpers';
import { DayPartList } from '../DayParts';

const DATE = '2026-08-19';

it('يميّز متوسط الرطوبة عن الحالة الأكثر تكرارًا دون تغيير التصنيف', () => {
  const hours = makeFullDay(
    DATE,
    { direction: 'NW', speed: 20, humidity: 49 },
    {
      3: { humidity: 65 },
      4: { humidity: 65 },
      5: { humidity: 65 }
    }
  );
  const dawn = summarizeDayParts(hours)[0];
  expect(dawn.humidityMean).toBe(57);
  expect(dawn.humiditySeverity).toBe('red'); // تعادل ثلاث ساعات خضراء وثلاث حمراء
  render(<DayPartList parts={[dawn]} />);
  expect(screen.getByText('57%')).toBeVisible();
  expect(
    screen.getByText(/متوسط الرطوبة 57 بالمئة، الحالة الأكثر تكرارًا أحمر/)
  ).toBeInTheDocument();
  expect(screen.getByTitle('الحالة الأكثر تكرارًا للرطوبة: أحمر')).toHaveClass('daypart__dot--red');
  expect(screen.getByText(/مدى سرعة الرياح 20 كيلومتر في الساعة/)).toBeInTheDocument();
});

it('يبقي الفترة المنقضية مقروءة وموصوفة بدل إخفائها', () => {
  const parts = summarizeDayParts(
    makeFullDay(DATE, { direction: 'NW', speed: 20, humidity: 40 }),
    6
  );
  render(<DayPartList parts={[parts[0], parts[1]]} />);
  const rows = screen.getAllByRole('listitem');
  expect(rows[0]).toHaveClass('is-past');
  expect(rows[1]).not.toHaveClass('is-past');
  expect(rows[0]).toHaveTextContent('فترة انقضت');
});

it('لا يحول الفترة الفارغة إلى رقم أو حالة مناسبة', () => {
  render(<DayPartList parts={[summarizeDayParts([])[0]]} />);
  const row = screen.getByRole('listitem');
  expect(row).toHaveClass('is-empty');
  expect(row).toHaveTextContent('سرعة غير متاحة');
  expect(row).toHaveTextContent('رطوبة غير متاحة');
  expect(row.querySelectorAll('.daypart__dot--none')).toHaveLength(2);
});
