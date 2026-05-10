import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/features/coach/hooks/useCoach', () => ({
  useCoach: vi.fn(),
}));

vi.mock('../../src/features/coach/services/coachService', () => ({
  default: { undoPlan: vi.fn().mockResolvedValue({}) },
}));

import AdaptationBanner from '../../src/components/AdaptationBanner';
import { useCoach } from '../../src/features/coach/hooks/useCoach';

function renderBanner() {
  return render(
    <MemoryRouter>
      <AdaptationBanner />
    </MemoryRouter>,
  );
}

describe('AdaptationBanner', () => {
  it('returns null when no banner', () => {
    useCoach.mockReturnValue({ banner: null, dismissBanner: vi.fn() });
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  it('renders crisis banner', () => {
    useCoach.mockReturnValue({ banner: { type: 'crisis', message: 'Kesulitan terdeteksi' }, dismissBanner: vi.fn() });
    renderBanner();
    expect(screen.getByText('Perhatian')).toBeInTheDocument();
    expect(screen.getByText('Kesulitan terdeteksi')).toBeInTheDocument();
  });

  it('renders milestone banner', () => {
    useCoach.mockReturnValue({ banner: { type: 'milestone', message: 'Milestone!' }, dismissBanner: vi.fn() });
    renderBanner();
    expect(screen.getByText('Selamat!')).toBeInTheDocument();
    expect(screen.getByText('Milestone!')).toBeInTheDocument();
    expect(screen.getByText('Urungkan')).toBeInTheDocument();
  });

  it('calls dismissBanner when Mengerti clicked', () => {
    const dismiss = vi.fn();
    useCoach.mockReturnValue({ banner: { type: 'crisis' }, dismissBanner: dismiss });
    renderBanner();
    fireEvent.click(screen.getByText('Mengerti'));
    expect(dismiss).toHaveBeenCalled();
  });

  it('uses default message when banner.message is empty', () => {
    useCoach.mockReturnValue({ banner: { type: 'crisis' }, dismissBanner: vi.fn() });
    renderBanner();
    expect(screen.getByText(/Kami perhatikan/)).toBeInTheDocument();
  });

  it('uses default message for milestone without message', () => {
    useCoach.mockReturnValue({ banner: { type: 'milestone' }, dismissBanner: vi.fn() });
    renderBanner();
    expect(screen.getByText(/mencapai milestone/)).toBeInTheDocument();
  });
});
