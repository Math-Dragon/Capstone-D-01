const db = require('../db');
const repos = require('../repositories');
const logger = require('../utils/logger');
const { applyPlan } = require('./coach/response-formatter.service');

const PROPOSAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_EVIDENCE = 3;
const EVIDENCE_FIELDS = ['code', 'summary', 'window', 'count'];
const DIFF_FIELDS = ['title', 'duration_estimate', 'planned_date', 'planned_slot', 'task_type'];
const DIFF_COMPARE_FIELDS = ['duration_estimate', 'planned_date', 'planned_slot', 'task_type'];

function proposalError(statusCode, code, message) {
  const e = new Error(message);
  e.statusCode = statusCode;
  e.code = code;
  return e;
}

function iso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/** Allowlist-only copy: never ships reasoning, raw prompts or free-form metadata. */
function sanitizeEvidence(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_EVIDENCE).map((item) => {
    const source = asRecord(item);
    const out = {};
    for (const key of EVIDENCE_FIELDS) {
      if (source[key] !== undefined) out[key] = source[key];
    }
    return out;
  });
}

function pickDiffFields(item) {
  const source = asRecord(item);
  const out = {};
  for (const key of DIFF_FIELDS) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

function sanitizeChanges(planDiff) {
  const source = asRecord(planDiff);
  const list = (value) => (Array.isArray(value) ? value.map(pickDiffFields) : []);
  return {
    added: list(source.added),
    modified: list(source.modified),
    removed: list(source.removed),
    rescheduled: list(source.rescheduled),
  };
}

function toPendingView(record) {
  if (!record) return null;
  const output = asRecord(record.output);
  return {
    id: record.id,
    adaptation_type: record.adaptation_type || null,
    summary: output.summary || null,
    created_at: iso(record.created_at),
    expires_at: iso(record.expires_at),
    base_plan_version: record.base_plan_snapshot_id || null,
  };
}

function toDetailView(record) {
  const output = asRecord(record.output);
  return {
    id: record.id,
    adaptation_type: record.adaptation_type || null,
    summary: output.summary || null,
    status: record.status,
    evidence: sanitizeEvidence(record.evidence_summary),
    changes: sanitizeChanges(record.plan_diff),
    created_at: iso(record.created_at),
    expires_at: iso(record.expires_at),
    base_plan_version: record.base_plan_snapshot_id || null,
  };
}

function taskKey(task) {
  return String((task && task.title) || '').trim().toLowerCase();
}

function diffEntry(task) {
  return pickDiffFields(task);
}

/**
 * Title-keyed diff between the active plan and the proposed one. `rescheduled`
 * stays empty until slot-level comparison is trustworthy.
 */
function summarizePlanDiff(activeTasks, proposedTasks) {
  const active = new Map();
  for (const task of Array.isArray(activeTasks) ? activeTasks : []) {
    const key = taskKey(task);
    if (key) active.set(key, task);
  }

  const added = [];
  const modified = [];
  const removed = [];

  for (const task of Array.isArray(proposedTasks) ? proposedTasks : []) {
    const key = taskKey(task);
    if (!key) continue;
    const previous = active.get(key);
    if (!previous) {
      added.push(diffEntry(task));
      continue;
    }
    const changed = DIFF_COMPARE_FIELDS.some(
      (field) => (previous[field] ?? null) !== (task[field] ?? null)
    );
    if (changed) modified.push(diffEntry(task));
  }

  for (const [key, task] of active) {
    if (!Array.isArray(proposedTasks) || !proposedTasks.some((t) => taskKey(t) === key)) {
      removed.push(diffEntry(task));
    }
  }

  return { added, modified, removed, rescheduled: [] };
}

/**
 * Terminal rows replay the first resolution when the caller retries with the
 * same idempotency key; any other terminal row is a conflict.
 */
function replayOrConflict(record, idempotencyKey) {
  if (record.status === 'pending') return null;
  if (record.resolution_idempotency_key && record.resolution_idempotency_key === idempotencyKey) {
    return record.resolution_result || { status: record.status };
  }
  throw proposalError(409, 'PROPOSAL_ALREADY_RESOLVED', 'Proposal sudah diputuskan.');
}

function assertNotExpired(record) {
  if (!record.expires_at) return;
  const expiresAt = new Date(record.expires_at).getTime();
  if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
    throw proposalError(410, 'PROPOSAL_EXPIRED', 'Masa berlaku proposal telah habis.');
  }
}

async function stageProposal(userId, options = {}, client) {
  const run = (tx) => stageInTransaction(userId, options, tx);
  return client ? run(client) : db.withTransaction(run);
}

