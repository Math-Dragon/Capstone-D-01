import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPipelineTrace as setPipelineTraceRedux } from '../../../store/slices/observabilitySlice';
import coachService from '../services/coachService';

const CoachContext = createContext(null);

function formatSystemEvent(action, payload) {
  switch (action) {
    case 'COMPLETE_TASK':
      return `Kamu menyelesaikan tugas`;
    case 'SKIP_TASK':
      return `Kamu melewatkan tugas${payload.reason ? ` (${payload.reason})` : ''}`;
    case 'SUBMIT_FEEDBACK':
      return `Kamu memberikan feedback pada tugas`;
    default:
      return `Aksi: ${action}`;
  }
}

const SESSION_KEY = 'coach_session_id';
const SESSION_MAX_AGE_MS = 30 * 60 * 1000;

function getOrCreateSessionId() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored.id && Date.now() - stored.created < SESSION_MAX_AGE_MS) {
        return stored.id;
      }
    }
  } catch (e) {
    // localStorage unavailable
  }
  const id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, created: Date.now() }));
  } catch (e) {
    // localStorage unavailable
  }
  return id;
}

export function CoachProvider({ children }) {
  const dispatch = useDispatch();
  const sessionIdRef = useRef(getOrCreateSessionId());
  useEffect(() => {
    window.__coachSessionId = sessionIdRef.current;
    return () => { window.__coachSessionId = null; };
  }, []);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [mode, setMode] = useState('form');
  const [pipelineTrace, setPipelineTraceLocal] = useState(null);
  const [observabilityRefresh, setObservabilityRefresh] = useState(0);
  const messagesEndRef = useRef(null);
  const isLoadedRef = useRef(false);
  const lastPayloadRef = useRef(null);

  const setPipelineTrace = useCallback((trace) => {
    setPipelineTraceLocal(trace);
    dispatch(setPipelineTraceRedux(trace));
  }, [dispatch]);

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
        setMode('chat');
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

      if (result?._meta) {
        setPipelineTrace(result._meta);
        setObservabilityRefresh((n) => n + 1);
      }

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

  const dispatchTaskAction = useCallback(async (action, payload) => {
    const systemMsg = {
      id: `sys-${Date.now()}`,
      role: 'system',
      content: formatSystemEvent(action, payload),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, systemMsg]);
    setStatus('loading');
    setError(null);

    try {
      const result = await coachService.dispatchAction(action, payload);
      setStatus('idle');

      if (result?._meta) {
        setPipelineTrace(result._meta);
      }
      setObservabilityRefresh((n) => n + 1);

      if (result?.message) {
        const coachMsg = {
          id: `coach-${Date.now()}`,
          role: 'coach',
          content: result.message,
          timestamp: new Date().toISOString(),
          planSnapshot: result.plan?.summary || null,
          plan: result.plan || null,
        };
        setMessages((prev) => [...prev, coachMsg]);
      }
      return result;
    } catch (err) {
      setError(err);
      setStatus('error');
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStatus('idle');
  }, []);

  const generatePlan = useCallback(async (payload) => {
    if (payload) {
      lastPayloadRef.current = payload;
    }

    setMode('loading');
    setStatus('loading');
    setError(null);
    setRecommendation(null);

    try {
      const result = await coachService.initialPlan(lastPayloadRef.current);

      if (result?._meta) {
        setPipelineTrace(result._meta);
        setObservabilityRefresh((n) => n + 1);
      }

      if (result?.recommendation_id) {
        setRecommendation({
          recommendationId: result.recommendation_id,
          tasks: result.tasks.map((t) => ({
            taskId: t.task_id,
            title: t.title,
            duration_estimate: t.duration_estimate,
            planned_slot: t.planned_slot,
            rationale: t.rationale,
            status: t.status,
          })),
          summary: result.summary,
        });
        setMode('recommendation');
        setStatus('idle');
        return result;
      }

      const coachMsg = {
        id: `coach-${Date.now()}`,
        role: 'coach',
        content: result?.summary || `Rencana belajar berhasil dibuat!`,
        timestamp: new Date().toISOString(),
        planSnapshot: result?.summary || null,
        plan: result || null,
      };
      setMessages((prev) => [...prev, coachMsg]);
      setMode('chat');
      setStatus('idle');
      return result;
    } catch (err) {
      setError(err);
      setStatus('error');
      setMode('error');
      return null;
    }
  }, []);

  const retryGeneratePlan = useCallback(() => {
    if (lastPayloadRef.current) {
      return generatePlan(lastPayloadRef.current);
    }
    setMode('form');
    setStatus('idle');
    return null;
  }, [generatePlan]);

  const getLastPayload = useCallback(() => lastPayloadRef.current, []);

  const decideTask = useCallback(async (taskId, decision) => {
    if (!recommendation) return null;

    try {
      setRecommendation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.taskId === taskId ? { ...t, status: decision } : t
          ),
        };
      });

      const result = await coachService.decideTask(
        recommendation.recommendationId,
        taskId,
        decision
      );

      if (result?.allDecided) {
        setRecommendation((prev) => {
          if (!prev) return prev;
          const acceptedCount = prev.tasks.filter((t) => t.status === 'accepted').length;
          const coachMsg = {
            id: `coach-${Date.now()}`,
            role: 'coach',
            content: `Rencana belajar telah ditetapkan! ${acceptedCount} tugas diterima dan ditambahkan ke jadwal kamu. Silakan tanya apa saja tentang rencana belajarmu.`,
            timestamp: new Date().toISOString(),
            planSnapshot: prev.summary,
          };
          setMessages((prevMsgs) => [...prevMsgs, coachMsg]);
          setMode('chat');
          return null;
        });
      }

      return result;
    } catch (err) {
      setError(err);
      setRecommendation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.taskId === taskId ? { ...t, status: 'pending' } : t
          ),
        };
      });
      return null;
    }
  }, [recommendation]);

  const resetToForm = useCallback(() => {
    setRecommendation(null);
    setMode('form');
    setStatus('idle');
    setError(null);
  }, []);

  return (
    <CoachContext.Provider
      value={{
        messages,
        status,
        error,
        mode,
        recommendation,
        pipelineTrace,
        observabilityRefresh,
        sendMessage,
        dispatchTaskAction,
        generatePlan,
        retryGeneratePlan,
        getLastPayload,
        decideTask,
        clearError,
        resetToForm,
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
