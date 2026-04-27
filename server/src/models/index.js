const goalModels = require('./goal.model');
const taskModels = require('./task.model');
const userModels = require('./user.model');
const profileModels = require('./profile.model');
const studentMetricsModels = require('./student-metrics.model');
const progressSnapshotModels = require('./progress-snapshot.model');
const aiRecommendationModels = require('./ai-recommendation.model');
const chatMessageModels = require('./chat-message.model');
const refreshTokenModels = require('./refresh-token.model');
const auditLogModels = require('./audit-log.model');
const llmModels = require('./llm.model');
const coachModels = require('./coach.model');

module.exports = {
  goal: goalModels,
  task: taskModels,
  user: userModels,
  profile: profileModels,
  studentMetrics: studentMetricsModels,
  progress: progressSnapshotModels,
  aiRec: aiRecommendationModels,
  chatMessage: chatMessageModels,
  refreshToken: refreshTokenModels,
  audit: auditLogModels,
  llm: llmModels,
  coach: coachModels,
};
