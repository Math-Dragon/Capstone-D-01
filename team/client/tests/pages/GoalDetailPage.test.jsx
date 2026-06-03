import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
<<<<<<< HEAD

vi.mock('../../src/components/AdjustmentPanel', () => ({
  default: () => null,
}));

vi.mock('../../src/services/api', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

vi.mock('../../src/features/goals/hooks/useGoals', () => ({
  useGoals: () => ({ update: vi.fn(), remove: vi.fn() }),
=======
import GoalDetailPage from '../../src/pages/GoalDetailPage';
import api from '../../src/services/api';

vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../../src/features/goals/hooks/useGoals', () => ({
  useGoals: () => ({
    update: vi.fn(),
    remove: vi.fn(),
  }),
>>>>>>> 5a9e65de3c47587a95363cc9164a497d76e2fa29
}));

vi.mock('../../src/hooks/useTaskActions', () => ({
  default: () => ({
    proposal: null,
    activeModal: null,
    activeTask: null,
<<<<<<< HEAD
    actionLoading: false,
=======
    actionLoading: null,
>>>>>>> 5a9e65de3c47587a95363cc9164a497d76e2fa29
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
  }),
}));

<<<<<<< HEAD
vi.mock('../../src/utils/invalidation', () => ({
  onDataChanged: () => () => {},
}));

import api from '../../src/services/api';
import GoalDetailPage from '../../src/pages/GoalDetailPage';

const mockGoal = {
  id: 'goal-1',
  title: 'Belajar React',
  description: 'Kuasi React dalam 2 bulan',
  status: 'active',
  deadline: '2026-06-01',
  tasks: [],
};

function renderPage(goalId = 'goal-1') {
  return render(
    <MemoryRouter initialEntries={[`/goals/${goalId}`]}>
=======
vi.mock('../../src/components/AdjustmentPanel', () => ({ default: () => <div /> }));
vi.mock('../../src/components/ModifyTaskModal', () => ({ default: () => null }));
vi.mock('../../src/components/SkipTaskModal', () => ({ default: () => null }));
vi.mock('../../src/components/FeedbackModal', () => ({ default: () => null }));
vi.mock('../../src/components/TaskDetailModal', () => ({ default: () => null }));
vi.mock('../../src/components/ProposalOverlay', () => ({ default: () => null }));
vi.mock('../../src/utils/invalidation', () => ({ onDataChanged: () => () => {} }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/goals/goal-1']}>
>>>>>>> 5a9e65de3c47587a95363cc9164a497d76e2fa29
      <Routes>
        <Route path="/goals/:id" element={<GoalDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

<<<<<<< HEAD
describe('GoalDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    api.get.mockRejectedValue(new Error('Gagal memuat goal'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Gagal memuat goal')).toBeInTheDocument();
    });
    expect(screen.getByText('Kembali')).toBeInTheDocument();
  });

  it('shows error when goal not found', async () => {
    api.get.mockRejectedValue(new Error('Goal not found'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Goal not found')).toBeInTheDocument();
    });
  });

  it('renders goal header with title', async () => {
    api.get.mockResolvedValue(mockGoal);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Belajar React')).toBeInTheDocument();
    });
  });

  it('renders progress summary cards', async () => {
    api.get.mockResolvedValue(mockGoal);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('Progres')).toBeInTheDocument();
      expect(screen.getByText('Total Waktu')).toBeInTheDocument();
    });
  });

  it('shows empty state when no tasks', async () => {
    api.get.mockResolvedValue(mockGoal);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Belum ada tugas')).toBeInTheDocument();
    });
    expect(screen.getByText('Tanya Coach')).toBeInTheDocument();
  });

  it('renders task list when tasks exist', async () => {
    const goalWithTasks = {
      ...mockGoal,
      tasks: [
        { id: 't1', title: 'Belajar useEffect', status: 'todo', duration_estimate: 45, planned_date: '2026-05-04', planned_slot: 'morning' },
        { id: 't2', title: 'Belajar useState', status: 'done', duration_estimate: 30, planned_date: '2026-05-04', planned_slot: 'afternoon' },
      ],
    };
    api.get.mockResolvedValue(goalWithTasks);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Belajar useEffect')).toBeInTheDocument();
      expect(screen.getByText('Belajar useState')).toBeInTheDocument();
    });
  });

  it('shows edit and delete buttons', async () => {
    api.get.mockResolvedValue(mockGoal);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('Edit Goal'))).toBeInTheDocument();
      expect(screen.getByText((content) => content.includes('Hapus Goal'))).toBeInTheDocument();
    });
  });

  it('shows delete confirmation when delete clicked', async () => {
    api.get.mockResolvedValue(mockGoal);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('Hapus Goal'))).toBeInTheDocument();
    });
=======
describe('GoalDetailPage accessibility states', () => {
  beforeEach(() => vi.clearAllMocks());

  it('announces loading state', () => {
    api.get.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Memuat detail target');
  });

  it('announces error state with retry action and help text', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
    expect(screen.getByRole('button', { name: /Coba Lagi/i })).toBeInTheDocument();
    expect(screen.getByText(/Periksa koneksi/i)).toBeInTheDocument();
  });

  it('announces empty task state', async () => {
    api.get.mockResolvedValue({ id: 'goal-1', title: 'Belajar React', status: 'active', tasks: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Belajar React')).toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toHaveTextContent('Belum ada tugas');
>>>>>>> 5a9e65de3c47587a95363cc9164a497d76e2fa29
  });
});
