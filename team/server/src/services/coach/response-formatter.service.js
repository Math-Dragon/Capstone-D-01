const db = require('../../db');
const repos = require('../../repositories');
const logger = require('../../utils/logger');

const DEFAULT_RATIONALE = [
  { factor: 'preference_match', explanation: 'Task ini sesuai dengan preferensi dan gaya belajar siswa' },
  { factor: 'learning_science', explanation: 'Task ini menggunakan teknik belajar berbasis bukti (spaced repetition, retrieval practice, atau active recall)' },
  { factor: 'difficulty_fit', explanation: 'Tingkat kesulitan task ini sesuai dengan kemampuan dan progress siswa saat ini' },
  { factor: 'workload_balance', explanation: 'Durasi dan jumlah task ini seimbang dengan ketersediaan waktu mingguan siswa' },
];

function normalizeRationale(r) {
  if (!r || (Array.isArray(r) && r.length === 0)) {
    return DEFAULT_RATIONALE.map(x => ({ ...x }));
  }
  if (typeof r === 'string' && r.trim()) {
    const result = DEFAULT_RATIONALE.map(x => ({ ...x }));
    result[0].explanation = r.trim();
    return result;
  }
  if (Array.isArray(r)) {
    const provided = new Map(
      r.filter(x => x && x.factor).map(x => [x.factor, x.explanation])
    );
    return DEFAULT_RATIONALE.map(d => ({
      factor: d.factor,
      explanation: provided.get(d.factor) || d.explanation,
    }));
  }
  return DEFAULT_RATIONALE.map(x => ({ ...x }));
}

async function persistPlan(userId, plan, goalId) {
  if (!plan || !plan.tasks || plan.tasks.length === 0) return;

  await db.withTransaction(async (client) => {
    let targetGoalId = goalId;
    if (!targetGoalId) {
      const goals = await repos.goal.list(userId, {}, client);
      const activeGoal = goals[0];
      if (!activeGoal) {
        logger.warn({ userId }, 'No active goal found for plan persistence');
        return;
      }
      targetGoalId = activeGoal.id;
    }

    const tasksToCreate = plan.tasks.map(t => ({
      goal_id: targetGoalId,
      title: t.title,
      description: t.description || null,
      duration_estimate: t.duration_estimate,
      planned_date: t.planned_date || null,
      planned_slot: t.planned_slot || null,
      task_type: t.task_type || null,
      rationale: normalizeRationale(t.rationale),
      source: 'coach',
      status: 'todo',
    }));

    await repos.task.createMany(tasksToCreate, client);

    if (plan.difficulty_assessment) {
      await repos.goal.update(targetGoalId, userId, {
        difficulty: plan.difficulty_assessment.level,
      }, client);
      logger.info({ userId, goalId: targetGoalId, difficulty: plan.difficulty_assessment.level }, 'Goal difficulty saved from plan');
    }
  });
  logger.info({ userId, taskCount: plan.tasks.length }, 'Plan tasks persisted');
}

async function stageRecommendation(userId, plan, ctx) {
  const goalData = ctx.payload?.goal || {};
  const goalDifficulty = plan.difficulty_assessment?.level || null;
  const newGoal = await repos.goal.create({
    user_id: userId,
    title: goalData.title || 'Rencana Belajar',
    description: goalData.description || '',
    deadline: goalData.deadline || null,
    status: 'active',
    difficulty: goalDifficulty,
  });

  const recId = `rec_${Date.now()}`;
  const tasksWithIds = plan.tasks.map((t, i) => ({
    ...t,
    task_id: `${recId}_task_${i}`,
    status: 'pending',
    decided_at: null,
  }));

  const rec = await repos.aiRec.create({
    user_id: userId,
    goal_id: newGoal.id,
    type: 'coach_plan',
    input_context: {
      goal: goalData,
      profile: ctx.payload?.profile || {},
    },
    output: {
      summary: plan.summary,
      tasks: tasksWithIds,
    },
    status: 'pending',
  });

  logger.info({ userId, recId: rec.id, goalId: newGoal.id, taskCount: tasksWithIds.length }, 'Recommendation staged with new goal');

  return rec;
}

