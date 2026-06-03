import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

import api from '../../src/services/api';
import DashboardPage from '../../src/pages/DashboardPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

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
      const msgs = screen.getAllByText('No task data yet');
      expect(msgs.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows today tasks when available', async () => {
    const today = new Date().toISOString().split('T')[0];
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
    const today = new Date().toISOString().split('T')[0];
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
    const today = new Date().toISOString().split('T')[0];
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
});
