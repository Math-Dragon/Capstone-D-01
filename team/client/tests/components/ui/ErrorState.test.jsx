import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorState from '../../../src/components/ui/ErrorState';

describe('ErrorState', () => {
  it('renders with message and help text', () => {
    render(<ErrorState message="Terjadi kesalahan." helpText="Coba lagi nanti." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Terjadi kesalahan.');
    expect(screen.getByText('Coba lagi nanti.')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Gagal." onRetry={onRetry} />);

    expect(screen.getByRole('button', { name: 'Coba Lagi' })).toBeInTheDocument();
  });
});
