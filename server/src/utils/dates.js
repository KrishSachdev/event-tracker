// All date calculations happen here, on the server.
// Dates are plain strings: 'YYYY-MM' for months and 'YYYY-MM-DD' for days.
// We use UTC everywhere so the server's timezone never shifts a date.

// 5 -> '05'
const pad = (n) => String(n).padStart(2, '0');

// Today as 'YYYY-MM-DD'
export function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// This month as 'YYYY-MM'
export function currentMonth() {
  return todayString().slice(0, 7);
}

// How many days a month has: '2026-02' -> 28
export function daysInMonth(month) {
  const [year, mon] = month.split('-').map(Number);
  // Day 0 of the NEXT month = last day of this month
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

// Move a month forward or back: shiftMonth('2026-01', -1) -> '2025-12'
export function shiftMonth(month, delta) {
  const [year, mon] = month.split('-').map(Number);
  const d = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

// '2026-10' -> 'October 2026'
export function formatMonthLabel(month) {
  const [year, mon] = month.split('-').map(Number);
  return new Date(Date.UTC(year, mon - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// '2026-10-03' -> 'Sat, 3 Oct 2026'
export function formatDisplayDate(dateStr) {
  const [year, mon, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, mon - 1, day)).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// '19:30:00' -> '7:30 PM'
export function formatDisplayTime(timeStr) {
  if (!timeStr) return 'Time TBA';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // 0 -> 12, 13 -> 1
  return `${hours12}:${pad(minutes)} ${suffix}`;
}

// Builds the calendar grid for a month.
// Returns a list of weeks; each week has 7 cells (Sunday to Saturday).
// Empty cells (before the 1st / after the last day) are null.
// countsByDate looks like { '2026-10-03': 4, '2026-10-05': 1 }
export function buildMonthGrid(month, countsByDate) {
  const [year, mon] = month.split('-').map(Number);
  const firstWeekday = new Date(Date.UTC(year, mon - 1, 1)).getUTCDay(); // 0 = Sunday
  const totalDays = daysInMonth(month);
  const today = todayString();

  const cells = [];

  // Blank cells so the 1st lands on the right weekday
  for (let i = 0; i < firstWeekday; i++) cells.push(null);

  // One cell per day
  for (let day = 1; day <= totalDays; day++) {
    const date = `${month}-${pad(day)}`;
    cells.push({
      date,
      day,
      eventCount: countsByDate[date] || 0,
      isToday: date === today,
    });
  }

  // Blank cells to complete the last week
  while (cells.length % 7 !== 0) cells.push(null);

  // Split the flat list into rows of 7
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
