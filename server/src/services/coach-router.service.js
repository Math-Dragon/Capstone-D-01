const db = require('../db');
const repos = require('../repositories');
const { validateAIOutput, validateChatOutput } = require('./llm');
const { generateMockSuggestion, generateMockChat, generateMockTaskAction } = require('./llm-mock');
const { isMock, callWithRetry } = require('./llm-client');
const { scheduleTasks } = require('./scheduler.service');
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
    `Available days: ${(ctx.profile.available_days || ['mon', 'tue', 'wed', 'thu', 'fri']).join(', ')}\n` +
    `Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
    'Generate a personalized study plan for this student. Follow the output structure exactly.',

  task_action: (ctx) => {
    let body = '[session_type: task_action]\n\n';
    if (ctx.payload.action === 'COMPLETE_TASK') {
      body += `Student completed task "${ctx.payload.taskTitle || 'unknown'}"\n`;
      body += 'This completion may signal progress worth acknowledging or adjusting for.\n\n';
    } else if (ctx.payload.reason !== undefined) {
      body += `Student skipped task "${ctx.payload.taskTitle || 'unknown'}" with reason: ${ctx.payload.reason}`;
      if (ctx.payload.note) body += `\nNote: ${ctx.payload.note}`;
      body += '\n\n';
    } else if (ctx.payload.difficulty !== undefined) {
      body += `Student submitted feedback on task "${ctx.payload.taskTitle || 'unknown'}"` +
        `\n- Difficulty: ${ctx.payload.difficulty}/5` +
        `\n- Focus: ${ctx.payload.focus}/5`;
      if (ctx.payload.notes) body += `\n- Notes: ${ctx.payload.notes}`;
      body += '\n\n';
    }
    body += `Current plan:\n${ctx.remainingTasksJson}\n\n` +
      'Student metrics:\n' +
      `- Streak: ${ctx.metrics.streak_days} days\n` +
      `- Completion rate (7d): ${Math.round((ctx.metrics.completion_rate_7d || 0) * 100)}%\n` +
      `- Consecutive skips: ${ctx.metrics.consecutive_skips}\n\n` +
      `Available days: ${(ctx.profile.available_days || ['mon', 'tue', 'wed', 'thu', 'fri']).join(', ')}\n` +
      `Weekly target hours: ${ctx.profile.weekly_available_hours}\n` +
      `Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
      'Respond with a brief acknowledgment (1-2 sentences) in the "message" field. If the plan needs adjustment based on this student action, provide the updated plan in the "plan" field. If no adjustment is needed, set "plan" to null. Keep the message concise and actionable. Do NOT include chat history.';
    return body;
  },

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
    `Available days: ${(ctx.profile.available_days || ['mon', 'tue', 'wed', 'thu', 'fri']).join(', ')}\n` +
    `Weekly target hours: ${ctx.profile.weekly_available_hours}\n` +
    `Preferred slots: ${ctx.profile.preferred_slots}\n` +
    `Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
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
      `Available days: ${(ctx.profile.available_days || ['mon', 'tue', 'wed', 'thu', 'fri']).join(', ')}\n` +
      `Weekly target hours: ${ctx.profile.weekly_available_hours}\n` +
      `Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
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
    `Available days: ${(ctx.profile.available_days || ['mon', 'tue', 'wed', 'thu', 'fri']).join(', ')}\n` +
    `Weekly target hours: ${ctx.profile.weekly_available_hours}\n` +
    `Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
    'This student may be overwhelmed. Reduce the plan. Focus on highest-impact tasks only. Be empathetic.',

  milestone: (ctx) =>
    '[session_type: milestone]\n\n' +
    'The student has completed all tasks in their current cycle!\n\n' +
    `Completed: ${ctx.metrics.total_completed} tasks\n` +
    `Streak: ${ctx.metrics.streak_days} days\n\n` +
    'Student profile:\n' +
    `- Goal: ${ctx.profile.goal}\n` +
    `- Weekly hours: ${ctx.profile.weekly_available_hours}\n` +
    `- Available days: ${(ctx.profile.available_days || ['mon', 'tue', 'wed', 'thu', 'fri']).join(', ')}\n` +
    `- Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
    'Generate the next phase. Increase difficulty by 10-15%. Acknowledge the achievement.',
};



