import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SkipTaskModal from '../../src/components/SkipTaskModal';

describe('SkipTaskModal', () => {
  it('renders skip reasons', () => {
    render(<SkipTaskModal task={{ title: 'My Task' }} isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('My Task')).toBeInTheDocument();
    expect(screen.getByText('Terlalu sulit')).toBeInTheDocument();
    expect(screen.getByText('Tidak punya waktu')).toBeInTheDocument();
    expect(screen.getByText('Tidak relevan')).toBeInTheDocument();
    expect(screen.getByText('Kurang energi')).toBeInTheDocument();
  });

  it('disables confirm when no reason selected', () => {
    render(<SkipTaskModal task={{ title: 'Task' }} isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Konfirmasi Skip')).toBeDisabled();
  });

  it('enables confirm when reason is selected', () => {
    render(<SkipTaskModal task={{ title: 'Task' }} isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('Terlalu sulit'));
    expect(screen.getByText('Konfirmasi Skip')).not.toBeDisabled();
  });

  it('calls onConfirm with reason and note', () => {
    const onConfirm = vi.fn();
    render(<SkipTaskModal task={{ title: 'Task' }} isOpen={true} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('Terlalu sulit'));
    fireEvent.change(screen.getByPlaceholderText('Kenapa tugas ini dilewatkan?'), { target: { value: 'Too hard' } });
    fireEvent.click(screen.getByText('Konfirmasi Skip'));
    expect(onConfirm).toHaveBeenCalledWith({ action: 'skip', reason: 'too_hard', note: 'Too hard' });
  });

  it('calls onCancel when Batal clicked', () => {
    const onCancel = vi.fn();
    render(<SkipTaskModal task={{ title: 'Task' }} isOpen={true} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Batal'));
    expect(onCancel).toHaveBeenCalled();
  });
});
