import { describe, expect, it } from 'vitest';
import { formatDirectionNarrative, formatHiddenSegments, displayRange } from '../narrative';
import type { DirectionSegment } from '../types';

const segments: DirectionSegment[] = [
  { startHour: 0, endHourExclusive: 11, direction: 'NW' },
  { startHour: 11, endHourExclusive: 18, direction: 'W' },
  { startHour: 18, endHourExclusive: 24, direction: 'NW' }
];

describe('القسم 5.6 — صيغة عرض تحولات الاتجاه', () => {
  it('يطابق المثال الوارد في الوثيقة', () => {
    expect(formatDirectionNarrative(segments).text).toBe(
      'شمالية غربية من 12:00 ص إلى 11:00 ص، ثم غربية من 11:00 ص إلى 6:00 م، ثم شمالية غربية حتى نهاية اليوم'
    );
  });

  it('يختصر إلى ثلاثة أجزاء ويعلن الفترات المخفية', () => {
    const many: DirectionSegment[] = [
      ...segments.slice(0, 2),
      { startHour: 18, endHourExclusive: 20, direction: 'N' },
      { startHour: 20, endHourExclusive: 24, direction: 'NW' }
    ];
    const result = formatDirectionNarrative(many, { maxSegments: 3 });
    expect(result.hiddenCount).toBe(1);
    expect(formatHiddenSegments(result.hiddenCount)).toBe('+ فترة أخرى');
    expect(result.text).not.toContain('حتى نهاية اليوم');
  });

  it('يعرض المدى بعد التقريب المرئي فقط', () => {
    expect(displayRange(17.6, 24.2)).toBe('18–24');
    expect(displayRange(20, 20)).toBe('20');
    expect(displayRange(null, 5)).toBe('—');
  });
});
