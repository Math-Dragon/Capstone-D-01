const appEvents = require('../services/events');
const repos = require('../repositories');
const logger = require('../utils/logger');

function getISOWeek(date) {
  const tmp = new Date(date);
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

async function emitTaskCompleted(userId, taskId) {
  appEvents.emit('task:completed', { userId, taskId });

  const currentWeek = getCurrentWeek();
  try {
    const weekProgress = await repos.progress.findByUserAndWeek(userId, currentWeek);
    if (weekProgress && parseFloat(weekProgress.completion_rate) >= 1.0) {
      appEvents.emit('milestone:reached', {
        userId,
        milestone: `week_${currentWeek}_complete`,
      });
    }
  } catch (err) {
    logger.warn({ err: err.message, user_id: userId }, 'Failed to check milestone after task completion');
  }
}

module.exports = { emitTaskCompleted, getISOWeek, getCurrentWeek };
