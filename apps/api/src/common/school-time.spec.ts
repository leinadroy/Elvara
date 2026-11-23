import { addDays, endOfDayIn, isoDayOfWeek, todayIn } from './school-time.js';

describe('school time', () => {
  it('uses the school timezone for "today"', () => {
    // 2026-11-19 20:00 UTC = 2026-11-20 03:00 WIB
    expect(todayIn('Asia/Jakarta', new Date('2026-11-19T20:00:00Z'))).toBe('2026-11-20');
    expect(todayIn('UTC', new Date('2026-11-19T20:00:00Z'))).toBe('2026-11-19');
  });

  it('computes ISO weekday, date arithmetic and end of day', () => {
    expect(isoDayOfWeek('2026-11-16')).toBe(1); // Senin
    expect(isoDayOfWeek('2026-11-22')).toBe(7); // Minggu
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(endOfDayIn('2026-11-20', 'Asia/Jakarta')).toBe('2026-11-20T16:59:59.999Z');
  });
});
