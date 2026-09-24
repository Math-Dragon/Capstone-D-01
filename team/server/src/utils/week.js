// Accept both Date objects and 'YYYY-MM-DD' strings. Strings are parsed as
// local-midnight (not UTC-midnight), so the calendar date never shifts a day
// in timezones west of UTC — matching how Postgres DATE values arrive after
// the OID 1082 string parser in db.js.
function toLocalDate(date) {
  if (typeof date === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(date);
}

function getISOWeek(date) {
  const tmp = toLocalDate(date);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const year = tmp.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

function getCurrentWeek() {
  return getISOWeek(new Date().toISOString().split('T')[0]);
}

module.exports = { getISOWeek, getCurrentWeek };
