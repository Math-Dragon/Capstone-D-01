const { z } = require('zod');
const {
  taskStatusEnum,
  taskSourceEnum,
  plannedSlotEnum,
  taskTypeEnum,
} = require('../constants/enums');

function isValidCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

const plannedDateSchema = z.string().refine(isValidCalendarDate, {
  message: 'Invalid calendar date',
});

const rationaleFactorSchema = z.object({
  factor: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
});

const rationaleSchema = z.union([
  z.string().trim().min(1),
  z.array(rationaleFactorSchema).min(1),
]);

const confidenceEnum = z.enum(['low', 'medium', 'high']);

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
  planned_date: plannedDateSchema.optional(),
  planned_slot: plannedSlotEnum.optional(),
  goal_id: z.string().uuid(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  duration_estimate: z.number().int().min(25).max(90).optional(),
  planned_date: plannedDateSchema.nullable().optional(),
  planned_slot: plannedSlotEnum.optional(),
  status: taskStatusEnum.optional(),
  actual_duration: z.number().int().nullable().optional(),
  personal_notes: z.string().nullable().optional(),
});

const LLMTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(255),
  description: z.string(),
  task_type: taskTypeEnum.optional(),
  duration_estimate: z.number().int().min(25).max(90),
  planned_date: plannedDateSchema,
  planned_slot: plannedSlotEnum,
  priority: z.enum(['high', 'medium', 'low']).optional(),
  completion_criteria: z.string().optional(),
  prerequisites: z.array(z.string()).optional(),
  rationale: rationaleSchema,
  confidence: confidenceEnum.optional(),
});

const VALID_TRANSITIONS = Object.freeze({
  todo:        ['in_progress', 'done', 'skipped'],
  in_progress: ['done', 'skipped'],
  done:        [],
  skipped:     [],
});

const statusTransitionSchema = z.object({
  status: taskStatusEnum,
  actual_duration: z.number().int().min(1).max(180).optional(),
  skip_reason: z.string().max(100).optional(),
});

const rescheduleTaskSchema = z.object({
  planned_date: plannedDateSchema,
  planned_slot: plannedSlotEnum,
});

module.exports = {
  TaskEntity,
  createTaskSchema,
  updateTaskSchema,
  LLMTaskSchema,
  rationaleFactorSchema,
  rationaleSchema,
  confidenceEnum,
  plannedDateSchema,
  statusTransitionSchema,
  rescheduleTaskSchema,
  VALID_TRANSITIONS,
  taskStatusEnum,
  taskSourceEnum,
  plannedSlotEnum,
  taskTypeEnum,
};
