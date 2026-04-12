# Cara Menambahkan Node Baru ke n8n

1. Copy semua kode JSON di dalam blok kode di bawah ini.
2. Buka workflow n8n kamu.
3. Klik sembarang di area canvas (layar kosong).
4. Tekan `Ctrl + V` (Windows) atau `Cmd + V` (Mac) untuk mem-paste.
5. 3 Node baru akan muncul.
6. Tarik garis (koneksi) dari node **"Normalize Offline Data"** ke node **"Normalize + Union"** yang sudah ada di workflow kamu.
7. Tarik garis dari node **"Webhook Offline Feedback"** ke node **"Respond to Webhook"**.
8. Tarik garis dari node **"Webhook Offline Feedback"** ke node **"Normalize Offline Data"**.
9. Jangan lupa klik **Save** di n8n, lalu pastikan workflow kamu sudah **Active**.

> **Note:** Setelah di-paste, kamu bisa copy "Test URL" atau "Production URL" dari node "Webhook Offline Feedback" dan masukkan ke dalam file `.env.local` di project Next.js kamu.

```json
[
  {
    "parameters": {
      "httpMethod": "POST",
      "path": "offline-feedback",
      "responseMode": "responseNode",
      "options": {}
    },
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 2,
    "position": [-2992, 480],
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Webhook Offline Feedback",
    "webhookId": "offline-feedback-rsud-daya"
  },
  {
    "parameters": {
      "respondWith": "json",
      "responseBody": "={\n  \"success\": true,\n  \"message\": \"Data diterima, sedang diproses oleh AI Agent\"\n}"
    },
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1,
    "position": [-2592, 640],
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "name": "Respond to Webhook"
  },
  {
    "parameters": {
      "jsCode": "const output = [];\n\nfor (const item of items) {\n  const d = item.json;\n\n  // Support array in body or direct items\n  const rows = Array.isArray(d) ? d\n    : (d.body ? (Array.isArray(d.body) ? d.body : [d.body]) : [d]);\n\n  for (const row of rows) {\n    const keluhan = row.isiKeluhan || row.comment || row.text || '';\n    if (!keluhan.trim()) continue;\n\n    output.push({\n      json: {\n        source: 'offline_rs',\n        comment: keluhan.trim(),\n        rating: null,\n        date: row.tanggal || row.date || new Date().toISOString(),\n        user: row.namaPetugas || row.nama || 'Petugas RS'\n      }\n    });\n  }\n}\n\nreturn output;"
    },
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [-2592, 480],
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "name": "Normalize Offline Data"
  }
]
```
