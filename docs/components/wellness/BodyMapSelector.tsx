import React from 'react';
import { BodyMapArea } from '../../types/types';
import { BODY_MAP_AREAS } from '../../utils/mocks';

interface BodyMapSelectorProps {
    value: BodyMapArea[];
    onChange: (areas: BodyMapArea[]) => void;
}

const SEVERITY_STYLES: Record<number, string> = {
    1: 'bg-yellow-400 border-yellow-400 text-white',
    2: 'bg-orange-500 border-orange-500 text-white',
    3: 'bg-red-600 border-red-600 text-white',
};

const SEVERITY_LABELS: Record<number, string> = {
    1: 'Mild',
    2: 'Mod',
    3: 'Severe',
};

const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({ value, onChange }) => {
    const toggleArea = (areaKey: string) => {
        const existing = value.find(a => a.area === areaKey);
        if (existing) {
            if (existing.severity < 3) {
                onChange(value.map(a => a.area === areaKey ? { ...a, severity: (a.severity + 1) as any } : a));
            } else {
                onChange(value.filter(a => a.area !== areaKey));
            }
        } else {
            onChange([...value, { area: areaKey, severity: 1 }]);
        }
    };

    const frontAreas = BODY_MAP_AREAS.filter(a => a.view === 'front');
    const backAreas = BODY_MAP_AREAS.filter(a => a.view === 'back');

    const AreaButton = ({ area }: { area: typeof BODY_MAP_AREAS[0] }) => {
        const selected = value.find(v => v.area === area.key);
        return (
            <button
                type="button"
                onClick={() => toggleArea(area.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all active:scale-95 ${
                    selected
                        ? SEVERITY_STYLES[selected.severity]
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
            >
                <span>{area.label}</span>
                {selected && (
                    <span className="text-[10px] font-bold opacity-80 ml-1 shrink-0">
                        {SEVERITY_LABELS[selected.severity]}
                    </span>
                )}
            </button>
        );
    };

    return (
        <div className="space-y-4">
            {/* Reference image */}
            <div className="rounded-2xl overflow-hidden border border-slate-100 bg-white">
                <img
                    src="/body-image.jpeg"
                    alt="Body reference — front and back"
                    className="w-full object-contain max-h-56"
                />
            </div>

            <p className="text-xs text-slate-400 text-center">
                Tap an area to mark it · tap again to increase severity · tap a third time to clear
            </p>

            {/* Two-column area list */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Front</p>
                    {frontAreas.map(area => <AreaButton key={area.key} area={area} />)}
                </div>
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Back</p>
                    {backAreas.map(area => <AreaButton key={area.key} area={area} />)}
                </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-5 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Mild
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Moderate
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-600" /> Severe
                </div>
            </div>
        </div>
    );
};

export default BodyMapSelector;
