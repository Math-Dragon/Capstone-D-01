# Extension Guide

Pelajari cara menambah fitur baru, endpoint API, halaman, dan komponen dalam proyek AI Learning Plan.

## Daftar Isi

1. [Adding a New Feature (Client)](#adding-a-new-feature-client)
2. [Adding API Endpoints (Server)](#adding-api-endpoints-server)
3. [Adding Database Migrations](#adding-database-migrations)
4. [Adding New Pages](#adding-new-pages)
5. [Adding Components](#adding-components)
6. [Adding AI Coach Features](#adding-ai-coach-features)

---

## Adding a New Feature (Client)

### Step 1: Create Feature Directory

```
client/src/features/
└── journal/              # New feature
    ├── components/       # Feature-specific components
    ├── hooks/           # Custom hooks
    ├── services/        # API service calls
    └── schemas.js       # Zod validation schemas
```

**Atau jika pakai Redux slice:**

```
client/src/features/
└── journal/
    ├── components/
    ├── hooks/
    ├── services/
    ├── slices/          # Redux slice
    └── schemas.js
```

### Step 2: Create Service

```javascript
// client/src/features/journal/services/journalService.js
import api from '../../../services/api';

export const journalService = {
  getAll: () => api.get('/journal'),

  getById: (id) => api.get(`/journal/${id}`),

  create: (data) => api.post('/journal', data),

  update: (id, data) => api.put(`/journal/${id}`, data),

  delete: (id) => api.delete(`/journal/${id}`),
};
```

### Step 3: Create Redux Slice

```javascript
// client/src/features/journal/slices/journalSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { journalService } from '../services/journalService';

export const fetchJournals = createAsyncThunk(
  'journal/fetch',
  async () => await journalService.getAll()
);

export const createJournal = createAsyncThunk(
  'journal/create',
  async (data) => await journalService.create(data)
);

const journalSlice = createSlice({
  name: 'journal',
  initialState: { items: [], loading: false, error: null },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJournals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJournals.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchJournals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createJournal.fulfilled, (state, action) => {
        state.items.push(action.payload);
      });
  },
});

export const { clearError } = journalSlice.actions;
export default journalSlice.reducer;
```

### Step 4: Register Slice di Store

```javascript
// client/src/store/index.js
import journalReducer from '../features/journal/slices/journalSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    goals: goalsReducer,
    observability: observabilityReducer,
    journal: journalReducer,  // Add new slice
  },
});
```

### Step 5: Create Custom Hook

```javascript
// client/src/features/journal/hooks/useJournals.js
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { fetchJournals, createJournal } from '../slices/journalSlice';

export function useJournals() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector(state => state.journal);

  const loadJournals = useCallback(() => {
    dispatch(fetchJournals());
  }, [dispatch]);

  const addJournal = useCallback((data) => {
    return dispatch(createJournal(data)).unwrap();
  }, [dispatch]);

  return { items, loading, error, loadJournals, addJournal };
}
```

### Step 6: Create Components

```javascript
// client/src/features/journal/components/JournalList.jsx
import { useEffect } from 'react';
import { useJournals } from '../hooks/useJournals';
import { JournalCard } from './JournalCard';

export function JournalList() {
  const { items, loading, error, loadJournals } = useJournals();

  useEffect(() => { loadJournals(); }, [loadJournals]);

  if (loading) return <Skeleton />;
  if (error) return <ErrorBanner message={error} />;
  if (!items.length) return <EmptyState message="Belum ada jurnal" />;

  return items.map(journal => (
    <JournalCard key={journal.id} journal={journal} />
  ));
}
```

---

## Adding API Endpoints (Server)

### Step 1: Create Route

```javascript
// server/src/routes/journal.js
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { journalService } from '../services/journal.service.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const journals = await journalService.getAll(req.userId);
    res.json({ success: true, data: journals });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const journal = await journalService.create(req.userId, req.body);
    res.status(201).json({ success: true, data: journal });
  } catch (err) {
    next(err);
  }
});

export default router;
```

### Step 2: Create Service

```javascript
// server/src/services/journal.service.js
import { journalRepository } from '../repositories/journal.repository.js';
import { createJournalSchema } from '../schemas/journal.schema.js';

export const journalService = {
  getAll: async (userId) => {
    return journalRepository.findAllByUserId(userId);
  },

  create: async (userId, data) => {
    const validated = createJournalSchema.parse(data);
    return journalRepository.create({ ...validated, userId });
  },
};
```

### Step 3: Create Repository

```javascript
// server/src/repositories/journal.repository.js
import db from '../db.js';

export const journalRepository = {
  findAllByUserId: async (userId) => {
    const { rows } = await db.query(
      'SELECT * FROM journals WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },

  create: async ({ userId, title, content, mood }) => {
    const { rows } = await db.query(
      `INSERT INTO journals (user_id, title, content, mood)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, title, content, mood]
    );
    return rows[0];
  },
};
```

### Step 4: Register Route

```javascript
// server/src/app.js
import journalRouter from './routes/journal.js';

app.use('/api/journal', journalRouter);  // Add new route
```

---

## Adding Database Migrations

```bash
cd server
npm run migrate:create add-journals-table
```

```javascript
// server/src/migrations/1700000000013_add-journals-table.js
export const up = (pgm) => {
  pgm.createTable('journals', {
    id: { type: 'uuid', primary: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'cascade' },
    title: { type: 'varchar(255)', notNull: true },
    content: { type: 'text', notNull: true },
    mood: { type: 'varchar(50)' },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
    updated_at: { type: 'timestamp', default: pgm.func('now()') },
  });

  pgm.createIndex('journals', 'user_id');
};

export const down = (pgm) => {
  pgm.dropTable('journals');
};
```

```bash
npm run migrate:up
```

---

## Adding New Pages

### Step 1: Create Page Component

```javascript
// client/src/pages/JournalPage.jsx
import { JournalList } from '../features/journal/components/JournalList';

export function JournalPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Jurnal Belajar</h1>
      <JournalList />
    </div>
  );
}
```

### Step 2: Add Route

```javascript
// client/src/App.jsx
import { Routes, Route } from 'react-router-dom';
import { JournalPage } from './pages/JournalPage';

