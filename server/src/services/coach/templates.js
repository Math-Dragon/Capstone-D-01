const TEMPLATES = {
  initial_plan: (ctx) =>
    '[session_type: initial_plan]\n\n' +
    `Today's date: ${new Date().toISOString().slice(0, 10)}\n` +
    `Student goal: ${ctx.profile.goal}\n` +
    `Subjects: ${ctx.profile.subjects}\n` +
    `Current level per subject: ${ctx.profile.current_level}\n` +
    `Weekly available hours: ${ctx.profile.weekly_available_hours}\n` +
    `Preferred study slots: ${ctx.profile.preferred_slots}\n` +
    `Available days: ${(ctx.profile.available_days || ['mon', 'tue', 'wed', 'thu', 'fri']).join(', ')}\n` +
    `Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
    'Generate a personalized study plan for this student. Follow the output structure exactly.',

  task_action: (ctx) => {
    let body = '[session_type: task_action]\n\n';
    if (ctx.payload.action === 'COMPLETE_TASK') {
      body += `Student completed task "${ctx.payload.taskTitle || 'unknown'}"\n`;
      body += 'This completion may signal progress worth acknowledging or adjusting for.\n\n';
    } else if (ctx.payload.reason !== undefined) {
      body += `Student skipped task "${ctx.payload.taskTitle || 'unknown'}" with reason: ${ctx.payload.reason}`;
      if (ctx.payload.note) body += `\nNote: ${ctx.payload.note}`;
      body += '\n\n';
    } else if (ctx.payload.difficulty !== undefined) {
      body += `Student submitted feedback on task "${ctx.payload.taskTitle || 'unknown'}"` +
        `\n- Difficulty: ${ctx.payload.difficulty}/5` +
        `\n- Focus: ${ctx.payload.focus}/5`;
      if (ctx.payload.notes) body += `\n- Notes: ${ctx.payload.notes}`;
      body += '\n\n';
    }
    body += `Current plan:\n${ctx.remainingTasksJson}\n\n` +
      'Student metrics:\n' +
      `- Streak: ${ctx.metrics.streak_days} days\n` +
      `- Completion rate (7d): ${Math.round((ctx.metrics.completion_rate_7d || 0) * 100)}%\n` +
      `- Consecutive skips: ${ctx.metrics.consecutive_skips}\n\n` +
      `Available days: ${(ctx.profile.available_days || ['mon', 'tue', 'wed', 'thu', 'fri']).join(', ')}\n` +
      `Weekly target hours: ${ctx.profile.weekly_available_hours}\n` +
      `Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
      'Respond with a brief acknowledgment (1-2 sentences) in the "message" field. If the plan needs adjustment based on this student action, provide the updated plan in the "plan" field. If no adjustment is needed, set "plan" to null. Keep the message concise and actionable. Do NOT include chat history.';
    return body;
  },

  check_in: (ctx) =>
    '[session_type: check_in]\n\n' +
    'Check-in data:\n' +
    `- Mood/energy: ${ctx.payload.mood}\n` +
    `- Streak: ${ctx.metrics.streak_days} days\n` +
    `- Consecutive skips: ${ctx.metrics.consecutive_skips}\n\n` +
    `Completed since last check-in:\n${ctx.completedSummary}\n\n` +
    `Skipped since last check-in:\n${ctx.skippedSummary}\n\n` +
    `Remaining plan:\n${ctx.remainingTasksJson}\n\n` +
    'Based on this check-in, adjust the remaining plan if needed. If the student is on track, keep the plan unchanged.',

  adjustment: (ctx) =>
    '[session_type: adjustment]\n\n' +
    `Adjustment reason: ${ctx.payload.type || 'custom'}\n` +
    `Detail: ${ctx.payload.message || ''}\n\n` +
    `Current plan:\n${ctx.remainingTasksJson}\n\n` +
    'Completion metrics:\n' +
    `- Completion rate (7d): ${Math.round((ctx.metrics.completion_rate_7d || 0) * 100)}%\n` +
    `- Consecutive skips: ${ctx.metrics.consecutive_skips}\n` +
    `- Streak: ${ctx.metrics.streak_days} days\n\n` +
    `Available days: ${(ctx.profile.available_days || ['mon', 'tue', 'wed', 'thu', 'fri']).join(', ')}\n` +
    `Weekly target hours: ${ctx.profile.weekly_available_hours}\n` +
    `Preferred slots: ${ctx.profile.preferred_slots}\n` +
    `Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
    'Adjust the plan to accommodate this change. Only modify tasks that are affected. Explain changes in adaptation_notes.',

  chat: (ctx) => {
    let body = '[session_type: chat]\n\n';
    if (ctx.payload.reason !== undefined) {
      body += `Student skipped task "${ctx.payload.taskTitle || 'unknown'}" with reason: ${ctx.payload.reason}`;
      if (ctx.payload.note) body += `\nNote: ${ctx.payload.note}`;
      body += '\n\n';
    } else if (ctx.payload.difficulty !== undefined) {
      body += `Student feedback on task "${ctx.payload.taskTitle || 'unknown'}"` +
        `\n- Difficulty: ${ctx.payload.difficulty}/5` +
        `\n- Focus: ${ctx.payload.focus}/5`;
      if (ctx.payload.notes) body += `\n- Notes: ${ctx.payload.notes}`;
      body += '\n\n';
    } else {
      body += `Student message: ${ctx.payload.message || ''}\n\n`;
    }
    body += `Recent conversation:\n${ctx.chatHistory}\n\n` +
      `Current plan summary:\n${ctx.remainingTasksSummary}\n\n` +
      'Student metrics:\n' +
      `- Streak: ${ctx.metrics.streak_days} days\n` +
      `- Completion rate (7d): ${Math.round((ctx.metrics.completion_rate_7d || 0) * 100)}%\n` +
      `- Mood: ${ctx.metrics.last_mood || 'unknown'}\n\n` +
      `Available days: ${(ctx.profile.available_days || ['mon', 'tue', 'wed', 'thu', 'fri']).join(', ')}\n` +
      `Weekly target hours: ${ctx.profile.weekly_available_hours}\n` +
      `Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
      'Respond conversationally. If the student needs a plan change, adjust the plan and explain why. Otherwise just answer. Keep response under 150 words.';
    return body;
  },

  crisis: (ctx) =>
    '[session_type: crisis]\n\n' +
    'Crisis indicators:\n' +
    `- Mood: ${ctx.metrics.last_mood}\n` +
    `- Consecutive skips: ${ctx.metrics.consecutive_skips}\n` +
    `- Completion rate (3d): ${Math.round((ctx.metrics.completion_rate_3d || 0) * 100)}%\n\n` +
    `Current plan:\n${ctx.remainingTasksJson}\n\n` +
    `Available days: ${(ctx.profile.available_days || ['mon', 'tue', 'wed', 'thu', 'fri']).join(', ')}\n` +
    `Weekly target hours: ${ctx.profile.weekly_available_hours}\n` +
    `Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
    'This student may be overwhelmed. Reduce the plan. Focus on highest-impact tasks only. Be empathetic.',

  milestone: (ctx) =>
    '[session_type: milestone]\n\n' +
    'The student has completed all tasks in their current cycle!\n\n' +
    `Completed: ${ctx.metrics.total_completed} tasks\n` +
    `Streak: ${ctx.metrics.streak_days} days\n\n` +
    'Student profile:\n' +
    `- Goal: ${ctx.profile.goal}\n` +
    `- Weekly hours: ${ctx.profile.weekly_available_hours}\n` +
    `- Available days: ${(ctx.profile.available_days || ['mon', 'tue', 'wed', 'thu', 'fri']).join(', ')}\n` +
    `- Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
    'Generate the next phase. Increase difficulty by 10-15%. Acknowledge the achievement.',
};

const TEMPERATURES = {
  initial_plan: 0.3,
  check_in: 0.4,
  adjustment: 0.3,
  chat: 0.5,
  crisis: 0.3,
  milestone: 0.5,
};

module.exports = { TEMPLATES, TEMPERATURES };
