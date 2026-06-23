const repos = require('../../repositories');

function truncateText(value, maxLength = 180) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

async function checkLastMoodDrained(userId) {
  try {
    const dbModule = require('../../db');
    const result = await dbModule.query(
      'SELECT last_mood FROM student_metrics WHERE user_id = $1',
      [userId]
    );
    const row = result.rows[0];
    if (!row || row.last_mood !== 'drained') return 0;

    const auditResult = await dbModule.query(
      `SELECT metadata FROM audit_logs
       WHERE user_id = $1 AND action = 'COACH_STATIC_CHECKIN'
       ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    let count = 1;
    const pastEntries = auditResult.rows.slice(1);
    for (const entry of pastEntries) {
      const metadata = entry.metadata || {};
      if (metadata.mood === 'drained') count++;
      else break;
    }
    return count;
  } catch {
    return 0;
  }
}

async function buildContext(userId, sessionType, payload) {
  const [user, profile, goals, tasks, metrics, chatHistory] = await Promise.all([
    repos.user.findById(userId),
    repos.profile.findByUserId(userId),
    repos.goal.list(userId),
    repos.task.listByUser(userId),
    repos.studentMetrics.findByUserId(userId).then(r => r || {}),
    sessionType === 'chat' ? repos.chatMessage.findRecentByUser(userId, 6) : [],
  ]);
  const activeGoal = goals[0] || {};

  const pendingTasks = tasks.filter(
    (t) => t.status === 'todo'
  );
  const completedTasks = tasks.filter(
    (t) => t.status === 'done' || t.status === 'completed'
  );
  const skippedTasks = tasks.filter((t) => t.status === 'skipped');

  const remainingTasksJson = pendingTasks
    .map((t) => `  ${t.id}: "${t.title}" | ${t.task_type || 'task'} | ${t.duration_estimate}m | ${t.planned_date} | ${t.planned_slot}`)
    .join('\n');

  const remainingTasksSummary = pendingTasks
    .map((t) => `${t.title} (${t.task_type || 'task'}, ${t.duration_estimate}m)`)
    .join(', ');

  const chatHistoryStr = chatHistory
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const consecutiveDrained = await checkLastMoodDrained(userId);

  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => t.status === 'done' || t.status === 'completed').length;
  let currentLevel = 'beginner';
  if (totalTasks > 0) {
    const ratio = completedCount / totalTasks;
    if (ratio > 0.7) currentLevel = 'advanced';
    else if (ratio > 0.3) currentLevel = 'intermediate';
  }

  let profileGoal = truncateText(activeGoal.title || '', 120);
  let profileSubjects = truncateText(activeGoal.description || '', 220);
  let profileDeadline = activeGoal.deadline || null;
  let profileWeeklyHours = profile?.weekly_target_hours || 5;
  let profilePreferredSlots = [profile?.preferred_time || 'morning'];
  let profileAvailableDays = profile?.availability || ['mon', 'tue', 'wed', 'thu', 'fri'];

  if (payload && payload.goal) {
    profileGoal = truncateText(payload.goal.title || profileGoal, 120);
    profileSubjects = truncateText(payload.goal.description || profileSubjects, 220);
    profileDeadline = payload.goal.deadline || profileDeadline;
  }
  if (payload && payload.profile) {
    profileWeeklyHours = payload.profile.weekly_target_hours || profileWeeklyHours;
    profilePreferredSlots = payload.profile.preferred_time
      ? [payload.profile.preferred_time]
      : profilePreferredSlots;
    if (payload.profile.availability && Array.isArray(payload.profile.availability) && payload.profile.availability.length > 0) {
      profileAvailableDays = payload.profile.availability;
    }
  }

  if (typeof profileAvailableDays === 'object' && !Array.isArray(profileAvailableDays)) {
    profileAvailableDays = ['mon', 'tue', 'wed', 'thu', 'fri'];
  }

  if (!Array.isArray(profileAvailableDays) || profileAvailableDays.length === 0) {
    profileAvailableDays = ['mon', 'tue', 'wed', 'thu', 'fri'];
  }

  return {
    user,
    profile: {
      goal: profileGoal,
      subjects: profileSubjects,
      current_level: currentLevel,
      weekly_available_hours: profileWeeklyHours,
      preferred_slots: profilePreferredSlots,
      available_days: profileAvailableDays,
      deadline: profileDeadline,
    },
    metrics: {
      ...metrics,
      streak_days: metrics.streak_days || 0,
      total_completed: metrics.total_completed || 0,
      total_skipped: metrics.total_skipped || 0,
      completion_rate_7d: metrics.completion_rate_7d || 0,
      completion_rate_3d: metrics.completion_rate_3d || 0,
      avg_difficulty_7d: metrics.avg_difficulty_7d || 0,
      consecutive_skips: metrics.consecutive_skips || 0,
      last_mood: metrics.last_mood || null,
      trigger_cooldowns: metrics.trigger_cooldowns || {},
      _consecutive_drained: consecutiveDrained,
    },
    payload: payload || {},
    remainingTasksJson: remainingTasksJson || 'No remaining tasks.',
    remainingTasksSummary: remainingTasksSummary || 'No tasks.',
    completedSummary: completedTasks.slice(-5).map((t) => `- ${t.title}`).join('\n') || 'None',
    skippedSummary: skippedTasks.slice(-5).map((t) => `- ${t.title}`).join('\n') || 'None',
    chatHistory: chatHistoryStr || 'No prior conversation.',
    sessionType,
  };
}

module.exports = { buildContext, checkLastMoodDrained };