async function acceptProposal(userId, payload, sessionId) {
  const plan = payload?.plan;
  if (!plan || !plan.tasks || plan.tasks.length === 0) {
    return { type: 'message', data: { message: 'Tidak ada rencana untuk disimpan.', plan: null }, meta: { attempts: [], duration_ms: 0 } };
  }

  await persistPlan(userId, plan);

  await repos.audit.create({
    user_id: userId,
    action: 'COACH_PROPOSAL_ACCEPTED',
    metadata: {
      task_count: plan.tasks.length,
      summary: plan.summary,
    },
    session_id: sessionId,
  });

  return { type: 'accepted', data: { message: 'Rencana berhasil disimpan!', plan }, meta: { attempts: [], duration_ms: 0 } };
}

async function undoPlan(userId, sessionId) {
  const snapshot = await repos.planSnapshot.findLatest(userId);
  if (!snapshot) {
    return { type: 'message', data: { message: 'Tidak ada rencana yang bisa dikembalikan.', plan: null }, meta: { attempts: [], duration_ms: 0 } };
  }

  const restoredTaskIds = snapshot.tasks_snapshot.map(t => t.id).filter(Boolean);

  await db.withTransaction(async (client) => {
    const currentTasks = await repos.task.findActiveByUser(userId, client);
    for (const task of currentTasks) {
      if (!restoredTaskIds.includes(task.id)) {
        await repos.task.remove(task.id, userId, client);
      }
    }

    for (const task of snapshot.tasks_snapshot) {
      if (task.id) {
        await repos.task.update(task.id, { status: 'todo' }, client);
      }
    }

    await repos.planSnapshot.remove(snapshot.id, client);

    await repos.audit.create({
      user_id: userId,
      action: 'COACH_PLAN_UNDONE',
      metadata: {
        trigger_id: snapshot.trigger_id,
        adaptation_type: snapshot.adaptation_type,
        restored_task_count: snapshot.tasks_snapshot.length,
      },
      session_id: sessionId,
    }, client);
  });

  return { type: 'message', data: { message: 'Rencana sebelumnya telah dikembalikan.', plan: null }, meta: { attempts: [], duration_ms: 0 } };
}

async function replacePlan(userId, plan, goalId) {
  if (!plan || !plan.tasks || plan.tasks.length === 0) return;

  await db.withTransaction(async (client) => {
    let targetGoalId = goalId;
    if (!targetGoalId) {
      const goals = await repos.goal.list(userId, {}, client);
      const activeGoal = goals[0];
      if (!activeGoal) {
        logger.warn({ userId }, 'No active goal found for plan replacement');
        return;
      }
      targetGoalId = activeGoal.id;
    }

    const currentTasks = await repos.task.findActiveByUser(userId, client);
    for (const task of currentTasks) {
      if (task.goal_id === targetGoalId) {
        await repos.task.remove(task.id, userId, client);
      }
    }

    const tasksToCreate = plan.tasks.map(t => ({
      goal_id: targetGoalId,
      title: t.title,
      description: t.description || null,
      duration_estimate: t.duration_estimate,
      planned_date: t.planned_date || null,
      planned_slot: t.planned_slot || null,
      task_type: t.task_type || null,
      rationale: normalizeRationale(t.rationale),
      source: 'coach',
      status: 'todo',
    }));

    await repos.task.createMany(tasksToCreate, client);

    if (plan.difficulty_assessment) {
      await repos.goal.update(targetGoalId, userId, {
        difficulty: plan.difficulty_assessment.level,
      }, client);
      logger.info({ userId, goalId: targetGoalId, difficulty: plan.difficulty_assessment.level }, 'Goal difficulty saved from plan');
    }
  });
  logger.info({ userId, taskCount: plan.tasks.length }, 'Plan replaced (old tasks removed, new tasks inserted)');
}

module.exports = { persistPlan, stageRecommendation, acceptProposal, undoPlan, replacePlan };
