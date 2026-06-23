import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarPage from '../../src/pages/CalendarPage';
import api from '../../src/services/api';

vi.mock('../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    downloadCalendarExport: vi.fn(),
  },
}));

vi.mock('../../src/store/slices/observabilitySlice', () => ({
  fetchStudentMetrics: () => ({ type: 'observability/fetchStudentMetrics' }),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: (selector) => selector({
    observability: {
      studentMetrics: {
        streak_days: '2',
        completion_rate_7d: '0.5',
        total_completed: '3',
        avg_difficulty_7d: '2.5',
      },
    },
  }),
}));

vi.mock('../../src/hooks/useTaskActions', () => ({
  default: () => ({
    proposal: null,
    activeModal: null,
    activeTask: null,
    actionLoading: null,
    proposalAccepting: false,
    handleComplete: vi.fn(),
    handleSkip: vi.fn(),
    handleModify: vi.fn(),
    confirmSkip: vi.fn(),
    confirmModify: vi.fn(),
    submitFeedback: vi.fn(),
    acceptProposal: vi.fn(),
    rejectProposal: vi.fn(),
    closeModal: vi.fn(),
  }),
}));

vi.mock('../../src/components/AdjustmentPanel', () => ({
  default: () => <div data-testid="adjustment-panel" />,
}));

vi.mock('../../src/components/ModifyTaskModal', () => ({ default: () => null }));
vi.mock('../../src/components/SkipTaskModal', () => ({ default: () => null }));
vi.mock('../../src/components/FeedbackModal', () => ({ default: () => null }));
vi.mock('../../src/components/TaskDetailModal', () => ({ default: () => null }));
vi.mock('../../src/components/ProposalOverlay', () => ({ default: () => null }));
vi.mock('../../src/utils/invalidation', () => ({ onDataChanged: () => () => {} }));

const tasks = [
  {
    id: 'task-1',
    goal_id: 'goal-1',
    title: 'Current week morning task',
    status: 'todo',
    duration_estimate: 45,
    planned_date: '2026-05-18',
    planned_slot: 'morning',
    task_type: 'practice',
    source: 'ai',
  },
];

describe('Calendar export', () => {
  const originalCreateObjectURL = window.URL.createObjectURL;
  const originalRevokeObjectURL = window.URL.revokeObjectURL;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-20T08:00:00.000Z'));
    vi.clearAllMocks();
    api.get.mockResolvedValue(tasks);
    api.post.mockResolvedValue({});
    api.patch.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    document.createElement = originalCreateElement;
  });

  it('renders an export calendar action', async () => {
    render(<CalendarPage />);

    expect(await screen.findByRole('button', { name: /Export Calendar/i })).toBeInTheDocument();
  });

  it('downloads the exported ics file when clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const blob = new Blob(['BEGIN:VCALENDAR'], { type: 'text/calendar' });
    const click = vi.fn();
    api.downloadCalendarExport.mockResolvedValue(blob);
    window.URL.createObjectURL = vi.fn(() => 'blob:calendar');
    window.URL.revokeObjectURL = vi.fn();
    document.createElement = vi.fn((tagName) => {
      if (tagName === 'a') {
        return {
          click,
          set href(value) { this._href = value; },
          get href() { return this._href; },
          set download(value) { this._download = value; },
          get download() { return this._download; },
        };
      }
      return originalCreateElement(tagName);
    });

    render(<CalendarPage />);

    await user.click(await screen.findByRole('button', { name: /Export Calendar/i }));

    await waitFor(() => {
      expect(api.downloadCalendarExport).toHaveBeenCalledTimes(1);
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(click).toHaveBeenCalledTimes(1);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:calendar');
    });
  });
});
