# TC-008 - Acceptance Rate Saran AI

## Tujuan

TC-008 memastikan tingkat penerimaan saran AI dapat diukur dan terdokumentasi. Metrik ini membantu mengevaluasi apakah rekomendasi AI benar-benar berguna bagi user, bukan hanya berhasil dibuat secara teknis.

## Definisi Metrik

Acceptance rate dihitung dari task rekomendasi AI yang sudah diputuskan user:

```text
acceptance_rate = accepted_ai_tasks / (accepted_ai_tasks + rejected_ai_tasks)
```

Jika belum ada task yang diputuskan, nilai default adalah:

```text
0.00
```

## Data yang Diukur

| Metrik | Arti |
| --- | --- |
| `ai_tasks_suggested_total` | Total task yang pernah disarankan AI. |
| `ai_tasks_accepted_total` | Total task AI yang diterima user. |
| `ai_tasks_rejected_total` | Total task AI yang ditolak user. |
| `ai_tasks_pending_total` | Total task AI yang belum diputuskan. |
| `accept_rate` | Rasio task diterima dibanding task yang sudah diputuskan. |

## Implementasi di Project

Backend menghitung metrik dari tabel `ai_recommendations`, khususnya field `output.tasks[].status`.

Lokasi implementasi:

```text
server/src/repositories/ai-recommendation.repo.js
server/src/services/coach/dispatch.service.js
server/src/routes/coach.js
```

Endpoint observability:

```text
GET /api/coach/recommendations/metrics
```

UI observability menampilkan metrik ini di:

```text
client/src/features/coach/components/ObservabilityMetrics.jsx
client/src/features/coach/components/CoachObservability.jsx
```

## Contoh Perhitungan

Jika AI menyarankan 10 task, lalu user menerima 6 task dan menolak 2 task:

```text
accepted = 6
rejected = 2
pending = 2
acceptance_rate = 6 / (6 + 2) = 0.75
```

Task pending tidak masuk pembagi karena belum menjadi keputusan user.

## Cara Validasi Manual

1. Buka halaman Coach.
2. Generate rekomendasi rencana belajar.
3. Terima beberapa task dan tolak beberapa task.
4. Buka panel observability.
5. Pastikan `ai_tasks_accepted`, `ai_tasks_rejected`, dan `accept_rate` berubah sesuai keputusan user.

## Kesimpulan TC-008

TC-008 siap karena project sudah memiliki:

- data source untuk suggested, accepted, rejected, dan pending task AI,
- endpoint metrics untuk observability,
- UI yang menampilkan acceptance rate,
- dan dokumentasi rumus serta cara validasinya.
