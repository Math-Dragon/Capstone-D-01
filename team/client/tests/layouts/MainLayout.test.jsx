import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../src/features/auth/context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
  AuthProvider: ({ children }) => <>{children}</>,
}));

import MainLayout from '../../src/layouts/MainLayout';

describe('MainLayout', () => {
  it('renders Outlet content', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<div>Page Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });
});
