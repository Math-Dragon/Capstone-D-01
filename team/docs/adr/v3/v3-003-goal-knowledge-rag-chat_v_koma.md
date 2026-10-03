# ADR v3-003 (Revisi): Coach Chatbot Grounded-Goal — Thread/Goal Binding, Chat Tanpa Mutasi Rencana, Knowledge

**Status:** Draft revisi v_koma  
**Versi:** v_koma  
**Tanggal:** 3 Oktober 2026  

## 1. Pendahuluan: Apa Itu Coach Chat?

**Coach Chat** adalah jalur chatbot yang dirancang khusus untuk *goal-oriented conversation*:

```mermaid
flowchart TD
    subgraph CHARACTERISTICS["Karakteristik Coach Chat"]
        C1["Grounding pada goal (thread-goal binding)"]
        C2["Tidak pernah memutasi rencana (no plan mutation)"]
        C3["Knowledge terdistilasi (personal knowledge R1)"]
        C4["Retrieval terkontrol (R2 bergerbang)"]
        C5["State perturn (klarifikasi berkurasi)"]
        C6["SSE streaming + fallback JSON"]
    end
```

## 2. Perbedaan Utama: Coach Chat vs LLM Chat Lainnya

### 2.1 Thread-Goal Binding (Immutable)

| Aspek | Coach Chat (code-v2) | Chat LLM Lainnya |
|-------|--------------------|-----------------|
| `goal_id` | Immutable pada thread | Bisa berubah/terdeteksi otomatis |
| `goal_id=null` | Mode umum (R0-only) | Biasanya otomatis bind ke goal terakhir |
| Fallback | Tidak ada auto-rebinding | Tidak ada isolasi goal |

```mermaid
flowchart LR
    subgraph COACH["Coach Chat Architecture"]
        CO1["Thread: {id, user_id, goal_id, status}"]
        CO2["goal_id immutable"]
        CO3["goal_id=null = R0-only"]
    end
    subgraph LLM["Chat LLM Lainnya"]
        L1["Session: {user_id, active_goal}"]
        L2["goal_id dapat berubah"]
    end
```

### 2.2 Tanpa Mutasi Rencana (No Plan Mutation)

**Coach Chat:**
- `ChatAnswerSchema` TIDAK punya field `plan`
- Semua perubahan rencana lewat HITL proposal

**Chat LLM Lainnya:**
- Bisa langsung menyimpan/mengubah rencana pengguna

```mermaid
sequenceDiagram
    participant U as User
    participant C as Coach Chat
    participant P as Plan-Bridge
    U->>C: "Saya mau ganti jadwal"
    C->>P: toProposal()
    P->>Human reviewer
```

### 2.3 Knowledge Pipeline yang Terpisah

```mermaid
flowchart TD
    subgraph COACH["Coach Chat Knowledge Pipeline"]
        CK1["Riwayat Goal"] --> CK2["Distilasi → Fact Card"]
        CK2 --> CK3["validate zod"]
        CK3 --> CK4["pii_scan"]
        CK4 --> CK5["embed (opsional R2)"]
        CK5 --> CK6["Vector Store (user:goal)"]
    end
    subgraph LLM["Chat LLM Lainnya"]
        LK1["Query"] --> LK2["External API"]
    end
```

## 3. Perbandingan dengan Implementasi di team/server (Produksi)

✅ **PERINGAT:** Implementasi di `team/server` TIDAK sepenuhnya mengikuti desain di atas. Perbedaan utama:

```mermaid
flowchart LR
    subgraph TEAM_SERVER["team/server (Produksi)"]
        TS1["Tanpa thread-goal binding"]
        TS2["Chat = R0 + Profile + Tasks"]
        TS3["Plan mutation OK"]
        TS4["JSON response (no SSE)"]
        TS5["Audit dengan payload"]
    end

    subgraph CODE_V2["Code-v2 / ADR v3-003 (PoC)"]
        V1["Thread-goal immutable binding"]
        V2["Knowledge: R0 + R1 + R2"]
        V3["No plan mutation (HITL)"]
        V4["SSE streaming + JSON fallback"]
        V5["Audit payload-free"]
    end
```

### 3.1 Thread-Goal Binding

| Aspek | code-v2 (ADR) | team/server |
|-------|--------------|-------------|
| `goal_id` di Thread | Immutable, bind sejak thread dibuat | Tidak ada konsep thread |
| `thread_id` di request | Ada | Tidak ada |
| `goal_id=null` | Mode R0-only | Menggunakan goal aktif sebagai fallback |

### 3.2 Plan Mutation

Di `dispatch.service.js` (baris 225-234), chat response **bisa** berisi `plan` dan langsung di-persist:
```javascript
if (validated.plan) {
  await responseFormatter.persistPlan(userId, validated.plan, goalId);
}
```

Ini **melanggar** prinsip "No Plan Mutation" yang ditulis di ADR.

### 3.3 Knowledge Pipeline

| Fitur | code-v2 (ADR) | team/server |
|-------|--------------|-------------|
| Fact Card distillation (R1) | Ada | Tidak ada |
| Semantic retrieval (R2) | Ada | Tidak ada |
| PII scan | Ada | Tidak ada |
| `user:goal` partition | Ada | Tidak ada |

Chat di `team/server` hanya menggunakan R0 saja.

## 4. Diagram Entitas Utama Coach Chat

```mermaid
erDiagram
    THREAD ||--o{ GOAL : "bound to"
    THREAD ||--o{ MESSAGE : "contains"
    GOAL ||--o{ FACT_CARD : "has distill"
    USER ||--o{ THREAD : "owns"
    
    THREAD { string id PK string user_id FK string goal_id FK }
    GOAL { string id PK string user_id FK }
    MESSAGE { string id PK string thread_id FK }
    FACT_CARD { string fact_id PK string partition_key }
```

## 5. Gerbang Acceptace Mode Real

| Kriteria | Target |
|----------|--------|
| A2 - A1 (fact-hit) | ≥ +0.5 |
| Biaya A2 | ≤ $0.002/turn |
| Latency A2 p95 | ≤ 800ms |
| PII Findings | 0 |

## 6. Revisi Summary

Perbedaan utama yang ditulis di diagram:

1. **Thread-Goal Binding**: Coach chat mengikat goal secara immutable pada thread, sedangkan chat biasa tidak.
2. **No Plan Mutation**: Coach chat tidak pernah memutasi rencana, semua perubahan lewat HITL.
3. **Knowledge Pipeline**: Coach chat memakai distilasi goal ke fact card + retrieval terkontrol, berbeda dengan knowledge ad-hoc.
4. **SSE Streaming**: Kontrak streaming terpisah dengan fallback JSON, bukan pengaruh dari kontrak biasa.
5. **Audit Tanpa Payload**: Tidak menyimpan teks mentah di audit, melindungi privasi.

---

**Catatan:** Dokumen ini masih dalam status draft (v_koma) dan perlu review oleh tim sebelum dipromosikan ke versi resmi. Divergensi antara code-v2 (PoC) dan `team/server` (produksi) harus diselaraskan dengan tim arsitekturnya.
