import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuditTrail from '../../../src/features/coach/components/AuditTrail';

describe('AuditTrail', () => {
  it('shows empty state when no logs', () => {
    render(<AuditTrail logs={[]} />);

    expect(screen.getByText('Belum ada catatan audit.')).toBeInTheDocument();
  });

  it('renders log entries', () => {
    const logs = [
      { id: '1', action: 'COACH_TASK_ACCEPTED', metadata: { task_title: 'Belajar React' }, created_at: '2026-06-03T10:00:00Z' },
      { id: '2', action: 'COACH_TASK_SKIPPED', metadata: { reason: 'too_hard' }, created_at: '2026-06-03T11:00:00Z' },
    ];
    render(<AuditTrail logs={logs} actionCounts={{ COACH_TASK_ACCEPTED: 1, COACH_TASK_SKIPPED: 1 }} />);

    expect(screen.getAllByText('Accepted')).toHaveLength(2);
    expect(screen.getByText('Skipped', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Belajar React')).toBeInTheDocument();
  });
});
