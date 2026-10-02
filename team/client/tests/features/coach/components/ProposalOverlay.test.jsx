import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProposalOverlay from '../../../../src/features/coach/components/ProposalOverlay';

describe('ProposalOverlay', () => {
  it('returns null when no proposal', () => {
    const { container } = render(<ProposalOverlay proposal={null} onAccept={vi.fn()} onReject={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders proposal summary', () => {
    render(<ProposalOverlay proposal={{ summary: 'Rencana diubah', tasks: [] }} onAccept={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('Rencana diubah')).toBeInTheDocument();
    expect(screen.getByText('Saran penyesuaian rencana')).toBeInTheDocument();
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

  it('calls onAccept when Terapkan clicked', () => {
    const onAccept = vi.fn();
    render(<ProposalOverlay proposal={{ summary: 'test', tasks: [] }} onAccept={onAccept} onReject={vi.fn()} />);
    fireEvent.click(screen.getByText('Terapkan'));
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

  it('closes (not rejects) on Escape', () => {
    const onDismiss = vi.fn();
    const onReject = vi.fn();
    render(
      <ProposalOverlay
        proposal={{ summary: 'test', tasks: [] }}
        onAccept={vi.fn()}
        onReject={onReject}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onReject).not.toHaveBeenCalled();
  });

  it('closes (not rejects) on backdrop click', () => {
    const onDismiss = vi.fn();
    const onReject = vi.fn();
    const { container } = render(
      <ProposalOverlay
        proposal={{ summary: 'test', tasks: [] }}
        onAccept={vi.fn()}
        onReject={onReject}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(container.firstChild);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onReject).not.toHaveBeenCalled();
  });

  it('does not throw on Escape when onDismiss is omitted', () => {
    render(<ProposalOverlay proposal={{ summary: 'test', tasks: [] }} onAccept={vi.fn()} onReject={vi.fn()} />);
    expect(() => fireEvent.keyDown(window, { key: 'Escape' })).not.toThrow();
  });

  it('renders server change groups with prefixes and labels', () => {
    const proposal = {
      summary: 'Adaptasi mingguan',
      changes: {
        added: [{ title: 'Latihan soal', task_type: 'practice', duration_estimate: 30, planned_date: '2026-05-20' }],
        modified: [{ title: 'Baca materi', task_type: 'read', duration_estimate: 45, planned_slot: 'morning' }],
        removed: [{ title: 'Les privat', task_type: 'review', duration_estimate: 60 }],
        rescheduled: [{ title: 'Mock test', task_type: 'exam', planned_date: '2026-05-22' }],
      },
    };
    render(<ProposalOverlay proposal={proposal} onAccept={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByText('Latihan soal')).toBeInTheDocument();
    expect(screen.getByText('Baca materi')).toBeInTheDocument();
    expect(screen.getByText('Les privat')).toBeInTheDocument();
    expect(screen.getByText('Mock test')).toBeInTheDocument();

    expect(screen.getByText(/\+\s*Ditambahkan/)).toBeInTheDocument();
    expect(screen.getByText(/~\s*Diubah/)).toBeInTheDocument();
    expect(screen.getByText(/−\s*Dihapus/)).toBeInTheDocument();
    expect(screen.getByText(/↻\s*Dijadwalkan ulang/)).toBeInTheDocument();
    expect(screen.getByText('30m')).toBeInTheDocument();
    expect(screen.getByText('2026-05-22')).toBeInTheDocument();
  });

  it('renders at most three evidence items with allowed fields only', () => {
    const proposal = {
      summary: 'Adaptasi',
      evidence: [
        { code: 'LOW_COMPLETION', summary: 'Penyelesaian rendah', window: '7d', count: 3, reasoning: 'rahasia' },
        { code: 'MISSED_SLOTS', summary: 'Slot terlewat', window: '7d', count: 2, raw_prompt: 'jangan' },
        { code: 'PACE_DROP', summary: 'Pace turun', window: '14d', count: 1 },
        { code: 'EXTRA', summary: 'Keempat', window: '30d', count: 9 },
      ],
      changes: { added: [{ title: 'Tugas baru' }] },
    };
    const { container } = render(<ProposalOverlay proposal={proposal} onAccept={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByText('Yang perlu kamu tahu')).toBeInTheDocument();
    expect(screen.getByText('LOW_COMPLETION')).toBeInTheDocument();
    expect(screen.getByText('PACE_DROP')).toBeInTheDocument();
    expect(screen.queryByText('EXTRA')).not.toBeInTheDocument();
    // evidence sits above the change list
    const headings = Array.from(container.querySelectorAll('h4')).map((h) => h.textContent.trim());
    expect(headings[0]).toContain('Yang perlu kamu tahu');
    expect(headings[1]).toContain('Ditambahkan');
    expect(container.textContent).not.toContain('rahasia');
    expect(container.textContent).not.toContain('jangan');
  });

  it('renders inline error with role alert', () => {
    render(
      <ProposalOverlay
        proposal={{ summary: 'test', tasks: [] }}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        error="Gagal menyimpan rencana. Coba lagi."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal menyimpan rencana. Coba lagi.');
  });

  it('disables Tolak while rejecting', () => {
    render(<ProposalOverlay proposal={{ summary: 'test', tasks: [] }} onAccept={vi.fn()} onReject={vi.fn()} rejecting />);
    expect(screen.getByText('Tolak')).toBeDisabled();
    expect(screen.getByText('Terapkan')).toBeEnabled();
  });
});
