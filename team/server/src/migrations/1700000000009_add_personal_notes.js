exports.up = async (pgm) => {
  pgm.addColumn('tasks', {
    personal_notes: { type: 'text' },
  });
};

exports.down = async (pgm) => {
  pgm.dropColumn('tasks', 'personal_notes');
};
