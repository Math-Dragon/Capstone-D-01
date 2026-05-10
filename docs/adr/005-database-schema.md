# ADR-005: Database Schema & Migration

## Status
Accepted

## Konteks
Aplikasi memerlukan database untuk menyimpan: user authentication, goals, tasks, progress tracking, AI recommendations, dan audit logs. Total 13 migration files (+ initial schema).

## Keputusan
### PostgreSQL dengan 11 Tabel Utama
| Tabel | Fungsi | Key Fields |
|-------|--------|------------|
| users | Auth + OAuth | email, password_hash (nullable utk OAuth), google_id, github_id |
| profiles | Preferensi belajar | timezone, preferred_time, weekly_target_hours, availability (jsonb) |
| goals | Target belajar | title, description, deadline, status |
| tasks | Tugas individual | goal_id, duration_estimate, planned_slot, status, source, task_type, rationale, feedback fields, skip_reason, personal_notes |
| ai_recommendations | Saran AI | input_context (jsonb), output (jsonb), status (pending/accepted/rejected) |
| progress_snapshots | Ringkasan mingguan | planned_hours, completed_hours, completion_rate, unique (user_id, week) |
| audit_logs | Jejak keputusan | action, recommendation_id, metadata (jsonb), session_id, involves_llm |
| refresh_tokens | JWT refresh | token_hash, expires_at |
| chat_messages | Riwayat coach | role, content, session_type, session_id, plan_snapshot_summary |
| student_metrics | Analitik real-time | streak_days, completion_rate_7d/3d, avg_difficulty, total_completed, total_skipped, consecutive_skips, last_mood, last_check_in, trigger_cooldowns (jsonb) |
| plan_snapshots | Sebelum/sesudah adaptasi | tasks_snapshot (jsonb), adaptation_type, trigger_id, plan_summary |

### Migration Tool
node-pg-migrate dengan up/down migration — 13 migrations total.

### DB CHECK Constraints
- tasks.planned_slot: morning | afternoon | evening
- tasks.source: manual | ai | coach (evolved via migration 0006)
- tasks.status: todo | in_progress | done | completed | skipped
- goals.status: active | completed | archived
- profiles.preferred_time: morning | afternoon | evening
- ai_recommendations.status: pending | accepted | rejected
- progress_snapshots: unique per (user_id, week)

### Application-Level Enums (Zod only)
- tasks.task_type: acquire | practice | recall | interleave | synthesize | review | assess | reflect
- tasks.duration_estimate: 10-90 menit (LLMTaskSchema), 25-90 (createTaskSchema) — aplikasi, bukan DB constraint
- Tidak ada CHECK constraint di DB untuk task_type/duration_estimate — fleksibel

## Alasan
1. **PostgreSQL**: Relasional, ACID, JSONB untuk semi-structured data
2. **node-pg-migrate**: Version-controlled, rollback support
3. **JSONB**: Fleksibel untuk data yang jarang di-query (availability, trigger_cooldowns, metadata)
4. **task_type tanpa DB constraint**: Task type bisa berubah tanpa migration
5. **duration_estimate di Zod**: AI bisa generate task 10 menit (LLMTaskSchema), user manual 25 menit (createTaskSchema)

## Konsekuensi
- Migration harus dijalankan sebelum aplikasi bisa digunakan
- Rollback migration perlu di-test
- task_type + duration_estimate divalidasi di Zod (bisa berbeda aturan antara AI vs user manual)
- feedback fields (difficulty, focus, notes, submitted_at) di tasks — perlu cleanup policy
- student_metrics punya trigger_cooldowns jsonb + partial index involves_llm di audit_logs
