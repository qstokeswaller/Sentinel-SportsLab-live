import React, { useRef, useCallback, memo, FC } from 'react';
import { BodyMapArea, BodyMapConfig, BodyMapAreaDef } from '../../types/types';
import { DEFAULT_BODY_MAP_CONFIG } from '../../utils/mocks';
import { Info } from 'lucide-react';

interface BodyMapSelectorProps {
    value: BodyMapArea[];
    onChange: (areas: BodyMapArea[]) => void;
    config?: BodyMapConfig;
    readOnly?: boolean;
    /** When true: tap toggles selected/deselected only — no severity cycling (severity set separately) */
    selectOnly?: boolean;
}

// ── AreaButton defined BEFORE BodyMapSelector to avoid any bundler TDZ ──
// Must be at module scope (not inside component body) for React.memo to be effective.
interface AreaButtonProps {
    area: BodyMapAreaDef;
    selected?: BodyMapArea;
    onToggle: (key: string) => void;
    readOnly?: boolean;
    selectOnlyMode?: boolean;
    severityColorMap: Record<number, string>;
    severityLabelMap: Record<number, string>;
}

const AreaButton: FC<AreaButtonProps> = memo(({ area, selected, onToggle, readOnly: ro, selectOnlyMode, severityColorMap, severityLabelMap }) => {
    const useSeverity = area.hasSeverity !== false && !selectOnlyMode;
    const sevColor = selected && useSeverity ? severityColorMap[selected.severity] : undefined;
    const isSimpleSelected = !!selected && !useSeverity;
    return (
        <button
            type="button"
            onClick={() => onToggle(area.key)}
            disabled={ro}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl border-2 text-[11px] font-semibold transition-all ${ro ? '' : 'active:scale-95'} ${
                isSimpleSelected
                    ? 'bg-cyan-600 border-cyan-600 text-white shadow-sm'
                    : selected && useSeverity
                        ? 'text-white'
                        : 'bg-white dark:bg-[#0F1C30] border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1] hover:border-slate-300 dark:hover:border-indigo-500/40'
            } ${ro ? 'cursor-default' : 'cursor-pointer'}`}
            style={sevColor ? { backgroundColor: sevColor, borderColor: sevColor } : undefined}
        >
            <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
                <span className="truncate">{area.label}</span>
            </span>
            {selected && useSeverity && (
                <span className="text-[9px] font-bold opacity-80 ml-1 shrink-0">
                    {severityLabelMap[selected.severity]}
                </span>
            )}
            {isSimpleSelected && (
                <span className="text-[10px] font-bold opacity-80 ml-1 shrink-0">✓</span>
            )}
        </button>
    );
});
AreaButton.displayName = 'AreaButton';

// ── Main component ──────────────────────────────────────────────────────
const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({ value, onChange, config, readOnly, selectOnly }) => {
    const cfg = config ?? DEFAULT_BODY_MAP_CONFIG;
    const maxSeverity = Math.max(...cfg.severityLevels.map(s => s.value));

    const severityColorMap: Record<number, string> = {};
    const severityLabelMap: Record<number, string> = {};
    for (const s of cfg.severityLevels) {
        severityColorMap[s.value] = s.legendColor;
        severityLabelMap[s.value] = s.shortLabel;
    }

    // Per-area debounce to prevent accidental double-tap
    const lastClickRef = useRef<Record<string, number>>({});

    const toggleArea = useCallback((areaKey: string) => {
        if (readOnly) return;
        const now = Date.now();
        if (now - (lastClickRef.current[areaKey] || 0) < 150) return;
        lastClickRef.current[areaKey] = now;

        const existing = value.find(a => a.area === areaKey);

        if (selectOnly) {
            // Simple toggle — no severity cycling
            if (existing) {
                onChange(value.filter(a => a.area !== areaKey));
            } else {
                onChange([...value, { area: areaKey, severity: 1 }]);
            }
            return;
        }

        const areaDef = cfg.areas.find(a => a.key === areaKey);
        const useSeverity = areaDef?.hasSeverity !== false;

        if (existing) {
            if (useSeverity && existing.severity < maxSeverity) {
                onChange(value.map(a => a.area === areaKey ? { ...a, severity: (a.severity + 1) as any } : a));
            } else {
                onChange(value.filter(a => a.area !== areaKey));
            }
        } else {
            onChange([...value, { area: areaKey, severity: 1 }]);
        }
    }, [readOnly, selectOnly, value, onChange, cfg.areas, maxSeverity]);

    const frontAreas = cfg.areas.filter(a => a.view === 'front');
    const backAreas = cfg.areas.filter(a => a.view === 'back');

    // Group areas by their group label, preserving insertion order
    const groupAreas = (areas: typeof frontAreas) => {
        const groups: { label: string; areas: typeof frontAreas }[] = [];
        const seen = new Map<string, number>();
        for (const area of areas) {
            const g = area.group || '';
            if (!seen.has(g)) {
                seen.set(g, groups.length);
                groups.push({ label: g, areas: [] });
            }
            groups[seen.get(g)!].areas.push(area);
        }
        return groups;
    };

    const frontGroups = groupAreas(frontAreas);
    const backGroups = groupAreas(backAreas);

    const renderGroups = (groups: ReturnType<typeof groupAreas>) => (
        <div className="space-y-3">
            {groups.map(g => (
                <div key={g.label}>
                    {g.label && (
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#94A3B8] mb-1.5">{g.label}</p>
                    )}
                    <div className="grid grid-cols-2 gap-1.5">
                        {g.areas.map(area => (
                            <AreaButton
                                key={area.key}
                                area={area}
                                selected={value.find(v => v.area === area.key)}
                                onToggle={toggleArea}
                                readOnly={readOnly}
                                selectOnlyMode={selectOnly}
                                severityColorMap={severityColorMap}
                                severityLabelMap={severityLabelMap}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                    <Info size={16} className="text-cyan-600 dark:text-cyan-300 shrink-0 mt-0.5" />
                    {selectOnly ? (
                        <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                            Tap an area to select it. Tap again to remove. You'll rate severity on the next screen.
                        </p>
                    ) : (
                        <ol className="text-sm font-semibold text-cyan-800 dark:text-cyan-200 list-decimal list-inside space-y-0.5">
                            {(cfg.instructionText || '1. Tap an area to mark it\n2. Tap again to increase severity of injury\n3. Tap a third time to clear')
                                .split('\n')
                                .map((line, i) => {
                                    const text = line.replace(/^\d+\.\s*/, '');
                                    return <li key={i}>{text}</li>;
                                })}
                        </ol>
                    )}
                </div>
                {!selectOnly && (
                    <div className="flex justify-center gap-4 text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-[#CBD5E1]">
                        {cfg.severityLevels.map(s => (
                            <div key={s.value} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.legendColor }} /> {s.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reference image */}
            {cfg.referenceImageUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-[#243A58] bg-white dark:bg-[#0F1C30]">
                    <img
                        src={cfg.referenceImageUrl}
                        alt="Body reference — front and back"
                        className="w-full object-contain max-h-40"
                    />
                </div>
            )}

            {/* Front section */}
            {frontGroups.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1] shrink-0">Front of Body</p>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-[#243A58]" />
                    </div>
                    {renderGroups(frontGroups)}
                </div>
            )}

            {/* Divider between front and back */}
            {frontGroups.length > 0 && backGroups.length > 0 && (
                <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-0.5 bg-slate-200 dark:bg-[#243A58] rounded-full" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300 dark:text-[#94A3B8] px-1">↑ Front · Back ↓</span>
                    <div className="flex-1 h-0.5 bg-slate-200 dark:bg-[#243A58] rounded-full" />
                </div>
            )}

            {/* Back section */}
            {backGroups.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1] shrink-0">Back of Body</p>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-[#243A58]" />
                    </div>
                    {renderGroups(backGroups)}
                </div>
            )}
        </div>
    );
};

export default BodyMapSelector;
