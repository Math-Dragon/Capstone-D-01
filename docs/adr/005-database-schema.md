# ADR-005: Database Schema & Migration

## Status
Accepted

## Konteks
Aplikasi memerlukan database untuk menyimpan: user authentication, goals, tasks, progress tracking, AI recommendations, dan audit logs. Perlu menyeimbangkan kompleksitas schema dengan kebutuhan fleksibilitas.

## Keputusan
### PostgreSQL dengan 11 Tabel Utama
| Tabel | Fungsi | Key Fields |
|-------|--------|------------|
| users | Auth + OAuth | email, password_hash, google_id, github_id |
| profiles | Preferensi belajar | timezone, preferred_time, weekly_target_hours, availability (jsonb) |
| goals | Target belajar | title, description, deadline, status |
| tasks | Tugas individual | goal_id, duration_estimate, planned_slot, status, source, task_type, rationale |
| ai_recommendations | Saran AI | input_context (jsonb), output (jsonb), status |
| progress_snapshots | Ringkasan mingguan | planned_hours, completed_hours, completion_rate |
| audit_logs | Jejak keputusan | action, recommendation_id, metadata (jsonb) |
| refresh_tokens | JWT refresh | token_hash, expires_at |
| chat_messages | Riwayat coach | role, content, session_type, session_id |
| student_metrics | Analitik real-time | streak_days, completion_rate_7d, avg_difficulty |
| plan_snapshots | Sebelum/sesudah adaptasi | tasks_snapshot (jsonb), adaptation_type |

### Migration Tool
node-pg-migrate dengan up/down migration untuk version-controlled schema changes.

### Key Constraints
- tasks.duration_estimate: 25-90 menit
- tasks.planned_slot: morning | afternoon | evening
- tasks.source: manual | ai | coach
- goals.status: active | completed | archived
- progress_snapshots: unique per (user_id, week)

### Application-Level Enums (Zod only)
- tasks.task_type: acquire | practice | recall | interleave | synthesize | review | assess | reflect
- Tidak ada CHECK constraint di DB untuk task_type — fleksibel untuk perubahan

## Alasan
1. **PostgreSQL**: Relasional, ACID, JSONB untuk semi-structured data (availability, metadata)
2. **node-pg-migrate**: Version-controlled, rollback support, familiar dari kelas Dicoding
3. **JSONB**: Fleksibel untuk data yang jarang di-query (availability, metadata)
4. **task_type tanpa DB constraint**: Task type bisa berubah tanpa migration
5. **Unique constraint (user_id, week)**: Mencegah duplicate progress snapshots

## Konsekuensi
- Migration harus dijalankan sebelum aplikasi bisa digunakan
- Rollback migration perlu di-test
- task_type perlu divalidasi di aplikasi (Zod)
- Index diperlukan untuk query performance (user_id, planned_date, goal_id)
