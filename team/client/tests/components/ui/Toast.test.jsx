import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../../../src/components/ui/Toast';

function TestComponent() {
  const { addToast } = useToast();
  return (
    <div>
      <button onClick={() => addToast('Hello', 'info')}>Add Info</button>
      <button onClick={() => addToast('Success!', 'success')}>Add Success</button>
      <button onClick={() => addToast('Error!', 'error')}>Add Error</button>
    </div>
  );
}

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());

  it('renders nothing initially', () => {
    render(
      <ToastProvider><TestComponent /></ToastProvider>,
    );
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('shows toast when addToast is called', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    fireEvent.click(screen.getByText('Add Info'));
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows toast with correct type styling', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    fireEvent.click(screen.getByText('Add Success'));
    const toast = screen.getByText('Success!').closest('div');
    expect(toast.className).toContain('bg-green-600');
  });

  it('removes toast on close button click', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    fireEvent.click(screen.getByText('Add Info'));
    expect(screen.getByText('Hello')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /tutup notifikasi: hello/i }));
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('auto-removes toast after duration', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    fireEvent.click(screen.getByText('Add Info'));
    expect(screen.getByText('Hello')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('throws when useToast used outside provider', () => {
    expect(() => render(<TestComponent />)).toThrow('useToast must be used within ToastProvider');
  });
});
