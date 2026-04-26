const fs = require('fs');
const path = require('path');
const config = require('../config');
const { validateAIOutput, SuggestionSchema } = require('./llm');
const { generateMockSuggestion } = require('./llm-mock');
const repos = require('../repositories');
const db = require('../db');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

const isMock = config.llmProvider === 'mock';

let genAI;
let SYSTEM_PROMPT;

if (!isMock) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(config.geminiKey);
  SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, '../prompts/system-v3.md'), 'utf8');
}

const AI_TIMEOUT_MS = 30000;
const AI_MAX_RETRIES = 3;

function isRetryableAIError(err) {
  if (err.name === 'AbortError') return false;
  if (err.code === 'AI_OUTPUT_INVALID') return false;
  if (err.statusCode === 401 || err.statusCode === 403) return false;
  if (err.message?.includes('API key')) return false;
  return true;
}

function makeAIFallbackError(originalError) {
  const err = new Error('AI service is temporarily unavailable. Please try again in a moment.');
  err.code = 'AI_UNAVAILABLE';
  err.statusCode = 503;
  err.originalError = originalError.message;
  return err;
}

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

    let validated;
    if (isMock) {
      const mockOutput = generateMockSuggestion(userContext);
      validated = SuggestionSchema.parse(mockOutput);
      logger.info({ user_id: userId, goal_id: goalId }, 'Mock LLM response generated');
    } else {
      validated = await this._callGeminiWithRetry(userContext);
    }

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
    let raw;
    try {
      raw = await withRetry(
        () => this._callGemini(userContext),
        {
          maxAttempts: AI_MAX_RETRIES,
          delayMs: 500,
          maxDelayMs: 8000,
          shouldRetry: isRetryableAIError,
          label: 'ai.suggestPlan',
        }
      );
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'AI_TIMEOUT') {
        const e = new Error('AI request timed out. Please try again.');
        e.code = 'AI_TIMEOUT';
        e.statusCode = 504;
        throw e;
      }
      logger.error({ err: err.message }, 'AI service failed after retries');
      throw makeAIFallbackError(err);
    }
    return validateAIOutput(raw);
  }

  async _callGemini(userContext) {
    const model = genAI.getGenerativeModel({ model: config.geminiModel });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT + '\n\nCONTEXT:\n' + JSON.stringify(userContext) }],
        }],
        generationConfig: { responseMimeType: 'application/json' },
        requestOptions: { signal: controller.signal },
      });
      return result.response.text();
    } finally {
      clearTimeout(timeout);
    }
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
