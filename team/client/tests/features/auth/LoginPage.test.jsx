import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockLogin = vi.fn();
const mockLoginWithGoogle = vi.fn();
vi.mock('../../../src/features/auth/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../src/features/auth/hooks/useAuth';
import LoginPage from '../../../src/features/auth/components/LoginPage';

function renderLoginPage(authOverrides = {}) {
  const defaults = { login: mockLogin, loginWithGoogle: mockLoginWithGoogle, loading: false, error: null };
  vi.mocked(useAuth).mockReturnValue({ ...defaults, ...authOverrides });
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginPage', () => {
  it('renders form with email and password fields', () => {
    renderLoginPage();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    renderLoginPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Masuk' }));
    await waitFor(() => {
      expect(screen.getByText('Email harus diisi')).toBeInTheDocument();
    });
    expect(screen.getByText('Password harus diisi')).toBeInTheDocument();
  });

  it('shows auth error banner when error is set', () => {
    renderLoginPage({ error: 'Invalid credentials' });
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    renderLoginPage({ loading: true });
    expect(screen.getByText('Memuat...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /memuat/i })).toBeDisabled();
  });

  it('toggles password visibility', async () => {
    renderLoginPage();
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByLabelText('Tampilkan password');
    await userEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByLabelText('Sembunyikan password'));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('calls login and navigates on form submit', async () => {
    mockLogin.mockResolvedValue({});
    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('calls loginWithGoogle on Google button click', async () => {
    mockLoginWithGoogle.mockResolvedValue({});
    renderLoginPage();
    const user = userEvent.setup();

    await user.click(screen.getByText('Google'));
    expect(mockLoginWithGoogle).toHaveBeenCalled();
  });

  it('shows alert on GitHub login click', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderLoginPage();
    const user = userEvent.setup();

    await user.click(screen.getByText('GitHub'));
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('GitHub'));

    alertMock.mockRestore();
  });

  it('provides link to register page', () => {
    renderLoginPage();
    const registerLink = screen.getByText('Daftar sekarang');
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });
});
