import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarPage from '../../src/pages/CalendarPage';
import api from '../../src/services/api';

vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../../src/store/slices/observabilitySlice', () => ({
  fetchStudentMetrics: () => ({ type: 'observability/fetchStudentMetrics' }),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (selector) => selector({
    observability: {
      studentMetrics: {
        streak_days: '2',
        completion_rate_7d: '0.5',
        total_completed: '3',
        avg_difficulty_7d: '2.5',
      },
    },
  }),
}));

vi.mock('../../src/hooks/useTaskActions', () => ({
  default: () => ({
    proposal: null,
    activeModal: null,
    activeTask: null,
    actionLoading: null,
    proposalAccepting: false,
    handleComplete: vi.fn(),
    handleSkip: vi.fn(),
    handleModify: vi.fn(),
    handleFeedback: vi.fn(),
    confirmSkip: vi.fn(),
    confirmModify: vi.fn(),
    submitFeedback: vi.fn(),
    acceptProposal: vi.fn(),
    rejectProposal: vi.fn(),
    closeModal: vi.fn(),
    handleModalConfirm: vi.fn(),
  }),
}));

vi.mock('../../src/components/AdjustmentPanel', () => ({
  default: () => <div data-testid="adjustment-panel" />,
}));

vi.mock('../../src/components/ModifyTaskModal', () => ({
  default: () => null,
}));

vi.mock('../../src/components/SkipTaskModal', () => ({
  default: () => null,
}));

vi.mock('../../src/components/FeedbackModal', () => ({
  default: () => null,
}));

vi.mock('../../src/components/TaskDetailModal', () => ({
  default: () => null,
}));

vi.mock('../../src/components/ProposalOverlay', () => ({
  default: () => null,
}));

vi.mock('../../src/utils/invalidation', () => ({
  onDataChanged: () => () => {},
}));

const tasks = [
  {
    id: 'current-week-morning',
    title: 'Current week morning task',
    status: 'todo',
    duration_estimate: 45,
    planned_date: '2026-05-18',
    planned_slot: 'morning',
    task_type: 'practice',
    source: 'ai',
  },
  {
    id: 'current-week-morning-second',
    goal_id: 'goal-1',
    title: 'Second morning task',
    status: 'todo',
    duration_estimate: 60,
    planned_date: '2026-05-18',
    planned_slot: 'morning',
    task_type: 'recall',
    source: 'manual',
  },
  {
    id: 'current-week-afternoon',
    goal_id: 'goal-1',
    title: 'Current week afternoon task',
    status: 'todo',
    duration_estimate: 90,
    planned_date: '2026-05-18',
    planned_slot: 'afternoon',
    task_type: 'assess',
    source: 'ai',
  },
  {
    id: 'current-week-evening',
    goal_id: 'goal-1',
    title: 'Current week evening task',
    status: 'todo',
    duration_estimate: 30,
    planned_date: '2026-05-18',
    planned_slot: 'evening',
    task_type: 'review',
    source: 'manual',
  },
  {
    id: 'skipped-task',
    goal_id: 'goal-1',
    title: 'Skipped task to reschedule',
    status: 'skipped',
    duration_estimate: 45,
    planned_date: '2026-05-20',
    planned_slot: 'afternoon',
    task_type: 'practice',
    source: 'ai',
  },
  {
    id: 'next-week',
    goal_id: 'goal-1',
    title: 'Next week task',
    status: 'todo',
    duration_estimate: 60,
    planned_date: '2026-05-26',
    planned_slot: 'afternoon',
    task_type: 'acquire',
    source: 'ai',
  },
];