class CoachRouterService {
  async dispatch(userId, action, payload) {
    const { sessionType } = this._resolveAction(action);
    const sessionId = payload?.session_id || null;

    const taskActions = ['COMPLETE_TASK', 'SKIP_TASK', 'SUBMIT_FEEDBACK'];
    const isTaskAction = taskActions.includes(action);

    // Non-destructive state updates (CHECK_IN, CHAT_MESSAGE) run before LLM
    if (!isTaskAction) {
      await this._updateState(userId, action, payload, sessionId);
    }

    if (action === 'ACCEPT_PROPOSAL') {
      return this._acceptProposal(userId, payload, sessionId);
    }

    if (action === 'UNDO_PLAN') {
      return this._undoPlan(userId, sessionId);
    }

    if (isTaskAction && payload?.taskId) {
      const task = await repos.task.findByIdAndUser(payload.taskId, userId);
      payload = { ...payload, action, taskTitle: task?.title || 'Unknown' };
    }

    let triggerFired = null;

    if (action === 'COMPLETE_TASK') {
      const metrics = (await repos.studentMetrics.findByUserId(userId)) || {};
      const ctTrigger = adaptationTrigger.evaluate(metrics);
      if (!ctTrigger) {
        // No LLM in this path — safe to mutate state before responding
        await this._updateState(userId, action, payload, sessionId);
        return this._respondTaskCompleted(userId, payload, sessionId);
      }
      triggerFired = ctTrigger;
    }

    const ctx = await this._buildContext(userId, sessionType, payload);

    // Only evaluate trigger override for task actions (not for CHAT_MESSAGE or other session types)
    if (!triggerFired && isTaskAction) {
      triggerFired = adaptationTrigger.evaluate(ctx.metrics);
    }

    const effectiveSessionType = triggerFired ? triggerFired.sessionType : sessionType;
    ctx.sessionType = effectiveSessionType;

    const usesChatSchema = effectiveSessionType === 'chat' || effectiveSessionType === 'task_action';
    const isTaskActionSession = effectiveSessionType === 'task_action';
    let validated, llmMeta;

    if (isMock) {
      if (isTaskActionSession) {
        validated = generateMockTaskAction(ctx);
      } else if (usesChatSchema) {
        validated = generateMockChat(ctx);
      } else {
        validated = generateMockSuggestion(ctx);
      }
      llmMeta = { attempts: [], duration_ms: 0 };
    } else {
      validated = await this._callLLMWithRetry(ctx, usesChatSchema);
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

    // Deferred state mutation: run AFTER LLM success to avoid S-C5 (task done before LLM validation)
    if (isTaskAction) {
      await this._updateState(userId, action, payload, sessionId);
    }

    if (validated) {
      const tasksToSchedule = usesChatSchema ? validated.plan?.tasks : validated.tasks;
      if (tasksToSchedule && tasksToSchedule.length > 0) {
        const scheduled = scheduleTasks(tasksToSchedule, {
          availableDays: ctx.profile.available_days,
          weeklyTargetHours: ctx.profile.weekly_available_hours,
          deadline: ctx.profile.deadline,
          preferredSlot: ctx.profile.preferred_slots?.[0],
        });
        if (usesChatSchema) {
          validated.plan.tasks = scheduled;
        } else {
          validated.tasks = scheduled;
        }
      }
    }

    aiRequestCount.inc({ type: `coach.${effectiveSessionType}`, status: 'success' });

    if (effectiveSessionType === 'task_action') {
      const message = validated.message || 'Tindakan dicatat.';

      if (validated.plan) {
        await this._persistPlan(userId, validated.plan);
      }

      await repos.chatMessage.create({
        user_id: userId,
        role: 'coach',
        content: message,
        plan_snapshot_summary: validated.plan ? validated.plan.summary : null,
        session_type: effectiveSessionType,
        session_id: sessionId,
      });

      await repos.audit.create({
        user_id: userId,
        action: 'COACH_TASK_ACTION_RESPONDED',
        metadata: {
          session_type: effectiveSessionType,
          action: payload.action,
          message_preview: message.slice(0, 120),
          has_plan_adjustment: !!validated.plan,
        },
        session_id: sessionId,
      });

      return {
        type: 'task_action',
        data: { message, plan: validated.plan || null },
        adaptationType: triggerFired ? triggerFired.sessionType : null,
        triggerId: triggerFired ? triggerFired.id : null,
        meta: llmMeta,
      };
    }

    if (effectiveSessionType === 'chat') {
      const message = validated.message || 'Rencana belajarmu telah diperbarui.';
      await repos.chatMessage.create({
        user_id: userId,
        role: 'coach',
        content: message,
        plan_snapshot_summary: validated.plan ? validated.plan.summary : null,
        session_type: effectiveSessionType,
        session_id: sessionId,
      });

      await repos.audit.create({
        user_id: userId,
        action: 'COACH_CHAT_RESPONDED',
        metadata: {
          session_type: effectiveSessionType,
          message_preview: message.slice(0, 120),
          has_plan_adjustment: !!validated.plan,
        },
        session_id: sessionId,
      });

      if (validated.plan) {
        await this._persistPlan(userId, validated.plan);
        return {
          type: 'combined',
          data: { message, plan: validated.plan },
          adaptationType: triggerFired ? triggerFired.sessionType : null,
          triggerId: triggerFired ? triggerFired.id : null,
          meta: llmMeta,
        };
      }
      return { type: 'message', data: { message, plan: null }, meta: llmMeta };
    }

    if (effectiveSessionType === 'initial_plan' && action === 'INITIAL_PLAN') {
      const rec = await this._stageRecommendation(userId, validated, ctx);

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

    if (['crisis', 'milestone', 'adjustment'].includes(effectiveSessionType)) {
      const synthesizedMessage = validated.adaptation_notes || validated.summary || 'Rencana telah disesuaikan.';
      await repos.chatMessage.create({
        user_id: userId,
        role: 'coach',
        content: synthesizedMessage,
        plan_snapshot_summary: validated.summary || null,
        session_type: effectiveSessionType,
        session_id: sessionId,
      });
    }

    if (triggerFired && ['milestone', 'adjustment'].includes(effectiveSessionType)) {
      const activeTasks = await repos.task.findActiveByUser(userId);
      if (activeTasks.length > 0) {
        await repos.planSnapshot.create({
          user_id: userId,
          trigger_id: triggerFired.id,
          adaptation_type: effectiveSessionType,
          tasks_snapshot: activeTasks,
          plan_summary: validated.summary || null,
        });
      }
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
        session_id: sessionId,
      });
    }

    return {
      type: 'plan',
      data: validated,
      adaptationType: triggerFired ? triggerFired.sessionType : null,
      triggerId: triggerFired ? triggerFired.id : null,
      meta: llmMeta,
    };
  }

