// app/api/feedback/offline/route.ts
// Endpoint untuk menerima data feedback offline (dari upload CSV di dashboard)
// dan meneruskannya ke n8n Webhook agar bisa digabung dengan data online.

import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
};

// URL Webhook n8n yang akan menerima data offline.
// Ganti dengan URL webhook aktual dari n8n kamu.
const N8N_OFFLINE_WEBHOOK_URL =
    process.env.N8N_OFFLINE_WEBHOOK_URL ||
    "https://hyperthermal-admirative-luella.ngrok-free.dev/webhook/offline-feedback";

// ─── Tipe data yang diterima dari frontend ────────────────────────────────────
interface OfflineFeedbackRow {
    namaPetugas: string;   // Nama Petugas
    isiKeluhan: string;    // Isi Keluhan / komentar
    tanggal: string;       // Tanggal keluhan
}

// ─── POST: Terima parsed CSV data dan teruskan ke n8n ─────────────────────────
// Expected body: Array<{ namaPetugas, isiKeluhan, tanggal }>
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Validasi: harus berupa array
        if (!Array.isArray(body) || body.length === 0) {
            return NextResponse.json(
                { success: false, message: "Body harus berupa array data keluhan yang tidak kosong." },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        // Validasi tiap baris
        const rows: OfflineFeedbackRow[] = [];
        for (const item of body) {
            if (!item.isiKeluhan || String(item.isiKeluhan).trim() === "") {
                continue; // Lewati baris kosong
            }
            rows.push({
                namaPetugas: String(item.namaPetugas ?? "").trim(),
                isiKeluhan: String(item.isiKeluhan ?? "").trim(),
                tanggal: String(item.tanggal ?? new Date().toISOString()).trim(),
            });
        }

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, message: "Tidak ada baris valid yang dapat diproses. Pastikan kolom 'Isi Keluhan' tidak kosong." },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        console.log(`[POST /api/feedback/offline] Mengirim ${rows.length} baris ke n8n webhook: ${N8N_OFFLINE_WEBHOOK_URL}`);

        // ─── Forward ke n8n Webhook ───────────────────────────────────────────
        let n8nResponse: Response;
        try {
            n8nResponse = await fetch(N8N_OFFLINE_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rows),
                // Timeout 30s (n8n sync bisa lambat)
                signal: AbortSignal.timeout(30000),
            });
        } catch (fetchErr) {
            console.error("[POST /api/feedback/offline] Gagal terhubung ke n8n:", fetchErr);
            return NextResponse.json(
                {
                    success: false,
                    message: "Gagal terhubung ke n8n. Pastikan URL webhook sudah benar dan n8n aktif.",
                    detail: String(fetchErr),
                },
                { status: 502, headers: CORS_HEADERS }
            );
        }

        const n8nText = await n8nResponse.text();
        console.log(`[POST /api/feedback/offline] n8n responded ${n8nResponse.status}: ${n8nText.slice(0, 200)}`);

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
                message: `${rows.length} data keluhan offline berhasil dikirim ke n8n untuk dianalisis.`,
                rowsSent: rows.length,
            },
            { status: 200, headers: CORS_HEADERS }
        );
    } catch (err) {
        console.error("[POST /api/feedback/offline]", err);
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
