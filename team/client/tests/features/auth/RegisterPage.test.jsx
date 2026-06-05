import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockRegisterUser = vi.fn();
const mockLoginWithGoogle = vi.fn();
vi.mock('../../../src/features/auth/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../src/features/auth/hooks/useAuth';
import RegisterPage from '../../../src/features/auth/components/RegisterPage';

function renderRegisterPage(authOverrides = {}) {
  const defaults = { register: mockRegisterUser, loginWithGoogle: mockLoginWithGoogle, loading: false, error: null };
  vi.mocked(useAuth).mockReturnValue({ ...defaults, ...authOverrides });
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RegisterPage', () => {
  it('renders form with email, password, and confirm password fields', () => {
    renderRegisterPage();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Konfirmasi Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daftar' })).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    renderRegisterPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Daftar' }));
    await waitFor(() => {
      expect(screen.getByText('Email harus diisi')).toBeInTheDocument();
    });
    expect(screen.getByText('Password minimal 8 karakter')).toBeInTheDocument();
    expect(screen.getByText('Konfirmasi password harus diisi')).toBeInTheDocument();
  });

  it('shows auth error banner when error is set', () => {
    renderRegisterPage({ error: 'Email already registered' });
    expect(screen.getByText('Email already registered')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows loading state on submit', () => {
    renderRegisterPage({ loading: true });
    expect(screen.getByText('Membuat akun...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /membuat akun/i })).toBeDisabled();
  });

  it('toggles password visibility', async () => {
    renderRegisterPage();
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByLabelText('Tampilkan password'));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByLabelText('Sembunyikan password'));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('toggles confirm password visibility', async () => {
    renderRegisterPage();
    const confirmInput = screen.getByLabelText('Konfirmasi Password');
    expect(confirmInput).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByLabelText('Tampilkan konfirmasi password'));
    expect(confirmInput).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByLabelText('Sembunyikan konfirmasi password'));
    expect(confirmInput).toHaveAttribute('type', 'password');
  });

  it('strips confirmPassword and calls registerUser on submit', async () => {
    mockRegisterUser.mockResolvedValue({});
    renderRegisterPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'Password1');
    await user.type(screen.getByLabelText('Konfirmasi Password'), 'Password1');
    await user.click(screen.getByRole('button', { name: 'Daftar' }));

    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalledWith({ email: 'test@example.com', password: 'Password1' });
    });
    expect(mockRegisterUser.mock.calls[0][0]).not.toHaveProperty('confirmPassword');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('calls loginWithGoogle on Google button click', async () => {
    mockLoginWithGoogle.mockResolvedValue({});
    renderRegisterPage();
    const user = userEvent.setup();

    await user.click(screen.getByText('Google'));
    expect(mockLoginWithGoogle).toHaveBeenCalled();
  });

  it('shows alert on GitHub login click', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderRegisterPage();
    const user = userEvent.setup();

    await user.click(screen.getByText('GitHub'));
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('GitHub'));

    alertMock.mockRestore();
  });

  it('provides link to login page', () => {
    renderRegisterPage();
    const loginLink = screen.getByText('Masuk sekarang');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('shows StepUpLogo', () => {
    renderRegisterPage();
    expect(screen.getByText('StepUp')).toBeInTheDocument();
  });
});
