'use strict';

exports.up = async (pgm) => {
  pgm.addColumns('goals', {
    difficulty: { type: 'varchar(20)', notNull: true, default: 'medium' },
  });

  pgm.addConstraint('goals', 'goals_difficulty_check', {
    check: "difficulty IN ('easy', 'medium', 'hard', 'expert')",
  });
};

exports.down = async (pgm) => {
  pgm.dropConstraint('goals', 'goals_difficulty_check');
  pgm.dropColumns('goals', ['difficulty']);
};
