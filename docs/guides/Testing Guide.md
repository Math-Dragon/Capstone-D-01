# Testing Guide

## Daftar Isi

1. [Setup](#setup)
2. [Running Tests](#running-tests)
3. [Test Structure](#test-structure)
4. [Writing Tests](#writing-tests)
5. [Test Examples](#test-examples)

---

## Setup

### Frontend (client/)

Dependencies testing sudah include di package.json:

```json
{
  "devDependencies": {
    "vitest": "^3.2.4",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^26.0.0"
  }
}
```

### Backend (server/)

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "@jest/globals": "^29.7.0",
    "supertest": "^7.0.0"
  }
}
```

### Test Setup File (Backend)

```javascript
// server/tests/setup.js
import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';

// Mock database
jest.mock('../src/db.js', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
  isHealthy: jest.fn().mockResolvedValue(true),
}));
```

---

## Running Tests

### Frontend Commands

```bash
cd client

# Run tests once
npx vitest run

# Run tests in watch mode
npx vitest

# Run with coverage
npx vitest run --coverage
```

### Backend Commands

```bash
cd server

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npx jest tests/unit/auth.test.js
```

### Coverage Target

| Type | Target |
|------|--------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

---

## Test Structure

### Frontend Tests

```
client/tests/
├── setup.js              # Test configuration
├── components/           # Component tests
│   ├── StreakBadge.test.jsx
│   └── TaskCard.test.jsx
├── features/             # Feature tests
│   ├── auth/
│   │   └── authSlice.test.js
│   └── goals/
│       └── goalsSlice.test.js
└── utils/                # Utility tests
    └── helpers.test.js
```

### Backend Tests

```
server/tests/
├── setup.js              # Test configuration
├── smoke.test.js         # Basic health check test
└── unit/
    ├── auth.test.js      # Auth service/route tests
    └── llm-mock.test.js  # LLM mock tests
```

---

## Writing Tests

### Redux Slice Test (Frontend)

```javascript
// client/tests/features/auth/authSlice.test.js
import { describe, it, expect } from 'vitest';
import authReducer, {
  login,
  logout,
  clearError,
} from '../../../src/features/auth/slices/authSlice';

describe('authSlice', () => {
  const initialState = {
    user: null,
    token: null,
    loading: false,
    error: null,
  };

  it('should return initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle login.pending', () => {
    const actual = authReducer(initialState, login.pending());
    expect(actual.loading).toBe(true);
    expect(actual.error).toBeNull();
  });

  it('should handle login.fulfilled', () => {
    const payload = {
      user: { id: 1, email: 'test@example.com' },
      token: 'jwt-token',
    };

    const actual = authReducer(
      { ...initialState, loading: true },
      login.fulfilled(payload)
    );

    expect(actual.loading).toBe(false);
    expect(actual.user).toEqual(payload.user);
    expect(actual.token).toBe(payload.token);
  });

  it('should handle login.rejected', () => {
    const error = 'Invalid credentials';

    const actual = authReducer(
      { ...initialState, loading: true },
      login.rejected(new Error(error), '', { email: '', password: '' })
    );

    expect(actual.loading).toBe(false);
    expect(actual.error).toBe(error);
  });

  it('should handle logout', () => {
    const stateWithUser = {
      ...initialState,
      user: { id: 1, email: 'test@example.com' },
      token: 'jwt-token',
    };

    const actual = authReducer(stateWithUser, logout());

    expect(actual.user).toBeNull();
    expect(actual.token).toBeNull();
  });

  it('should handle clearError', () => {
    const stateWithError = { ...initialState, error: 'Something went wrong' };
    const actual = authReducer(stateWithError, clearError());
    expect(actual.error).toBeNull();
  });
});
```

### Auth Service Test (Backend)

```javascript
// server/tests/unit/auth.test.js
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { authService } from '../../src/services/auth.service.js';
import db from '../../src/db.js';

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const mockUser = {
        id: 'uuid-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error for duplicate email', async () => {
      db.query.mockRejectedValueOnce({ code: '23505' }); // unique violation

      await expect(authService.register({
        email: 'existing@example.com',
        password: 'password123',
      })).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const hashedPassword = '$2b$10$...'; // bcrypt hash
      const mockUser = {
        id: 'uuid-123',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
      };

      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
    });

    it('should reject invalid password', async () => {
      const mockUser = { id: '1', email: 'test@example.com', password: 'hashed' };
      db.query.mockResolvedValueOnce({ rows: [mockUser] });

      await expect(authService.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      })).rejects.toThrow('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await expect(authService.login({
        email: 'nonexistent@example.com',
        password: 'password123',
      })).rejects.toThrow('Invalid credentials');
    });
  });
});
```

### LLM Mock Test

```javascript
// server/tests/unit/llm-mock.test.js
import { describe, it, expect } from '@jest/globals';
import { mockLLM } from '../../src/services/llm-mock.js';

