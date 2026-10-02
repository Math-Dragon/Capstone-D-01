process.env.SKIP_DB_CHECK = 'true';

jest.mock('../../src/db', () => ({
  withTransaction: jest.fn(async (fn) => fn('tx-client')),
  query: jest.fn(),
  pool: { query: jest.fn(), end: jest.fn() },
}));

jest.mock('../../src/repositories', () => ({
  adaptiveProposal: {
    findByIdOwned: jest.fn(),
    findLatestPending: jest.fn(),
    resolve: jest.fn(),
  },
  planSnapshot: { create: jest.fn() },
  task: { findActiveByUser: jest.fn(), remove: jest.fn(), createMany: jest.fn() },
  goal: { list: jest.fn(), update: jest.fn() },
  audit: { create: jest.fn() },
}));

const db = require('../../src/db');
const repos = require('../../src/repositories');
const adaptiveProposalService = require('../../src/services/adaptive-proposal.service');

const USER_ID = '550e8400-e29b-41d4-a716-446655440010';
const PROPOSAL_ID = '550e8400-e29b-41d4-a716-446655440011';
const GOAL_ID = '550e8400-e29b-41d4-a716-446655440012';
const BASE_SNAPSHOT_ID = '550e8400-e29b-41d4-a716-446655440013';
const OTHER_SNAPSHOT_ID = '550e8400-e29b-41d4-a716-446655440014';
const RESULT_SNAPSHOT_ID = '550e8400-e29b-41d4-a716-446655440015';
const OTHER_GOAL_ID = '550e8400-e29b-41d4-a716-446655440016';
const IDEMPOTENCY_KEY = 'accept-retry-key-0001';

const OUTPUT = {
  summary: 'Revisi minggu ini',
  tasks: [
    {
      title: 'Latihan soal aljabar',
      duration_estimate: 30,
      planned_date: '2026-09-25',
      planned_slot: 'morning',
      task_type: 'practice',
    },
    {
      title: 'Rangkuman bab 3',
      duration_estimate: 45,
      planned_date: '2026-09-26',
      planned_slot: 'evening',
      task_type: 'synthesize',
    },
  ],
};

