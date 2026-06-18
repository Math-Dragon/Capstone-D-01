import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GoalsPage from '../../../../src/features/goals/components/GoalsPage';

const navigateMock = vi.fn();
const refreshMock = vi.fn();

const goalsState = {
  goals: [],
  loading: false,
  error: null,
  refresh: refreshMock,
};

vi.mock('../../../../src/features/goals/context/GoalsContext', () => ({
  useGoals: () => goalsState,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('GoalsPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    refreshMock.mockReset();
    goalsState.goals = [];
    goalsState.loading = false;
    goalsState.error = null;
    goalsState.refresh = refreshMock;
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <GoalsPage />
      </MemoryRouter>,
    );
  }

  it('calls refresh on mount', () => {
    renderPage();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('renders loading state', () => {
    goalsState.loading = true;
    renderPage();
    expect(screen.getByLabelText('Memuat daftar goal')).toBeInTheDocument();
  });

  it('renders error state and supports retry', () => {
    goalsState.error = 'Gagal memuat goal';
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('Gagal memuat goal');
    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));
    expect(refreshMock).toHaveBeenCalledTimes(2);
  });

  it('renders empty state when there are no goals', () => {
    renderPage();

    expect(screen.getByText('Belum ada target belajar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Buat Goal Pertama' }));
    expect(navigateMock).toHaveBeenCalledWith('/coach?create=true');
  });

  it('renders filter empty state and clears filters', async () => {
    goalsState.goals = [
      { id: 'g1', title: 'Belajar React', description: 'Hooks', status: 'active' },
    ];

    renderPage();

    fireEvent.change(screen.getByLabelText('Cari goal'), { target: { value: 'Vue' } });

    await waitFor(() => {
      expect(screen.getByText('Tidak ada goal yang cocok')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Hapus Filter' }));

    await waitFor(() => {
      expect(screen.getByText('Belajar React')).toBeInTheDocument();
    });
  });
});
