'use strict';

module.exports = {
  async up(pgm) {
    pgm.addColumn('goals', {
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });
    pgm.addColumn('tasks', {
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });
    pgm.addColumn('profiles', {
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });
    pgm.addColumn('ai_recommendations', {
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });
  },

  async down(pgm) {
    pgm.dropColumn('ai_recommendations', 'updated_at');
    pgm.dropColumn('profiles', 'updated_at');
    pgm.dropColumn('tasks', 'updated_at');
    pgm.dropColumn('goals', 'updated_at');
  },
};
