// lib/store.ts
// In-memory store untuk MVP (tanpa database)
// Untuk production: ganti dengan Supabase / Prisma / MongoDB

export interface FeedbackItem {
    id: string;
    source: "instagram" | "tiktok" | "facebook" | "google_maps" | string;
    kanal?: string;      // Sub-channel spesifik, e.g. "Telp/SMS/WA", "Barcode Pengaduan"
    comment: string;
    date: string | null;
    rating: number | string | null;
    sentiment?: "positif" | "negatif" | "netral";
    triage?: "merah" | "kuning" | "hijau";
    createdAt: string;
    kategori?: string;
    prioritasManual?: string;
    actionNeeds?: string;
}

// Consolidated AI analysis (satu laporan untuk semua feedback)
export interface AIAnalysis {
    id: string;
    report: string;          // Full formatted report dari AI
    generatedAt: string;     // ISO timestamp
    feedbackCount: number;   // Jumlah komentar yang dianalisis
    sources: string[];       // Platform yang disertakan
}

// ─── Market Intelligence Store ────────────────────────────────────────────────
// Laporan analisis pasar dari sosmed scraping (TikTok, IG, Maps, FB)
export interface MarketAnalysis {
    id: string;
    report: string;       // Full market intelligence report dari AI
    generatedAt: string;  // ISO timestamp
    commentCount: number; // Jumlah komentar sosmed yang dianalisis
    platforms: string[];  // Platform yang di-scrape
    analyzed_comments?: { comment: string; sentiment: string; topic: string }[]; // Per-comment AI analysis
}

// Global store bertahan selama server process berjalan
declare global {
    // eslint-disable-next-line no-var
    var feedbackStore: FeedbackItem[] | undefined;
    // eslint-disable-next-line no-var
    var aiAnalysisStore: AIAnalysis[] | undefined;
    // eslint-disable-next-line no-var
    var marketAnalysisStore: MarketAnalysis[] | undefined;
}

if (!global.feedbackStore) {
    global.feedbackStore = [];
}

if (!global.aiAnalysisStore) {
    global.aiAnalysisStore = [];
}

if (!global.marketAnalysisStore) {
    global.marketAnalysisStore = [];
}

export const feedbackStore = global.feedbackStore;
export const aiAnalysisStore = global.aiAnalysisStore;
export const marketAnalysisStore = global.marketAnalysisStore;

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
            const s = (item.sentiment ?? "netral").toLowerCase().trim();
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

// ─── Market Intelligence CRUD ─────────────────────────────────────────────────
export function addMarketAnalysis(
    item: Omit<MarketAnalysis, "id">
): MarketAnalysis {
    const newItem: MarketAnalysis = {
        ...item,
        id: `mkt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    global.marketAnalysisStore!.unshift(newItem);
    if (global.marketAnalysisStore!.length > 10) {
        global.marketAnalysisStore = global.marketAnalysisStore!.slice(0, 10);
    }
    return newItem;
}

export function getLatestMarketAnalysis(): MarketAnalysis | null {
    return global.marketAnalysisStore?.[0] ?? null;
}

export function getAllMarketAnalyses(): MarketAnalysis[] {
    return global.marketAnalysisStore ?? [];
}
