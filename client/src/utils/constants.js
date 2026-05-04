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

export const TASK_TYPE_PALETTE = {
  acquire: { icon: '📖', color: '#818CF8' },
  practice: { icon: '✏️', color: '#F0A500' },
  recall: { icon: '🧠', color: '#EC4899' },
  interleave: { icon: '🔀', color: '#06B6D4' },
  synthesize: { icon: '🔗', color: '#A78BFA' },
  review: { icon: '🔄', color: '#34D399' },
  assess: { icon: '✅', color: '#F87171' },
  reflect: { icon: '💬', color: '#94A3B8' },
};

export const SLOT_ORDER = { morning: 0, afternoon: 1, evening: 2 };

export const SLOT_LABELS = { morning: '☀️ Pagi', afternoon: '⛅ Siang', evening: '🌙 Malam' };
