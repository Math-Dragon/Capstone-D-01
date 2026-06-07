import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
  }),
}));

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
      <Routes>
        <Route path="/goals/:id" element={<GoalDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

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
  });
});
