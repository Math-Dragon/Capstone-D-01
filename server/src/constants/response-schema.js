const taskResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    task_type: {
      type: 'string',
      enum: ['acquire', 'practice', 'recall', 'interleave', 'synthesize', 'review', 'assess', 'reflect'],
    },
    duration_estimate: { type: 'integer', minimum: 25, maximum: 90 },
    planned_date: { type: 'string' },
    planned_slot: {
      type: 'string',
      enum: ['morning', 'afternoon', 'evening'],
    },
    priority: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
    },
    completion_criteria: { type: 'string' },
    prerequisites: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
  },
  required: ['title', 'description', 'duration_estimate', 'planned_date', 'planned_slot', 'rationale'],
};

const _planObjectSchema = {
  type: 'object',
  properties: {
    tasks: { type: 'array', items: taskResponseSchema, minItems: 1 },
    summary: { type: 'string' },
    next_check_in: { type: 'string' },
    adaptation_notes: { type: 'string' },
  },
  required: ['tasks', 'summary'],
};

const planResponseSchema = { ..._planObjectSchema };

const chatResponseSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    plan: { anyOf: [{ type: 'null' }, _planObjectSchema] },
  },
  required: ['message', 'plan'],
};

module.exports = { taskResponseSchema, planResponseSchema, chatResponseSchema };
