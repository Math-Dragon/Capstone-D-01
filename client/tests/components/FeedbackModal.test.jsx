import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeedbackModal from '../../src/components/FeedbackModal';

describe('FeedbackModal', () => {
  it('renders feedback form', () => {
    render(<FeedbackModal task={{ title: 'Test Task' }} isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Feedback Tugas')).toBeInTheDocument();
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('renders difficulty options', () => {
    render(<FeedbackModal task={{ title: 'Task' }} isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Terlalu Mudah')).toBeInTheDocument();
    expect(screen.getByText('Pas')).toBeInTheDocument();
    expect(screen.getByText('Terlalu Sulit')).toBeInTheDocument();
  });

  it('calls onConfirm with feedback data', () => {
    const onConfirm = vi.fn();
    render(<FeedbackModal task={{ title: 'Task' }} isOpen={true} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText('Sulit'));
    fireEvent.change(screen.getByPlaceholderText(/perasaanmu/), { target: { value: 'Challenging' } });
    fireEvent.click(screen.getByText('Kirim Feedback'));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'feedback', difficulty: 4, notes: 'Challenging' }),
    );
  });

  it('calls onCancel when Batal clicked', () => {
    const onCancel = vi.fn();
    render(<FeedbackModal task={{ title: 'Task' }} isOpen={true} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Batal'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('renders focus stars', () => {
    render(<FeedbackModal task={{ title: 'Task' }} isOpen={true} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const stars = screen.getAllByLabelText(/Rating/);
    expect(stars).toHaveLength(5);
  });
});
