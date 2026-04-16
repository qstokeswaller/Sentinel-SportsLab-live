// @ts-nocheck
import React, { useMemo } from 'react';
import { ActivityIcon } from 'lucide-react';
import { ACWR_UTILS } from '../../utils/constants';

export const ACWRMetricCard = ({ athleteId, loadRecords }) => {
    const acwrValue = useMemo(() => {
        const athleteSessions = loadRecords.filter(r => r.athleteId === athleteId);
        if (athleteSessions.length < 14) return 0;

        const sorted = [...athleteSessions].sort((a, b) => new Date(b.date) - new Date(a.date));
        const acute = sorted.slice(0, 7).reduce((acc, r) => acc + (r.sRPE || 0), 0);
        const chronic = sorted.slice(0, 28).reduce((acc, r) => acc + (r.sRPE || 0), 0) / 4;

        return chronic > 0 ? (acute / chronic) : 0;
    }, [athleteId, loadRecords]);

    const status = ACWR_UTILS.getRatioStatus(acwrValue);

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <ActivityIcon size={18} />
                </div>
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color.replace('text-', 'bg-').replace('600', '100')} ${status.color}`}>
                    {status.label}
                </div>
            </div>
            <div>
                <div className="text-xs font-medium text-slate-400 mb-1">Acute:Chronic Ratio</div>
                <div className="text-3xl font-bold text-slate-900">{acwrValue.toFixed(2)}</div>
            </div>
            <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                    <div className="bg-slate-100 h-1.5 flex-1 rounded-full overflow-hidden mr-3">
                        <div
                            className={`h-full transition-all duration-1000 ${status.color.replace('text-', 'bg-')}`}
                            style={{ width: `${Math.min((acwrValue / 2) * 100, 100)}%` }}
                        ></div>
                    </div>
                    <span className="text-xs text-slate-400">2.0 max</span>
                </div>
            </div>
        </div>
    );
};
