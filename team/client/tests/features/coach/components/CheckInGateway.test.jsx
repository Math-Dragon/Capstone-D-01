import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { toDateKey } from '../../../../src/utils/helpers';

// Diakses dari dalam factory vi.mock saat render, bukan saat registrasi.
const mockHandleCheckIn = vi.fn();

vi.mock('../../../../src/features/coach/hooks/useCoach', () => ({
  useCoach: () => ({ handleCheckIn: mockHandleCheckIn }),
}));

vi.mock('../../../../src/features/progress/services/progressService', () => ({
  default: {
    createEvent: vi.fn(),
    newClientEventId: vi.fn(),
  },
}));

import CheckInGateway from '../../../../src/features/coach/components/CheckInGateway';
import progressService from '../../../../src/features/progress/services/progressService';

const BE_MOODS = ['great', 'good', 'okay', 'struggling', 'overwhelmed', 'drained'];
const BE_MOOD_LABELS = ['Bersemangat', 'Baik', 'Biasa Aja', 'Kurang Baik', 'Kewalahan', 'Lelah'];
const EVENT_ERROR = 'Gagal menyimpan. Coba lagi.';

function renderGateway() {
  return render(
    <CheckInGateway>
      <div>Dashboard</div>
    </CheckInGateway>,
  );
}

