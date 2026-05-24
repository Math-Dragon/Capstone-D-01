# Best Practices & Pitfalls

## Daftar Isi

1. [React Best Practices](#react-best-practices)
2. [Redux Best Practices](#redux-best-practices)
3. [Backend Best Practices](#backend-best-practices)
4. [AI Integration Best Practices](#ai-integration-best-practices)
5. [Common Pitfalls](#common-pitfalls)
6. [Code Quality](#code-quality)

---

## React Best Practices

### 1. Gunakan Functional Components

```javascript
// BAD - Class component
class Dashboard extends React.Component {
  render() {
    return <div>Dashboard</div>;
  }
}

// GOOD - Functional component
function Dashboard() {
  return <div>Dashboard</div>;
}
```

### 2. Destructure Props

```javascript
// BAD
function TaskCard(props) {
  return <div>{props.title} - {props.status}</div>;
}

// GOOD
function TaskCard({ title, status }) {
  return <div>{title} - {status}</div>;
}
```

### 3. State Colocation

```javascript
// BAD - State di parent, hanya dipakai di child
function Parent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return <TaskDetailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />;
}

// GOOD - State di tempat pemakaian
function TaskDetailModal() {
  const [isOpen, setIsOpen] = useState(false);
  // ...
}
```

### 4. Memoize Expensive Operations

```javascript
// BAD - Dijalankan setiap render
const sortedTasks = tasks.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));

// GOOD - Hanya jalan saat tasks berubah
const sortedTasks = useMemo(
  () => tasks.sort((a, b) => new Date(b.deadline) - new Date(a.deadline)),
  [tasks]
);
```

### 5. Proper useEffect Usage

```javascript
// BAD - Infinite loop
useEffect(() => {
  setCount(count + 1);
}, [count]);

// BAD - Missing dependency
useEffect(() => {
  fetchGoal(id);
}, []); // Missing id!

// GOOD - Proper dependencies
useEffect(() => {
  fetchGoal(id);
}, [id]);
```

### 6. Handle All States

```javascript
function GoalList() {
  const { items, loading, error } = useSelector(state => state.goals);

  if (loading) return <Skeleton />;
  if (error) return <ErrorBanner message={error} />;
  if (!items.length) return <EmptyState message="Belum ada goal" />;

  return items.map(goal => <GoalCard key={goal.id} goal={goal} />);
}
```

---

## Redux Best Practices

### 1. State Normalization

```javascript
// BAD - Nested data
{
  goals: [
    {
      id: 1,
      tasks: [
        { id: 1, title: 'Belajar React' }
      ]
    }
  ]
}

// GOOD - Normalized
{
  goals: {
    byId: { 1: { id: 1, taskIds: [1] } }
  },
  tasks: {
    byId: { 1: { id: 1, title: 'Belajar React', goalId: 1 } }
  }
}
```

### 2. Selective Subscriptions

```javascript
// BAD - Subscribe ke seluruh state
const goals = useSelector(state => state.goals);

// GOOD - Subscribe spesifik
const goalById = useSelector(state => state.goals.byId[goalId]);
const goalLoading = useSelector(state => state.goals.loading);
```

### 3. Jangan Simpan UI State di Redux

```javascript
// BAD - UI state di Redux
const isModalOpen = useSelector(state => state.ui.isDetailModalOpen);

// GOOD - Local state
const [isModalOpen, setIsModalOpen] = useState(false);
```

### 4. Gunakan createAsyncThunk

```javascript
// BAD - Manual thunk
export const fetchGoals = () => async (dispatch) => {
  dispatch({ type: 'goals/fetch/pending' });
  try {
    const data = await goalService.getAll();
    dispatch({ type: 'goals/fetch/fulfilled', payload: data });
  } catch (err) {
    dispatch({ type: 'goals/fetch/rejected', error: err.message });
  }
};

// GOOD - createAsyncThunk
export const fetchGoals = createAsyncThunk('goals/fetch', async () => {
  return await goalService.getAll();
});
```

---

## Backend Best Practices

### 1. Layered Architecture

```javascript
// BAD - All logic in route handler
router.post('/goals', async (req, res) => {
  const { title, deadline } = req.body;
  const { rows } = await pool.query('INSERT INTO goals ...');
  await logActivity(req.userId, 'create_goal');
  res.json(rows[0]);
});

// GOOD - Separation of concerns
// Route → Service → Repository → Model
router.post('/goals', async (req, res, next) => {
  try {
    const goal = await goalService.create(req.userId, req.body);
    res.json({ success: true, data: goal });
  } catch (err) {
    next(err);
  }
});
```

### 2. Input Validation dengan Zod

```javascript
// BAD - Manual validation
if (!title || title.length < 3) {
  return res.status(400).json({ error: 'Title must be at least 3 characters' });
}

// GOOD - Zod schema
const createGoalSchema = z.object({
  title: z.string().min(3).max(200),
  deadline: z.string().datetime(),
  description: z.string().optional(),
});
```

### 3. Error Handling Middleware

```javascript
// BAD - Try/catch di setiap route
try { ... } catch (err) { res.status(500).json({ error: err.message }); }

// GOOD - Central error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  logger.error({ err, reqId: req.id });
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});
```

### 4. Rate Limiting

```javascript
// Auth endpoint — strict limit
app.use('/api/auth/login', authLimiter);

// AI endpoint — moderate limit (LLM calls are expensive)
app.use('/api/ai', aiLimiter);
```

---

## AI Integration Best Practices

### 1. Structured Output Parsing

```javascript
// BAD - Unstructured LLM response parsing
const response = await llm.generate(prompt);
const tasks = JSON.parse(response); // Fragile!

// GOOD - Pattern matching + validation
const { tasks, summary } = parseCoachResponse(response);
const validated = coachResponseSchema.parse({ tasks, summary });
```

### 2. Prompt Versioning

```
server/src/prompts/
├── system.md        # Prompt versi 1
├── system-v2.md     # Prompt versi 2
└── system-v3.md     # Prompt versi 3 (current)
```

**Kenapa versioning?** — Perubahan prompt bisa berdampak besar. Dengan versioning, kita bisa A/B test dan rollback.

### 3. Fallback Strategy

```javascript
// Primary → Fallback → Mock
const providers = [
  () => gemini.generate(prompt),
  () => openrouter.generate(prompt),
  () => mock.generate(prompt),  // Development only
];
```

### 4. Audit Trail

Semua interaksi LLM di-log ke `audit_logs` untuk:
- Debugging response anomali
- Monitoring biaya API
- Compliance dan review
- Performance tracking

---

## Common Pitfalls

### 1. Index Sebagai Key

```javascript
// BAD
tasks.map((task, index) => <TaskCard key={index} task={task} />);

// GOOD
tasks.map(task => <TaskCard key={task.id} task={task} />);
```

### 2. Tidak Handle Loading/Error States

```javascript
// BAD - Langsung render tanpa state check
function Goals() {
  const goals = useSelector(state => state.goals.items);
  return <div>{goals.map(g => g.title)}</div>;
}

// GOOD
function Goals() {
  const { items, loading, error } = useSelector(state => state.goals);
  if (loading) return <Skeleton />;
  if (error) return <ErrorBanner />;
  return <div>{items.map(g => g.title)}</div>;
}
```

### 3. Mutating State Directly

```javascript
// BAD - Direct mutation (tanpa RTK)
state.push(newGoal);

// GOOD - RTK menggunakan Immer (ini aman!)
state.items.push(newGoal); // OK di createSlice!

// Tanpa RTK:
return [...state, newGoal];
```

### 4. Menyimpan Data Sensitif di Client

```javascript
// BAD
localStorage.setItem('token', jwtToken);
localStorage.setItem('password', 'secret123');

// Kenapa? XSS bisa mengakses localStorage

// LEBIH BAIK — httpOnly cookies
// Atau minimal: access token di memory, refresh token di httpOnly cookie
```

### 5. Prop Drilling

```javascript
// BAD
<App>
  <MainLayout>
    <Dashboard>
      <GoalList>
        <TaskCard goalId={goalId} />
      </GoalList>
    </Dashboard>
  </MainLayout>
</App>

// GOOD - useSelector langsung di komponen
function TaskCard() {
  const task = useSelector(state => state.tasks.byId[taskId]);
  // ...
}
```

### 6. LLM Prompt Injection

```javascript
// BAD - User input langsung ke prompt
const prompt = `Buat task untuk: ${userInput}`;

// GOOD - Sanitize dan validate
const sanitizedInput = sanitizeHtml(userInput);
const prompt = buildSafePrompt(sanitizedInput);
```

### 7. Race Condition di Effect

```javascript
// BAD - Race condition
useEffect(() => {
  fetchGoal(id).then(setGoal);
}, [id]);

// GOOD - Cleanup dengan AbortController
useEffect(() => {
  const controller = new AbortController();
  fetchGoal(id, { signal: controller.signal }).then(setGoal);
  return () => controller.abort();
}, [id]);
```

---

## Code Quality

### 1. Keep Components Small

```javascript
// BAD — Large component (200+ lines)
function Dashboard() {
  // Semua logic dan JSX di sini
}

// GOOD — Split into smaller components
function Dashboard() {
  return (
    <div>
      <StreakBadge />
      <GoalProgress />
      <TaskTimeline />
      <QuickActions />
    </div>
  );
}
```

### 2. Extract Constants

```javascript
// BAD
if (type === 'acquire' || type === 'practice' || type === 'recall') { ... }

// GOOD
const LEARNING_TASK_TYPES = ['acquire', 'practice', 'recall'];
if (LEARNING_TASK_TYPES.includes(type)) { ... }
```

### 3. Meaningful Names

```javascript
// BAD
const d = new Date();
const arr = tasks.filter(t => t.s === 'done');
function get() { }

// GOOD
const currentDate = new Date();
const completedTasks = tasks.filter(task => task.status === 'done');
function getGoalById(id) { }
```

### 4. Comment WHY, Not WHAT

```javascript
// BAD
// Loop through goals
goals.forEach(g => console.log(g.title));

// GOOD
// ForEach instead of map because we're logging, not returning
goals.forEach(goal => logger.info(`Goal: ${goal.id} - ${goal.title}`));
```

---

## Quick Reference

| Do | Don't |
|----|-------|
| Gunakan functional components | Gunakan class components |
| Destructure props | Access props.object |
| Handle loading/error/empty states | Assume data selalu ada |
| Gunakan unique keys | Gunakan index sebagai key |
| Normalize Redux state | Gunakan deeply nested objects |
| Validasi input dengan Zod | Percaya input user |
| Central error handler | Try/catch di setiap handler |
| Log LLM interactions | Skip audit trail |
| Cleanup effects | Lupakan cleanup |
| Version LLM prompts | Edit prompt langsung |
