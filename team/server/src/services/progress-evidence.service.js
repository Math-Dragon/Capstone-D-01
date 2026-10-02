/**
 * Progress evidence rule functions.
 * Pure rule functions, no DB, no side effects.
 * Frozen input shape:
 *   completionRate,        // number|null
 *   completedCount,        // number, default 0
 *   plannedCount,          // number, default 0
 *   avgDifficulty,         // number|null
 *   difficultySampleCount, // number, default 0
 *   streakDays,            // number, default 0
 *   lastMood,              // string|null
 *   consecutiveSkips,      // number, default 0
 *   window,                // string, default '7d' — echoed on every signal
 */

function buildProgressEvidence(input) {
  const src = input || {};
  const completionRate = src.completionRate;
  const completedCount = src.completedCount !== undefined ? src.completedCount : 0;
  const plannedCount = src.plannedCount !== undefined ? src.plannedCount : 0;
  const avgDifficulty = src.avgDifficulty;
  const difficultySampleCount = src.difficultySampleCount !== undefined ? src.difficultySampleCount : 0;
  const streakDays = src.streakDays !== undefined ? src.streakDays : 0;
  const lastMood = src.lastMood;
  const window = src.window || '7d';

  const signals = [];

  // 1) completion_rate signal
  if (completionRate != null) {
    signals.push({
      code: 'completion_rate_7d',
      summary: `Completion rate (7d): ${Math.round(completionRate * 100)}% (${completedCount}/${plannedCount} tasks)`,
      window,
      count: plannedCount,
    });
  }

  // 2) wellbeing: avg_difficulty preferred over last_mood when samples exist
  if (avgDifficulty != null && difficultySampleCount > 0) {
    signals.push({
      code: 'avg_difficulty_7d',
      summary: `Average difficulty (7d): ${avgDifficulty.toFixed(1)}/5 (${difficultySampleCount} samples)`,
      window,
      count: difficultySampleCount,
    });
  } else if (lastMood) {
    signals.push({
      code: 'last_mood',
      summary: `Last mood: ${lastMood}`,
      window,
      count: 1,
    });
  }

  // 3) streak_days signal
  if (streakDays > 0) {
    signals.push({
      code: 'streak_days',
      summary: `Streak: ${streakDays} days`,
      window,
      count: streakDays,
    });
  }

  const available = signals.length > 0;
  return { available, signals: signals.slice(0, 3) };
}

function formatProgressEvidence(evidence) {
  if (
    !evidence ||
    !evidence.available ||
    !Array.isArray(evidence.signals) ||
    evidence.signals.length === 0
  ) {
    return '';
  }
  return evidence.signals.map((s) => '- ' + s.summary).join('\n');
}

function deriveCoachStrategy(input) {
  const hasData =
    input.completionRate != null ||
    (input.avgDifficulty != null && input.difficultySampleCount > 0) ||
    input.streakDays > 0 ||
    input.lastMood != null;

  if (!hasData) return null;

  // Rule 1: consecutiveSkips >= 3 || lastMood === 'drained' || lastMood === 'overwhelmed'
  if (
    input.consecutiveSkips >= 3 ||
    input.lastMood === 'drained' ||
    input.lastMood === 'overwhelmed'
  ) {
    return {
      text: 'Kurangi beban dulu: pilih satu tugas paling ringan dan beri ruang pemulihan.',
      source: 'rule_based',
    };
  }

  // Rule 2: completionRate != null && completionRate < 0.4
  if (input.completionRate != null && input.completionRate < 0.4) {
    return {
      text: 'Mulai dari satu tugas singkat, lalu evaluasi kembali kapasitas belajarmu.',
      source: 'rule_based',
    };
  }

  // Rule 3: avgDifficulty != null && avgDifficulty > 4
  if (input.avgDifficulty != null && input.avgDifficulty > 4) {
    return {
      text: 'Pecah tugas tersulit menjadi langkah lebih kecil dan tambahkan latihan dasar sebelum praktik.',
      source: 'rule_based',
    };
  }

  // Rule 4: avgDifficulty != null && avgDifficulty > 0 && avgDifficulty < 1.5
  if (input.avgDifficulty != null && input.avgDifficulty > 0 && input.avgDifficulty < 1.5) {
    return {
      text: 'Naikkan tantangan secara bertahap dengan variasi latihan yang lebih menantang.',
      source: 'rule_based',
    };
  }

  // Rule 5: completionRate != null && completionRate >= 0.9 && streakDays >= 5
  if (
    input.completionRate != null &&
    input.completionRate >= 0.9 &&
    input.streakDays >= 5
  ) {
    return {
      text: 'Konsistensi kuat. Pertahankan ritme dan tambah target mingguan sekitar 10%.',
      source: 'rule_based',
    };
  }

  // Rule 6: completionRate != null && completionRate >= 0.7
  if (input.completionRate != null && input.completionRate >= 0.7) {
    return {
      text: 'Pertahankan ritme dan sesuaikan beban jika diperlukan.',
      source: 'rule_based',
    };
  }

  // Rule 7: default
  return {
    text: 'Jaga ritme belajar tetap stabil dan evaluasi beban secara berkala.',
    source: 'rule_based',
  };
}

module.exports = { buildProgressEvidence, formatProgressEvidence, deriveCoachStrategy };