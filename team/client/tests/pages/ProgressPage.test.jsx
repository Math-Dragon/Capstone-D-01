import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('../../src/features/progress/services/progressService', () => {
  const api = {
    getOverview: vi.fn(),
    getHistory: vi.fn(),
    getHistoryDetail: vi.fn(),
    correctHistory: vi.fn(),
    deleteHistory: vi.fn(),
    createEvent: vi.fn(),
    getStats: vi.fn(),
    getTrend: vi.fn(),
    newClientEventId: vi.fn(() => 'evt_test'),
  };
  return { ...api, progressService: api, default: api };
});

vi.mock('../../src/features/coach/services/proposalService', () => {
  const api = {
    getPending: vi.fn(),
    getById: vi.fn(),
    accept: vi.fn(),
    reject: vi.fn(),
    newIdempotencyKey: vi.fn(() => 'idem_test_key'),
  };
  return { ...api, proposalService: api, default: api };
});

vi.mock('../../src/features/coach/components/ProposalOverlay', () => ({
  default: () => null,
}));

vi.mock('../../src/utils/invalidation', () => ({
  notifyMutation: vi.fn(),
}));

import {
  getOverview,
  getHistory,
  getHistoryDetail,
  correctHistory,
  deleteHistory,
} from '../../src/features/progress/services/progressService';
import proposalService from '../../src/features/coach/services/proposalService';
import ProgressPage from '../../src/pages/ProgressPage';

const EMPTY_PAGE = { items: [], page: { next_cursor: null, has_more: false } };

const OVERVIEW = {
  generated_at: '2026-09-28T00:00:00.000Z',
  timezone: 'Asia/Jakarta',
  period: { key: '7d', from: '2026-09-22', to: '2026-09-28', bucket: 'day' },
  insight: {
    code: 'momentum_positive',
    tone: 'positive',
    text: 'Penyelesaian tugasmu berjalan baik pada periode ini.',
  },
  health: {
    progress_percent: 75,
    completed_tasks: 6,
    total_tasks: 8,
    completed_minutes: 240,
    planned_minutes: 320,
    completion_rate: 0.75,
    average_difficulty: 3.5,
    difficulty_sample_count: 4,
  },
  activity: [
    { from: '2026-09-27', to: '2026-09-27', completed_tasks: 3, completed_minutes: 90 },
    { from: '2026-09-28', to: '2026-09-28', completed_tasks: 2, completed_minutes: 60 },
  ],
  distribution: {
    dimension: 'task_type',
    items: [
      { key: 'practice', label: 'Latihan', count: 5, completed_count: 4 },
      { key: 'review', label: 'Mengulas', count: 3, completed_count: 2 },
    ],
  },
  evidence: {
    available: true,
    signal_count: 2,
    event_count: 9,
    signals: [
      { code: 'completion_rate_7d', summary: 'Completion rate (7d): 75% (6/8 tasks)', window: '7d', count: 8 },
      { code: 'avg_difficulty_7d', summary: 'Average difficulty (7d): 3.5/5 (4 samples)', window: '7d', count: 4 },
    ],
  },
  coach_strategy: { text: 'Pertahankan ritme latihan harian.', source: 'rule' },
  pending_proposal: null,
};

const HISTORY_ITEM = {
  id: 'evt-1',
  event_type: 'submitted',
  occurred_at: '2026-09-27T07:12:00.000Z',
  mood: { value: 'good', label: 'Baik' },
  summary: 'Pagi ini fokusnya bagus.',
  source: 'daily_gateway',
  is_corrected: false,
  linked_task: null,
  linked_goal: null,
  actions: { can_view: true, can_correct: true, can_delete: true },
};

const HISTORY_DETAIL = {
  id: 'evt-1',
  event_type: 'submitted',
  occurred_at: '2026-09-27T07:12:00.000Z',
  mood: { value: 'good', label: 'Baik' },
  note: 'Fokus pagi ini oke.',
  source: 'daily_gateway',
  context: {},
  linked_task: null,
  linked_goal: null,
  correction: { is_corrected: false, corrected_at: null, count: 0 },
  version: 1,
};

function mockOverview(overrides = {}) {
  getOverview.mockResolvedValue({ ...OVERVIEW, ...overrides });
}

async function renderAndSettle() {
  render(<ProgressPage />);
  await waitFor(() => expect(screen.getByText('Perkembangan belajar')).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText('Asia/Jakarta')).toBeInTheDocument());
}

async function goToHistory() {
  fireEvent.click(screen.getByRole('tab', { name: 'Riwayat' }));
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Riwayat' })).toHaveAttribute('aria-selected', 'true'));
}

