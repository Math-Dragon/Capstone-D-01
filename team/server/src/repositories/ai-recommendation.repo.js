const db = require('../db');

async function findByIdAndUserId(id, userId, client, options = {}) {
  const lock = client && options.forUpdate ? ' FOR UPDATE' : '';
  const result = await db.query(
    `SELECT * FROM ai_recommendations WHERE id = $1 AND user_id = $2${lock}`,
    [id, userId],
    client
  );
  return result.rows[0] || null;
}

async function create({ user_id, goal_id, type, input_context, output, status }, client) {
  const result = await db.query(
    `INSERT INTO ai_recommendations (user_id, goal_id, type, input_context, output, status)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'pending')) RETURNING *`,
    [user_id, goal_id || null, type, input_context, output, status || null],
    client
  );
  return result.rows[0];
}

async function updateStatus(id, status, client) {
  const result = await db.query(
    'UPDATE ai_recommendations SET status = $1 WHERE id = $2 RETURNING *',
    [status, id],
    client
  );
  return result.rows[0];
}

async function updateOutput(id, output, client) {
  const result = await db.query(
    'UPDATE ai_recommendations SET output = $1 WHERE id = $2 RETURNING *',
    [output, id],
    client
  );
  return result.rows[0];
}

async function computeAllMetrics() {
  const result = await db.query(`
    SELECT
      COALESCE(SUM(jsonb_array_length(output->'tasks')), 0)::int AS suggested,
      COALESCE(SUM((SELECT COUNT(*) FROM jsonb_array_elements(output->'tasks') AS t WHERE t->>'status' = 'accepted')), 0)::int AS accepted,
      COALESCE(SUM((SELECT COUNT(*) FROM jsonb_array_elements(output->'tasks') AS t WHERE t->>'status' = 'rejected')), 0)::int AS rejected,
      COALESCE(SUM((SELECT COUNT(*) FROM jsonb_array_elements(output->'tasks') AS t WHERE t->>'status' = 'pending')), 0)::int AS pending
    FROM ai_recommendations
  `);
  return result.rows[0] || { suggested: 0, accepted: 0, rejected: 0, pending: 0 };
}

async function computeRationaleMetrics() {
  const result = await db.query(`
    WITH task_items AS (
      SELECT task
      FROM ai_recommendations,
      LATERAL jsonb_array_elements(COALESCE(output->'tasks', '[]'::jsonb)) AS task
    ),
    rationale_items AS (
      SELECT
        task,
        CASE
          WHEN jsonb_typeof(task->'rationale') = 'array' THEN task->'rationale'
          WHEN NULLIF(task->>'rationale', '') IS NOT NULL THEN jsonb_build_array(jsonb_build_object('factor', task->>'rationale'))
          ELSE '[]'::jsonb
        END AS rationale
      FROM task_items
    ),
    factors AS (
      SELECT
        COALESCE(NULLIF(factor->>'factor', ''), 'unknown') AS factor,
        task->>'status' AS status
      FROM rationale_items,
      LATERAL jsonb_array_elements(rationale) AS factor
    )
    SELECT
      factor,
      COUNT(*)::int AS suggested,
      COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted
    FROM factors
    GROUP BY factor
    ORDER BY suggested DESC, factor ASC
  `);

  return result.rows.map((row) => {
    const suggested = Number(row.suggested) || 0;
    const accepted = Number(row.accepted) || 0;
    return {
      factor: row.factor,
      suggested,
      accepted,
      acceptance_rate: suggested > 0 ? (accepted / suggested).toFixed(2) : '0.00',
    };
  });
}

module.exports = {
  findByIdAndUserId,
  create,
  updateStatus,
  updateOutput,
  computeAllMetrics,
  computeRationaleMetrics,
};
