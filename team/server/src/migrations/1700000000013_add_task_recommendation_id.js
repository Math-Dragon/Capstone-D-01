'use strict';

exports.up = async (pgm) => {
  pgm.addColumns('tasks', {
    recommendation_id: {
      type: 'uuid',
      references: 'ai_recommendations',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('tasks', 'recommendation_id', {
    name: 'tasks_recommendation_id_idx',
  });
};

exports.down = async (pgm) => {
  pgm.dropIndex('tasks', 'recommendation_id', {
    name: 'tasks_recommendation_id_idx',
  });
  pgm.dropColumns('tasks', ['recommendation_id']);
};
