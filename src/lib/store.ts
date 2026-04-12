// lib/store.ts
// In-memory store untuk MVP (tanpa database)
// Untuk production: ganti dengan Supabase / Prisma / MongoDB

export interface FeedbackItem {
    id: string;
    source: "instagram" | "tiktok" | "facebook" | "google_maps" | string;
    comment: string;
    date: string | null;
    rating: number | string | null;
    sentiment?: "positif" | "negatif" | "netral";
    createdAt: string;
}

// Consolidated AI analysis (satu laporan untuk semua feedback)
export interface AIAnalysis {
    id: string;
    report: string;          // Full formatted report dari AI
    generatedAt: string;     // ISO timestamp
    feedbackCount: number;   // Jumlah komentar yang dianalisis
    sources: string[];       // Platform yang disertakan
}

// Global store bertahan selama server process berjalan
declare global {
    // eslint-disable-next-line no-var
    var feedbackStore: FeedbackItem[] | undefined;
    // eslint-disable-next-line no-var
    var aiAnalysisStore: AIAnalysis[] | undefined;
}

if (!global.feedbackStore) {
    // Seed data demo
    global.feedbackStore = [
        {
            id: "demo-1",
            source: "google_maps",
            comment: "Wahana seru banget! Anak-anak sangat menikmati. Staf ramah dan area bermain bersih. Pasti akan kembali lagi!",
            date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
            rating: 5,
            sentiment: "positif",
            createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        },
        {
            id: "demo-2",
            source: "instagram",
            comment: "Antrian terlalu panjang, butuh 2 jam hanya untuk naik 1 wahana. Harga tiket mahal tapi pengalaman kurang memuaskan.",
            date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
            rating: null,
            sentiment: "negatif",
            createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        },
        {
            id: "demo-3",
            source: "tiktok",
            comment: "Tempatnya oke sih, wahana standar. Makanan di dalam agak mahal. Overall lumayan lah untuk liburan keluarga.",
            date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
            rating: null,
            sentiment: "netral",
            createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        },
        {
            id: "demo-4",
            source: "facebook",
            comment: "Kolam renang sangat terjaga kebersihannya! Air jernih dan fasilitasnya lengkap. Recommended buat keluarga!",
            date: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
            rating: null,
            sentiment: "positif",
            createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        },
        {
            id: "demo-5",
            source: "google_maps",
            comment: "Parkiran sempit banget saat weekend. Sampah berserakan di beberapa titik. Perlu perbaikan manajemen.",
            date: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
            rating: 2,
            sentiment: "negatif",
            createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        },
        {
            id: "demo-6",
            source: "instagram",
            comment: "Suka banget sama spot foto di sini! Instagramable abis. Tim fotografer professional tersedia juga.",
            date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
            rating: null,
            sentiment: "positif",
            createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        },
    ];
}

if (!global.aiAnalysisStore) {
    // Demo consolidated AI analysis
    global.aiAnalysisStore = [
        {
            id: "demo-analysis-1",
            generatedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
            feedbackCount: 6,
            sources: ["google_maps", "instagram", "tiktok", "facebook"],
            report: `RINGKASAN UMUM:
Secara keseluruhan, pelanggan memberikan respons beragam terhadap pengalaman di lokasi ini. Mayoritas puas dengan fasilitas fisik dan estetika tempat, namun terdapat keluhan signifikan terkait operasional dan harga yang perlu mendapat perhatian segera.

SENTIMEN DOMINAN:
Campuran antara Positif dan Negatif — 3 dari 6 ulasan bersifat positif (wahana, kebersihan kolam, spot foto), sementara 2 ulasan berisi keluhan serius (antrian, parkir, kebersihan area), dan 1 bersifat netral.

TEMUAN UTAMA PELANGGAN:
• Wahana dan fasilitas utama mendapat apresiasi tinggi dari keluarga
• Area kolam renang dianggap bersih dan terawat
• Spot foto instagramable menjadi daya tarik tersendiri
• Antrian panjang (hingga 2 jam) menjadi keluhan terbesar
• Harga tiket dan makanan dianggap tidak sebanding dengan pengalaman
• Kapasitas parkir weekend dinilai sangat tidak memadai

MASALAH KRITIS (JIKA ADA):
• Waktu tunggu antrian yang ekstrem menjadi deal-breaker bagi pengunjung
• Manajemen parkir saat peak time perlu perbaikan mendesak
• Kebersihan area non-kolam (tempat parkir, jalur umum) perlu perhatian

PELUANG PENINGKATAN:
• Sistem FastPass atau reservasi slot wahana untuk mengurangi antrian
• Opsi harga bundling yang lebih terjangkau untuk keluarga
• Perluasan area parkir atau kerjasama dengan shuttle dari parkir eksternal
• Konten UGC (user-generated content) dapat dimanfaatkan lebih optimal

REKOMENDASI PRAKTIS:
1. Implementasi sistem reservasi online per wahana untuk mengelola antrian
2. Tambah petugas kebersihan rotasi di titik-titik dengan keluhan tinggi
3. Buat paket Family Bundle yang mencakup tiket + makan untuk meningkatkan nilai
4. Koordinasikan parkir tambahan di hari weekend dengan sistem shuttle`,
        },
    ];
}

export const feedbackStore = global.feedbackStore;
export const aiAnalysisStore = global.aiAnalysisStore;

export function addFeedback(item: Omit<FeedbackItem, "id" | "createdAt">): FeedbackItem {
    const newItem: FeedbackItem = {
        ...item,
        id: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
    };
    global.feedbackStore!.unshift(newItem);
    return newItem;
}

export function addAIAnalysis(
    item: Omit<AIAnalysis, "id">
): AIAnalysis {
    const newItem: AIAnalysis = {
        ...item,
        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    // Keep only the latest 10 analyses
    global.aiAnalysisStore!.unshift(newItem);
    if (global.aiAnalysisStore!.length > 10) {
        global.aiAnalysisStore = global.aiAnalysisStore!.slice(0, 10);
    }
    return newItem;
}

export function getLatestAIAnalysis(): AIAnalysis | null {
    return global.aiAnalysisStore?.[0] ?? null;
}

export function getAllAIAnalyses(): AIAnalysis[] {
    return global.aiAnalysisStore ?? [];
}

export function getAllFeedback(): FeedbackItem[] {
    return global.feedbackStore ?? [];
}

export function getStats() {
    const all = getAllFeedback();
    const total = all.length;

    const sentimentCount = all.reduce(
        (acc, item) => {
            const s = item.sentiment ?? "netral";
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    const sourceCount = all.reduce(
        (acc, item) => {
            acc[item.source] = (acc[item.source] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    const dominantSentiment = Object.entries(sentimentCount).sort(
        ([, a], [, b]) => b - a
    )[0]?.[0] ?? "netral";

    const dominantSource = Object.entries(sourceCount).sort(
        ([, a], [, b]) => b - a
    )[0]?.[0] ?? "-";

    return {
        total,
        sentimentCount,
        sourceCount,
        dominantSentiment,
        dominantSource,
    };
}
