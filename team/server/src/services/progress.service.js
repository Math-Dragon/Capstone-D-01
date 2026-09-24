const repos = require('../repositories');
const { deriveCoachStrategy } = require('./progress-evidence.service');

const MOOD_LABELS = {
  great: 'Sangat baik',
  good: 'Baik',
  okay: 'Biasa saja',
  struggling: 'Berat',
  overwhelmed: 'Kewalahan',
  drained: 'Kehabisan energi',
};

const TASK_TYPE_LABELS = {
  acquire: 'Belajar materi', practice: 'Latihan', recall: 'Mengingat kembali',
  interleave: 'Latihan campuran', synthesize: 'Merangkum', review: 'Mengulas',
  assess: 'Evaluasi', reflect: 'Refleksi', other: 'Lainnya',
};

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function iso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function dateKey(value, timezone) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))) {
    if (value.length === 10) return value;
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(value));
}

function shiftDate(key, amount) {
  const date = new Date(`${key}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function dateBuckets(from, to) {
  const result = [];
  for (let current = from; current <= to; current = shiftDate(current, 1)) result.push(current);
  return result;
}

function encodeCursor(row) {
  return Buffer.from(JSON.stringify({ created_at: iso(row.created_at), id: row.id })).toString('base64url');
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!parsed.id || !parsed.created_at || Number.isNaN(Date.parse(parsed.created_at))) throw new Error();
    return { id: parsed.id, createdAt: parsed.created_at };
  } catch {
    throw httpError(400, 'VALIDATION_ERROR', 'Cursor riwayat tidak valid.');
  }
}

function detailView(event) {
  return {
    id: event.id,
    event_type: event.event_type,
    occurred_at: iso(event.created_at),
    mood: event.mood ? { value: event.mood, label: MOOD_LABELS[event.mood] } : null,
    note: event.note,
    source: event.source,
    context: event.metadata || {},
    linked_task: event.linked_task || null,
    linked_goal: event.linked_goal || null,
    correction: {
      is_corrected: event.correction_count > 0,
      corrected_at: iso(event.corrected_at),
      count: event.correction_count,
    },
    version: event.version,
  };
}

class ProgressService {
  async createEvent(userId, payload) {
    const result = await repos.checkInEvent.create({
      user_id: userId,
      client_event_id: payload.client_event_id,
      event_type: payload.event_type,
      mood: payload.mood,
      note: payload.note,
      source: payload.source,
      client_timestamp: payload.client_timestamp,
      app_version: payload.app_version,
      metadata: payload.context,
    });
    return {
      data: {
        id: result.event.id,
        event_type: result.event.event_type,
        created_at: iso(result.event.created_at),
      },
      replayed: result.replayed,
    };
  }

  async getHistory(userId, query) {
    const rows = await repos.checkInEvent.listByUser(userId, {
      filter: query.filter,
      limit: query.limit,
      cursor: decodeCursor(query.cursor),
    });
    const hasMore = rows.length > query.limit;
    const pageRows = rows.slice(0, query.limit);
    return {
      items: pageRows.map((event) => ({
        id: event.id,
        event_type: event.event_type,
        occurred_at: iso(event.created_at),
        mood: event.mood ? { value: event.mood, label: MOOD_LABELS[event.mood] } : null,
        summary: event.event_type === 'skipped'
          ? 'Check-in dilewati'
          : event.event_type === 'checkout_submitted' ? 'Refleksi setelah belajar' : 'Check-in belajar',
        source: event.source,
        is_corrected: event.correction_count > 0,
        linked_task: event.linked_task || null,
        linked_goal: event.linked_goal || null,
        actions: { can_view: true, can_correct: event.event_type !== 'skipped', can_delete: true },
      })),
      page: {
        next_cursor: hasMore && pageRows.length ? encodeCursor(pageRows[pageRows.length - 1]) : null,
        has_more: hasMore,
      },
    };
  }

  async getHistoryDetail(userId, id) {
    const event = await repos.checkInEvent.findOwnedById(userId, id);
    if (!event) throw httpError(404, 'NOT_FOUND', 'Riwayat tidak ditemukan.');
    return detailView(event);
  }

  async correctHistory(userId, id, payload) {
    const current = await repos.checkInEvent.findOwnedById(userId, id);
    if (!current) throw httpError(404, 'NOT_FOUND', 'Riwayat tidak ditemukan.');
    if (current.event_type === 'skipped') {
      throw httpError(400, 'VALIDATION_ERROR', 'Event yang dilewati tidak dapat dikoreksi.');
    }
    // reason_code is audit-only; the repo takes the fields plus the integer version guard.
    const updated = await repos.checkInEvent.correct(userId, id, {
      mood: payload.mood, note: payload.note, version: payload.version,
    });
    if (!updated) throw httpError(409, 'CONFLICT', 'Riwayat telah berubah. Muat ulang sebelum mengoreksi.');
    await repos.audit.create({
      user_id: userId,
      action: 'CHECK_IN_EVENT_CORRECTED',
      metadata: { event_id: id, fields: ['mood', 'note'].filter((key) => payload[key] !== undefined), reason_code: payload.reason_code },
      involves_llm: false,
    });
    return this.getHistoryDetail(userId, id);
  }

  async deleteHistory(userId, id) {
    const deleted = await repos.checkInEvent.remove(userId, id);
    if (!deleted) throw httpError(404, 'NOT_FOUND', 'Riwayat tidak ditemukan.');
    await repos.audit.create({
      user_id: userId,
      action: 'CHECK_IN_EVENT_DELETED',
      metadata: { event_id: id, event_type: deleted.event_type },
      involves_llm: false,
    });
    return { id, deleted: true };
  }

  async getOverview(userId, periodKey, now = new Date()) {
    const [profile, tasks, metrics] = await Promise.all([
      repos.profile.findByUserId(userId),
      repos.task.listByUser(userId, { limit: 0 }),
      repos.studentMetrics.findByUserId(userId),
    ]);
    const timezone = profile?.timezone || 'Asia/Jakarta';
    const today = dateKey(now, timezone);
    const earliest = tasks.map((task) => dateKey(task.planned_date || task.created_at, timezone)).filter(Boolean).sort()[0];
    const from = periodKey === '7d' ? shiftDate(today, -6)
      : periodKey === '30d' ? shiftDate(today, -29) : earliest || today;
    const scoped = tasks.filter((task) => {
      const key = dateKey(task.planned_date, timezone);
      return key && key >= from && key <= today;
    });
    // Completions are defined by completed_at-in-period (not scoped-planned):
    // a completion with no in-period completed_at would count in the headline
    // but land in no activity bucket. Late completions from earlier plans can
    // therefore push the ratio above 1; completion_rate is "completions in
    // period ÷ tasks planned in period".
    const completed = tasks.filter((task) => {
      if (!['done', 'completed'].includes(task.status)) return false;
      const key = dateKey(task.completed_at, timezone);
      return key !== null && key >= from && key <= today;
    });
    const totalMinutes = scoped.reduce((sum, task) => sum + (task.duration_estimate || 0), 0);
    const completedMinutes = completed.reduce((sum, task) => sum + (task.actual_duration || task.duration_estimate || 0), 0);
    const difficulty = scoped.filter((task) => task.feedback_difficulty != null).map((task) => Number(task.feedback_difficulty));
    const completionRate = scoped.length ? completed.length / scoped.length : 0;
    const completedCount = completed.length;
    const plannedCount = scoped.length;
    const avgDifficulty = difficulty.length ? difficulty.reduce((a, b) => a + b, 0) / difficulty.length : null;
    const difficultySampleCount = difficulty.length;
    const streakDays = metrics?.streak_days || 0;
    const lastMood = metrics?.last_mood || null;
    const consecutiveSkips = metrics?.consecutive_skips || 0;
    const buckets = dateBuckets(from, today).map((key) => ({
      from: key,
      to: key,
      completed_tasks: completed.filter((task) => dateKey(task.completed_at, timezone) === key).length,
      completed_minutes: completed.filter((task) => dateKey(task.completed_at, timezone) === key)
        .reduce((sum, task) => sum + (task.actual_duration || task.duration_estimate || 0), 0),
    }));
    const distributionMap = new Map();
    for (const task of scoped) {
      const key = task.task_type || 'other';
      const item = distributionMap.get(key) || { key, label: TASK_TYPE_LABELS[key] || key, count: 0, completed_count: 0 };
      item.count += 1;
      if (['done', 'completed'].includes(task.status)) item.completed_count += 1;
      distributionMap.set(key, item);
    }
    const nextDay = shiftDate(today, 1);
    const signalCount = await repos.checkInEvent.countByUser(userId, {
      from, to: nextDay, timezone,
    });
    const insight = scoped.length === 0 ? null : completionRate >= 0.7
      ? { code: 'momentum_positive', tone: 'positive', text: 'Penyelesaian tugasmu berjalan baik pada periode ini.' }
      : completionRate >= 0.4
        ? { code: 'momentum_stable', tone: 'neutral', text: 'Pola belajarmu masih stabil pada periode ini.' }
        : { code: 'momentum_needs_attention', tone: 'supportive', text: 'Beberapa tugas masih terbuka. Pilih langkah kecil yang paling memungkinkan untuk dilanjutkan.' };

    return {
      generated_at: now.toISOString(),
      timezone,
      period: { key: periodKey, from, to: today, bucket: 'day' },
      insight,
      health: {
        progress_percent: Math.min(100, Math.round(completionRate * 100)),
        completed_tasks: completed.length,
        total_tasks: scoped.length,
        completed_minutes: completedMinutes,
        planned_minutes: totalMinutes,
        completion_rate: completionRate,
        average_difficulty: difficulty.length ? difficulty.reduce((a, b) => a + b, 0) / difficulty.length : null,
        difficulty_sample_count: difficulty.length,
      },
      activity: buckets,
      distribution: { dimension: 'task_type', items: [...distributionMap.values()] },
      evidence: { available: signalCount > 0, signal_count: signalCount },
      coach_strategy: scoped.length ? deriveCoachStrategy({
        completionRate,
        completedCount,
        plannedCount,
        avgDifficulty,
        difficultySampleCount,
        streakDays,
        lastMood,
        consecutiveSkips,
      }) : null,
      pending_proposal: null,
    };
  }

  async getStats(userId) {
    const tasks = await repos.task.listByUser(userId);
    const completed = tasks.filter((t) => t.status === 'done' || t.status === 'completed');
    const total = tasks.length;
    const totalMin = tasks.reduce((s, t) => s + (t.duration_estimate || 0), 0);
    const completedMin = completed.reduce((s, t) => s + (t.duration_estimate || 0), 0);

    const difficultyValues = tasks
      .filter((t) => t.feedback_difficulty != null)
      .map((t) => t.feedback_difficulty);
    const avgDifficulty = difficultyValues.length > 0
      ? difficultyValues.reduce((a, b) => a + b, 0) / difficultyValues.length
      : null;

    const metrics = await repos.studentMetrics.findByUserId(userId);

    return {
      totalTasks: total,
      completedTasks: completed.length,
      totalMinutes: totalMin,
      completedMinutes: completedMin,
      completionRate: total > 0 ? completed.length / total : 0,
      avgDifficulty,
      streakDays: metrics?.streak_days || 0,
      summary: null,
      adaptationNotes: metrics?.last_mood || null,
    };
  }

  async getWeekly(userId, week) {
    return repos.progress.findByUserAndWeek(userId, week);
  }

  async getTrend(userId, params = {}) {
    return repos.progress.listTrend(userId, params);
  }
}

module.exports = new ProgressService();