describe('CheckInGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
    mockHandleCheckIn.mockReset();
    mockHandleCheckIn.mockResolvedValue({});
    progressService.createEvent.mockResolvedValue({});
    progressService.newClientEventId.mockReturnValue('test-uuid-1');
  });

  it('renders children when already checked in', () => {
    localStorage.setItem('lastCheckIn', toDateKey(new Date()));
    renderGateway();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders children when no token', () => {
    localStorage.removeItem('token');
    renderGateway();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows check-in dialog when not checked in', () => {
    renderGateway();
    expect(screen.getByText('Hai, bagaimana perasaanmu hari ini?')).toBeInTheDocument();
  });

  it('renders mood options', () => {
    renderGateway();
    expect(screen.getByLabelText('Bersemangat')).toBeInTheDocument();
    expect(screen.getByLabelText('Baik')).toBeInTheDocument();
    expect(screen.getByLabelText('Lelah')).toBeInTheDocument();
  });

  it('disables submit when no mood selected', () => {
    renderGateway();
    expect(screen.getByText('Simpan')).toBeDisabled();
  });

  it('skips check-in and shows children', async () => {
    renderGateway();
    fireEvent.click(screen.getByText('Lewati'));
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
  });

  it('enables submit when mood is selected', () => {
    renderGateway();
    fireEvent.click(screen.getByLabelText('Bersemangat'));
    expect(screen.getByText('Simpan')).not.toBeDisabled();
  });

  it('offers only the moods supported by the backend', async () => {
    const { unmount } = renderGateway();
    const group = screen.getByRole('group', { name: 'Pilih suasana hati' });
    const labels = within(group)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));

    expect(labels).toEqual(BE_MOOD_LABELS);
    expect(labels).toHaveLength(6);
    unmount();

    for (const label of BE_MOOD_LABELS) {
      localStorage.removeItem('lastCheckIn');
      const view = renderGateway();
      fireEvent.click(screen.getByLabelText(label));
      fireEvent.click(screen.getByText('Simpan'));
      await waitFor(() => expect(progressService.createEvent).toHaveBeenCalledTimes(1));

      const mood = progressService.createEvent.mock.calls[0][0].mood;
      expect(BE_MOODS).toContain(mood);
      expect(mood).not.toBe('down');

      progressService.createEvent.mockClear();
      view.unmount();
    }
  });

  it('submits a progress event with the selected mood', async () => {
    renderGateway();
    fireEvent.click(screen.getByLabelText('Bersemangat'));
    fireEvent.click(screen.getByText('Simpan'));

    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());

    expect(progressService.createEvent).toHaveBeenCalledTimes(1);
    const payload = progressService.createEvent.mock.calls[0][0];
    expect(payload).toMatchObject({
      client_event_id: 'test-uuid-1',
      event_type: 'submitted',
      mood: 'great',
      source: 'daily_gateway',
      app_version: '1.0.0',
    });
    expect(BE_MOODS).toContain(payload.mood);
    expect(typeof payload.client_timestamp).toBe('string');
    expect(new Date(payload.client_timestamp).toISOString()).toBe(payload.client_timestamp);
    // Kontrak createEventSchema memakai `.strict()`: hanya field yang diizinkan.
    expect(Object.keys(payload).sort()).toEqual([
      'app_version',
      'client_event_id',
      'client_timestamp',
      'event_type',
      'mood',
      'source',
    ]);
    expect(payload.context).toBeUndefined();
    expect(progressService.newClientEventId).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('lastCheckIn')).toBe(toDateKey(new Date()));
  });

  it('sends the backend mood value instead of the legacy down value', async () => {
    renderGateway();
    fireEvent.click(screen.getByLabelText('Kurang Baik'));
    fireEvent.click(screen.getByText('Simpan'));

    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());

    expect(progressService.createEvent.mock.calls[0][0].mood).toBe('struggling');
  });

  it('keeps the day unmarked and shows an error when the event fails', async () => {
    progressService.createEvent.mockRejectedValueOnce(new Error('network down'));
    renderGateway();
    fireEvent.click(screen.getByLabelText('Kurang Baik'));
    fireEvent.click(screen.getByText('Simpan'));

    expect(await screen.findByRole('alert')).toHaveTextContent(EVENT_ERROR);
    expect(localStorage.getItem('lastCheckIn')).toBeNull();
    expect(screen.getByText('Hai, bagaimana perasaanmu hari ini?')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Simpan')).not.toBeDisabled());
  });

  it('records a skipped event when skipping', async () => {
    renderGateway();
    fireEvent.click(screen.getByText('Lewati'));

    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());

    expect(progressService.createEvent).toHaveBeenCalledTimes(1);
    const payload = progressService.createEvent.mock.calls[0][0];
    expect(payload).toMatchObject({
      client_event_id: 'test-uuid-1',
      event_type: 'skipped',
      source: 'daily_gateway',
      app_version: '1.0.0',
    });
    expect(payload.mood).toBeUndefined();
    expect(payload.note).toBeUndefined();
    expect(typeof payload.client_timestamp).toBe('string');
    expect(new Date(payload.client_timestamp).toISOString()).toBe(payload.client_timestamp);
    // `skipped` tidak boleh memuat mood/note, dan tidak boleh ada field asing.
    expect(Object.keys(payload).sort()).toEqual([
      'app_version',
      'client_event_id',
      'client_timestamp',
      'event_type',
      'source',
    ]);
    expect(payload.context).toBeUndefined();
    expect(localStorage.getItem('lastCheckIn')).toBe(toDateKey(new Date()));
  });

  it('keeps the dialog open with an error when the skip event fails', async () => {
    progressService.createEvent.mockRejectedValueOnce(new Error('network down'));
    renderGateway();
    fireEvent.click(screen.getByText('Lewati'));

    expect(await screen.findByRole('alert')).toHaveTextContent(EVENT_ERROR);
    expect(screen.getByText('Hai, bagaimana perasaanmu hari ini?')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(localStorage.getItem('lastCheckIn')).toBeNull();

    // Gateway tetap terbuka sehingga user bisa mencoba lagi.
    fireEvent.click(screen.getByText('Lewati'));
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(localStorage.getItem('lastCheckIn')).toBe(toDateKey(new Date()));
  });

  it('still records the event when the coach check-in fails, without console.error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockHandleCheckIn.mockRejectedValueOnce(new Error('coach down'));

    renderGateway();
    fireEvent.click(screen.getByLabelText('Bersemangat'));
    fireEvent.click(screen.getByText('Simpan'));

    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(progressService.createEvent).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('lastCheckIn')).toBe(toDateKey(new Date()));
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
