exports.up = async (pgm) => {
  pgm.addColumn('tasks', {
    task_type: { type: 'varchar(20)' },
  });
};

exports.down = async (pgm) => {
  pgm.dropColumn('tasks', 'task_type', { ifExists: true });
};
