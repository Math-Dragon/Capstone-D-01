const { z } = require('zod');

const taskStatusEnum = z.enum(['todo', 'in_progress', 'done', 'completed', 'skipped']);
const taskSourceEnum = z.enum(['manual', 'ai', 'coach']);
const plannedSlotEnum = z.enum(['morning', 'afternoon', 'evening']);
const taskTypeEnum = z.enum(['acquire', 'practice', 'recall', 'interleave', 'synthesize', 'review', 'assess', 'reflect']);

const goalStatusEnum = z.enum(['active', 'completed', 'archived']);

const preferredTimeEnum = z.enum(['morning', 'afternoon', 'evening']);

const coachActionEnum = z.enum([
  'INITIAL_PLAN', 'CHECK_IN', 'COMPLETE_TASK', 'SKIP_TASK',
  'MODIFY_TASK', 'SUBMIT_FEEDBACK', 'REQUEST_ADJUSTMENT',
  'CHAT_MESSAGE', 'CRISIS_SIGNAL', 'ACCEPT_PROPOSAL', 'UNDO_PLAN',
]);

const messageRoleEnum = z.enum(['user', 'assistant', 'system', 'coach', 'student']);

const recommendationStatusEnum = z.enum(['pending', 'accepted', 'rejected']);

module.exports = {
  taskStatusEnum,
  taskSourceEnum,
  plannedSlotEnum,
  taskTypeEnum,
  goalStatusEnum,
  preferredTimeEnum,
  coachActionEnum,
  messageRoleEnum,
  recommendationStatusEnum,
};
