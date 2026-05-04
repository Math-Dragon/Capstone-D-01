const repos = require('../repositories');

class ProgressService {
  async getStats(userId) {
    const tasks = await repos.task.listByUser(userId);
    const completed = tasks.filter((t) => t.status === 'done' || t.status === 'completed');
    const total = tasks.length;
    const totalMin = tasks.reduce((s, t) => s + (t.duration_estimate || 0), 0);
    const completedMin = completed.reduce((s, t) => s + (t.duration_estimate || 0), 0);

    const difficultyValues = tasks
      .filter((t) => t.feedback_difficulty != null)
      .map((t) => t.feedback_difficulty);
    const avgDifficulty = difficultyValues.length > 0
      ? difficultyValues.reduce((a, b) => a + b, 0) / difficultyValues.length
      : null;

    const metrics = await repos.studentMetrics.findByUserId(userId);

    return {
      totalTasks: total,
      completedTasks: completed.length,
      totalMinutes: totalMin,
      completedMinutes: completedMin,
      completionRate: total > 0 ? completed.length / total : 0,
      avgDifficulty,
      streakDays: metrics?.streak_days || 0,
      summary: null,
      adaptationNotes: metrics?.last_mood || null,
    };
  }

  async getWeekly(userId, week) {
    return repos.progress.findByUserAndWeek(userId, week);
  }

  async getTrend(userId, params = {}) {
    return repos.progress.listTrend(userId, params);
  }
}

module.exports = new ProgressService();
