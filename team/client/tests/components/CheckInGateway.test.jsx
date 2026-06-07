import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../src/features/coach/hooks/useCoach', () => ({
  useCoach: () => ({ handleCheckIn: vi.fn().mockResolvedValue({}) }),
}));

import CheckInGateway from '../../src/components/CheckInGateway';

describe('CheckInGateway', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
  });

  it('renders children when already checked in', () => {
    localStorage.setItem('lastCheckIn', new Date().toISOString().slice(0, 10));
    render(<CheckInGateway><div>Dashboard</div></CheckInGateway>);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders children when no token', () => {
    localStorage.removeItem('token');
    render(<CheckInGateway><div>Dashboard</div></CheckInGateway>);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows check-in dialog when not checked in', () => {
    render(<CheckInGateway><div>Dashboard</div></CheckInGateway>);
    expect(screen.getByText('Hai, bagaimana perasaanmu hari ini?')).toBeInTheDocument();
  });

  it('renders mood options', () => {
    render(<CheckInGateway><div>Dashboard</div></CheckInGateway>);
    expect(screen.getByLabelText('Bersemangat')).toBeInTheDocument();
    expect(screen.getByLabelText('Baik')).toBeInTheDocument();
    expect(screen.getByLabelText('Lelah')).toBeInTheDocument();
  });

  it('disables submit when no mood selected', () => {
    render(<CheckInGateway><div>Dashboard</div></CheckInGateway>);
    expect(screen.getByText('Lanjutkan')).toBeDisabled();
  });

  it('skips check-in and shows children', () => {
    render(<CheckInGateway><div>Dashboard</div></CheckInGateway>);
    fireEvent.click(screen.getByText('Lewati'));
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('enables submit when mood is selected', () => {
    render(<CheckInGateway><div>Dashboard</div></CheckInGateway>);
    fireEvent.click(screen.getByLabelText('Bersemangat'));
    expect(screen.getByText('Lanjutkan')).not.toBeDisabled();
  });
});
