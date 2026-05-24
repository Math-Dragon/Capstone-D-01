import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModifyTaskModal from '../../src/components/ModifyTaskModal';

describe('ModifyTaskModal', () => {
  const task = { id: '1', title: 'Original', duration_estimate: 30, planned_slot: 'morning', planned_date: '2026-06-01' };

  it('renders form fields', () => {
    render(<ModifyTaskModal task={task} isOpen={true} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Modify Tugas')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Original')).toBeInTheDocument();
  });

  it('calls onSave with modified data', () => {
    const onSave = vi.fn();
    render(<ModifyTaskModal task={task} isOpen={true} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue('Original'), { target: { value: 'Updated Task' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Updated Task', taskId: '1' }),
    );
  });

  it('shows validation errors for empty title', () => {
    render(<ModifyTaskModal task={task} isOpen={true} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue('Original'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Judul wajib diisi')).toBeInTheDocument();
  });

  it('calls onCancel when Batal clicked', () => {
    const onCancel = vi.fn();
    render(<ModifyTaskModal task={task} isOpen={true} onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Batal'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('renders slot options', () => {
    render(<ModifyTaskModal task={task} isOpen={true} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('☀️ Pagi')).toBeInTheDocument();
    expect(screen.getByText('⛅ Siang')).toBeInTheDocument();
    expect(screen.getByText('🌙 Malam')).toBeInTheDocument();
  });
});
