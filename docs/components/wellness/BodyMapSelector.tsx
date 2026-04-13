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
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
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

    return (
        <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                    <Info size={16} className="text-cyan-600 shrink-0 mt-0.5" />
                    {selectOnly ? (
                        <p className="text-sm font-semibold text-cyan-800">
                            Tap an area to select it. Tap again to remove. You'll rate severity on the next screen.
                        </p>
                    ) : (
                        <ol className="text-sm font-semibold text-cyan-800 list-decimal list-inside space-y-0.5">
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
                    <div className="flex justify-center gap-4 text-[10px] uppercase tracking-wider font-bold text-slate-500">
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
                <div className="rounded-2xl overflow-hidden border border-slate-100 bg-white">
                    <img
                        src={cfg.referenceImageUrl}
                        alt="Body reference — front and back"
                        className="w-full object-contain max-h-40"
                    />
                </div>
            )}

            {/* Front section */}
            {frontAreas.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">Front of Body</p>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {frontAreas.map(area => <AreaButton key={area.key} area={area} selected={value.find(v => v.area === area.key)} onToggle={toggleArea} readOnly={readOnly} selectOnlyMode={selectOnly} severityColorMap={severityColorMap} severityLabelMap={severityLabelMap} />)}
                    </div>
                </div>
            )}

            {/* Divider between front and back */}
            {frontAreas.length > 0 && backAreas.length > 0 && (
                <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-0.5 bg-slate-200 rounded-full" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300 px-1">↑ Front · Back ↓</span>
                    <div className="flex-1 h-0.5 bg-slate-200 rounded-full" />
                </div>
            )}

            {/* Back section */}
            {backAreas.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">Back of Body</p>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {backAreas.map(area => <AreaButton key={area.key} area={area} selected={value.find(v => v.area === area.key)} onToggle={toggleArea} readOnly={readOnly} selectOnlyMode={selectOnly} severityColorMap={severityColorMap} severityLabelMap={severityLabelMap} />)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BodyMapSelector;
