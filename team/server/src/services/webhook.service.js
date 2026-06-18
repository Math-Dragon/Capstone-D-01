const crypto = require('crypto');
const repos = require('../repositories');
const logger = require('../utils/logger');

function buildSignature(secret, payload) {
  return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
}

async function deliver(subscription, eventName, payload) {
  const body = JSON.stringify({
    event: eventName,
    timestamp: new Date().toISOString(),
    data: payload,
  });
  const headers = {
    'Content-Type': 'application/json',
  };

  if (subscription.signing_secret) {
    headers['X-StepUp-Signature'] = buildSignature(subscription.signing_secret, body);
  }

  try {
    const response = await fetch(subscription.target_url, {
      method: 'POST',
      headers,
      body,
    });

    await repos.webhookSubscription.updateDeliveryResult(subscription.id, {
      last_delivery_status: response.status,
      last_delivery_error: response.ok ? null : `HTTP ${response.status}`,
    });

    return response;
  } catch (err) {
    await repos.webhookSubscription.updateDeliveryResult(subscription.id, {
      last_delivery_status: null,
      last_delivery_error: err.message,
    });
    throw err;
  }
}

async function publish(eventName, payload) {
  const subscriptions = await repos.webhookSubscription.findActiveByEvent(payload.userId, eventName);
  logger.info({
    event: eventName,
    event_source: 'webhook.publish',
    user_id: payload.userId,
    subscription_count: subscriptions?.length || 0,
  }, 'Domain event published');
  if (!subscriptions || subscriptions.length === 0) {
    return [];
  }

  return Promise.all(subscriptions.map((subscription) => deliver(subscription, eventName, payload)));
}

module.exports = {
  buildSignature,
  deliver,
  publish,
};
