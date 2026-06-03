import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from '../../src/pages/AdminPage';

const mockData = {
  summary: {
    totalCalls: 150,
    totalTokens: { prompt: 50000, completion: 30000, total: 80000 },
    estimatedCostUsd: 0.45,
    acceptRate: 0.75,
  },
  byProvider: [
    { provider: 'gemini', model: 'gemini-2.0-flash', calls: 100, tokens: 50000, estimatedCostUsd: 0.30 },
    { provider: 'openrouter', model: 'gpt-4o-mini', calls: 50, tokens: 30000, estimatedCostUsd: 0.15 },
  ],
  byDay: [
    { date: '2026-06-01', requests: 10, errors: 0 },
    { date: '2026-06-02', requests: 15, errors: 1 },
  ],
  recentActivity: [
    { id: 'a1', timestamp: '2026-06-03T10:00:00Z', action: 'COACH_LLM_CALL', user_id: 'u1' },
  ],
  total: 1,
};

vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve(mockData)),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminPage', () => {
  it('renders loading state initially', () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Memuat data admin...')).toBeInTheDocument();
  });

  it('renders dashboard data after loading', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('AI Usage Monitoring')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('$0.4500')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  it('renders provider health table', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('gemini')).toBeInTheDocument();
      expect(screen.getByText('openrouter')).toBeInTheDocument();
    });
  });

  it('renders recent activity', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const badge = document.querySelector('span.bg-rose-100');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('LLM Call');
    });
  });
});
