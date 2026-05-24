'use strict';

module.exports = {
  async up(pgm) {
    pgm.addConstraint('tasks', 'tasks_status_check', {
      check: `status IN ('todo', 'in_progress', 'done')`,
    });
    pgm.addConstraint('tasks', 'tasks_source_check', {
      check: `source IN ('manual', 'ai')`,
    });
    pgm.addConstraint('tasks', 'tasks_planned_slot_check', {
      check: `planned_slot IS NULL OR planned_slot IN ('morning', 'afternoon', 'evening')`,
    });
    pgm.addConstraint('goals', 'goals_status_check', {
      check: `status IN ('active', 'completed', 'archived')`,
    });
    pgm.addConstraint('ai_recommendations', 'ai_recommendations_status_check', {
      check: `status IN ('pending', 'accepted', 'rejected')`,
    });
    pgm.addConstraint('profiles', 'profiles_preferred_time_check', {
      check: `preferred_time IN ('morning', 'afternoon', 'evening')`,
    });
  },

  async down(pgm) {
    pgm.dropConstraint('profiles', 'profiles_preferred_time_check');
    pgm.dropConstraint('ai_recommendations', 'ai_recommendations_status_check');
    pgm.dropConstraint('goals', 'goals_status_check');
    pgm.dropConstraint('tasks', 'tasks_planned_slot_check');
    pgm.dropConstraint('tasks', 'tasks_source_check');
    pgm.dropConstraint('tasks', 'tasks_status_check');
  },
};
