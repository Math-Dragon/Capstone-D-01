'use strict';

module.exports = {
  async up(pgm) {
    pgm.addColumn('tasks', {
      task_type: { type: 'varchar(20)' },
    });
  },

  async down(pgm) {
    pgm.dropColumn('tasks', 'task_type', { ifExists: true });
  },
};
