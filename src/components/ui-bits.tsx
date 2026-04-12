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
                    background: "rgba(13, 21, 48, 0.8)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    fontWeight: 500,
                    padding: "7px 32px 7px 12px",
                    cursor: "pointer",
                    outline: "none",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                }}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value} style={{ background: "#0d1530" }}>
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
