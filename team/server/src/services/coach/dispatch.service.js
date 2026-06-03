const db = require('../../db');
const repos = require('../../repositories');
const logger = require('../../utils/logger');
const { aiRequestCount, recordAIUsage } = require('../../utils/metrics');
const { scheduleTasks } = require('../scheduler.service');
const gate = require('./gate.service');
const staticResponse = require('./static-response.service');
const contextBuilder = require('./context-builder.service');
const llmPipeline = require('./llm-pipeline.service');
const responseFormatter = require('./response-formatter.service');
const adaptationTrigger = require('../adaptation-trigger.service');

class DispatchService {
  async dispatch(userId, action, payload) {
    const { sessionType: resolvedSessionType } = this._resolveAction(action);
    let sessionType = resolvedSessionType;
    const sessionId = payload?.session_id || null;

    const taskActions = ['COMPLETE_TASK', 'SKIP_TASK', 'SUBMIT_FEEDBACK'];
    const isTaskAction = taskActions.includes(action);

    if (!isTaskAction) {
      await this._updateState(userId, action, payload, sessionId);
    }

    if (action === 'ACCEPT_PROPOSAL') {
      return responseFormatter.acceptProposal(userId, payload, sessionId);
    }

    if (action === 'UNDO_PLAN') {
      return responseFormatter.undoPlan(userId, sessionId);
    }

    if (isTaskAction && payload?.taskId) {
      const task = await repos.task.findByIdAndUser(payload.taskId, userId);
      payload = { ...payload, action, taskTitle: task?.title || 'Unknown' };
    }

    let triggerFired = null;

    if (action === 'SKIP_TASK') {
      await this._updateState(userId, action, payload, sessionId);
      return staticResponse.respondSkip(userId, payload, sessionId);
    }

    if (action === 'COMPLETE_TASK' || action === 'SUBMIT_FEEDBACK') {
      const metrics = (await repos.studentMetrics.findByUserId(userId)) || {};
      const gateResult = gate.evaluateGate(action, metrics, payload);
      if (gateResult.staticOnly) {
        await this._updateState(userId, action, payload, sessionId);
        if (action === 'COMPLETE_TASK') {
          return staticResponse.respondTaskCompleted(userId, payload, sessionId);
        }
        return staticResponse.respondFeedback(userId, payload, sessionId);
      }
      triggerFired = gateResult.triggerFired;
      if (gateResult.sessionTypeOverride) {
        sessionType = gateResult.sessionTypeOverride;
      }
    }

    if (action === 'CHECK_IN') {
      const metrics = (await repos.studentMetrics.findByUserId(userId)) || {};
      return staticResponse.respondCheckIn(userId, payload, sessionId, metrics);
    }

    const ctx = await contextBuilder.buildContext(userId, sessionType, payload);

    if (!triggerFired && isTaskAction) {
      triggerFired = adaptationTrigger.evaluate(ctx.metrics);
    }

    const effectiveSessionType = triggerFired ? triggerFired.sessionType : sessionType;
    ctx.sessionType = effectiveSessionType;

    const usesChatSchema = effectiveSessionType === 'chat' || effectiveSessionType === 'task_action';
    let validated, llmMeta, violations;

    try {
      const result = await llmPipeline.callLLM(ctx, usesChatSchema);
      validated = result.validated;
      llmMeta = result.llmMeta;
      violations = result.violations || null;
    } catch (err) {
      if (err._llmMeta) {
        const meta = err._llmMeta;
        delete err._llmMeta;
        err._meta = meta;
      }
      await repos.audit.create({
        user_id: userId,
        action: 'COACH_LLM_ERROR',
        metadata: {
          session_type: effectiveSessionType,
          trigger_action: isTaskAction ? action : undefined,
          error: err.message,
          attempts: err._meta?.attempts || [],
        },
        session_id: sessionId,
        involves_llm: true,
      });
      throw err;
    }

    if (triggerFired && ctx.metrics.trigger_cooldowns) {
      const updatedCooldowns = adaptationTrigger.recordCooldown(
        ctx.metrics.trigger_cooldowns,
        triggerFired.id
      );
      await repos.studentMetrics.upsert(userId, { trigger_cooldowns: updatedCooldowns });
    }

    if (isTaskAction) {
      await this._updateState(userId, action, payload, sessionId);
    }

    if (validated && !violations) {
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

    const usageMeta = this._llmUsageMeta(llmMeta);
    if (usageMeta) {
      recordAIUsage({
        type: `coach.${effectiveSessionType}`,
        status: 'success',
        provider: usageMeta.provider,
        model: usageMeta.model,
        promptTokens: usageMeta.prompt_tokens,
        completionTokens: usageMeta.completion_tokens,
        totalTokens: usageMeta.total_tokens,
        latencyMs: usageMeta.latency_ms,
      });
    } else {
      aiRequestCount.inc({ type: `coach.${effectiveSessionType}`, status: 'success' });
    }

    if (effectiveSessionType === 'task_action') {
      const message = validated.message || 'Tindakan dicatat.';

      if (validated.plan) {
        await responseFormatter.persistPlan(userId, validated.plan);
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
        action: 'COACH_LLM_CALL',
        metadata: {
          session_type: effectiveSessionType,
          trigger_action: payload.action,
          message_preview: message.slice(0, 120),
          has_plan_adjustment: !!validated.plan,
          llm: this._llmUsageMeta(llmMeta),
        },
        session_id: sessionId,
        involves_llm: true,
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
        action: 'COACH_LLM_CALL',
        metadata: {
          session_type: effectiveSessionType,
          message_preview: message.slice(0, 120),
          has_plan_adjustment: !!validated.plan,
          llm: this._llmUsageMeta(llmMeta),
        },
        session_id: sessionId,
        involves_llm: true,
      });

      if (validated.plan) {
        await responseFormatter.persistPlan(userId, validated.plan);
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
      const rec = await responseFormatter.stageRecommendation(userId, validated, ctx);
      const responseData = {
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
      };

      if (violations) {
        responseData.violations = violations.map((v) => {
          const segs = v.path.split('.');
          const taskIndex = parseInt(segs[1], 10);
          const task = rec.output.tasks[taskIndex];
          return {
            task_id: task?.task_id || `index_${taskIndex}`,
            field: segs.slice(2).join('.'),
            value: v.value,
            constraint: v.constraint,
            message: v.message,
          };
        });
        rec.output.violations = violations;
        await repos.aiRec.updateOutput(rec.id, rec.output);
      }

      return {
        type: 'recommendation',
        data: responseData,
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

    await responseFormatter.persistPlan(userId, validated);

    if (validated && validated.tasks) {
      await repos.audit.create({
        user_id: userId,
        action: 'COACH_LLM_CALL',
        metadata: {
          session_type: effectiveSessionType,
          task_count: validated.tasks.length,
          summary: validated.summary,
          llm: this._llmUsageMeta(llmMeta),
        },
        session_id: sessionId,
        involves_llm: true,
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

  async decideTask(userId, recId, taskId, decision, sessionId, overrides) {
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

      if (decision === 'accepted' && overrides) {
        if (overrides.duration_estimate !== undefined) {
          task.duration_estimate = overrides.duration_estimate;
        }
      }

      const allDecided = tasks.every((t) => t.status !== 'pending');

      if (allDecided && tasks.some((t) => t.status === 'accepted')) {
        const trimmed = this._sweepExcessTasks(rec);
        rec.output.trimmed = trimmed.length > 0 ? trimmed : undefined;
      }

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

      const trimmed = rec.output.trimmed;
      return {
        task_id: taskId,
        status: decision,
        allDecided,
        trimmed: allDecided && trimmed && trimmed.length > 0 ? trimmed : undefined,
      };
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

  _sweepExcessTasks(rec) {
    const tasks = rec.output.tasks.filter(t => t.status === 'accepted');
    if (tasks.length === 0) return [];

    const inputContext = rec.input_context || {};
    const profile = inputContext.profile || {};
    const weeklyTargetHours = profile.weekly_target_hours || 5;
    const maxMinutes = Math.round(weeklyTargetHours * 60 * 1.2);

    const sorted = [...tasks].sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return (p[a.priority] || 1) - (p[b.priority] || 1);
    });

    let totalMin = sorted.reduce((s, t) => s + (t.duration_estimate || 0), 0);
    const trimmed = [];

    while (totalMin > maxMinutes && sorted.length > 1) {
      const removed = sorted.pop();
      totalMin -= removed.duration_estimate || 0;
      trimmed.push(removed.task_id);
      removed.status = 'rejected_by_truncation';
    }

    return trimmed;
  }

  _llmUsageMeta(llmMeta) {
    if (!llmMeta || !llmMeta.attempts || llmMeta.attempts.length === 0) return undefined;
    const success = llmMeta.attempts.find(a => a.status === 'success');
    if (!success || !success.usage) return undefined;
    return {
      provider: success.source,
      model: success.model || 'unknown',
      prompt_tokens: success.usage.prompt_tokens,
      completion_tokens: success.usage.completion_tokens,
      total_tokens: success.usage.total_tokens,
      latency_ms: success.duration_ms,
    };
  }
}

module.exports = DispatchService;
