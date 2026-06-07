const repos = require('../repositories');
const { VALID_TRANSITIONS } = require('../models/task.model');

class TaskService {
  async list(userId, filters = {}) {
    return repos.task.listByUser(userId, filters);
  }

  async create(userId, data) {
    const goal = await repos.goal.findByIdAndUserId(data.goal_id, userId);
    if (!goal) {
      const err = new Error('Goal not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return repos.task.create({
      ...data,
      source: 'manual',
    });
  }

  async getById(userId, taskId) {
    const task = await repos.task.findByIdAndUser(taskId, userId);
    if (!task) {
      const err = new Error('Task not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return task;
  }

  async update(userId, taskId, data) {
    const original = await this.getById(userId, taskId);

    const updateData = { ...data };
    const statusChanged = data.status && data.status !== original.status;

    if (statusChanged && !VALID_TRANSITIONS[original.status]?.includes(data.status)) {
      const err = new Error(`Transition from '${original.status}' to '${data.status}' is not allowed`);
      err.statusCode = 400;
      err.code = 'INVALID_TRANSITION';
      throw err;
    }

    if (data.status === 'done' && original.status !== 'done') {
      updateData.completed_at = new Date();
    }
    if (data.status && data.status !== 'done') {
      updateData.completed_at = null;
    }

    const updated = await repos.task.update(taskId, updateData);

    if (statusChanged && (data.status === 'done' || original.status === 'done')) {
      await this.recalculateProgress(userId, updated);
    }

    return updated;
  }

  async updateStatus(userId, taskId, status, { actual_duration, skip_reason } = {}) {
    const original = await this.getById(userId, taskId);

    if (!VALID_TRANSITIONS[original.status]?.includes(status)) {
      const err = new Error(`Transition from '${original.status}' to '${status}' is not allowed`);
      err.statusCode = 400;
      err.code = 'INVALID_TRANSITION';
      throw err;
    }

    const updateData = { status };

    if (status === 'done') {
      updateData.completed_at = new Date();
      updateData.actual_duration = actual_duration ?? original.duration_estimate;
    } else if (status === 'skipped') {
      updateData.completed_at = null;
      if (skip_reason) updateData.skip_reason = skip_reason;
    } else {
      updateData.completed_at = null;
    }

    const updated = await repos.task.update(taskId, updateData);

    const metrics = {};

    if (status === 'done') {
      const current = await repos.studentMetrics.findByUserId(userId);
      metrics.streak_days = (current?.streak_days || 0) + 1;
      metrics.total_completed = (current?.total_completed || 0) + 1;
      metrics.consecutive_skips = 0;
    } else if (status === 'skipped') {
      const current = await repos.studentMetrics.findByUserId(userId);
      metrics.total_skipped = (current?.total_skipped || 0) + 1;
      metrics.consecutive_skips = (current?.consecutive_skips || 0) + 1;
    }

    if (Object.keys(metrics).length > 0) {
      try {
        const rolling = await repos.studentMetrics.computeRollingMetrics(userId);
        Object.assign(metrics, rolling);
      } catch (err) {
        const logger = require('../utils/logger');
        logger.warn({ err: err.message }, 'Failed to compute rolling metrics');
      }
      await repos.studentMetrics.upsert(userId, metrics);
    }

    if (updated.planned_date) {
      await this.recalculateProgress(userId, updated);
    }

    return updated;
  }

  async reschedule(userId, taskId, data) {
    const original = await this.getById(userId, taskId);
    const updated = await repos.task.update(taskId, {
      planned_date: data.planned_date,
      planned_slot: data.planned_slot,
      completed_at: original.status === 'done' ? original.completed_at : null,
    });

    if (updated.planned_date) {
      await this.recalculateProgress(userId, updated);
    }

    return updated;
  }

  async delete(userId, taskId) {
    await this.getById(userId, taskId);
    await repos.task.remove(taskId, userId);
    return true;
  }

  async recalculateProgress(userId, task) {
    if (!task.planned_date) return;
    const week = getISOWeek(task.planned_date);

    const tasks = await repos.task.findByUserAndWeek(userId, week);

    const planned = tasks.reduce((s, t) => s + (t.duration_estimate || 0), 0);
    const completed = tasks
      .filter(t => t.status === 'done')
      .reduce((s, t) => s + (t.actual_duration != null ? t.actual_duration : t.duration_estimate || 0), 0);

    const rate = planned > 0 ? parseFloat((completed / planned).toFixed(2)) : 0;

    await repos.progress.upsert({
      user_id: userId,
      week,
      planned_hours: parseFloat((planned / 60).toFixed(1)),
      completed_hours: parseFloat((completed / 60).toFixed(1)),
      completion_rate: rate,
    });
  }
}

function getISOWeek(date) {
  const tmp = new Date(date);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const year = tmp.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

module.exports = new TaskService();
