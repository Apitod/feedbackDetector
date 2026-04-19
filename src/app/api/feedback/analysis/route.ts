// app/api/feedback/analysis/route.ts
// Endpoint untuk menerima & mengambil SATU consolidated AI analysis report
// dari n8n (bukan per-komentar, tapi satu laporan untuk semua komentar)

import { NextRequest, NextResponse } from "next/server";
import { addAIAnalysis, getLatestAIAnalysis, getAllAIAnalyses } from "@/lib/store";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
};

// ─── GET: Ambil AI analysis terbaru ─────────────────────────────────────────
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";

    if (all) {
        return NextResponse.json(
            { success: true, data: getAllAIAnalyses() },
            { headers: CORS_HEADERS }
        );
    }

    const latest = getLatestAIAnalysis();
    return NextResponse.json(
        { success: true, data: latest },
        { headers: CORS_HEADERS }
    );
}

// ─── POST: Terima consolidated AI analysis dari n8n ──────────────────────────
// Expected body:
// {
//   "report": "<full AI analysis text>",
//   "feedbackCount": 20,
//   "sources": ["instagram", "google_maps", "tiktok", "facebook"]
// }
export async function POST(req: NextRequest) {
    try {
        let body = await req.json();

        // [SILENT BUG FIX] Fix Double Stringify from n8n
        // Jika body yang diterima adalah string, coba parse ulang menjadi objek.
        if (typeof body === "string") {
            try {
                body = JSON.parse(body);
            } catch (e) {
                console.warn("[POST /api/feedback/analysis] Body is string but could not be re-parsed as JSON.");
            }
        }

        // DEBUG: log apa yang diterima dari n8n
        console.log("[POST /api/feedback/analysis] Body received:", JSON.stringify(body).slice(0, 500));

        // Terima berbagai field name yang mungkin dikirim n8n AI Agent:
        // output, text, response, answer, report
        // Terima berbagai field name yang mungkin dikirim n8n AI Agent:
        // report, output, answer dsb.
        let report =
            body.report ||
            body.output ||
            body.text ||
            body.response ||
            body.answer ||
            "";

        const feedbackCount = body.feedbackCount || 0;
        const sources = body.sources || [];

        // JIKA 'report' masih berupa string JSON, coba parse satu kali lagi (Deep Recovery)
        if (typeof report === "string" && report.trim().startsWith("{")) {
            try {
                const inner = JSON.parse(report);
                if (inner.report) report = inner.report;
            } catch (e) {
                // Biarkan sebagai string jika gagal
            }
        }

        if (!report || (typeof report !== "string" && typeof report !== "object")) {
            console.log("[POST /api/feedback/analysis] Report kosong. Body yang diterima:", JSON.stringify(body));
            return NextResponse.json(
                { 
                    success: false, 
                    message: `Field 'report' wajib diisi.`,
                    debug: {
                        keys_received: Object.keys(body),
                        body_preview: JSON.stringify(body).slice(0, 100),
                        type: typeof body
                    }
                },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        let finalReportString = report.trim();
        
        // Coba parsing jika AI mengembalikan format JSON (mengandung ```json)
        try {
            const rawText = finalReportString;
            // Gunakan regex untuk menangkap isi dari block ```json ... ```
            const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
            const jsonString = jsonMatch ? jsonMatch[1] : (rawText.trim().startsWith("{") ? rawText : null);
            
            if (jsonString) {
                const parsedJson = JSON.parse(jsonString);
                if (parsedJson.report) {
                    finalReportString = parsedJson.report;
                }
                
                // Jika AI juga menyertakan pemetaan individual, update tabel langsung!
                if (Array.isArray(parsedJson.analyzed_feedbacks) && global.feedbackStore) {
                    let updatedCount = 0;
                    for (const aiItem of parsedJson.analyzed_feedbacks) {
                        if (!aiItem.comment || !aiItem.triage || !aiItem.sentiment) continue;
                        
                        // Cari feedback yang cocok berdasarkan komentarnya (minimal 15 karakter awal)
                        const searchStr = aiItem.comment.trim().toLowerCase();
                        const snippet = searchStr.substring(0, 15);
                        
                        const match = global.feedbackStore.find(
                            f => f.comment.toLowerCase().includes(snippet) || f.comment === aiItem.comment
                        );
                        
                        if (match) {
                            match.sentiment = aiItem.sentiment.toLowerCase();
                            match.triage = aiItem.triage.toLowerCase();
                            updatedCount++;
                        }
                    }
                    console.log(`[POST /api/feedback/analysis] Berhasil mengupdate ${updatedCount} baris tabel dengan AI Triage.`);
                }
            }
        } catch (err) {
            console.error("[POST /api/feedback/analysis] Gagal parse JSON AI, menggunakan raw string", err);
        }


        // Toleran terhadap string number (n8n sering kirim angka sebagai string)
        const parsedCount =
            typeof feedbackCount === "number"
                ? feedbackCount
                : typeof feedbackCount === "string"
                    ? parseInt(feedbackCount, 10) || 0
                    : 0;

        // Toleran terhadap comma-separated string atau array
        let parsedSources: string[] = [];
        if (Array.isArray(sources)) {
            parsedSources = sources;
        } else if (typeof sources === "string" && sources.trim()) {
            parsedSources = sources.split(",").map((s) => s.trim()).filter(Boolean);
        }

        const newAnalysis = addAIAnalysis({
            report: finalReportString,
            generatedAt: new Date().toISOString(),
            feedbackCount: parsedCount,
            sources: parsedSources,
        });

        return NextResponse.json(
            {
                success: true,
                message: "Analisis AI berhasil disimpan",
                data: newAnalysis,
            },
            { status: 201, headers: CORS_HEADERS }
        );
    } catch (err) {
        console.error("[POST /api/feedback/analysis]", err);
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