  async decideTask(userId, recId, taskId, decision, sessionId) {
    return db.withTransaction(async (client) => {
      const rec = await repos.aiRec.findByIdAndUserId(recId, userId, client);
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

      await repos.aiRec.updateOutput(recId, rec.output, client);

      if (allDecided) {
        const newStatus = tasks.some((t) => t.status === 'accepted') ? 'accepted' : 'rejected';
        await repos.aiRec.updateStatus(recId, newStatus, client);
      }

      if (decision === 'accepted') {
        let targetGoalId = rec.goal_id;
        if (!targetGoalId) {
          const ctxGoal = rec.input_context?.goal || {};
          const fallbackGoal = await repos.goal.create({
            user_id: userId,
            title: ctxGoal.title || 'Rencana Belajar',
            description: ctxGoal.description || '',
            deadline: ctxGoal.deadline || null,
            status: 'active',
          }, client);
          targetGoalId = fallbackGoal.id;
        }

        await repos.task.create({
          goal_id: targetGoalId,
          title: task.title,
          description: task.description || null,
          duration_estimate: task.duration_estimate,
          planned_date: task.planned_date || null,
          planned_slot: task.planned_slot || null,
          task_type: task.task_type || null,
          rationale: task.rationale || null,
          source: 'coach',
          status: 'todo',
        }, client);

        await repos.audit.create({
          user_id: userId,
          action: 'COACH_TASK_ACCEPTED',
          metadata: { recommendation_id: recId, task_id: taskId },
          session_id: sessionId,
        }, client);
      } else {
        await repos.audit.create({
          user_id: userId,
          action: 'COACH_TASK_REJECTED',
          metadata: { recommendation_id: recId, task_id: taskId },
          session_id: sessionId,
        }, client);
      }

      return { task_id: taskId, status: decision, allDecided };
    });
  }

