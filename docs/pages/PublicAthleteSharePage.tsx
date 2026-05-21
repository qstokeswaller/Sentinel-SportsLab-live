// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    GaugeIcon, HeartIcon, AlertTriangleIcon, FlaskConicalIcon,
    DumbbellIcon, CalendarDaysIcon, ShieldIcon, BadgeCheckIcon,
    TrendingUpIcon, TrendingDownIcon, CheckCircle2Icon, ActivityIcon,
} from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { DatabaseService } from '../services/databaseService';

const fmtDate = (s: string | null | undefined) => {
    if (!s) return '—';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const toneClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    rose:    'bg-rose-50 text-rose-700 border-rose-200',
    sky:     'bg-sky-50 text-sky-700 border-sky-200',
    slate:   'bg-slate-50 text-slate-700 border-slate-200',
};

const Section: React.FC<{ icon?: any; title: string; trailing?: React.ReactNode; children: React.ReactNode }> = ({ icon: Icon, title, trailing, children }) => (
    <section className="bg-white border border-slate-200 rounded-xl">
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
                {Icon && <Icon size={14} className="text-indigo-500" />}
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">{title}</h3>
            </div>
            {trailing}
        </header>
        <div className="p-5">{children}</div>
    </section>
);

const EmptyHint: React.FC<{ text: string }> = ({ text }) => (
    <p className="text-xs text-slate-400 italic">{text}</p>
);

