import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/services/api', () => ({
  default: { get: vi.fn() },
}));

vi.mock('../../src/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'test@example.com' } }),
}));

vi.mock('../../src/utils/invalidation', () => ({
  onDataChanged: () => () => {},
}));

vi.mock('../../src/features/progress/services/progressService', () => ({
  default: { getOverview: vi.fn() },
  getOverview: vi.fn(),
}));

vi.mock('../../src/features/coach/services/proposalService', () => ({
  default: { getById: vi.fn(), accept: vi.fn(), reject: vi.fn(), newIdempotencyKey: vi.fn() },
  getById: vi.fn(),
  accept: vi.fn(),
  reject: vi.fn(),
  newIdempotencyKey: vi.fn(),
}));

import api from '../../src/services/api';
import progressService from '../../src/features/progress/services/progressService';
import proposalService from '../../src/features/coach/services/proposalService';
import { ToastProvider } from '../../src/components/ui/Toast';
import DashboardPage from '../../src/pages/DashboardPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DashboardPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

function getLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const PENDING_TEASER = {
  id: 'prop_1',
  adaptation_type: 'reschedule',
  summary: 'Memindahkan dua tugas praktik ke akhir pekan.',
  created_at: '2026-09-27T10:00:00Z',
  expires_at: '2026-09-28T10:00:00Z',
  base_plan_version: 4,
};

