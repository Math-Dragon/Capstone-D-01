const db = require('../db');

async function upsertForUser(userId, { url, events, secret }, client) {
  const result = await db.query(
    `INSERT INTO webhook_subscriptions (user_id, target_url, events, signing_secret, status)
     VALUES ($1, $2, $3::jsonb, $4, 'active')
     ON CONFLICT (user_id, target_url)
     DO UPDATE SET
       events = EXCLUDED.events,
       signing_secret = EXCLUDED.signing_secret,
       status = 'active',
       updated_at = NOW()
     RETURNING *`,
    [userId, url, JSON.stringify(events), secret || null],
    client
  );
  return result.rows[0];
}

async function findActiveByEvent(userId, eventName, client) {
  const result = await db.query(
    `SELECT * FROM webhook_subscriptions
     WHERE user_id = $1
       AND status = 'active'
       AND events ? $2
     ORDER BY created_at ASC`,
    [userId, eventName],
    client
  );
  return result.rows;
}

async function updateDeliveryResult(subscriptionId, { last_delivery_status, last_delivery_error }, client) {
  const result = await db.query(
    `UPDATE webhook_subscriptions
     SET last_delivery_status = $1,
         last_delivery_error = $2,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [last_delivery_status, last_delivery_error ?? null, subscriptionId],
    client
  );
  return result.rows[0] || null;
}

module.exports = {
  upsertForUser,
  findActiveByEvent,
  updateDeliveryResult,
};
