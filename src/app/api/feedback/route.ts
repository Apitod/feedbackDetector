// app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { addFeedback, getAllFeedback, FeedbackItem } from "@/lib/store";


// ─── GET: Ambil semua feedback ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source");
    const sentiment = searchParams.get("sentiment");
    const limit = parseInt(searchParams.get("limit") ?? "100");

    let data = getAllFeedback();

    if (source && source !== "semua") {
        data = data.filter((f) => f.source === source);
    }
    if (sentiment && sentiment !== "semua") {
        data = data.filter((f) => f.sentiment === sentiment);
    }

    data = data.slice(0, limit);

    return NextResponse.json(
        { success: true, count: data.length, data },
        {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "no-cache",
            },
        }
    );
}

// ─── POST: Terima data dari n8n ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // DEBUG: log apa yang diterima dari n8n
        const preview = JSON.stringify(body).slice(0, 300);
        console.log("[POST /api/feedback] Body received:", preview);

        // Mendukung single object atau array (batch dari n8n)
        const items: Partial<FeedbackItem>[] = Array.isArray(body) ? body : [body];

        if (items.length > 0) {
            console.log("[POST /api/feedback] First item keys:", Object.keys(items[0]));
            console.log("[POST /api/feedback] First item:", JSON.stringify(items[0]).slice(0, 200));
        }

        const created: FeedbackItem[] = [];
        const updated: FeedbackItem[] = [];

        for (const item of items) {
            // Validasi field wajib
            if (!item.source || !item.comment) {
                console.log("[POST /api/feedback] Item dilewati - source:", item.source, "comment:", item.comment ? "ada" : "kosong");
                continue;
            }

            // Auto-detect sentiment dari komentar jika belum ada
            let sentiment = item.sentiment as FeedbackItem["sentiment"];
            if (!sentiment) {
                const textLower = (item.comment ?? "").toLowerCase();
                if (
                    textLower.includes("puas") ||
                    textLower.includes("bagus") ||
                    textLower.includes("mantap") ||
                    textLower.includes("recommended") ||
                    textLower.includes("suka") ||
                    textLower.includes("baik") ||
                    textLower.includes("bersih") ||
                    textLower.includes("keren")
                ) {
                    sentiment = "positif";
                } else if (
                    textLower.includes("kecewa") ||
                    textLower.includes("buruk") ||
                    textLower.includes("jelek") ||
                    textLower.includes("masalah") ||
                    textLower.includes("antrian") ||
                    textLower.includes("mahal") ||
                    textLower.includes("sempit")
                ) {
                    sentiment = "negatif";
                } else {
                    sentiment = "netral";
                }
            }

            // Normalize source name
            let source = (item.source ?? "").toLowerCase().trim();
            if (source === "ig" || source === "instagram") source = "instagram";
            if (source === "fb" || source === "facebook") source = "facebook";
            if (source === "tiktok") source = "tiktok";
            if (source === "gmaps" || source === "google maps" || source === "google_maps") {
                source = "google_maps";
            }

            // Auto-detect triage from commentary if not provided
            let triage = item.triage as FeedbackItem["triage"];
            if (!triage) {
                const textLower = (item.comment ?? "").toLowerCase();
                
                if (
                    textLower.includes("licin") || 
                    textLower.includes("jatuh") || 
                    textLower.includes("bahaya") || 
                    textLower.includes("infeksi") || 
                    textLower.includes("malpraktik") ||
                    textLower.includes("darurat") ||
                    textLower.includes("gawat") ||
                    textLower.includes("mati") ||
                    textLower.includes("meninggal") ||
                    textLower.includes("rusak") ||
                    textLower.includes("obat salah")
                ) {
                    triage = "merah";
                } else if (
                    textLower.includes("kotor") || 
                    textLower.includes("panas") || 
                    textLower.includes("antri") || 
                    textLower.includes("lama") || 
                    textLower.includes("toilet") ||
                    textLower.includes("wc") ||
                    textLower.includes("parkir") ||
                    textLower.includes("ac mati") ||
                    textLower.includes("tunggu") ||
                    textLower.includes("pelayanan") ||
                    textLower.includes("security") ||
                    textLower.includes("perawat") ||
                    textLower.includes("buruk") ||
                    textLower.includes("jelek") ||
                    sentiment === "negatif"
                ) {
                    triage = "kuning";
                } else {
                    triage = "hijau";
                }
            }

            // ─── UPSERT: update jika sudah ada, insert jika baru ─────────────────
            const existingIdx = global.feedbackStore?.findIndex(
                (f) => f.comment === item.comment && f.source === source
            ) ?? -1;

            if (existingIdx >= 0 && global.feedbackStore) {
                // Update semua field yang relevan agar AI sentiment/triage bisa diperbarui
                const existing = global.feedbackStore[existingIdx];
                existing.sentiment = sentiment ?? existing.sentiment;
                existing.triage = triage ?? existing.triage;
                if (item.kategori && item.kategori !== "-") existing.kategori = item.kategori;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const legacyPrioritas = (item as any).prioritas as string | undefined;
                if ((item.prioritasManual || legacyPrioritas) && (item.prioritasManual || legacyPrioritas) !== "-") {
                    existing.prioritasManual = item.prioritasManual || legacyPrioritas;
                }
                if (item.actionNeeds && item.actionNeeds !== "-") existing.actionNeeds = item.actionNeeds;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((item as any).kanal) existing.kanal = (item as any).kanal;
                updated.push(existing);
                continue;
            }

            const newItem = addFeedback({
                source,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                kanal: (item as any).kanal || undefined,
                comment: item.comment ?? "",
                date: item.date ?? new Date().toISOString(),
                rating: item.rating ?? null,
                sentiment: sentiment ?? "netral",
                triage: triage,
                kategori: item.kategori || "-",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                prioritasManual: item.prioritasManual || (item as any).prioritas || "-",
                actionNeeds: item.actionNeeds || "-",
            });

            created.push(newItem);
        }

        return NextResponse.json(
            {
                success: true,
                message: `${created.length} feedback baru disimpan, ${updated.length} diperbarui`,
                data: [...created, ...updated],
            },
            {
                status: 201,
                headers: { "Access-Control-Allow-Origin": "*" },
            }
        );
    } catch (err) {
        console.error("[POST /api/feedback]", err);
        return NextResponse.json(
            { success: false, message: "Format data tidak valid" },
            { status: 400 }
        );
    }
}

// ─── OPTIONS: CORS preflight ──────────────────────────────────────────────────
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
