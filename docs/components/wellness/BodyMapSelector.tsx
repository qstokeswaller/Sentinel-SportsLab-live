import React, { useState } from 'react';
import { BodyMapArea } from '../../types/types';
import { BODY_MAP_AREAS } from '../../utils/mocks';

interface BodyMapSelectorProps {
    value: BodyMapArea[];
    onChange: (areas: BodyMapArea[]) => void;
}

const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({ value, onChange }) => {
    const [view, setView] = useState<'front' | 'back'>('front');

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

    const getIntensityColor = (severity: number) => {
        switch (severity) {
            case 1: return 'bg-yellow-400';
            case 2: return 'bg-orange-500';
            case 3: return 'bg-red-600';
            default: return 'bg-slate-200';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-center p-1 bg-slate-100 rounded-lg w-fit mx-auto">
                <button
                    type="button"
                    onClick={() => setView('front')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'front' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Front View
                </button>
                <button
                    type="button"
                    onClick={() => setView('back')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'back' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Back View
                </button>
            </div>

            <div className="relative aspect-[3/4] max-w-[300px] mx-auto bg-slate-50 rounded-2xl border-2 border-slate-100 p-4 min-h-[400px]">
                {/* Anatomical background image */}
                <img
                    src={view === 'front' ? "/body-map.png" : "/body-map.png"} // Using the suggested body-map.png
                    alt="Body Map"
                    className="w-full h-full object-contain opacity-40 grayscale"
                />

                {/* Hotspots */}
                <div className="absolute inset-0 p-4 flex flex-wrap content-start justify-center gap-2 overflow-y-auto">
                    {BODY_MAP_AREAS.filter(a => a.view === view).map(area => {
                        const selected = value.find(v => v.area === area.key);
                        return (
                            <button
                                key={area.key}
                                type="button"
                                onClick={() => toggleArea(area.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${selected
                                        ? `${getIntensityColor(selected.severity)} text-white border-transparent scale-105 shadow-md`
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <span className="text-xs font-semibold">{area.label}</span>
                                {selected && (
                                    <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-center gap-4 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-400" /> Mild
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500" /> Moderate
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-600" /> Severe
                </div>
            </div>
        </div>
    );
};

export default BodyMapSelector;
