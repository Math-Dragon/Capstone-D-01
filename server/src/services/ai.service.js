const crypto = require('crypto');
const { validateAIOutput, SuggestionSchema } = require('./llm');
const { generateMockSuggestion } = require('./llm-mock');
const { isMock, callWithRetry } = require('./llm-client');
const repos = require('../repositories');
const db = require('../db');
const logger = require('../utils/logger');

class AIService {
  async suggestPlan(userId, goalId, context = {}) {
    const user = await repos.user.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    const profile = await repos.profile.findByUserId(userId);
    const goal = await repos.goal.findByIdAndUserId(goalId, userId);
    if (!goal) {
      const err = new Error('Goal not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const existingTasks = await repos.task.findByGoalId(goalId);

    const userContext = {
      user_id: userId,
      goal_id: goalId,
      timezone: profile?.timezone || 'Asia/Jakarta',
      preferred_time: profile?.preferred_time || 'morning',
      weekly_target_hours: profile?.weekly_target_hours || 5.0,
      availability: profile?.availability || {},
      goal: {
        title: goal.title,
        description: goal.description,
        deadline: goal.deadline,
        existing_tasks: existingTasks.map(t => ({
          title: t.title,
          status: t.status,
          planned_date: t.planned_date,
        })),
      },
      extra_context: context,
    };

    const contextHash = crypto.createHash('md5').update(JSON.stringify(userContext)).digest('hex');
    const cacheKey = `ai:suggest:${userId}:${goalId}:${contextHash}`;

    const cached = await repos.cache.get(cacheKey);
    if (cached) {
      logger.info({ user_id: userId, goal_id: goalId }, 'AI suggestion cache hit');
      const recommendation = await repos.aiRec.create({
        user_id: userId,
        goal_id: goalId,
        type: 'suggest',
        input_context: userContext,
        output: cached,
        status: 'pending',
      });
      return { recommendationId: recommendation.id, ...cached, fromCache: true };
    }

    let validated;
    if (isMock) {
      const mockOutput = generateMockSuggestion(userContext);
      validated = SuggestionSchema.parse(mockOutput);
      logger.info({ user_id: userId, goal_id: goalId }, 'Mock LLM response generated');
    } else {
      validated = await this._callGeminiWithRetry(userContext);
    }

    await repos.cache.set(cacheKey, validated, 24 * 60 * 60); // 24 hours

    const recommendation = await repos.aiRec.create({
      user_id: userId,
      goal_id: goalId,
      type: 'suggest',
      input_context: userContext,
      output: validated,
      status: 'pending',
    });

    return { recommendationId: recommendation.id, ...validated };
  }

  async _callGeminiWithRetry(userContext) {
    const userMessage = 'CONTEXT:\n' + JSON.stringify(userContext);
    let raw;
    try {
      raw = await callWithRetry(userMessage, { maxRetries: 3, label: 'ai.suggestPlan' });
    } catch (err) {
      if (err.name === 'AbortError') {
        const e = new Error('AI request timed out. Please try again.');
        e.code = 'AI_TIMEOUT';
        e.statusCode = 504;
        throw e;
      }
      logger.error({ err: err.message }, 'AI service failed after retries');
      const fb = new Error('AI service is temporarily unavailable. Please try again in a moment.');
      fb.code = 'AI_UNAVAILABLE';
      fb.statusCode = 503;
      fb.originalError = err.message;
      throw fb;
    }
    return validateAIOutput(raw);
  }

  async acceptRecommendation(userId, recommendationId) {
    const rec = await repos.aiRec.findByIdAndUserId(recommendationId, userId);
    if (!rec) {
      const err = new Error('Recommendation not found');
      err.statusCode = 404;
      throw err;
    }
    if (rec.status !== 'pending') {
      const err = new Error('Recommendation already processed');
      err.statusCode = 409;
      err.code = 'CONFLICT';
      throw err;
    }

    const tasksToCreate = rec.output.tasks.map(t => ({
      goal_id: rec.goal_id,
      title: t.title,
      description: t.description,
      duration_estimate: t.duration_estimate,
      planned_date: t.planned_date,
      planned_slot: t.planned_slot,
      rationale: t.rationale,
      source: 'ai',
      status: 'todo',
    }));

    const savedTasks = await db.withTransaction(async (client) => {
      const tasks = await repos.task.createMany(tasksToCreate, client);
      await repos.aiRec.updateStatus(recommendationId, 'accepted', client);
      await repos.audit.create({
        user_id: userId,
        recommendation_id: recommendationId,
        action: 'AI_RECOMMENDATION_ACCEPTED',
        metadata: { task_count: tasks.length },
      }, client);
      return tasks;
    });

    return savedTasks;
  }

  async rejectRecommendation(userId, recommendationId) {
    const rec = await repos.aiRec.findByIdAndUserId(recommendationId, userId);
    if (!rec) {
      const err = new Error('Recommendation not found');
      err.statusCode = 404;
      throw err;
    }

    await db.withTransaction(async (client) => {
      await repos.aiRec.updateStatus(recommendationId, 'rejected', client);
      await repos.audit.create({
        user_id: userId,
        recommendation_id: recommendationId,
        action: 'AI_RECOMMENDATION_REJECTED',
        metadata: {},
      }, client);
    });

    return { status: 'rejected' };
  }
}

module.exports = new AIService();
