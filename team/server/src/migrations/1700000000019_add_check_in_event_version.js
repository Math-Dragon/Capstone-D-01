'use strict';

// check_in_events: add an integer version column backing optimistic locking
// for PATCH /history/:id. Integer comparison avoids the ms/µs precision
// mismatch of timestamp-based checks (Postgres stores µs, JS Dates carry ms).
module.exports = {
  async up(pgm) {
    pgm.addColumns('check_in_events', {
      version: { type: 'integer', notNull: true, default: 0 },
    });
  },

  async down(pgm) {
    pgm.dropColumns('check_in_events', ['version']);
  },
};
