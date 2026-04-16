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

        // ── Toleransi format body dari n8n ─────────────────────────────────
        // Kasus 1: body adalah string mentah (n8n mengirim raw AI output)
        // Kasus 2: body adalah object { output: "...", commentCount, platforms }
        // Kasus 3: body adalah object { report: "...", commentCount, platforms }
        let rawReport: string = "";
        let bodyMeta = body;

        if (typeof body === "string") {
            // n8n mengirim raw string sebagai body (bukan object)
            rawReport = body.trim();
            bodyMeta = {}; // tidak ada metadata
        } else {
            rawReport = (
                body.report ||
                body.output ||
                body.text ||
                body.response ||
                body.answer ||
                ""
            );
        }

        if (!rawReport || rawReport.trim() === "") {
            console.log(
                "[POST /api/market/analysis] Report kosong. Type:", typeof body,
                "Keys:", typeof body === "object" ? Object.keys(body) : "N/A (string)"
            );
            return NextResponse.json(
                {
                    success: false,
                    message: `Field 'report' atau 'output' wajib diisi. Type diterima: ${typeof body}`,
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
            typeof (bodyMeta as Record<string, unknown>).commentCount === "number"
                ? (bodyMeta as Record<string, unknown>).commentCount as number
                : typeof (bodyMeta as Record<string, unknown>).commentCount === "string"
                ? parseInt((bodyMeta as Record<string, unknown>).commentCount as string, 10) || 0
                : 0;

        // Toleran terhadap array atau comma-separated string
        let platforms: string[] = [];
        const bodyPlatforms = (bodyMeta as Record<string, unknown>).platforms;
        if (Array.isArray(bodyPlatforms)) {
            platforms = bodyPlatforms as string[];
        } else if (typeof bodyPlatforms === "string" && bodyPlatforms.trim()) {
            platforms = bodyPlatforms.split(",").map((s: string) => s.trim()).filter(Boolean);
        }

        // ── Extract analyzed_comments (array dari AI per-comment analysis) ──────
        // n8n mengirim sebagai: { ..., analyzed_comments: [{comment, sentiment, topic}] }
        // Bisa juga tersimpan di dalam JSON-parsed AI output
        let analyzedComments: { comment: string; sentiment: string; topic: string }[] = [];
        const rawComments = (bodyMeta as Record<string, unknown>).analyzed_comments;
        if (Array.isArray(rawComments)) {
            analyzedComments = rawComments as { comment: string; sentiment: string; topic: string }[];
        } else {
            // Coba ekstrak dari parsed JSON jika belum ditemukan di body langsung
            try {
                const jsonMatch = rawReport.match(/```json\s*([\s\S]*?)\s*```/);
                const jsonString = jsonMatch
                    ? jsonMatch[1]
                    : rawReport.trim().startsWith("{") ? rawReport : null;
                if (jsonString) {
                    const parsed = JSON.parse(jsonString);
                    if (Array.isArray(parsed.analyzed_comments)) {
                        analyzedComments = parsed.analyzed_comments;
                    }
                }
            } catch { /* tetap kosong */ }
        }

        const saved = addMarketAnalysis({
            report: finalReport,
            generatedAt: new Date().toISOString(),
            commentCount,
            platforms,
            analyzed_comments: analyzedComments,
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
