import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../../src/pages/HomePage';

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  it('renders hero heading', () => {
    renderPage();
    expect(screen.getByText(/Rencanakan Belajarmu/)).toBeInTheDocument();
  });

  it('renders StepUpLogo with tagline', () => {
    renderPage();
    expect(screen.getByText('StepUp')).toBeInTheDocument();
    expect(screen.getByText('MICRO-LEARNING')).toBeInTheDocument();
  });

  it('renders AI Learning Coach badge', () => {
    renderPage();
    expect(screen.getByText('AI Learning Coach untuk Bootcamp')).toBeInTheDocument();
  });

  it('renders register link', () => {
    renderPage();
    expect(screen.getByText('Mulai Sekarang — Gratis')).toBeInTheDocument();
  });

  it('renders login link', () => {
    renderPage();
    expect(screen.getByText('Sudah Punya Akun')).toBeInTheDocument();
  });

  it('renders feature cards', () => {
    renderPage();
    expect(screen.getByText('AI-Powered Planning')).toBeInTheDocument();
    expect(screen.getByText('Jadwal Terstruktur')).toBeInTheDocument();
    expect(screen.getByText('Tracking Progres')).toBeInTheDocument();
  });

  it('renders stats section', () => {
    renderPage();
    expect(screen.getByText('Learning Coach')).toBeInTheDocument();
    expect(screen.getByText('Akses Kapan Saja')).toBeInTheDocument();
    expect(screen.getByText('Gratis')).toBeInTheDocument();
  });

  it('renders how it works section', () => {
    renderPage();
    expect(screen.getByText('Cara Kerjanya')).toBeInTheDocument();
    expect(screen.getByText('Buat Target')).toBeInTheDocument();
    expect(screen.getByText('AI Susun Rencana')).toBeInTheDocument();
    expect(screen.getByText('Kerjakan & Track')).toBeInTheDocument();
  });

  it('renders CTA section', () => {
    renderPage();
    expect(screen.getByText('Siap Memulai?')).toBeInTheDocument();
    expect(screen.getByText('Buat Akun Gratis')).toBeInTheDocument();
    expect(screen.getByText('Masuk')).toBeInTheDocument();
  });

  it('renders feature section heading', () => {
    renderPage();
    expect(screen.getByText('Semua yang Kamu Butuhkan')).toBeInTheDocument();
  });
});
