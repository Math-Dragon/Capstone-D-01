import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/features/auth/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../src/features/auth/hooks/useAuth';
import ProtectedRoute from '../../src/components/ProtectedRoute';

describe('ProtectedRoute', () => {
  it('shows spinner when not initialized', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false, isInitialized: false, loading: false,
    });
    const { container } = render(
      <MemoryRouter><ProtectedRoute><span>Protected</span></ProtectedRoute></MemoryRouter>
    );
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });

  it('shows spinner when loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false, isInitialized: true, loading: true,
    });
    const { container } = render(
      <MemoryRouter><ProtectedRoute><span>Protected</span></ProtectedRoute></MemoryRouter>
    );
    expect(container.querySelector('[role="status"]')).toBeTruthy();
  });

  it('redirects to /login when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false, isInitialized: true, loading: false,
    });
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute><span>Protected</span></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true, isInitialized: true, loading: false,
    });
    render(
      <MemoryRouter><ProtectedRoute><span>Protected</span></ProtectedRoute></MemoryRouter>
    );
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });
});
