import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../src/services/api', () => ({
  default: { get: vi.fn() },
}));

import api from '../../src/services/api';
import ProgressPage from '../../src/pages/ProgressPage';

describe('ProgressPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    render(<ProgressPage />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    render(<ProgressPage />);
    await waitFor(() => {
      expect(screen.getByText('Gagal memuat data progres. Silakan coba lagi.')).toBeInTheDocument();
    });
  });

  it('renders progress data', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/tasks') {
        return Promise.resolve([
          { id: '1', title: 'Task A', status: 'done', duration_estimate: 30, task_type: 'practice' },
          { id: '2', title: 'Task B', status: 'todo', duration_estimate: 45, task_type: 'review' },
        ]);
      }
      return Promise.resolve({ completionRate: 0.5, avgDifficulty: 3.2 });
    });
    render(<ProgressPage />);
    await waitFor(() => {
      expect(screen.getByText('Analisis Progres')).toBeInTheDocument();
    });
    expect(screen.getByText(/Tugas Selesai/)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/Practice/)).toBeInTheDocument();
  });

  it('shows stats when available', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/tasks') return Promise.resolve([]);
      return Promise.resolve({ completionRate: 0.75, avgDifficulty: 4.1, summary: 'Keep going!' });
    });
    render(<ProgressPage />);
    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
    expect(screen.getByText('4.1 / 5')).toBeInTheDocument();
  });

  it('shows coach strategy when available', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/tasks') return Promise.resolve([]);
      return Promise.resolve({ summary: 'Coba lebih banyak latihan.' });
    });
    render(<ProgressPage />);
    await waitFor(() => {
      expect(screen.getByText('Strategi Coach')).toBeInTheDocument();
    });
    expect(screen.getByText('Coba lebih banyak latihan.')).toBeInTheDocument();
  });

  it('handles empty tasks', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/tasks') return Promise.resolve([]);
      return Promise.resolve(null);
    });
    render(<ProgressPage />);
    await waitFor(() => {
      expect(screen.getByText('Analisis Progres')).toBeInTheDocument();
    });
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows adaptation notes when available', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/tasks') return Promise.resolve([]);
      return Promise.resolve({ adaptationNotes: 'Perlu penyesuaian jadwal.' });
    });
    render(<ProgressPage />);
    await waitFor(() => {
      expect(screen.getByText('Catatan Adaptasi')).toBeInTheDocument();
    });
  });

  it('shows retry button on error', async () => {
    api.get.mockRejectedValue(new Error('fail'));
    render(<ProgressPage />);
    await waitFor(() => {
      expect(screen.getByText('Coba Lagi')).toBeInTheDocument();
    });
  });
});
