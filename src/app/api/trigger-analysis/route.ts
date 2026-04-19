// app/api/trigger-analysis/route.ts
// Endpoint yang menjadi "tombol mulai" untuk memicu workflow n8n secara manual.
// Mengirimkan data offline (bisa kosong []) ke webhook Internal Feedback n8n.
// Webhook n8n: /start-internal-feedback

import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
};

// URL Webhook n8n Internal Feedback.
const N8N_TRIGGER_WEBHOOK_URL =
    process.env.N8N_INTERNAL_WEBHOOK_URL ||
    process.env.N8N_TRIGGER_WEBHOOK_URL ||
    "https://hyperthermal-admirative-luella.ngrok-free.dev/webhook/start-internal-feedback";

// ─── POST: Trigger n8n workflow + kirim data offline ─────────────────────────
// Expected body: Array<{ namaPetugas, isiKeluhan, tanggal }> — boleh kosong []
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Terima array data offline (kosong pun tidak masalah)
        const offlineData = Array.isArray(body) ? body : [];

        // ─── Simpan ke store: full-refresh offline_rs ────────────────────────────
        // Hapus SEMUA data offline_rs lama terlebih dahulu agar re-upload CSV
        // yang sudah diperbaiki selalu menggantikan data lama/salah di store.
        if (global.feedbackStore && offlineData.length > 0) {
            global.feedbackStore = global.feedbackStore.filter(
                (f) => f.source !== "offline_rs"
            );

            for (const row of offlineData) {
                const rawKeluhan = row.isiKeluhan || row.ulasan || row.comment || "";
                if (!String(rawKeluhan).trim()) continue;

                // Map prioritasManual → triage badge
                const prioritasLower = (row.prioritasManual || row.prioritas || "").toLowerCase();
                const triage =
                    prioritasLower === "merah" ? "merah" :
                    prioritasLower === "kuning" ? "kuning" : "hijau";

                global.feedbackStore.push({
                    id: `fb-off-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    source: "offline_rs",
                    kanal: row.kanal || undefined,          // e.g. "Telp/SMS/WA", "Barcode Pengaduan"
                    comment: String(rawKeluhan).trim(),
                    date: row.tanggal || new Date().toISOString(),
                    rating: null,
                    sentiment: "netral",
                    triage,
                    createdAt: new Date().toISOString(),
                    kategori: row.kategori || "-",
                    prioritasManual: row.prioritasManual || row.prioritas || "-",
                    actionNeeds: row.actionNeeds || "-",
                });
            }
        }

        console.log(
            `[POST /api/trigger-analysis] Memicu n8n dengan ${offlineData.length} data offline.`
        );

        // ─── Kirim ke n8n Webhook ─────────────────────────────────────────────
        let n8nResponse: Response;
        try {
            n8nResponse = await fetch(N8N_TRIGGER_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    triggeredAt: new Date().toISOString(),
                    offlineData,
                    offlineDataCount: offlineData.length,
                }),
                signal: AbortSignal.timeout(30000),
            });
        } catch (fetchErr) {
            console.error("[POST /api/trigger-analysis] Gagal terhubung ke n8n:", fetchErr);
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Gagal terhubung ke n8n. Pastikan URL webhook sudah benar dan n8n aktif.",
                    detail: String(fetchErr),
                },
                { status: 502, headers: CORS_HEADERS }
            );
        }

        const n8nText = await n8nResponse.text();
        console.log(
            `[POST /api/trigger-analysis] n8n responded ${n8nResponse.status}: ${n8nText.slice(0, 200)}`
        );

        if (!n8nResponse.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: `n8n menolak request dengan status ${n8nResponse.status}.`,
                    n8nResponse: n8nText,
                },
                { status: 502, headers: CORS_HEADERS }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: `Analisis dimulai! n8n sedang memproses${offlineData.length > 0 ? ` ${offlineData.length} data offline +` : ""} data online.`,
                offlineDataCount: offlineData.length,
            },
            { status: 200, headers: CORS_HEADERS }
        );
    } catch (err) {
        console.error("[POST /api/trigger-analysis]", err);
        return NextResponse.json(
            { success: false, message: "Format data tidak valid atau terjadi kesalahan server." },
            { status: 400, headers: CORS_HEADERS }
        );
    }
}

// ─── OPTIONS: CORS preflight ──────────────────────────────────────────────────
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}
