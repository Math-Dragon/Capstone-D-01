const db = require('../db');
const repos = require('../repositories');
const { getAIUsageSnapshot } = require('../utils/metrics');

async function getAdminMetrics() {
  const snapshot = getAIUsageSnapshot();

  const recMetrics = await repos.aiRec.computeAllMetrics().catch(() => ({
    suggested: 0, accepted: 0, rejected: 0, pending: 0,
  }));

  const byProviderResult = await db.query(`
    SELECT
      provider,
      COUNT(*)::int AS calls,
      COALESCE(SUM((metadata->>'prompt_tokens')::int), 0)::int AS tokens
    FROM audit_logs
    WHERE action = 'COACH_LLM_CALL'
      AND metadata->>'provider' IS NOT NULL
    GROUP BY provider
    ORDER BY calls DESC
  `).catch(() => ({ rows: [] }));

  const byDayResult = await db.query(`
    SELECT
      DATE(created_at) AS date,
      COUNT(*)::int AS requests,
      COUNT(*) FILTER (WHERE action LIKE '%ERROR%' OR action LIKE '%REJECTED%')::int AS errors
    FROM audit_logs
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `).catch(() => ({ rows: [] }));

  const recentResult = await db.query(`
    SELECT id, user_id, action, metadata, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT 50
  `).catch(() => ({ rows: [] }));

  const totalDecided = recMetrics.accepted + recMetrics.rejected;
  const summary = {
    totalCalls: snapshot.totals.requests,
    totalTokens: {
      prompt: snapshot.totals.prompt_tokens,
      completion: snapshot.totals.completion_tokens,
      total: snapshot.totals.total_tokens,
    },
    estimatedCostUsd: snapshot.totals.estimated_cost_usd,
    acceptRate: totalDecided > 0 ? Number((recMetrics.accepted / totalDecided).toFixed(4)) : 0,
  };

  const byProvider = snapshot.by_provider_model
    ? Object.entries(snapshot.by_provider_model).map(([key, val]) => ({
        provider: val.provider,
        model: val.model,
        calls: val.requests,
        tokens: val.total_tokens,
        estimatedCostUsd: val.estimated_cost_usd,
      }))
    : [];

  const byDay = byDayResult.rows.map(row => ({
    date: row.date,
    requests: row.requests,
    errors: row.errors,
  }));

  const recentActivity = recentResult.rows.map(row => ({
    id: row.id,
    timestamp: row.created_at,
    action: row.action,
    user_id: row.user_id,
    metadata: row.metadata,
  }));

  return { summary, byProvider, byDay, recentActivity };
}

module.exports = { getAdminMetrics };
