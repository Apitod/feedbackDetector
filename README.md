# 🎯 Customer Feedback Hub

Dashboard MVP untuk memantau, menganalisis, dan memvisualisasikan feedback pelanggan dari **Instagram, TikTok, Facebook, dan Google Maps** secara real-time — terintegrasi langsung dengan workflow **n8n**.

---

## 🚀 Cara Menjalankan

```bash
# Install dependencies
npm install

# Jalankan server development
npm run dev
```

Buka browser di: **http://localhost:3000**

---

## 📡 API Endpoints

### `GET /api/feedback`
Ambil semua data feedback.

**Query params opsional:**
| Parameter | Contoh | Keterangan |
|-----------|--------|------------|
| `source` | `instagram` | Filter berdasarkan platform |
| `sentiment` | `positif` | Filter sentimen |
| `limit` | `50` | Batasi jumlah hasil |

**Contoh:**
```
GET http://localhost:3000/api/feedback?source=instagram&sentiment=positif
```

---

### `POST /api/feedback`
Terima data feedback dari n8n. Mendukung **single object** atau **array** (batch).

**URL:** `http://localhost:3000/api/feedback`  
**Method:** `POST`  
**Content-Type:** `application/json`

**Body (single):**
```json
{
  "source": "instagram",
  "comment": "Wahana seru banget!",
  "date": "2025-03-08T10:00:00.000Z",
  "rating": null,
  "summary": "Pelanggan puas dengan pengalaman di wahana.",
  "sentiment": "positif"
}
```

**Body (batch / array):**
```json
[
  {
    "source": "google_maps",
    "comment": "Parkiran sempit banget.",
    "date": "2025-03-07T14:30:00.000Z",
    "rating": 2,
    "summary": "Keluhan infrastruktur parkir.",
    "sentiment": "negatif"
  },
  {
    "source": "tiktok",
    "comment": "Keren sih tempatnya!",
    "date": "2025-03-08T09:00:00.000Z",
    "rating": null,
    "summary": "",
    "sentiment": "positif"
  }
]
```

**Nilai valid untuk `source`:**
- `instagram` atau `ig`
- `tiktok`
- `facebook` atau `fb`
- `google_maps`, `gmaps`, atau `google maps`

**Nilai valid untuk `sentiment`:**
- `positif`
- `negatif`
- `netral`

> ⚠️ Jika `sentiment` tidak diisi, sistem akan **auto-detect** berdasarkan konten `summary`.

---

### `GET /api/feedback/stats`
Ambil statistik agregat (untuk stat cards & chart).

```json
{
  "success": true,
  "data": {
    "total": 42,
    "sentimentCount": { "positif": 25, "negatif": 10, "netral": 7 },
    "sourceCount": { "instagram": 15, "tiktok": 12, "facebook": 8, "google_maps": 7 },
    "dominantSentiment": "positif",
    "dominantSource": "instagram"
  }
}
```

---

## 🔗 Konfigurasi Node n8n

Tambahkan node **HTTP Request** di akhir workflow n8n (setelah AI Agent), dengan konfigurasi berikut:

### Node: `Kirim ke Dashboard`

```json
{
  "parameters": {
    "method": "POST",
    "url": "http://localhost:3000/api/feedback",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "{\n  \"source\": \"{{ $json.Source }}\",\n  \"comment\": \"{{ $json.Comment }}\",\n  \"date\": \"{{ $json.Date }}\",\n  \"rating\": \"{{ $json['Rating/Like'] }}\",\n  \"summary\": \"{{ $('AI Agent').item.json.output }}\",\n  \"sentiment\": \"\"\n}",
    "options": {
      "timeout": 10000
    }
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.3,
  "name": "Kirim ke Dashboard"
}
```

> 💡 **Tips:** Jika `summary` berisi teks analisis dari AI, sistem akan **otomatis mendeteksi sentiment**. Atau isi field `sentiment` manual dengan `positif` / `negatif` / `netral`.

### Posisi Node dalam Workflow

```
[Normalize + Union] → [Append row in sheet] → [AI Agent] → [Kirim ke Dashboard]
```

Atau jika ingin batch per-run AI (semua feedback sekaligus):

```
[AI Agent] → [Kirim ke Dashboard]
```

Gunakan expression ini untuk `summary` di node HTTP Request:
```
={{ $('AI Agent').item.json.output }}
```

---

## 🧪 Testing POST via cURL

```bash
# Test kirim satu feedback
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "source": "instagram",
    "comment": "Wahana seru banget! Pasti balik lagi.",
    "date": "2025-03-08T10:00:00.000Z",
    "rating": null,
    "summary": "Pelanggan sangat puas dan berencana kembali berkunjung.",
    "sentiment": "positif"
  }'
```

```bash
# Test batch (array)
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '[
    {"source":"google_maps","comment":"Bersih dan nyaman","rating":5,"sentiment":"positif"},
    {"source":"tiktok","comment":"Antrian panjang banget","rating":null,"sentiment":"negatif"}
  ]'
```

---

## 📁 Struktur Folder

```
src/
├── app/
│   ├── api/
│   │   └── feedback/
│   │       ├── route.ts          ← POST & GET endpoint utama
│   │       └── stats/
│   │           └── route.ts      ← GET statistik agregat
│   ├── globals.css               ← Design system & animasi
│   ├── layout.tsx                ← Root layout + font
│   └── page.tsx                  ← Dashboard utama
├── components/
│   ├── charts.tsx                ← Pie & Bar chart Recharts
│   └── ui-bits.tsx               ← Badge, filter, rating components
└── lib/
    └── store.ts                  ← In-memory store (ganti dengan DB untuk production)
```

---

## ⚙️ Production / Database

Untuk production, ganti `src/lib/store.ts` dengan salah satu:

| Opsi | Konfigurasi |
|------|-------------|
| **Supabase** | `npm install @supabase/supabase-js` + tambahkan `SUPABASE_URL` & `SUPABASE_KEY` di `.env` |
| **Prisma + PostgreSQL** | `npm install prisma @prisma/client` + `npx prisma init` |
| **MongoDB** | `npm install mongoose` + tambahkan `MONGODB_URI` di `.env` |

---

## 🎨 Fitur Dashboard

- ✅ **Stat Cards** — Total Feedback, Sentimen Dominan, Platform Terbanyak
- ✅ **Pie Chart** — Distribusi Sentimen (Positif/Negatif/Netral)
- ✅ **Bar Chart** — Distribusi Platform
- ✅ **Tabel Data** — Filter by source & sentiment, expand summary AI
- ✅ **Detail Modal** — Klik Detail untuk lihat full komentar & ringkasan AI
- ✅ **Auto-refresh** — Tombol LIVE/PAUSED, refresh otomatis setiap 30 detik
- ✅ **Bahasa Indonesia** — Seluruh UI dalam Bahasa Indonesia
