import { describe, it, expect } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import SlotDivider from '../../src/components/SlotDivider';

describe('SlotDivider', () => {
  afterEach(() => cleanup());

  it('renders morning slot', () => {
    const { container } = render(<SlotDivider slot="morning" />);
    expect(container.querySelector('[aria-label="Sesi PAGI"]')).toBeInTheDocument();
  });

  it('renders afternoon slot', () => {
    const { container } = render(<SlotDivider slot="afternoon" />);
    expect(container.querySelector('[aria-label="Sesi SIANG"]')).toBeInTheDocument();
  });

  it('renders evening slot', () => {
    const { container } = render(<SlotDivider slot="evening" />);
    expect(container.querySelector('[aria-label="Sesi MALAM"]')).toBeInTheDocument();
  });

  it('returns null for unknown slot', () => {
    const { container } = render(<SlotDivider slot="unknown" />);
    expect(container.firstChild).toBeNull();
  });

  it('applies first styling', () => {
    const { container } = render(<SlotDivider slot="morning" first />);
    const div = container.querySelector('[aria-label]');
    expect(div.className).toContain('mt-2');
  });

  it('applies non-first styling by default', () => {
    const { container } = render(<SlotDivider slot="morning" />);
    const div = container.querySelector('[aria-label]');
    expect(div.className).toContain('mt-5');
  });
});
