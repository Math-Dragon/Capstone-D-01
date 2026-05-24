exports.up = (pgm) => {
  pgm.addColumns('users', {
    google_id: { type: 'varchar(255)', unique: true },
    github_id: { type: 'varchar(255)', unique: true }
  });
  pgm.alterColumn('users', 'password_hash', { allowNull: true });
};

exports.down = (pgm) => {
  pgm.alterColumn('users', 'password_hash', { allowNull: false });
  pgm.dropColumns('users', ['google_id', 'github_id']);
};