describe('mockLLM', () => {
  it('should return mock plan suggestions', async () => {
    const result = await mockLLM.generate({
      prompt: 'generate plan',
      userId: 'test-user',
    });

    expect(result).toHaveProperty('tasks');
    expect(result).toHaveProperty('summary');
    expect(Array.isArray(result.tasks)).toBe(true);
  });

  it('should return tasks with valid structure', async () => {
    const result = await mockLLM.generate({
      prompt: 'generate plan',
      userId: 'test-user',
    });

    const task = result.tasks[0];
    expect(task).toHaveProperty('title');
    expect(task).toHaveProperty('type');
    expect(task).toHaveProperty('duration_minutes');
    expect(task).toHaveProperty('slot');
    expect(['morning', 'afternoon', 'evening']).toContain(task.slot);
  });
});
```

### Smoke Test

```javascript
// server/tests/smoke.test.js
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

describe('Health Check', () => {
  it('should return health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.status).toBe(404);
  });
});
```

### Component Test

```javascript
// client/tests/components/StreakBadge.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StreakBadge } from '../../src/components/StreakBadge';

describe('StreakBadge', () => {
  it('should display streak count', () => {
    render(<StreakBadge streak={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display motivational text for zero streak', () => {
    render(<StreakBadge streak={0} />);
    expect(screen.getByText(/mulai streak/i)).toBeInTheDocument();
  });

  it('should display fire emoji for active streak', () => {
    render(<StreakBadge streak={7} />);
    expect(screen.getByText(/🔥/)).toBeInTheDocument();
  });
});
```

---

## Test Examples

### Mocking API Calls

```javascript
// Mock axios in component test
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: [
        { id: 1, title: 'Belajar React', status: 'completed' },
        { id: 2, title: 'Belajar Node.js', status: 'in_progress' },
      ]
    }),
    post: vi.fn().mockResolvedValue({
      data: { id: 3, title: 'New Goal', status: 'pending' }
    }),
  },
}));
```

### Test Database Fixtures

```javascript
// server/tests/fixtures/goals.json
[
  {
    "id": "uuid-1",
    "user_id": "uuid-user-1",
    "title": "Belajar React",
    "deadline": "2026-06-01T00:00:00Z",
    "status": "active",
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

### API Integration Test

```javascript
// server/tests/integration/goals.test.js
import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';

describe('Goals API', () => {
  const mockToken = 'valid-jwt-token';

  beforeAll(() => {
    // Mock authentication
    jest.spyOn(authMiddleware, 'authenticate')
      .mockImplementation((req, res, next) => {
        req.userId = 'test-user-id';
        next();
      });
  });

  it('GET /api/goals should return goals list', async () => {
    const res = await request(app)
      .get('/api/goals')
      .set('Authorization', `Bearer ${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/goals should create a new goal', async () => {
    const newGoal = {
      title: 'Belajar Node.js',
      deadline: '2026-06-01T00:00:00Z',
    };

    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${mockToken}`)
      .send(newGoal);

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Belajar Node.js');
  });
});
```

---

## Best Practices

| Do | Don't |
|----|-------|
| Test behavior, not implementation | Test implementation details |
| Gunakan meaningful test names | Gunakan vague names ("test1") |
| AAA pattern (Arrange, Act, Assert) | Mix multiple tests dalam satu it |
| Test happy path AND edge cases | Hanya test happy path |
| Keep tests independent | Rely on test execution order |
| Mock external dependencies (DB, API) | Buat real API calls |
| Test error states | Asumsi selalu sukses |
| Test loading states | Skip loading state testing |
| Cleanup setelah test | Biarkan side effects |

## Coverage Report

```bash
# Frontend
cd client && npx vitest run --coverage

# Backend
cd server && npm run test:coverage
```

View detailed report di `coverage/lcov-report/index.html`.
