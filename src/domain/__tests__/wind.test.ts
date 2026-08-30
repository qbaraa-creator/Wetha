import { describe, expect, it } from 'vitest';
import {
  degreeToDirection,
  getCombinedDirectionSeverity,
  getDirectionSeverity,
  getSpeedBand,
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

  it('يجمع حالة الاتجاهات المتقلبة ولا يحولها إلى حالة محايدة', () => {
    expect(getCombinedDirectionSeverity(['NW', 'N'])).toBe('green');
    expect(getCombinedDirectionSeverity(['N', 'W'])).toBe('orange');
    expect(getCombinedDirectionSeverity(['NW', 'S'])).toBe('red');
    expect(getCombinedDirectionSeverity(undefined)).toBeNull();
  });
});

describe('القسم 21.2 — السرعة والدمج', () => {
  it('حدود لون السرعة وحدها', () => {
    expect(getSpeedBand(14.99)).toBe('low');
    expect(getSpeedSeverity(14.99)).toBe('red');
    expect(getSpeedBand(15)).toBe('green');
    expect(getSpeedSeverity(24.99)).toBe('green');
    expect(getSpeedBand(25)).toBe('strong');
    expect(getSpeedSeverity(34.99)).toBe('orange');
    expect(getSpeedBand(35)).toBe('severe');
    expect(getSpeedSeverity(35)).toBe('red');
  });

  const combined: Array<[DirectionCode, number, string]> = [
    ['N', 14.99, 'red'],
    ['N', 15, 'green'],
    ['NW', 24.99, 'green'],
    ['NW', 25, 'orange'],
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
    expect(getWindSeverity('NW', 20)).toBe('green');
    expect(getWindSeverity('N', 31)).toBe('orange');
    expect(getWindSeverity('E', 31)).toBe('orange');
    expect(getWindSeverity('S', 31)).toBe('red');
    expect(getWindSeverity('SE', 18)).toBe('red');
    expect(getWindSeverity('SW', 40)).toBe('red');
  });
});
