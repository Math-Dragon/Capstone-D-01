import { useState, useCallback, useEffect, useRef } from 'react';
import { useCoach } from '../../coach/hooks/useCoach';
import { useToast } from '../../../components/ui/Toast';
import proposalService from '../../coach/services/proposalService';
import api from '../../../services/api';
import { notifyMutation } from '../../../utils/invalidation';

export default function useTaskActions({ onUpdateTasks, refreshData }) {
  const { dispatchTaskAction } = useCoach();
  const { addToast } = useToast();

  const [activeModal, setActiveModal] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [proposalAccepting, setProposalAccepting] = useState(false);
  const [proposalRejecting, setProposalRejecting] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const loadPendingProposal = useCallback(async () => {
    setProposalLoading(true);
    try {
      const pending = await proposalService.getPending();
      if (isMountedRef.current) setProposal(pending || null);
    } catch {
      // background refresh: keep the current view instead of surfacing an alert
    } finally {
      if (isMountedRef.current) setProposalLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingProposal();
  }, [loadPendingProposal]);

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
    } catch {
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
    } catch {
      addToast('Gagal memperbarui tugas.', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [activeTask, onUpdateTasks, addToast, closeModal]);

  const applyProposalResult = useCallback(async (result) => {
    const proposalId = result?.proposal?.id;
    if (proposalId) {
      try {
        const detail = await proposalService.getById(proposalId);
        if (isMountedRef.current) setProposal(detail || null);
        return;
      } catch {
        if (isMountedRef.current) setProposal(null);
        return;
      }
    }
    await loadPendingProposal();
  }, [loadPendingProposal]);

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
      closeModal();
      await applyProposalResult(result);
    } catch {
      addToast('Gagal mengirim feedback.', 'error');
    } finally {
      setActionLoading(null);
    }
  }, [activeTask, dispatchTaskAction, addToast, closeModal, applyProposalResult]);

  const acceptProposal = useCallback(async () => {
    if (!proposal?.id) return;
    setProposalAccepting(true);
    setProposalError(null);
    try {
      await proposalService.accept(proposal.id, {
        basePlanVersion: proposal.base_plan_version,
        idempotencyKey: proposalService.newIdempotencyKey(),
      });
      setProposal(null);
      await loadPendingProposal();
      await refreshData();
      addToast('Rencana baru disimpan!', 'success');
      notifyMutation();
    } catch (err) {
      if (err?.code === 'PROPOSAL_STALE') {
        addToast('Rencana telah berubah, muat ulang.', 'warning');
        await loadPendingProposal();
      } else if (err?.code === 'PROPOSAL_EXPIRED') {
        addToast('Proposal kedaluwarsa.', 'warning');
        setProposal(null);
      } else {
        setProposalError(err?.message || 'Gagal menyimpan rencana. Coba lagi.');
      }
    } finally {
      setProposalAccepting(false);
    }
  }, [proposal, refreshData, addToast, loadPendingProposal]);

  const rejectProposal = useCallback(async () => {
    if (!proposal?.id) {
      setProposal(null);
      return;
    }
    setProposalRejecting(true);
    setProposalError(null);
    try {
      await proposalService.reject(proposal.id, {
        idempotencyKey: proposalService.newIdempotencyKey(),
      });
      setProposal(null);
      addToast('Proposal ditolak.', 'info');
      notifyMutation();
    } catch (err) {
      if (err?.code === 'PROPOSAL_EXPIRED') {
        addToast('Proposal kedaluwarsa.', 'warning');
        setProposal(null);
      } else if (err?.code === 'PROPOSAL_STALE') {
        addToast('Rencana telah berubah, muat ulang.', 'warning');
        await loadPendingProposal();
      } else {
        setProposalError(err?.message || 'Gagal menolak proposal. Coba lagi.');
      }
    } finally {
      setProposalRejecting(false);
    }
  }, [proposal, addToast, loadPendingProposal]);

  const dismissProposal = useCallback(() => {
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
    proposalRejecting,
    proposalLoading,
    proposalError,
    handleComplete,
    handleSkip,
    handleModify,
    handleFeedback,
    confirmSkip,
    confirmModify,
    submitFeedback,
    acceptProposal,
    rejectProposal,
    dismissProposal,
    loadPendingProposal,
    closeModal,
    handleModalConfirm,
  };
}
