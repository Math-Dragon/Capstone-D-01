import { createContext, useContext, useState, useCallback, useRef } from 'react';
import coachService from '../services/coachService';

const CoachContext = createContext(null);

export function CoachProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

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
        id: result?.data?.message ? `coach-${Date.now()}` : `coach-${Date.now()}`,
        role: 'coach',
        content: result?.data?.message || 'Rencana belajarmu telah diperbarui.',
        timestamp: new Date().toISOString(),
        planSnapshot: result?.data?.plan?.summary || null,
        plan: result?.data?.plan || null,
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

  return (
    <CoachContext.Provider
      value={{
        messages,
        status,
        error,
        sendMessage,
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
