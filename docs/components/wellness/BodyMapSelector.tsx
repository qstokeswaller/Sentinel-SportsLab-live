import React from 'react';
import { BodyMapArea, BodyMapConfig, BodyMapAreaDef } from '../../types/types';
import { DEFAULT_BODY_MAP_CONFIG } from '../../utils/mocks';

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

    const toggleArea = (areaKey: string) => {
        if (readOnly) return;
        const areaDef = cfg.areas.find(a => a.key === areaKey);
        const useSeverity = areaDef?.hasSeverity !== false; // default true for backward compat
        const existing = value.find(a => a.area === areaKey);

        if (existing) {
            if (useSeverity && existing.severity < maxSeverity) {
                // Cycle severity up
                onChange(value.map(a => a.area === areaKey ? { ...a, severity: (a.severity + 1) as any } : a));
            } else {
                // Remove (toggle off)
                onChange(value.filter(a => a.area !== areaKey));
            }
        } else {
            // Add — severity 1 for severity-enabled, or 1 as simple "selected" for non-severity
            onChange([...value, { area: areaKey, severity: 1 }]);
        }
    };

    const frontAreas = cfg.areas.filter(a => a.view === 'front');
    const backAreas = cfg.areas.filter(a => a.view === 'back');

    const AreaButton = ({ area }: { area: BodyMapAreaDef }) => {
        const selected = value.find(v => v.area === area.key);
        const useSeverity = area.hasSeverity !== false;
        const sevColor = selected && useSeverity ? severityColorMap[selected.severity] : undefined;
        const isSimpleSelected = selected && !useSeverity;
        return (
            <button
                type="button"
                onClick={() => toggleArea(area.key)}
                disabled={readOnly}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${readOnly ? '' : 'active:scale-95'} ${
                    isSimpleSelected
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : selected && useSeverity
                            ? 'text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
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
    };

    return (
        <div className="space-y-4">
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

            <p className="text-xs text-slate-400 text-center">
                {cfg.instructionText || 'Tap an area to mark it \u00b7 tap again to increase severity \u00b7 tap a third time to clear'}
            </p>

            {/* Two-column area list */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {frontAreas.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Front</p>
                        {frontAreas.map(area => <AreaButton key={area.key} area={area} />)}
                    </div>
                )}
                {backAreas.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Back</p>
                        {backAreas.map(area => <AreaButton key={area.key} area={area} />)}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-5 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                {cfg.severityLevels.map(s => (
                    <div key={s.value} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.legendColor }} /> {s.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BodyMapSelector;
