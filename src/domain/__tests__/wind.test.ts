import { describe, expect, it } from 'vitest';
import {
  degreeToDirection,
  getDirectionSeverity,
  getSpeedSeverity,
  getWindSeverity,
  normalizeDegrees
} from '../wind';
import type { DirectionCode } from '../types';

describe('القسم 21.1 — تحويل الدرجات إلى ثمانية اتجاهات', () => {
  const cases: Array<[number, DirectionCode]> = [
    [0, 'N'],
    [22.49, 'N'],
    [22.5, 'NE'],
    [67.5, 'E'],
    [112.5, 'SE'],
    [157.5, 'S'],
    [202.5, 'SW'],
    [247.5, 'W'],
    [292.5, 'NW'],
    [337.5, 'N'],
    [360, 'N'],
    [-45, 'NW']
  ];

  it.each(cases)('%s° ← %s', (degree, expected) => {
    expect(degreeToDirection(degree)).toBe(expected);
  });

  it('يطبّع الدرجات خارج المجال', () => {
    expect(normalizeDegrees(360)).toBe(0);
    expect(normalizeDegrees(-45)).toBe(315);
    expect(normalizeDegrees(725)).toBe(5);
  });

  it('يثبّت لون كل قطاع وفق الجدول 5.1', () => {
    expect(getDirectionSeverity('N')).toBe('green');
    expect(getDirectionSeverity('NW')).toBe('green');
    expect(getDirectionSeverity('NE')).toBe('orange');
    expect(getDirectionSeverity('E')).toBe('orange');
    expect(getDirectionSeverity('W')).toBe('orange');
    expect(getDirectionSeverity('SE')).toBe('red');
    expect(getDirectionSeverity('S')).toBe('red');
    expect(getDirectionSeverity('SW')).toBe('red');
  });
});

describe('القسم 21.2 — السرعة والدمج', () => {
  it('حدود لون السرعة وحدها', () => {
    expect(getSpeedSeverity(15)).toBe('red');
    expect(getSpeedSeverity(15.01)).toBe('orange');
    expect(getSpeedSeverity(25)).toBe('orange');
    expect(getSpeedSeverity(25.01)).toBe('green');
  });

  const combined: Array<[DirectionCode, number, string]> = [
    ['N', 15, 'red'],
    ['N', 15.01, 'orange'],
    ['NW', 25, 'orange'],
    ['NW', 25.01, 'green'],
    ['E', 30, 'orange'],
    ['NE', 30, 'orange'],
    ['W', 30, 'orange'],
    ['S', 30, 'red'],
    ['SE', 20, 'red'],
    ['SW', 40, 'red']
  ];

  it.each(combined)('%s مع %s كم/س ← %s', (direction, speed, expected) => {
    expect(getWindSeverity(direction, speed)).toBe(expected);
  });

  it('أمثلة القسم 5.3 الملزمة', () => {
    expect(getWindSeverity('N', 12)).toBe('red');
    expect(getWindSeverity('NW', 20)).toBe('orange');
    expect(getWindSeverity('N', 31)).toBe('green');
    expect(getWindSeverity('E', 31)).toBe('orange');
    expect(getWindSeverity('S', 31)).toBe('red');
    expect(getWindSeverity('SE', 18)).toBe('red');
    expect(getWindSeverity('SW', 40)).toBe('red');
  });
});
