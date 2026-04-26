const userRepo = require('./user.repo');
const profileRepo = require('./profile.repo');
const goalRepo = require('./goal.repo');
const taskRepo = require('./task.repo');
const aiRecRepo = require('./ai-recommendation.repo');
const progressRepo = require('./progress-snapshot.repo');
const auditRepo = require('./audit-log.repo');
const refreshTokenRepo = require('./refresh-token.repo');
const chatMessageRepo = require('./chat-message.repo');
const studentMetricsRepo = require('./student-metrics.repo');
const cacheRepo = require('./cache.repo');

module.exports = {
  user: userRepo,
  profile: profileRepo,
  goal: goalRepo,
  task: taskRepo,
  aiRec: aiRecRepo,
  progress: progressRepo,
  audit: auditRepo,
  refreshToken: refreshTokenRepo,
  chatMessage: chatMessageRepo,
  studentMetrics: studentMetricsRepo,
  cache: cacheRepo,
};
