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
  { title: 'Review fundamentals of {topic}', desc: 'Read introductory material and take notes on core concepts of {topic}' },
  { title: 'Practice {topic} exercises', desc: 'Complete hands-on exercises to reinforce understanding of {topic}' },
  { title: 'Watch tutorial on {topic}', desc: 'Follow along with a video tutorial covering practical applications of {topic}' },
  { title: 'Build a mini-project using {topic}', desc: 'Apply {topic} concepts in a small standalone project' },
  { title: 'Summarize key takeaways on {topic}', desc: 'Write a brief summary of what was learned about {topic}' },
  { title: 'Review and refactor {topic} code', desc: 'Go back over earlier {topic} work and improve code quality' },
  { title: 'Study advanced patterns in {topic}', desc: 'Explore more complex patterns and best practices in {topic}' },
  { title: 'Take a quiz on {topic}', desc: 'Test knowledge retention with practice questions about {topic}' },
];

function generateMockSuggestion(userContext) {
  const goalTitle = userContext.goal?.title || 'General Study';
  const topic = goalTitle.replace(/^(Learn|Study|Master|Practice|Review)\s+/i, '').trim() || 'the topic';
  const deadline = userContext.goal?.deadline;
  const preferredSlot = userContext.preferred_time || 'morning';
  const weeklyHours = Number(userContext.weekly_target_hours) || 5;
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
      title: tmpl.title.replace(/\{topic\}/g, topic),
      description: tmpl.desc.replace(/\{topic\}/g, topic),
      duration_estimate: [25, 30, 45, 60, 45, 30, 45, 30][i % 8],
      planned_date: dates[i],
      planned_slot: SLOT_CYCLE[(SLOT_CYCLE.indexOf(preferredSlot) + i) % 3],
      rationale: `Mock suggestion: scheduled for ${preferredSlot} session to align with your learning preference`,
    });
  }

  return {
    tasks,
    summary: `[MOCK] Generated ${taskCount} study tasks for "${goalTitle}" based on your ${weeklyHours}h/week target. Set LLM_PROVIDER=gemini to use real AI.`,
  };
}

module.exports = { generateMockSuggestion };

function generateMockChat(ctx) {
  const studentMsg = (ctx.payload && ctx.payload.message) || '';
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

module.exports = { generateMockSuggestion, generateMockChat };
