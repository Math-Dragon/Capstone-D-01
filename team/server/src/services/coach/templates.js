const TASK_STRUCT = '"tasks": [{"title": "...", "description": "...", "task_type": "acquire|practice|recall|interleave|synthesize|review|assess|reflect", "duration_estimate": 25-90, "planned_date": "YYYY-MM-DD", "planned_slot": "morning|afternoon|evening", "priority": "high|medium|low", "completion_criteria": "...", "prerequisites": [], "rationale": [{"factor": "preference_match|availability|learning_science|difficulty_fit|sequence_fit|workload_balance", "explanation": "..."}], "confidence": "low|medium|high"}]';

const TEMPLATES = {
  initial_plan: (ctx) =>
    (() => {
      const compactMode = !!ctx.compactMode;
      const taskInstruction = compactMode
        ? 'Keep the response concise. Task count proportional to goal scope. Each rationale must remain an array of factor objects; keep explanations brief.'
        : 'Generate as many tasks as the goal scope requires — no fixed number. Let the goal breadth, deadline, and weekly hours determine the count. Prioritize quality over quantity.';
      return (
    '[session_type: initial_plan]\n\n' +
    `Today's date: ${new Date().toISOString().slice(0, 10)}\n` +
    `Student goal: ${ctx.profile.goal}\n` +
    `Subjects: ${ctx.profile.subjects}\n` +
    `Current level per subject: ${ctx.profile.current_level}\n` +
    `Weekly available hours: ${ctx.profile.weekly_available_hours}\n` +
    `Preferred study slots: ${ctx.profile.preferred_slots}\n` +
    `Available days: ${(ctx.profile.available_days || ['mon', 'tue', 'wed', 'thu', 'fri']).join(', ')}\n` +
    `Deadline: ${ctx.profile.deadline || 'open-ended'}\n\n` +
    `${taskInstruction} Respond with JSON only in this exact structure:\n` +
    `{${TASK_STRUCT}, "summary": "brief overview of the plan"}\n` +
    'No conversational text outside the JSON.'
      );
    })(),

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
      'Respond with a brief acknowledgment (1-2 sentences) in the "message" field. If the plan needs adjustment based on this student action, provide the updated plan in the "plan" field. If no adjustment is needed, set "plan" to null. Keep the message concise and actionable. Do NOT include chat history. Respond with JSON only. No conversational text outside the JSON.';
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
    'Based on this check-in, adjust the remaining plan if needed. If the student is on track, keep the plan unchanged. Respond with JSON only. No conversational text.',

  adjustment: (ctx) => {
    const typeInstructions = {
      less_work: 'Kurangi beban belajar. Target: jumlah task lebih sedikit dari saat ini. Hapus task prioritas rendah, pertahankan task inti (acquire, practice). Hentikan task non-esensial. Jangan ubah judul atau konten task yang dipertahankan — cukup kurangi jumlahnya.',
      more_challenge: 'Tingkatkan tantangan secara substansial. Jangan sekadar memodifikasi task yang sama — buat task baru dengan jenis aktivitas BERBEDA. Contoh: jika task sebelumnya adalah "membuat muffin polos", task baru harus membuat kue jenis LAIN (lapis, croissant, bagel) — BUKAN "muffin topping". Naikkan tipe task (practice → interleave/synthesize). Tambah durasi 15-20%. Task baru harus lebih kompleks secara SUBSTANSI.',
      change_focus: 'Ubah fokus rencana sesuai arahan pengguna. Restruktur task yang ada agar selaras dengan fokus baru — jangan sekadar menyisipkan kata kunci ke judul task lama. Task harus benar-benar mencerminkan fokus baru secara konten dan aktivitas. Jaga jumlah task tetap proporsional.',
      shift_dates: 'Geser jadwal task yang ada. Sesuaikan planned_date dan planned_slot. Jangan ubah konten atau jumlah task.',
    };
    const instruction = typeInstructions[ctx.payload.type] || 'Sesuaikan rencana berdasarkan perubahan ini. Modifikasi task yang terpengaruh tanpa mengubah task yang masih sesuai.';
    return (
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
    `${instruction}\n\n` +
    `Respond with JSON only in this exact structure:\n{${TASK_STRUCT}, "summary": "brief description of changes", "adaptation_notes": "explanation of what was adjusted and why"}\nNo conversational text outside the JSON.`
    );
  },

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
      'Respond using the JSON dual format with "message" (conversational) and "plan" fields. If the student needs a plan change, include the updated plan. Otherwise set "plan" to null. No text outside the JSON structure.';
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
    'This student may be overwhelmed. Reduce the plan. Focus on highest-impact tasks only. Be empathetic.\n\n' +
    `Respond with JSON only. Use this exact format:\n{${TASK_STRUCT}, "summary": "concise description of the adjusted plan", "next_check_in": "YYYY-MM-DD", "adaptation_notes": "explanation with empathetic tone"}\nNo conversational text outside the JSON.`,

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
    'Generate the next phase. Increase difficulty by 10-15%. Acknowledge the achievement.\n\n' +
    `Respond with JSON only. Use this exact format:\n{${TASK_STRUCT}, "summary": "concise description of the next phase", "next_check_in": "YYYY-MM-DD", "adaptation_notes": "acknowledgment of achievement and explanation of increased difficulty"}\nNo conversational text outside the JSON.`,
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
