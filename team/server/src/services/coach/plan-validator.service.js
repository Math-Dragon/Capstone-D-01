const logger = require('../../utils/logger');

const HARDER_TYPES = {
  acquire: 'interleave',
  practice: 'synthesize',
  recall: 'synthesize',
  review: 'interleave',
};

function tokenize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function jaccardSimilarity(a, b) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function sumDuration(tasks) {
  return tasks.reduce((s, t) => s + (t.duration_estimate || 0), 0);
}

function sumDurationStr(tasks) {
  const total = sumDuration(tasks);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

function boostDurations(tasks, factor) {
  tasks.forEach(t => {
    t.duration_estimate = Math.min(90, Math.round((t.duration_estimate || 25) * factor));
  });
}

function maxTitleJaccard(beforeTitles, afterTitles) {
  let maxSim = 0;
  for (const a of afterTitles) {
    for (const b of beforeTitles) {
      maxSim = Math.max(maxSim, jaccardSimilarity(a, b));
    }
  }
  return maxSim;
}

function validateAdjustment(beforeCtx, plan, type, userMessage) {
  if (!plan || !plan.tasks) return plan;

  const before = beforeCtx.pendingTasks || [];
  const after = plan.tasks;

  const beforeCount = before.length;
  const afterCount = after.length;
  const beforeMin = sumDuration(before);

  const diffs = [];
  let modified = false;

  switch (type) {
    case 'less_work': {
      let clamped = false;
      if (afterCount >= beforeCount) {
        const targetCount = Math.max(1, Math.ceil(beforeCount * 0.6));
        plan.tasks = plan.tasks.slice(0, targetCount);
        diffs.push(`task turun dari ${beforeCount} ke ${plan.tasks.length} (auto-clamp)`);
        modified = true;
        clamped = true;
      }
      if (!clamped) {
        const newTotal = sumDuration(plan.tasks);
        if (newTotal >= beforeMin) {
          while (sumDuration(plan.tasks) > Math.round(beforeMin * 0.6) && plan.tasks.length > 1) {
            plan.tasks.pop();
          }
          diffs.push(`durasi turun dari ${sumDurationStr(before)} ke ${sumDurationStr(plan.tasks)} (auto-clamp)`);
          modified = true;
        }
      }
      break;
    }

    case 'more_challenge': {
      const harderTypes = ['interleave', 'synthesize', 'assess'];
      const hasHarder = after.some(t => harderTypes.includes(t.task_type));
      if (!hasHarder && after.length > 0) {
        const upgradeTarget = after.reduce((a, b) =>
          (b.duration_estimate || 0) > (a.duration_estimate || 0) ? b : a
        );
        const originalType = upgradeTarget.task_type;
        const harder = HARDER_TYPES[originalType];
        if (harder) {
          upgradeTarget.task_type = harder;
          diffs.push(`task "${upgradeTarget.title}" tipe naik: ${originalType} → ${harder}`);
          modified = true;
        }
      }

      boostDurations(plan.tasks, 1.15);
      diffs.push('durasi semua task naik 15%');
      modified = true;

      const beforeTitles = before.map(t => t.title || '');
      const afterTitles = after.map(t => t.title || '');
      const sim = maxTitleJaccard(beforeTitles, afterTitles);
      if (sim > 0.8) {
        logger.warn({ similarity: sim, type }, 'more_challenge: semantic drift minimal — judul task terlalu mirip dengan sebelum');
      }
      break;
    }

    case 'change_focus': {
      const beforeTitles = before.map(t => t.title || '');
      const afterTitles = after.map(t => t.title || '');
      const sim = maxTitleJaccard(beforeTitles, afterTitles);
      if (sim > 0.8) {
        logger.warn({ similarity: sim, type, userMessage }, 'change_focus: judul task baru terlalu mirip dengan sebelum — LLM mungkin tidak mengubah fokus secara substansial');
      }
      break;
    }
  }

  if (modified) {
    plan.adaptation_notes = plan.adaptation_notes
      ? `${plan.adaptation_notes} | ${diffs.join('; ')}`
      : diffs.join('; ');
    logger.info({ type, diffs }, 'Plan auto-corrected by validator');
  }

  return plan;
}

module.exports = { validateAdjustment, jaccardSimilarity, sumDuration };
