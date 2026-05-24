import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonCard, SkeletonList } from '../../../src/components/ui/Skeleton';

describe('Skeleton', () => {
  it('renders with text variant by default', () => {
    render(<Skeleton />);
    const el = screen.getByRole('status');
    expect(el.className).toContain('h-4');
    expect(el.className).toContain('w-full');
  });

  it('renders with circular variant', () => {
    render(<Skeleton variant="circular" />);
    const el = screen.getByRole('status');
    expect(el.className).toContain('rounded-full');
  });

  it('renders with rectangular variant', () => {
    render(<Skeleton variant="rectangular" />);
    const el = screen.getByRole('status');
    expect(el.className).toContain('rounded');
  });

  it('has aria-busy attribute', () => {
    render(<Skeleton />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('has sr-only loading text', () => {
    render(<Skeleton />);
    expect(screen.getByText('Memuat...')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Skeleton className="custom-class" />);
    const el = screen.getByRole('status');
    expect(el.className).toContain('custom-class');
  });
});

describe('SkeletonCard', () => {
  it('renders three skeletons', () => {
    render(<SkeletonCard />);
    const skeletons = screen.getAllByRole('status');
    expect(skeletons).toHaveLength(3);
  });
});

describe('SkeletonList', () => {
  it('renders default 3 items', () => {
    render(<SkeletonList />);
    const statuses = screen.getAllByRole('status');
    expect(statuses.length).toBeGreaterThanOrEqual(9);
  });

  it('renders custom count', () => {
    render(<SkeletonList count={2} />);
    const statuses = screen.getAllByRole('status');
    expect(statuses.length).toBeGreaterThanOrEqual(6);
  });
});