function renderPage() {
  api.get.mockResolvedValue(tasks);
  api.post.mockImplementation(async (url, payload) => {
    if (url === '/coach') {
      return {
        message: 'AI menyarankan pindahkan task ke slot siang karena jadwal masih kosong.',
        plan: null,
      };
    }
    return { id: 'manual-task', ...payload, status: 'todo', source: 'manual' };
  });
  api.patch.mockImplementation(async (url, payload) => ({
    ...tasks.find((task) => url.includes(task.id)),
    ...payload,
  }));
  return render(<CalendarPage />);
}

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-20T08:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('provides day, week, and month calendar views', async () => {
    renderPage();

    expect(await screen.findByRole('tab', { name: 'Hari' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Minggu' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Bulan' })).toBeInTheDocument();
  });

  it('opens the calendar with a helpful notice when task loading fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    render(<CalendarPage />);

    expect(await screen.findByText('Jadwal Belajar')).toBeInTheDocument();
    expect(screen.getByText(/Data kalender belum berhasil dimuat/i)).toBeInTheDocument();
  });

  it('places weekly tasks under the correct planned slot', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.click(await screen.findByRole('tab', { name: 'Minggu' }));

    const mondaySection = screen.getByRole('region', { name: /Senin, 18 Mei/i });
    const morningSlot = within(mondaySection).getByRole('group', { name: /Pagi/i });
    const eveningSlot = within(mondaySection).getByRole('group', { name: /Malam/i });

    expect(within(morningSlot).getByText('Current week morning task')).toBeInTheDocument();
    expect(within(eveningSlot).getByText('Current week evening task')).toBeInTheDocument();
  });

  it('updates visible weekly tasks when navigating to the next week', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.click(await screen.findByRole('tab', { name: 'Minggu' }));
    expect(screen.getByText('Current week morning task')).toBeInTheDocument();
    expect(screen.queryByText('Next week task')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Minggu berikutnya/i }));

    expect(await screen.findByText('Next week task')).toBeInTheDocument();
    expect(screen.queryByText('Current week morning task')).not.toBeInTheDocument();
  });

  it('shows planner summary, workload warnings, and task filters', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.click(await screen.findByRole('tab', { name: 'Minggu' }));

    expect(screen.getByText('Ringkasan planner')).toBeInTheDocument();
    expect(screen.getByText(/Senin terlalu padat/i)).toBeInTheDocument();
    expect(screen.getByText(/Pagi punya 2 tugas/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filter tipe task'), 'review');

    expect(screen.getByText('Current week evening task')).toBeInTheDocument();
    expect(screen.queryByText('Current week morning task')).not.toBeInTheDocument();
  });

  it('opens the selected day when clicking a date in month view', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.click(await screen.findByRole('tab', { name: 'Bulan' }));
    await user.click(screen.getByRole('button', { name: /Senin, 18 Mei/i }));

    expect(screen.getByRole('tab', { name: 'Hari' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Current week morning task')).toBeInTheDocument();
  });

  it('moves calendar focus with arrow keys and opens the focused day', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.click(await screen.findByRole('tab', { name: 'Minggu' }));
    const monday = screen.getByRole('button', { name: /Sen 18/i });
    monday.focus();

    fireEvent.keyDown(monday, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: /Sel 19/i })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('button', { name: /Sel 19/i }), { key: 'Enter' });
    expect(screen.getByRole('tab', { name: 'Hari' })).toHaveAttribute('aria-selected', 'true');
  });

  it('reschedules a task by dragging it to another day', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.click(await screen.findByRole('tab', { name: 'Minggu' }));

    const draggedTask = screen.getByLabelText('Pindahkan Current week morning task');
    const targetDay = screen.getByRole('button', { name: /Sel 19/i });
    const dataTransfer = {
      data: {},
      setData(type, value) {
        this.data[type] = value;
      },
      getData(type) {
        return this.data[type];
      },
    };

    fireEvent.dragStart(draggedTask, { dataTransfer });
    fireEvent.drop(targetDay, { dataTransfer });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/tasks/current-week-morning', {
        planned_date: '2026-05-19',
        planned_slot: 'morning',
      });
    });

    expect(await screen.findByText('Saran perubahan plan')).toBeInTheDocument();
    expect(screen.getByText(/Selasa masih kosong/i)).toBeInTheDocument();
  });

  it('creates a manual task for the selected day', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Tambah task manual/i }));
    await user.type(screen.getByLabelText('Judul task'), 'Manual calendar task');
    await user.selectOptions(screen.getByLabelText('Sesi belajar'), 'evening');
    await user.click(screen.getByRole('button', { name: 'Simpan task' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/tasks', {
        goal_id: 'goal-1',
        title: 'Manual calendar task',
        description: '',
        duration_estimate: 30,
        planned_date: '2026-05-20',
        planned_slot: 'evening',
      });
    });

    expect(await screen.findByText('Saran perubahan plan')).toBeInTheDocument();
    expect(screen.getByText(/Task baru masuk ke Rabu/i)).toBeInTheDocument();
  });

  it('requests optional AI advice after a plan edit without applying changes automatically', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.click(await screen.findByRole('tab', { name: 'Minggu' }));

    const draggedTask = screen.getByLabelText('Pindahkan Current week morning task');
    const targetDay = screen.getByRole('button', { name: /Sel 19/i });
    const dataTransfer = {
      data: {},
      setData(type, value) {
        this.data[type] = value;
      },
      getData(type) {
        return this.data[type];
      },
    };

    fireEvent.dragStart(draggedTask, { dataTransfer });
    fireEvent.drop(targetDay, { dataTransfer });
    await screen.findByText('Saran perubahan plan');

    await user.click(screen.getByRole('button', { name: /Minta saran AI/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/coach', expect.objectContaining({
        action: 'REQUEST_ADJUSTMENT',
        payload: expect.objectContaining({
          type: 'plan_edit_advice',
        }),
      }));
    });
    expect(await screen.findByText(/AI menyarankan pindahkan task/i)).toBeInTheDocument();
  });
});
