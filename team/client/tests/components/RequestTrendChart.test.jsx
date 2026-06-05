import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RequestTrendChart from '../../src/components/RequestTrendChart';

const byDay = [
  { date: '2026-06-01', requests: 10, errors: 0 },
  { date: '2026-06-02', requests: 15, errors: 1 },
];

const byDayAccept = [
  { date: '2026-06-01', recRate: 0.75, taskRate: 0.80 },
  { date: '2026-06-02', recRate: 0.80, taskRate: 0.85 },
];

describe('RequestTrendChart', () => {
  it('renders period switcher tabs', () => {
    render(<RequestTrendChart period={30} onPeriodChange={() => {}} />);

    expect(screen.getByText('7 Hari')).toBeInTheDocument();
    expect(screen.getByText('30 Hari')).toBeInTheDocument();
    expect(screen.getByText('90 Hari')).toBeInTheDocument();
  });

  it('highlights active period tab', () => {
    render(<RequestTrendChart period={7} onPeriodChange={() => {}} />);

    const tab7 = screen.getByText('7 Hari');
    expect(tab7.className).toContain('bg-white');
    expect(tab7.className).toContain('shadow-sm');
  });

  it('calls onPeriodChange when a tab is clicked', () => {
    const onPeriodChange = vi.fn();
    render(<RequestTrendChart period={30} onPeriodChange={onPeriodChange} />);

    fireEvent.click(screen.getByText('90 Hari'));
    expect(onPeriodChange).toHaveBeenCalledWith(90);
  });

  it('renders chart titles', () => {
    render(<RequestTrendChart byDay={byDay} byDayAccept={byDayAccept} period={30} onPeriodChange={() => {}} />);

    expect(screen.getByText('Request Trend')).toBeInTheDocument();
    expect(screen.getByText('Accept Rate Trend')).toBeInTheDocument();
  });

  it('shows empty state when byDay is empty', () => {
    render(<RequestTrendChart byDay={[]} period={30} onPeriodChange={() => {}} />);

    expect(screen.getByText('Belum ada data request.')).toBeInTheDocument();
  });

  it('shows empty state when byDayAccept is empty', () => {
    render(<RequestTrendChart byDay={byDay} byDayAccept={[]} period={30} onPeriodChange={() => {}} />);

    expect(screen.getByText('Belum ada data acceptance rate.')).toBeInTheDocument();
  });
});
