const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const productionBuild = import.meta.env.PROD || import.meta.env.MODE === 'production';

export const API_BASE_URL = rawApiUrl || 'http://localhost:3000/api';
export const IS_PROD = Boolean(productionBuild);

if (IS_PROD && !rawApiUrl) {
  console.warn('VITE_API_URL is not set for production build');
}

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Dicoding AIWeb';
export const JWT_EXPIRY = import.meta.env.VITE_JWT_EXPIRY || 3600000;

const PUBLIC_APP_PATHS = new Set(['/', '/login', '/register']);

export function isPublicAppPath(pathname = '/') {
  return PUBLIC_APP_PATHS.has(pathname);
}

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

export const ADMIN_ACTION_LABELS = {
  COACH_TASK_ACCEPTED: 'Accepted',
  COACH_TASK_REJECTED: 'Rejected',
  COACH_TASK_COMPLETED: 'Completed',
  COACH_TASK_SKIPPED: 'Skipped',
  COACH_TASK_COMPLETED_RESPONSE: 'Responded',
  COACH_FEEDBACK_SUBMITTED: 'Feedback',
  COACH_CHAT_MESSAGE: 'Chat',
  COACH_CHAT_RESPONDED: 'Responded',
  COACH_PLAN_GENERATED: 'Plan',
  COACH_LLM_CALL: 'LLM Call',
  COACH_LLM_ERROR: 'LLM Error',
  COACH_STATIC_FEEDBACK: 'Static Feedback',
  COACH_STATIC_SKIP: 'Static Skip',
  COACH_STATIC_CHECKIN: 'Static Check-in',
  COACH_PROPOSAL_ACCEPTED: 'Proposal Accepted',
  COACH_PLAN_UNDONE: 'Plan Undone',
};

export const ADMIN_ACTION_COLORS = {
  COACH_TASK_ACCEPTED: 'bg-green-100 text-green-700',
  COACH_TASK_REJECTED: 'bg-red-100 text-red-700',
  COACH_TASK_COMPLETED: 'bg-emerald-100 text-emerald-700',
  COACH_TASK_SKIPPED: 'bg-amber-100 text-amber-700',
  COACH_CHAT_MESSAGE: 'bg-sky-100 text-sky-700',
  COACH_PLAN_GENERATED: 'bg-violet-100 text-violet-700',
  COACH_LLM_CALL: 'bg-rose-100 text-rose-700',
  COACH_LLM_ERROR: 'bg-red-200 text-red-800',
};

export const ADMIN_STATUS_COLOR = {
  success: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
};

export const ADMIN_PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

export const ADMIN_PAGE_SIZES = [10, 25, 50];
