import React, { useRef, useCallback, memo } from 'react';
import { BodyMapArea, BodyMapConfig, BodyMapAreaDef } from '../../types/types';
import { DEFAULT_BODY_MAP_CONFIG } from '../../utils/mocks';
import { Info } from 'lucide-react';

interface BodyMapSelectorProps {
    value: BodyMapArea[];
    onChange: (areas: BodyMapArea[]) => void;
    config?: BodyMapConfig;
    readOnly?: boolean;
}

const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({ value, onChange, config, readOnly }) => {
    const cfg = config ?? DEFAULT_BODY_MAP_CONFIG;
    const maxSeverity = Math.max(...cfg.severityLevels.map(s => s.value));

    const severityColorMap: Record<number, string> = {};
    const severityLabelMap: Record<number, string> = {};
    for (const s of cfg.severityLevels) {
        severityColorMap[s.value] = s.legendColor;
        severityLabelMap[s.value] = s.shortLabel;
    }

    // Per-area debounce to prevent accidental double-tap severity cycling
    const lastClickRef = useRef<Record<string, number>>({});

    const toggleArea = useCallback((areaKey: string) => {
        if (readOnly) return;
        const now = Date.now();
        if (now - (lastClickRef.current[areaKey] || 0) < 150) return;
        lastClickRef.current[areaKey] = now;

        const areaDef = cfg.areas.find(a => a.key === areaKey);
        const useSeverity = areaDef?.hasSeverity !== false;
        const existing = value.find(a => a.area === areaKey);

        if (existing) {
            if (useSeverity && existing.severity < maxSeverity) {
                onChange(value.map(a => a.area === areaKey ? { ...a, severity: (a.severity + 1) as any } : a));
            } else {
                onChange(value.filter(a => a.area !== areaKey));
            }
        } else {
            onChange([...value, { area: areaKey, severity: 1 }]);
        }
    }, [readOnly, value, onChange, cfg.areas, maxSeverity]);

    const frontAreas = cfg.areas.filter(a => a.view === 'front');
    const backAreas = cfg.areas.filter(a => a.view === 'back');

    const AreaButton = memo(({ area, selected, onToggle, readOnly: ro }: {
        area: BodyMapAreaDef;
        selected?: BodyMapArea;
        onToggle: (key: string) => void;
        readOnly?: boolean;
    }) => {
        const useSeverity = area.hasSeverity !== false;
        const sevColor = selected && useSeverity ? severityColorMap[selected.severity] : undefined;
        const isSimpleSelected = selected && !useSeverity;
        return (
            <button
                type="button"
                onClick={() => onToggle(area.key)}
                disabled={ro}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${ro ? '' : 'active:scale-95'} ${
                    isSimpleSelected
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : selected && useSeverity
                            ? 'text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                } ${ro ? 'cursor-default' : 'cursor-pointer'}`}
                style={sevColor ? { backgroundColor: sevColor, borderColor: sevColor } : undefined}
            >
                <span className="flex items-center gap-2">
                    <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: area.color }}
                    />
                    {area.label}
                </span>
                {selected && useSeverity && (
                    <span className="text-[10px] font-bold opacity-80 ml-1 shrink-0">
                        {severityLabelMap[selected.severity]}
                    </span>
                )}
                {isSimpleSelected && (
                    <span className="text-[10px] font-bold opacity-80 ml-1 shrink-0">&#10003;</span>
                )}
            </button>
        );
    });

    return (
        <div className="space-y-4">
            {/* Instructions & Severity Legend — prominent callout at top */}
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                    <Info size={16} className="text-cyan-600 shrink-0 mt-0.5" />
                    <ol className="text-sm font-semibold text-cyan-800 list-decimal list-inside space-y-0.5">
                        {(cfg.instructionText || '1. Tap an area to mark it\n2. Tap again to increase severity of injury\n3. Tap a third time to clear')
                            .split('\n')
                            .map((line, i) => {
                                const text = line.replace(/^\d+\.\s*/, '');
                                return <li key={i}>{text}</li>;
                            })}
                    </ol>
                </div>
                <div className="flex justify-center gap-4 text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    {cfg.severityLevels.map(s => (
                        <div key={s.value} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.legendColor }} /> {s.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Reference image */}
            {cfg.referenceImageUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-100 bg-white">
                    <img
                        src={cfg.referenceImageUrl}
                        alt="Body reference — front and back"
                        className="w-full object-contain max-h-56"
                    />
                </div>
            )}

            {/* Two-column area list */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {frontAreas.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Front</p>
                        {frontAreas.map(area => <AreaButton key={area.key} area={area} selected={value.find(v => v.area === area.key)} onToggle={toggleArea} readOnly={readOnly} />)}
                    </div>
                )}
                {backAreas.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Back</p>
                        {backAreas.map(area => <AreaButton key={area.key} area={area} selected={value.find(v => v.area === area.key)} onToggle={toggleArea} readOnly={readOnly} />)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BodyMapSelector;
