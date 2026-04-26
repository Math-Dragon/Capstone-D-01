const fs = require('fs');
const path = require('path');
const config = require('../config');
const repos = require('../repositories');
const { validateAIOutput, validateChatOutput } = require('./llm');
const { generateMockSuggestion, generateMockChat } = require('./llm-mock');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');
const adaptationTrigger = require('./adaptation-trigger.service');

const isMock = config.llmProvider === 'mock';

let genAI;
let SYSTEM_PROMPT;

if (!isMock) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(config.geminiKey);
  SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, '../prompts/system-v3.md'), 'utf8');
}

const AI_TIMEOUT_MS = 30000;
const AI_MAX_RETRIES = 2;

function isRetryableAIError(err) {
  if (err.name === 'AbortError') return false;
  if (err.code === 'AI_OUTPUT_INVALID') return false;
  if (err.statusCode === 401 || err.statusCode === 403) return false;
  return true;
}

const TEMPLATES = {
  initial_plan: (ctx) =>
    '[session_type: initial_plan]\n\n' +
    `Student goal: ${ctx.profile.goal}\n` +
    `Subjects: ${ctx.profile.subjects}\n` +
    `Current level per subject: ${ctx.profile.current_level}\n` +
    `Weekly available hours: ${ctx.profile.weekly_available_hours}\n` +
    `Preferred study slots: ${ctx.profile.preferred_slots}\n` +
    `Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
    'Generate a personalized study plan for this student. Follow the output structure exactly.',

  check_in: (ctx) =>
    '[session_type: check_in]\n\n' +
    'Check-in data:\n' +
    `- Mood/energy: ${ctx.payload.mood}\n` +
    `- Streak: ${ctx.metrics.streak_days} days\n` +
    `- Consecutive skips: ${ctx.metrics.consecutive_skips}\n\n` +
    `Completed since last check-in:\n${ctx.completedSummary}\n\n` +
    `Skipped since last check-in:\n${ctx.skippedSummary}\n\n` +
    `Remaining plan:\n${ctx.remainingTasksJson}\n\n` +
    'Based on this check-in, adjust the remaining plan if needed. If the student is on track, keep the plan unchanged.',

  adjustment: (ctx) =>
    '[session_type: adjustment]\n\n' +
    `Adjustment reason: ${ctx.payload.type || 'custom'}\n` +
    `Detail: ${ctx.payload.message || ''}\n\n` +
    `Current plan:\n${ctx.remainingTasksJson}\n\n` +
    'Completion metrics:\n' +
    `- Completion rate (7d): ${Math.round((ctx.metrics.completion_rate_7d || 0) * 100)}%\n` +
    `- Consecutive skips: ${ctx.metrics.consecutive_skips}\n` +
    `- Streak: ${ctx.metrics.streak_days} days\n\n` +
    'Adjust the plan to accommodate this change. Only modify tasks that are affected. Explain changes in adaptation_notes.',

  chat: (ctx) =>
    '[session_type: chat]\n\n' +
    `Student message: ${ctx.payload.message}\n\n` +
    `Recent conversation:\n${ctx.chatHistory}\n\n` +
    `Current plan summary:\n${ctx.remainingTasksSummary}\n\n` +
    'Student metrics:\n' +
    `- Streak: ${ctx.metrics.streak_days} days\n` +
    `- Completion rate (7d): ${Math.round((ctx.metrics.completion_rate_7d || 0) * 100)}%\n` +
    `- Mood: ${ctx.metrics.last_mood || 'unknown'}\n\n` +
    'Respond conversationally. If the student needs a plan change, adjust the plan and explain why. Otherwise just answer. Keep response under 150 words.',

  crisis: (ctx) =>
    '[session_type: crisis]\n\n' +
    'Crisis indicators:\n' +
    `- Mood: ${ctx.metrics.last_mood}\n` +
    `- Consecutive skips: ${ctx.metrics.consecutive_skips}\n` +
    `- Completion rate (3d): ${Math.round((ctx.metrics.completion_rate_3d || 0) * 100)}%\n\n` +
    `Current plan:\n${ctx.remainingTasksJson}\n\n` +
    'This student may be overwhelmed. Reduce the plan. Focus on highest-impact tasks only. Be empathetic.',

  milestone: (ctx) =>
    '[session_type: milestone]\n\n' +
    'The student has completed all tasks in their current cycle!\n\n' +
    `Completed: ${ctx.metrics.total_completed} tasks\n` +
    `Streak: ${ctx.metrics.streak_days} days\n\n` +
    'Student profile:\n' +
    `- Goal: ${ctx.profile.goal}\n` +
    `- Weekly hours: ${ctx.profile.weekly_available_hours}\n\n` +
    'Generate the next phase. Increase difficulty by 10-15%. Acknowledge the achievement.',
};

class CoachRouterService {
  async dispatch(userId, action, payload) {
    const { sessionType, shouldCallLLM } = this._resolveAction(action);

    await this._updateState(userId, action, payload);

    const ctx = await this._buildContext(userId, sessionType, payload);

    let triggerFired = null;
    if (!shouldCallLLM) {
      triggerFired = adaptationTrigger.evaluate(ctx.metrics);
      if (!triggerFired) {
        return { type: 'state_only', data: null };
      }
    }

    const effectiveSessionType = triggerFired ? triggerFired.sessionType : sessionType;
    ctx.sessionType = effectiveSessionType;

    const isChat = effectiveSessionType === 'chat';
    let validated;

    if (isMock) {
      validated = isChat
        ? generateMockChat(ctx)
        : generateMockSuggestion(ctx);
    } else {
      validated = await this._callLLMWithRetry(ctx, isChat);
    }

    if (triggerFired && ctx.metrics.trigger_cooldowns) {
      const updatedCooldowns = adaptationTrigger.recordCooldown(
        ctx.metrics.trigger_cooldowns,
        triggerFired.id
      );
      await repos.studentMetrics.upsert(userId, { trigger_cooldowns: updatedCooldowns });
    }

    if (isChat) {
      const message = validated.message || 'Rencana belajarmu telah diperbarui.';
      await repos.chatMessage.create({
        user_id: userId,
        role: 'coach',
        content: message,
        plan_snapshot_summary: validated.plan ? validated.plan.summary : null,
        session_type: effectiveSessionType,
      });

      if (validated.plan) {
        return {
          type: 'combined',
          data: { message, plan: validated.plan },
        };
      }
      return { type: 'message', data: { message, plan: null } };
    }

    return { type: 'plan', data: validated };
  }

  _resolveAction(action) {
    const map = {
      INITIAL_PLAN: { sessionType: 'initial_plan', shouldCallLLM: true },
      CHECK_IN: { sessionType: 'check_in', shouldCallLLM: true },
      COMPLETE_TASK: { sessionType: null, shouldCallLLM: false },
      SKIP_TASK: { sessionType: 'adjustment', shouldCallLLM: true },
      MODIFY_TASK: { sessionType: 'adjustment', shouldCallLLM: true },
      SUBMIT_FEEDBACK: { sessionType: null, shouldCallLLM: false },
      REQUEST_ADJUSTMENT: { sessionType: 'adjustment', shouldCallLLM: true },
      CHAT_MESSAGE: { sessionType: 'chat', shouldCallLLM: true },
      CRISIS_SIGNAL: { sessionType: 'crisis', shouldCallLLM: true },
    };
    return map[action] || { sessionType: 'chat', shouldCallLLM: true };
  }

  async _updateState(userId, action, payload) {
    const metrics = (await repos.studentMetrics.findByUserId(userId)) || {};
    const updates = {};

    switch (action) {
      case 'COMPLETE_TASK': {
        const task = await repos.task.findById(payload.taskId);
        if (task) {
          await repos.task.update(payload.taskId, {
            status: 'done',
            completed_at: new Date().toISOString(),
          });
        }
        updates.streak_days = (metrics.streak_days || 0) + 1;
        updates.total_completed = (metrics.total_completed || 0) + 1;
        updates.consecutive_skips = 0;
        break;
      }
      case 'SKIP_TASK': {
        const task = await repos.task.findById(payload.taskId);
        if (task) {
          await repos.task.update(payload.taskId, {
            status: 'skipped',
            skip_reason: payload.reason || 'unspecified',
          });
        }
        updates.total_skipped = (metrics.total_skipped || 0) + 1;
        updates.consecutive_skips = (metrics.consecutive_skips || 0) + 1;
        break;
      }
      case 'SUBMIT_FEEDBACK': {
        const fb = {
          feedback_difficulty: payload.difficulty,
          feedback_focus: payload.focus,
          feedback_notes: payload.notes || null,
          feedback_submitted_at: new Date().toISOString(),
        };
        await repos.task.update(payload.taskId, fb);
        break;
      }
      case 'CHECK_IN': {
        updates.last_mood = payload.mood;
        updates.last_check_in = new Date().toISOString();
        break;
      }
      case 'CHAT_MESSAGE': {
        await repos.chatMessage.create({
          user_id: userId,
          role: 'student',
          content: payload.message,
        });
        break;
      }
      default:
        break;
    }

    if (Object.keys(updates).length > 0) {
      await repos.studentMetrics.upsert(userId, updates);
    }
  }

  async _buildContext(userId, sessionType, payload) {
    const user = await repos.user.findById(userId);
    const profile = await repos.profile.findByUserId(userId);
    const goals = await repos.goal.findByUserId ? await repos.goal.findByUserId(userId) : [];
    const activeGoal = goals[0] || {};
    const tasks = await repos.task.listByUser(userId);
    const metrics = (await repos.studentMetrics.findByUserId(userId)) || {};
    const chatHistory = sessionType === 'chat'
      ? await repos.chatMessage.findRecentByUser(userId, 6)
      : [];

    const pendingTasks = tasks.filter(
      (t) => t.status === 'todo' || t.status === 'pending'
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

    const consecutiveDrained = await this._countConsecutiveDrained(userId);

    return {
      user,
      profile: {
        goal: activeGoal.title || '',
        subjects: activeGoal.description || '',
        current_level: profile?.current_level || 'intermediate',
        weekly_available_hours: profile?.weekly_target_hours || 5,
        preferred_slots: [profile?.preferred_time || 'morning'],
        deadline: activeGoal.deadline || null,
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

  async _countConsecutiveDrained(userId) {
    try {
      const dbModule = require('../db');
      const result = await dbModule.query(
        'SELECT last_mood FROM student_metrics WHERE user_id = $1',
        [userId]
      );
      return result.rows[0]?.last_mood === 'drained' ? 2 : 0;
    } catch {
      return 0;
    }
  }

  async _callLLMWithRetry(ctx, isChat) {
    const template = TEMPLATES[ctx.sessionType] || TEMPLATES.chat;
    const userMessage = template(ctx);

    let raw;
    try {
      raw = await withRetry(
        () => this._callGemini(userMessage),
        {
          maxAttempts: AI_MAX_RETRIES,
          delayMs: 500,
          maxDelayMs: 8000,
          shouldRetry: isRetryableAIError,
          label: `coach.${ctx.sessionType}`,
        }
      );
    } catch (err) {
      logger.error({ err: err.message }, 'Coach LLM call failed after retries');
      if (isChat) {
        return { message: 'Maaf, saya sedang mengalami gangguan. Coba lagi sebentar.', plan: null };
      }
      throw err;
    }

    return isChat ? validateChatOutput(raw) : validateAIOutput(raw);
  }

  async _callGemini(userMessage) {
    const model = genAI.getGenerativeModel({ model: config.geminiModel });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT + '\n\n' + userMessage }],
        }],
        generationConfig: { responseMimeType: 'application/json' },
        requestOptions: { signal: controller.signal },
      });
      return result.response.text();
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = new CoachRouterService();
