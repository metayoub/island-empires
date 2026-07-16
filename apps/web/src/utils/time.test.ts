import { describe, expect, it } from 'vitest';
import { formatRemainingTime } from './time';

describe('formatRemainingTime', () => {
  it('includes days, hours, and minutes for multi-day durations', () => {
    expect(formatRemainingTime(1 * 86400 + 2 * 3600 + 51 * 60 + 12)).toBe('1d 2h 51m');
  });

  it('includes hours and minutes for multi-hour durations', () => {
    expect(formatRemainingTime(2 * 3600 + 30 * 60 + 10)).toBe('2h 30m');
  });

  it('includes minutes and seconds for sub-hour durations', () => {
    expect(formatRemainingTime(5 * 60 + 10)).toBe('5m 10s');
  });

  it('shows seconds only for sub-minute durations', () => {
    expect(formatRemainingTime(45)).toBe('45s');
  });

  it('omits zero-value units', () => {
    expect(formatRemainingTime(5 * 60)).toBe('5m');
    expect(formatRemainingTime(2 * 3600)).toBe('2h');
    expect(formatRemainingTime(1 * 86400 + 2 * 3600)).toBe('1d 2h');
  });

  it('shows zero seconds for zero duration', () => {
    expect(formatRemainingTime(0)).toBe('0s');
  });
});
