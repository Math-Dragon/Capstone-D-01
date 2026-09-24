import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from '../../../src/features/auth/components/ForgotPasswordPage';
import VerifyOtpPage from '../../../src/features/auth/components/VerifyOtpPage';
import ResetPasswordPage from '../../../src/features/auth/components/ResetPasswordPage';
import SettingsPage from '../../../src/features/auth/components/SettingsPage';

vi.mock('../../../src/features/auth/services/authService', () => ({ default: {} }));
vi.mock('../../../src/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'a@b.com' }, refreshProfile: vi.fn() }) }));

describe('OTP flow pages render without crashing (regression: zodResolver(undefined))', () => {
  const renderPage = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

  it('renders ForgotPasswordPage', () => {
    renderPage(<ForgotPasswordPage />);
    expect(screen.getByRole('heading', { name: /lupa password/i })).toBeTruthy();
  });

  it('renders VerifyOtpPage', () => {
    renderPage(<VerifyOtpPage />);
    expect(screen.getByRole('heading', { name: /kode otp/i })).toBeTruthy();
  });

  it('renders ResetPasswordPage', () => {
    renderPage(<ResetPasswordPage />);
    expect(screen.getByRole('heading', { name: /password baru/i })).toBeTruthy();
  });

  it('renders SettingsPage', () => {
    renderPage(<SettingsPage />);
    expect(screen.getByRole('heading', { name: /akun & keamanan/i })).toBeTruthy();
  });
});
