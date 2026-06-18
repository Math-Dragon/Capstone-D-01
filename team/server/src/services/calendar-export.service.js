const SLOT_START = {
  morning: '08:00',
  afternoon: '13:00',
  evening: '19:00',
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function toUtcDate(date, time) {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
}

function formatDateTime(date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    '00',
  ].join('');
}

function formatDateTimeUtc(date) {
  return `${formatDateTime(date)}Z`;
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
  const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '-');
  const safeTaskId = String(taskId).replace(/[^a-zA-Z0-9_-]/g, '-');
  return `${safeTaskId}-${safeUserId}@stepup`;
}

function buildEvent(userId, task) {
  const startTime = SLOT_START[task.planned_slot] || SLOT_START.morning;
  const durationMinutes = Number(task.duration_estimate) > 0 ? Number(task.duration_estimate) : 30;
  const start = toUtcDate(task.planned_date, startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const stampSource = task.updated_at || task.created_at || `${task.planned_date}T00:00:00.000Z`;
  const stamp = new Date(stampSource);
  const description = buildDescription(task);

  return [
    'BEGIN:VEVENT',
    `UID:${escapeText(buildUid(userId, task.id))}`,
    `DTSTAMP:${formatDateTimeUtc(Number.isNaN(stamp.getTime()) ? start : stamp)}`,
    `DTSTART:${formatDateTime(start)}`,
    `DTEND:${formatDateTime(end)}`,
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
