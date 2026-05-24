import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPipelineTrace as setPipelineTraceRedux } from '../../../store/slices/observabilitySlice';
import coachService, { setSessionId } from '../services/coachService';

const CoachContext = createContext(null);

function formatSystemEvent(action, payload) {
  switch (action) {
    case 'COMPLETE_TASK':
      return `Kamu menyelesaikan tugas`;
    case 'SKIP_TASK':
      return `Kamu melewatkan tugas${payload.reason ? ` (${payload.reason})` : ''}`;
    case 'SUBMIT_FEEDBACK':
      return `Kamu memberikan feedback pada tugas`;
    case 'CHECK_IN':
      return `Kamu melakukan check-in`;
    case 'REQUEST_ADJUSTMENT':
      return `Kamu meminta penyesuaian rencana`;
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

const MAX_MESSAGES = 200;

export function CoachProvider({ children }) {
  const dispatch = useDispatch();
  const sessionIdRef = useRef(getOrCreateSessionId());
  useEffect(() => {
    setSessionId(sessionIdRef.current);
    return () => { setSessionId(null); };
  }, []);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (messages.length > MAX_MESSAGES) {
      setMessages((prev) => prev.length > MAX_MESSAGES ? prev.slice(-MAX_MESSAGES) : prev);
    }
  }, [messages.length]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [mode, setMode] = useState('form');
  const [pipelineTrace, setPipelineTraceLocal] = useState(null);
  const [observabilityRefresh, setObservabilityRefresh] = useState(0);
  const [banner, setBanner] = useState(null);
  const [trimmedTasks, setTrimmedTasks] = useState(null);
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
        const formatted = history
          .filter((m) => m.session_type !== 'task_complete')
          .map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.created_at,
            planSnapshot: m.plan_snapshot_summary,
            sessionType: m.session_type,
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
    setStatus('loading');
    setError(null);

    try {
      const result = await coachService.dispatchAction(action, payload);
      setStatus('idle');

      if (result?._meta) {
        setPipelineTrace(result._meta);
      }
      setObservabilityRefresh((n) => n + 1);

      if (result?.adaptationType) {
        if (result.adaptationType === 'crisis' || result.adaptationType === 'milestone') {
          setBanner({
            type: result.adaptationType,
            triggerId: result.triggerId,
            message: result.adaptation_notes || result.summary || null,
          });
          return result;
        }
        if (result.adaptationType === 'adjustment') {
          const adjMsg = {
            id: `adj-${Date.now()}`,
            role: 'system',
            content: `Rencana telah disesuaikan: ${result.adaptation_notes || ''}`,
            timestamp: new Date().toISOString(),
            adaptationType: 'adjustment',
            adaptationNotes: result.adaptation_notes || null,
          };
          setMessages((prev) => [...prev, adjMsg]);
        }
      }

      if (result?.tasks && !result?.adaptationType && !result?.message) {
        const notes = result.adaptation_notes || result.summary || 'Rencana telah disesuaikan.';
        const adjMsg = {
          id: `adj-${Date.now()}`,
          role: 'system',
          content: `Rencana telah disesuaikan: ${notes}`,
          timestamp: new Date().toISOString(),
          adaptationType: 'adjustment',
          adaptationNotes: result.adaptation_notes || null,
        };
        setMessages((prev) => [...prev, adjMsg]);
        const coachMsg = {
          id: `coach-${Date.now()}`,
          role: 'coach',
          content: notes,
          timestamp: new Date().toISOString(),
          planSnapshot: result.summary || null,
          plan: result || null,
        };
        setMessages((prev) => [...prev, coachMsg]);
        return result;
      }

      if (result?.message) {
        if (action === 'COMPLETE_TASK' && !result?.plan) {
          // Static COMPLETE_TASK: exclude from chat history (noise)
          // Result message shown via toast in caller page
          return result;
        }

        const systemMsg = {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: formatSystemEvent(action, payload),
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, systemMsg]);

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

  const dismissBanner = useCallback(() => {
    setBanner(null);
  }, []);

  const handleCheckIn = useCallback(async (mood) => {
    try {
      const result = await coachService.checkIn(mood);
      if (result?._meta) {
        setPipelineTrace(result._meta);
      }
      setObservabilityRefresh((n) => n + 1);
      if (result?.tasks) {
        const notes = result.adaptation_notes || result.summary || 'Rencana telah disesuaikan.';
        const adjMsg = {
          id: `checkin-${Date.now()}`,
          role: 'system',
          content: `Check-in: ${notes}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, adjMsg]);
      }
    } catch {
      // Network failure — proceed, never block the app
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

    setTrimmedTasks(null);
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
        const violationMap = {};
        if (Array.isArray(result.violations)) {
          for (const v of result.violations) {
            violationMap[v.task_id] = v;
          }
        }

        setRecommendation({
          recommendationId: result.recommendation_id,
          tasks: result.tasks.map((t) => ({
            taskId: t.task_id,
            title: t.title,
            duration_estimate: t.duration_estimate,
            planned_slot: t.planned_slot,
            rationale: t.rationale,
            status: t.status,
            violation: violationMap[t.task_id] || null,
          })),
          summary: result.summary,
          violationMap, // index for catch-block rollback (§7b) — not for render
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

  const decideTask = useCallback(async (taskId, decision, overrides) => {
    if (!recommendation) return null;

    try {
      setRecommendation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.taskId === taskId ? { ...t, status: decision, violation: null } : t
          ),
        };
      });

      const result = await coachService.decideTask(
        recommendation.recommendationId,
        taskId,
        decision,
        overrides
      );

      if (result?.allDecided) {
        const acceptedCount = (recommendation?.tasks || []).filter((t) => t.status === 'accepted').length;
        let content = `Rencana belajar telah ditetapkan! ${acceptedCount} tugas diterima dan ditambahkan ke jadwal kamu. Silakan tanya apa saja tentang rencana belajarmu.`;

        if (Array.isArray(result.trimmed) && result.trimmed.length > 0) {
          setTrimmedTasks({ count: result.trimmed.length, taskIds: result.trimmed });
          content += ` ${result.trimmed.length} tugas dipangkas agar sesuai jadwal mingguanmu.`;
        }

        const coachMsg = {
          id: `coach-${Date.now()}`,
          role: 'coach',
          content,
          timestamp: new Date().toISOString(),
          planSnapshot: recommendation?.summary,
        };
        setRecommendation(null);
        setMessages((prevMsgs) => [...prevMsgs, coachMsg]);
        setMode('chat');
      }

      return result;
    } catch (err) {
      setError(err);
      setRecommendation((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.taskId === taskId
              ? { ...t, status: 'pending', violation: prev.violationMap?.[taskId] || null }
              : t
          ),
        };
      });
      return null;
    }
  }, [recommendation]);

  const resetToForm = useCallback(() => {
    setTrimmedTasks(null);
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
        banner,
        recommendation,
        trimmedTasks,
        dismissTrimmed: () => setTrimmedTasks(null),
        pipelineTrace,
        observabilityRefresh,
        sendMessage,
        dispatchTaskAction,
        handleCheckIn,
        generatePlan,
        retryGeneratePlan,
        getLastPayload,
        decideTask,
        clearError,
        dismissBanner,
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
