const db = require('../db');
const repos = require('../repositories');
const { getAIUsageSnapshot, updateAcceptanceRate } = require('../utils/metrics');

async function getAdminMetrics(filters = {}) {
  const snapshot = getAIUsageSnapshot();

  const recMetrics = await repos.aiRec.computeAllMetrics().catch(() => ({
    suggested: 0, accepted: 0, rejected: 0, pending: 0,
  }));

  const { activity_limit = 10, activity_offset = 0, search, action, dateFrom, dateTo } = filters;

  const byDayConditions = ['1=1'];
  const byDayParams = [];
  if (dateFrom) {
    byDayConditions.push(`created_at >= $${byDayParams.length + 1}::timestamp`);
    byDayParams.push(dateFrom);
  }
  if (dateTo) {
    byDayConditions.push(`created_at <= $${byDayParams.length + 1}::timestamp + interval '1 day'`);
    byDayParams.push(dateTo);
  }

  const byDayResult = await db.query(`
    SELECT
      DATE(created_at) AS date,
      COUNT(*)::int AS requests,
      COUNT(*) FILTER (WHERE action LIKE '%ERROR%' OR action LIKE '%REJECTED%')::int AS errors
    FROM audit_logs
    WHERE ${byDayConditions.join(' AND ')}
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `, byDayParams).catch(() => ({ rows: [] }));

  const recentConditions = ['1=1'];
  const recentParams = [];
  let paramIndex = 1;

  if (search) {
    recentConditions.push(`(user_id::text LIKE $${paramIndex} OR action ILIKE $${paramIndex})`);
    recentParams.push(`%${search}%`);
    paramIndex++;
  }
  if (action) {
    recentConditions.push(`action = $${paramIndex}`);
    recentParams.push(action);
    paramIndex++;
  }
  if (dateFrom) {
    recentConditions.push(`created_at >= $${paramIndex}::timestamp`);
    recentParams.push(dateFrom);
    paramIndex++;
  }
  if (dateTo) {
    recentConditions.push(`created_at <= $${paramIndex}::timestamp + interval '1 day'`);
    recentParams.push(dateTo);
    paramIndex++;
  }

  const countResult = await db.query(`
    SELECT COUNT(*)::int AS total
    FROM audit_logs
    WHERE ${recentConditions.join(' AND ')}
  `, recentParams).catch(() => ({ rows: [{ total: 0 }] }));

  const total = countResult.rows[0]?.total || 0;

  recentParams.push(activity_limit);
  recentParams.push(activity_offset);

  const recentResult = await db.query(`
    SELECT id, user_id, action, metadata, created_at
    FROM audit_logs
    WHERE ${recentConditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, recentParams).catch(() => ({ rows: [] }));

  const totalDecided = recMetrics.accepted + recMetrics.rejected;
  updateAcceptanceRate(recMetrics.accepted, recMetrics.rejected);
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
    ? Object.entries(snapshot.by_provider_model).map(([_key, val]) => ({
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

  return { summary, byProvider, byDay, recentActivity, total };
}

module.exports = { getAdminMetrics };
