import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../../src/components/ErrorBoundary';

const ThrowError = () => { throw new Error('Test error'); };

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(<ErrorBoundary><span>OK</span></ErrorBoundary>);
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('renders fallback on error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><ThrowError /></ErrorBoundary>);
    expect(screen.getByText('Terjadi kesalahan')).toBeInTheDocument();
    expect(screen.getByText('Coba Lagi')).toBeInTheDocument();
    expect(screen.getByText('Muat ulang')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('renders custom message on error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary message="Custom error"><ThrowError /></ErrorBoundary>);
    expect(screen.getByText('Custom error')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('calls onError when error occurs', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    render(<ErrorBoundary onError={onError}><ThrowError /></ErrorBoundary>);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Test error',
      timestamp: expect.any(String),
    }));
    vi.restoreAllMocks();
  });

  it('handleReset button exists and triggers reset', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><ThrowError /></ErrorBoundary>);
    const resetBtn = screen.getByText('Coba Lagi');
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    vi.restoreAllMocks();
  });
});
