// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { Num, TimeRange } from '../Num';

describe('عزل الأرقام في RTL', () => {
  it('يعزل القيمة الرقمية باتجاه LTR', () => {
    render(<Num>6–18 كم/س</Num>);
    const value = screen.getByText('6–18 كم/س');
    expect(value).toHaveAttribute('dir', 'ltr');
    expect(value).toHaveClass('num');
  });

  it('يعزل النطاق الزمني مع إبقاء ص/م في اتجاه RTL', () => {
    render(<TimeRange>12:00 ص–3:00 م</TimeRange>);
    const value = screen.getByText('12:00 ص–3:00 م');
    expect(value).toHaveAttribute('dir', 'rtl');
    expect(value).toHaveClass('timerange');
  });
});
