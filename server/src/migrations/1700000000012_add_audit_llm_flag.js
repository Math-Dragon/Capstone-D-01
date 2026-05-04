exports.up = (pgm) => {
  pgm.addColumns('audit_logs', {
    involves_llm: { type: 'boolean', notNull: true, default: false }
  });
  pgm.createIndex('audit_logs', 'involves_llm', {
    name: 'audit_logs_involves_llm',
    where: 'involves_llm = true',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('audit_logs', 'involves_llm', { name: 'audit_logs_involves_llm' });
  pgm.dropColumns('audit_logs', ['involves_llm']);
};
