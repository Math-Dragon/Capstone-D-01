import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../../../src/features/auth/components/LoginPage';

const { loginWithOtp, requestLoginOtp } = vi.hoisted(() => ({
  loginWithOtp: vi.fn().mockResolvedValue({ access_token: 'at' }),
  requestLoginOtp: vi.fn().mockResolvedValue({ message: 'sent' }),
}));

vi.mock('../../../../src/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    loginWithOtp,
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../../src/features/auth/services/authService', () => ({
  default: { requestLoginOtp },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage email code mode', () => {
  beforeEach(() => {
    loginWithOtp.mockClear();
    requestLoginOtp.mockClear();
  });

  it('requests a code then verifies it', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: /Kode email/i }));
    await user.type(screen.getByLabelText('Email'), 'user@test.com');
    await user.click(screen.getByRole('button', { name: /Kirim kode masuk/i }));

    await waitFor(() => expect(requestLoginOtp).toHaveBeenCalledWith({ email: 'user@test.com' }));

    const codeInput = await screen.findByLabelText('Kode OTP');
    await user.type(codeInput, '123456');
    await user.click(screen.getByRole('button', { name: /^Masuk$/i }));

    await waitFor(() => expect(loginWithOtp).toHaveBeenCalledWith({ email: 'user@test.com', otp: '123456' }));
  });

  it('exposes a way back to password login', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: /Kode email/i }));
    await user.click(screen.getByRole('button', { name: /Masuk dengan password/i }));

    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});
