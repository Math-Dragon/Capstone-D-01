const adaptationTrigger = require('../adaptation-trigger.service');

function evaluateGate(action, metrics, payload) {
  const trigger = adaptationTrigger.evaluate(metrics);

  switch (action) {
    case 'COMPLETE_TASK':
      if (!trigger) {
        return { staticOnly: true, triggerFired: null, sessionTypeOverride: null };
      }
      return { staticOnly: false, triggerFired: trigger, sessionTypeOverride: null };

    case 'SUBMIT_FEEDBACK':
      if (!trigger) {
        return { staticOnly: true, triggerFired: null, sessionTypeOverride: null };
      }
      return { staticOnly: false, triggerFired: trigger, sessionTypeOverride: null };

    case 'SKIP_TASK': {
      const consecutiveSkips = metrics?.consecutive_skips || 0;
      const reason = payload?.reason || '';
      const signalReasons = ['too_hard', 'not_interested'];
      if (consecutiveSkips < 2 && !signalReasons.includes(reason)) {
        return { staticOnly: true, triggerFired: null, sessionTypeOverride: null };
      }
      return { staticOnly: false, triggerFired: null, sessionTypeOverride: 'adjustment' };
    }

    case 'CHECK_IN': {
      const rate = metrics?.completion_rate_7d || 0;
      const skips = metrics?.consecutive_skips || 0;
      const mood = payload?.mood || 'okay';
      const goodMoods = ['great', 'good', 'okay'];
      if (rate >= 0.70 && skips === 0 && goodMoods.includes(mood)) {
        return { staticOnly: true, triggerFired: null, sessionTypeOverride: null };
      }
      return { staticOnly: false, triggerFired: null, sessionTypeOverride: null };
    }

    default:
      return { staticOnly: false, triggerFired: null, sessionTypeOverride: null };
  }
}

module.exports = { evaluateGate };
