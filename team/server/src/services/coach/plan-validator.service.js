const logger = require('../../utils/logger');

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
      if (afterCount >= beforeCount) {
        const targetCount = Math.max(1, Math.ceil(beforeCount * 0.6));
        plan.tasks = plan.tasks.slice(0, targetCount);
        diffs.push(`task turun dari ${beforeCount} ke ${plan.tasks.length} (auto-clamp)`);
        modified = true;
      }
      const newTotal = sumDuration(plan.tasks);
      if (newTotal >= beforeMin) {
        const targetMin = Math.round(beforeMin * 0.6);
        while (sumDuration(plan.tasks) > targetMin && plan.tasks.length > 1) {
          plan.tasks.pop();
        }
        diffs.push(`durasi turun dari ${sumDurationStr(before)} ke ${sumDurationStr(plan.tasks)} (auto-clamp)`);
        modified = true;
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
        if (upgradeTarget.task_type === 'acquire') upgradeTarget.task_type = 'interleave';
        else if (upgradeTarget.task_type === 'practice') upgradeTarget.task_type = 'synthesize';
        else upgradeTarget.task_type = 'synthesize';
        diffs.push(`task "${upgradeTarget.title}" dinaikkan ke ${upgradeTarget.task_type}`);
        modified = true;
      }

      const beforeTitles = before.map(t => t.title || '');
      const afterTitles = after.map(t => t.title || '');
      let maxSimilarity = 0;
      for (const aTitle of afterTitles) {
        for (const bTitle of beforeTitles) {
          maxSimilarity = Math.max(maxSimilarity, jaccardSimilarity(aTitle, bTitle));
        }
      }
      if (maxSimilarity > 0.8) {
        diffs.push(`judul terlalu mirip dengan task sebelum (${Math.round(maxSimilarity * 100)}%) — LLM tidak memodifikasi secara substansial`);
        after.forEach(t => {
          if (t.title && !t.title.toLowerCase().includes('lanjutan') && !t.title.toLowerCase().includes('tingkat')) {
            t.title = `${t.title} (Tingkat Lanjut)`;
          }
        });
        modified = true;
      }
      break;
    }

    case 'change_focus': {
      if (userMessage) {
        const msgTokens = tokenize(userMessage);
        if (msgTokens.length > 0) {
          let keywordHit = 0;
          for (const t of after) {
            const titleTokens = tokenize(t.title);
            const overlap = msgTokens.filter(w => titleTokens.includes(w));
            if (overlap.length > 0) keywordHit++;
          }
          const hitRate = keywordHit / Math.min(after.length, 1);
          if (hitRate < 0.3 && after.length > 0) {
            const fokusWords = msgTokens.slice(0, 3).join(' ');
            after[0].title = `Fokus: ${fokusWords} — ${after[0].title}`;
            diffs.push(`fokus "${fokusWords}" di-inject ke judul task pertama`);
            modified = true;
          }
        }
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