async function stageInTransaction(userId, options, client) {
  const {
    plan,
    goalId,
    adaptationType,
    triggerId,
    evidence,
    sessionId,
    basePlanSnapshotId,
  } = options;

  const proposedTasks = Array.isArray(plan && plan.tasks) ? plan.tasks : [];
  if (proposedTasks.length === 0) {
    logger.warn({ userId, adaptationType }, 'Adaptive proposal skipped: plan carries no tasks');
    return null;
  }

  const activeTasks = await repos.adaptiveProposal.findActiveTasksByGoal(userId, goalId || null, client);

  let baseSnapshotId = basePlanSnapshotId || null;
  if (!baseSnapshotId) {
    const snapshot = await repos.planSnapshot.create({
      user_id: userId,
      trigger_id: triggerId || 'adaptive',
      adaptation_type: adaptationType || 'adaptive',
      tasks_snapshot: activeTasks,
      plan_summary: (plan && plan.summary) || null,
      goal_id: goalId || null,
      snapshot_kind: 'base',
    }, client);
    baseSnapshotId = snapshot.id;
  }

  const record = await repos.adaptiveProposal.createPending({
    user_id: userId,
    goal_id: goalId || null,
    adaptation_type: adaptationType || null,
    input_context: {
      goal_id: goalId || null,
      trigger_id: triggerId || null,
      session_id: sessionId || null,
      // Kept internal (never mapped to the API) so accept() can still apply it.
      difficulty_assessment: (plan && plan.difficulty_assessment) || null,
    },
    output: { summary: (plan && plan.summary) || null, tasks: proposedTasks },
    evidence_summary: sanitizeEvidence(evidence),
    plan_diff: summarizePlanDiff(activeTasks, proposedTasks),
    base_plan_snapshot_id: baseSnapshotId,
    expires_at: new Date(Date.now() + PROPOSAL_TTL_MS),
  }, client);

  logger.info({
    userId,
    proposalId: record.id,
    adaptationType,
    taskCount: proposedTasks.length,
  }, 'Adaptive proposal staged');

  return record;
}

async function getPending(userId) {
  const record = await repos.adaptiveProposal.findLatestPending(userId);
  return toPendingView(record);
}

async function getById(userId, id) {
  const record = await repos.adaptiveProposal.findByIdOwned(id, userId);
  if (!record) throw proposalError(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');
  return toDetailView(record);
}

async function accept(userId, id, { base_plan_version, idempotency_key }) {
  return db.withTransaction(async (client) => {
    const record = await repos.adaptiveProposal.findByIdOwned(id, userId, client, { forUpdate: true });
    if (!record) throw proposalError(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

    const replay = replayOrConflict(record, idempotency_key);
    if (replay) return replay;

    assertNotExpired(record);

    if ((record.base_plan_snapshot_id || null) !== (base_plan_version || null)) {
      throw proposalError(409, 'PROPOSAL_STALE', 'Rencana telah berubah sejak proposal dibuat.');
    }

    const output = asRecord(record.output);
    const context = asRecord(record.input_context);
    const summary = output.summary || null;
    const tasks = Array.isArray(output.tasks) ? output.tasks : [];

    let taskCount = 0;
    if (tasks.length > 0) {
      const applied = await applyPlan(userId, {
        summary,
        tasks,
        difficulty_assessment: context.difficulty_assessment || undefined,
      }, record.goal_id, client);
      if (!applied) {
        throw proposalError(409, 'NO_ACTIVE_GOAL', 'Goal target proposal tidak tersedia untuk diterapkan.');
      }
      taskCount = applied.task_count;
    }

    const activeAfter = await repos.task.findActiveByUser(userId, client);
    const resultSnapshot = await repos.planSnapshot.create({
      user_id: userId,
      trigger_id: context.trigger_id || 'adaptive',
      adaptation_type: record.adaptation_type || 'adaptive',
      tasks_snapshot: activeAfter,
      plan_summary: summary,
      goal_id: record.goal_id || null,
      snapshot_kind: 'result',
    }, client);

    const resolution = { status: 'accepted', task_count: taskCount, summary };
    await repos.adaptiveProposal.resolve(id, {
      status: 'accepted',
      resolutionIdempotencyKey: idempotency_key,
      resolutionResult: resolution,
      resultPlanSnapshotId: resultSnapshot.id,
    }, client);

    await repos.audit.create({
      user_id: userId,
      action: 'COACH_PROPOSAL_ACCEPTED',
      metadata: {
        proposal_id: id,
        adaptation_type: record.adaptation_type || null,
        task_count: taskCount,
        summary,
        base_plan_version: record.base_plan_snapshot_id || null,
        result_plan_snapshot_id: resultSnapshot.id,
      },
      session_id: context.session_id || null,
    }, client);

    return resolution;
  });
}

async function reject(userId, id, { idempotency_key }) {
  return db.withTransaction(async (client) => {
    const record = await repos.adaptiveProposal.findByIdOwned(id, userId, client, { forUpdate: true });
    if (!record) throw proposalError(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

    const replay = replayOrConflict(record, idempotency_key);
    if (replay) return replay;

    assertNotExpired(record);

    const resolution = { status: 'rejected' };
    await repos.adaptiveProposal.resolve(id, {
      status: 'rejected',
      resolutionIdempotencyKey: idempotency_key,
      resolutionResult: resolution,
      resultPlanSnapshotId: null,
    }, client);

    await repos.audit.create({
      user_id: userId,
      action: 'COACH_PROPOSAL_REJECTED',
      metadata: {
        proposal_id: id,
        adaptation_type: record.adaptation_type || null,
        summary: asRecord(record.output).summary || null,
      },
      session_id: asRecord(record.input_context).session_id || null,
    }, client);

    return resolution;
  });
}

module.exports = {
  getPending,
  getById,
  stageProposal,
  accept,
  reject,
};
