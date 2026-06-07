import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../../../../src/features/auth/components/RegisterPage';

vi.mock('../../../../src/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    loading: false,
    error: 'Email sudah digunakan.',
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe('RegisterPage accessibility states', () => {
  it('announces registration errors with recovery help', () => {
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('Email sudah digunakan.');
    expect(screen.getByText(/Gunakan email lain/i)).toBeInTheDocument();
  });

  it('labels both password visibility controls', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /Tampilkan password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tampilkan konfirmasi password/i })).toBeInTheDocument();
  });

  it('labels form fields for assistive technology', () => {
    renderPage();

    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Konfirmasi Password')).toBeInTheDocument();
  });
});
