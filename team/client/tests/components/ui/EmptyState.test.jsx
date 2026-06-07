import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from '../../../src/components/ui/EmptyState';

describe('EmptyState', () => {
  it('renders with title and description', () => {
    render(<EmptyState title="No data" description="Belum ada data tersedia." />);

    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Belum ada data tersedia.')).toBeInTheDocument();
  });

  it('renders with action button when onRetry provided', () => {
    const onAction = vi.fn();
    render(<EmptyState title="No data" actionLabel="Tambah Data" onAction={onAction} action />);

    expect(screen.getByRole('button', { name: 'Tambah Data' })).toBeInTheDocument();
  });
});
