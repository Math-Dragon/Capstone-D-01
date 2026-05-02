export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Dicoding AIWeb';
export const JWT_EXPIRY = import.meta.env.VITE_JWT_EXPIRY || 3600000;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  GOALS: '/goals',
  GOAL_DETAIL: '/goals/:id',
  CALENDAR: '/calendar',
  PROGRESS: '/progress',
  COACH: '/coach',
};

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
};
