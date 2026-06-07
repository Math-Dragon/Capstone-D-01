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

Test configuration ditambahkan ke `vite.config.js`:

```javascript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './tests/setup.js',
  css: true,
}
```

Setup file (`client/tests/setup.js`):

```javascript
import '@testing-library/jest-dom';
```

### Backend (server/)

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.0.0"
  }
}
```

### Test Setup File (Backend)

```javascript
// server/tests/setup.js
const { pool } = require('../src/db');

beforeAll(async () => {
  await pool.query('SELECT 1');
});

afterAll(async () => {
  await pool.end();
});
```

---

## Running Tests

### Frontend Commands

```bash
cd client

# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Backend Commands

```bash
cd server

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx jest tests/unit/auth.test.js
```

---

## Test Structure

### Frontend Tests

```
client/tests/
├── setup.js                     # Test configuration
├── components/
│   ├── StreakBadge.test.jsx     # Streak badge component tests
│   └── TaskCard.test.jsx        # Task card component tests
├── features/
│   ├── auth/
│   │   └── authSlice.test.js    # Auth reducer tests
│   └── goals/
│       └── goalsSlice.test.js   # Goals reducer + async thunk tests
└── utils/
    └── helpers.test.js          # Pure utility function tests
```

### Backend Tests

```
server/tests/
├── setup.js              # Test configuration
├── smoke.test.js         # Basic health check test
├── fixtures/
│   └── goals.json        # Goal fixture data
├── unit/
│   ├── auth.test.js      # Auth endpoint validation tests
│   ├── health.test.js    # Health & metrics endpoint tests
│   ├── llm.test.js       # LLM output validation & Zod schema tests
│   ├── llm-mock.test.js  # Mock LLM suggestion generator tests
│   └── routes.test.js    # Protected routes auth guard tests
└── integration/
    └── goals.test.js     # Goals CRUD integration tests
```

---

## Writing Tests

### Redux Slice Test (Frontend)

```javascript
// client/tests/features/auth/authSlice.test.js
import { describe, it, expect } from 'vitest';
import authReducer, { setUser, logout } from '../../../src/store/slices/authSlice';

describe('authSlice', () => {
  const initialState = {
    user: null, isAuthenticated: false, loading: false, error: null,
  };

  it('should handle setUser with user data', () => {
    const user = { id: 1, email: 'test@example.com' };
    const actual = authReducer(initialState, setUser(user));
    expect(actual.user).toEqual(user);
    expect(actual.isAuthenticated).toBe(true);
  });

  it('should handle logout', () => {
    const state = { ...initialState, user: { id: 1 }, isAuthenticated: true };
    const actual = authReducer(state, logout());
    expect(actual.user).toBeNull();
    expect(actual.isAuthenticated).toBe(false);
  });
});
```

### Component Test (Frontend)

```javascript
// client/tests/components/StreakBadge.test.jsx
import { render, screen } from '@testing-library/react';
import StreakBadge from '../../src/components/StreakBadge';

describe('StreakBadge', () => {
  it('renders null when streak is 0', () => {
    const { container } = render(<StreakBadge streak={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('displays streak count', () => {
    render(<StreakBadge streak={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('hari streak')).toBeInTheDocument();
  });

  it('renders fire emoji for active streak', () => {
    render(<StreakBadge streak={7} />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });
});
```

### Auth Endpoint Test (Backend)

```javascript
// server/tests/unit/auth.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('POST /api/auth/register validation', () => {
  test('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'Passw0rd' });
    expect([400, 429]).toContain(res.status);
  });
});
```

### LLM Mock Test

```javascript
// server/tests/unit/llm-mock.test.js
const { generateMockSuggestion } = require('../../src/services/llm-mock');

describe('generateMockSuggestion', () => {
  test('returns valid schema-conforming output', () => {
    const result = generateMockSuggestion(makeContext());
    expect(result.tasks.length).toBeGreaterThanOrEqual(2);
    expect(result.tasks.length).toBeLessThanOrEqual(5);
    expect(result.summary).toContain('[MOCK]');
  });
});
```

### Smoke Test

```javascript
// server/tests/smoke.test.js
require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');

describe('Smoke Tests', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});
```

### Goals Integration Test (Backend)

```javascript
// server/tests/integration/goals.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');

let accessToken;
let testGoalId;

beforeAll(async () => {
  // Register + login to get JWT token
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@example.com', password: 'TestPass1' });
  accessToken = loginRes.body.data.accessToken;
});

test('POST /api/goals creates a new goal', async () => {
  const res = await request(app)
    .post('/api/goals')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ title: 'Belajar Node.js', deadline: '2026-06-01' });
  expect(res.status).toBe(201);
  testGoalId = res.body.data.id;
});

test('GET /api/goals/:id returns goal with tasks', async () => {
  const res = await request(app)
    .get(`/api/goals/${testGoalId}`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(res.status).toBe(200);
  expect(res.body.data.id).toBe(testGoalId);
});
```

---

## Test Examples

### Mocking API Calls

```javascript
// Mock axios/API calls in Redux slice tests
import { vi } from 'vitest';

vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue([
      { id: 1, title: 'Belajar React', status: 'active' },
    ]),
    post: vi.fn().mockResolvedValue({ id: 2, title: 'New Goal' }),
  },
}));
```

### Test Database Fixtures

```json
// server/tests/fixtures/goals.json
[
  {
    "id": "00000000-0000-0000-0000-000000000001",
    "title": "Belajar React",
    "status": "active",
    "deadline": "2026-06-01T00:00:00.000Z"
  }
]
```

### API Integration Test

Integration test menguji full CRUD lifecycle dengan real database dan JWT authentication. Contoh lengkap di `server/tests/integration/goals.test.js`.

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
cd client && npm run test:coverage

# Backend
cd server && npm run test:coverage
```

> **Catatan:** Coverage thresholds (statements 80%, branches 75%, functions 80%, lines 80%) belum dikonfigurasi di Jest/Vitest config.

View detailed report di `coverage/lcov-report/index.html`.