function pendingRecord(overrides = {}) {
  return {
    id: PROPOSAL_ID,
    user_id: USER_ID,
    goal_id: GOAL_ID,
    type: 'adaptive_plan',
    input_context: {
      goal_id: GOAL_ID,
      trigger_id: 'AT-1',
      session_id: 'session-1',
      difficulty_assessment: { level: 'hard' },
    },
    output: OUTPUT,
    status: 'pending',
    adaptation_type: 'adjustment',
    evidence_summary: [
      { code: 'completion_rate_7d', summary: 'Completion rate (7d): 40% (4/10 tasks)', window: '7d', count: 10 },
    ],
    plan_diff: {
      added: [{ title: 'Latihan soal aljabar', duration_estimate: 30 }],
      modified: [],
      removed: [],
      rescheduled: [],
    },
    base_plan_snapshot_id: BASE_SNAPSHOT_ID,
    result_plan_snapshot_id: null,
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
    resolved_at: null,
    resolution_idempotency_key: null,
    resolution_result: null,
    created_at: new Date('2026-09-24T02:00:00.000Z'),
    updated_at: null,
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('adaptive-proposal.accept', () => {
  test('returns 410 when the proposal has expired', async () => {
    repos.adaptiveProposal.findByIdOwned.mockResolvedValue(
      pendingRecord({ expires_at: new Date(Date.now() - 60 * 1000) })
    );

    await expect(adaptiveProposalService.accept(USER_ID, PROPOSAL_ID, {
      base_plan_version: BASE_SNAPSHOT_ID,
      idempotency_key: IDEMPOTENCY_KEY,
    })).rejects.toMatchObject({ statusCode: 410, code: 'PROPOSAL_EXPIRED' });

    expect(repos.adaptiveProposal.resolve).not.toHaveBeenCalled();
    expect(repos.task.createMany).not.toHaveBeenCalled();
    expect(repos.audit.create).not.toHaveBeenCalled();
  });

  test('returns 409 PROPOSAL_STALE when base_plan_version differs', async () => {
    repos.adaptiveProposal.findByIdOwned.mockResolvedValue(pendingRecord());

    await expect(adaptiveProposalService.accept(USER_ID, PROPOSAL_ID, {
      base_plan_version: OTHER_SNAPSHOT_ID,
      idempotency_key: IDEMPOTENCY_KEY,
    })).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_STALE' });

    expect(repos.adaptiveProposal.resolve).not.toHaveBeenCalled();
    expect(repos.task.createMany).not.toHaveBeenCalled();
    expect(repos.task.remove).not.toHaveBeenCalled();
    expect(repos.audit.create).not.toHaveBeenCalled();
  });

  test('replays the first resolution when the idempotency key matches', async () => {
    const firstResult = { status: 'accepted', task_count: 2, summary: OUTPUT.summary };
    repos.adaptiveProposal.findByIdOwned.mockResolvedValue(pendingRecord({
      status: 'accepted',
      resolved_at: new Date('2026-09-24T03:00:00.000Z'),
      resolution_idempotency_key: IDEMPOTENCY_KEY,
      resolution_result: firstResult,
    }));

    const result = await adaptiveProposalService.accept(USER_ID, PROPOSAL_ID, {
      base_plan_version: BASE_SNAPSHOT_ID,
      idempotency_key: IDEMPOTENCY_KEY,
    });

    expect(result).toEqual(firstResult);
    expect(repos.adaptiveProposal.resolve).not.toHaveBeenCalled();
    expect(repos.task.createMany).not.toHaveBeenCalled();
    expect(repos.audit.create).not.toHaveBeenCalled();
  });

  test('returns 409 when a terminal row is retried with a different key', async () => {
    repos.adaptiveProposal.findByIdOwned.mockResolvedValue(pendingRecord({
      status: 'rejected',
      resolution_idempotency_key: 'another-key-9999',
      resolution_result: { status: 'rejected' },
    }));

    await expect(adaptiveProposalService.accept(USER_ID, PROPOSAL_ID, {
      base_plan_version: BASE_SNAPSHOT_ID,
      idempotency_key: IDEMPOTENCY_KEY,
    })).rejects.toMatchObject({ statusCode: 409, code: 'PROPOSAL_ALREADY_RESOLVED' });

    expect(repos.adaptiveProposal.resolve).not.toHaveBeenCalled();
  });

  test('applies the plan, writes a result snapshot, resolves and audits', async () => {
    const record = pendingRecord();
    const activeBefore = [
      { id: 'task-old', goal_id: GOAL_ID, status: 'todo' },
      { id: 'task-other-goal', goal_id: OTHER_GOAL_ID, status: 'todo' },
    ];
    const activeAfter = [
      { id: 'task-1', goal_id: GOAL_ID, status: 'todo' },
      { id: 'task-2', goal_id: GOAL_ID, status: 'todo' },
    ];
    repos.adaptiveProposal.findByIdOwned.mockResolvedValue(record);
    repos.task.findActiveByUser
      .mockResolvedValueOnce(activeBefore)
      .mockResolvedValueOnce(activeAfter);
    repos.task.createMany.mockResolvedValue([{ id: 'task-1' }, { id: 'task-2' }]);
    repos.planSnapshot.create.mockResolvedValue({ id: RESULT_SNAPSHOT_ID });
    repos.adaptiveProposal.resolve.mockResolvedValue(record);
    repos.audit.create.mockResolvedValue({});

    const result = await adaptiveProposalService.accept(USER_ID, PROPOSAL_ID, {
      base_plan_version: BASE_SNAPSHOT_ID,
      idempotency_key: IDEMPOTENCY_KEY,
    });

    expect(result).toEqual({ status: 'accepted', task_count: 2, summary: OUTPUT.summary });
    expect(db.withTransaction).toHaveBeenCalled();

    // Only the proposal's goal loses its active tasks.
    expect(repos.task.remove).toHaveBeenCalledTimes(1);
    expect(repos.task.remove).toHaveBeenCalledWith('task-old', USER_ID, 'tx-client');
    expect(repos.task.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ goal_id: GOAL_ID, title: 'Latihan soal aljabar', status: 'todo' }),
      ]),
      'tx-client'
    );

    expect(repos.goal.update).toHaveBeenCalledWith(GOAL_ID, USER_ID, { difficulty: 'hard' }, 'tx-client');

    expect(repos.planSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot_kind: 'result',
        goal_id: GOAL_ID,
        tasks_snapshot: activeAfter,
      }),
      'tx-client'
    );

    expect(repos.adaptiveProposal.resolve).toHaveBeenCalledWith(PROPOSAL_ID, {
      status: 'accepted',
      resolutionIdempotencyKey: IDEMPOTENCY_KEY,
      resolutionResult: { status: 'accepted', task_count: 2, summary: OUTPUT.summary },
      resultPlanSnapshotId: RESULT_SNAPSHOT_ID,
    }, 'tx-client');

    expect(repos.audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        action: 'COACH_PROPOSAL_ACCEPTED',
        metadata: expect.objectContaining({ proposal_id: PROPOSAL_ID, task_count: 2 }),
      }),
      'tx-client'
    );
  });

  test('returns 404 for a proposal the user does not own', async () => {
    repos.adaptiveProposal.findByIdOwned.mockResolvedValue(null);

    await expect(adaptiveProposalService.accept(USER_ID, PROPOSAL_ID, {
      base_plan_version: BASE_SNAPSHOT_ID,
      idempotency_key: IDEMPOTENCY_KEY,
    })).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});

