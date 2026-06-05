import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from '../../src/pages/AdminPage';

const mockData = {
  summary: {
    totalCalls: 150,
    totalTokens: { prompt: 50000, completion: 30000, total: 80000 },
    estimatedCostUsd: 0.45,
    acceptRate: 0.75,
  },
  trends: {
    totalCalls: 12,
    totalTokens: -5,
    estimatedCostUsd: 8,
    acceptRate: 3,
  },
  byProvider: [
    { provider: 'gemini', model: 'gemini-2.0-flash', calls: 100, tokens: 50000, estimatedCostUsd: 0.30 },
    { provider: 'openrouter', model: 'gpt-4o-mini', calls: 50, tokens: 30000, estimatedCostUsd: 0.15 },
  ],
  byDay: [
    { date: '2026-06-01', requests: 10, errors: 0 },
    { date: '2026-06-02', requests: 15, errors: 1 },
  ],
  byDayAccept: [
    { date: '2026-06-01', recRate: 0.75, taskRate: 0.80 },
    { date: '2026-06-02', recRate: 0.80, taskRate: 0.85 },
  ],
  recentActivity: [
    { id: 'a1', timestamp: '2026-06-03T10:00:00Z', action: 'COACH_LLM_CALL', user_id: 'u1', provider: 'gemini', model: 'gemini-2.0-flash', input_tokens: 100, output_tokens: 50, total_tokens: 150, latency_ms: 500, metadata: { llm: { provider: 'gemini', latency_ms: 500, total_tokens: 150, prompt_tokens: 100, completion_tokens: 50 } } },
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
      expect(screen.getAllByText('150').length).toBeGreaterThanOrEqual(1);
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
      expect(screen.getAllByText('gemini').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('openrouter')).toBeInTheDocument();
    });
  });

  it('renders period switcher tabs', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('7 Hari')).toBeInTheDocument();
      expect(screen.getByText('30 Hari')).toBeInTheDocument();
      expect(screen.getByText('90 Hari')).toBeInTheDocument();
    });
  });

  it('highlights active period tab', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const tab30 = screen.getByText('30 Hari');
      expect(tab30.className).toContain('bg-white');
      expect(tab30.className).toContain('shadow-sm');
    });
  });

  it('sends period param to API on tab click', async () => {
    const api = (await import('../../src/services/api')).default;
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('7 Hari')).toBeInTheDocument());

    fireEvent.click(screen.getByText('7 Hari'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/admin/metrics', expect.objectContaining({
        params: expect.objectContaining({ period: 7 }),
      }));
    });
  });

  it('renders recent activity badge', async () => {
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

  it('renders activity log with provider, model, token columns', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('gemini').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('150').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders request and accept rate trend titles', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Request & Accept Rate Trend')).toBeInTheDocument();
      expect(screen.getByText('Request Trend')).toBeInTheDocument();
      expect(screen.getByText('Accept Rate Trend')).toBeInTheDocument();
    });
  });
});
