// @ts-nocheck
import React, { useMemo } from 'react';
import { ACWR_UTILS } from '../../utils/constants';
import {
    XIcon, AlertTriangleIcon, ActivityIcon, HeartIcon, MoonIcon,
    ZapIcon, BrainIcon, TrendingUpIcon, ShieldAlertIcon,
} from 'lucide-react';

interface InterventionModalProps {
    athlete: any;
    isOpen: boolean;
    onClose: () => void;
    loadRecords: any[];
    wellnessData: any[];
    acwrOptions?: { metricType?: string; acuteN?: number; chronicN?: number; freezeRestDays?: boolean };
}

const SEVERITY_STYLES = {
    critical: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: ShieldAlertIcon, badge: 'bg-rose-100 text-rose-600' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: AlertTriangleIcon, badge: 'bg-amber-100 text-amber-600' },
    info: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', icon: ZapIcon, badge: 'bg-sky-100 text-sky-600' },
};

const CATEGORY_ICONS = {
    'ACWR': ActivityIcon,
    'Load Spike': TrendingUpIcon,
    'Return from Rest': MoonIcon,
    'Wellness': HeartIcon,
    'Monotony': BrainIcon,
};

const InterventionModal: React.FC<InterventionModalProps> = ({
    athlete, isOpen, onClose, loadRecords, wellnessData, acwrOptions = {},
}) => {
    if (!isOpen || !athlete) return null;

    const acwrResult = useMemo(() => {
        return ACWR_UTILS.calculateAthleteACWR(loadRecords || [], athlete.id, acwrOptions);
    }, [loadRecords, athlete.id, acwrOptions]);

    const reasons = useMemo(() => {
        return ACWR_UTILS.getAthleteRiskReasoning(acwrResult, wellnessData, loadRecords, athlete.id);
    }, [acwrResult, wellnessData, loadRecords, athlete.id]);

    const ratioStatus = ACWR_UTILS.getRatioStatus(acwrResult.ratio);

    // Mini sparkline for last 14 days of ACWR ratio
    const ratioSpark = useMemo(() => {
        const hist = acwrResult.ratioHistory || [];
        return hist.slice(-14);
    }, [acwrResult.ratioHistory]);

    const sparkMax = Math.max(...ratioSpark, 1.5);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`px-6 py-5 border-b ${ratioStatus.status === 'danger' ? 'bg-rose-50 border-rose-100' : ratioStatus.status === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-slate-200 rounded-xl overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${athlete.name}`} alt={athlete.name} className="w-full h-full" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">{athlete.name}</h3>
                                <p className="text-xs text-slate-500">{athlete.position || 'Athlete'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/60 rounded-lg transition-colors">
                            <XIcon size={18} className="text-slate-400" />
                        </button>
                    </div>

                    {/* ACWR Summary Strip */}
                    <div className="mt-4 flex items-center gap-4">
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 px-4 py-3">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">ACWR</div>
                            <div className={`text-2xl font-bold ${ratioStatus.color}`}>{acwrResult.ratio.toFixed(2)}</div>
                            <div className={`text-[10px] font-semibold ${ratioStatus.color}`}>{ratioStatus.label}</div>
                        </div>
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 px-4 py-3">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Acute</div>
                            <div className="text-2xl font-bold text-slate-900">{acwrResult.acute}</div>
                            <div className="text-[10px] text-slate-400">7-day EWMA</div>
                        </div>
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 px-4 py-3">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Chronic</div>
                            <div className="text-2xl font-bold text-slate-900">{acwrResult.chronic}</div>
                            <div className="text-[10px] text-slate-400">28-day EWMA</div>
                        </div>
                    </div>

                    {/* Mini Sparkline */}
                    {ratioSpark.length > 2 && (
                        <div className="mt-3 bg-white rounded-lg border border-slate-200 p-3">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">ACWR Trend (14d)</div>
                            <div className="flex items-end gap-[2px] h-10">
                                {ratioSpark.map((val, i) => {
                                    const h = Math.max((val / sparkMax) * 100, 4);
                                    const color = val > 1.5 ? 'bg-rose-400' : val > 1.3 ? 'bg-amber-400' : val >= 0.8 ? 'bg-emerald-400' : 'bg-sky-400';
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center justify-end">
                                            <div className={`w-full rounded-sm ${color}`} style={{ height: `${h}%` }} />
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-[9px] text-slate-300">14d ago</span>
                                <span className="text-[9px] text-slate-300">Today</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Reasoning Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Risk Analysis</h4>

                    {reasons.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-emerald-400 mb-2">
                                <ActivityIcon size={28} className="mx-auto" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">No specific risk factors detected.</p>
                            <p className="text-xs text-slate-400 mt-1">Athlete is within normal load parameters.</p>
                        </div>
                    ) : (
                        reasons.map((reason, idx) => {
                            const style = SEVERITY_STYLES[reason.severity] || SEVERITY_STYLES.info;
                            const CategoryIcon = CATEGORY_ICONS[reason.category] || ActivityIcon;
                            return (
                                <div key={idx} className={`${style.bg} ${style.border} border rounded-xl p-4`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.badge}`}>
                                            <CategoryIcon size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-bold uppercase tracking-wide ${style.text}`}>{reason.category}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${style.badge}`}>{reason.severity}</span>
                                            </div>
                                            <p className={`text-sm ${style.text}`}>{reason.text}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InterventionModal;
