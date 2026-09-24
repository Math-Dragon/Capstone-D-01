process.env.SKIP_DB_CHECK = 'true';

const { buildProgressEvidence, formatProgressEvidence, deriveCoachStrategy } = require('../../src/services/progress-evidence.service');

describe('progress-evidence.buildProgressEvidence', () => {
  test('builds up to 3 signals with completion_rate', () => {
    const input = {
      completionRate: 0.75,
      completedCount: 15,
      plannedCount: 20,
      avgDifficulty: null,
      difficultySampleCount: 0,
      streakDays: 0,
      lastMood: null,
      consecutiveSkips: 0,
    };
    const { available, signals } = buildProgressEvidence(input);
    expect(available).toBe(true);
    expect(signals.length).toBe(1);
    expect(signals[0].code).toBe('completion_rate_7d');
    expect(signals[0].summary).toBe('Completion rate (7d): 75% (15/20 tasks)');
    expect(signals[0].window).toBe('7d');
    expect(signals[0].count).toBe(20);
  });

  test('max 3 signals, difficulty preferred over mood when samples exist', () => {
    const input = {
      completionRate: 0.5,
      completedCount: 10,
      plannedCount: 20,
      avgDifficulty: 3.5,
      difficultySampleCount: 8,
      streakDays: 2,
      lastMood: 'good',
      consecutiveSkips: 0,
    };
    const { available, signals } = buildProgressEvidence(input);
    expect(available).toBe(true);
    expect(signals.length).toBe(3);
    // completion_rate, avg_difficulty (preferred), streak_days
    expect(signals[0].code).toBe('completion_rate_7d');
    expect(signals[1].code).toBe('avg_difficulty_7d');
    expect(signals[2].code).toBe('streak_days');
    // last_mood should NOT appear when avgDifficulty has samples
    expect(signals.some((s) => s.code === 'last_mood')).toBe(false);
  });

  test('mood fallback when avgDifficulty null and lastMood set', () => {
    const input = {
      completionRate: null,
      completedCount: 0,
      plannedCount: 0,
      avgDifficulty: null,
      difficultySampleCount: 0,
      streakDays: 0,
      lastMood: 'stressed',
      consecutiveSkips: 0,
    };
    const { available, signals } = buildProgressEvidence(input);
    expect(available).toBe(true);
    expect(signals.length).toBe(1);
    expect(signals[0].code).toBe('last_mood');
    expect(signals[0].summary).toBe('Last mood: stressed');
  });

  test('empty input returns available:false, signals:[]', () => {
    const { available, signals } = buildProgressEvidence(undefined);
    expect(available).toBe(false);
    expect(signals).toEqual([]);
  });

  test('input with null completionRate and zero defaults returns available:false', () => {
    const { available, signals } = buildProgressEvidence({
      completionRate: null,
      completedCount: 0,
      plannedCount: 0,
      avgDifficulty: null,
      difficultySampleCount: 0,
      streakDays: 0,
      lastMood: null,
      consecutiveSkips: 0,
    });
    expect(available).toBe(false);
    expect(signals).toEqual([]);
  });
});

describe('progress-evidence.formatProgressEvidence', () => {
  test('returns empty string when evidence unavailable', () => {
    expect(formatProgressEvidence(undefined)).toBe('');
    expect(formatProgressEvidence(null)).toBe('');
    expect(formatProgressEvidence({})).toBe('');
  });

  test('returns empty string when available is false', () => {
    expect(formatProgressEvidence({ available: false })).toBe('');
    expect(formatProgressEvidence({ available: false, signals: [] })).toBe('');
  });

  test('returns empty string when signals array is empty', () => {
    expect(formatProgressEvidence({ available: true, signals: [] })).toBe('');
  });

  test('returns bullet lines when available', () => {
    const evidence = {
      available: true,
      signals: [
        { code: 'completion_rate_7d', summary: 'Completion rate (7d): 75% (15/20 tasks)', window: '7d', count: 20 },
        { code: 'avg_difficulty_7d', summary: 'Average difficulty (7d): 3.5/5 (8 samples)', window: '7d', count: 8 },
      ],
    };
    const result = formatProgressEvidence(evidence);
    expect(result).toBe('- Completion rate (7d): 75% (15/20 tasks)\n- Average difficulty (7d): 3.5/5 (8 samples)');
  });
});

