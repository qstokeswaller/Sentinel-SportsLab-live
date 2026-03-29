// @ts-nocheck
import React, { useMemo } from 'react';

interface ACWRLineChartProps {
    dates: string[];
    ratioHistory: number[];
    acuteHistory?: number[];
    chronicHistory?: number[];
    restDays?: Set<string>;
    height?: number;
    showAcuteChronic?: boolean;
    title?: string;
}

/* ── colour helpers ─────────────────────────────────────── */
const ZONE = {
    green:  { lo: 0.8, hi: 1.3, fill: '#ecfdf5', opacity: 0.55 },
    amber:  { lo: 1.3, hi: 1.5, fill: '#fffbeb', opacity: 0.45 },
    red:    { lo: 1.5, hi: 2.5, fill: '#fef2f2', opacity: 0.40 },
    blue:   { lo: 0.0, hi: 0.8, fill: '#f0f9ff', opacity: 0.40 },
};

const REF_LINES = [
    { y: 0.8, color: '#0ea5e9', label: 'Under-training' },
    { y: 1.3, color: '#f59e0b', label: 'Caution' },
    { y: 1.5, color: '#ef4444', label: 'Danger' },
];

const getZoneColor = (v: number) => {
    if (v > 1.5)  return '#ef4444';
    if (v > 1.3)  return '#f59e0b';
    if (v >= 0.8) return '#10b981';
    return '#0ea5e9';
};

/* ── nice tick generation ───────────────────────────────── */
function niceYTicks(min: number, max: number, step: number): number[] {
    const ticks: number[] = [];
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    for (let v = lo; v <= hi + step * 0.01; v += step) {
        ticks.push(parseFloat(v.toFixed(2)));
    }
    return ticks;
}

/* ── smooth catmull-rom → cubic bezier path ─────────────── */
function smoothPath(pts: { x: number; y: number }[], tension = 0.35): string {
    if (pts.length < 2) return '';
    if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;

    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];

        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;

        d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
}

