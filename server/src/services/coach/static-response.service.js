const repos = require('../../repositories');

const DAY_ABBR = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function _formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function _getNextAvailableDate(availableDays) {
  const validDays = availableDays && availableDays.length > 0
    ? availableDays
    : ['mon', 'tue', 'wed', 'thu', 'fri'];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60; i++) {
    const dayAbbr = DAY_ABBR[cursor.getDay()];
    if (validDays.includes(dayAbbr)) {
      return _formatLocalDate(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 1);
  return _formatLocalDate(fallback);
}

async function respondTaskCompleted(userId, payload, sessionId) {
  const metrics = (await repos.studentMetrics.findByUserId(userId)) || {};
  const task = await repos.task.findByIdAndUser(payload.taskId, userId);
  const streak = metrics.streak_days || 0;
  const totalCompleted = metrics.total_completed || 0;

  let message;
  if (streak >= 7) {
    message = `🎉 Luar biasa! "${task?.title || 'Tugas'}" selesai. Streak belajarmu ${streak} hari — konsistensimu menginspirasi!`;
  } else if (streak >= 3) {
    message = `🔥 Kerja bagus! "${task?.title || 'Tugas'}" selesai. Streak-mu sekarang ${streak} hari. Pertahankan momentum!`;
  } else {
    message = `✅ "${task?.title || 'Tugas'}" selesai. Total tugas selesai: ${totalCompleted}. Lanjutkan!`;
  }

  await repos.chatMessage.create({
    user_id: userId,
    role: 'coach',
    content: message,
    plan_snapshot_summary: null,
    session_type: 'task_complete',
    session_id: sessionId,
  });

  await repos.audit.create({
    user_id: userId,
    action: 'COACH_TASK_COMPLETED_RESPONSE',
    metadata: { task_id: payload.taskId, streak_days: streak },
    session_id: sessionId,
  });

  return { type: 'message', data: { message, plan: null }, meta: { attempts: [], duration_ms: 0 } };
}

async function respondFeedback(userId, payload, sessionId) {
  const task = await repos.task.findByIdAndUser(payload.taskId, userId);
  const difficulty = payload.difficulty || 3;
  const title = task?.title || payload.taskTitle || 'Tugas';

  let message;
  if (difficulty >= 4) {
    message = `Terima kasih atas feedback-nya! "${title}" tampaknya cukup menantang — saya akan menyesuaikan tugas berikutnya agar lebih manageable.`;
  } else if (difficulty <= 2) {
    message = `Terima kasih atas feedback-nya! "${title}" sepertinya sudah cukup mudah — saya akan tingkatkan tingkat kesulitan untuk tantangan berikutnya.`;
  } else {
    message = `Terima kasih atas feedback-nya untuk "${title}"! Pertahankan momentum belajarmu!`;
  }

  await repos.chatMessage.create({
    user_id: userId,
    role: 'coach',
    content: message,
    plan_snapshot_summary: null,
    session_type: 'static_feedback',
    session_id: sessionId,
  });

  await repos.audit.create({
    user_id: userId,
    action: 'COACH_STATIC_FEEDBACK',
    metadata: {
      task_id: payload.taskId,
      difficulty,
      focus: payload.focus || null,
    },
    session_id: sessionId,
  });

  return { type: 'message', data: { message, plan: null }, meta: { attempts: [], duration_ms: 0 } };
}

async function respondSkip(userId, payload, sessionId) {
  const task = await repos.task.findByIdAndUser(payload.taskId, userId);
  const title = task?.title || payload.taskTitle || 'tugas tersebut';
  const reason = payload.reason || 'unspecified';
  const profile = await repos.profile.findByUserId(userId);

  const newDate = _getNextAvailableDate(profile?.availability);

  await repos.task.update(payload.taskId, { planned_date: newDate });

  const message = `Saya mengerti kamu melewatkan "${title}" karena ${reason}. Tugas dipindahkan ke ${newDate}.`;

  await repos.chatMessage.create({
    user_id: userId,
    role: 'coach',
    content: message,
    plan_snapshot_summary: null,
    session_type: 'static_skip',
    session_id: sessionId,
  });

  await repos.audit.create({
    user_id: userId,
    action: 'COACH_STATIC_SKIP',
    metadata: {
      task_id: payload.taskId,
      reason,
      rescheduled_date: newDate,
    },
    session_id: sessionId,
  });

  return { type: 'message', data: { message, plan: null }, meta: { attempts: [], duration_ms: 0 } };
}

async function respondCheckIn(userId, payload, sessionId, metrics) {
  const mood = payload.mood || 'okay';
  const streak = metrics?.streak_days || 0;
  const rate = Math.round((metrics?.completion_rate_7d || 0) * 100);

  let message;
  if (streak >= 7) {
    message = `👍 Konsistensimu luar biasa! ${streak} hari berturut-turut dengan tingkat penyelesaian ${rate}%. Pertahankan!`;
  } else if (streak >= 3) {
    message = `💪 Kamu sedang dalam momentum yang baik! Streak ${streak} hari dengan tingkat penyelesaian ${rate}%. Teruskan!`;
  } else if (mood === 'great') {
    message = 'Semangat! Kamu dalam kondisi prima hari ini. Manfaatkan energi ini untuk belajar maksimal!';
  } else {
    message = `Terima kasih sudah check-in! Kamu berada di jalur yang tepat dengan tingkat penyelesaian ${rate}%.`;
  }

  await repos.chatMessage.create({
    user_id: userId,
    role: 'coach',
    content: message,
    plan_snapshot_summary: null,
    session_type: 'static_checkin',
    session_id: sessionId,
  });

  await repos.audit.create({
    user_id: userId,
    action: 'COACH_STATIC_CHECKIN',
    metadata: {
      mood,
      streak_days: streak,
      completion_rate_7d: metrics?.completion_rate_7d || 0,
    },
    session_id: sessionId,
  });

  return { type: 'message', data: { message, plan: null }, meta: { attempts: [], duration_ms: 0 } };
}

module.exports = { respondTaskCompleted, respondFeedback, respondSkip, respondCheckIn };
