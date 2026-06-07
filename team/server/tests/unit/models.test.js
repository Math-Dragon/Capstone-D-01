const { UserEntity, registerSchema, loginSchema } = require('../../src/models/user.model');
const { createGoalSchema, updateGoalSchema } = require('../../src/models/goal.model');
const { TaskEntity, createTaskSchema } = require('../../src/models/task.model');
const { coachRequestSchema } = require('../../src/models/coach.model');
const { RefreshTokenEntity } = require('../../src/models/refresh-token.model');
const { AuditLogEntity } = require('../../src/models/audit-log.model');
const { PlanSnapshotEntity } = require('../../src/models/plan-snapshot.model');
const { ProgressSnapshotEntity } = require('../../src/models/progress-snapshot.model');
const { ChatMessageEntity, messageRoleEnum } = require('../../src/models/chat-message.model');
const { ProfileEntity, preferredTimeEnum } = require('../../src/models/profile.model');
const { StudentMetricsEntity } = require('../../src/models/student-metrics.model');

describe('User Models', () => {
  describe('registerSchema', () => {
    test('accepts valid registration', () => {
      const result = registerSchema.safeParse({ email: 'test@example.com', password: 'Secure1Pass' });
      expect(result.success).toBe(true);
    });

    test('rejects invalid email', () => {
      const result = registerSchema.safeParse({ email: 'not-email', password: 'Secure1Pass' });
      expect(result.success).toBe(false);
    });

    test('rejects password without uppercase', () => {
      const result = registerSchema.safeParse({ email: 'test@example.com', password: 'alllower1' });
      expect(result.success).toBe(false);
    });

    test('rejects password without digit', () => {
      const result = registerSchema.safeParse({ email: 'test@example.com', password: 'NoDigits' });
      expect(result.success).toBe(false);
    });

    test('rejects short password', () => {
      const result = registerSchema.safeParse({ email: 'test@example.com', password: 'Ab1' });
      expect(result.success).toBe(false);
    });

    test('accepts optional fields', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com', password: 'Secure1Pass',
        timezone: 'Asia/Jakarta', preferred_time: 'morning', weekly_target_hours: 5,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('loginSchema', () => {
    test('accepts valid login', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: 'x' });
      expect(result.success).toBe(true);
    });

    test('rejects empty password', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('UserEntity', () => {
    test('accepts valid user', () => {
      const result = UserEntity.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        password_hash: 'hash',
        created_at: '2026-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Goal Models', () => {
  describe('createGoalSchema', () => {
    test('accepts valid goal', () => {
      const result = createGoalSchema.safeParse({ title: 'Learn React', deadline: '2026-06-01' });
      expect(result.success).toBe(true);
    });

    test('rejects empty title', () => {
      const result = createGoalSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });

    test('rejects invalid deadline format', () => {
      const result = createGoalSchema.safeParse({ title: 'Test', deadline: 'not-a-date' });
      expect(result.success).toBe(false);
    });

    test('accepts optional fields', () => {
      const result = createGoalSchema.safeParse({ title: 'Test', description: 'desc' });
      expect(result.success).toBe(true);
    });
  });

  describe('updateGoalSchema', () => {
    test('accepts partial update', () => {
      const result = updateGoalSchema.safeParse({ title: 'Updated' });
      expect(result.success).toBe(true);
    });

    test('accepts nullable deadline', () => {
      const result = updateGoalSchema.safeParse({ deadline: null });
      expect(result.success).toBe(true);
    });

    test('rejects invalid status', () => {
      const result = updateGoalSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });

    test('accepts valid status', () => {
      const result = updateGoalSchema.safeParse({ status: 'completed' });
      expect(result.success).toBe(true);
    });
  });
});

describe('Task Models', () => {
  describe('createTaskSchema', () => {
    test('accepts valid task', () => {
      const result = createTaskSchema.safeParse({
        title: 'Study', duration_estimate: 30, goal_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    test('rejects duration below min', () => {
      const result = createTaskSchema.safeParse({
        title: 'Study', duration_estimate: 10, goal_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });

    test('rejects duration above max', () => {
      const result = createTaskSchema.safeParse({
        title: 'Study', duration_estimate: 120, goal_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });

    test('rejects invalid goal_id', () => {
      const result = createTaskSchema.safeParse({ title: 'Study', duration_estimate: 30, goal_id: 'not-uuid' });
      expect(result.success).toBe(false);
    });

    test('accepts with planned_date and slot', () => {
      const result = createTaskSchema.safeParse({
        title: 'Study', duration_estimate: 45, goal_id: '550e8400-e29b-41d4-a716-446655440000',
        planned_date: '2026-06-01', planned_slot: 'morning',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('TaskEntity', () => {
    test('accepts valid task entity', () => {
      const result = TaskEntity.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        goal_id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Test', description: null, duration_estimate: 30,
        planned_date: null, planned_slot: null, status: 'todo',
        source: 'manual', actual_duration: null, completed_at: null,
        rationale: null, task_type: null, skip_reason: null,
        feedback_difficulty: null, feedback_focus: null, feedback_notes: null,
        feedback_submitted_at: null, personal_notes: null,
        created_at: '2026-01-01T00:00:00.000Z', updated_at: null,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Coach Models', () => {
  describe('coachRequestSchema', () => {
    test('accepts valid CHAT_MESSAGE action', () => {
      const result = coachRequestSchema.safeParse({ action: 'CHAT_MESSAGE', payload: { message: 'Halo coach' } });
      expect(result.success).toBe(true);
    });

    test('accepts valid CHECK_IN action', () => {
      const result = coachRequestSchema.safeParse({ action: 'CHECK_IN', payload: { mood: 'great' } });
      expect(result.success).toBe(true);
    });

    test('accepts valid COMPLETE_TASK action', () => {
      const result = coachRequestSchema.safeParse({ action: 'COMPLETE_TASK', payload: { taskId: '550e8400-e29b-41d4-a716-446655440000' } });
      expect(result.success).toBe(true);
    });

    test('rejects invalid action', () => {
      const result = coachRequestSchema.safeParse({ action: 'INVALID' });
      expect(result.success).toBe(false);
    });

    test('rejects missing action', () => {
      const result = coachRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe('RefreshTokenEntity', () => {
  test('accepts valid refresh token', () => {
    const result = RefreshTokenEntity.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      token_hash: 'abc123',
      expires_at: '2026-12-31T23:59:59.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  test('rejects invalid uuid', () => {
    const result = RefreshTokenEntity.safeParse({
      id: 'not-uuid',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      token_hash: 'abc123',
      expires_at: '2026-12-31T23:59:59.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('AuditLogEntity', () => {
  test('accepts valid audit log', () => {
    const result = AuditLogEntity.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      recommendation_id: null,
      action: 'TASK_COMPLETED',
      metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  test('accepts nullable user_id and recommendation_id', () => {
    const result = AuditLogEntity.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: null,
      recommendation_id: null,
      action: 'SYSTEM_EVENT',
      metadata: { key: 'val' },
      created_at: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});

describe('PlanSnapshotEntity', () => {
  test('accepts valid snapshot', () => {
    const result = PlanSnapshotEntity.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      trigger_id: 'trigger-123',
      adaptation_type: 'pace_increase',
      tasks_snapshot: [],
      plan_summary: null,
      created_at: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});

describe('ProgressSnapshotEntity', () => {
  test('accepts valid progress snapshot', () => {
    const result = ProgressSnapshotEntity.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      week: '2026-W01',
      planned_hours: 10,
      completed_hours: 8,
      completion_rate: 0.8,
      created_at: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});

describe('ChatMessageEntity', () => {
  test('accepts valid chat message', () => {
    const result = ChatMessageEntity.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      role: 'user',
      content: 'Hello coach',
      plan_snapshot_summary: null,
      session_type: null,
      created_at: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  test('messageRoleEnum accepts valid roles', () => {
    ['user', 'assistant', 'system', 'coach', 'student'].forEach((role) => {
      expect(messageRoleEnum.safeParse(role).success).toBe(true);
    });
  });

  test('messageRoleEnum rejects invalid role', () => {
    expect(messageRoleEnum.safeParse('admin').success).toBe(false);
  });
});

describe('ProfileEntity', () => {
  test('accepts valid profile', () => {
    const result = ProfileEntity.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      timezone: 'Asia/Jakarta',
      preferred_time: 'morning',
      weekly_target_hours: 10,
      availability: { mon: ['09:00-12:00'] },
    });
    expect(result.success).toBe(true);
  });

  test('preferredTimeEnum accepts valid values', () => {
    ['morning', 'afternoon', 'evening'].forEach((val) => {
      expect(preferredTimeEnum.safeParse(val).success).toBe(true);
    });
  });

  test('preferredTimeEnum rejects invalid value', () => {
    expect(preferredTimeEnum.safeParse('night').success).toBe(false);
  });
});

describe('StudentMetricsEntity', () => {
  test('accepts valid metrics', () => {
    const result = StudentMetricsEntity.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      streak_days: 5,
      total_completed: 20,
      total_skipped: 3,
      completion_rate_7d: 0.85,
      completion_rate_3d: 0.9,
      avg_difficulty_7d: 3.5,
      consecutive_skips: 0,
      last_mood: 'motivated',
      last_check_in: '2026-01-01T00:00:00.000Z',
      trigger_cooldowns: {},
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  test('accepts nullable fields', () => {
    const result = StudentMetricsEntity.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440001',
      streak_days: 0,
      total_completed: 0,
      total_skipped: 0,
      completion_rate_7d: 0,
      completion_rate_3d: 0,
      avg_difficulty_7d: 0,
      consecutive_skips: 0,
      last_mood: null,
      last_check_in: null,
      trigger_cooldowns: {},
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});
