import { describe, it, expect, vi } from 'vitest';
import {
  formatDate,
  formatDateTime,
  clampDateRange,
  isWithinRange,
} from '../../../src/scripts/utils/dates.js';

const DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
});

describe('date utilities', () => {
  it('formats date strings using the shared formatter', () => {
    const source = '2024-03-10';
    const expected = DATE_FORMATTER.format(new Date(`${source}T00:00:00`));
    expect(formatDate(source)).toBe(expected);
  });

  it('formats combined date/time values with bullet separator', () => {
    const date = '2024-03-11';
    const time = '15:30';
    const base = new Date(`${date}T${time}`);
    const expected = `${DATE_FORMATTER.format(base)} · ${TIME_FORMATTER.format(base)}`;
    expect(formatDateTime(date, time)).toBe(expected);
  });

  it('clamps date ranges relative to today', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2024-03-20T12:00:00Z'));
      const { start, end } = clampDateRange(3);
      expect(end.getHours()).toBe(0);
      expect(end.getMinutes()).toBe(0);
      expect(start.getDate()).toBe(end.getDate() - 2);
      expect(start.getMonth()).toBe(end.getMonth());
    } finally {
      vi.useRealTimers();
    }
  });

  it('checks if a date string is inside a range', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2024-03-20T12:00:00Z'));
      const range = clampDateRange(7);
      expect(isWithinRange('2024-03-18', range)).toBe(true);
      expect(isWithinRange('2024-03-25', range)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
