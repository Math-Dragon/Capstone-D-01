const db = require('../db');
const repos = require('../repositories');
const { getAIUsageSnapshot, updateAcceptanceRate } = require('../utils/metrics');

function _pctChange(today, yesterday) {
  if (!yesterday || yesterday === 0) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

async function getAdminMetrics(filters = {}) {
  const snapshot = getAIUsageSnapshot();

  const recMetrics = await repos.aiRec.computeAllMetrics().catch(() => ({
    suggested: 0, accepted: 0, rejected: 0, pending: 0,
  }));

  const {
    activity_limit = 10, activity_offset = 0,
    search, action, dateFrom, dateTo, provider, model, status,
    period = 30,
  } = filters;

  const useWeekGrouping = Number(period) >= 90;
  const dateExpr = useWeekGrouping ? "DATE_TRUNC('week', created_at)::date" : 'DATE(created_at)';

  const byDayConditions = ['1=1'];
  const byDayParams = [];

  if (!dateFrom && !dateTo) {
    byDayConditions.push(`created_at >= NOW() - INTERVAL '${period} days'`);
  }
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
      ${dateExpr} AS date,
      COUNT(*)::int AS requests,
      COUNT(*) FILTER (WHERE action LIKE '%ERROR%' OR action LIKE '%REJECTED%')::int AS errors
    FROM audit_logs
    WHERE ${byDayConditions.join(' AND ')}
    GROUP BY ${dateExpr}
    ORDER BY date DESC
  `, byDayParams).catch(() => ({ rows: [] }));

  const acceptByDayRecResult = await db.query(`
    SELECT
      ${dateExpr} AS date,
      COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted,
      COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected'))::int AS decided
    FROM ai_recommendations
    WHERE ${byDayConditions.join(' AND ')}
    GROUP BY ${dateExpr}
    ORDER BY date DESC
  `, byDayParams).catch(() => ({ rows: [] }));

  const acceptByDayTaskResult = await db.query(`
    SELECT
      ${dateExpr} AS date,
      COUNT(*) FILTER (WHERE action = 'COACH_TASK_ACCEPTED')::int AS accepted,
      COUNT(*) FILTER (WHERE action IN ('COACH_TASK_ACCEPTED', 'COACH_TASK_REJECTED'))::int AS decided
    FROM audit_logs
    WHERE action IN ('COACH_TASK_ACCEPTED', 'COACH_TASK_REJECTED')
      AND ${byDayConditions.join(' AND ')}
    GROUP BY ${dateExpr}
    ORDER BY date DESC
  `, byDayParams).catch(() => ({ rows: [] }));

  const acceptMap = {};
  for (const row of acceptByDayRecResult.rows) {
    acceptMap[row.date] = { recAccepted: row.accepted, recDecided: row.decided };
  }
  for (const row of acceptByDayTaskResult.rows) {
    if (!acceptMap[row.date]) acceptMap[row.date] = { recAccepted: 0, recDecided: 0 };
    acceptMap[row.date].taskAccepted = row.accepted;
    acceptMap[row.date].taskDecided = row.decided;
  }

  const byDayAccept = Object.entries(acceptMap).map(([date, d]) => ({
    date,
    recRate: d.recDecided > 0 ? Number((d.recAccepted / d.recDecided).toFixed(4)) : null,
    taskRate: d.taskDecided > 0 ? Number((d.taskAccepted / d.taskDecided).toFixed(4)) : null,
  }));

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
  if (provider) {
    recentConditions.push(`metadata->>'provider' = $${paramIndex}`);
    recentParams.push(provider);
    paramIndex++;
  }
  if (model) {
    recentConditions.push(`metadata->>'model' = $${paramIndex}`);
    recentParams.push(model);
    paramIndex++;
  }
  if (status === 'error') {
    recentConditions.push('(action LIKE \'%ERROR%\' OR action LIKE \'%REJECTED%\')');
  } else if (status === 'success') {
    recentConditions.push('(action NOT LIKE \'%ERROR%\' AND action NOT LIKE \'%REJECTED%\')');
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
    SELECT id, user_id, action, metadata, created_at,
      COALESCE((metadata->>'input_tokens')::int, (metadata->>'prompt_tokens')::int, (metadata->'llm'->>'prompt_tokens')::int) AS input_tokens,
      COALESCE((metadata->>'output_tokens')::int, (metadata->>'completion_tokens')::int, (metadata->'llm'->>'completion_tokens')::int) AS output_tokens,
      COALESCE((metadata->>'total_tokens')::int, (metadata->'llm'->>'total_tokens')::int) AS total_tokens,
      COALESCE((metadata->>'latency_ms')::int, (metadata->'llm'->>'latency_ms')::int) AS latency_ms,
      COALESCE(metadata->>'provider', metadata->'llm'->>'provider') AS provider,
      COALESCE(metadata->>'model', metadata->'llm'->>'model') AS model
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
    input_tokens: row.input_tokens,
    output_tokens: row.output_tokens,
    total_tokens: row.total_tokens,
    latency_ms: row.latency_ms,
    provider: row.provider,
    model: row.model,
  }));

  const trendResult = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS today_calls,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '48 hours' AND created_at < NOW() - INTERVAL '24 hours') AS yesterday_calls,
      COALESCE(SUM((metadata->>'total_tokens')::int) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) AS today_tokens,
      COALESCE(SUM((metadata->>'total_tokens')::int) FILTER (WHERE created_at >= NOW() - INTERVAL '48 hours' AND created_at < NOW() - INTERVAL '24 hours'), 0) AS yesterday_tokens,
      COALESCE(SUM(
        COALESCE((metadata->>'total_tokens')::int, 0) * 0.30 / 1000000.0
      ) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours'), 0) AS today_cost,
      COALESCE(SUM(
        COALESCE((metadata->>'total_tokens')::int, 0) * 0.30 / 1000000.0
      ) FILTER (WHERE created_at >= NOW() - INTERVAL '48 hours' AND created_at < NOW() - INTERVAL '24 hours'), 0) AS yesterday_cost
    FROM audit_logs
    WHERE involves_llm = true
      AND action NOT LIKE '%ERROR%'
  `, []).catch(() => ({ rows: [{}] }));

  const tr = trendResult.rows[0] || {};

  const acceptTrendResult = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected') AND created_at >= NOW() - INTERVAL '24 hours') AS today_decided,
      COUNT(*) FILTER (WHERE status = 'accepted' AND created_at >= NOW() - INTERVAL '24 hours') AS today_accepted,
      COUNT(*) FILTER (WHERE status IN ('accepted', 'rejected') AND created_at >= NOW() - INTERVAL '48 hours' AND created_at < NOW() - INTERVAL '24 hours') AS yesterday_decided,
      COUNT(*) FILTER (WHERE status = 'accepted' AND created_at >= NOW() - INTERVAL '48 hours' AND created_at < NOW() - INTERVAL '24 hours') AS yesterday_accepted
    FROM ai_recommendations
  `, []).catch(() => ({ rows: [{}] }));

  const ar = acceptTrendResult.rows[0] || {};
  const todayAcceptRate = ar.today_decided > 0 ? (ar.today_accepted / ar.today_decided) * 100 : 0;
  const yesterdayAcceptRate = ar.yesterday_decided > 0 ? (ar.yesterday_accepted / ar.yesterday_decided) * 100 : 0;

  const trends = {
    totalCalls: _pctChange(Number(tr.today_calls) || 0, Number(tr.yesterday_calls) || 0),
    totalTokens: _pctChange(Number(tr.today_tokens) || 0, Number(tr.yesterday_tokens) || 0),
    estimatedCostUsd: _pctChange(Number(tr.today_cost) || 0, Number(tr.yesterday_cost) || 0),
    acceptRate: Math.round(todayAcceptRate - yesterdayAcceptRate),
  };

  return { summary, trends, byProvider, byDay, byDayAccept, recentActivity, total };
}

module.exports = { getAdminMetrics };