describe('adaptive-proposal.getPending', () => {
  test('maps to the public shape and never leaks internal fields', async () => {
    const record = pendingRecord({
      input_context: { internal_secret: 'do-not-leak' },
      output: { ...OUTPUT, reasoning: 'chain-of-thought-should-not-leak' },
    });
    repos.adaptiveProposal.findLatestPending.mockResolvedValue(record);

    const view = await adaptiveProposalService.getPending(USER_ID);

    expect(view).toEqual({
      id: PROPOSAL_ID,
      adaptation_type: 'adjustment',
      summary: OUTPUT.summary,
      created_at: record.created_at.toISOString(),
      expires_at: record.expires_at.toISOString(),
      base_plan_version: BASE_SNAPSHOT_ID,
    });
    expect(Object.keys(view)).not.toContain('input_context');
    expect(Object.keys(view)).not.toContain('output');
    expect(JSON.stringify(view)).not.toContain('do-not-leak');
    expect(JSON.stringify(view)).not.toContain('chain-of-thought-should-not-leak');
    expect(JSON.stringify(view)).not.toContain('Latihan soal aljabar');
  });

  test('returns null when there is no pending proposal', async () => {
    repos.adaptiveProposal.findLatestPending.mockResolvedValue(null);
    await expect(adaptiveProposalService.getPending(USER_ID)).resolves.toBeNull();
  });
});

describe('adaptive-proposal.getById', () => {
  test('allowlists evidence and plan changes', async () => {
    repos.adaptiveProposal.findByIdOwned.mockResolvedValue(pendingRecord({
      evidence_summary: [
        { code: 'streak_days', summary: 'Streak: 3 days', window: '7d', count: 3, internal_note: 'hidden' },
        { code: 'last_mood', summary: 'Last mood: drained', window: '7d', count: 1, internal_note: 'hidden' },
        { code: 'x1', summary: 'a', window: '7d', count: 1 },
        { code: 'x2', summary: 'b', window: '7d', count: 1 },
      ],
      plan_diff: {
        added: [{ title: 'Latihan soal aljabar', duration_estimate: 30, llm_reasoning: 'hidden' }],
        modified: [{ title: 'Rangkuman bab 3', planned_date: '2026-09-26', secret: 'hidden' }],
        removed: [{ title: 'Baca buku', duration_estimate: 20 }],
        rescheduled: [],
      },
    }));

    const detail = await adaptiveProposalService.getById(USER_ID, PROPOSAL_ID);

    expect(detail.status).toBe('pending');
    expect(detail.evidence).toHaveLength(3);
    expect(detail.evidence[0]).toEqual({
      code: 'streak_days', summary: 'Streak: 3 days', window: '7d', count: 3,
    });
    expect(JSON.stringify(detail)).not.toContain('hidden');

    expect(detail.changes).toEqual({
      added: [{ title: 'Latihan soal aljabar', duration_estimate: 30 }],
      modified: [{ title: 'Rangkuman bab 3', planned_date: '2026-09-26' }],
      removed: [{ title: 'Baca buku', duration_estimate: 20 }],
      rescheduled: [],
    });
    expect(detail).not.toHaveProperty('input_context');
    expect(detail).not.toHaveProperty('output');
  });

  test('returns 404 when the proposal does not exist', async () => {
    repos.adaptiveProposal.findByIdOwned.mockResolvedValue(null);
    await expect(adaptiveProposalService.getById(USER_ID, PROPOSAL_ID))
      .rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});
