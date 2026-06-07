# Work Scope 2 - AI Feature & Validation

Dokumen ini memetakan TC-007 sampai TC-010 ke implementasi StepUp AI Learn.

## Ringkasan

| TC | Kebutuhan | Status | Bukti |
| --- | --- | --- | --- |
| TC-007 | Rationale AI ditampilkan menggunakan komponen `RationaleDisplay`. | Selesai | `client/src/components/RationaleDisplay.jsx` dipakai di proposal, task card, task detail, dan coach recommendation. |
| TC-008 | Acceptance rate saran AI diukur dan terdokumentasi. | Selesai | `docs/ai-acceptance-rate.md`, endpoint `GET /api/coach/recommendations/metrics`, UI observability. |
| TC-009 | Unit tests untuk AI output validation tersedia. | Selesai | `server/tests/unit/llm.test.js` memvalidasi JSON, schema, duration, slot, rationale, tanggal, dan summary. |
| TC-010 | Integration tests untuk alur AI suggest -> accept -> calendar tersedia. | Selesai | `scripts/run-e2e-core-flow.js` skenario `E2E-07`. |

## TC-007 - RationaleDisplay

Rationale AI sekarang ditampilkan melalui komponen reusable:

```text
client/src/components/RationaleDisplay.jsx
```

Komponen ini digunakan oleh:

```text
client/src/components/ProposalOverlay.jsx
client/src/components/TaskCard.jsx
client/src/components/TaskDetailModal.jsx
client/src/features/coach/components/CoachPage.jsx
```

Validasi:

```powershell
cd client
npm test -- --run tests/components/RationaleDisplay.test.jsx tests/components/ProposalOverlay.test.jsx tests/components/TaskCard.test.jsx
```

## TC-008 - Acceptance Rate

Acceptance rate terdokumentasi di:

```text
docs/ai-acceptance-rate.md
```

Rumus:

```text
acceptance_rate = accepted_ai_tasks / (accepted_ai_tasks + rejected_ai_tasks)
```

Task pending tidak masuk pembagi karena belum menjadi keputusan user.

## TC-009 - AI Output Validation

Unit test validasi output AI mencakup:

- JSON tidak valid,
- schema salah,
- tasks kosong,
- field task hilang,
- summary kosong,
- duration tidak valid,
- planned slot tidak valid,
- rationale kosong,
- planned date mustahil.

Validasi:

```powershell
cd server
npm test -- --runTestsByPath tests/unit/llm.test.js
```

## TC-010 - AI Suggest -> Accept -> Calendar

Runner E2E sekarang memiliki skenario:

```text
E2E-07 - AI suggest -> accept -> calendar
```

Skenario ini:

1. Memanggil `/api/ai/plan/suggest`.
2. Menerima recommendation melalui `/api/ai/recommendations/:id/accept`.
3. Membaca `/api/tasks`.
4. Memastikan task hasil AI muncul dengan `planned_date` dan `planned_slot` yang sama.

Untuk hasil deterministik, jalankan backend dengan provider mock:

```powershell
$env:LLM_PROVIDER="mock"
node scripts/run-e2e-core-flow.js
```