  async getRecommendationMetrics() {
    try {
      const m = await repos.aiRec.computeAllMetrics();
      const total = m.accepted + m.rejected;
      return {
        ai_tasks_suggested_total: m.suggested,
        ai_tasks_accepted_total: m.accepted,
        ai_tasks_rejected_total: m.rejected,
        ai_tasks_pending_total: m.pending,
        accept_rate: total > 0 ? (m.accepted / total).toFixed(2) : '0.00',
      };
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to compute recommendation metrics');
      return {
        ai_tasks_suggested_total: 0,
        ai_tasks_accepted_total: 0,
        ai_tasks_rejected_total: 0,
        ai_tasks_pending_total: 0,
        accept_rate: '0.00',
      };
    }
  }

  _resolveAction(action) {
    const map = {
      INITIAL_PLAN: { sessionType: 'initial_plan' },
      CHECK_IN: { sessionType: 'check_in' },
      COMPLETE_TASK: { sessionType: 'task_action' },
      SKIP_TASK: { sessionType: 'task_action' },
      MODIFY_TASK: { sessionType: 'adjustment' },
      SUBMIT_FEEDBACK: { sessionType: 'task_action' },
      REQUEST_ADJUSTMENT: { sessionType: 'adjustment' },
      CHAT_MESSAGE: { sessionType: 'chat' },
      CRISIS_SIGNAL: { sessionType: 'crisis' },
      ACCEPT_PROPOSAL: { sessionType: null },
      UNDO_PLAN: { sessionType: null },
    };
    return map[action] || { sessionType: 'chat' };
  }

