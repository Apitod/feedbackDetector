"use client";
import React from "react";

import { useEffect, useState, useCallback, useRef } from "react";
import {
    RefreshCw,
    MessageSquare,
    TrendingUp,
    Globe,
    BarChart3,
    PieChart,
    Table2,
    Wifi,
    WifiOff,
    Bot,
    Info,
    X,
    Sparkles,
    Clock,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    CheckCircle2,
    Lightbulb,
    Zap,
    Sun,
    Moon,
    Upload,
    FileSpreadsheet,
    CloudUpload,
    Loader2,
    Rocket,
    FileCheck2,
    Telescope,
    ShieldAlert,
} from "lucide-react";
import { FeedbackItem, AIAnalysis, MarketAnalysis } from "@/lib/store";
import { SentimentPieChart, SourceBarChart } from "@/components/charts";
import { FilterSelect, RatingDisplay, SentimentBadge, SourceBadge, TriageBadge } from "@/components/ui-bits";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
    total: number;
    sentimentCount: Record<string, number>;
    sourceCount: Record<string, number>;
    dominantSentiment: string;
    dominantSource: string;
}

// ─── Source display map ───────────────────────────────────────────────────────
const SOURCE_LABEL: Record<string, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    facebook: "Facebook",
    google_maps: "Google Maps",
    offline_rs: "Offline RS",
};

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
// ─── Types for offline upload ─────────────────────────────────────────────────
interface OfflineRow {
    namaPetugas: string;
    isiKeluhan: string;
    tanggal: string;
    kanal?: string;
    kategori?: string;
    prioritasManual?: string;
    actionNeeds?: string;
}

