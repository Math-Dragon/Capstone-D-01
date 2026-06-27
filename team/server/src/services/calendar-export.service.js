const SLOT_START = {
  morning: '08:00',
  afternoon: '13:00',
  evening: '19:00',
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDateTimeFloating(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return [
    String(year),
    pad(month),
    pad(day),
    'T',
    pad(hours),
    pad(minutes),
    '00',
  ].join('');
}

function endSlot(dateStr, timeStr, durationMinutes) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const endMs = Date.UTC(year, month - 1, day, hours, minutes, 0) + durationMinutes * 60 * 1000;
  const endDate = new Date(endMs);
  return {
    date: [endDate.getUTCFullYear(), pad(endDate.getUTCMonth() + 1), pad(endDate.getUTCDate())].join('-'),
    time: [pad(endDate.getUTCHours()), pad(endDate.getUTCMinutes())].join(':'),
  };
}

function formatDateTimeUtc(date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    '00',
    'Z',
  ].join('');
}

function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function buildDescription(task) {
  return [
    task.description ? `Description: ${task.description}` : null,
    task.goal_title ? `Goal: ${task.goal_title}` : null,
    task.rationale ? `Rationale: ${task.rationale}` : null,
  ].filter(Boolean).join('\n');
}

function buildUid(userId, taskId) {
  return `${taskId}-${userId}@stepup`;
}

function buildEvent(userId, task) {
  const startTime = SLOT_START[task.planned_slot] || SLOT_START.morning;
  const durationMinutes = Number(task.duration_estimate) > 0 ? Number(task.duration_estimate) : 30;
  const end = endSlot(task.planned_date, startTime, durationMinutes);
  const stamp = new Date(task.updated_at || task.created_at);
  const description = buildDescription(task);

  return [
    'BEGIN:VEVENT',
    `UID:${escapeText(buildUid(userId, task.id))}`,
    `DTSTAMP:${formatDateTimeUtc(stamp)}`,
    `DTSTART:${formatDateTimeFloating(task.planned_date, startTime)}`,
    `DTEND:${formatDateTimeFloating(end.date, end.time)}`,
    `SUMMARY:${escapeText(task.title || 'Scheduled task')}`,
    description ? `DESCRIPTION:${escapeText(description)}` : null,
    'END:VEVENT',
  ].filter(Boolean).join('\r\n');
}

function buildCalendar(userId, tasks) {
  const events = tasks.map((task) => buildEvent(userId, task));
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StepUp//Learning Planner//EN',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

module.exports = {
  SLOT_START,
  buildCalendar,
};