describe('ProgressPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHistory.mockResolvedValue(EMPTY_PAGE);
    getHistoryDetail.mockResolvedValue(HISTORY_DETAIL);
    correctHistory.mockResolvedValue(HISTORY_DETAIL);
    deleteHistory.mockResolvedValue({ id: 'evt-1', deleted: true });
    proposalService.getById.mockResolvedValue({ id: 'prop-1', summary: 'Rencana baru' });
    proposalService.accept.mockResolvedValue({ status: 'accepted' });
    proposalService.reject.mockResolvedValue({ status: 'rejected' });
  });

  it('shows a loading skeleton while the overview is being fetched', () => {
    getOverview.mockReturnValue(new Promise(() => {}));
    render(<ProgressPage />);
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('renders the Tren tab with period, timezone, and evidence from the response', async () => {
    mockOverview();
    await renderAndSettle();

    // Periode + zona waktu harus berasal dari respons, bukan ditebak klien.
    expect(screen.getByText('7 hari terakhir')).toBeInTheDocument();
    expect(screen.getByText('22 Sep 2026 – 28 Sep 2026')).toBeInTheDocument();
    expect(screen.getByText('Asia/Jakarta')).toBeInTheDocument();

    // Evidence Log apa adanya dari evidence.signals (maks 3).
    expect(screen.getByRole('heading', { name: 'Yang perlu kamu tahu' })).toBeInTheDocument();
    expect(screen.getByText('Completion rate (7d): 75% (6/8 tasks)')).toBeInTheDocument();
    expect(screen.getByText('Average difficulty (7d): 3.5/5 (4 samples)')).toBeInTheDocument();

    // Ring + kartu statistik + strategi coach tetap tampil.
    expect(screen.getByRole('img', { name: 'Progres 75% selesai' })).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Saran untukmu' })).toBeInTheDocument();
    expect(screen.getByText('Pertahankan ritme latihan harian.')).toBeInTheDocument();

    // Tidak ada teaser proposal ketika pending_proposal null.
    expect(screen.queryByText('Ada saran untuk rencana belajarmu')).not.toBeInTheDocument();
  });

  it('switches to the Riwayat tab with proper tab semantics', async () => {
    mockOverview();
    await renderAndSettle();

    expect(screen.getByRole('tab', { name: 'Tren' })).toHaveAttribute('aria-selected', 'true');

    await goToHistory();

    expect(screen.getByRole('tab', { name: 'Tren' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Riwayat' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(getHistory).toHaveBeenCalled());
    expect(screen.getByText(/Perkembangan tugas ada di tab Tren/)).toBeInTheDocument();
  });

  it('keeps the keyboard working on the tablist', async () => {
    mockOverview();
    await renderAndSettle();

    const trenTab = screen.getByRole('tab', { name: 'Tren' });
    trenTab.focus();
    fireEvent.keyDown(trenTab, { key: 'ArrowRight' });

    expect(screen.getByRole('tab', { name: 'Riwayat' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Riwayat' })).toHaveFocus();

    // Biarkan fetch Riwayat selesai di dalam act agar tidak ada update yang
    // bocor keluar dari test.
    await waitFor(() => expect(screen.getByText('Belum ada catatan suasana hati')).toBeInTheDocument());
  });

  it('shows an empty history state that does not imply zero task progress', async () => {
    mockOverview();
    getHistory.mockResolvedValue(EMPTY_PAGE);
    await renderAndSettle();
    await goToHistory();

    await waitFor(() => expect(screen.getByText('Belum ada catatan suasana hati')).toBeInTheDocument());
    expect(screen.getByText(/Catatan kosong bukan berarti kamu tidak maju/i)).toBeInTheDocument();
    expect(screen.getAllByText(/tab Tren/).length).toBeGreaterThan(0);
  });

  it('shows an error state on overview failure and recovers on retry', async () => {
    getOverview
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(OVERVIEW);

    render(<ProgressPage />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText('Gagal memuat ringkasan progres.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba Lagi' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }));

    await waitFor(() => expect(screen.getByText('Asia/Jakarta')).toBeInTheDocument());
    expect(getOverview).toHaveBeenCalledTimes(2);
  });

  it('filters the history list by event type', async () => {
    mockOverview();
    getHistory.mockResolvedValue({ items: [HISTORY_ITEM], page: { next_cursor: null, has_more: false } });
    await renderAndSettle();
    await goToHistory();

    await waitFor(() => expect(screen.getByText('Pagi ini fokusnya bagus.')).toBeInTheDocument());

    getHistory.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Diperbaiki' }));

    await waitFor(() =>
      expect(getHistory).toHaveBeenCalledWith(
        { filter: 'corrected', limit: 20 },
        expect.objectContaining({ signal: expect.anything() })
      )
    );
  });

  it('announces a 409 conflict during correction and reloads the history', async () => {
    mockOverview();
    getHistory.mockResolvedValue({ items: [HISTORY_ITEM], page: { next_cursor: null, has_more: false } });
    const conflict = Object.assign(new Error('Riwayat telah berubah.'), {
      statusCode: 409,
      code: 'CONFLICT',
    });
    correctHistory.mockRejectedValue(conflict);

    await renderAndSettle();
    await goToHistory();

    fireEvent.click(await screen.findByRole('button', { name: 'Perbaiki' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    const submit = await screen.findByRole('button', { name: 'Simpan perubahan' });

    // Form koreksi mengirim mood + note + version.
    fireEvent.change(screen.getByLabelText('Catatan'), { target: { value: 'Diperbaiki.' } });
    fireEvent.click(submit);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Catatan ini sudah berubah. Memuat ulang.');
    expect(correctHistory).toHaveBeenCalledWith('evt-1', {
      mood: 'good',
      note: 'Diperbaiki.',
      version: 1,
    });

    // 409 meminta muat ulang daftar riwayat.
    await waitFor(() => expect(getHistory).toHaveBeenCalledTimes(2));
  });

  it('reloads history and overview after a successful correction', async () => {
    mockOverview();
    getHistory.mockResolvedValue({ items: [HISTORY_ITEM], page: { next_cursor: null, has_more: false } });

    await renderAndSettle();
    await goToHistory();

    fireEvent.click(await screen.findByRole('button', { name: 'Perbaiki' }));
    const submit = await screen.findByRole('button', { name: 'Simpan perubahan' });
    fireEvent.change(screen.getByLabelText('Catatan'), { target: { value: 'Diperbaiki.' } });
    fireEvent.click(submit);

    await waitFor(() => expect(correctHistory).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getHistory).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getOverview).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Perubahanmu tersimpan.')).toBeInTheDocument();
  });

  it('asks for confirmation before deleting a history entry', async () => {
    mockOverview();
    getHistory.mockResolvedValue({ items: [HISTORY_ITEM], page: { next_cursor: null, has_more: false } });

    await renderAndSettle();
    await goToHistory();

    fireEvent.click(await screen.findByRole('button', { name: 'Hapus' }));
    expect(await screen.findByText('Hapus catatan ini?')).toBeInTheDocument();
    expect(deleteHistory).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Ya, hapus' }));

    await waitFor(() => expect(deleteHistory).toHaveBeenCalledWith('evt-1'));
    await waitFor(() => expect(getHistory).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Catatan dihapus.')).toBeInTheDocument();
  });

  it('keeps the action buttons disabled while a request is running', async () => {
    mockOverview();
    getHistory.mockResolvedValue({ items: [HISTORY_ITEM], page: { next_cursor: null, has_more: false } });
    correctHistory.mockReturnValue(new Promise(() => {}));

    await renderAndSettle();
    await goToHistory();

    fireEvent.click(await screen.findByRole('button', { name: 'Perbaiki' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    const submit = await screen.findByRole('button', { name: 'Simpan perubahan' });

    fireEvent.click(submit);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Menyimpan…' })).toBeDisabled());
  });

  it('shows an empty evidence state when the server reports none', async () => {
    mockOverview({
      evidence: { available: false, signal_count: 0, event_count: 0, signals: [] },
      coach_strategy: null,
      insight: null,
      distribution: { dimension: 'task_type', items: [] },
      activity: [],
      health: { ...OVERVIEW.health, total_tasks: 0, progress_percent: 0, completed_tasks: 0 },
    });
    await renderAndSettle();

    expect(screen.getByText('Belum ada yang perlu diperhatikan')).toBeInTheDocument();
    expect(screen.getByText('Belum ada tugas pada periode ini')).toBeInTheDocument();
    expect(screen.queryByText('Completion rate (7d)')).not.toBeInTheDocument();
  });

  it('renders a proposal teaser when pending_proposal is present and opens its detail', async () => {
    mockOverview({
      pending_proposal: {
        id: 'prop-1',
        adaptation_type: 'workload',
        summary: 'Beban belajar minggu ini terlalu padat.',
        created_at: '2026-09-27T10:00:00.000Z',
        expires_at: '2026-09-30T10:00:00.000Z',
        base_plan_version: 'plan-v1',
      },
    });

    await renderAndSettle();

    expect(screen.getByText('Ada saran untuk rencana belajarmu')).toBeInTheDocument();
    expect(screen.getByText('Beban belajar minggu ini terlalu padat.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lihat saran' }));

    await waitFor(() =>
      expect(proposalService.getById).toHaveBeenCalledWith('prop-1')
    );
  });

  it('renders the proposal teaser only when a pending proposal exists', async () => {
    mockOverview();
    await renderAndSettle();

    expect(screen.queryByRole('button', { name: 'Lihat saran' })).not.toBeInTheDocument();
    expect(screen.queryByText('Ada saran untuk rencana belajarmu')).not.toBeInTheDocument();
  });
});
