import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from '../../src/components/TaskCard';

const baseTask = {
  id: 'task-1',
  title: 'Belajar React Hooks',
  description: 'Pelajari useState dan useEffect',
  task_type: 'acquire',
  status: 'todo',
  priority: 'high',
  duration_estimate: 45,
  planned_slot: 'morning',
  rationale: 'Fokus pagi lebih baik untuk materi baru',
};

describe('TaskCard', () => {
  it('renders task title', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByText('Belajar React Hooks')).toBeInTheDocument();
  });

  it('renders task description', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByText('Pelajari useState dan useEffect')).toBeInTheDocument();
  });

  it('renders duration estimate', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByText('45m')).toBeInTheDocument();
  });

  it('shows action buttons for active task', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByLabelText(/Selesaikan tugas/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Modify task/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Skip task/)).toBeInTheDocument();
  });

  it('hides action buttons for done task', () => {
    render(<TaskCard task={{ ...baseTask, status: 'done' }} />);
    expect(screen.queryByLabelText(/Selesaikan tugas/)).not.toBeInTheDocument();
  });

  it('hides action buttons for skipped task', () => {
    render(<TaskCard task={{ ...baseTask, status: 'skipped' }} />);
    expect(screen.queryByLabelText(/Selesaikan tugas/)).not.toBeInTheDocument();
  });

  it('disables action buttons when loading', () => {
    render(<TaskCard task={baseTask} loading={true} />);
    const doneButton = screen.getByLabelText(/Selesaikan tugas/);
    expect(doneButton).toBeDisabled();
  });

  it('calls onComplete when Done clicked', () => {
    const onComplete = vi.fn();
    render(<TaskCard task={baseTask} onComplete={onComplete} />);
    fireEvent.click(screen.getByLabelText(/Selesaikan tugas/));
    expect(onComplete).toHaveBeenCalledWith(baseTask);
  });

  it('calls onModify when Modify clicked', () => {
    const onModify = vi.fn();
    render(<TaskCard task={baseTask} onModify={onModify} />);
    fireEvent.click(screen.getByLabelText(/Modify task/));
    expect(onModify).toHaveBeenCalledWith(baseTask);
  });

  it('calls onSkip when Skip clicked', () => {
    const onSkip = vi.fn();
    render(<TaskCard task={baseTask} onSkip={onSkip} />);
    fireEvent.click(screen.getByLabelText(/Skip task/));
    expect(onSkip).toHaveBeenCalledWith(baseTask);
  });

  it('calls onClickTitle when title clicked', () => {
    const onClickTitle = vi.fn();
    render(<TaskCard task={baseTask} onClickTitle={onClickTitle} />);
    fireEvent.click(screen.getByText('Belajar React Hooks'));
    expect(onClickTitle).toHaveBeenCalledWith(baseTask);
  });

  it('opens the task detail from keyboard on the task title', () => {
    const onClickTitle = vi.fn();
    render(<TaskCard task={baseTask} onClickTitle={onClickTitle} />);
    const titleButton = screen.getByRole('button', { name: /Buka detail task Belajar React Hooks/i });

    titleButton.focus();
    fireEvent.keyDown(titleButton, { key: 'Enter' });

    expect(onClickTitle).toHaveBeenCalledWith(baseTask);
  });

  it('toggles rationale visibility', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.queryByText('Fokus pagi lebih baik untuk materi baru')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Why this task?'));
    expect(screen.getByText('Fokus pagi lebih baik untuk materi baru')).toBeInTheDocument();
  });

  it('hides description in compact mode', () => {
    render(<TaskCard task={baseTask} compact={true} />);
    expect(screen.queryByText('Pelajari useState dan useEffect')).not.toBeInTheDocument();
  });

  it('applies line-through for done tasks', () => {
    render(<TaskCard task={{ ...baseTask, status: 'done' }} />);
    const title = screen.getByText('Belajar React Hooks');
    expect(title.className).toContain('line-through');
  });
});
