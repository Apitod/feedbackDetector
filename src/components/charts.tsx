"use client";

import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: { name: string; value: number; color?: string }[];
    label?: string;
}) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                {label && (
                    <p style={{ color: "var(--text-secondary)", marginBottom: 4, fontSize: 11 }}>
                        {label}
                    </p>
                )}
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color ?? "var(--text-primary)", fontWeight: 600 }}>
                        {p.name}: {p.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// ─── Pie Chart: Distribusi Sentimen ──────────────────────────────────────────
const SENTIMENT_COLORS = {
    Positif: "#10b981",
    Negatif: "#f43f5e",
    Netral: "#f59e0b",
};

const SENTIMENT_GRADIENT = {
    Positif: ["#10b981", "#059669"],
    Negatif: ["#f43f5e", "#e11d48"],
    Netral: ["#f59e0b", "#d97706"],
};

export function SentimentPieChart({
    data,
}: {
    data: { name: string; value: number }[];
}) {
    const RADIAN = Math.PI / 180;
    const renderCustomLabel = ({
        cx,
        cy,
        midAngle,
        innerRadius,
        outerRadius,
        percent,
    }: {
        cx: number;
        cy: number;
        midAngle: number;
        innerRadius: number;
        outerRadius: number;
        percent: number;
    }) => {
        if (percent < 0.05) return null;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={700}
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    if (!data.length || data.every((d) => d.value === 0)) {
        return (
            <div
                style={{
                    height: 220,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    fontSize: 13,
                }}
            >
                Belum ada data sentimen
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={240}>
            <PieChart>
                <defs>
                    {Object.entries(SENTIMENT_GRADIENT).map(([name, [start, end]]) => (
                        <linearGradient key={name} id={`grad-${name}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={start} />
                            <stop offset="100%" stopColor={end} />
                        </linearGradient>
                    ))}
                </defs>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                >
                    {data.map((entry) => (
                        <Cell
                            key={entry.name}
                            fill={`url(#grad-${entry.name})`}
                            stroke="rgba(0,0,0,0.2)"
                            strokeWidth={1}
                        />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    formatter={(value) => (
                        <span
                            style={{
                                color: SENTIMENT_COLORS[value as keyof typeof SENTIMENT_COLORS] ?? "#94a3b8",
                                fontSize: 12,
                                fontWeight: 600,
                            }}
                        >
                            {value}
                        </span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

// ─── Bar Chart: Distribusi Source ─────────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
    Instagram: "#e1306c",
    TikTok: "#25f4ee",
    Facebook: "#1877f2",
    "Google Maps": "#4285f4",
};

export function SourceBarChart({
    data,
}: {
    data: { name: string; value: number }[];
}) {
    if (!data.length || data.every((d) => d.value === 0)) {
        return (
            <div
                style={{
                    height: 220,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    fontSize: 13,
                }}
            >
                Belum ada data sumber
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <defs>
                    {data.map((entry) => (
                        <linearGradient
                            key={entry.name}
                            id={`bar-grad-${entry.name}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor={SOURCE_COLORS[entry.name] ?? "#6366f1"}
                                stopOpacity={0.9}
                            />
                            <stop
                                offset="100%"
                                stopColor={SOURCE_COLORS[entry.name] ?? "#6366f1"}
                                stopOpacity={0.4}
                            />
                        </linearGradient>
                    ))}
                </defs>
                <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
                <Bar dataKey="value" name="Jumlah" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {data.map((entry) => (
                        <Cell
                            key={entry.name}
                            fill={`url(#bar-grad-${entry.name})`}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
