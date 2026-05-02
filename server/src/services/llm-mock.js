const crypto = require('crypto');

function generateDates(deadline, count) {
  const dates = [];
  const end = deadline ? new Date(deadline) : new Date(Date.now() + 14 * 86400000);
  const now = new Date();
  now.setDate(now.getDate() + 1);
  now.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const d = new Date(now.getTime() + i * Math.floor((end - now) / Math.max(count, 1)));
    if (d > end) d.setTime(end.getTime());
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

const SLOT_CYCLE = ['morning', 'afternoon', 'evening'];

const TASK_TEMPLATES = [
  { title: 'Review fundamentals of {topic}', desc: 'Read introductory material and take notes on core concepts of {topic}', type: 'acquire' },
  { title: 'Practice {topic} exercises', desc: 'Complete hands-on exercises to reinforce understanding of {topic}', type: 'practice' },
  { title: 'Recall key concepts: {topic}', desc: 'Test memory by writing down everything you remember about {topic} without looking at notes', type: 'recall' },
  { title: 'Build a mini-project using {topic}', desc: 'Apply {topic} concepts in a small standalone project', type: 'synthesize' },
  { title: 'Summarize key takeaways on {topic}', desc: 'Write a brief summary of what was learned about {topic}', type: 'reflect' },
  { title: 'Review and refactor {topic} code', desc: 'Go back over earlier {topic} work and improve code quality', type: 'review' },
  { title: 'Study advanced patterns in {topic}', desc: 'Explore more complex patterns and best practices in {topic}', type: 'interleave' },
  { title: 'Take a quiz on {topic}', desc: 'Test knowledge retention with practice questions about {topic}', type: 'assess' },
];

function generateMockSuggestion(ctx) {
  const goalTitle = ctx.profile?.goal || 'General Study';
  const topic = goalTitle.replace(/^(Learn|Study|Master|Practice|Review)\s+/i, '').trim() || 'the topic';
  const deadline = ctx.profile?.deadline;
  const preferredSlot = ctx.profile?.preferred_slots?.[0] || 'morning';
  const weeklyHours = ctx.profile?.weekly_available_hours || 5;
  const taskCount = Math.min(Math.max(Math.round(weeklyHours), 2), 5);

  const seededIdx = (i) => {
    const hash = crypto.createHash('sha256').update(`${goalTitle}:${i}`).digest('hex');
    return parseInt(hash.slice(0, 8), 16);
  };

  const dates = generateDates(deadline, taskCount);

  const tasks = [];
  for (let i = 0; i < taskCount; i++) {
    const tmpl = TASK_TEMPLATES[seededIdx(i) % TASK_TEMPLATES.length];
    tasks.push({
      id: `t${i + 1}`,
      title: tmpl.title.replace(/\{topic\}/g, topic),
      description: tmpl.desc.replace(/\{topic\}/g, topic),
      task_type: tmpl.type,
      duration_estimate: [25, 30, 45, 60, 45, 30, 45, 30][i % 8],
      planned_date: dates[i],
      planned_slot: SLOT_CYCLE[(SLOT_CYCLE.indexOf(preferredSlot) + i) % 3],
      priority: i === 0 ? 'high' : 'medium',
      rationale: `[MOCK] ${tmpl.type} task scheduled for ${SLOT_CYCLE[(SLOT_CYCLE.indexOf(preferredSlot) + i) % 3]} session to align with your learning preference.`,
    });
  }

  const nextCheckIn = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

  return {
    tasks,
    summary: `[MOCK] Generated ${taskCount} study tasks for "${goalTitle}" based on your ${weeklyHours}h/week target. Set LLM_PROVIDER=gemini to use real AI.`,
    next_check_in: nextCheckIn,
    adaptation_notes: null,
  };
}

function generateMockTaskAction(ctx) {
  const payload = ctx.payload || {};

  if (payload.action === 'COMPLETE_TASK') {
    const title = payload.taskTitle || 'tugas tersebut';
    const streak = ctx.metrics?.streak_days || 0;
    let message;
    if (streak >= 7) {
      message = `🎉 Luar biasa! "${title}" selesai. Streak belajarmu ${streak} hari — konsistensimu menginspirasi!`;
    } else if (streak >= 3) {
      message = `🔥 Kerja bagus! "${title}" selesai. Streak-mu sekarang ${streak} hari. Pertahankan momentum!`;
    } else {
      message = `✅ "${title}" selesai. Total tugas selesai: ${payload.total_completed || 1}. Lanjutkan!`;
    }
    return { message, plan: null };
  }

  if (payload.reason !== undefined) {
    const title = payload.taskTitle || 'tugas tersebut';
    const reasonMap = {
      too_hard: 'terlalu sulit',
      no_time: 'tidak ada waktu',
      not_interested: 'kurang menarik',
      not_relevant: 'tidak relevan',
      low_energy: 'energi rendah',
      other: 'alasan lain',
    };
    const reasonText = reasonMap[payload.reason] || payload.reason;
    const message = `Saya mengerti kamu melewatkan "${title}" karena ${reasonText}. Tidak apa-apa, kita bisa menyesuaikan rencana. Apakah kamu ingin tugas ini dijadwalkan ulang atau diganti?`;
    return { message, plan: null };
  }

  if (payload.difficulty !== undefined) {
    const title = payload.taskTitle || 'tugas tersebut';
    let message = `Terima kasih atas feedback untuk "${title}"! Tingkat kesulitan: ${payload.difficulty}/5, Fokus: ${payload.focus}/5.`;
    if (payload.notes) message += ` Catatan: "${payload.notes}".`;
    if (payload.difficulty >= 4) {
      message += ' Tampaknya cukup menantang — saya akan menyesuaikan tugas berikutnya agar lebih manageable.';
    } else if (payload.difficulty <= 2) {
      message += ' Sepertinya sudah cukup mudah — saya akan tingkatkan tingkat kesulitan berikutnya.';
    } else {
      message += ' Pertahankan momentum belajarmu!';
    }
    return { message, plan: null };
  }

  return { message: 'Tindakan dicatat.', plan: null };
}

module.exports = { generateMockSuggestion, generateMockChat, generateMockTaskAction };

function generateMockChat(ctx) {
  const payload = ctx.payload || {};

  if (payload.reason !== undefined) {
    const title = payload.taskTitle || 'tugas tersebut';
    const reasonMap = {
      too_hard: 'terlalu sulit',
      no_time: 'tidak ada waktu',
      not_interested: 'kurang menarik',
      other: 'alasan lain',
    };
    const reasonText = reasonMap[payload.reason] || payload.reason;
    let message = `Saya mengerti kamu melewatkan "${title}" karena ${reasonText}. `;
    if (payload.note) message += `Catatanmu: "${payload.note}". `;
    message += 'Tidak apa-apa, kita bisa menyesuaikan rencana. Apakah kamu ingin tugas ini dijadwalkan ulang atau diganti?';
    return { message, plan: null };
  }

  if (payload.difficulty !== undefined) {
    const title = payload.taskTitle || 'tugas tersebut';
    let message = `Terima kasih atas feedback untuk "${title}"! `;
    message += `Tingkat kesulitan: ${payload.difficulty}/5, Fokus: ${payload.focus}/5. `;
    if (payload.notes) message += `Catatan: "${payload.notes}". `;
    if (payload.difficulty >= 4) {
      message += 'Tampaknya cukup menantang — saya akan menyesuaikan tugas berikutnya agar lebih manageable.';
    } else if (payload.difficulty <= 2) {
      message += 'Sepertinya sudah cukup mudah — saya akan tingkatkan tingkat kesulitan berikutnya untuk terus menantang kamu.';
    } else {
      message += 'Tingkat kesulitannya pas. Pertahankan momentum belajarmu!';
    }
    return { message, plan: null };
  }

  const studentMsg = payload.message || '';
  const lower = studentMsg.toLowerCase();

  let message;
  if (lower.includes('sulit') || lower.includes('hard') || lower.includes('struggle')) {
    message = 'Saya mengerti bahwa ini terasa sulit. Coba pecah menjadi bagian yang lebih kecil dan fokus pada satu konsep dalam satu waktu. Apakah ada topik tertentu yang ingin kita bahas lebih detail?';
  } else if (lower.includes('lebih') || lower.includes('more') || lower.includes('challenge')) {
    message = 'Bagus, semangat belajarmu tinggi! Saya akan tingkatkan tingkat kesulitan pada tugas berikutnya. Tetap pertahankan konsistensi belajarmu.';
  } else {
    message = 'Terima kasih sudah berbagi! Saya akan terus mendukung proses belajarmu. Jangan ragu untuk bertanya jika ada yang ingin kamu diskusikan tentang rencana belajar.';
  }

  return { message, plan: null };
}
