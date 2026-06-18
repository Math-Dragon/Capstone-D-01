const appEvents = require('../services/events');
const repos = require('../repositories');
const logger = require('../utils/logger');
const { getISOWeek } = require('../utils/week');

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
