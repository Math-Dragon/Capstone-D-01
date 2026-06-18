const EventEmitter = require('events');
const logger = require('../utils/logger');

class AppEvents extends EventEmitter {}
const appEvents = new AppEvents();

appEvents.on('task:completed', ({ userId, taskId }) => {
  logger.info({ action: 'event_task_completed', user_id: userId, task_id: taskId });
});

appEvents.on('milestone:reached', ({ userId, milestone }) => {
  logger.info({ action: 'event_milestone', user_id: userId, milestone });
});

module.exports = appEvents;
