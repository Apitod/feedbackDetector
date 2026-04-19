"use client";

import { FeedbackItem } from "@/lib/store";
import {
    Instagram,
    Music2,
    Facebook,
    MapPin,
    Globe,
    Star,
    ChevronDown,
    Smile,
    Meh,
    Frown,
} from "lucide-react";

// ─── Source Badge ─────────────────────────────────────────────────────────────
export function SourceBadge({ source }: { source: string }) {
    const config = {
        instagram: { label: "Instagram", icon: Instagram, cls: "source-ig" },
        tiktok: { label: "TikTok", icon: Music2, cls: "source-tiktok" },
        facebook: { label: "Facebook", icon: Facebook, cls: "source-facebook" },
        google_maps: { label: "Google Maps", icon: MapPin, cls: "source-maps" },
    }[source] ?? { label: source, icon: Globe, cls: "badge-neutral" };

    const Icon = config.icon;
    return (
        <span className={`badge ${config.cls}`}>
            <Icon size={10} />
            {config.label}
        </span>
    );
}

// ─── Sentiment Badge ──────────────────────────────────────────────────────────
export function SentimentBadge({
    sentiment,
}: {
    sentiment?: FeedbackItem["sentiment"];
}) {
    if (!sentiment) return <span className="badge badge-neutral">Netral</span>;
    const config = {
        positif: { label: "Positif", cls: "badge-positive", icon: Smile },
        negatif: { label: "Negatif", cls: "badge-negative", icon: Frown },
        netral: { label: "Netral", cls: "badge-neutral", icon: Meh },
    }[sentiment] ?? { label: "Netral", cls: "badge-neutral", icon: Meh };

    const Icon = config.icon;
    return (
        <span className={`badge ${config.cls}`}>
            <Icon size={10} />
            {config.label}
        </span>
    );
}

// ─── Rating Stars ─────────────────────────────────────────────────────────────
export function RatingDisplay({ rating }: { rating: FeedbackItem["rating"] }) {
    if (rating === null || rating === undefined || rating === "") {
        return <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>;
    }
    const num = Number(rating);
    if (isNaN(num)) {
        return <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{rating}</span>;
    }
    return (
        <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    size={11}
                    fill={i < num ? "#f59e0b" : "none"}
                    color={i < num ? "#f59e0b" : "#374151"}
                    strokeWidth={1.5}
                />
            ))}
            <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 4 }}>
                ({num})
            </span>
        </span>
    );
}

// ─── Filter Select ────────────────────────────────────────────────────────────
export function FilterSelect({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    appearance: "none",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "7px 32px 7px 12px",
                    cursor: "pointer",
                    outline: "none",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                }}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value} style={{ background: "white", color: "black" }}>
                        {o.label}
                    </option>
                ))}
            </select>
            <ChevronDown
                size={13}
                style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                }}
            />
        </div>
    );
}
// ─── Triage Badge ────────────────────────────────────────────────────────────
export function TriageBadge({
    priority,
}: {
    priority?: FeedbackItem["triage"];
}) {
    if (!priority) return null;
    
    // Icons for each priority
    const AlertOctagon = (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    );
    const AlertTriangle = (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
    );
    const Circle = (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle></svg>
    );

    const config = {
        merah: { 
            label: "MERAH (TINGGI)", 
            cls: "badge-negative", 
            icon: AlertOctagon,
            style: { background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }
        },
        kuning: { 
            label: "KUNING (SEDANG)", 
            cls: "badge-warning", 
            icon: AlertTriangle,
            style: { background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.2)" }
        },
        hijau: { 
            label: "HIJAU (RENDAH)", 
            cls: "badge-positive", 
            icon: Circle,
            style: { background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.2)" }
        },
    }[priority] ?? { label: priority, cls: "badge-neutral", icon: Circle, style: {} };

    const Icon = config.icon;
    return (
        <span className={`badge ${config.cls}`} style={{ ...config.style, gap: 5, padding: "2px 8px" }}>
            <Icon size={11} strokeWidth={2.5} />
            {config.label}
        </span>
    );
}
