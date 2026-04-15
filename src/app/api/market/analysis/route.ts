// app/api/market/analysis/route.ts
// Endpoint untuk menerima dan mengambil AI Market Intelligence report dari n8n.
// Data ini murni dari scraping (TikTok, IG, Maps, FB) — tidak bercampur dengan
// data feedback internal.

import { NextRequest, NextResponse } from "next/server";
import {
    addMarketAnalysis,
    getLatestMarketAnalysis,
    getAllMarketAnalyses,
} from "@/lib/store";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
};

// ─── GET: Ambil market analysis terbaru ──────────────────────────────────────
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";

    if (all) {
        return NextResponse.json(
            { success: true, data: getAllMarketAnalyses() },
            { headers: CORS_HEADERS }
        );
    }

    const latest = getLatestMarketAnalysis();
    return NextResponse.json(
        { success: true, data: latest },
        { headers: CORS_HEADERS }
    );
}

// ─── POST: Terima market analysis dari n8n ───────────────────────────────────
// n8n "Save Market Analysis" node mengirim body berupa output raw AI Agent.
// Contoh body yang diterima:
// {
//   "report": "KEY INSIGHTS:\n...\n\nTHREATS & OPPORTUNITIES:\n...\n\nREKOMENDASI STRATEGIS:\n...",
//   "analyzed_comments": [...],
//   "commentCount": 45,
//   "platforms": ["tiktok","instagram","google_maps","facebook"]
// }
// — atau body langsung berupa JSON string dari AI output (field "output" / raw).
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        console.log(
            "[POST /api/market/analysis] Body received:",
            JSON.stringify(body).slice(0, 500)
        );

        // n8n AI Agent biasanya mengirim field "output" (plain text atau JSON string)
        const rawReport =
            body.report ||
            body.output ||
            body.text ||
            body.response ||
            body.answer ||
            "";

        if (!rawReport || typeof rawReport !== "string" || rawReport.trim() === "") {
            console.log(
                "[POST /api/market/analysis] Report kosong. Keys:",
                Object.keys(body)
            );
            return NextResponse.json(
                {
                    success: false,
                    message: `Field 'report' atau 'output' wajib diisi. Keys diterima: ${Object.keys(body).join(", ")}`,
                },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        let finalReport = rawReport.trim();

        // Coba parse jika AI mengembalikan JSON (dalam ```json block atau plain JSON)
        try {
            const jsonMatch = finalReport.match(/```json\s*([\s\S]*?)\s*```/);
            const jsonString = jsonMatch
                ? jsonMatch[1]
                : finalReport.trim().startsWith("{")
                ? finalReport
                : null;

            if (jsonString) {
                const parsed = JSON.parse(jsonString);
                if (parsed.report && typeof parsed.report === "string") {
                    finalReport = parsed.report;
                }
            }
        } catch {
            // Bukan JSON — tetap gunakan teks mentah
        }

        // Toleran terhadap berbagai format jumlah komentar
        const commentCount =
            typeof body.commentCount === "number"
                ? body.commentCount
                : typeof body.commentCount === "string"
                ? parseInt(body.commentCount, 10) || 0
                : 0;

        // Toleran terhadap array atau comma-separated string
        let platforms: string[] = [];
        if (Array.isArray(body.platforms)) {
            platforms = body.platforms;
        } else if (typeof body.platforms === "string" && body.platforms.trim()) {
            platforms = body.platforms.split(",").map((s: string) => s.trim()).filter(Boolean);
        }

        const saved = addMarketAnalysis({
            report: finalReport,
            generatedAt: new Date().toISOString(),
            commentCount,
            platforms,
        });

        return NextResponse.json(
            { success: true, message: "Market analysis berhasil disimpan", data: saved },
            { status: 201, headers: CORS_HEADERS }
        );
    } catch (err) {
        console.error("[POST /api/market/analysis]", err);
        return NextResponse.json(
            { success: false, message: "Format data tidak valid" },
            { status: 400, headers: CORS_HEADERS }
        );
    }
}

// ─── OPTIONS: CORS preflight ─────────────────────────────────────────────────
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
