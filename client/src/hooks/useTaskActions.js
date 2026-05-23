import { useState, useCallback } from 'react';
import { useCoach } from '../features/coach/hooks/useCoach';
import { useToast } from '../components/ui/Toast';
import coachService from '../features/coach/services/coachService';
import api from '../services/api';
import { notifyMutation } from '../utils/invalidation';

function loadPendingProposal() {
  try {
    const raw = localStorage.getItem('pendingProposal');
    if (raw) {
      const { plan, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp < 30 * 60 * 1000) {
        return plan;
      }
      localStorage.removeItem('pendingProposal');
    }
  } catch {
    // localStorage unavailable
  }
  return null;
}

function persistProposal(plan) {
  localStorage.setItem('pendingProposal', JSON.stringify({ plan, timestamp: Date.now() }));
}

function clearStoredProposal() {
  localStorage.removeItem('pendingProposal');
}

export default function useTaskActions({ onUpdateTasks, refreshData }) {
  const { dispatchTaskAction } = useCoach();
  const { addToast } = useToast();

  const [activeModal, setActiveModal] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [proposal, setProposal] = useState(loadPendingProposal);
  const [proposalAccepting, setProposalAccepting] = useState(false);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setActiveTask(null);
  }, []);

  const handleComplete = useCallback(async (task) => {
    setActionLoading(task.id);
    try {
      await api.patch(`/tasks/${task.id}/status`, { status: 'done' });
      onUpdateTasks((prev) =>
        (Array.isArray(prev) ? prev : []).map((t) =>
          t.id === task.id ? { ...t, status: 'done' } : t
        )
      );
      addToast('Tugas selesai!', 'success');
      notifyMutation();
      setActiveTask(task);
      setActiveModal('feedback');
    } catch {
      addToast('Gagal menyelesaikan tugas.', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [onUpdateTasks, addToast]);

  const handleSkip = useCallback((task) => {
    setActiveTask(task);
    setActiveModal('skip');
  }, []);

  const handleModify = useCallback((task) => {
    setActiveTask(task);
    setActiveModal('modify');
  }, []);

  const handleFeedback = useCallback((task) => {
    setActiveTask(task);
    setActiveModal('feedback');
  }, []);

  const confirmSkip = useCallback(async (reason, _note) => {
    if (!activeTask) return;
    setActionLoading(activeTask.id);
    try {
      await api.patch(`/tasks/${activeTask.id}/status`, {
        status: 'skipped',
        skip_reason: reason || undefined,
      });
      onUpdateTasks((prev) =>
        (Array.isArray(prev) ? prev : []).map((t) =>
          t.id === activeTask.id ? { ...t, status: 'skipped' } : t
        )
      );
      addToast('Tugas dilewati.', 'warning');
      notifyMutation();
      closeModal();
    } catch (err) {
      addToast('Gagal melewati tugas.', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [activeTask, onUpdateTasks, addToast, closeModal]);

  const confirmModify = useCallback(async (changes) => {
    if (!activeTask) return;
    setActionLoading(activeTask.id);
    try {
      await api.patch(`/tasks/${activeTask.id}`, {
        title: changes.title,
        duration_estimate: changes.duration_estimate,
        planned_slot: changes.planned_slot,
        planned_date: changes.planned_date,
      });
      onUpdateTasks((prev) =>
        (Array.isArray(prev) ? prev : []).map((t) =>
          t.id === activeTask.id ? { ...t, ...changes } : t
        )
      );
      addToast('Tugas diperbarui!', 'info');
      notifyMutation();
      closeModal();
    } catch (err) {
      addToast('Gagal memperbarui tugas.', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [activeTask, onUpdateTasks, addToast, closeModal]);

  const submitFeedback = useCallback(async (difficulty, focus, notes) => {
    if (!activeTask) return;
    setActionLoading(activeTask.id);
    try {
      const result = await dispatchTaskAction('SUBMIT_FEEDBACK', {
        taskId: activeTask.id,
        difficulty,
        focus,
        notes,
      });
      addToast('Feedback tercatat!', 'success');
      notifyMutation();
      if (result?.plan?.tasks?.length > 0) {
        setProposal(result.plan);
        persistProposal(result.plan);
      }
      closeModal();
    } catch (err) {
      addToast('Gagal mengirim feedback.', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [activeTask, dispatchTaskAction, addToast, closeModal]);

  const acceptProposal = useCallback(async () => {
    if (!proposal) return;
    setProposalAccepting(true);
    try {
      await coachService.acceptProposal(proposal);
      clearStoredProposal();
      setProposal(null);
      await refreshData();
      addToast('Rencana baru disimpan!', 'success');
      notifyMutation();
    } catch (err) {
      addToast('Gagal menyimpan rencana. Coba lagi.', 'error');
    } finally {
      setProposalAccepting(false);
    }
  }, [proposal, refreshData, addToast]);

  const rejectProposal = useCallback(() => {
    clearStoredProposal();
    setProposal(null);
  }, []);

  const handleModalConfirm = useCallback(async (params) => {
    switch (params.action) {
      case 'complete':
        if (activeTask) await handleComplete(activeTask);
        break;
      case 'skip':
        await confirmSkip(params.reason, params.note);
        break;
      case 'feedback':
        await submitFeedback(params.difficulty, params.focus, params.notes);
        break;
      default:
        break;
    }
  }, [activeTask, handleComplete, confirmSkip, submitFeedback]);

  return {
    activeModal,
    activeTask,
    actionLoading,
    proposal,
    proposalAccepting,
    handleComplete,
    handleSkip,
    handleModify,
    handleFeedback,
    confirmSkip,
    confirmModify,
    submitFeedback,
    acceptProposal,
    rejectProposal,
    closeModal,
    handleModalConfirm,
  };
}
