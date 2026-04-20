// @ts-nocheck
import React, { useMemo } from 'react';

interface ACWRLineChartProps {
    dates: string[];
    ratioHistory: number[];
    acuteHistory?: number[];
    chronicHistory?: number[];
    phases?: string[];   // 'gathering' | 'reliable' per index — gathering segments render grey
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

/* ── adaptive nice tick step ────────────────────────────── */
// Targets ~6-7 ticks. Skips ugly steps like 0.3, 0.4, 0.6, 0.7, 0.8, 0.9.
function niceStep(range: number): number {
    const raw = range / 7;
    if (raw < 0.12) return 0.1;
    if (raw < 0.35) return 0.2;
    if (raw < 0.85) return 0.5;
    if (raw < 1.75) return 1.0;
    return 2.0;
}

function niceYTicks(min: number, max: number, step: number): number[] {
    const ticks: number[] = [];
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    for (let v = lo; v <= hi + step * 0.01; v += step) {
        ticks.push(parseFloat(v.toFixed(2)));
    }
    return ticks;
}

/* ── adaptive date label formatting ────────────────────── */
function formatDateLabel(iso: string, rangeLen: number, spansYears: boolean): string {
    const d = new Date(iso + 'T00:00:00');
    if (spansYears) {
        // Multi-year range: include year so dates are unambiguous
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
    }
    if (rangeLen <= 14) {
        // Short range: weekday + date so nearby days are distinct
        return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    }
    // Default: "7 Jan"
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
    dates, ratioHistory, acuteHistory, chronicHistory, phases,
    restDays, height = 260, showAcuteChronic = false, title,
}) => {
    /* guard */
    if (!ratioHistory || ratioHistory.length < 2) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-center">
                <p className="text-xs text-slate-400">Gathering data — not enough yet for accuracy (need 7+ training days)</p>
            </div>
        );
    }

    const n = ratioHistory.length;
    const hasSecondary = showAcuteChronic && acuteHistory && chronicHistory
        && acuteHistory.length > 1 && chronicHistory.length > 1;

    /* ── adaptive layout ────────────────────────────────── */
    const PAD_RIGHT = 20;
    // Shorter bottom pad when very few points and no rotation needed
    const labelRotate  = n > 7;
    const PAD_BOTTOM   = labelRotate ? 52 : 30;
    const PAD = { top: 28, right: PAD_RIGHT, bottom: PAD_BOTTOM, left: 48 };
    const W = 640;
    const H = height;
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;

    /* ── Y axis range — adaptive step ──────────────────── */
    const computed = useMemo(() => {
        const dataMin = Math.min(...ratioHistory);
        const dataMax = Math.max(...ratioHistory);
        // Always show 0.8–1.5 thresholds with breathing room
        const yMin = Math.max(0, Math.min(dataMin - 0.1, 0.4));
        const yMax = Math.max(dataMax + 0.15, 1.7);
        const range  = yMax - yMin;
        const step   = niceStep(range);
        // Snap bounds to step grid so first/last ticks land cleanly
        const finalMin = Math.max(0, Math.floor(yMin / step) * step);
        const finalMax = Math.ceil(yMax / step) * step;
        const yTicks   = niceYTicks(finalMin, finalMax, step);
        return { yMin: finalMin, yMax: finalMax, yTicks, step };
    }, [ratioHistory]);

    const { yMin, yMax, yTicks } = computed;

    /* ── scale functions ────────────────────────────────── */
    const yScale = (v: number) => PAD.top + cH - ((v - yMin) / (yMax - yMin)) * cH;
    const xScale = (i: number) => PAD.left + (i / Math.max(n - 1, 1)) * cW;

    /* ── secondary Y axis for acute/chronic loads ───────── */
    const loadScale = useMemo(() => {
        if (!hasSecondary) return null;
        const all = [...(acuteHistory || []), ...(chronicHistory || [])];
        if (all.length === 0) return null;
        const lo = 0;
        const hi = Math.max(...all) * 1.15 || 1;
        // Adaptive step for load values (typically 100–2000 AU)
        const loadRange = hi - lo;
        const rawStep   = loadRange / 5;
        const lStep     = rawStep < 50 ? 20
                        : rawStep < 120 ? 50
                        : rawStep < 250 ? 100
                        : rawStep < 500 ? 200
                        : rawStep < 1000 ? 500
                        : 1000;
        return {
            min: lo, max: hi,
            y: (v: number) => PAD.top + cH - ((v - lo) / (hi - lo)) * cH,
            ticks: niceYTicks(0, hi, lStep),
        };
    }, [hasSecondary, acuteHistory, chronicHistory]);

    /* ── data points for ratio line ─────────────────────── */
    const pts      = ratioHistory.map((v, i) => ({ x: xScale(i), y: yScale(v) }));
    const linePath = smoothPath(pts);

    /* ── adaptive date labels ───────────────────────────── */
    const dateLabels = useMemo(() => {
        if (!dates || dates.length === 0) return [];
        const rangeLen = dates.length;
        // Detect multi-year range
        const firstYear = new Date(dates[0] + 'T00:00:00').getFullYear();
        const lastYear  = new Date(dates[dates.length - 1] + 'T00:00:00').getFullYear();
        const spansYears = firstYear !== lastYear;

        // Adaptive max labels based on range length
        const maxLabels = rangeLen <= 7  ? rangeLen          // every day
                        : rangeLen <= 14 ? Math.min(rangeLen, 7)  // every other day
                        : rangeLen <= 60 ? 8
                        : rangeLen <= 180 ? 7
                        : 6;

        const step = Math.max(1, Math.ceil(rangeLen / maxLabels));
        const labels: { i: number; label: string }[] = [];

        for (let i = 0; i < rangeLen; i += step) {
            labels.push({ i, label: formatDateLabel(dates[i], rangeLen, spansYears) });
        }
        // Always include the last date
        const last = rangeLen - 1;
        if (!labels.find(l => l.i === last)) {
            labels.push({ i: last, label: formatDateLabel(dates[last], rangeLen, spansYears) });
        }
        return labels;
    }, [dates]);

    /* ── zone fills (clipped to chart area) ─────────────── */
    const zoneRects = useMemo(() => {
        const zones = [
            { ...ZONE.blue,  clampLo: Math.max(ZONE.blue.lo,  yMin), clampHi: Math.min(ZONE.blue.hi,  yMax) },
            { ...ZONE.green, clampLo: Math.max(ZONE.green.lo, yMin), clampHi: Math.min(ZONE.green.hi, yMax) },
            { ...ZONE.amber, clampLo: Math.max(ZONE.amber.lo, yMin), clampHi: Math.min(ZONE.amber.hi, yMax) },
            { ...ZONE.red,   clampLo: Math.max(ZONE.red.lo,   yMin), clampHi: Math.min(ZONE.red.hi,   yMax) },
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
    const currentRatio = ratioHistory[n - 1];
    const currentPhase = phases?.[phases.length - 1];
    const lastPt       = pts[pts.length - 1];
    const badgeColor   = currentPhase === 'gathering' ? '#94a3b8' : getZoneColor(currentRatio);
    // Wider badge when value is e.g. "2.45" (4 chars)
    const badgeW = currentRatio >= 2 ? 46 : 40;
    const badgeH = 18;
    const badgeAbove = lastPt.y - PAD.top > badgeH + 6;
    const badgeY     = badgeAbove ? lastPt.y - badgeH - 4 : lastPt.y + 6;
    const badgeX     = Math.min(
        Math.max(lastPt.x - badgeW / 2, PAD.left),
        W - PAD.right - badgeW,
    );

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            {/* Header */}
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
                {phases?.some(p => p === 'gathering') && (
                    <span className="flex items-center gap-1.5">
                        <svg width="16" height="3"><line x1="0" y1="1.5" x2="16" y2="1.5" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4,3" /></svg>
                        <span className="text-slate-400">Gathering</span>
                    </span>
                )}
            </div>

            {/* SVG Chart */}
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full"
                preserveAspectRatio="xMidYMid meet"
                style={{ maxHeight: `${H}px` }}
            >
                <defs>
                    <clipPath id="acwr-chart-clip">
                        <rect x={PAD.left} y={PAD.top} width={cW} height={cH} />
                    </clipPath>
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

                {/* ── Grid lines (Y) ── */}
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

                    {/* ACWR ratio line — color-segmented; grey during gathering phase */}
                    {ratioHistory.map((val, i) => {
                        if (i === 0) return null;
                        const prev        = ratioHistory[i - 1];
                        const isGathering = phases?.[i - 1] === 'gathering' || phases?.[i] === 'gathering';
                        const segColor    = isGathering ? '#cbd5e1' : getZoneColor(Math.max(val, prev));
                        return (
                            <line key={`seg-${i}`}
                                x1={xScale(i - 1)} y1={yScale(prev)}
                                x2={xScale(i)}     y2={yScale(val)}
                                stroke={segColor} strokeWidth={isGathering ? 1.5 : 2.5}
                                strokeDasharray={isGathering ? '4,3' : undefined}
                                strokeLinecap="round" strokeLinejoin="round"
                                opacity={isGathering ? 0.6 : 1}
                            />
                        );
                    })}

                    {/* Smooth overlay line for visual continuity */}
                    <path d={linePath}
                        fill="none" stroke="#334155" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        opacity="0.12"
                    />

                    {/* Data point dots — grey during gathering phase */}
                    {ratioHistory.map((val, i) => {
                        const isGathering = phases?.[i] === 'gathering';
                        return (
                            <circle key={`dot-${i}`}
                                cx={xScale(i)} cy={yScale(val)}
                                r={n > 60 ? 1.5 : n > 28 ? 2 : 2.5}
                                fill={isGathering ? '#cbd5e1' : getZoneColor(val)}
                                stroke="white" strokeWidth="1.2"
                                opacity={isGathering ? 0.6 : 1}
                            />
                        );
                    })}
                </g>

                {/* ── Y axis left labels ── */}
                {yTicks.map(v => (
                    <text key={`yl-${v}`}
                        x={PAD.left - 6} y={yScale(v) + 3.5}
                        textAnchor="end" fontSize="9" fill="#94a3b8"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontWeight={v === 0.8 || v === 1.3 || v === 1.5 ? '600' : '400'}
                    >
                        {v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}
                    </text>
                ))}


                {/* ── X axis tick marks at label positions ── */}
                {dateLabels.map(({ i }) => (
                    <line key={`xt-${i}`}
                        x1={xScale(i)} x2={xScale(i)}
                        y1={PAD.top + cH} y2={PAD.top + cH + 4}
                        stroke="#cbd5e1" strokeWidth="1"
                    />
                ))}

                {/* ── X axis date labels — adaptive rotation and format ── */}
                {dateLabels.map(({ i, label }) => {
                    const x = xScale(i);
                    const y = PAD.top + cH + (labelRotate ? 8 : 10);
                    return labelRotate ? (
                        <text key={`xl-${i}`}
                            x={x} y={y}
                            textAnchor="end" fontSize="8" fill="#94a3b8"
                            fontFamily="system-ui, -apple-system, sans-serif"
                            transform={`rotate(-40, ${x}, ${y})`}
                        >{label}</text>
                    ) : (
                        <text key={`xl-${i}`}
                            x={x} y={y}
                            textAnchor="middle" fontSize="8" fill="#94a3b8"
                            fontFamily="system-ui, -apple-system, sans-serif"
                        >{label}</text>
                    );
                })}

                {/* ── Axis lines ── */}
                <line x1={PAD.left} x2={PAD.left}
                    y1={PAD.top} y2={PAD.top + cH}
                    stroke="#cbd5e1" strokeWidth="1"
                />
                <line x1={PAD.left} x2={PAD.left + cW}
                    y1={PAD.top + cH} y2={PAD.top + cH}
                    stroke="#cbd5e1" strokeWidth="1"
                />

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
                    {currentPhase === 'gathering' ? '—' : currentRatio.toFixed(2)}
                </text>
            </svg>
        </div>
    );
};

export default ACWRLineChart;
