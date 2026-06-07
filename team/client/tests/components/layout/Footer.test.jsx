import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from '../../../src/components/layout/Footer';

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe('Footer', () => {
  it('renders copyright with current year', () => {
    renderFooter();
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year} StepUp`))).toBeInTheDocument();
  });

  it('renders platform links', () => {
    renderFooter();
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Kalender')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Coach')).toBeInTheDocument();
  });

  it('renders StepUpLogo', () => {
    renderFooter();
    expect(screen.getByText('StepUp')).toBeInTheDocument();
  });

  it('renders resource section', () => {
    renderFooter();
    expect(screen.getByText('Sumber Daya')).toBeInTheDocument();
    expect(screen.getByText('Panduan')).toBeInTheDocument();
  });

  it('renders contact section', () => {
    renderFooter();
    expect(screen.getByText('Hubungi')).toBeInTheDocument();
  });
});
