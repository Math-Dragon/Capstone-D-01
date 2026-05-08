import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProposalOverlay from '../../src/components/ProposalOverlay';

describe('ProposalOverlay', () => {
  it('returns null when no proposal', () => {
    const { container } = render(<ProposalOverlay proposal={null} onAccept={vi.fn()} onReject={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders proposal summary', () => {
    render(<ProposalOverlay proposal={{ summary: 'Rencana diubah', tasks: [] }} onAccept={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('Rencana diubah')).toBeInTheDocument();
    expect(screen.getByText('Coach Menyesuaikan Rencana')).toBeInTheDocument();
  });

  it('renders proposal tasks', () => {
    const tasks = [
      { id: '1', title: 'Task A', diffType: 'added', task_type: 'practice', duration_estimate: 30 },
      { id: '2', title: 'Task B', diffType: 'removed', task_type: 'review', duration_estimate: 45, rationale: 'Not needed' },
    ];
    render(<ProposalOverlay proposal={{ summary: 'test', tasks }} onAccept={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('Task A')).toBeInTheDocument();
    expect(screen.getByText('Task B')).toBeInTheDocument();
    expect(screen.getByText('Not needed')).toBeInTheDocument();
  });

  it('calls onAccept when Setuju clicked', () => {
    const onAccept = vi.fn();
    render(<ProposalOverlay proposal={{ summary: 'test', tasks: [] }} onAccept={onAccept} onReject={vi.fn()} />);
    fireEvent.click(screen.getByText('Setuju'));
    expect(onAccept).toHaveBeenCalled();
  });

  it('calls onReject when Tolak clicked', () => {
    const onReject = vi.fn();
    render(<ProposalOverlay proposal={{ summary: 'test', tasks: [] }} onAccept={vi.fn()} onReject={onReject} />);
    fireEvent.click(screen.getByText('Tolak'));
    expect(onReject).toHaveBeenCalled();
  });

  it('shows loading state when accepting', () => {
    render(<ProposalOverlay proposal={{ summary: 'test', tasks: [] }} onAccept={vi.fn()} onReject={vi.fn()} accepting />);
    expect(screen.getByText('Menyimpan...')).toBeInTheDocument();
  });
});
