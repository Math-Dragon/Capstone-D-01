const { errorHandler } = require('../../src/middleware/errorHandler');

jest.mock('../../src/utils/logger', () => ({ error: jest.fn() }));

function buildMocks() {
  const req = { requestId: 'test-req-id' };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { req, res, next };
}

describe('errorHandler', () => {
  test('handles ZodError with 400', () => {
    const { req, res, next } = buildMocks();
    const err = { name: 'ZodError', errors: [{ message: 'Invalid field' }] };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid field', details: err.errors },
    }));
  });

  test('handles ZodError with no error message', () => {
    const { req, res, next } = buildMocks();
    const err = { name: 'ZodError', errors: [] };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: [] },
    }));
  });

  test('handles AI_OUTPUT_INVALID with 422', () => {
    const { req, res, next } = buildMocks();
    const err = { code: 'AI_OUTPUT_INVALID', message: 'Output schema mismatch' };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: { code: 'AI_OUTPUT_INVALID', message: 'Output schema mismatch' },
    }));
  });

  test('handles AI_TIMEOUT with 504', () => {
    const { req, res, next } = buildMocks();
    const err = { code: 'AI_TIMEOUT', message: 'LLM timed out' };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(504);
  });

  test('handles AI_UNAVAILABLE with 503', () => {
    const { req, res, next } = buildMocks();
    const err = { code: 'AI_UNAVAILABLE', message: 'All providers failed' };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  test('handles PG unique violation 23505 with 409', () => {
    const { req, res, next } = buildMocks();
    const err = { code: '23505', message: 'duplicate key' };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: { code: 'CONFLICT', message: 'Resource already exists' },
    }));
  });

  test('handles PG foreign key violation 23503 with 400', () => {
    const { req, res, next } = buildMocks();
    const err = { code: '23503', message: 'foreign key violation' };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: { code: 'INVALID_REFERENCE', message: 'Referenced resource not found' },
    }));
  });

  test('handles generic error with statusCode', () => {
    const { req, res, next } = buildMocks();
    const err = { statusCode: 404, message: 'Not found', code: 'NOT_FOUND' };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: { code: 'NOT_FOUND', message: 'Not found' },
    }));
  });

  test('handles generic error with 500 fallback', () => {
    const { req, res, next } = buildMocks();
    const err = { message: 'Something broke' };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: { code: 'INTERNAL_ERROR', message: 'Something broke' },
    }));
  });

  test('handles error with _meta field', () => {
    const { req, res, next } = buildMocks();
    const err = { statusCode: 400, message: 'Bad', _meta: { field: 'test' } };
    errorHandler(err, req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      meta: expect.objectContaining({ request_id: 'test-req-id', field: 'test' }),
    }));
  });

  test('handles error with no requestId on req', () => {
    const { req, res, next } = buildMocks();
    delete req.requestId;
    const err = { message: 'Error' };
    errorHandler(err, req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      meta: { request_id: 'unknown' },
    }));
  });
});
