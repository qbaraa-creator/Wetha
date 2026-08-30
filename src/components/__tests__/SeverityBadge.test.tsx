// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { SeverityBadge, SeverityCounts } from '../SeverityBadge';

describe('شارات الحالات', () => {
  it('تعرض نصًا ورمزًا ولا تعتمد على اللون وحده', () => {
    render(<SeverityBadge severity="orange" label="متوسط" />);
    expect(screen.getByText('متوسط')).toBeVisible();
    expect(screen.getByText('◐')).toHaveAttribute('aria-hidden', 'true');
  });

  it('تخفي العدادات الصفرية', () => {
    render(<SeverityCounts counts={{ green: 0, orange: 6, red: 0 }} />);
    expect(screen.getByLabelText('برتقالي 6 ساعات')).toBeVisible();
    expect(screen.getByText('6س')).toBeVisible();
    expect(screen.queryByText(/أخضر/)).not.toBeInTheDocument();
    expect(screen.queryByText(/أحمر/)).not.toBeInTheDocument();
  });

  it('يعرض رمز الحالة وحده بصريًا حين لا يوجد وصف آخر', () => {
    render(<SeverityBadge severity="red" />);
    expect(screen.getByLabelText('الحالة أحمر')).toBeVisible();
    expect(screen.queryByText('أحمر')).not.toBeInTheDocument();
  });

  it('تصف غياب الساعات المصنفة بدل ترك مساحة فارغة', () => {
    render(<SeverityCounts counts={{ green: 0, orange: 0, red: 0 }} />);
    expect(screen.getByText('لا ساعات مصنّفة')).toBeVisible();
  });
});
