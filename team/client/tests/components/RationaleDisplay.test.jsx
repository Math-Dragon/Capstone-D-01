import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RationaleDisplay from '../../src/components/RationaleDisplay';

describe('RationaleDisplay', () => {
  it('renders the AI rationale with an accessible label', () => {
    render(<RationaleDisplay rationale="Belajar pagi cocok untuk fokus mendalam." />);

    expect(screen.getByText('Rationale AI')).toBeInTheDocument();
    expect(screen.getByText('Belajar pagi cocok untuk fokus mendalam.')).toBeInTheDocument();
  });

  it('returns null when the rationale is empty', () => {
    const { container } = render(<RationaleDisplay rationale="" />);

    expect(container.firstChild).toBeNull();
  });
});
