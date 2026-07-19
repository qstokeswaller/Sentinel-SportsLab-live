import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DatabaseService } from '../services/databaseService';
import { AlertCircle, Printer, Activity as ActivityIcon } from 'lucide-react';
import { useForceLightMode } from '../hooks/useForceLightMode';

// ── Branding banner (shared look with the other public share pages) ──────────
const BrandingBanner = () => (
    <div className="bg-white border-b border-slate-100 py-3 print:py-2 print:border-slate-200">
        <div className="flex flex-col items-center justify-center gap-0.5">
            <div className="flex items-center gap-2">
                <img src="/images/sentinel-sportslab-logo.png" alt="Sentinel SportsLab" className="h-10 w-auto shrink-0 select-none" />
                <span className="font-bold text-sm text-slate-900 tracking-tight">
                    Sentinel <span className="text-indigo-600">SportsLab</span>
                </span>
            </div>
            <span className="text-[9px] text-slate-400 tracking-wide uppercase">Athlete Monitoring &amp; Performance Intelligence</span>
        </div>
    </div>
);

const sectionColor = (s: any) => {
    const name = (s?.name || '').toLowerCase();
    const isRest = s?.type === 'Rest' || name.includes('warm') || name.includes('recovery') || name.includes('cool');
    const isInterval = s?.type === 'Interval' || s?.type === 'Max';
    if (isRest) return { border: '#10b981', bg: '#f0fdf4', text: '#065f46' };
    if (isInterval) return { border: '#f43f5e', bg: '#fff1f2', text: '#9f1239' };
    return { border: '#f59e0b', bg: '#fffbeb', text: '#78350f' };
};

const WattbikeBody: React.FC<{ session: any }> = ({ session }) => (
    <div className="space-y-2.5">
        {(session.sections || []).map((s: any, idx: number) => {
            const c = sectionColor(s);
            return (
                <div key={idx} className="rounded-xl p-4 print:break-inside-avoid" style={{ borderLeft: `5px solid ${c.border}`, background: c.bg }}>
                    <div className="flex items-center gap-3.5">
                        <div className="w-7 h-7 rounded-md bg-slate-800 text-white flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</div>
                        <div className="flex-1 flex items-center justify-between flex-wrap gap-2">
                            <div className="text-[15px] font-black uppercase tracking-wide" style={{ color: c.text }}>
                                {s.duration} &nbsp; {s.name || (s.type === 'Interval' ? 'INTERVAL BLOCK' : 'SEGMENT')}
                                {s.type === 'Interval' && s.rounds ? <span className="text-[11px] opacity-50"> ({s.rounds} rounds)</span> : null}
                            </div>
                            <div className="flex gap-5 text-[11px] font-bold uppercase tracking-wide opacity-75" style={{ color: c.text }}>
                                {s.rpm ? <span>{s.rpm} RPM</span> : null}
                                {s.resistance ? <span>{s.resistance}</span> : null}
                                {s.target && !s.rpm ? <span>{s.target}</span> : null}
                            </div>
                        </div>
                    </div>
                    {(s.subSections && s.subSections.length > 0) && (
                        <div className="mt-2.5 pt-2.5 ml-11 border-t border-black/10 space-y-1">
                            {s.subSections.map((ss: any, i: number) => (
                                <div key={i} className="flex justify-between text-[11px] font-bold uppercase tracking-wide opacity-80" style={{ color: c.text }}>
                                    <span className="min-w-[70px]">{ss.label || 'WORK'}</span>
                                    <span className="min-w-[50px]">{ss.duration}</span>
                                    <span className="min-w-[80px]">{ss.rpm ? `${ss.rpm} RPM` : ''}</span>
                                    <span>{ss.resistance || ''}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        })}
    </div>
);

const ConditioningBody: React.FC<{ session: any }> = ({ session }) => (
    <div className="space-y-2.5">
        {session.notes && (
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-[13px] text-slate-600">{session.notes}</div>
        )}
        {(session.sets || []).map((s: any, idx: number) => (
            <div key={idx} className="rounded-xl p-4 print:break-inside-avoid" style={{ borderLeft: '5px solid #0891b2', background: '#f0fdfa' }}>
                <div className="flex items-center gap-3.5">
                    <div className="w-7 h-7 rounded-md bg-slate-800 text-white flex items-center justify-center font-black text-xs shrink-0">S{idx + 1}</div>
                    <div className="flex-1 flex flex-wrap gap-5 items-center">
                        {[
                            ['Reps', s.reps || '—'],
                            ['Work', `${s.workDuration || '—'}${s.workDistance ? ' / ' + s.workDistance + 'm' : ''}`],
                            ['Intensity', `${s.intensityValue || '—'} ${s.intensityType || ''}`],
                            ['Rest', s.restDuration || '—'],
                            ...(s.interSetRest ? [['Inter-set Rest', s.interSetRest]] : []),
                        ].map(([label, val]) => (
                            <div key={label as string}>
                                <span className="text-[11px] text-slate-500 block">{label}</span>
                                <strong className="text-base text-slate-800">{val}</strong>
                            </div>
                        ))}
                    </div>
                </div>
                {s.notes && <div className="mt-2 ml-10 text-xs text-slate-500 italic">{s.notes}</div>}
            </div>
        ))}
    </div>
);

export const PublicConditioningSharePage: React.FC = () => {
    useForceLightMode();
    const { shareId } = useParams<{ shareId: string }>();
    const [share, setShare] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!shareId) return;
        (async () => {
            try {
                const row = await DatabaseService.fetchConditioningShare(shareId);
                if (!row) setError('not_found');
                else setShare(row);
            } catch (e) {
                console.error(e);
                setError('error');
            } finally {
                setLoading(false);
            }
        })();
    }, [shareId]);

    if (loading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
    }

    if (error || !share) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="max-w-md text-center bg-white border border-slate-200 rounded-xl p-8">
                    <AlertCircle size={28} className="text-slate-300 mx-auto mb-3" />
                    <h1 className="text-base font-semibold text-slate-700">Session unavailable</h1>
                    <p className="text-sm text-slate-500 mt-1">This share link is invalid or has expired.</p>
                </div>
            </div>
        );
    }

    const session = share.snapshot_data || {};
    const isWattbike = share.share_type === 'wattbike';
    const meta = isWattbike
        ? `Total Duration: ${session.duration || '—'} · ${(session.sections || []).length} Sections`
        : `${session.modality || ''}${session.totalDuration ? ' · ' + session.totalDuration : ''} · ${session.sets?.length || 0} Sets`;

    return (
        <div className="min-h-screen bg-slate-50 print:bg-white">
            <BrandingBanner />
            <div className="max-w-3xl mx-auto px-4 py-6 print:py-2">
                {/* Header */}
                <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 mb-4 flex items-start justify-between gap-3 print:border-0 print:px-0 print:py-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white shrink-0 print:hidden">
                            <ActivityIcon size={20} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold text-slate-900 leading-tight">{session.title || 'Session'}</h1>
                            <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide font-semibold">{meta}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="print:hidden shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                    >
                        <Printer size={13} /> Download PDF
                    </button>
                </div>

                {isWattbike ? <WattbikeBody session={session} /> : <ConditioningBody session={session} />}
            </div>
        </div>
    );
};

export default PublicConditioningSharePage;