/* ── component ──────────────────────────────────────────── */
const ACWRLineChart: React.FC<ACWRLineChartProps> = ({
    dates, ratioHistory, acuteHistory, chronicHistory, restDays,
    height = 260, showAcuteChronic = false, title,
}) => {
    /* guard */
    if (!ratioHistory || ratioHistory.length < 2) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                <p className="text-xs text-slate-400">Not enough data for trendline (need 2+ days)</p>
            </div>
        );
    }

    const hasSecondary = showAcuteChronic && acuteHistory && chronicHistory
        && acuteHistory.length > 1 && chronicHistory.length > 1;

    /* ── layout ─────────────────────────────────────────── */
    const PAD = { top: 28, right: hasSecondary ? 52 : 20, bottom: 52, left: 46 };
    const W = 640;
    const H = height;
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;

    /* ── Y axis range (ratio) ───────────────────────────── */
    const computed = useMemo(() => {
        const dataMin = Math.min(...ratioHistory);
        const dataMax = Math.max(...ratioHistory);
        // Always show 0.8 and 1.5 thresholds, plus some breathing room
        const yMin = Math.min(dataMin - 0.15, 0.4);
        const yMax = Math.max(dataMax + 0.2, 1.7);
        // Clamp the bottom no lower than 0
        const finalMin = Math.max(0, Math.floor(yMin * 5) / 5); // snap to 0.2 increments
        const finalMax = Math.ceil(yMax * 5) / 5;

        const yTicks = niceYTicks(finalMin, finalMax, 0.2);
        return { yMin: finalMin, yMax: finalMax, yTicks };
    }, [ratioHistory]);

    const { yMin, yMax, yTicks } = computed;

    /* ── scale functions ────────────────────────────────── */
    const yScale = (v: number) => PAD.top + cH - ((v - yMin) / (yMax - yMin)) * cH;
    const xScale = (i: number) => PAD.left + (i / (ratioHistory.length - 1)) * cW;

    /* ── secondary Y axis for acute/chronic loads ───────── */
    const loadScale = useMemo(() => {
        if (!hasSecondary) return null;
        const all = [...(acuteHistory || []), ...(chronicHistory || [])];
        const lo = 0;
        const hi = Math.max(...all) * 1.15;
        return {
            min: lo, max: hi,
            y: (v: number) => PAD.top + cH - ((v - lo) / (hi - lo)) * cH,
            ticks: niceYTicks(0, hi, Math.ceil(hi / 5 / 100) * 100 || 100),
        };
    }, [hasSecondary, acuteHistory, chronicHistory]);

    /* ── data points for ratio line ─────────────────────── */
    const pts = ratioHistory.map((v, i) => ({ x: xScale(i), y: yScale(v) }));
    const linePath = smoothPath(pts);

    /* ── date labels (show ~8 max) ──────────────────────── */
    const dateLabels = useMemo(() => {
        const maxLabels = 8;
        const step = Math.max(1, Math.ceil(dates.length / maxLabels));
        const labels: { i: number; label: string }[] = [];
        for (let i = 0; i < dates.length; i += step) {
            const d = new Date(dates[i] + 'T00:00:00');
            labels.push({ i, label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) });
        }
        // Ensure last date
        const last = dates.length - 1;
        if (!labels.find(l => l.i === last)) {
            const d = new Date(dates[last] + 'T00:00:00');
            labels.push({ i: last, label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) });
        }
        return labels;
    }, [dates]);

    /* ── zone fills (clipped to chart area) ─────────────── */
    const zoneRects = useMemo(() => {
        const zones = [
            { ...ZONE.blue, clampLo: Math.max(ZONE.blue.lo, yMin), clampHi: Math.min(ZONE.blue.hi, yMax) },
            { ...ZONE.green, clampLo: Math.max(ZONE.green.lo, yMin), clampHi: Math.min(ZONE.green.hi, yMax) },
            { ...ZONE.amber, clampLo: Math.max(ZONE.amber.lo, yMin), clampHi: Math.min(ZONE.amber.hi, yMax) },
            { ...ZONE.red, clampLo: Math.max(ZONE.red.lo, yMin), clampHi: Math.min(ZONE.red.hi, yMax) },
        ];
        return zones
            .filter(z => z.clampHi > z.clampLo)
            .map(z => ({
                y: yScale(z.clampHi),
                h: yScale(z.clampLo) - yScale(z.clampHi),
                fill: z.fill,
                opacity: z.opacity,
            }));
    }, [yMin, yMax]);

    /* ── current value badge ────────────────────────────── */
    const currentRatio = ratioHistory[ratioHistory.length - 1];
    const lastPt = pts[pts.length - 1];
    const badgeColor = getZoneColor(currentRatio);
    const badgeW = 40;
    const badgeH = 18;
    // Position badge above or below point depending on space
    const badgeAbove = lastPt.y - PAD.top > badgeH + 6;
    const badgeY = badgeAbove ? lastPt.y - badgeH - 4 : lastPt.y + 6;
    // Keep badge within chart bounds horizontally
    const badgeX = Math.min(lastPt.x - badgeW / 2, W - PAD.right - badgeW);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            {/* Header + Legend */}
            {title && (
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">{title}</h4>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mb-3 text-[10px] text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5">
                    <svg width="16" height="3"><line x1="0" y1="1.5" x2="16" y2="1.5" stroke="#334155" strokeWidth="2" strokeLinecap="round" /></svg>
                    ACWR Ratio
                </span>
                {hasSecondary && (
                    <>
                        <span className="flex items-center gap-1.5">
                            <svg width="16" height="3"><line x1="0" y1="1.5" x2="16" y2="1.5" stroke="#f87171" strokeWidth="1.5" strokeDasharray="3,2" /></svg>
                            Acute Load
                        </span>
                        <span className="flex items-center gap-1.5">
                            <svg width="16" height="3"><line x1="0" y1="1.5" x2="16" y2="1.5" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3,2" /></svg>
                            Chronic Load
                        </span>
                    </>
                )}
                <span className="flex items-center gap-1.5">
                    <svg width="16" height="3"><line x1="0" y1="1.5" x2="16" y2="1.5" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="4,3" /></svg>
                    <span style={{ color: '#0ea5e9' }}>0.8</span>
                </span>
                <span className="flex items-center gap-1.5">
                    <svg width="16" height="3"><line x1="0" y1="1.5" x2="16" y2="1.5" stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" /></svg>
                    <span style={{ color: '#f59e0b' }}>1.3</span>
                </span>
                <span className="flex items-center gap-1.5">
                    <svg width="16" height="3"><line x1="0" y1="1.5" x2="16" y2="1.5" stroke="#ef4444" strokeWidth="1" strokeDasharray="4,3" /></svg>
                    <span style={{ color: '#ef4444' }}>1.5</span>
                </span>
            </div>

            {/* SVG Chart */}
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full"
                preserveAspectRatio="xMidYMid meet"
                style={{ maxHeight: `${H}px` }}
            >
                <defs>
                    {/* Clip path so nothing bleeds outside the chart area */}
                    <clipPath id="acwr-chart-clip">
                        <rect x={PAD.left} y={PAD.top} width={cW} height={cH} />
                    </clipPath>
                    {/* Gradient for the area fill under the ACWR line */}
                    <linearGradient id="acwr-area-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#334155" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#334155" stopOpacity="0.01" />
                    </linearGradient>
                </defs>

                {/* ── Zone background fills ── */}
                <g clipPath="url(#acwr-chart-clip)">
                    {zoneRects.map((z, i) => (
                        <rect key={i} x={PAD.left} y={z.y} width={cW} height={z.h}
                            fill={z.fill} opacity={z.opacity} />
                    ))}
                </g>

                {/* ── Grid lines ── */}
                {yTicks.map(v => (
                    <line key={`grid-${v}`}
                        x1={PAD.left} x2={PAD.left + cW}
                        y1={yScale(v)} y2={yScale(v)}
                        stroke="#e2e8f0" strokeWidth="0.5"
                    />
                ))}

                {/* ── Reference threshold dashed lines ── */}
                {REF_LINES.filter(r => r.y >= yMin && r.y <= yMax).map(ref => (
                    <line key={`ref-${ref.y}`}
                        x1={PAD.left} x2={PAD.left + cW}
                        y1={yScale(ref.y)} y2={yScale(ref.y)}
                        stroke={ref.color} strokeWidth="1" strokeDasharray="6,4" opacity="0.65"
                    />
                ))}

                {/* ── Rest day markers ── */}
                {restDays && dates.map((d, i) => restDays.has(d) ? (
                    <rect key={`rest-${i}`}
                        x={xScale(i) - 1.5} y={PAD.top} width={3} height={cH}
                        fill="#94a3b8" opacity="0.06" rx="1"
                    />
                ) : null)}

                {/* ── Clipped chart content ── */}
                <g clipPath="url(#acwr-chart-clip)">

                    {/* Area fill under ACWR line */}
                    <path
                        d={linePath + ` L${pts[pts.length - 1].x},${yScale(yMin)} L${pts[0].x},${yScale(yMin)} Z`}
                        fill="url(#acwr-area-gradient)"
                    />

                    {/* Acute/Chronic secondary lines */}
                    {hasSecondary && loadScale && acuteHistory && (
                        <path
                            d={smoothPath(acuteHistory.map((v, i) => ({ x: xScale(i), y: loadScale.y(v) })))}
                            fill="none" stroke="#f87171" strokeWidth="1.3"
                            strokeDasharray="4,3" opacity="0.6"
                            strokeLinejoin="round" strokeLinecap="round"
                        />
                    )}
                    {hasSecondary && loadScale && chronicHistory && (
                        <path
                            d={smoothPath(chronicHistory.map((v, i) => ({ x: xScale(i), y: loadScale.y(v) })))}
                            fill="none" stroke="#818cf8" strokeWidth="1.3"
                            strokeDasharray="4,3" opacity="0.6"
                            strokeLinejoin="round" strokeLinecap="round"
                        />
                    )}

                    {/* ACWR ratio line — color-segmented segments */}
                    {ratioHistory.map((val, i) => {
                        if (i === 0) return null;
                        const prev = ratioHistory[i - 1];
                        // Segment color: use the color of the "worse" end
                        const segColor = getZoneColor(Math.max(val, prev));
                        return (
                            <line key={`seg-${i}`}
                                x1={xScale(i - 1)} y1={yScale(prev)}
                                x2={xScale(i)} y2={yScale(val)}
                                stroke={segColor} strokeWidth="2.5"
                                strokeLinecap="round" strokeLinejoin="round"
                            />
                        );
                    })}

                    {/* Smooth overlay line for visual continuity (semi-transparent) */}
                    <path d={linePath}
                        fill="none" stroke="#334155" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        opacity="0.15"
                    />

                    {/* Data point dots */}
                    {ratioHistory.map((val, i) => (
                        <circle key={`dot-${i}`}
                            cx={xScale(i)} cy={yScale(val)}
                            r={ratioHistory.length > 28 ? 2 : 2.5}
                            fill={getZoneColor(val)} stroke="white" strokeWidth="1.2"
                        />
                    ))}
                </g>

                {/* ── Y axis (left) labels ── */}
                {yTicks.map(v => (
                    <text key={`yl-${v}`}
                        x={PAD.left - 8} y={yScale(v) + 3.5}
                        textAnchor="end" fontSize="9" fill="#94a3b8"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontWeight={v === 0.8 || v === 1.3 || v === 1.5 ? '600' : '400'}
                    >
                        {v.toFixed(1)}
                    </text>
                ))}

                {/* ── Y axis (right) labels for load scale ── */}
                {hasSecondary && loadScale && loadScale.ticks.map(v => (
                    <text key={`yr-${v}`}
                        x={W - PAD.right + 8} y={loadScale.y(v) + 3.5}
                        textAnchor="start" fontSize="8" fill="#a5b4c4"
                        fontFamily="system-ui, -apple-system, sans-serif"
                    >
                        {v}
                    </text>
                ))}
                {hasSecondary && (
                    <text
                        x={W - PAD.right + 8} y={PAD.top - 6}
                        textAnchor="start" fontSize="7" fill="#94a3b8"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontWeight="600"
                    >
                        AU
                    </text>
                )}

                {/* ── X axis date labels ── */}
                {dateLabels.map(({ i, label }) => (
                    <text key={`xl-${i}`}
                        x={xScale(i)} y={PAD.top + cH + 16}
                        textAnchor="end" fontSize="8" fill="#94a3b8"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        transform={`rotate(-35, ${xScale(i)}, ${PAD.top + cH + 16})`}
                    >
                        {label}
                    </text>
                ))}

                {/* ── Axes lines ── */}
                <line x1={PAD.left} x2={PAD.left}
                    y1={PAD.top} y2={PAD.top + cH}
                    stroke="#cbd5e1" strokeWidth="1"
                />
                <line x1={PAD.left} x2={PAD.left + cW}
                    y1={PAD.top + cH} y2={PAD.top + cH}
                    stroke="#cbd5e1" strokeWidth="1"
                />
                {hasSecondary && (
                    <line x1={PAD.left + cW} x2={PAD.left + cW}
                        y1={PAD.top} y2={PAD.top + cH}
                        stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2,2"
                    />
                )}

                {/* ── Current value badge ── */}
                <rect
                    x={badgeX} y={badgeY}
                    width={badgeW} height={badgeH}
                    rx={5} fill={badgeColor}
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
                />
                <text
                    x={badgeX + badgeW / 2} y={badgeY + badgeH / 2 + 3.5}
                    textAnchor="middle" fontSize="9" fill="white" fontWeight="700"
                    fontFamily="system-ui, -apple-system, sans-serif"
                >
                    {currentRatio.toFixed(2)}
                </text>
            </svg>
        </div>
    );
};

export default ACWRLineChart;
