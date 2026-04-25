const repos = require('../repositories');

class ProgressService {
  async getWeekly(userId, week) {
    return repos.progress.findByUserAndWeek(userId, week);
  }

  async getTrend(userId, params = {}) {
    return repos.progress.listTrend(userId, params);
  }
}

module.exports = new ProgressService();
