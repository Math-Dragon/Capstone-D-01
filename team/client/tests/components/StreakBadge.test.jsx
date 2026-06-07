import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StreakBadge from '../../src/components/StreakBadge';

describe('StreakBadge', () => {
  it('renders null when streak is 0', () => {
    const { container } = render(<StreakBadge streak={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders null when streak is falsy', () => {
    const { container } = render(<StreakBadge />);
    expect(container.innerHTML).toBe('');
  });

  it('displays streak count', () => {
    render(<StreakBadge streak={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('hari streak')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    render(<StreakBadge streak={7} />);
    expect(screen.getByLabelText('7 hari streak')).toBeInTheDocument();
  });

  it('renders fire emoji for active streak', () => {
    render(<StreakBadge streak={7} />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });
});
