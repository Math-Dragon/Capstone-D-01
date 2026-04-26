'use strict';

module.exports = {
  async up(pgm) {
    pgm.dropConstraint('tasks', 'tasks_source_check');
    pgm.addConstraint('tasks', 'tasks_source_check', {
      check: `source IN ('manual', 'ai', 'coach')`,
    });

    pgm.dropConstraint('tasks', 'tasks_status_check');
    pgm.addConstraint('tasks', 'tasks_status_check', {
      check: `status IN ('todo', 'in_progress', 'done', 'completed', 'skipped')`,
    });
  },

  async down(pgm) {
    pgm.dropConstraint('tasks', 'tasks_status_check');
    pgm.addConstraint('tasks', 'tasks_status_check', {
      check: `status IN ('todo', 'in_progress', 'done')`,
    });

    pgm.dropConstraint('tasks', 'tasks_source_check');
    pgm.addConstraint('tasks', 'tasks_source_check', {
      check: `source IN ('manual', 'ai')`,
    });
  },
};
