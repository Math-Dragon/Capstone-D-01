const repos = require('../repositories');

class GoalService {
  async list(userId, filters = {}) {
    const goals = await repos.goal.list(userId, filters);
    for (const g of goals) g.tasks = [];
    return goals;
  }

  async create(userId, data) {
    return repos.goal.create({ user_id: userId, ...data });
  }

  async getById(userId, goalId) {
    const goal = await repos.goal.findByIdAndUserId(goalId, userId);
    if (!goal) {
      const err = new Error('Goal not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    goal.tasks = await repos.task.findByGoalId(goalId);
    return goal;
  }

  async update(userId, goalId, data) {
    await this.getById(userId, goalId);
    return repos.goal.update(goalId, userId, data);
  }

  async delete(userId, goalId) {
    await this.getById(userId, goalId);
    await repos.goal.remove(goalId);
    return true;
  }
}

module.exports = new GoalService();
