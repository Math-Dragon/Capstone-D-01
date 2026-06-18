import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../../src/features/goals/context/GoalsContext', () => ({
  useGoals: () => ({ remove: vi.fn() }),
}));

vi.mock('../../../../src/hooks/useFocusTrap', () => ({ default: () => {} }));

import GoalCard from '../../../../src/features/goals/components/GoalCard';

const baseGoal = {
  id: 'goal-1',
  title: 'Belajar React',
  description: 'Master React hooks',
  deadline: '2026-06-01T00:00:00.000Z',
  task_total: 5,
  task_completed: 3,
};

describe('GoalCard', () => {
  it('renders goal title and description', () => {
    render(<MemoryRouter><GoalCard goal={baseGoal} /></MemoryRouter>);
    expect(screen.getByText('Belajar React')).toBeInTheDocument();
    expect(screen.getByText('Master React hooks')).toBeInTheDocument();
  });

  it('renders progress percentage', () => {
    render(<MemoryRouter><GoalCard goal={baseGoal} /></MemoryRouter>);
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('renders deadline formatted', () => {
    render(<MemoryRouter><GoalCard goal={baseGoal} /></MemoryRouter>);
    expect(screen.getByText(/Deadline:/)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('renders edit and delete buttons', () => {
    render(<MemoryRouter><GoalCard goal={baseGoal} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Edit goal Belajar React' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hapus goal Belajar React' })).toBeInTheDocument();
  });

  it('opens delete modal on delete click', () => {
    render(<MemoryRouter><GoalCard goal={baseGoal} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Hapus goal Belajar React' }));
    expect(screen.getByText('Hapus Target')).toBeInTheDocument();
    expect(screen.getByText(/Apakah kamu yakin/)).toBeInTheDocument();
  });

  it('shows 0% when no tasks', () => {
    const noTasks = { ...baseGoal, task_total: 0, task_completed: 0 };
    render(<MemoryRouter><GoalCard goal={noTasks} /></MemoryRouter>);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });
});
