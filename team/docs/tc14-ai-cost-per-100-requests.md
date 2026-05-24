# TC-14 - Dokumentasi Biaya Request AI per 100 Request

## Tujuan

Dokumen ini menjawab kebutuhan TC-14: project harus memiliki estimasi biaya request AI per 100 request agar penggunaan AI dapat dipantau sejak tahap MVP dan tidak berubah menjadi biaya produksi yang tidak terkontrol.

## Model yang Digunakan

Project memakai Google Gemini sebagai provider utama. Konfigurasi default backend:

```text
GEMINI_MODEL=gemini-2.5-flash-lite
```

Fallback paid di backend juga tersedia melalui:

```text
GEMINI_PAID_MODEL=gemini-3.1-flash-lite
```

Estimasi TC-14 di bawah memakai model utama `gemini-2.5-flash-lite` karena model ini adalah default project dan paling relevan untuk MVP submission.

## Sumber Pricing

Sumber resmi:

```text
https://ai.google.dev/gemini-api/docs/pricing
```

Tanggal pengecekan:

```text
2026-05-24
```

Harga paid tier Gemini 2.5 Flash-Lite Standard:

| Komponen | Harga |
| --- | ---: |
| Input text, image, video | USD 0.10 per 1.000.000 token |
| Output, termasuk thinking tokens | USD 0.40 per 1.000.000 token |

Catatan: jika request masih memakai free tier dan kuota belum habis, biaya aktual dapat tetap USD 0. Estimasi ini dipakai untuk skenario paid tier atau ketika project naik ke production-like usage.

## Rumus Estimasi

```text
biaya_input = total_input_tokens / 1.000.000 * 0.10
biaya_output = total_output_tokens / 1.000.000 * 0.40
total_biaya = biaya_input + biaya_output
```

Untuk 100 request:

```text
total_input_tokens = input_tokens_per_request * 100
total_output_tokens = output_tokens_per_request * 100
```

## Estimasi per 100 Request

| Skenario | Asumsi per request | Total 100 request | Estimasi biaya |
| --- | --- | --- | ---: |
| Ringan | 1.000 input token + 500 output token | 100.000 input + 50.000 output | USD 0.030 |
| Sedang | 2.000 input token + 1.000 output token | 200.000 input + 100.000 output | USD 0.060 |
| Berat | 3.000 input token + 1.500 output token | 300.000 input + 150.000 output | USD 0.090 |

Perhitungan skenario sedang:

```text
input  = 200.000 / 1.000.000 * 0.10 = USD 0.020
output = 100.000 / 1.000.000 * 0.40 = USD 0.040
total  = USD 0.060
```

## Batasan Estimasi

- Biaya aktual bergantung pada jumlah token prompt, konteks user, data task/goal yang dikirim, response AI, dan thinking tokens.
- Fitur dengan konteks panjang seperti rekomendasi plan dari banyak goal/task akan lebih mahal daripada chat pendek.
- Tool tambahan seperti grounding/search dapat memiliki biaya terpisah jika diaktifkan.
- Pricing provider dapat berubah, jadi angka ini perlu dicek ulang sebelum production release.

## Kontrol Biaya di Project

Project sudah punya beberapa mekanisme untuk mengurangi risiko biaya berlebih:

| Kontrol | Dampak |
| --- | --- |
| Human-in-the-loop | Saran AI tidak otomatis dieksekusi tanpa keputusan user. |
| Static coach action | Aksi sederhana seperti complete/skip task tidak selalu perlu LLM call. |
| Rate limiting AI | Endpoint `/api/ai/*` dibatasi agar tidak mudah dipakai berlebihan. |
| Fallback handling | Saat provider error/quota habis, sistem memberi response jelas tanpa membuat data setengah jadi. |
| Secret scanning | API key tidak boleh bocor ke repository. |

## Kesimpulan TC-14

TC-14 dinyatakan siap karena project sudah memiliki:

- model AI yang terdokumentasi,
- sumber pricing resmi,
- rumus estimasi biaya,
- contoh biaya per 100 request,
- catatan batasan biaya aktual,
- dan kontrol teknis untuk menekan penggunaan AI yang tidak perlu.