describe('progress-evidence.deriveCoachStrategy', () => {
  test('rule 1: consecutiveSkips >= 3', () => {
    const result = deriveCoachStrategy({
      completionRate: 0.5,
      completedCount: 10,
      plannedCount: 20,
      avgDifficulty: 3.0,
      difficultySampleCount: 5,
      streakDays: 1,
      lastMood: 'good',
      consecutiveSkips: 3,
    });
    expect(result.text).toBe('Kurangi beban dulu: pilih satu tugas paling ringan dan beri ruang pemulihan.');
    expect(result.source).toBe('rule_based');
  });

  test('rule 1: lastMood === drained', () => {
    const result = deriveCoachStrategy({
      completionRate: 0.8,
      completedCount: 18,
      plannedCount: 20,
      avgDifficulty: 2.0,
      difficultySampleCount: 5,
      streakDays: 3,
      lastMood: 'drained',
      consecutiveSkips: 0,
    });
    expect(result.text).toBe('Kurangi beban dulu: pilih satu tugas paling ringan dan beri ruang pemulihan.');
    expect(result.source).toBe('rule_based');
  });

  test('rule 1: lastMood === overwhelmed', () => {
    const result = deriveCoachStrategy({
      completionRate: 0.8,
      completedCount: 18,
      plannedCount: 20,
      avgDifficulty: 2.0,
      difficultySampleCount: 5,
      streakDays: 3,
      lastMood: 'overwhelmed',
      consecutiveSkips: 0,
    });
    expect(result.text).toBe('Kurangi beban dulu: pilih satu tugas paling ringan dan beri ruang pemulihan.');
    expect(result.source).toBe('rule_based');
  });

  test('rule 2: completionRate < 0.4', () => {
    const result = deriveCoachStrategy({
      completionRate: 0.35,
      completedCount: 7,
      plannedCount: 20,
      avgDifficulty: 2.0,
      difficultySampleCount: 5,
      streakDays: 1,
      lastMood: 'good',
      consecutiveSkips: 0,
    });
    expect(result.text).toBe('Mulai dari satu tugas singkat, lalu evaluasi kembali kapasitas belajarmu.');
    expect(result.source).toBe('rule_based');
  });

  test('rule 3: avgDifficulty > 4', () => {
    const result = deriveCoachStrategy({
      completionRate: 0.7,
      completedCount: 14,
      plannedCount: 20,
      avgDifficulty: 4.5,
      difficultySampleCount: 5,
      streakDays: 1,
      lastMood: 'good',
      consecutiveSkips: 0,
    });
    expect(result.text).toBe('Pecah tugas tersulit menjadi langkah lebih kecil dan tambahkan latihan dasar sebelum praktik.');
    expect(result.source).toBe('rule_based');
  });

  test('rule 4: avgDifficulty > 0 && < 1.5', () => {
    const result = deriveCoachStrategy({
      completionRate: 0.7,
      completedCount: 14,
      plannedCount: 20,
      avgDifficulty: 1.2,
      difficultySampleCount: 5,
      streakDays: 1,
      lastMood: 'good',
      consecutiveSkips: 0,
    });
    expect(result.text).toBe('Naikkan tantangan secara bertahap dengan variasi latihan yang lebih menantang.');
    expect(result.source).toBe('rule_based');
  });

  test('rule 5: completionRate >= 0.9 && streakDays >= 5', () => {
    const result = deriveCoachStrategy({
      completionRate: 0.95,
      completedCount: 19,
      plannedCount: 20,
      avgDifficulty: 2.0,
      difficultySampleCount: 5,
      streakDays: 5,
      lastMood: 'good',
      consecutiveSkips: 0,
    });
    expect(result.text).toBe('Konsistensi kuat. Pertahankan ritme dan tambah target mingguan sekitar 10%.');
    expect(result.source).toBe('rule_based');
  });

  test('rule 6: completionRate >= 0.7', () => {
    const result = deriveCoachStrategy({
      completionRate: 0.72,
      completedCount: 18,
      plannedCount: 25,
      avgDifficulty: 2.0,
      difficultySampleCount: 5,
      streakDays: 2,
      lastMood: 'good',
      consecutiveSkips: 0,
    });
    expect(result.text).toBe('Pertahankan ritme dan sesuaikan beban jika diperlukan.');
    expect(result.source).toBe('rule_based');
  });

  test('rule 7: default when no other rule matches', () => {
    const result = deriveCoachStrategy({
      completionRate: 0.5,
      completedCount: 10,
      plannedCount: 20,
      avgDifficulty: 3.0,
      difficultySampleCount: 5,
      streakDays: 2,
      lastMood: 'good',
      consecutiveSkips: 1,
    });
    expect(result.text).toBe('Jaga ritme belajar tetap stabil dan evaluasi beban secara berkala.');
    expect(result.source).toBe('rule_based');
  });

  test('returns null when hasData is false', () => {
    const result = deriveCoachStrategy({
      completionRate: null,
      completedCount: 0,
      plannedCount: 0,
      avgDifficulty: null,
      difficultySampleCount: 0,
      streakDays: 0,
      lastMood: null,
      consecutiveSkips: 0,
    });
    expect(result).toBeNull();
  });

  test('returns null when all data missing except completionRate null', () => {
    const result = deriveCoachStrategy({
      completionRate: null,
      completedCount: 0,
      plannedCount: 0,
      avgDifficulty: 2.0,
      difficultySampleCount: 0,
      streakDays: 0,
      lastMood: null,
      consecutiveSkips: 0,
    });
    expect(result).toBeNull();
  });
});