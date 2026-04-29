const repos = require('../repositories');
const { validateAIOutput, validateChatOutput } = require('./llm');
const { generateMockSuggestion, generateMockChat } = require('./llm-mock');
const { isMock, callWithRetry } = require('./llm-client');
const logger = require('../utils/logger');
const adaptationTrigger = require('./adaptation-trigger.service');
const { aiRequestCount } = require('../utils/metrics');

const TEMPLATES = {
  initial_plan: (ctx) =>
    '[session_type: initial_plan]\n\n' +
    `Today's date: ${new Date().toISOString().slice(0, 10)}\n` +
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

  chat: (ctx) => {
    let body = '[session_type: chat]\n\n';
    if (ctx.payload.reason !== undefined) {
      body += `Student skipped task "${ctx.payload.taskTitle || 'unknown'}" with reason: ${ctx.payload.reason}`;
      if (ctx.payload.note) body += `\nNote: ${ctx.payload.note}`;
      body += '\n\n';
    } else if (ctx.payload.difficulty !== undefined) {
      body += `Student feedback on task "${ctx.payload.taskTitle || 'unknown'}"` +
        `\n- Difficulty: ${ctx.payload.difficulty}/5` +
        `\n- Focus: ${ctx.payload.focus}/5`;
      if (ctx.payload.notes) body += `\n- Notes: ${ctx.payload.notes}`;
      body += '\n\n';
    } else {
      body += `Student message: ${ctx.payload.message || ''}\n\n`;
    }
    body += `Recent conversation:\n${ctx.chatHistory}\n\n` +
      `Current plan summary:\n${ctx.remainingTasksSummary}\n\n` +
      'Student metrics:\n' +
      `- Streak: ${ctx.metrics.streak_days} days\n` +
      `- Completion rate (7d): ${Math.round((ctx.metrics.completion_rate_7d || 0) * 100)}%\n` +
      `- Mood: ${ctx.metrics.last_mood || 'unknown'}\n\n` +
      'Respond conversationally. If the student needs a plan change, adjust the plan and explain why. Otherwise just answer. Keep response under 150 words.';
    return body;
  },

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

const recommendationMetrics = {
  ai_tasks_suggested_total: 0,
  ai_tasks_accepted_total: 0,
  ai_tasks_rejected_total: 0,
  ai_tasks_pending_total: 0,

  trackSuggested(count) {
    this.ai_tasks_suggested_total += count;
    this.ai_tasks_pending_total += count;
  },

  trackDecided(decision) {
    this.ai_tasks_pending_total -= 1;
    if (decision === 'accepted') this.ai_tasks_accepted_total += 1;
    else this.ai_tasks_rejected_total += 1;
  },

  snapshot() {
    const total = this.ai_tasks_accepted_total + this.ai_tasks_rejected_total;
    return {
      ai_tasks_suggested_total: this.ai_tasks_suggested_total,
      ai_tasks_accepted_total: this.ai_tasks_accepted_total,
      ai_tasks_rejected_total: this.ai_tasks_rejected_total,
      ai_tasks_pending_total: this.ai_tasks_pending_total,
      accept_rate: total > 0 ? (this.ai_tasks_accepted_total / total).toFixed(2) : '0.00',
    };
  },
};

class CoachRouterService {
  async dispatch(userId, action, payload) {
    const { sessionType, shouldCallLLM } = this._resolveAction(action);

    await this._updateState(userId, action, payload);

    if (action === 'COMPLETE_TASK') {
      return this._respondTaskCompleted(userId, payload);
    }

    if ((action === 'SKIP_TASK' || action === 'SUBMIT_FEEDBACK') && payload && payload.taskId) {
      const task = await repos.task.findById(payload.taskId);
      payload = { ...payload, taskTitle: task?.title || 'Unknown' };
    }

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
    let validated, llmMeta;

    if (isMock) {
      validated = isChat
        ? generateMockChat(ctx)
        : generateMockSuggestion(ctx);
      llmMeta = { attempts: [], duration_ms: 0 };
    } else {
      validated = await this._callLLMWithRetry(ctx, isChat);
      llmMeta = validated._meta || { attempts: [], duration_ms: 0 };
      delete validated._meta;
    }

    if (triggerFired && ctx.metrics.trigger_cooldowns) {
      const updatedCooldowns = adaptationTrigger.recordCooldown(
        ctx.metrics.trigger_cooldowns,
        triggerFired.id
      );
      await repos.studentMetrics.upsert(userId, { trigger_cooldowns: updatedCooldowns });
    }

    aiRequestCount.inc({ type: `coach.${effectiveSessionType}`, status: 'success' });

    if (isChat) {
      const message = validated.message || 'Rencana belajarmu telah diperbarui.';
      await repos.chatMessage.create({
        user_id: userId,
        role: 'coach',
        content: message,
        plan_snapshot_summary: validated.plan ? validated.plan.summary : null,
        session_type: effectiveSessionType,
      });

      await repos.audit.create({
        user_id: userId,
        action: 'COACH_CHAT_RESPONDED',
        metadata: {
          session_type: effectiveSessionType,
          message_preview: message.slice(0, 120),
          has_plan_adjustment: !!validated.plan,
        },
      });

      if (validated.plan) {
        await this._persistPlan(userId, validated.plan);
        return {
          type: 'combined',
          data: { message, plan: validated.plan },
          meta: llmMeta,
        };
      }
      return { type: 'message', data: { message, plan: null }, meta: llmMeta };
    }

    if (effectiveSessionType === 'initial_plan' && action === 'INITIAL_PLAN') {
      const rec = await this._stageRecommendation(userId, validated, ctx);
      recommendationMetrics.trackSuggested(rec.output.tasks.length);

      return {
        type: 'recommendation',
        data: {
          recommendation_id: rec.id,
          tasks: rec.output.tasks.map((t) => ({
            task_id: t.task_id,
            title: t.title,
            duration_estimate: t.duration_estimate,
            planned_slot: t.planned_slot,
            rationale: t.rationale,
            status: t.status,
          })),
          summary: rec.output.summary,
        },
        meta: llmMeta,
      };
    }

    await this._persistPlan(userId, validated);

    if (validated && validated.tasks) {
      await repos.audit.create({
        user_id: userId,
        action: 'COACH_PLAN_GENERATED',
        metadata: {
          session_type: effectiveSessionType,
          task_count: validated.tasks.length,
          summary: validated.summary,
        },
      });
    }

    return { type: 'plan', data: validated, meta: llmMeta };
  }

  async decideTask(userId, recId, taskId, decision) {
    const rec = await repos.aiRec.findByIdAndUserId(recId, userId);
    if (!rec) {
      const err = new Error('Recommendation not found');
      err.status = 404;
      throw err;
    }
    if (rec.status !== 'pending') {
      const err = new Error('Recommendation already decided');
      err.status = 400;
      throw err;
    }

    const tasks = rec.output.tasks;
    const task = tasks.find((t) => t.task_id === taskId);
    if (!task) {
      const err = new Error('Task not found in recommendation');
      err.status = 404;
      throw err;
    }
    if (task.status !== 'pending') {
      const err = new Error('Task already decided');
      err.status = 400;
      throw err;
    }

    task.status = decision;
    task.decided_at = new Date().toISOString();

    const allDecided = tasks.every((t) => t.status !== 'pending');

    await repos.aiRec.updateOutput(recId, rec.output);

    if (allDecided) {
      const newStatus = tasks.some((t) => t.status === 'accepted') ? 'accepted' : 'rejected';
      await repos.aiRec.updateStatus(recId, newStatus);
    }

    recommendationMetrics.trackDecided(decision);

    if (decision === 'accepted') {
      const goalId = rec.goal_id;
      let goals = await repos.goal.list(userId);
      let activeGoal = goalId ? await repos.goal.findById(goalId) : goals[0];

      if (!activeGoal) {
        const ctxGoal = rec.input_context?.goal || {};
        activeGoal = await repos.goal.create({
          user_id: userId,
          title: ctxGoal.title || 'Rencana Belajar',
          description: ctxGoal.description || '',
          deadline: ctxGoal.deadline || null,
          status: 'active',
        });
      }

      await repos.task.create({
        goal_id: activeGoal.id,
        title: task.title,
        description: task.description || null,
        duration_estimate: task.duration_estimate,
        planned_date: task.planned_date || null,
        planned_slot: task.planned_slot || null,
        task_type: task.task_type || null,
        rationale: task.rationale || null,
        source: 'coach',
        status: 'todo',
      });

      await repos.audit.create({
        user_id: userId,
        action: 'COACH_TASK_ACCEPTED',
        metadata: { recommendation_id: recId, task_id: taskId },
      });
    } else {
      await repos.audit.create({
        user_id: userId,
        action: 'COACH_TASK_REJECTED',
        metadata: { recommendation_id: recId, task_id: taskId },
      });
    }

    return { task_id: taskId, status: decision, allDecided };
  }

  async getRecommendationMetrics() {
    if (!this._metricsSeeded) {
      this._metricsSeeded = true;
      try {
        const dbMetrics = await repos.aiRec.computeAllMetrics();
        recommendationMetrics.ai_tasks_suggested_total = dbMetrics.suggested;
        recommendationMetrics.ai_tasks_accepted_total = dbMetrics.accepted;
        recommendationMetrics.ai_tasks_rejected_total = dbMetrics.rejected;
        recommendationMetrics.ai_tasks_pending_total = dbMetrics.pending;
      } catch (err) {
        logger.warn({ err: err.message }, 'Failed to seed recommendation metrics from DB');
      }
    }
    return recommendationMetrics.snapshot();
  }

  _resolveAction(action) {
    const map = {
      INITIAL_PLAN: { sessionType: 'initial_plan', shouldCallLLM: true },
      CHECK_IN: { sessionType: 'check_in', shouldCallLLM: true },
      COMPLETE_TASK: { sessionType: null, shouldCallLLM: false },
      SKIP_TASK: { sessionType: 'chat', shouldCallLLM: true },
      MODIFY_TASK: { sessionType: 'adjustment', shouldCallLLM: true },
      SUBMIT_FEEDBACK: { sessionType: 'chat', shouldCallLLM: true },
      REQUEST_ADJUSTMENT: { sessionType: 'adjustment', shouldCallLLM: true },
      CHAT_MESSAGE: { sessionType: 'chat', shouldCallLLM: true },
      CRISIS_SIGNAL: { sessionType: 'crisis', shouldCallLLM: true },
    };
    return map[action] || { sessionType: 'chat', shouldCallLLM: true };
  }

  async _respondTaskCompleted(userId, payload) {
    const metrics = (await repos.studentMetrics.findByUserId(userId)) || {};
    const task = await repos.task.findById(payload.taskId);
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
    });

    await repos.audit.create({
      user_id: userId,
      action: 'COACH_TASK_COMPLETED_RESPONSE',
      metadata: { task_id: payload.taskId, streak_days: streak },
    });

    return { type: 'message', data: { message, plan: null }, meta: { attempts: [], duration_ms: 0 } };
  }

  async _stageRecommendation(userId, plan, ctx) {
    const goals = await repos.goal.list(userId);
    const activeGoal = goals[0];

    const recId = `rec_${Date.now()}`;
    const tasksWithIds = plan.tasks.map((t, i) => ({
      ...t,
      task_id: `${recId}_task_${i}`,
      status: 'pending',
      decided_at: null,
    }));

    const rec = await repos.aiRec.create({
      user_id: userId,
      goal_id: activeGoal?.id || null,
      type: 'coach_plan',
      input_context: {
        goal: ctx.payload?.goal || {},
        profile: ctx.payload?.profile || {},
      },
      output: {
        summary: plan.summary,
        tasks: tasksWithIds,
      },
      status: 'pending',
    });

    logger.info({ userId, recId: rec.id, taskCount: tasksWithIds.length }, 'Recommendation staged');

    return rec;
  }

  async _persistPlan(userId, plan) {
    if (!plan || !plan.tasks || plan.tasks.length === 0) return;

    const goals = await repos.goal.list(userId);
    const activeGoal = goals[0];
    if (!activeGoal) {
      logger.warn({ userId }, 'No active goal found for plan persistence');
      return;
    }

    const tasksToCreate = plan.tasks.map(t => ({
      goal_id: activeGoal.id,
      title: t.title,
      description: t.description || null,
      duration_estimate: t.duration_estimate,
      planned_date: t.planned_date || null,
      planned_slot: t.planned_slot || null,
      task_type: t.task_type || null,
      rationale: t.rationale || null,
      source: 'coach',
      status: 'todo',
    }));

    await repos.task.createMany(tasksToCreate);
    logger.info({ userId, taskCount: tasksToCreate.length }, 'Plan tasks persisted');
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
          await repos.audit.create({
            user_id: userId,
            action: 'COACH_TASK_COMPLETED',
            metadata: { task_id: payload.taskId, task_title: task.title },
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
          await repos.audit.create({
            user_id: userId,
            action: 'COACH_TASK_SKIPPED',
            metadata: { task_id: payload.taskId, task_title: task.title, reason: payload.reason || 'unspecified' },
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
        await repos.audit.create({
          user_id: userId,
          action: 'COACH_FEEDBACK_SUBMITTED',
          metadata: { task_id: payload.taskId, difficulty: payload.difficulty, focus: payload.focus },
        });
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
        await repos.audit.create({
          user_id: userId,
          action: 'COACH_CHAT_MESSAGE',
          metadata: { message_preview: (payload.message || '').slice(0, 120) },
        });
        break;
      }
      default:
        break;
    }

    if (Object.keys(updates).length > 0 || action === 'COMPLETE_TASK' || action === 'SKIP_TASK' || action === 'SUBMIT_FEEDBACK') {
      try {
        const rolling = await repos.studentMetrics.computeRollingMetrics(userId);
        Object.assign(updates, rolling);
      } catch (err) {
        logger.warn({ err: err.message }, 'Failed to compute rolling metrics');
      }
      await repos.studentMetrics.upsert(userId, updates);
    }
  }

  async _buildContext(userId, sessionType, payload) {
    const user = await repos.user.findById(userId);
    const profile = await repos.profile.findByUserId(userId);
    const goals = await repos.goal.list(userId);
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

    const totalTasks = tasks.length;
    const completedCount = tasks.filter((t) => t.status === 'done' || t.status === 'completed').length;
    let currentLevel = 'beginner';
    if (totalTasks > 0) {
      const ratio = completedCount / totalTasks;
      if (ratio > 0.7) currentLevel = 'advanced';
      else if (ratio > 0.3) currentLevel = 'intermediate';
    }

    let profileGoal = activeGoal.title || '';
    let profileSubjects = activeGoal.description || '';
    let profileDeadline = activeGoal.deadline || null;
    let profileWeeklyHours = profile?.weekly_target_hours || 5;
    let profilePreferredSlots = [profile?.preferred_time || 'morning'];

    if (payload && payload.goal) {
      profileGoal = payload.goal.title || profileGoal;
      profileSubjects = payload.goal.description || profileSubjects;
      profileDeadline = payload.goal.deadline || profileDeadline;
    }
    if (payload && payload.profile) {
      profileWeeklyHours = payload.profile.weekly_target_hours || profileWeeklyHours;
      profilePreferredSlots = payload.profile.preferred_time
        ? [payload.profile.preferred_time]
        : profilePreferredSlots;
    }

    return {
      user,
      profile: {
        goal: profileGoal,
        subjects: profileSubjects,
        current_level: currentLevel,
        weekly_available_hours: profileWeeklyHours,
        preferred_slots: profilePreferredSlots,
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

    const start = Date.now();
    let raw, attempts;
    try {
      const result = await callWithRetry(userMessage, {
        maxRetries: 2,
        label: `coach.${ctx.sessionType}`,
        timeoutMs: isChat ? 45000 : 90000,
      });
      raw = result.content;
      attempts = result.attempts || [];
    } catch (err) {
      logger.error({ err: err.message }, 'Coach LLM call failed after retries');
      aiRequestCount.inc({ type: `coach.${ctx.sessionType}`, status: 'error' });
      const meta = { attempts: err.attempts || [], duration_ms: Date.now() - start };
      if (isChat) {
        return { message: 'Maaf, saya sedang mengalami gangguan. Coba lagi sebentar.', plan: null, _meta: meta };
      }
      err._meta = meta;
      throw err;
    }

    const durationMs = Date.now() - start;
    const validated = isChat ? validateChatOutput(raw) : validateAIOutput(raw);
    validated._meta = { attempts, duration_ms: durationMs };
    return validated;
  }
}

module.exports = new CoachRouterService();
