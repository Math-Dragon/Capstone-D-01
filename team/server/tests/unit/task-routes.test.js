jest.mock('../../src/services/task.service', () => ({
  list: jest.fn(),
  create: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  reschedule: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('../../src/middleware/authenticate', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@test.com' };
    next();
  },
}));

const express = require('express');
const request = require('supertest');
const taskService = require('../../src/services/task.service');
const router = require('../../src/routes/tasks');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/tasks', router);
  app.use((err, req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: { code: err.code, message: err.message } });
  });
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('task route status transitions', () => {
  test('PATCH /api/tasks/:id/status allows todo to done', async () => {
    taskService.getById.mockResolvedValue({ id: 't1', status: 'todo' });
    taskService.updateStatus.mockResolvedValue({ id: 't1', status: 'done' });

    const res = await request(createApp())
      .patch('/api/tasks/t1/status')
      .send({ status: 'done' });

    expect(res.status).toBe(200);
    expect(taskService.updateStatus).toHaveBeenCalledWith('test-user-id', 't1', 'done', {
      actual_duration: undefined,
      skip_reason: undefined,
    });
  });

  test('PATCH /api/tasks/:id/status rejects done to todo', async () => {
    taskService.getById.mockResolvedValue({ id: 't1', status: 'done' });
    taskService.updateStatus.mockRejectedValue(Object.assign(new Error("Transition from 'done' to 'todo' is not allowed"), {
      statusCode: 400,
      code: 'INVALID_TRANSITION',
    }));

    const res = await request(createApp())
      .patch('/api/tasks/t1/status')
      .send({ status: 'todo' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });
});

describe('task route reschedule', () => {
  test('PATCH /api/tasks/:id/reschedule updates planned date and slot', async () => {
    taskService.reschedule.mockResolvedValue({
      id: 't1',
      planned_date: '2026-06-09',
      planned_slot: 'afternoon',
    });

    const res = await request(createApp())
      .patch('/api/tasks/t1/reschedule')
      .send({ planned_date: '2026-06-09', planned_slot: 'afternoon' });

    expect(res.status).toBe(200);
    expect(res.body.data.planned_date).toBe('2026-06-09');
    expect(taskService.reschedule).toHaveBeenCalledWith('test-user-id', 't1', {
      planned_date: '2026-06-09',
      planned_slot: 'afternoon',
    });
  });

  test('PATCH /api/tasks/:id/reschedule rejects invalid date', async () => {
    const res = await request(createApp())
      .patch('/api/tasks/t1/reschedule')
      .send({ planned_date: '2026-99-99', planned_slot: 'morning' });

    expect(res.status).toBe(400);
    expect(taskService.reschedule).not.toHaveBeenCalled();
  });
});
