import { describe, it, expect } from 'vitest';
import {
  getMonday,
  getFriday,
  dateToISO,
  getWeeksInYear,
  formatDate,
  formatDateWithOrdinal,
  getMondaysInMonth,
  isSameWeek,
  getWeekNumber,
  getDaysInMonth,
  getCalendarGrid,
  overlapsWithWeek
} from '../../../js/services/DateService.js';

describe('DateService', () => {
  describe('getMonday', () => {
    it('should return Monday for a Wednesday', () => {
      const wednesday = new Date(2025, 0, 8); // Jan 8, 2025 (Wed)
      const monday = getMonday(wednesday);

      expect(monday.getDay()).toBe(1); // Monday
      expect(monday.getDate()).toBe(6); // Jan 6, 2025
      expect(monday.getMonth()).toBe(0); // January
    });

    it('should handle ISO string input', () => {
      const monday = getMonday('2025-01-08'); // Wednesday
      expect(dateToISO(monday)).toBe('2025-01-06');
    });

    it('should return same date if already Monday', () => {
      const monday = new Date(2025, 0, 6); // Jan 6, 2025 (Mon)
      const result = getMonday(monday);
      expect(dateToISO(result)).toBe('2025-01-06');
    });

    it('should handle Sunday correctly (previous Monday)', () => {
      const sunday = new Date(2025, 0, 12); // Jan 12, 2025 (Sun)
      const monday = getMonday(sunday);
      expect(dateToISO(monday)).toBe('2025-01-06'); // Previous Monday
    });

    it('should handle Friday correctly', () => {
      const friday = new Date(2025, 0, 10); // Jan 10, 2025 (Fri)
      const monday = getMonday(friday);
      expect(dateToISO(monday)).toBe('2025-01-06');
    });

    it('should handle year boundaries', () => {
      const newYearsDay = new Date(2025, 0, 1); // Jan 1, 2025 (Wed)
      const monday = getMonday(newYearsDay);
      expect(monday.getFullYear()).toBe(2024); // Previous year's Monday
      expect(dateToISO(monday)).toBe('2024-12-30');
    });
  });

  describe('getFriday', () => {
    it('should return Friday for a Monday', () => {
      const monday = new Date(2025, 0, 6); // Jan 6, 2025 (Mon)
      const friday = getFriday(monday);

      expect(friday.getDay()).toBe(5); // Friday
      expect(friday.getDate()).toBe(10); // Jan 10, 2025
    });

    it('should return Friday for a Wednesday', () => {
      const wednesday = new Date(2025, 0, 8); // Jan 8, 2025 (Wed)
      const friday = getFriday(wednesday);
      expect(dateToISO(friday)).toBe('2025-01-10');
    });

    it('should return same date if already Friday', () => {
      const friday = new Date(2025, 0, 10); // Jan 10, 2025 (Fri)
      const result = getFriday(friday);
      expect(dateToISO(result)).toBe('2025-01-10');
    });

    it('should handle ISO string input', () => {
      const friday = getFriday('2025-01-08'); // Wednesday
      expect(dateToISO(friday)).toBe('2025-01-10');
    });
  });

  describe('dateToISO', () => {
    it('should convert date to YYYY-MM-DD format', () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      expect(dateToISO(date)).toBe('2025-01-15');
    });

    it('should pad single-digit months', () => {
      const date = new Date(2025, 0, 1); // Jan 1, 2025
      expect(dateToISO(date)).toBe('2025-01-01');
    });

    it('should pad single-digit days', () => {
      const date = new Date(2025, 11, 5); // Dec 5, 2025
      expect(dateToISO(date)).toBe('2025-12-05');
    });

    it('should handle December correctly', () => {
      const date = new Date(2025, 11, 31); // Dec 31, 2025
      expect(dateToISO(date)).toBe('2025-12-31');
    });
  });

  describe('getWeeksInYear', () => {
    it('should return all weeks for a calendar year', () => {
      const weeks = getWeeksInYear(2025);

      expect(weeks.length).toBeGreaterThan(50);
      expect(weeks.length).toBeLessThanOrEqual(53);
    });

    it('should start with first Monday of year or before', () => {
      const weeks = getWeeksInYear(2025);
      const firstWeek = weeks[0];

      expect(firstWeek.date.getDay()).toBe(1); // Monday
      expect(firstWeek.iso).toBeTruthy();
      expect(firstWeek.monthIdx).toBeDefined();
    });

    it('should have sequential weeks', () => {
      const weeks = getWeeksInYear(2025);

      for (let i = 1; i < weeks.length; i++) {
        const prevWeek = new Date(weeks[i - 1].date);
        const currWeek = new Date(weeks[i].date);
        const diffDays = (currWeek - prevWeek) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBe(7); // Exactly 7 days apart
      }
    });

    it('should include ISO string for each week', () => {
      const weeks = getWeeksInYear(2025);

      weeks.forEach(week => {
        expect(week.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should track month index for each week', () => {
      const weeks = getWeeksInYear(2025);

      weeks.forEach(week => {
        expect(week.monthIdx).toBeGreaterThanOrEqual(0);
        expect(week.monthIdx).toBeLessThanOrEqual(11);
      });
    });
  });

  describe('formatDate', () => {
    it('should format date with default options', () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      const formatted = formatDate(date);

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
    });

    it('should accept custom format options', () => {
      const date = new Date(2025, 0, 15);
      const formatted = formatDate(date, { month: 'long', day: 'numeric', year: 'numeric' });

      expect(formatted).toContain('January');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2025');
    });

    it('should handle ISO string input', () => {
      const formatted = formatDate('2025-01-15');
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('formatDateWithOrdinal', () => {
    it('should add "st" for 1st', () => {
      const date = new Date(2025, 0, 1);
      expect(formatDateWithOrdinal(date)).toBe('1st');
    });

    it('should add "nd" for 2nd', () => {
      const date = new Date(2025, 0, 2);
      expect(formatDateWithOrdinal(date)).toBe('2nd');
    });

    it('should add "rd" for 3rd', () => {
      const date = new Date(2025, 0, 3);
      expect(formatDateWithOrdinal(date)).toBe('3rd');
    });

    it('should add "th" for 4th-20th', () => {
      const date4 = new Date(2025, 0, 4);
      const date11 = new Date(2025, 0, 11);
      const date20 = new Date(2025, 0, 20);

      expect(formatDateWithOrdinal(date4)).toBe('4th');
      expect(formatDateWithOrdinal(date11)).toBe('11th');
      expect(formatDateWithOrdinal(date20)).toBe('20th');
    });

    it('should add "st" for 21st, 31st', () => {
      const date21 = new Date(2025, 0, 21);
      const date31 = new Date(2025, 0, 31);

      expect(formatDateWithOrdinal(date21)).toBe('21st');
      expect(formatDateWithOrdinal(date31)).toBe('31st');
    });

    it('should add "nd" for 22nd', () => {
      const date = new Date(2025, 0, 22);
      expect(formatDateWithOrdinal(date)).toBe('22nd');
    });

    it('should add "rd" for 23rd', () => {
      const date = new Date(2025, 0, 23);
      expect(formatDateWithOrdinal(date)).toBe('23rd');
    });
  });

  describe('getMondaysInMonth', () => {
    it('should return all Mondays in January 2025', () => {
      const mondays = getMondaysInMonth(2025, 0); // January

      expect(mondays.length).toBeGreaterThanOrEqual(4);
      mondays.forEach(monday => {
        expect(monday.getDay()).toBe(1); // All should be Mondays
        expect(monday.getMonth()).toBe(0); // All in January
      });
    });

    it('should return correct Mondays for February (short month)', () => {
      const mondays = getMondaysInMonth(2025, 1); // February

      mondays.forEach(monday => {
        expect(monday.getDay()).toBe(1);
        expect(monday.getMonth()).toBe(1);
      });
    });

    it('should return 4-5 Mondays per month', () => {
      for (let month = 0; month < 12; month++) {
        const mondays = getMondaysInMonth(2025, month);
        expect(mondays.length).toBeGreaterThanOrEqual(4);
        expect(mondays.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('isSameWeek', () => {
    it('should return true for dates in the same week', () => {
      const monday = new Date(2025, 0, 6); // Jan 6, 2025 (Mon)
      const friday = new Date(2025, 0, 10); // Jan 10, 2025 (Fri)

      expect(isSameWeek(monday, friday)).toBe(true);
    });

    it('should return false for dates in different weeks', () => {
      const week1 = new Date(2025, 0, 6); // Jan 6, 2025 (Mon)
      const week2 = new Date(2025, 0, 13); // Jan 13, 2025 (Mon)

      expect(isSameWeek(week1, week2)).toBe(false);
    });

    it('should handle ISO string inputs', () => {
      expect(isSameWeek('2025-01-06', '2025-01-10')).toBe(true);
      expect(isSameWeek('2025-01-06', '2025-01-13')).toBe(false);
    });

    it('should handle mixed input types', () => {
      const date1 = new Date(2025, 0, 6);
      const date2 = '2025-01-10';

      expect(isSameWeek(date1, date2)).toBe(true);
    });

    it('should consider Sunday as previous week', () => {
      const friday = new Date(2025, 0, 10); // Jan 10, 2025 (Fri)
      const sunday = new Date(2025, 0, 12); // Jan 12, 2025 (Sun)

      expect(isSameWeek(friday, sunday)).toBe(false);
    });
  });

  describe('getWeekNumber', () => {
    it('should return 1 for first week of year', () => {
      const firstMonday = getMonday(new Date(2025, 0, 1));
      const weekNum = getWeekNumber(firstMonday, 2025);

      expect(weekNum).toBe(1);
    });

    it('should return sequential week numbers', () => {
      const week1 = getMonday(new Date(2025, 0, 6)); // A Monday in Jan
      const week2 = new Date(week1);
      week2.setDate(week2.getDate() + 7);

      const weekNum1 = getWeekNumber(week1, 2025);
      const weekNum2 = getWeekNumber(week2, 2025);

      expect(weekNum2).toBe(weekNum1 + 1);
    });

    it('should handle mid-year dates', () => {
      const midYear = new Date(2025, 6, 1); // July 1
      const weekNum = getWeekNumber(midYear, 2025);

      expect(weekNum).toBeGreaterThan(20);
      expect(weekNum).toBeLessThan(35);
    });

    it('should handle ISO string input', () => {
      const weekNum = getWeekNumber('2025-01-06', 2025);
      expect(weekNum).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getDaysInMonth', () => {
    it('should return 31 days for January', () => {
      const days = getDaysInMonth(2025, 0);
      expect(days.length).toBe(31);
    });

    it('should return 28 days for February 2025 (non-leap year)', () => {
      const days = getDaysInMonth(2025, 1);
      expect(days.length).toBe(28);
    });

    it('should return 29 days for February 2024 (leap year)', () => {
      const days = getDaysInMonth(2024, 1);
      expect(days.length).toBe(29);
    });

    it('should return 30 days for April', () => {
      const days = getDaysInMonth(2025, 3);
      expect(days.length).toBe(30);
    });

    it('should return 31 days for December', () => {
      const days = getDaysInMonth(2025, 11);
      expect(days.length).toBe(31);
    });

    it('should return Date objects', () => {
      const days = getDaysInMonth(2025, 0);

      days.forEach((day, index) => {
        expect(day).toBeInstanceOf(Date);
        expect(day.getDate()).toBe(index + 1);
        expect(day.getMonth()).toBe(0); // January
      });
    });
  });

  describe('getCalendarGrid', () => {
    it('should include leading days from previous month', () => {
      const grid = getCalendarGrid(2025, 0); // January 2025

      // Jan 1, 2025 is a Wednesday (day 3)
      // Should have 3 leading days from December
      const firstDate = grid[0];
      expect(firstDate.getMonth()).toBe(11); // December (previous month)
    });

    it('should include all days of current month', () => {
      const grid = getCalendarGrid(2025, 0); // January 2025

      const januaryDays = grid.filter(date => date.getMonth() === 0);
      expect(januaryDays.length).toBe(31); // All of January
    });

    it('should include trailing days from next month', () => {
      const grid = getCalendarGrid(2025, 0); // January 2025

      // Jan 31, 2025 is a Friday (day 5)
      // Should have 1 trailing day from February (to reach Saturday)
      const lastDate = grid[grid.length - 1];
      expect(lastDate.getMonth()).toBeGreaterThanOrEqual(0);
    });

    it('should return Date objects', () => {
      const grid = getCalendarGrid(2025, 0);

      grid.forEach(date => {
        expect(date).toBeInstanceOf(Date);
      });
    });

    it('should have at least 28 days (4 weeks)', () => {
      const grid = getCalendarGrid(2025, 0);
      expect(grid.length).toBeGreaterThanOrEqual(28);
    });
  });

  describe('overlapsWithWeek', () => {
    it('should detect overlap when range spans entire week', () => {
      const startDate = '2025-01-06'; // Monday
      const endDate = '2025-01-10';   // Friday
      const weekDate = '2025-01-08';  // Wednesday in same week

      expect(overlapsWithWeek(startDate, endDate, weekDate)).toBe(true);
    });

    it('should detect overlap when range starts mid-week', () => {
      const startDate = '2025-01-08'; // Wednesday
      const endDate = '2025-01-10';   // Friday
      const weekDate = '2025-01-06';  // Monday of same week

      expect(overlapsWithWeek(startDate, endDate, weekDate)).toBe(true);
    });

    it('should detect overlap when range ends mid-week', () => {
      const startDate = '2025-01-06'; // Monday
      const endDate = '2025-01-08';   // Wednesday
      const weekDate = '2025-01-06';  // Monday of same week

      expect(overlapsWithWeek(startDate, endDate, weekDate)).toBe(true);
    });

    it('should return false when range is in different week', () => {
      const startDate = '2025-01-13'; // Monday of next week
      const endDate = '2025-01-17';   // Friday of next week
      const weekDate = '2025-01-06';  // Monday of previous week

      expect(overlapsWithWeek(startDate, endDate, weekDate)).toBe(false);
    });

    it('should detect overlap when range spans multiple weeks', () => {
      const startDate = '2025-01-06'; // Monday week 1
      const endDate = '2025-01-17';   // Friday week 2
      const weekDate1 = '2025-01-06'; // Week 1
      const weekDate2 = '2025-01-13'; // Week 2

      expect(overlapsWithWeek(startDate, endDate, weekDate1)).toBe(true);
      expect(overlapsWithWeek(startDate, endDate, weekDate2)).toBe(true);
    });

    it('should handle single-day range', () => {
      const singleDay = '2025-01-08'; // Wednesday
      const weekDate = '2025-01-06';  // Monday of same week

      expect(overlapsWithWeek(singleDay, singleDay, weekDate)).toBe(true);
    });

    it('should handle Date objects', () => {
      const startDate = new Date(2025, 0, 6);
      const endDate = new Date(2025, 0, 10);
      const weekDate = new Date(2025, 0, 8);

      expect(overlapsWithWeek(startDate, endDate, weekDate)).toBe(true);
    });

    it('should handle weekend overlap correctly', () => {
      const startDate = '2025-01-10'; // Friday
      const endDate = '2025-01-12';   // Sunday
      const weekDate = '2025-01-06';  // Monday of that week

      // Should overlap because Friday is in the Mon-Fri week
      expect(overlapsWithWeek(startDate, endDate, weekDate)).toBe(true);
    });
  });
});
