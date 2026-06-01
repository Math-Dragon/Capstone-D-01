import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CoachPage from '../../../src/features/coach/components/CoachPage';

const coachState = vi.hoisted(() => ({
  value: {
    messages: [],
    status: 'idle',
    sendMessage: vi.fn(),
    generatePlan: vi.fn(),
    retryGeneratePlan: vi.fn(),
    getLastPayload: vi.fn(() => null),
    decideTask: vi.fn(),
    mode: 'chat',
    recommendation: null,
    error: null,
    banner: null,
    pipelineTrace: null,
    observabilityRefresh: vi.fn(),
    trimmedTasks: null,
    dismissTrimmed: vi.fn(),
  },
}));

vi.mock('../../../src/features/coach/hooks/useCoach', () => ({
  useCoach: () => coachState.value,
}));

vi.mock('../../../src/features/coach/components/CoachObservability', () => ({
  default: () => null,
}));

function renderPage(nextState) {
  coachState.value = { ...coachState.value, ...nextState };
  return render(
    <MemoryRouter>
      <CoachPage />
    </MemoryRouter>,
  );
}

describe('CoachPage accessibility states', () => {
  it('announces empty chat state', () => {
    renderPage({ mode: 'chat', messages: [], status: 'idle' });

    expect(screen.getByRole('status')).toHaveTextContent('Coach Belajar Kamu');
  });

  it('announces loading state', () => {
    renderPage({ mode: 'loading', status: 'loading' });

    expect(screen.getByRole('status')).toHaveTextContent('Membuat rencana belajar');
  });

  it('announces error state with retry and edit actions', () => {
    renderPage({ mode: 'error', error: new Error('Server sibuk') });

    expect(screen.getByRole('alert')).toHaveTextContent('Server sibuk');
    expect(screen.getByRole('button', { name: /Coba Lagi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ubah Formulir/i })).toBeInTheDocument();
  });
});
