// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { summarizeDayParts } from '../../domain/dayParts';
import { makeFullDay } from '../../domain/__tests__/testHelpers';
import { DayPartMeasurements } from '../DayParts';
const DATE = '2026-08-19';

it('يحفظ مدى السرعة ومتوسط الرطوبة في جدول أرقام محايد', () => {
  const hours = makeFullDay(
    DATE,
    { direction: 'NW', speed: 20, humidity: 49 },
    { 3: { humidity: 65 }, 4: { humidity: 65 }, 5: { humidity: 65 } }
  );
  render(<DayPartMeasurements parts={[summarizeDayParts(hours)[0]]} />);
  expect(screen.getByRole('table', { name: 'أرقام الفترات' })).toHaveTextContent('20');
  expect(screen.getByText('57%')).toBeVisible();
  expect(screen.getByRole('columnheader', { name: 'متوسط الرطوبة' })).toBeInTheDocument();
  expect(document.querySelector('.dayparts')).toBeNull();
  expect(screen.queryByText(/ساعات مطابقة/)).not.toBeInTheDocument();
});
it('يسمي حدود الفترات ويصف الفترة المنقضية دون تخفيف النص', () => {
  const parts = summarizeDayParts(
    makeFullDay(DATE, { direction: 'NW', speed: 20, humidity: 40 }),
    6
  );
  render(<DayPartMeasurements parts={[parts[0], parts[1]]} />);
  const rows = screen.getAllByRole('row').slice(1);
  expect(rows[0]).toHaveClass('is-past');
  expect(rows[1]).not.toHaveClass('is-past');
  expect(rows[0]).toHaveTextContent('فترة انقضت');
  expect(screen.getByRole('rowheader', { name: /فجر.*من 12:00 ص إلى 6:00 ص/ })).toBeInTheDocument();
  expect(screen.getByText('12ص–6ص')).toBeVisible();
});
it('يبقي الفترات بلا بيانات شرطات بدل أرقام مختلقة', () => {
  render(<DayPartMeasurements parts={[summarizeDayParts([])[0]]} />);
  expect(screen.getAllByText('—')).toHaveLength(2);
  expect(screen.getByRole('rowheader')).toHaveTextContent('لا بيانات لهذه الفترة');
});
