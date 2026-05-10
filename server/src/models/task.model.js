const { z } = require('zod');

const taskStatusEnum = z.enum(['todo', 'in_progress', 'done', 'completed', 'skipped']);
const taskSourceEnum = z.enum(['manual', 'ai', 'coach']);
const plannedSlotEnum = z.enum(['morning', 'afternoon', 'evening']);
const taskTypeEnum = z.enum(['acquire', 'practice', 'recall', 'interleave', 'synthesize', 'review', 'assess', 'reflect']);

const TaskEntity = z.object({
  id: z.string().uuid(),
  goal_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  duration_estimate: z.number().int(),
  planned_date: z.string().nullable(),
  planned_slot: plannedSlotEnum.nullable(),
  status: taskStatusEnum,
  source: taskSourceEnum,
  actual_duration: z.number().int().nullable(),
  completed_at: z.string().datetime().nullable(),
  rationale: z.string().nullable(),
  task_type: taskTypeEnum.nullable(),
  skip_reason: z.string().nullable(),
  feedback_difficulty: z.number().int().nullable(),
  feedback_focus: z.number().int().nullable(),
  feedback_notes: z.string().nullable(),
  feedback_submitted_at: z.string().datetime().nullable(),
  personal_notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable(),
});

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  duration_estimate: z.number().int().min(25).max(90),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  planned_slot: plannedSlotEnum.optional(),
  goal_id: z.string().uuid(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  duration_estimate: z.number().int().min(25).max(90).optional(),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  planned_slot: plannedSlotEnum.optional(),
  status: taskStatusEnum.optional(),
  actual_duration: z.number().int().nullable().optional(),
  personal_notes: z.string().nullable().optional(),
});

const LLMTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string(),
  task_type: taskTypeEnum.optional(),
  duration_estimate: z.number().int().min(10).max(90),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  planned_slot: plannedSlotEnum,
  priority: z.enum(['high', 'medium', 'low']).optional(),
  completion_criteria: z.string().optional(),
  prerequisites: z.array(z.string()).optional(),
  rationale: z.string().min(1),
});

module.exports = {
  TaskEntity,
  createTaskSchema,
  updateTaskSchema,
  LLMTaskSchema,
  taskStatusEnum,
  taskSourceEnum,
  plannedSlotEnum,
  taskTypeEnum,
};
