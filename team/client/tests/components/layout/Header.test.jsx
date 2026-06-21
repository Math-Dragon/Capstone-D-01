import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useLocation: () => ({ pathname: '/' }) };
});

const mockLogout = vi.fn();
vi.mock('../../../src/features/auth/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../src/features/auth/hooks/useAuth';
import { Header } from '../../../src/components/layout/Header';

function renderHeader(authOverrides = {}) {
  const defaults = { isAuthenticated: false, user: null, logout: mockLogout };
  vi.mocked(useAuth).mockReturnValue({ ...defaults, ...authOverrides });
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Header />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Header', () => {
  it('shows Masuk and Daftar buttons when not authenticated', () => {
    renderHeader();
    expect(screen.getByText('Masuk')).toBeInTheDocument();
    expect(screen.getByText('Daftar')).toBeInTheDocument();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('shows avatar initial and Logout when authenticated', () => {
    renderHeader({ isAuthenticated: true, user: { email: 'admin@example.com' } });
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
    expect(screen.queryByText('Masuk')).not.toBeInTheDocument();
    expect(screen.queryByText('Daftar')).not.toBeInTheDocument();
  });

  it('shows Admin link for admin users', () => {
    renderHeader({ isAuthenticated: true, user: { email: 'admin@example.com', isAdmin: true } });
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('does not show Admin link for non-admin users', () => {
    renderHeader({ isAuthenticated: true, user: { email: 'user@example.com' } });
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('calls logout and navigates on Logout click', async () => {
    mockLogout.mockResolvedValue();
    renderHeader({ isAuthenticated: true, user: { email: 'user@example.com' } });
    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('opens mobile menu on hamburger click', () => {
    renderHeader({ isAuthenticated: true, user: { email: 'user@example.com' } });
    const menuButton = screen.getByLabelText('Toggle menu');
    fireEvent.click(menuButton);
    expect(screen.getAllByText('Dashboard')).toHaveLength(2);
    expect(screen.getAllByText('Targetku')).toHaveLength(2);
  });

  it('highlights active link', () => {
    renderHeader({ isAuthenticated: true, user: { email: 'user@example.com' } });
    const dashboardLink = screen.getByText('Dashboard');
    expect(dashboardLink.className).toContain('bg-primary-100');
  });

  it('shows fallback avatar initial U when user has no email', () => {
    renderHeader({ isAuthenticated: true, user: {} });
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('shows mobile Logout button when authenticated in mobile menu', () => {
    renderHeader({ isAuthenticated: true, user: { email: 'user@example.com' } });
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    const logoutButtons = screen.getAllByText('Logout');
    expect(logoutButtons.length).toBeGreaterThanOrEqual(2);
  });
});