export default function DashboardPage() {
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [filterSource, setFilterSource] = useState("semua");
    const [filterSentiment, setFilterSentiment] = useState("semua");
    const [marketFilterSource, setMarketFilterSource] = useState("semua");
    const [marketFilterSentiment, setMarketFilterSentiment] = useState("semua");
    const [selectedRow, setSelectedRow] = useState<FeedbackItem | null>(null);
    const [isLive, setIsLive] = useState(true);
    const [analysisExpanded, setAnalysisExpanded] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [activeTab, setActiveTab] = useState<"internal" | "market">("internal");

    // ─── Market Intelligence State ───────────────────────────────────────────────
    const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null);
    const [marketTriggering, setMarketTriggering] = useState(false);
    const [marketTriggerMsg, setMarketTriggerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [marketReportExpanded, setMarketReportExpanded] = useState(false);

    // ─── Offline Upload State ─────────────────────────────────────────────────
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [parsedRows, setParsedRows] = useState<OfflineRow[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ─── Held offline data (persists after modal close, sent with trigger) ────
    const [heldOfflineData, setHeldOfflineData] = useState<OfflineRow[]>([]);

    // ─── Analysis trigger state ───────────────────────────────────────────────
    const [analysisTriggering, setAnalysisTriggering] = useState(false);
    const [triggerMessage, setTriggerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // ─── Theme Management ─────────────────────────────────────────────────────
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.toggle("dark", savedTheme === "dark");
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setTheme("dark");
            document.documentElement.classList.add("dark");
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
    };

    // ─── CSV Parser (RFC 4180-compliant, handles multiline quoted fields) ────────
    const parseCSV = (text: string): OfflineRow[] => {
        // Parse CSV char-by-char to correctly handle quoted multiline fields
        const parseCSVRows = (csv: string): string[][] => {
            const result: string[][] = [];
            let currentRow: string[] = [];
            let currentField = "";
            let inQuotes = false;

            for (let i = 0; i < csv.length; i++) {
                const ch = csv[i];
                const next = csv[i + 1];

                if (inQuotes) {
                    if (ch === '"' && next === '"') {
                        // Escaped quote "" → literal "
                        currentField += '"';
                        i++;
                    } else if (ch === '"') {
                        // End of quoted field
                        inQuotes = false;
                    } else {
                        // Regular char inside quotes (including embedded newlines)
                        currentField += ch;
                    }
                } else {
                    if (ch === '"') {
                        inQuotes = true;
                    } else if (ch === ',') {
                        currentRow.push(currentField);
                        currentField = "";
                    } else if (ch === '\r' && next === '\n') {
                        // Windows-style CRLF end of record
                        currentRow.push(currentField);
                        result.push(currentRow);
                        currentRow = [];
                        currentField = "";
                        i++; // skip \n
                    } else if (ch === '\n') {
                        // Unix-style LF end of record
                        currentRow.push(currentField);
                        result.push(currentRow);
                        currentRow = [];
                        currentField = "";
                    } else {
                        currentField += ch;
                    }
                }
            }
            // Flush last field / row
            if (currentRow.length > 0 || currentField !== "") {
                currentRow.push(currentField);
                if (currentRow.some((f) => f.trim() !== "")) {
                    result.push(currentRow);
                }
            }
            return result;
        };

        const allRows = parseCSVRows(text);
        if (allRows.length < 2) throw new Error("File CSV minimal 2 baris (header + 1 data).");

        const rows: OfflineRow[] = [];
        // Start from index 1 to skip header row
        for (let i = 1; i < allRows.length; i++) {
            const cleanCols = allRows[i].map((c) => c.trim());

            // Column mapping (0-indexed):
            // 0: Tanggal, 1: Kanal, 2: Nama, 3: Ulasan, 4: Kategori, 5: Prioritas,
            // 6: Tanggal (duplikat), 7: Action needs, 8: Status, 9: Tanggal Selesai, 10: P.I.C
            if (!cleanCols[3] || cleanCols[3].trim() === "") continue;

            rows.push({
                tanggal: cleanCols[0] || new Date().toISOString(),
                kanal: cleanCols[1] || "-",
                namaPetugas: cleanCols[2] || "-",
                isiKeluhan: cleanCols[3],
                kategori: cleanCols[4] || "-",
                prioritasManual: cleanCols[5] || "-",
                actionNeeds: cleanCols[7] || "-",
            });
        }
        return rows;
    };

    // ─── Handle file selection (via click or drop) ────────────────────────────
    const handleFile = (file: File) => {
        setUploadFile(null);
        setParsedRows([]);
        setParseError(null);

        if (!file.name.endsWith(".csv")) {
            setParseError("Hanya file .csv yang diterima.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const rows = parseCSV(text);
                if (rows.length === 0) {
                    setParseError("Tidak ada baris data valid di dalam file.");
                    return;
                }
                setUploadFile(file);
                setParsedRows(rows);
            } catch (err) {
                setParseError(String(err instanceof Error ? err.message : err));
            }
        };
        reader.readAsText(file, "UTF-8");
    };

    // ─── Confirm offline data (close modal & hold data for trigger) ──────────
    const handleConfirmOfflineData = () => {
        if (parsedRows.length === 0) return;
        setHeldOfflineData(parsedRows);
        setShowUploadModal(false);
        setTriggerMessage(null);
    };

    // ─── Trigger analysis (mulai menganalisis) ────────────────────────────────
    const handleTriggerAnalysis = async () => {
        setAnalysisTriggering(true);
        setTriggerMessage(null);
        try {
            const res = await fetch("/api/trigger-analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(heldOfflineData),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setTriggerMessage({ type: "success", text: data.message ?? "Analisis dimulai!" });
                // Poll for new analysis result after 15s
                setTimeout(() => fetchData(true), 15000);
                setTimeout(() => fetchData(true), 45000);
            } else {
                setTriggerMessage({ type: "error", text: data.message ?? "Gagal memicu analisis." });
            }
        } catch (err) {
            setTriggerMessage({ type: "error", text: "Gagal terhubung ke server." });
            console.error("Trigger error:", err);
        } finally {
            setAnalysisTriggering(false);
        }
    };

    // ─── Trigger market analysis ──────────────────────────────────────────────
    const handleTriggerMarket = async () => {
        setMarketTriggering(true);
        setMarketTriggerMsg(null);
        try {
            const res = await fetch("/api/trigger-market", { method: "POST" });
            const data = await res.json();
            if (res.ok && data.success) {
                setMarketTriggerMsg({ type: "success", text: data.message });
                setTimeout(() => fetchData(true), 20000);
                setTimeout(() => fetchData(true), 60000);
            } else {
                setMarketTriggerMsg({ type: "error", text: data.message ?? "Gagal memicu analisis." });
            }
        } catch {
            setMarketTriggerMsg({ type: "error", text: "Gagal terhubung ke server." });
        } finally {
            setMarketTriggering(false);
        }
    };

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setRefreshing(true);
        try {
            const params = new URLSearchParams();

            // Pilih filter berdasarkan tab aktif
            const currentSource = activeTab === "internal" ? filterSource : marketFilterSource;
            const currentSentiment = activeTab === "internal" ? filterSentiment : marketFilterSentiment;

            if (currentSource !== "semua") params.append("source", currentSource);
            if (currentSentiment !== "semua") params.append("sentiment", currentSentiment);

            // Fetch data internal & market analysis secara paralel
            const [fbRes, statsRes, analysisRes, marketRes] = await Promise.all([
                fetch(`/api/feedback?${params.toString()}`),
                fetch("/api/feedback/stats"),
                fetch("/api/feedback/analysis"),
                fetch("/api/market/analysis"),
            ]);

            const [fbData, statsData, analysisData, marketData] = await Promise.all([
                fbRes.json(),
                statsRes.json(),
                analysisRes.json(),
                marketRes.json(),
            ]);

            setFeedbacks(fbData.data ?? []);
            setStats(statsData.data ?? null);
            setAiAnalysis(analysisData.data ?? null);
            setMarketAnalysis(marketData.data ?? null);
            setLastUpdated(new Date());
        } catch (e) {
            console.error("Gagal mengambil data:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, filterSource, filterSentiment, marketFilterSource, marketFilterSentiment]);

    // ─── Fetch on mount & whenever filters/tab change ─────────────────────────
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ─── Fetch fresh market data setiap kali user pindah ke tab market ─────────
    useEffect(() => {
        if (activeTab === "market") {
            fetchData(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);


    // ─── Auto-refresh every 30s ───────────────────────────────────────────────
    useEffect(() => {
        if (!isLive) return;
        const interval = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(interval);
    }, [isLive, fetchData]);

    // ─── Chart data transforms ────────────────────────────────────────────────
    const sentimentChartData = stats
        ? [
            { name: "Positif", value: stats.sentimentCount["positif"] ?? 0 },
            { name: "Negatif", value: stats.sentimentCount["negatif"] ?? 0 },
            { name: "Netral", value: stats.sentimentCount["netral"] ?? 0 },
        ]
        : [];

    const sourceChartData = stats
        ? Object.entries(stats.sourceCount).map(([key, val]) => ({
            name: SOURCE_LABEL[key] ?? key,
            value: val,
        }))
        : [];

    // ─── Dominant sentiment label ─────────────────────────────────────────────
    const sentimentLabel: Record<string, string> = {
        positif: "Positif 😊",
        negatif: "Negatif 😞",
        netral: "Netral 😐",
    };

    const sourceLabel: Record<string, string> = {
        ...SOURCE_LABEL,
    };

    // ─── Format date ──────────────────────────────────────────────────────────
    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return "—";
        try {
            return new Intl.DateTimeFormat("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date(dateStr));
        } catch {
            return dateStr;
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: "100vh", padding: "0 0 48px" }}>

            {/* ── Header ── */}
            <header
                className="glass"
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                    padding: "0 24px",
                    borderBottom: "1px solid var(--border-color)",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    borderRadius: 0,
                }}
            >
                <div
                    style={{
                        maxWidth: 1400,
                        margin: "0 auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        height: 68,
                    }}
                >
                    {/* Logo & title */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 4px 12px var(--border-color)",
                            }}
                        >
                            <MessageSquare size={20} color="white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1
                                className="gradient-text"
                                style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}
                            >
                                RSUD Daya Feedback Hub
                            </h1>
                            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                                Analisis Ulasan Pelanggan Real-Time
                            </p>
                        </div>
                    </div>

                    {/* ── Tab Navigation ── */}
                    <div style={{ display: "flex", gap: 4, background: "var(--bg-secondary)", borderRadius: 12, padding: 4, border: "1px solid var(--border-color)" }}>
                        <button
                            id="tab-internal"
                            onClick={() => setActiveTab("internal")}
                            style={{
                                display: "flex", alignItems: "center", gap: 7,
                                padding: "7px 18px", borderRadius: 9,
                                border: "none", cursor: "pointer",
                                fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                                transition: "all 0.2s",
                                background: activeTab === "internal"
                                    ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))"
                                    : "transparent",
                                color: activeTab === "internal" ? "white" : "var(--text-muted)",
                                boxShadow: activeTab === "internal" ? "0 2px 10px rgba(99,102,241,0.4)" : "none",
                            }}
                        >
                            <MessageSquare size={13} /> Feedback Internal
                        </button>
                        <button
                            id="tab-market"
                            onClick={() => setActiveTab("market")}
                            style={{
                                display: "flex", alignItems: "center", gap: 7,
                                padding: "7px 18px", borderRadius: 9,
                                border: "none", cursor: "pointer",
                                fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                                transition: "all 0.2s",
                                background: activeTab === "market"
                                    ? "linear-gradient(135deg, #0891b2, #0d9488)"
                                    : "transparent",
                                color: activeTab === "market" ? "white" : "var(--text-muted)",
                                boxShadow: activeTab === "market" ? "0 2px 10px rgba(8,145,178,0.4)" : "none",
                            }}
                        >
                            <Telescope size={13} /> Market Intelligence
                        </button>
                    </div>

                    {/* Controls */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: "var(--bg-secondary)",
                                border: "1px solid var(--border-color)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "var(--accent-primary)",
                                transition: "all 0.2s",
                            }}
                            title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
                        >
                            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        {/* Live indicator */}
                        <button
                            onClick={() => setIsLive((v) => !v)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 12px",
                                borderRadius: 8,
                                border: "1px solid",
                                borderColor: isLive ? "rgba(16,185,129,0.3)" : "rgba(0,0,0,0.06)",
                                background: isLive ? "rgba(16,185,129,0.08)" : "rgba(0,0,0,0.03)",
                                cursor: "pointer",
                                fontSize: 11,
                                fontWeight: 700,
                                color: isLive ? "#059669" : "var(--text-muted)",
                                transition: "all 0.2s",
                                fontFamily: "inherit",
                            }}
                        >
                            {isLive ? (
                                <>
                                    <Wifi size={12} />
                                    <span
                                        style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: "50%",
                                            background: "#10b981",
                                        }}
                                        className="pulse-dot"
                                    />
                                    LIVE
                                </>
                            ) : (
                                <>
                                    <WifiOff size={12} />
                                    PAUSED
                                </>
                            )}
                        </button>

                        {/* Last updated */}
                        {lastUpdated && (
                            <span
                                style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}
                            >
                                Diperbarui {formatDate(lastUpdated.toISOString())}
                            </span>
                        )}

                        {/* Refresh */}
                        <button
                            onClick={() => fetchData(false)}
                            disabled={refreshing}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "8px 16px",
                                borderRadius: 8,
                                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                                border: "none",
                                cursor: refreshing ? "not-allowed" : "pointer",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "white",
                                opacity: refreshing ? 0.7 : 1,
                                transition: "all 0.2s",
                                fontFamily: "inherit",
                                boxShadow: "0 4px 12px var(--border-color)",
                            }}
                        >
                            <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                            Segarkan
                        </button>
                    </div>
                </div>
            </header>

            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

            <main style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px 0" }}>
                {activeTab === "internal" && (
                <React.Fragment>
                <div
                    className="stagger-children"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 16,
                        marginBottom: 24,
                    }}
                >
                    {/* Total Feedback */}
                    <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                                    Total Feedback
                                </p>
                                <p className="stat-number gradient-text">
                                    {loading ? "..." : (stats?.total ?? 0)}
                                </p>
                            </div>
                            <div style={{ padding: 10, borderRadius: 10, background: "var(--border-color)", border: "1px solid var(--border-color)" }}>
                                <MessageSquare size={20} color="var(--accent-primary)" />
                            </div>
                        </div>
                        <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
                            Offline RS &amp; Google Maps
                        </p>
                    </div>

                    {/* Sentimen Dominan */}
                    <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                                    Sentimen Dominan
                                </p>
                                <p
                                    className="stat-number"
                                    style={{
                                        fontSize: "1.8rem",
                                        fontWeight: 800,
                                        color:
                                            stats?.dominantSentiment === "positif"
                                                ? "var(--accent-emerald)"
                                                : stats?.dominantSentiment === "negatif"
                                                    ? "var(--accent-rose)"
                                                    : "var(--accent-amber)",
                                    }}
                                >
                                    {loading ? "..." : sentimentLabel[stats?.dominantSentiment ?? "netral"] ?? "Netral"}
                                </p>
                            </div>
                            <div style={{ padding: 10, borderRadius: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                                <TrendingUp size={20} color="var(--accent-emerald)" />
                            </div>
                        </div>
                        <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
                            {loading ? "" : `${stats?.sentimentCount[stats?.dominantSentiment ?? "netral"] ?? 0} ulasan`}
                        </p>
                    </div>

                    {/* Source Paling Aktif */}
                    <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                                    Platform Terbanyak
                                </p>
                                <p className="stat-number" style={{ fontSize: "1.8rem", color: "#06b6d4" }}>
                                    {loading ? "..." : sourceLabel[stats?.dominantSource ?? ""] ?? stats?.dominantSource ?? "—"}
                                </p>
                            </div>
                            <div style={{ padding: 10, borderRadius: 10, background: "var(--border-color)", border: "1px solid var(--border-color)" }}>
                                <Globe size={20} color="var(--accent-cyan)" />
                            </div>
                        </div>
                        <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
                            {loading ? "" : `${stats?.sourceCount[stats?.dominantSource ?? ""] ?? 0} ulasan`}
                        </p>
                    </div>
                </div>

                {/* ── Offline Data Upload Section ── */}
                <div style={{ marginBottom: 20 }}>
                    <button
                        id="btn-upload-offline"
                        onClick={() => {
                            setShowUploadModal(true);
                            setUploadFile(null);
                            setParsedRows([]);
                            setParseError(null);
                        }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "16px 24px",
                            borderRadius: 16,
                            background: heldOfflineData.length > 0
                                ? "linear-gradient(135deg, #059669, #0d9488)"
                                : "linear-gradient(135deg, var(--bg-secondary), var(--bg-secondary))",
                            border: heldOfflineData.length > 0 ? "none" : "1px solid var(--border-color)",
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 700,
                            color: heldOfflineData.length > 0 ? "white" : "var(--text-primary)",
                            fontFamily: "inherit",
                            boxShadow: heldOfflineData.length > 0 ? "0 6px 20px rgba(13,148,136,0.3)" : "none",
                            transition: "all 0.2s",
                            width: "100%",
                            justifyContent: "center",
                        }}
                    >
                        {heldOfflineData.length > 0 ? (
                            <><FileCheck2 size={18} /> {heldOfflineData.length} Data Offline Siap Dianalisis ✓</>
                        ) : (
                            <><Upload size={18} /> Klik untuk Upload Data Feedback Offline (CSV)</>
                        )}
                    </button>
                </div>

                {/* ── Trigger Analysis Banner ── */}
                <div
                    style={{
                        marginBottom: 24,
                        borderRadius: 16,
                        overflow: "hidden",
                        border: "1px solid rgba(139,92,246,0.2)",
                        background: "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(236,72,153,0.04) 100%)",
                    }}
                >
                    <div
                        style={{
                            padding: "20px 28px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 16,
                            flexWrap: "wrap",
                        }}
                    >
                        {/* Left: info */}
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                                    Mulai Analisis AI Terpadu
                                </p>
                                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                    {heldOfflineData.length > 0
                                        ? `Siap memulai: data online (scraping) + ${heldOfflineData.length} data offline akan dianalisis bersama.`
                                        : "Klik untuk memulai scraping online dan analisis AI. Atau upload CSV dulu untuk sertakan data offline."}
                                </p>
                            </div>
                        </div>

                        {/* Right: status + button */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                            {/* Trigger result message */}
                            {triggerMessage && (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "8px 14px",
                                        borderRadius: 8,
                                        background: triggerMessage.type === "success"
                                            ? "rgba(16,185,129,0.1)"
                                            : "rgba(239,68,68,0.1)",
                                        border: `1px solid ${triggerMessage.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                                        color: triggerMessage.type === "success" ? "#059669" : "#ef4444",
                                        maxWidth: 320,
                                    }}
                                >
                                    {triggerMessage.type === "success"
                                        ? <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                                        : <AlertTriangle size={14} style={{ flexShrink: 0 }} />}
                                    <p style={{ fontSize: 12, fontWeight: 500 }}>{triggerMessage.text}</p>
                                </div>
                            )}

                            {/* The big CTA button */}
                            <button
                                id="btn-start-analysis"
                                onClick={handleTriggerAnalysis}
                                disabled={analysisTriggering}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "12px 28px",
                                    borderRadius: 12,
                                    background: analysisTriggering
                                        ? "var(--bg-secondary)"
                                        : "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                                    border: analysisTriggering ? "1px solid var(--border-color)" : "none",
                                    cursor: analysisTriggering ? "not-allowed" : "pointer",
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: analysisTriggering ? "var(--text-muted)" : "white",
                                    transition: "all 0.2s",
                                    fontFamily: "inherit",
                                    boxShadow: analysisTriggering
                                        ? "none"
                                        : "0 6px 24px rgba(124,58,237,0.45)",
                                    letterSpacing: "0.02em",
                                }}
                            >
                                {analysisTriggering ? (
                                    <>
                                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                        Memulai Analisis...
                                    </>
                                ) : (
                                    <>
                                        Mulai Menganalisis
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* If held data, show pill */}
                    {heldOfflineData.length > 0 && (
                        <div
                            style={{
                                borderTop: "1px dashed rgba(139,92,246,0.15)",
                                padding: "10px 28px",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <FileCheck2 size={13} color="#059669" />
                            <p style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>
                                {heldOfflineData.length} baris data offline siap ikut dianalisis
                            </p>
                            <button
                                onClick={() => setHeldOfflineData([])}
                                style={{
                                    marginLeft: "auto",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: 11,
                                    color: "var(--text-muted)",
                                    fontFamily: "inherit",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                }}
                            >
                                <X size={11} /> Hapus data offline
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Charts Row ── */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                        marginBottom: 24,
                    }}
                >
                    {/* Pie Chart */}
                    <div className="glass-card" style={{ padding: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                            <PieChart size={16} color="var(--accent-secondary)" />
                            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                                Distribusi Sentimen
                            </h2>
                        </div>
                        <SentimentPieChart data={sentimentChartData} />
                    </div>

                    {/* Bar Chart */}
                    <div className="glass-card" style={{ padding: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                            <BarChart3 size={16} color="var(--accent-cyan)" />
                            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                                Distribusi Platform
                            </h2>
                        </div>
                        <SourceBarChart data={sourceChartData} />
                    </div>
                </div>

                {/* ── AI Analysis Card ── */}
                <div
                    className="glass-card"
                    style={{
                        marginBottom: 24,
                        padding: 0,
                        overflow: "hidden",
                    }}
                >
                    {/* Card Header */}
                    <div
                        style={{
                            padding: "20px 24px",
                            borderBottom: aiAnalysis && analysisExpanded ? "1px solid rgba(139,92,246,0.2)" : "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            userSelect: "none",
                        }}
                        onClick={() => setAnalysisExpanded((v) => !v)}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {/* Glowing icon */}
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    background: "linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
                                    flexShrink: 0,
                                }}
                            >
                                <Bot size={18} color="white" />
                            </div>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                                        Analisis AI Terpadu
                                    </h2>
                                    <span
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            padding: "2px 7px",
                                            borderRadius: 99,
                                            background: "var(--border-color)",
                                            color: "var(--accent-secondary)",
                                            letterSpacing: "0.05em",
                                        }}
                                    >
                                        GPT-4.1
                                    </span>
                                </div>
                                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                    {aiAnalysis
                                        ? `Berdasarkan ${aiAnalysis.feedbackCount} komentar dari ${aiAnalysis.sources.length} platform`
                                        : "Laporan konsolidasi belum tersedia"}
                                </p>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {/* Timestamp */}
                            {aiAnalysis && (
                                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-muted)" }}>
                                    <Clock size={11} />
                                    <span style={{ fontSize: 11 }}>{formatDate(aiAnalysis.generatedAt)}</span>
                                </div>
                            )}
                            {/* Source badges */}
                            {aiAnalysis && (
                                <div style={{ display: "flex", gap: 4 }}>
                                    {aiAnalysis.sources.map((s) => (
                                        <SourceBadge key={s} source={s} />
                                    ))}
                                </div>
                            )}
                            {/* Toggle */}
                            <div
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 8,
                                    background: "var(--border-color)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "var(--accent-secondary)",
                                    transition: "all 0.2s",
                                }}
                            >
                                {analysisExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                        </div>
                    </div>

                    {/* Card Body - Expanded */}
                    {analysisExpanded && (
                        <div style={{ padding: 24 }}>
                            {!aiAnalysis ? (
                                <div
                                    style={{
                                        textAlign: "center",
                                        padding: "32px 0",
                                        color: "var(--text-muted)",
                                    }}
                                >
                                    <Sparkles size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                                    <p style={{ fontSize: 14, marginBottom: 6 }}>Belum ada laporan AI tersedia.</p>
                                    <p style={{ fontSize: 12 }}>
                                        Jalankan workflow n8n untuk menghasilkan analisis konsolidasi.
                                    </p>
                                </div>
                            ) : (
                                <AIReportRenderer report={aiAnalysis.report} />
                            )}
                        </div>
                    )}
                </div>

                {/* ── Data Table ── */}
                <div className="glass-card" style={{ padding: 24 }}>
                    {/* Table header */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 16,
                            flexWrap: "wrap",
                            gap: 12,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Table2 size={16} color="var(--accent-primary)" />
                            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                                Data Ulasan Internal
                            </h2>
                            <span
                                style={{
                                    fontSize: 11,
                                    background: "var(--bg-secondary)",
                                    color: "var(--accent-primary)",
                                    padding: "2px 8px",
                                    borderRadius: 99,
                                    fontWeight: 600,
                                    border: "1px solid var(--border-color)",
                                }}
                            >
                                {feedbacks.filter(f => ["offline_rs", "google_maps"].includes(f.source)).length} hasil
                            </span>
                        </div>

                        {/* Filters */}
                        <div style={{ display: "flex", gap: 8 }}>
                            <FilterSelect
                                value={filterSource}
                                onChange={setFilterSource}
                                options={[
                                    { value: "semua", label: "Semua Platform Internal" },
                                    { value: "offline_rs", label: "Offline RS (CSV)" },
                                    { value: "google_maps", label: "Google Maps" },
                                ]}
                            />
                            <FilterSelect
                                value={filterSentiment}
                                onChange={setFilterSentiment}
                                options={[
                                    { value: "semua", label: "Semua Sentimen" },
                                    { value: "positif", label: "Positif" },
                                    { value: "netral", label: "Netral" },
                                    { value: "negatif", label: "Negatif" },
                                ]}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
                            <div style={{ fontSize: 13 }}>Memuat data...</div>
                        </div>
                    ) : feedbacks.filter(f => ["offline_rs", "google_maps"].includes(f.source)).length === 0 ? (
                        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
                            <Table2 size={32} style={{ margin: "0 auto 12px", opacity: 0.2, display: "block" }} />
                            <p style={{ fontSize: 14 }}>Belum ada data ulasan internal.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Platform</th>
                                        <th>Komentar</th>
                                        <th>Tanggal</th>
                                        <th>Rating</th>
                                        <th>Sentimen</th>
                                        <th>Skala Prioritas</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {feedbacks
                                        .filter(f => ["offline_rs", "google_maps"].includes(f.source))
                                        .map((fb) => (
                                            <tr key={fb.id}>
                                                <td>
                                                    <SourceBadge source={fb.source} />
                                                </td>
                                                <td style={{ maxWidth: 300 }}>
                                                    <p
                                                        style={{
                                                            color: "var(--text-primary)",
                                                            fontSize: 13,
                                                            lineHeight: 1.5,
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: "vertical",
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        {fb.comment}
                                                    </p>
                                                </td>
                                                <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                                                    {formatDate(fb.date)}
                                                </td>
                                                <td>
                                                    <RatingDisplay rating={fb.rating} />
                                                </td>
                                                <td>
                                                    <SentimentBadge sentiment={fb.sentiment} />
                                                </td>
                                                <td>
                                                    <TriageBadge priority={fb.triage} />
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() =>
                                                            setSelectedRow(selectedRow?.id === fb.id ? null : fb)
                                                        }
                                                        style={{
                                                            background: "var(--bg-secondary)",
                                                            border: "1px solid var(--border-color)",
                                                            borderRadius: 6,
                                                            color: "var(--accent-primary)",
                                                            cursor: "pointer",
                                                            padding: "4px 8px",
                                                            fontSize: 11,
                                                            fontFamily: "inherit",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 3,
                                                            transition: "all 0.2s",
                                                        }}
                                                    >
                                                        <Info size={11} /> Detail
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Detail Modal ── */}
                {selectedRow && (
                    <div
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(15,23,42,0.4)",
                            backdropFilter: "blur(6px)",
                            zIndex: 200,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 24,
                        }}
                        onClick={() => setSelectedRow(null)}
                    >
                        <div
                            className="glass-card"
                            style={{ maxWidth: 560, width: "100%", padding: 28 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <SourceBadge source={selectedRow.source} />
                                    <SentimentBadge sentiment={selectedRow.sentiment} />
                                </div>
                                <button
                                    onClick={() => setSelectedRow(null)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--text-muted)",
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                                    Komentar
                                </p>
                                <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>
                                    {selectedRow.comment}
                                </p>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <div>
                                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Tanggal</p>
                                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{formatDate(selectedRow.date)}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Rating</p>
                                    <RatingDisplay rating={selectedRow.rating} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Upload Offline Modal ── */}
                {showUploadModal && (
                    <div
                        id="modal-upload-offline"
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(10,17,35,0.55)",
                            backdropFilter: "blur(8px)",
                            zIndex: 300,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 24,
                        }}
                        onClick={() => setShowUploadModal(false)}
                    >
                        <div
                            className="glass-card"
                            style={{
                                maxWidth: 660,
                                width: "100%",
                                padding: 0,
                                overflow: "hidden",
                                maxHeight: "90vh",
                                display: "flex",
                                flexDirection: "column",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div
                                style={{
                                    padding: "22px 28px",
                                    borderBottom: "1px solid var(--border-color)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    background: "linear-gradient(135deg, rgba(14,165,233,0.06), rgba(99,102,241,0.06))",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 12,
                                            background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                                        }}
                                    >
                                        <FileSpreadsheet size={20} color="white" />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                                            Upload Data Feedback Offline
                                        </h2>
                                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                            CSV dengan header: <code style={{ background: "var(--bg-secondary)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>Nama, Ulasan/Keluhan, Tanggal</code>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    id="btn-close-upload-modal"
                                    onClick={() => setShowUploadModal(false)}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: 28, overflowY: "auto", flex: 1 }}>

                                {/* Drop Zone */}
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setDragOver(false);
                                        const file = e.dataTransfer.files[0];
                                        if (file) handleFile(file);
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: `2px dashed ${dragOver ? "#6366f1" : "var(--border-color)"}`,
                                        borderRadius: 14,
                                        padding: "36px 20px",
                                        textAlign: "center",
                                        cursor: "pointer",
                                        background: dragOver ? "rgba(99,102,241,0.06)" : "var(--bg-secondary)",
                                        transition: "all 0.2s",
                                        marginBottom: 20,
                                    }}
                                >
                                    <input
                                        ref={fileInputRef}
                                        id="input-csv-file"
                                        type="file"
                                        accept=".csv"
                                        style={{ display: "none" }}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFile(file);
                                        }}
                                    />
                                    <CloudUpload
                                        size={42}
                                        style={{
                                            margin: "0 auto 12px",
                                            color: dragOver ? "#6366f1" : "var(--text-muted)",
                                            opacity: 0.7,
                                            display: "block",
                                        }}
                                    />
                                    {uploadFile ? (
                                        <>
                                            <p style={{ fontSize: 14, fontWeight: 600, color: "#6366f1" }}>
                                                ✓ {uploadFile.name}
                                            </p>
                                            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                                                {parsedRows.length} baris data ditemukan — klik untuk ganti file
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                                                Drag &amp; drop atau klik untuk memilih file
                                            </p>
                                            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                                                Hanya file <strong>.csv</strong> yang diterima
                                            </p>
                                        </>
                                    )}
                                </div>

                                {/* Parse Error */}
                                {parseError && (
                                    <div
                                        style={{
                                            background: "rgba(239,68,68,0.08)",
                                            border: "1px solid rgba(239,68,68,0.25)",
                                            borderRadius: 10,
                                            padding: "12px 16px",
                                            marginBottom: 20,
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: 10,
                                            color: "#ef4444",
                                        }}
                                    >
                                        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                                        <p style={{ fontSize: 13 }}>{parseError}</p>
                                    </div>
                                )}

                                {/* Data Preview Table */}
                                {parsedRows.length > 0 && (
                                    <div style={{ marginBottom: 20 }}>
                                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                                            Preview Data ({parsedRows.length} baris)
                                        </p>
                                        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--border-color)" }}>
                                            <table className="data-table" style={{ marginBottom: 0 }}>
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Nama Petugas</th>
                                                        <th>Isi Keluhan</th>
                                                        <th>Tanggal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parsedRows.slice(0, 5).map((row, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{idx + 1}</td>
                                                            <td style={{ fontSize: 12 }}>{row.namaPetugas || <em style={{ opacity: 0.5 }}>—</em>}</td>
                                                            <td style={{ fontSize: 12, maxWidth: 280 }}>
                                                                <p style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                                                    {row.isiKeluhan}
                                                                </p>
                                                            </td>
                                                            <td style={{ fontSize: 11, whiteSpace: "nowrap", color: "var(--text-muted)" }}>{row.tanggal}</td>
                                                        </tr>
                                                    ))}
                                                    {parsedRows.length > 5 && (
                                                        <tr>
                                                            <td colSpan={4} style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", padding: "8px 0" }}>
                                                                ... dan {parsedRows.length - 5} baris lainnya
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}


                            </div>

                            {/* Modal Footer */}
                            <div
                                style={{
                                    padding: "18px 28px",
                                    borderTop: "1px solid var(--border-color)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    background: "var(--bg-secondary)",
                                }}
                            >
                                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                    {parsedRows.length > 0
                                        ? `${parsedRows.length} baris data siap dikonfirmasi`
                                        : "Pilih file CSV untuk memulai"}
                                </p>
                                <div style={{ display: "flex", gap: 10 }}>
                                    <button
                                        id="btn-cancel-upload"
                                        onClick={() => setShowUploadModal(false)}
                                        style={{
                                            padding: "8px 18px",
                                            borderRadius: 8,
                                            border: "1px solid var(--border-color)",
                                            background: "transparent",
                                            color: "var(--text-secondary)",
                                            cursor: "pointer",
                                            fontSize: 12,
                                            fontFamily: "inherit",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        id="btn-submit-upload"
                                        onClick={handleConfirmOfflineData}
                                        disabled={parsedRows.length === 0}
                                        style={{
                                            padding: "8px 20px",
                                            borderRadius: 8,
                                            background: parsedRows.length > 0
                                                ? "linear-gradient(135deg, #0ea5e9, #6366f1)"
                                                : "var(--bg-secondary)",
                                            border: "none",
                                            color: parsedRows.length > 0 ? "white" : "var(--text-muted)",
                                            cursor: parsedRows.length === 0 ? "not-allowed" : "pointer",
                                            fontSize: 12,
                                            fontFamily: "inherit",
                                            fontWeight: 700,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 7,
                                            boxShadow: parsedRows.length > 0 ? "0 4px 14px rgba(99,102,241,0.35)" : "none",
                                            transition: "all 0.2s",
                                        }}
                                    >
                                        <FileCheck2 size={13} /> Konfirmasi & Simpan
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── n8n Integration Info Banner ── */}
                <div style={{ maxWidth: 1400, margin: "24px auto 0", padding: "0 24px" }}>
                    <div style={{ background: "rgba(79,70,229,0.04)", border: "1px solid rgba(79,70,229,0.08)", borderRadius: 16, padding: "16px 24px", display: "flex", flexDirection: "column", gap: 6 }}>
                    </div>
                </div>
                </React.Fragment>
                )} {/* end activeTab === 'internal' */}

                {/* ══════════════════════════════════════════════════════════════ */}
                {/* ── Market Intelligence Tab ─────────────────────────────────── */}
                {/* ══════════════════════════════════════════════════════════════ */}
                {activeTab === "market" && (
                <div style={{ animation: "fadeInUp 0.35s ease-out" }}>

                    {/* Hero Header */}
                    <div style={{
                        marginBottom: 28,
                        borderRadius: 20,
                        overflow: "hidden",
                        background: "linear-gradient(135deg, rgba(8,145,178,0.10) 0%, rgba(13,148,136,0.08) 50%, rgba(99,102,241,0.06) 100%)",
                        border: "1px solid rgba(8,145,178,0.2)",
                        padding: "32px 36px",
                        position: "relative",
                    }}>
                        {/* Glow strip */}
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #0891b2, #0d9488, #6366f1)" }} />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                                <div style={{
                                    width: 60, height: 60, borderRadius: 16,
                                    background: "linear-gradient(135deg, #0891b2, #0d9488)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    boxShadow: "0 8px 24px rgba(8,145,178,0.4)",
                                }}>
                                    <Telescope size={28} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2 }}>
                                        Market Intelligence
                                    </h2>
                                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                                        Tren kesehatan &amp; sentimen masyarakat dari TikTok, Instagram, Google Maps &amp; Facebook
                                    </p>
                                </div>
                            </div>

                            {/* Trigger Button */}
                            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                                {marketTriggerMsg && (
                                    <div style={{
                                        display: "flex", alignItems: "center", gap: 8,
                                        padding: "9px 16px", borderRadius: 10,
                                        background: marketTriggerMsg.type === "success" ? "rgba(8,145,178,0.1)" : "rgba(239,68,68,0.1)",
                                        border: `1px solid ${marketTriggerMsg.type === "success" ? "rgba(8,145,178,0.3)" : "rgba(239,68,68,0.3)"}`,
                                        color: marketTriggerMsg.type === "success" ? "#0891b2" : "#ef4444",
                                        maxWidth: 340,
                                    }}>
                                        {marketTriggerMsg.type === "success" ? <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> : <ShieldAlert size={14} style={{ flexShrink: 0 }} />}
                                        <p style={{ fontSize: 12, fontWeight: 500 }}>{marketTriggerMsg.text}</p>
                                    </div>
                                )}
                                <button
                                    id="btn-start-market"
                                    onClick={handleTriggerMarket}
                                    disabled={marketTriggering}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 10,
                                        padding: "13px 30px", borderRadius: 14,
                                        background: marketTriggering ? "var(--bg-secondary)" : "linear-gradient(135deg, #0891b2 0%, #0d9488 100%)",
                                        border: marketTriggering ? "1px solid var(--border-color)" : "none",
                                        cursor: marketTriggering ? "not-allowed" : "pointer",
                                        fontSize: 14, fontWeight: 700, color: marketTriggering ? "var(--text-muted)" : "white",
                                        fontFamily: "inherit",
                                        boxShadow: marketTriggering ? "none" : "0 6px 24px rgba(8,145,178,0.45)",
                                        transition: "all 0.2s",
                                        letterSpacing: "0.02em",
                                    }}>
                                    {marketTriggering
                                        ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Menganalisis Pasar...</>
                                        : <> Mulai Analisis Market</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Card Statistik Market ── */}
                    <div
                        className="stagger-children"
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: 16,
                            marginBottom: 24,
                        }}
                    >
                        {/* Total Feedback Market */}
                        <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                                        Total Feedback
                                    </p>
                                    <p className="stat-number gradient-text" style={{ background: "linear-gradient(135deg, #0891b2, #0d9488)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                        {loading ? "..." : (marketAnalysis?.commentCount ?? 0)}
                                    </p>
                                </div>
                                <div style={{ padding: 10, borderRadius: 10, background: "rgba(8,145,178,0.1)", border: "1px solid rgba(8,145,178,0.2)" }}>
                                    <MessageSquare size={20} color="#0891b2" />
                                </div>
                            </div>
                            <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                                {marketAnalysis && <Clock size={12} />}
                                {marketAnalysis 
                                    ? `Diperbarui: ${new Date(marketAnalysis.generatedAt).toLocaleString("id-ID")}`
                                    : "Belum ada data."}
                            </p>
                        </div>

                        {/* Platform Market */}
                        <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                                        Platform
                                    </p>
                                    <p className="stat-number" style={{ fontSize: "1.4rem", color: "#06b6d4" }}>
                                        {loading ? "..." : (marketAnalysis?.platforms?.join(', ') || "—")}
                                    </p>
                                </div>
                                <div style={{ padding: 10, borderRadius: 10, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
                                    <Globe size={20} color="#06b6d4" />
                                </div>
                            </div>
                            <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
                                Sumber data terhubung
                            </p>
                        </div>
                    </div>

                    {/* Market AI Report Card */}
                    <div className="glass-card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
                        {/* Card Header */}
                        <div
                            style={{
                                padding: "20px 28px",
                                borderBottom: marketAnalysis && marketReportExpanded ? "1px solid rgba(8,145,178,0.2)" : "none",
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                cursor: "pointer", userSelect: "none",
                                background: "linear-gradient(135deg, rgba(8,145,178,0.04) 0%, rgba(13,148,136,0.03) 100%)",
                            }}
                            onClick={() => setMarketReportExpanded(v => !v)}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 11,
                                    background: "linear-gradient(135deg, #0891b2, #0d9488)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    boxShadow: "0 4px 14px rgba(8,145,178,0.35)",
                                }}>
                                    <Bot size={18} color="white" />
                                </div>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Laporan AI Market Intelligence</h3>
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "rgba(8,145,178,0.1)", color: "#0891b2", border: "1px solid rgba(8,145,178,0.2)", letterSpacing: "0.05em" }}>GPT-4o-mini</span>
                                    </div>
                                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                        {refreshing ? "Memuat laporan..." : marketAnalysis ? `Analisis dari ${marketAnalysis.commentCount || "?"} komentar sosial media` : "Belum ada laporan market — klik tombol di atas untuk mulai"}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                {marketAnalysis && (
                                    <div style={{ display: "flex", gap: 4 }}>
                                        {(marketAnalysis.platforms || []).map(pl => <SourceBadge key={pl} source={pl} />)}
                                    </div>
                                )}
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(8,145,178,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0891b2" }}>
                                    {marketReportExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                            </div>
                        </div>

                        {/* Card Body */}
                        {marketReportExpanded && (
                            <div style={{ padding: 28 }}>
                                {refreshing ? (
                                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                                        <Loader2 size={32} style={{ margin: "0 auto 12px", opacity: 0.4, animation: "spin 1s linear infinite", display: "block" }} />
                                        <p style={{ fontSize: 14 }}>Memuat laporan market...</p>
                                    </div>
                                ) : !marketAnalysis ? (
                                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                                        <Telescope size={42} style={{ margin: "0 auto 12px", opacity: 0.2, display: "block" }} />
                                        <p style={{ fontSize: 14, marginBottom: 6 }}>Belum ada data market intelligence.</p>
                                        <p style={{ fontSize: 12 }}>Klik tombol "Mulai Analisis Market" untuk memulai scraping &amp; analisis.</p>
                                    </div>
                                ) : (
                                    <MarketReportRenderer report={marketAnalysis.report} />
                                )}
                            </div>
                        )}
                    </div>
                    {/* ── Tabel Data Ulasan Hasil Analisis AI ── */}
                    <div className="glass-card" style={{ padding: 24, border: "1px solid rgba(8,145,178,0.15)" }}>
                        {/* Table header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #0891b2, #0d9488)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Table2 size={15} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
                                        Data Komentar Hasil Analisis AI
                                    </h2>
                                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Per-komentar dari TikTok, Instagram, Facebook &amp; Google Maps</p>
                                </div>
                                <span style={{ fontSize: 11, background: "rgba(8,145,178,0.06)", color: "#0891b2", padding: "2px 10px", borderRadius: 99, fontWeight: 600, border: "1px solid rgba(8,145,178,0.2)" }}>
                                    {(marketAnalysis?.analyzed_comments ?? []).length} komentar
                                </span>
                            </div>
                        </div>

                        {/* Table body */}
                        {!marketAnalysis || !marketAnalysis.analyzed_comments || marketAnalysis.analyzed_comments.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "52px 0", color: "var(--text-muted)" }}>
                                <MessageSquare size={36} style={{ margin: "0 auto 14px", opacity: 0.18, display: "block" }} />
                                <p style={{ fontSize: 14, fontWeight: 600 }}>Belum ada data komentar teranalisis.</p>
                                <p style={{ fontSize: 12, marginTop: 6 }}>Klik <strong style={{ color: "#0891b2" }}>Mulai Analisis Market</strong> untuk mengambil &amp; menganalisis komentar sosial media.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 32 }}>#</th>
                                            <th>Komentar</th>
                                            <th style={{ width: 110 }}>Sentimen</th>
                                            <th style={{ width: 160 }}>Topik</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {marketAnalysis.analyzed_comments.map((row, idx) => (
                                            <tr key={idx}>
                                                <td style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>
                                                    {idx + 1}
                                                </td>
                                                <td style={{ maxWidth: 420 }}>
                                                    <p style={{
                                                        color: "var(--text-primary)",
                                                        fontSize: 13,
                                                        lineHeight: 1.55,
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 3,
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden",
                                                    }}>
                                                        {row.comment}
                                                    </p>
                                                </td>
                                                <td>
                                                    <SentimentBadge sentiment={row.sentiment as "positif" | "negatif" | "netral" | undefined} />
                                                </td>
                                                <td>
                                                    <span style={{
                                                        display: "inline-block",
                                                        padding: "3px 10px",
                                                        borderRadius: 99,
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        background: "rgba(8,145,178,0.08)",
                                                        color: "#0891b2",
                                                        border: "1px solid rgba(8,145,178,0.2)",
                                                        whiteSpace: "nowrap",
                                                    }}>
                                                        {row.topic}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
                )} {/* end activeTab === 'market' */}

            </main>
        </div>
    );
}

// ─── AI Report Renderer ────────────────────────────────────────────────────────
// Parse dan render laporan AI dengan section yang diberi warna berbeda
function AIReportRenderer({ report }: { report: string }) {
    const sections = parseAIReport(report);

    const sectionConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
        "RINGKASAN UMUM": {
            icon: <Sparkles size={14} />,
            color: "var(--accent-primary)",
            bg: "var(--bg-secondary)",
        },
        "SENTIMEN DOMINAN": {
            icon: <TrendingUp size={14} />,
            color: "var(--accent-emerald)",
            bg: "var(--bg-secondary)",
        },
        "TEMUAN UTAMA PELANGGAN": {
            icon: <CheckCircle2 size={14} />,
            color: "var(--accent-cyan)",
            bg: "var(--bg-secondary)",
        },
        "MASALAH KRITIS (JIKA ADA)": {
            icon: <AlertTriangle size={14} />,
            color: "var(--accent-rose)",
            bg: "var(--bg-secondary)",
        },
        "PELUANG PENINGKATAN": {
            icon: <Lightbulb size={14} />,
            color: "var(--accent-amber)",
            bg: "var(--bg-secondary)",
        },
        "PRIORITAS PENANGANAN (TRIASE)": {
            icon: <AlertTriangle size={14} />,
            color: "#ef4444",
            bg: "rgba(239, 68, 68, 0.05)",
        },
        "REKOMENDASI PRAKTIS": {
            icon: <Zap size={14} />,
            color: "var(--accent-secondary)",
            bg: "var(--bg-secondary)",
        },
    };

    if (sections.length === 0) {
        // Fallback: render as plain pre-formatted text
        return (
            <pre
                style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    fontFamily: "inherit",
                    margin: 0,
                }}
            >
                {report}
            </pre>
        );
    }

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            {sections.map(({ title, content }) => {
                const cfg = sectionConfig[title] ?? {
                    icon: <Bot size={14} />,
                    color: "#8b5cf6",
                    bg: "rgba(139,92,246,0.08)",
                };

                // ── Special highlight for REKOMENDASI PRAKTIS ──────────────
                const isRekomendasi = title === "REKOMENDASI PRAKTIS";

                return (
                    <div
                        key={title}
                        style={{
                            background: isRekomendasi
                                ? "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(251,191,36,0.10) 100%)"
                                : cfg.bg,
                            border: isRekomendasi
                                ? "1.5px solid rgba(251,191,36,0.45)"
                                : `1px solid ${cfg.color}33`,
                            borderRadius: isRekomendasi ? 14 : 10,
                            padding: isRekomendasi ? 22 : 16,
                            gridColumn: isRekomendasi ? "1 / -1" : undefined,
                            boxShadow: isRekomendasi
                                ? "0 4px 24px rgba(124,58,237,0.12), 0 0 0 1px rgba(251,191,36,0.12)"
                                : undefined,
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        {/* Gold shimmer strip for rekomendasi */}
                        {isRekomendasi && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 3,
                                    background: "linear-gradient(90deg, #7c3aed, #f59e0b, #7c3aed)",
                                    backgroundSize: "200% 100%",
                                }}
                            />
                        )}

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: isRekomendasi ? 14 : 10,
                                color: isRekomendasi ? "#f59e0b" : cfg.color,
                            }}
                        >
                            {isRekomendasi ? <Zap size={16} fill="#f59e0b" color="#f59e0b" /> : cfg.icon}
                            <span
                                style={{
                                    fontSize: isRekomendasi ? 13 : 11,
                                    fontWeight: 800,
                                    letterSpacing: "0.07em",
                                    textTransform: "uppercase",
                                    background: isRekomendasi
                                        ? "linear-gradient(90deg, #7c3aed, #f59e0b)"
                                        : undefined,
                                    WebkitBackgroundClip: isRekomendasi ? "text" : undefined,
                                    WebkitTextFillColor: isRekomendasi ? "transparent" : undefined,
                                    color: isRekomendasi ? undefined : cfg.color,
                                }}
                            >
                                {title}
                            </span>
                            {isRekomendasi && (
                                <span
                                    style={{
                                        marginLeft: 6,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        borderRadius: 99,
                                        background: "linear-gradient(90deg, rgba(124,58,237,0.15), rgba(251,191,36,0.15))",
                                        border: "1px solid rgba(251,191,36,0.3)",
                                        color: "#f59e0b",
                                        letterSpacing: "0.05em",
                                    }}
                                >
                                    ★ PRIORITAS MANAJEMEN
                                </span>
                            )}
                        </div>
                        <div
                            style={{
                                fontSize: isRekomendasi ? 14 : 13,
                                color: "var(--text-secondary)",
                                lineHeight: 1.8,
                                whiteSpace: "pre-wrap",
                                fontWeight: isRekomendasi ? 500 : undefined,
                            }}
                        >
                            {content}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Parse "SECTION TITLE:\ncontent" pattern dari AI output
function parseAIReport(report: string): { title: string; content: string }[] {
    const knownSections = [
        "RINGKASAN UMUM",
        "SENTIMEN DOMINAN",
        "TEMUAN UTAMA PELANGGAN",
        "MASALAH KRITIS (JIKA ADA)",
        "PELUANG PENINGKATAN",
        "PRIORITAS PENANGANAN (TRIASE)",
        "REKOMENDASI PRAKTIS",
    ];

    const results: { title: string; content: string }[] = [];
    let remaining = report;

    for (let i = 0; i < knownSections.length; i++) {
        const section = knownSections[i];
        const nextSection = knownSections[i + 1];
        const startIdx = remaining.indexOf(section + ":");
        if (startIdx === -1) continue;

        const contentStart = startIdx + section.length + 1; // skip ":"
        const nextIdx = nextSection ? remaining.indexOf(nextSection + ":") : remaining.length;
        const content = remaining.slice(contentStart, nextIdx === -1 ? undefined : nextIdx).trim();

        if (content) {
            results.push({ title: section, content });
        }
    }

    return results;
}

// ─── Market Report Renderer ────────────────────────────────────────────────────
// Renders the market intelligence AI report with teal/cyan sections
function MarketReportRenderer({ report }: { report: string }) {
    const sections = parseMarketReport(report);

    const sectionConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
        "KEY INSIGHTS": {
            icon: <TrendingUp size={14} />,
            color: "#0891b2",
            bg: "rgba(8,145,178,0.06)",
            border: "rgba(8,145,178,0.2)",
        },
        "THREATS & OPPORTUNITIES": {
            icon: <ShieldAlert size={14} />,
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.06)",
            border: "rgba(245,158,11,0.2)",
        },
        "REKOMENDASI PENINGKATAN LAYANAN": {
            icon: <Zap size={14} />,
            color: "#0d9488",
            bg: "linear-gradient(135deg, rgba(8,145,178,0.10), rgba(13,148,136,0.08))",
            border: "rgba(13,148,136,0.3)",
        },
        "REKOMENDASI PENINGKATAN MARKETING": {
            icon: <Sparkles size={14} />,
            color: "#6366f1",
            bg: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))",
            border: "rgba(99,102,241,0.3)",
        },
        // ← legacy header kept for backward-compat
        "REKOMENDASI STRATEGIS": {
            icon: <Zap size={14} />,
            color: "#0d9488",
            bg: "linear-gradient(135deg, rgba(8,145,178,0.10), rgba(13,148,136,0.08))",
            border: "rgba(13,148,136,0.3)",
        },
    };

    if (sections.length === 0) {
        return (
            <pre style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
                {report}
            </pre>
        );
    }

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
            {sections.map(({ title, content }) => {
                const cfg = sectionConfig[title] ?? { icon: <Bot size={14} />, color: "#0891b2", bg: "rgba(8,145,178,0.06)", border: "rgba(8,145,178,0.2)" };
                const isRekomendasi = title === "REKOMENDASI STRATEGIS"
                    || title === "REKOMENDASI PENINGKATAN LAYANAN"
                    || title === "REKOMENDASI PENINGKATAN MARKETING";
                return (
                    <div key={title} style={{
                        background: cfg.bg,
                        border: `1.5px solid ${cfg.border}`,
                        borderRadius: isRekomendasi ? 16 : 12,
                        padding: isRekomendasi ? 24 : 18,
                        gridColumn: isRekomendasi ? "1 / -1" : undefined,
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: isRekomendasi ? "0 4px 24px rgba(13,148,136,0.12)" : undefined,
                    }}>
                        {isRekomendasi && (
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${cfg.color}, #0d9488, #6366f1)` }} />
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isRekomendasi ? 14 : 10, color: cfg.color }}>
                            {cfg.icon}
                            <span style={{ fontSize: isRekomendasi ? 12 : 11, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: cfg.color }}>
                                {title}
                            </span>
                            {isRekomendasi && (
                                <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${cfg.color}22`, border: `1px solid ${cfg.border}`, color: cfg.color, letterSpacing: "0.05em" }}>
                                    ★ AKSI STRATEGIS
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: isRekomendasi ? 14 : 13, color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre-wrap", fontWeight: isRekomendasi ? 500 : undefined }}>
                            {content}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function parseMarketReport(report: string): { title: string; content: string }[] {
    const knownSections = [
        "KEY INSIGHTS",
        "THREATS & OPPORTUNITIES",
        "REKOMENDASI PENINGKATAN LAYANAN",
        "REKOMENDASI PENINGKATAN MARKETING",
        // ← legacy header, kept for backward-compat
        "REKOMENDASI STRATEGIS",
    ];
    const results: { title: string; content: string }[] = [];
    let remaining = report;

    for (let i = 0; i < knownSections.length; i++) {
        const section = knownSections[i];
        const nextSection = knownSections[i + 1];
        const startIdx = remaining.indexOf(section + ":");
        if (startIdx === -1) continue;

        const contentStart = startIdx + section.length + 1;
        const nextIdx = nextSection ? remaining.indexOf(nextSection + ":") : remaining.length;
        const content = remaining.slice(contentStart, nextIdx === -1 ? undefined : nextIdx).trim();

        if (content) results.push({ title: section, content });
    }

    return results;
}
