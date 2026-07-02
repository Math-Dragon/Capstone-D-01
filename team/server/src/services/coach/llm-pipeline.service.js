const { validateChatOutput, validateWithWarnings, sanitizeContext } = require('../llm');
const { generateMockSuggestion, generateMockChat, generateMockTaskAction } = require('../llm-mock');
const { isMock, callWithRetry } = require('../llm-client');
const { composeSystemPrompt } = require('../../utils/prompt-composer');
const logger = require('../../utils/logger');
const { aiRequestCount } = require('../../utils/metrics');
const { TEMPLATES, TEMPERATURES } = require('./templates');

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function buildFallbackInitialPlan(ctx) {
  const today = new Date();
  const preferredSlot = Array.isArray(ctx.profile?.preferred_slots) && ctx.profile.preferred_slots.length > 0
    ? ctx.profile.preferred_slots[0]
    : 'morning';
  const availableDays = Array.isArray(ctx.profile?.available_days) && ctx.profile.available_days.length > 0
    ? ctx.profile.available_days
    : ['mon', 'tue', 'wed', 'thu', 'fri'];
  const goalLabel = ctx.profile?.goal || ctx.payload?.goal?.title || 'tujuan belajar';

  const plannedDates = [];
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  while (plannedDates.length < 3) {
    const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][cursor.getDay()];
    if (availableDays.includes(dayKey)) {
      plannedDates.push(toIsoDate(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const topicLabel = goalLabel.length > 48 ? `${goalLabel.slice(0, 45)}...` : goalLabel;

  return {
    tasks: [
      {
        title: `Pahami konsep inti ${topicLabel}`,
        description: `Baca atau tonton materi dasar yang paling relevan untuk memulai ${goalLabel}. Catat 3 poin penting.`,
        task_type: 'acquire',
        duration_estimate: 45,
        planned_date: plannedDates[0],
        planned_slot: preferredSlot,
        rationale: [
          { factor: 'sequence_fit', explanation: 'Mulai dari fondasi agar langkah berikutnya lebih mudah dipahami.' },
        ],
        confidence: 'medium',
      },
      {
        title: `Latihan terarah untuk ${topicLabel}`,
        description: `Kerjakan satu latihan kecil atau mini project sederhana agar konsep ${goalLabel} langsung dipraktikkan.`,
        task_type: 'practice',
        duration_estimate: 45,
        planned_date: plannedDates[1],
        planned_slot: preferredSlot,
        rationale: [
          { factor: 'learning_science', explanation: 'Praktik cepat membantu memindahkan konsep ke pemahaman aktif.' },
        ],
        confidence: 'medium',
      },
      {
        title: `Refleksi dan cek hambatan ${topicLabel}`,
        description: 'Tulis apa yang sudah dipahami, apa yang masih membingungkan, lalu tentukan fokus belajar berikutnya.',
        task_type: 'reflect',
        duration_estimate: 25,
        planned_date: plannedDates[2],
        planned_slot: preferredSlot,
        rationale: [
          { factor: 'workload_balance', explanation: 'Refleksi ringan menjaga ritme belajar tetap realistis dan konsisten.' },
        ],
        confidence: 'medium',
      },
    ],
    summary: `Rencana dasar disiapkan untuk mulai belajar ${goalLabel} sambil menunggu layanan AI kembali stabil.`,
  };
}

function _buildUserMessage(ctx) {
  const safeCtx = sanitizeContext(ctx);
  const template = TEMPLATES[safeCtx.sessionType] || TEMPLATES.chat;
  return template(safeCtx);
}

function getTasks(validated) {
  if (validated && Array.isArray(validated.tasks)) return validated.tasks;
  if (validated && validated.plan && Array.isArray(validated.plan.tasks)) return validated.plan.tasks;
  return null;
}

function applyBusinessRules(validated, ctx) {
  const tasks = getTasks(validated);
  if (!tasks || tasks.length === 0) return { result: validated, retry: false };

  const weeklyTargetHours = ctx.profile?.weekly_available_hours || 5;
  const maxMinutes = Math.round(weeklyTargetHours * 60 * 1.2);
  let needsRetry = false;

  const byDate = () => {
    const map = {};
    for (const t of tasks) {
      const d = t.planned_date;
      if (!map[d]) map[d] = [];
      map[d].push(t);
    }
    return map;
  };

  let totalMin = tasks.reduce((s, t) => s + (t.duration_estimate || 0), 0);
  if (totalMin > maxMinutes) {
    tasks.sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return (p[a.priority] || 1) - (p[b.priority] || 1);
    });
    while (tasks.reduce((s, t) => s + (t.duration_estimate || 0), 0) > maxMinutes && tasks.length > 1) {
      tasks.pop();
    }
  }

  let dated = byDate();
  const allDates = Object.keys(dated).sort();

  for (const date of allDates) {
    const acquire = dated[date].filter(t => t.task_type === 'acquire');
    if (acquire.length > 2) {
      const otherDates = allDates.filter(d => d !== date);
      if (otherDates.length > 0) {
        for (let i = 2; i < acquire.length; i++) {
          acquire[i].planned_date = otherDates[(i - 2) % otherDates.length];
        }
      }
    }
  }

  dated = byDate();
  allDates.length = 0;
  allDates.push(...Object.keys(dated).sort());

  for (const dateTasks of Object.values(dated)) {
    const hasPractice = dateTasks.some(t => t.task_type === 'practice');
    if (hasPractice) {
      dateTasks.sort((a, b) => {
        if (a.task_type === 'assess' && b.task_type === 'practice') return 1;
        if (a.task_type === 'practice' && b.task_type === 'assess') return -1;
        return 0;
      });
    }
  }

  if (!tasks.some(t => t.task_type === 'reflect')) {
    needsRetry = true;
  }

  const dayMap = {};
  for (const t of tasks) {
    if (!dayMap[t.planned_date]) dayMap[t.planned_date] = { tasks: [], totalMin: 0 };
    dayMap[t.planned_date].tasks.push(t);
    dayMap[t.planned_date].totalMin += t.duration_estimate || 0;
  }
  const sortedDates = Object.keys(dayMap).sort();
  let heavyStreak = 0;
  for (const date of sortedDates) {
    if (dayMap[date].totalMin > 180) {
      heavyStreak++;
      if (heavyStreak >= 3) {
        const lightDate = sortedDates.find(d => dayMap[d].totalMin < 180 && d !== date);
        if (lightDate && dayMap[date].tasks.length > 1) {
          const target = dayMap[date].tasks.find(t => t.task_type !== 'practice') || dayMap[date].tasks[dayMap[date].tasks.length - 1];
          target.planned_date = lightDate;
        }
      }
    } else {
      heavyStreak = 0;
    }
  }

  return { result: validated, retry: needsRetry };
}

async function callLLM(ctx, isChat) {
  const baseMessage = _buildUserMessage(ctx);

  if (isMock) {
    const isTaskActionSession = ctx.sessionType === 'task_action';
    let validated;
    if (isTaskActionSession) {
      validated = generateMockTaskAction(ctx);
    } else if (isChat) {
      validated = generateMockChat(ctx);
    } else {
      validated = generateMockSuggestion(ctx);
    }
    return { validated, llmMeta: { attempts: [], duration_ms: 0 } };
  }

  const systemPrompt = composeSystemPrompt(ctx.sessionType, {
    title: ctx.profile.goal,
    description: ctx.profile.subjects,
    deadline: ctx.profile.deadline,
    difficulty: ctx.profile.difficulty,
    weeklyHours: ctx.profile.weekly_available_hours,
  });

  const MAX_BUSINESS_RETRIES = 1;
  let allAttempts = [];
  let totalDuration = 0;
  let retryHint = '';
  let compactRetry = false;

  for (let attempt = 0; attempt <= MAX_BUSINESS_RETRIES; attempt++) {
    const promptContext = compactRetry ? { ...ctx, compactMode: true } : ctx;
    const promptBody = compactRetry ? _buildUserMessage(promptContext) : baseMessage;
    const msg = attempt === 0 ? promptBody : promptBody + retryHint;

    const start = Date.now();
    let raw, attempts;
    try {
      const result = await callWithRetry(msg, {
        systemPrompt,
        maxRetries: ctx.sessionType === 'initial_plan' ? 2 : 1,
        label: `coach.${ctx.sessionType}`,
        timeoutMs: isChat ? 25000 : (ctx.sessionType === 'initial_plan' ? 35000 : 30000),
        temperature: TEMPERATURES[ctx.sessionType],
      });
      raw = result.content;
      attempts = result.attempts || [];
    } catch (err) {
      logger.error({ err: err.message }, 'Coach LLM call failed after retries');
      aiRequestCount.inc({ type: `coach.${ctx.sessionType}`, status: 'error' });
      const llmMeta = { attempts: allAttempts.concat(err.attempts || []), duration_ms: totalDuration + (Date.now() - start) };
      if (isChat) {
        return { validated: { message: 'Maaf, saya sedang mengalami gangguan. Coba lagi sebentar.', plan: null }, llmMeta };
      }
      if (attempt < MAX_BUSINESS_RETRIES) {
        compactRetry = true;
        retryHint = '\n\n[Latency mitigation: keep response concise. Task count proportional to goal scope. Each rationale must remain an array of factor objects; keep explanations brief.]';
        continue;
      }
      if (ctx.sessionType === 'initial_plan') {
        logger.warn({ err: err.message }, 'Falling back to deterministic initial plan');
        return {
          validated: buildFallbackInitialPlan(ctx),
          llmMeta: {
            ...llmMeta,
            fallback_used: 'deterministic_initial_plan',
          },
        };
      }
      const mappedError = err.name === 'AbortError'
        ? Object.assign(new Error('AI request timed out. Please try again.'), {
          code: 'AI_TIMEOUT',
          statusCode: 504,
        })
        : Object.assign(new Error('AI service is temporarily unavailable. Please try again in a moment.'), {
          code: 'AI_UNAVAILABLE',
          statusCode: 503,
          originalError: err.message,
        });
      mappedError._llmMeta = llmMeta;
      throw mappedError;
    }

    const durationMs = Date.now() - start;
    totalDuration += durationMs;
    allAttempts = allAttempts.concat(attempts);

    let validated;
    let violations;
    try {
      if (isChat) {
        validated = validateChatOutput(raw);
      } else {
        const vResult = validateWithWarnings(raw);
        validated = vResult.data;
        if (vResult.violations.length > 0) {
          return {
            validated: vResult.data,
            llmMeta: { attempts: allAttempts, duration_ms: totalDuration },
            violations: vResult.violations,
          };
        }
      }
    } catch (validationErr) {
      if (validationErr.code === 'AI_OUTPUT_INVALID' && attempt < MAX_BUSINESS_RETRIES) {
        logger.warn({ attempt, sessionType: ctx.sessionType, err: validationErr.message }, 'JSON parse failed, retrying with format hint');
        if (validationErr.message.includes('schema violation at')) {
          retryHint = `\n\n[Schema validation: ${validationErr.message.split('schema violation at ')[1]}]\nPlease correct this and respond with valid JSON only.`;
        } else {
          retryHint = '\n\n[Format error: Your response was not valid JSON. Respond with ONLY valid JSON using the output structure described in the system prompt. Do not include any text before or after the JSON.]';
        }
        continue;
      }
      aiRequestCount.inc({ type: `coach.${ctx.sessionType}`, status: 'error' });
      const llmMeta = { attempts: allAttempts, duration_ms: totalDuration };
      if (isChat) {
        return { validated: { message: 'Maaf, saya sedang mengalami gangguan. Coba lagi sebentar.', plan: null }, llmMeta };
      }
      validationErr._llmMeta = llmMeta;
      throw validationErr;
    }

    if (!isChat && !violations && validated && Array.isArray(validated.tasks) && validated.tasks.length > 0) {
      const { result: planResult, retry } = applyBusinessRules(validated, ctx);
      if (!retry || attempt === MAX_BUSINESS_RETRIES) {
        return { validated: planResult, llmMeta: { attempts: allAttempts, duration_ms: totalDuration } };
      }
      retryHint = '\n\n[Business validation: The previous response was missing a "reflect" task. Please include at least one task with task_type "reflect".]';
      continue;
    }

    return { validated, llmMeta: { attempts: allAttempts, duration_ms: totalDuration } };
  }
}

module.exports = { callLLM };