function makeOverview(overrides = {}) {
  return {
    generated_at: '2026-09-28T01:00:00Z',
    timezone: 'Asia/Jakarta',
    period: { key: '7d', from: '2026-09-22', to: '2026-09-28', bucket: 'day' },
    insight: null,
    health: {
      progress_percent: 50,
      completed_tasks: 1,
      total_tasks: 2,
      completed_minutes: 30,
      planned_minutes: 60,
      completion_rate: 0.5,
      average_difficulty: null,
      difficulty_sample_count: 0,
    },
    activity: [],
    distribution: { dimension: 'task_type', items: [] },
    evidence: { available: false, signal_count: 0, signals: [], event_count: 0 },
    coach_strategy: null,
    pending_proposal: null,
    ...overrides,
  };
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    progressService.getOverview.mockResolvedValue(null);
    proposalService.getById.mockResolvedValue(null);
    proposalService.accept.mockResolvedValue({});
    proposalService.reject.mockResolvedValue({});
    proposalService.newIdempotencyKey.mockReturnValue('idem_test_key_123');
  });

  it('shows loading state', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Gagal memuat data dashboard.')).toBeInTheDocument();
    });
    expect(screen.getByText('Coba Lagi')).toBeInTheDocument();
  });

  it('renders greeting with username', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/tasks') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Hello, test/)).toBeInTheDocument();
    });
  });

  it('renders stat cards', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/tasks') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Tasks Done')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Focus Points')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });
  });

  it('shows no task data message when empty', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/tasks') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Tidak ada tugas hari ini.')).toBeInTheDocument();
    });
  });

  it('shows today tasks when available', async () => {
    const today = getLocalDate();
    api.get.mockImplementation((url) => {
      if (url === '/tasks') return Promise.resolve([
        { id: '1', title: 'Study React', status: 'todo', planned_date: today, task_type: 'practice', planned_slot: 'morning' },
      ]);
      return Promise.resolve([]);
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Study React')).toBeInTheDocument();
    });
  });

  it('shows completed celebration when all today tasks done', async () => {
    const today = getLocalDate();
    api.get.mockImplementation((url) => {
      if (url === '/tasks') return Promise.resolve([
        { id: '1', title: 'Done Task', status: 'done', planned_date: today },
      ]);
      return Promise.resolve([]);
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Semua tugas hari ini selesai!')).toBeInTheDocument();
    });
  });

  it('renders weekly momentum and priority sections', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/tasks') return Promise.resolve([
        { id: '1', title: 'Task', status: 'done', completed_at: new Date().toISOString() },
      ]);
      return Promise.resolve([{ title: 'Learn React' }]);
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Weekly Momentum')).toBeInTheDocument();
      expect(screen.getByText('Priority Focus')).toBeInTheDocument();
    });
    expect(screen.getByText(/Goal: Learn React/)).toBeInTheDocument();
  });

  it('shows active goal title', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/tasks') return Promise.resolve([]);
      return Promise.resolve([{ title: 'Master TypeScript' }]);
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Goal: Master TypeScript/)).toBeInTheDocument();
    });
  });

  it('shows focus mode when tasks present', async () => {
    const today = getLocalDate();
    api.get.mockImplementation((url) => {
      if (url === '/tasks') return Promise.resolve([
        { id: '1', title: 'Deep Work', status: 'todo', planned_date: today, task_type: 'practice' },
      ]);
      return Promise.resolve([]);
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Focus Mode')).toBeInTheDocument();
      expect(screen.getByText('START SESSION')).toBeInTheDocument();
    });
  });

  it('shows the reporting period and timezone from the overview', async () => {
    api.get.mockResolvedValue([]);
    progressService.getOverview.mockResolvedValue(makeOverview());

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('7 hari terakhir')).toBeInTheDocument();
    });
    expect(screen.getByText('Asia/Jakarta')).toBeInTheDocument();
    expect(progressService.getOverview).toHaveBeenCalledWith(
      '7d',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('does not render the adaptive teaser when there is no pending proposal', async () => {
    api.get.mockResolvedValue([]);
    progressService.getOverview.mockResolvedValue(makeOverview({ pending_proposal: null }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Hello, test/)).toBeInTheDocument();
    });
    expect(screen.getByText('7 hari terakhir')).toBeInTheDocument();
    expect(screen.queryByText('Proposal penyesuaian rencana')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lihat saran' })).not.toBeInTheDocument();
  });

  it('renders the adaptive teaser and opens the shared proposal overlay', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue([]);
    progressService.getOverview.mockResolvedValue(makeOverview({ pending_proposal: PENDING_TEASER }));
    proposalService.getById.mockResolvedValue({
      id: 'prop_1',
      summary: PENDING_TEASER.summary,
      base_plan_version: 4,
      evidence: [],
      changes: { added: [], modified: [], removed: [], rescheduled: [] },
    });

    renderPage();

    const openButton = await screen.findByRole('button', { name: 'Lihat saran' });
    expect(screen.getByText(PENDING_TEASER.summary)).toBeInTheDocument();

    await user.click(openButton);

    await waitFor(() => {
      expect(proposalService.getById).toHaveBeenCalledWith('prop_1');
    });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Saran penyesuaian rencana')).toBeInTheDocument();
  });

  it('keeps the dashboard rendering when the overview request fails', async () => {
    api.get.mockResolvedValue([]);
    progressService.getOverview.mockRejectedValue(new Error('overview down'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Hello, test/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Ringkasan 7 hari belum bisa dimuat/)).toBeInTheDocument();
    expect(screen.getByText('Tasks Done')).toBeInTheDocument();
    expect(screen.getByText('Focus Mode')).toBeInTheDocument();
    expect(screen.queryByText('7 hari terakhir')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lihat saran' })).not.toBeInTheDocument();
  });

  it('accepts the pending proposal with its base plan version and reloads', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue([]);
    progressService.getOverview
      .mockResolvedValueOnce(makeOverview({ pending_proposal: PENDING_TEASER }))
      .mockResolvedValue(makeOverview({ pending_proposal: null }));
    proposalService.getById.mockResolvedValue({
      id: 'prop_1',
      summary: PENDING_TEASER.summary,
      base_plan_version: 4,
      evidence: [],
      changes: { added: [], modified: [], removed: [], rescheduled: [] },
    });
    proposalService.accept.mockResolvedValue({ id: 'prop_1', status: 'accepted' });

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Lihat saran' }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Terapkan' }));

    await waitFor(() => {
      expect(proposalService.accept).toHaveBeenCalledWith('prop_1', {
        basePlanVersion: 4,
        idempotencyKey: 'idem_test_key_123',
      });
    });
    await waitFor(() => {
      expect(screen.getByText('Rencana baru sudah diterapkan.')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Lihat saran' })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
