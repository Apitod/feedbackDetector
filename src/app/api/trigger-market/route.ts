// app/api/trigger-market/route.ts
// Endpoint "tombol mulai" untuk Market Intelligence.
// Menembak webhook n8n yang menjalankan scraping TikTok, IG, Maps, FB.

import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
};

const N8N_MARKET_WEBHOOK_URL =
    process.env.N8N_MARKET_WEBHOOK_URL ||
    "https://hyperthermal-admirative-luella.ngrok-free.dev/webhook/start-market-analysis";

// ─── POST: Trigger n8n market workflow ───────────────────────────────────────
export async function POST(_req: NextRequest) {
    try {
        console.log(
            `[POST /api/trigger-market] Memicu n8n market webhook: ${N8N_MARKET_WEBHOOK_URL}`
        );

        let n8nResponse: Response;
        try {
            n8nResponse = await fetch(N8N_MARKET_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    triggeredAt: new Date().toISOString(),
                    source: "dashboard",
                }),
                signal: AbortSignal.timeout(30000),
            });
        } catch (fetchErr) {
            console.error("[POST /api/trigger-market] Gagal terhubung ke n8n:", fetchErr);
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
            `[POST /api/trigger-market] n8n responded ${n8nResponse.status}: ${n8nText.slice(0, 200)}`
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
                message:
                    "Analisis market dimulai! n8n sedang melakukan scraping sosial media & menganalisis tren.",
            },
            { status: 200, headers: CORS_HEADERS }
        );
    } catch (err) {
        console.error("[POST /api/trigger-market]", err);
        return NextResponse.json(
            { success: false, message: "Terjadi kesalahan server." },
            { status: 500, headers: CORS_HEADERS }
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
