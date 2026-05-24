import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StepUpLogo from '../../../src/components/ui/StepUpLogo';

describe('StepUpLogo', () => {
  it('renders StepUp text', () => {
    render(<StepUpLogo />);
    expect(screen.getByText('StepUp')).toBeInTheDocument();
  });

  it('renders with default md size', () => {
    const { container } = render(<StepUpLogo />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '36');
  });

  it('renders with sm size', () => {
    const { container } = render(<StepUpLogo size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '28');
  });

  it('renders with lg size', () => {
    const { container } = render(<StepUpLogo size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '44');
  });

  it('does not show tagline by default', () => {
    render(<StepUpLogo />);
    expect(screen.queryByText('MICRO-LEARNING')).not.toBeInTheDocument();
  });

  it('shows tagline when showTagline is true', () => {
    render(<StepUpLogo showTagline />);
    expect(screen.getByText('MICRO-LEARNING')).toBeInTheDocument();
  });

  it('falls back to md for unknown size', () => {
    const { container } = render(<StepUpLogo size="xl" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '36');
  });
});
