// app/api/debug-store/route.ts
// Endpoint sementara untuk debugging — jangan deploy ke production
import { NextResponse } from "next/server";

export async function GET() {
    const store = global.feedbackStore ?? [];

    // Hitung per-source
    const bySource: Record<string, number> = {};
    for (const item of store) {
        bySource[item.source] = (bySource[item.source] ?? 0) + 1;
    }

    // Preview 3 item terbaru per source
    const preview: Record<string, object[]> = {};
    for (const src of Object.keys(bySource)) {
        preview[src] = store
            .filter((f) => f.source === src)
            .slice(0, 3)
            .map((f) => ({
                id: f.id,
                source: f.source,
                comment: f.comment.slice(0, 80),
                date: f.date,
                sentiment: f.sentiment,
                triage: f.triage,
            }));
    }

    return NextResponse.json(
        {
            totalItems: store.length,
            bySource,
            preview,
        },
        { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" } }
    );
}