  async _respondTaskCompleted(userId, payload, sessionId) {
    const metrics = (await repos.studentMetrics.findByUserId(userId)) || {};
    const task = await repos.task.findByIdAndUser(payload.taskId, userId);
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
      session_id: sessionId,
    });

    await repos.audit.create({
      user_id: userId,
      action: 'COACH_TASK_COMPLETED_RESPONSE',
      metadata: { task_id: payload.taskId, streak_days: streak },
      session_id: sessionId,
    });

    return { type: 'message', data: { message, plan: null }, meta: { attempts: [], duration_ms: 0 } };
  }

  async _stageRecommendation(userId, plan, ctx) {
    const goalData = ctx.payload?.goal || {};
    const newGoal = await repos.goal.create({
      user_id: userId,
      title: goalData.title || 'Rencana Belajar',
      description: goalData.description || '',
      deadline: goalData.deadline || null,
      status: 'active',
    });

    const recId = `rec_${Date.now()}`;
    const tasksWithIds = plan.tasks.map((t, i) => ({
      ...t,
      task_id: `${recId}_task_${i}`,
      status: 'pending',
      decided_at: null,
    }));

    const rec = await repos.aiRec.create({
      user_id: userId,
      goal_id: newGoal.id,
      type: 'coach_plan',
      input_context: {
        goal: goalData,
        profile: ctx.payload?.profile || {},
      },
      output: {
        summary: plan.summary,
        tasks: tasksWithIds,
      },
      status: 'pending',
    });

    logger.info({ userId, recId: rec.id, goalId: newGoal.id, taskCount: tasksWithIds.length }, 'Recommendation staged with new goal');

    return rec;
  }

  async _persistPlan(userId, plan, goalId) {
    if (!plan || !plan.tasks || plan.tasks.length === 0) return;

    await db.withTransaction(async (client) => {
      let targetGoalId = goalId;
      if (!targetGoalId) {
        const goals = await repos.goal.list(userId, {}, client);
        const activeGoal = goals[0];
        if (!activeGoal) {
          logger.warn({ userId }, 'No active goal found for plan persistence');
          return;
        }
        targetGoalId = activeGoal.id;
      }

      const tasksToCreate = plan.tasks.map(t => ({
        goal_id: targetGoalId,
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

      await repos.task.createMany(tasksToCreate, client);
    });
    logger.info({ userId, taskCount: plan.tasks.length }, 'Plan tasks persisted');
  }

  async _acceptProposal(userId, payload, sessionId) {
    const plan = payload?.plan;
    if (!plan || !plan.tasks || plan.tasks.length === 0) {
      return { type: 'message', data: { message: 'Tidak ada rencana untuk disimpan.', plan: null }, meta: { attempts: [], duration_ms: 0 } };
    }

    await this._persistPlan(userId, plan);

    await repos.audit.create({
      user_id: userId,
      action: 'COACH_PROPOSAL_ACCEPTED',
      metadata: {
        task_count: plan.tasks.length,
        summary: plan.summary,
      },
      session_id: sessionId,
    });

    return { type: 'accepted', data: { message: 'Rencana berhasil disimpan!', plan }, meta: { attempts: [], duration_ms: 0 } };
  }

  async _undoPlan(userId, sessionId) {
    const snapshot = await repos.planSnapshot.findLatest(userId);
    if (!snapshot) {
      return { type: 'message', data: { message: 'Tidak ada rencana yang bisa dikembalikan.', plan: null }, meta: { attempts: [], duration_ms: 0 } };
    }

    const restoredTaskIds = snapshot.tasks_snapshot.map(t => t.id).filter(Boolean);

    await db.withTransaction(async (client) => {
      const currentTasks = await repos.task.findActiveByUser(userId, client);
      for (const task of currentTasks) {
        if (!restoredTaskIds.includes(task.id)) {
          await repos.task.remove(task.id, userId, client);
        }
      }

      for (const task of snapshot.tasks_snapshot) {
        if (task.id) {
          await repos.task.update(task.id, { status: 'todo' }, client);
        }
      }

      await repos.planSnapshot.remove(snapshot.id, client);

      await repos.audit.create({
        user_id: userId,
        action: 'COACH_PLAN_UNDONE',
        metadata: {
          trigger_id: snapshot.trigger_id,
          adaptation_type: snapshot.adaptation_type,
          restored_task_count: snapshot.tasks_snapshot.length,
        },
        session_id: sessionId,
      }, client);
    });

    return { type: 'message', data: { message: 'Rencana sebelumnya telah dikembalikan.', plan: null }, meta: { attempts: [], duration_ms: 0 } };
  }

  async _updateState(userId, action, payload, sessionId) {
    const metrics = (await repos.studentMetrics.findByUserId(userId)) || {};
    const updates = {};

    switch (action) {
      case 'COMPLETE_TASK': {
        const task = await repos.task.findByIdAndUser(payload.taskId, userId);
        if (task) {
          await repos.task.update(payload.taskId, {
            status: 'done',
            completed_at: new Date().toISOString(),
          });
          await repos.audit.create({
            user_id: userId,
            action: 'COACH_TASK_COMPLETED',
            metadata: { task_id: payload.taskId, task_title: task.title },
            session_id: sessionId,
          });
        }
        updates.streak_days = (metrics.streak_days || 0) + 1;
        updates.total_completed = (metrics.total_completed || 0) + 1;
        updates.consecutive_skips = 0;
        break;
      }
      case 'SKIP_TASK': {
        const task = await repos.task.findByIdAndUser(payload.taskId, userId);
        if (task) {
          await repos.task.update(payload.taskId, {
            status: 'skipped',
            skip_reason: payload.reason || 'unspecified',
          });
          await repos.audit.create({
            user_id: userId,
            action: 'COACH_TASK_SKIPPED',
            metadata: { task_id: payload.taskId, task_title: task.title, reason: payload.reason || 'unspecified' },
            session_id: sessionId,
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
          session_id: sessionId,
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
          session_id: sessionId,
        });
        await repos.audit.create({
          user_id: userId,
          action: 'COACH_CHAT_MESSAGE',
          metadata: { message_preview: (payload.message || '').slice(0, 120) },
          session_id: sessionId,
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

    const consecutiveDrained = await this._checkLastMoodDrained(userId);

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
    let profileAvailableDays = profile?.availability || ['mon', 'tue', 'wed', 'thu', 'fri'];

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

  async _checkLastMoodDrained(userId) {
    try {
      const dbModule = require('../db');
      const result = await dbModule.query(
        'SELECT last_mood, mood_history FROM student_metrics WHERE user_id = $1',
        [userId]
      );
      const row = result.rows[0];
      if (!row || row.last_mood !== 'drained') return 0;
      if (Array.isArray(row.mood_history)) {
        let count = 1;
        for (let i = row.mood_history.length - 1; i >= 0; i--) {
          if (row.mood_history[i] === 'drained') count++;
          else break;
        }
        return count;
      }
      return 1;
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