const PublicAthleteSharePage: React.FC = () => {
    const { shareId } = useParams<{ shareId: string }>();
    const [share, setShare] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!shareId) return;
        (async () => {
            try {
                const row = await DatabaseService.fetchAthleteShare(shareId);
                if (!row) { setError('not_found'); return; }
                if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
                    setError('expired');
                    return;
                }
                setShare(row);
            } catch (e) {
                console.error(e);
                setError('error');
            } finally {
                setLoading(false);
            }
        })();
    }, [shareId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Loading</p>
                </div>
            </div>
        );
    }

    if (error || !share) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="max-w-md text-center bg-white border border-slate-200 rounded-xl p-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-rose-50 rounded-full mb-3">
                        <AlertTriangleIcon size={20} className="text-rose-500" />
                    </div>
                    <h2 className="text-base font-semibold text-slate-800">
                        {error === 'expired' ? 'This share link has expired' : 'Share link unavailable'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-2">
                        {error === 'expired'
                            ? 'Ask the coach who shared this for a fresh link.'
                            : 'The link may have been revoked or never existed.'}
                    </p>
                </div>
            </div>
        );
    }

    const data = share.snapshot_data || {};
    const ath = data.athlete || {};
    const acwr = data.acwr || {};
    const wellness = data.wellness;
    const injuries = data.injuries || { active: [], historical: [] };
    const testing = data.testing || [];
    const tonnage = data.tonnage || [];
    const program = data.program || {};
    const phase = data.phase;
    const initials = (ath.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    const acwrColorHex = acwr.color === 'rose' ? '#ef4444' : acwr.color === 'amber' ? '#f59e0b' : acwr.color === 'sky' ? '#0ea5e9' : '#10b981';
    const acwrTone = acwr.color || 'slate';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
                {/* Branding */}
                <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <ActivityIcon size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">Sentinel SportsLab</span>
                        <span className="text-[10px] uppercase tracking-wide text-slate-400 ml-1">Shared Dossier</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                        Snapshot · {fmtDate(data.generatedAt)}
                    </span>
                </div>

                {/* Header */}
                <section className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex flex-col md:flex-row md:items-center gap-5">
                        <div className="w-20 h-20 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-indigo-100">
                            {ath.image_url ? (
                                <img src={ath.image_url} alt={ath.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-semibold text-indigo-600">{initials}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <h1 className="text-xl font-bold text-slate-900">{ath.name}</h1>
                                {ath.position && (
                                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{ath.position}</span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {ath.team_name && <span className="inline-flex items-center gap-1 text-xs text-slate-500"><ShieldIcon size={11} /> {ath.team_name}</span>}
                                {ath.sport && <span className="text-xs text-slate-400">· {ath.sport}</span>}
                                {ath.age && <span className="text-xs text-slate-400">· {ath.age} yrs</span>}
                                {ath.gender && <span className="text-xs text-slate-400">· {ath.gender}</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${injuries.active.length === 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                    {injuries.active.length === 0 ? 'Available' : 'Modified Training'}
                                </span>
                                {injuries.active.length > 0 && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-600 border-rose-200">
                                        {injuries.active.length} Active Injur{injuries.active.length > 1 ? 'ies' : 'y'}
                                    </span>
                                )}
                                {acwr.value != null && (
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${toneClasses[acwrTone]}`}>
                                        ACWR {Number(acwr.value).toFixed(2)} · {acwr.zone}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Training Load */}
                {acwr.value != null && (
                    <Section icon={GaugeIcon} title="Training Load & ACWR" trailing={
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${toneClasses[acwrTone]}`}>{acwr.zone}</span>
                    }>
                        <div className="space-y-4">
                            <div>
                                <div className="relative h-3 rounded-full overflow-hidden flex">
                                    <div className="bg-sky-200" style={{ width: '40%' }} />
                                    <div className="bg-emerald-200" style={{ width: '25%' }} />
                                    <div className="bg-amber-200" style={{ width: '10%' }} />
                                    <div className="bg-rose-200" style={{ width: '25%' }} />
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-700 shadow"
                                        style={{ left: `calc(${Math.min(Math.max(acwr.value, 0), 2) / 2 * 100}% - 6px)` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-400 mt-1.5">
                                    <span>0.0</span><span>0.8</span><span>1.3</span><span>1.5</span><span>2.0+</span>
                                </div>
                            </div>
                            {acwr.series && acwr.series.length > 1 && (() => {
                                // Normalise series — new format is {date,label,value}; old was number[]
                                const series = acwr.series.map((v: any, i: number) => typeof v === 'number'
                                    ? { i, label: `Day ${i + 1}`, value: v, date: null }
                                    : { i, label: v.label, value: v.value, date: v.date }
                                );
                                const first = series[0];
                                const last = series[series.length - 1];
                                return (
                                    <div>
                                        <div className="flex items-baseline justify-between mb-2">
                                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Last {series.length} Days</div>
                                            {first.date && last.date && (
                                                <div className="text-[10px] text-slate-400">{fmtDate(first.date)} → {fmtDate(last.date)}</div>
                                            )}
                                        </div>
                                        <div className="h-36">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={series} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                    <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" minTickGap={24} />
                                                    <YAxis domain={[0, 2]} tick={{ fontSize: 10 }} />
                                                    <ReferenceLine y={0.8} stroke="#0ea5e9" strokeDasharray="3 3" />
                                                    <ReferenceLine y={1.3} stroke="#f59e0b" strokeDasharray="3 3" />
                                                    <ReferenceLine y={1.5} stroke="#ef4444" strokeDasharray="3 3" />
                                                    <Line type="monotone" dataKey="value" stroke={acwrColorHex} strokeWidth={2} dot={false} />
                                                    <Tooltip
                                                        formatter={(v: any) => [Number(v).toFixed(2), 'ACWR']}
                                                        labelFormatter={(label: any, payload: any) => {
                                                            const d = payload?.[0]?.payload?.date;
                                                            return d ? fmtDate(d) : label;
                                                        }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </Section>
                )}

                {/* Tonnage */}
                {tonnage.length > 0 && (
                    <Section icon={DumbbellIcon} title="Planned Tonnage" trailing={
                        tonnage[0]?.date && <span className="text-[10px] text-slate-400">From {fmtDate(tonnage[0].date)}</span>
                    }>
                        <div className="h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={tonnage} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="week" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={20} />
                                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : v} />
                                    <Tooltip
                                        formatter={(v: any) => [`${Number(v).toLocaleString()} kg`, 'Tonnage']}
                                        labelFormatter={(label: any, payload: any) => {
                                            const d = payload?.[0]?.payload?.date;
                                            return d ? `Week of ${fmtDate(d)}` : label;
                                        }}
                                    />
                                    <Bar dataKey="tonnage" radius={[4, 4, 0, 0]}>
                                        {tonnage.map((_: any, i: number) => (
                                            <Cell key={i} fill={i === tonnage.length - 1 ? '#6366f1' : '#a5b4fc'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Section>
                )}

                {/* Wellness */}
                {wellness && (
                    <Section icon={HeartIcon} title="Wellness" trailing={
                        wellness.latest?.date && <span className="text-[10px] text-slate-400">Last: {fmtDate(wellness.latest.date)}</span>
                    }>
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
                            {wellness.trend && wellness.trend.length > 0 && (() => {
                                // Normalise: new shape has `label` + ISO `date`; old shape only had `date` as MM-DD
                                const trend = wellness.trend.map((d: any) => ({
                                    label: d.label || d.date,
                                    fullDate: typeof d.date === 'string' && d.date.length >= 8 ? d.date : null,
                                    fatigue: d.fatigue, sleep: d.sleep, stress: d.stress, soreness: d.soreness,
                                }));
                                return (
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">14-Day Trend</div>
                                        <div className="h-40">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={trend} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={18} />
                                                    <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                                                    <Tooltip labelFormatter={(label: any, payload: any) => {
                                                        const d = payload?.[0]?.payload?.fullDate;
                                                        return d ? fmtDate(d) : label;
                                                    }} />
                                                    <Line type="monotone" dataKey="fatigue" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Fatigue" />
                                                    <Line type="monotone" dataKey="sleep" stroke="#0ea5e9" strokeWidth={1.5} dot={false} name="Sleep" />
                                                    <Line type="monotone" dataKey="stress" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Stress" />
                                                    <Line type="monotone" dataKey="soreness" stroke="#a855f7" strokeWidth={1.5} dot={false} name="Soreness" />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                );
                            })()}
                            {wellness.latest?.fields && wellness.latest.fields.length > 0 && (
                                <div className="space-y-1.5 min-w-[180px]">
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Latest Responses</div>
                                    {wellness.latest.fields.slice(0, 8).map((f: any) => (
                                        <div key={f.key} className="flex items-center justify-between px-3 py-1.5 rounded-lg border bg-slate-50 border-slate-200">
                                            <span className="text-[11px] font-medium capitalize text-slate-700">{f.key.replace(/_/g, ' ')}</span>
                                            <span className="text-sm font-bold text-slate-800">{f.value}<span className="text-[9px] opacity-60">/10</span></span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                {/* Injuries */}
                {(injuries.active.length > 0 || injuries.historical.length > 0) && (
                    <Section icon={AlertTriangleIcon} title="Injuries & Medical History" trailing={
                        <span className="text-[10px] text-slate-400">{injuries.active.length} active · {injuries.historical.length} historical</span>
                    }>
                        <div className="space-y-4">
                            {injuries.active.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-rose-600 mb-2">Currently Active</div>
                                    <div className="grid sm:grid-cols-2 gap-2">
                                        {injuries.active.map((inj: any, i: number) => (
                                            <div key={i} className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                                                <div className="flex items-start justify-between gap-3 mb-1">
                                                    <div className="text-sm font-semibold text-rose-700">{inj.body_area || 'Injury'}</div>
                                                    {inj.severity && (
                                                        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 bg-rose-200 text-rose-700 rounded">{inj.severity}</span>
                                                    )}
                                                </div>
                                                {inj.type && <div className="text-[11px] text-rose-600">{inj.type}</div>}
                                                {inj.date && <div className="text-[10px] text-rose-500/70 mt-1">Reported {fmtDate(inj.date)}</div>}
                                                {inj.notes && <div className="text-[11px] text-rose-600/80 mt-2 italic">"{inj.notes}"</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {injuries.historical.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">History</div>
                                    <div className="space-y-1.5">
                                        {injuries.historical.map((inj: any, i: number) => (
                                            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg">
                                                <CheckCircle2Icon size={14} className="text-emerald-500 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-medium text-slate-700">{inj.body_area || 'Injury'}{inj.type ? ` — ${inj.type}` : ''}</div>
                                                    <div className="text-[10px] text-slate-400">{fmtDate(inj.date)}</div>
                                                </div>
                                                {inj.severity && <span className="text-[9px] font-medium uppercase tracking-wide text-slate-500">{inj.severity}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                {/* Testing */}
                {testing.length > 0 && (
                    <Section icon={FlaskConicalIcon} title="Testing Results" trailing={
                        <span className="text-[10px] text-slate-400">{testing.length} test type{testing.length !== 1 ? 's' : ''}</span>
                    }>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {testing.map((t: any) => (
                                <div key={t.type} className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 capitalize truncate">{t.type.replace(/_/g, ' ')}</div>
                                        {t.delta != null && (
                                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${t.isBetter ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {t.isBetter ? <TrendingUpIcon size={11} /> : <TrendingDownIcon size={11} />}
                                                {Math.abs(Number(t.delta)).toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-2xl font-bold text-slate-800">
                                        {t.latest?.value != null ? Number(t.latest.value).toFixed(1) : '—'}
                                        <span className="text-xs font-medium text-slate-400 ml-1">{t.latest?.unit || ''}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">{fmtDate(t.latest?.date)} · {t.count} record{t.count !== 1 ? 's' : ''}</div>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Program & Phase */}
                {(program.current || program.previous || phase) && (
                    <Section icon={CalendarDaysIcon} title="Current Program & Phase">
                        <div className="grid sm:grid-cols-2 gap-3">
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 mb-2">Next / Current Session</div>
                                {program.current ? (
                                    <>
                                        <div className="text-sm font-semibold text-slate-800">{program.current.title}</div>
                                        <div className="text-[11px] text-slate-500 mt-1">Scheduled {fmtDate(program.current.date)}</div>
                                    </>
                                ) : <EmptyHint text="No upcoming sessions." />}
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Last Session</div>
                                {program.previous ? (
                                    <>
                                        <div className="text-sm font-semibold text-slate-800">{program.previous.title}</div>
                                        <div className="text-[11px] text-slate-500 mt-1">{fmtDate(program.previous.date)}</div>
                                    </>
                                ) : <EmptyHint text="No prior sessions." />}
                            </div>
                        </div>
                        {phase && (
                            <div className="mt-3 bg-white border border-slate-200 rounded-lg p-4">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Periodisation Phase</div>
                                <div className="text-sm font-semibold text-slate-800">{phase.name}</div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 my-2">
                                    <span>{fmtDate(phase.startDate)} → {fmtDate(phase.endDate)}</span>
                                    {phase.trainingPhase && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{phase.trainingPhase}</span>
                                    )}
                                </div>
                                <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 bg-indigo-500" style={{ width: `${Math.round((phase.progress || 0) * 100)}%` }} />
                                </div>
                                {phase.block && (
                                    <div className="mt-3 grid sm:grid-cols-3 gap-2">
                                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                                            <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Current Block</div>
                                            <div className="text-xs font-semibold text-slate-700">{phase.block.name}</div>
                                        </div>
                                        {phase.block.intensityLevel && (
                                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                                                <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Intensity</div>
                                                <div className="text-xs font-semibold text-slate-700">{phase.block.intensityLevel}</div>
                                            </div>
                                        )}
                                        {phase.block.volumeLevel && (
                                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                                                <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Volume</div>
                                                <div className="text-xs font-semibold text-slate-700">{phase.block.volumeLevel}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </Section>
                )}

                {/* Notes & Goals */}
                {(ath.goals || ath.notes) && (
                    <Section icon={BadgeCheckIcon} title="Notes & Goals">
                        <div className="grid sm:grid-cols-2 gap-4">
                            {ath.goals && (
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Goals</div>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{ath.goals}</p>
                                </div>
                            )}
                            {ath.notes && (
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Notes</div>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{ath.notes}</p>
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                <div className="text-center text-[10px] text-slate-400 pt-4 pb-8">
                    This is a read-only snapshot. Data reflects the athlete's state on {fmtDate(data.generatedAt)}.
                </div>
            </div>
        </div>
    );
};

export default PublicAthleteSharePage;
