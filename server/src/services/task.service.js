const repos = require('../repositories');

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

    if (data.status === 'done' && original.status !== 'done') {
      updateData.completed_at = new Date();
    }
    if (data.status && data.status !== 'done') {
      updateData.completed_at = null;
    }

    const updated = await repos.task.update(taskId, updateData);

    const statusChanged = data.status && data.status !== original.status;
    if (statusChanged && (data.status === 'done' || original.status === 'done')) {
      await this.recalculateProgress(userId, updated);
    }

    return updated;
  }

  async delete(userId, taskId) {
    await this.getById(userId, taskId);
    await repos.task.remove(taskId);
    return true;
  }

  async recalculateProgress(userId, task) {
    if (!task.planned_date) return;
    const week = getISOWeek(task.planned_date);

    const tasks = await repos.task.findByUserAndWeek(userId, week);

    const planned = tasks.reduce((s, t) => s + (t.duration_estimate || 0), 0);
    const completed = tasks
      .filter(t => t.status === 'done')
      .reduce((s, t) => s + (t.actual_duration || t.duration_estimate || 0), 0);

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
