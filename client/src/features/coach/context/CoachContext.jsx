import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import coachService from '../services/coachService';

const CoachContext = createContext(null);

export function CoachProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const isLoadedRef = useRef(false);

  const loadHistory = useCallback(async () => {
    if (isLoadedRef.current) return;
    isLoadedRef.current = true;
    try {
      setStatus('loading');
      const history = await coachService.getHistory();
      if (history && history.length > 0) {
        const formatted = history.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
          planSnapshot: m.plan_snapshot_summary,
        }));
        setMessages(formatted);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setStatus('idle');
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      loadHistory();
    }
  }, [loadHistory]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    const studentMsg = {
      id: `local-${Date.now()}`,
      role: 'student',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, studentMsg]);
    setStatus('loading');
    setError(null);

    try {
      const result = await coachService.sendMessage(text);

      const coachMsg = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: result?.message || 'Rencana belajarmu telah diperbarui.',
        timestamp: new Date().toISOString(),
        planSnapshot: result?.plan?.summary || null,
        plan: result?.plan || null,
      };

      setMessages((prev) => [...prev, coachMsg]);
      setStatus('idle');
      return coachMsg;
    } catch (err) {
      setError(err);
      setStatus('error');

      const errorMsg = {
        id: `error-${Date.now()}`,
        role: 'coach',
        content: 'Maaf, terjadi kesalahan. Coba lagi sebentar.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStatus('idle');
  }, []);

  const generatePlan = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const plan = await coachService.initialPlan();

      const coachMsg = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: plan?.summary || `Rencana belajar berhasil dibuat! ${plan?.tasks?.length || 0} tugas telah ditambahkan ke jadwal kamu.`,
        timestamp: new Date().toISOString(),
        planSnapshot: plan?.summary || null,
        plan: plan || null,
      };

      setMessages((prev) => [...prev, coachMsg]);
      setStatus('idle');
      return plan;
    } catch (err) {
      setError(err);
      setStatus('error');

      const errorMsg = {
        id: `error-${Date.now()}`,
        role: 'coach',
        content: 'Gagal membuat rencana. Coba lagi sebentar.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
      return null;
    }
  }, []);

  return (
    <CoachContext.Provider
      value={{
        messages,
        status,
        error,
        sendMessage,
        generatePlan,
        clearError,
        messagesEndRef,
      }}
    >
      {children}
    </CoachContext.Provider>
  );
}

export function useCoach() {
  const context = useContext(CoachContext);
  if (!context) {
    throw new Error('useCoach must be used within CoachProvider');
  }
  return context;
}

export default CoachContext;
