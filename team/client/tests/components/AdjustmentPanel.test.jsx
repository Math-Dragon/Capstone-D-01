import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { GoalsProvider } from '../../src/features/goals/context/GoalsContext';
import goalsReducer from '../../src/store/slices/goalsSlice';

vi.mock('../../src/features/coach/hooks/useCoach', () => ({
  useCoach: () => ({ dispatchTaskAction: vi.fn().mockResolvedValue({}) }),
}));

import AdjustmentPanel from '../../src/components/AdjustmentPanel';

function renderWithProviders(ui) {
  const testStore = configureStore({
    reducer: { goals: goalsReducer },
  });
  return render(
    <Provider store={testStore}>
      <GoalsProvider>{ui}</GoalsProvider>
    </Provider>
  );
}

describe('AdjustmentPanel', () => {
  it('renders quick action buttons', () => {
    renderWithProviders(<AdjustmentPanel />);
    expect(screen.getByText('Kurangi Beban')).toBeInTheDocument();
    expect(screen.getByText('Tingkatkan Tantangan')).toBeInTheDocument();
    expect(screen.getByText('Ganti Fokus')).toBeInTheDocument();
    expect(screen.getByText('Geser Jadwal')).toBeInTheDocument();
  });

  it('renders custom message input', () => {
    renderWithProviders(<AdjustmentPanel />);
    expect(screen.getByPlaceholderText('Tulis permintaan kustom...')).toBeInTheDocument();
  });

  it('calls onRequestAdjustment on quick action click', async () => {
    const handler = vi.fn();
    renderWithProviders(<AdjustmentPanel onRequestAdjustment={handler} />);
    fireEvent.click(screen.getByText('Kurangi Beban'));
    expect(handler).toHaveBeenCalledWith('less_work', null);
  });

  it('disables send button when no custom message', () => {
    renderWithProviders(<AdjustmentPanel />);
    const sendBtn = screen.getByLabelText('Kirim permintaan');
    expect(sendBtn).toBeDisabled();
  });

  it('calls onRequestAdjustment with custom message', async () => {
    const handler = vi.fn();
    renderWithProviders(<AdjustmentPanel onRequestAdjustment={handler} />);
    const input = screen.getByPlaceholderText('Tulis permintaan kustom...');
    fireEvent.change(input, { target: { value: 'Need a break' } });
    fireEvent.click(screen.getByLabelText('Kirim permintaan'));
    expect(handler).toHaveBeenCalledWith('custom', 'Need a break');
  });
});
