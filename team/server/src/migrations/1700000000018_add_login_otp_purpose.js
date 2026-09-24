'use strict';

// otp_challenges carries a CHECK constraint from migration 16 restricting purpose to
// ('password_reset', 'phone_verify'). Passwordless login introduces purpose='login',
// which the DB rejects until this constraint is widened.
exports.up = async (pgm) => {
  pgm.dropConstraint('otp_challenges', 'otp_challenges_purpose_check');
  pgm.addConstraint('otp_challenges', 'otp_challenges_purpose_check', {
    check: "purpose IN ('password_reset', 'phone_verify', 'login')",
  });
};

exports.down = async (pgm) => {
  pgm.dropConstraint('otp_challenges', 'otp_challenges_purpose_check');
  pgm.addConstraint('otp_challenges', 'otp_challenges_purpose_check', {
    check: "purpose IN ('password_reset', 'phone_verify')",
  });
};