function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/goals" element={<GoalDetailPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/journal" element={<JournalPage />} />  {/* New route */}
        </Route>
      </Route>
    </Routes>
  );
}
```

### Step 3: Add Navigation

```javascript
// client/src/components/layout/Sidebar.jsx
import { Link } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: HomeIcon },
  { path: '/goals', label: 'Goals', icon: TargetIcon },
  { path: '/progress', label: 'Progress', icon: ChartIcon },
  { path: '/journal', label: 'Jurnal', icon: BookIcon },  // New nav item
];
```

---

## Adding Components

### UI Component Template

```javascript
// client/src/components/ui/Modal.jsx
import { useEffect } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div ref={modalRef} className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

---

## Adding AI Coach Features

### Custom Coach Action

```javascript
// server/src/services/coach/dispatch.service.js
const ACTIONS = {
  generate_plan: handleGeneratePlan,
  adjust_schedule: handleAdjustSchedule,
  provide_feedback: handleProvideFeedback,
  answer_question: handleAnswerQuestion,
  motivate: handleMotivate,
  analyze_progress: handleAnalyzeProgress,  // New action
};
```

### Custom Context Builder

```javascript
// server/src/services/coach/context-builder.service.js
async function buildContext(userId) {
  return {
    goals: await goalService.getAll(userId),
    tasks: await taskService.getAll(userId),
    progress: await progressService.getStats(userId),
    streak: await coachService.getStreak(userId),
    journals: await journalService.getAll(userId),  // Add context
  };
}
```

---

## Quick Checklist

Saat menambah fitur baru:

- [ ] Buat migration (jika ada perubahan database)
- [ ] Buat model (jika ada tabel baru)
- [ ] Buat repository
- [ ] Buat service
- [ ] Buat route + register di app.js
- [ ] Buat service di client
- [ ] Buat Redux slice (jika perlu state global)
- [ ] Buat hook
- [ ] Buat component
- [ ] Buat halaman + register route
- [ ] Tambah navigasi
- [ ] Validasi input dengan Zod (client + server)
- [ ] Tambah error handling
- [ ] Test endpoint
- [ ] Test UI
