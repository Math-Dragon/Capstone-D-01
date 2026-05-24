const logger = require('../utils/logger');

const PEDAGOGICAL_ORDER = {
  acquire: 0,
  practice: 1,
  recall: 2,
  interleave: 3,
  synthesize: 4,
  review: 5,
  assess: 6,
  reflect: 7,
};

const DAY_ABBR = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const SLOT_CYCLE = ['morning', 'afternoon', 'evening'];
const DEFAULT_HORIZON_DAYS = 60;

function toDayAbbr(date) {
  return DAY_ABBR[date.getDay()];
}

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function generateCandidateDates(startDate, availableDays, deadline) {
  const dates = [];
  const cursor = new Date(startDate);
  const endDate = deadline
    ? new Date(deadline)
    : new Date(Date.now() + DEFAULT_HORIZON_DAYS * 86400000);
  endDate.setHours(23, 59, 59, 999);

  let safety = 0;
  while (cursor <= endDate && safety < 365) {
    if (availableDays.includes(toDayAbbr(cursor))) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
    safety++;
  }

  return dates;
}

function assignSlots(tasksPerDate, preferredSlot) {
  const slotIdx = SLOT_CYCLE.indexOf(preferredSlot);
  if (slotIdx === -1) {
    return tasksPerDate.map((t, i) => ({ ...t, planned_slot: SLOT_CYCLE[i % 3] }));
  }
  return tasksPerDate.map((t, i) => ({ ...t, planned_slot: SLOT_CYCLE[(slotIdx + i) % 3] }));
}

function scheduleTasks(tasks, { availableDays, weeklyTargetHours, deadline, preferredSlot }) {
  if (!tasks || tasks.length === 0) return tasks;

  const validDays = availableDays && availableDays.length > 0
    ? availableDays
    : ['mon', 'tue', 'wed', 'thu', 'fri'];

  const dailyMinuteLimit = Math.max(
    Math.round((weeklyTargetHours * 60) / validDays.length),
    60
  );

  const startDate = nextDay(new Date());
  let candidateDates = generateCandidateDates(startDate, validDays, deadline);

  if (candidateDates.length === 0) {
    logger.warn(
      { validDays, deadline },
      'No candidate dates matched availability — widening to all days'
    );
    candidateDates = generateCandidateDates(startDate, DAY_ABBR, deadline);
  }

  if (candidateDates.length === 0) {
    logger.warn({ deadline }, 'Still no candidate dates — using all next 7 days');
    const fallback = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      fallback.push(d);
    }
    candidateDates = fallback;
  }

  const sorted = [...tasks].sort((a, b) => {
    const orderA = PEDAGOGICAL_ORDER[a.task_type] ?? 99;
    const orderB = PEDAGOGICAL_ORDER[b.task_type] ?? 99;
    return orderA - orderB;
  });

  const dateBuckets = {};
  const result = [];
  const overflow = [];
  const COMPRESS_THRESHOLD = 1.3;

  for (const task of sorted) {
    let assigned = false;

    for (const date of candidateDates) {
      const dateKey = toLocalDateString(date);
      if (!dateBuckets[dateKey]) {
        dateBuckets[dateKey] = { totalMin: 0, tasks: [] };
      }
      const bucket = dateBuckets[dateKey];
      const newTotal = bucket.totalMin + (task.duration_estimate || 0);

      if (newTotal <= dailyMinuteLimit) {
        bucket.totalMin = newTotal;
        bucket.tasks.push({ ...task, planned_date: dateKey });
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      overflow.push(task);
    }
  }

  if (overflow.length > 0) {
    logger.warn(
      { overflowCount: overflow.length, dailyMinuteLimit },
      'Tasks overflowed daily limit — applying compression'
    );

    const compressedLimit = Math.round(dailyMinuteLimit * COMPRESS_THRESHOLD);
    const dateKeys = candidateDates.map((d) => toLocalDateString(d));

    for (const task of overflow) {
      dateKeys.forEach((dk) => {
        if (!dateBuckets[dk]) dateBuckets[dk] = { totalMin: 0, tasks: [] };
      });

      const candidate = dateKeys.find((dk) => {
        const bucket = dateBuckets[dk];
        return bucket.totalMin + (task.duration_estimate || 0) <= compressedLimit;
      });

      if (candidate) {
        dateBuckets[candidate].totalMin += task.duration_estimate || 0;
        dateBuckets[candidate].tasks.push({ ...task, planned_date: candidate });
      } else {
        dateKeys.sort((a, b) => dateBuckets[a].totalMin - dateBuckets[b].totalMin);
        const lightest = dateKeys[0];
        dateBuckets[lightest].totalMin += task.duration_estimate || 0;
        dateBuckets[lightest].tasks.push({ ...task, planned_date: lightest });
      }
    }
  }

  const sortedDateKeys = Object.keys(dateBuckets).sort();
  for (const dateKey of sortedDateKeys) {
    const bucket = dateBuckets[dateKey];
    const tasksWithSlot = assignSlots(bucket.tasks, preferredSlot || 'morning');
    result.push(...tasksWithSlot);
  }

  const idOrder = {};
  tasks.forEach((t, i) => {
    idOrder[t.id || `t${i}`] = i;
  });
  result.sort((a, b) => {
    const orderA = idOrder[a.id] ?? 999;
    const orderB = idOrder[b.id] ?? 999;
    return orderA - orderB;
  });

  return result;
}

module.exports = { scheduleTasks };
