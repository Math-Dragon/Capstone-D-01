import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../../../src/features/auth/components/LoginPage';

vi.mock('../../../../src/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    loading: false,
    error: 'Email atau password tidak cocok.',
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage accessibility states', () => {
  it('announces auth errors with recovery help', () => {
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('Email atau password tidak cocok.');
    expect(screen.getByText(/Periksa kembali email dan password/i)).toBeInTheDocument();
  });

  it('labels the password visibility control', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /Tampilkan password/i })).toBeInTheDocument();
  });

  it('labels form fields for assistive technology', () => {
    renderPage();

    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});
