"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { FeedbackItem, AIAnalysis } from "@/lib/store";
import { SentimentPieChart, SourceBarChart } from "@/components/charts";
import { FilterSelect, RatingDisplay, SentimentBadge, SourceBadge } from "@/components/ui-bits";

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
};

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [filterSource, setFilterSource] = useState("semua");
    const [filterSentiment, setFilterSentiment] = useState("semua");
    const [selectedRow, setSelectedRow] = useState<FeedbackItem | null>(null);
    const [isLive, setIsLive] = useState(true);
    const [analysisExpanded, setAnalysisExpanded] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");

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

    // ─── Fetch data ───────────────────────────────────────────────────────────
    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setRefreshing(true);
        try {
            const params = new URLSearchParams();
            if (filterSource !== "semua") params.append("source", filterSource);
            if (filterSentiment !== "semua") params.append("sentiment", filterSentiment);

            const [fbRes, statsRes, analysisRes] = await Promise.all([
                fetch(`/api/feedback?${params.toString()}`),
                fetch("/api/feedback/stats"),
                fetch("/api/feedback/analysis"),
            ]);

            const fbData = await fbRes.json();
            const statsData = await statsRes.json();
            const analysisData = await analysisRes.json();

            setFeedbacks(fbData.data ?? []);
            setStats(statsData.data ?? null);
            setAiAnalysis(analysisData.data ?? null);
            setLastUpdated(new Date());
        } catch (e) {
            console.error("Gagal mengambil data:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filterSource, filterSentiment]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

                {/* ── Stat Cards ── */}
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
                            Dari semua platform
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
                                Data Ulasan
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
                                {feedbacks.length} hasil
                            </span>
                        </div>

                        {/* Filters */}
                        <div style={{ display: "flex", gap: 8 }}>
                            <FilterSelect
                                value={filterSource}
                                onChange={setFilterSource}
                                options={[
                                    { value: "semua", label: "Semua Platform" },
                                    { value: "instagram", label: "Instagram" },
                                    { value: "tiktok", label: "TikTok" },
                                    { value: "facebook", label: "Facebook" },
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
                    ) : feedbacks.length === 0 ? (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "48px 0",
                                color: "var(--text-muted)",
                            }}
                        >
                            <MessageSquare size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                            <p style={{ fontSize: 14 }}>Tidak ada data feedback ditemukan.</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>
                                Coba ubah filter atau kirim data dari n8n.
                            </p>
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
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {feedbacks.map((fb) => (
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

                {/* ── n8n Integration Info Banner ── */}
                <div
                    style={{
                        maxWidth: 1400,
                        margin: "24px auto 0",
                        padding: "0 24px",
                    }}
                >
                    <div
                        style={{
                            background: "rgba(79,70,229,0.04)",
                            border: "1px solid rgba(79,70,229,0.08)",
                            borderRadius: 16,
                            padding: "16px 24px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                        }}
                    >
                    </div>
                </div>
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
                return (
                    <div
                        key={title}
                        style={{
                            background: cfg.bg,
                            border: `1px solid ${cfg.color}33`,
                            borderRadius: 10,
                            padding: 16,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 10,
                                color: cfg.color,
                            }}
                        >
                            {cfg.icon}
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                {title}
                            </span>
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                color: "var(--text-secondary)",
                                lineHeight: 1.7,
                                whiteSpace: "pre-wrap",
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
