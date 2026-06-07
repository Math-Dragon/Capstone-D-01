import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ObservabilityMetrics from '../../../src/features/coach/components/ObservabilityMetrics';

describe('ObservabilityMetrics', () => {
  it('shows empty state when no data', () => {
    render(<ObservabilityMetrics />);

    expect(screen.getByText('Belum ada metrik.')).toBeInTheDocument();
  });

  it('renders student metrics', () => {
    const student = { streak_days: 5, total_completed: 20, total_skipped: 2, completion_rate_7d: 0.8 };
    render(<ObservabilityMetrics student={student} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('renders recommendation metrics', () => {
    const recs = { ai_tasks_suggested_total: 10, ai_tasks_accepted_total: 7, accept_rate: '0.70' };
    render(<ObservabilityMetrics recommendations={recs} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
