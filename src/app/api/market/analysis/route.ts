// app/api/market/analysis/route.ts
// Endpoint untuk menerima dan mengambil AI Market Intelligence report dari n8n.

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
// Mendukung 3 format body dari n8n:
//   A) { report:"teks bersih", analyzed_comments:[...], commentCount:N, platforms:[...] }
//   B) { report:"{\"report\":\"...\",\"analyzed_comments\":[...]}", commentCount:N, platforms:[...] }
//      (report adalah JSON string dari AI — n8n belum bisa spread-nya)
//   C) Body adalah raw JSON string dari seluruh objek
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Log 1000 chars pertama untuk debugging di terminal Next.js
        console.log(
            "[market/analysis POST] body (1000 chars):",
            JSON.stringify(body).slice(0, 1000)
        );

        // ── Helper: coba parse string sebagai JSON object ─────────────────────
        function tryParseObj(s: string): Record<string, unknown> | null {
            try {
                // Bersihkan string dari format markdown atau karakter '=' yang tidak sengaja terkirim dari n8n
                const clean = s
                    .replace(/^={1,3}/, "") // Hapus leading =, ==, ===
                    .replace(/^```json\s*/i, "")
                    .replace(/\s*```$/m, "")
                    .trim()
                    // Hapus lagi jika ada `=` tertinggal setelah trim
                    .replace(/^={1,3}/, "")
                    .trim();

                const p = JSON.parse(clean);
                if (p && typeof p === "object" && !Array.isArray(p)) {
                    return p as Record<string, unknown>;
                }
            } catch { /* tidak valid JSON */ }
            return null;
        }

        // ──1. Normalisasi body menjadi satu "candidate" object ───────────────
        let candidate: Record<string, unknown>;

        if (typeof body === "string") {
            // Kasus C: seluruh body adalah raw string
            const parsed = tryParseObj(body);
            if (!parsed) {
                return NextResponse.json(
                    { success: false, message: "Body string bukan JSON valid." },
                    { status: 400, headers: CORS_HEADERS }
                );
            }
            candidate = parsed;
        } else {
            const bodyObj = body as Record<string, unknown>;

            // Kasus A: report sudah plain text (tidak berawalan '{')
            if (
                typeof bodyObj.report === "string" &&
                !bodyObj.report.trim().startsWith("{") &&
                bodyObj.report.trim().length > 0
            ) {
                candidate = bodyObj;
            } else {
                // Kasus B: cari field yang menyimpan full JSON dari AI
                let nestedCandidate: Record<string, unknown> | null = null;
                for (const field of ["report", "output", "text", "response", "answer"]) {
                    const val = bodyObj[field];
                    if (typeof val === "string" && val.trim().length > 10) {
                        const parsed = tryParseObj(val);
                        if (parsed && typeof parsed.report === "string") {
                            // Gabungkan: data dari AI (report, analyzed_comments) +
                            // metadata dari n8n (commentCount, platforms)
                            nestedCandidate = {
                                ...bodyObj,      // commentCount, platforms dari n8n
                                ...parsed,       // report, analyzed_comments dari AI
                                report: parsed.report, // pastikan report = teks bersih
                            };
                            // Jika analyzed_comments hanya ada di parsed, jaga tetap ada
                            if (Array.isArray(parsed.analyzed_comments) && !Array.isArray(bodyObj.analyzed_comments)) {
                                nestedCandidate.analyzed_comments = parsed.analyzed_comments;
                            }
                            console.log(`[market/analysis POST] Nested JSON extracted from field '${field}'`);
                            break;
                        }
                    }
                }
                candidate = nestedCandidate ?? bodyObj;
            }
        }

        // ── 2. Ekstrak finalReport ────────────────────────────────────────────
        const finalReport = (
            typeof candidate.report === "string"
                ? candidate.report
                : typeof candidate.output === "string"
                    ? candidate.output
                    : ""
        ).trim();

        if (!finalReport) {
            console.log("[market/analysis POST] Report kosong. Keys:", Object.keys(candidate));
            return NextResponse.json(
                { success: false, message: "Field 'report' wajib diisi." },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        // ── 3. Ekstrak analyzed_comments ──────────────────────────────────────
        type AnalyzedComment = { comment: string; sentiment: string; topic: string };
        let analyzedComments: AnalyzedComment[] = [];
        if (Array.isArray(candidate.analyzed_comments)) {
            analyzedComments = candidate.analyzed_comments as AnalyzedComment[];
        }
        console.log(`[market/analysis POST] analyzed_comments: ${analyzedComments.length} items`);

        // ── 4. Ekstrak commentCount ───────────────────────────────────────────
        const commentCount =
            typeof candidate.commentCount === "number"
                ? candidate.commentCount
                : typeof candidate.commentCount === "string"
                    ? parseInt(candidate.commentCount, 10) || 0
                    : 0;

        // ── 5. Ekstrak platforms ──────────────────────────────────────────────
        let platforms: string[] = [];
        if (Array.isArray(candidate.platforms)) {
            platforms = candidate.platforms as string[];
        } else if (typeof candidate.platforms === "string" && (candidate.platforms as string).trim()) {
            platforms = (candidate.platforms as string).split(",").map((s) => s.trim()).filter(Boolean);
        }

        // ── 6. Simpan ke store ────────────────────────────────────────────────
        const saved = addMarketAnalysis({
            report: finalReport,
            generatedAt: new Date().toISOString(),
            commentCount,
            platforms,
            analyzed_comments: analyzedComments,
        });

        console.log(
            `[market/analysis POST] Saved OK — reportLen:${finalReport.length}, comments:${analyzedComments.length}, commentCount:${commentCount}, platforms:${JSON.stringify(platforms)}`
        );

        return NextResponse.json(
            { success: true, message: "Market analysis berhasil disimpan", data: saved },
            { status: 201, headers: CORS_HEADERS }
        );
    } catch (err) {
        console.error("[market/analysis POST] Error:", err);
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
