const { validateAIOutput, validateChatOutput } = require('../llm');
const { generateMockSuggestion, generateMockChat, generateMockTaskAction } = require('../llm-mock');
const { isMock, callWithRetry } = require('../llm-client');
const logger = require('../../utils/logger');
const { aiRequestCount } = require('../../utils/metrics');
const { TEMPLATES, TEMPERATURES } = require('./templates');

function _buildUserMessage(ctx) {
  const template = TEMPLATES[ctx.sessionType] || TEMPLATES.chat;
  return template(ctx);
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

  const MAX_BUSINESS_RETRIES = 1;
  let allAttempts = [];
  let totalDuration = 0;
  let retryHint = '';

  for (let attempt = 0; attempt <= MAX_BUSINESS_RETRIES; attempt++) {
    const msg = attempt === 0 ? baseMessage : baseMessage + retryHint;

    const start = Date.now();
    let raw, attempts;
    try {
      const result = await callWithRetry(msg, {
        maxRetries: 1,
        label: `coach.${ctx.sessionType}`,
        timeoutMs: isChat ? 25000 : 30000,
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
      err._llmMeta = llmMeta;
      throw err;
    }

    const durationMs = Date.now() - start;
    totalDuration += durationMs;
    allAttempts = allAttempts.concat(attempts);

    let validated;
    try {
      validated = isChat ? validateChatOutput(raw) : validateAIOutput(raw);
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

    if (!isChat && validated && Array.isArray(validated.tasks) && validated.tasks.length > 0) {
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
