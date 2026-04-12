# Node n8n: Webhook Trigger Utama + Jalur Offline

Paste JSON di bawah ini ke canvas n8n (`Ctrl+V`) untuk menambahkan **3 node baru** sebagai trigger utama.

## Cara Kerja Baru

```
[Next.js Button "Mulai Menganalisis"]
          ↓  POST /api/trigger-analysis
[Next.js API Route]
          ↓  POST ke n8n webhook
[Webhook Trigger Utama]  ← pengganti Manual Trigger
     ↓                ↓
[Respond OK]  [Extract Offline From Trigger]
                        ↓
              [Merge1 input ke-5]
     
Paralel dari Webhook Trigger Utama:
  TikTok Search → IG Search → Extract URLs → scraping semua → Merge1
  Google Maps → Merge1
  FB Comments → Merge1
  
Merge1 → Normalize+Union1 → AI Agent1 → kirim ke web
```

---

## LANGKAH 1 — Paste Node Ini ke n8n

Copy seluruh JSON → buka n8n → klik area canvas kosong → `Ctrl+V`:

```json
[
  {
    "parameters": {
      "httpMethod": "POST",
      "path": "start-analysis",
      "responseMode": "responseNode",
      "options": {}
    },
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 2,
    "position": [-2064, 1952],
    "id": "d1e2f3a4-b5c6-7890-defa-bc1234567890",
    "name": "Webhook Trigger Utama",
    "webhookId": "start-analysis-rsud-daya"
  },
  {
    "parameters": {
      "respondWith": "json",
      "responseBody": "={ \"success\": true, \"message\": \"Workflow dimulai, analisis sedang berjalan\" }",
      "options": {}
    },
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1,
    "position": [-1760, 2160],
    "id": "e2f3a4b5-c6d7-8901-efab-cd2345678901",
    "name": "Respond Trigger OK"
  },
  {
    "parameters": {
      "jsCode": "const output = [];\n\nfor (const item of items) {\n  const d = item.json;\n\n  const rawOffline = d.offlineData || (d.body && d.body.offlineData) || [];\n\n  if (!Array.isArray(rawOffline) || rawOffline.length === 0) {\n    return [{ json: { _skipOffline: true } }];\n  }\n\n  for (const row of rawOffline) {\n    const keluhan = row.isiKeluhan || row.comment || row.text || '';\n    if (!keluhan.trim()) continue;\n    output.push({\n      json: {\n        source: 'offline_rs',\n        comment: keluhan.trim(),\n        rating: null,\n        date: row.tanggal || row.date || new Date().toISOString(),\n        user: row.namaPetugas || row.nama || 'Petugas RS'\n      }\n    });\n  }\n}\n\nif (output.length === 0) {\n  return [{ json: { _skipOffline: true } }];\n}\n\nreturn output;"
    },
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [-1760, 1952],
    "id": "f3a4b5c6-d7e8-9012-fabc-de3456789012",
    "name": "Extract Offline From Trigger"
  }
]
```

---

## LANGKAH 2 — Sambungkan Node

| Dari | Ke | Input Index |
|---|---|---|
| **Webhook Trigger Utama** | **Respond Trigger OK** | 0 |
| **Webhook Trigger Utama** | **Extract Offline From Trigger** | 0 |
| **Webhook Trigger Utama** | **TikTok Search APIFY1** | 0 |
| **Extract Offline From Trigger** | **Merge1** | 4 |

> Hapus koneksi dari node `Manual Trigger` lama ke `TikTok Search APIFY1`.

---

## LANGKAH 3 — Update Normalize + Union1

Tambahkan 1 baris di awal loop untuk skip placeholder:

```javascript
const output = [];

for (const item of items) {
  const d = item.json;

  // TAMBAHKAN INI: skip placeholder jika tidak ada data offline
  if (d._skipOffline) continue;

  // Tangkap data Offline RS agar langsung lewat tanpa terfilter
  if (d.source === 'offline_rs') {
    output.push({ json: d });
    continue;
  }

  // ... (sisa kode existing tetap sama)
```

---

## LANGKAH 4 — Update .env.local

```env
N8N_TRIGGER_WEBHOOK_URL=https://hyperthermal-admirative-luella.ngrok-free.dev/webhook/start-analysis
```

---

## Catatan

- **Webhook Offline Feedback** (node lama) boleh tetap ada untuk jalur upload mandiri.
- **Webhook Trigger Utama** adalah trigger BARU yang menjalankan seluruh workflow sekaligus (scraping online + data offline).
- Pastikan workflow sudah **Active** di n8n agar webhook URL bisa menerima request dari production.
