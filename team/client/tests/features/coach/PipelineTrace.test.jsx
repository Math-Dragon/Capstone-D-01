import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PipelineTrace from '../../../src/features/coach/components/PipelineTrace';

describe('PipelineTrace', () => {
  it('shows empty state when no trace data', () => {
    render(<PipelineTrace />);

    expect(screen.getByText('Belum ada data pipeline.')).toBeInTheDocument();
  });

  it('renders attempts with status', () => {
    const trace = {
      duration_ms: 2500,
      attempts: [
        { attempt: 1, source: 'gemini', status: 'success', duration_ms: 1200, usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 } },
        { attempt: 2, source: 'openrouter', status: 'transient_error', duration_ms: 800, error: 'Rate limited' },
      ],
    };
    render(<PipelineTrace trace={trace} />);

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText(/gemini/)).toBeInTheDocument();
    expect(screen.getByText(/openrouter/)).toBeInTheDocument();
  });
});
