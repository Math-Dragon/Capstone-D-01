const repos = require('../repositories');
const { getISOWeek } = require('../utils/week');

class ExportService {
  async getWeeklyExport(userId, weekStart) {
    const [y, m, d] = weekStart.split('-').map(Number);
    const end = new Date(Date.UTC(y, m - 1, d + 6));
    const weekEndStr = end.toISOString().split('T')[0];

    const tasks = await repos.task.findByUserAndDateRange(userId, weekStart, weekEndStr);
    const week = getISOWeek(weekStart);
    const progress = await repos.progress.findByUserAndWeek(userId, week);

    return {
      week: weekStart,
      summary: {
        planned_hours: progress?.planned_hours || 0,
        completed_hours: progress?.completed_hours || 0,
        completion_rate: progress?.completion_rate || 0,
      },
      tasks,
      exported_at: new Date().toISOString(),
    };
  }
}

module.exports = new ExportService();
