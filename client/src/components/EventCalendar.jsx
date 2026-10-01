// The calendar grid. The server sends the finished grid (weeks, days, event counts);
// this component only draws it and reports clicks.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function EventCalendar({ calendar, selectedDate, onSelectDate, onChangeMonth }) {
  if (!calendar) return null;

  return (
    <section className="panel calendar">
      <div className="calendar-header">
        <button className="btn secondary" onClick={() => onChangeMonth(calendar.prevMonth)}>‹</button>
        <h2>{calendar.monthLabel}</h2>
        <button className="btn secondary" onClick={() => onChangeMonth(calendar.nextMonth)}>›</button>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((day) => (
          <div key={day} className="weekday">{day}</div>
        ))}

        {calendar.weeks.flat().map((cell, index) => {
          // Empty square before the 1st / after the last day
          if (!cell) return <div key={`empty-${index}`} />;

          const classes = ['day'];
          if (cell.eventCount > 0) classes.push('has-events'); // highlighted
          if (cell.date === selectedDate) classes.push('selected');
          if (cell.isToday) classes.push('today');

          return (
            <button
              key={cell.date}
              className={classes.join(' ')}
              disabled={cell.eventCount === 0}
              // Clicking the selected day again clears the filter
              onClick={() => onSelectDate(cell.date === selectedDate ? null : cell.date)}
            >
              <span>{cell.day}</span>
              {cell.eventCount > 0 && <span className="count">{cell.eventCount}</span>}
            </button>
          );
        })}
      </div>

      <p className="muted">
        {calendar.totalEvents} events in {calendar.city}
        {selectedDate && (
          <button className="link-button" onClick={() => onSelectDate(null)}>Show whole month</button>
        )}
      </p>
    </section>
  );
}
