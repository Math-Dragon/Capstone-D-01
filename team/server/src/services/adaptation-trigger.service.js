const TRIGGERS = [
  { id: 'AT-1', condition: (m) => m.completion_rate_3d < 0.50, sessionType: 'adjustment', priority: 'medium' },
  { id: 'AT-2', condition: (m) => m.avg_difficulty_7d > 4.5, sessionType: 'adjustment', priority: 'medium' },
  { id: 'AT-3', condition: (m) => m.avg_difficulty_7d > 0 && m.avg_difficulty_7d < 1.5, sessionType: 'adjustment', priority: 'low' },
  { id: 'AT-4', condition: (m) => m.completion_rate_7d > 0.90 && m.streak_days >= 5, sessionType: 'milestone', priority: 'low' },
  { id: 'AT-5', condition: (m) => m.consecutive_skips >= 3, sessionType: 'crisis', priority: 'high' },
  { id: 'AT-6', condition: (m) => m.last_mood === 'drained' && m._consecutive_drained >= 2, sessionType: 'crisis', priority: 'high' },
];

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function evaluate(metrics) {
  if (!metrics) return null;

  const now = Date.now();
  const cooldowns = metrics.trigger_cooldowns || {};

  const fired = [];
  for (const trigger of TRIGGERS) {
    if (trigger.condition(metrics)) {
      const lastFired = cooldowns[trigger.id];
      if (lastFired && now - new Date(lastFired).getTime() < COOLDOWN_MS) {
        continue;
      }
      fired.push(trigger);
    }
  }

  if (fired.length === 0) return null;

  fired.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  return fired[0];
}

function recordCooldown(triggerCooldowns, triggerId) {
  const updated = { ...(triggerCooldowns || {}) };
  updated[triggerId] = new Date().toISOString();
  return updated;
}

module.exports = { evaluate, recordCooldown };
