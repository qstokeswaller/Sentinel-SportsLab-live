// KPI info reference content + modal — moved verbatim from DashboardPage.tsx
// (monolith restructure, 2026-07-12).
import React from 'react';
import { XIcon, AlertTriangleIcon, ActivityIcon, ClockIcon, CheckCircle2Icon } from 'lucide-react';

export type KpiInfoKey = 'flagged' | 'acwr' | 'sleep' | 'readiness';

// Reference content for each top-row KPI tile — purpose, what the number means,
// where the data comes from, what the possible states / colours indicate, and
// suggested coaching action. Surfaced via the small ⓘ button on each tile.
export const KPI_INFO: Record<KpiInfoKey, {
    title: string;
    accent: 'rose' | 'amber' | 'sky' | 'indigo';
    Icon: any;
    purpose: string;
    dataSource: string;
    states: { label: string; tone: 'good' | 'warn' | 'bad' | 'neutral'; meaning: string }[];
    coachingAction: string;
}> = {
    flagged: {
        title: 'Flagged',
        accent: 'rose',
        Icon: AlertTriangleIcon,
        purpose: 'Athletes who returned concerning answers in their latest daily wellness check-in — high fatigue, high soreness, low mood, illness, or injury markers. The count is your "needs-a-conversation" list for the day.',
        dataSource: 'Daily wellness check-in form responses. Athletes submit via the link you share from Wellness → daily check-in (the built-in template uses fatigue, soreness, sleep, stress and mood on a 1–7 scale). Each submission is evaluated against the flag thresholds your org has configured.',
        states: [
            { label: '0 athletes', tone: 'good', meaning: 'No one flagged today — squad is responding well to current load.' },
            { label: '1–2 athletes', tone: 'warn', meaning: 'Isolated concerns. Open each flagged athlete\'s profile to see which fields tripped the flag, then have a quick check-in before training.' },
            { label: '3+ athletes', tone: 'bad', meaning: 'Squad-wide stress — likely a load, sleep or schedule issue. Consider a deload day, reduce intensity, or talk to the team.' },
        ],
        coachingAction: 'Click the tile number to open the full flagged list. Cross-reference with the Wellness Summary heatmap below to confirm whether it\'s a single bad night for one athlete or a pattern.',
    },
    acwr: {
        title: 'ACWR Risk',
        accent: 'amber',
        Icon: ActivityIcon,
        purpose: 'Athletes whose Acute-to-Chronic Workload Ratio is above 1.5 in the last 7 days. ACWR is the most validated sport-science early-warning indicator for overload injury — it measures whether recent training spikes above what the athlete has been adapted to.',
        dataSource: 'Training sessions logged in Wellness → ACWR Monitoring. Each session contributes a load value (sRPE × duration, total distance, sprint distance, or TRIMP — depending on your Settings → Feature Settings choice). The system computes the 7-day rolling acute load and the 28-day chronic load, then divides to get the ratio.',
        states: [
            { label: '0.8 – 1.3', tone: 'good', meaning: 'Sweet spot — load is similar to what the athlete is adapted to. Lowest injury risk.' },
            { label: '1.3 – 1.5', tone: 'warn', meaning: 'Elevated zone — acceptable for short peaking windows but watch closely.' },
            { label: '> 1.5', tone: 'bad', meaning: 'Danger zone — significantly elevated injury risk. This tile counts athletes in this band.' },
            { label: '< 0.8', tone: 'warn', meaning: 'Detraining zone — not counted here, but ACWR Monitoring flags it separately.' },
        ],
        coachingAction: 'For any athlete in the danger zone, plan their next 7–10 days with reduced volume or intensity to bring the ratio back into the 0.8–1.3 band. Avoid stacking high-load sessions back-to-back.',
    },
    sleep: {
        title: 'Sleep Risk',
        accent: 'sky',
        Icon: ClockIcon,
        purpose: 'Athletes who reported less than 6 hours of sleep in their latest daily check-in. Sleep is the single biggest recovery factor — chronic restriction below 6h elevates injury risk by roughly 1.7× and significantly degrades reaction time, mood, and power output.',
        dataSource: 'The "sleep hours" field in the daily wellness check-in form (your athletes type or pick how many hours they slept the previous night). Captured every morning when they submit.',
        states: [
            { label: '0 athletes', tone: 'good', meaning: 'Everyone slept ≥6h last night — good recovery foundation for today\'s session.' },
            { label: '1–2 athletes', tone: 'warn', meaning: 'A couple of poor sleepers. Check whether it\'s a one-off or a pattern by clicking through to their profile.' },
            { label: '3+ athletes', tone: 'bad', meaning: 'Squad-wide sleep deficit — common before / after travel or in exam periods. Consider lowering the session\'s intensity or reordering the week.' },
        ],
        coachingAction: 'Open each flagged athlete\'s profile to see their multi-day sleep trend. One bad night is normal, two or three in a row is the actionable signal. Consider sleep hygiene conversations, travel scheduling, or a planned recovery day.',
    },
    readiness: {
        title: 'Squad Readiness',
        accent: 'indigo',
        Icon: CheckCircle2Icon,
        purpose: 'A composite, at-a-glance indicator of how ready your squad is to train today. Combines the count of flagged athletes with the severity of those flags into a single label + percentage. Designed to be glanceable from across the room.',
        dataSource: 'Computed live from the latest wellness check-in submissions. The percentage shows the share of the squad that is unflagged ((total − flagged) ÷ total). The label is derived from the share of the squad that IS flagged, with one important override: if any flag is marked Critical, the label is forced to Poor regardless of the percentage.',
        states: [
            { label: 'Ready', tone: 'good', meaning: '<10% of the squad flagged and no critical flags. Green-light a planned heavy session — recovery looks solid across the board.' },
            { label: 'Good', tone: 'warn', meaning: '10–25% of the squad flagged. Most are ready; review the few flagged athletes\' details before training and consider individual modifications.' },
            { label: 'Moderate', tone: 'warn', meaning: '25–40% of the squad flagged. A meaningful chunk has concerns — consider lowering intensity, swapping in recovery work, or substituting individuals.' },
            { label: 'Poor', tone: 'bad', meaning: '40%+ flagged, OR a Critical flag was raised on any athlete. Strongly consider deload, recovery focus, or rescheduling intense work — Critical flags (injury / illness) override everything else.' },
            { label: 'No data', tone: 'neutral', meaning: 'No wellness responses submitted yet for the selected window. Share the daily check-in link from Wellness to start collecting responses.' },
        ],
        coachingAction: 'Treat this tile as your "do I run the session as planned?" gut-check. Note that the percentage and the label can disagree (e.g. "Poor 97%") when a Critical flag has been raised — in that case open the Performance Report or click through to Wellness to see which athlete and why before deciding.',
    },
};

export const KpiInfoModal: React.FC<{ which: KpiInfoKey | null; onClose: () => void }> = ({ which, onClose }) => {
    if (!which) return null;
    const info = KPI_INFO[which];
    const Icon = info.Icon;
    const accentMap = {
        rose:   { iconBg: 'bg-rose-50 dark:bg-rose-900/20', iconText: 'text-rose-500', banner: 'from-rose-600 via-rose-500 to-rose-500' },
        amber:  { iconBg: 'bg-amber-50 dark:bg-amber-900/20', iconText: 'text-amber-500', banner: 'from-amber-600 via-amber-500 to-amber-500' },
        sky:    { iconBg: 'bg-sky-50 dark:bg-sky-900/20', iconText: 'text-sky-500', banner: 'from-sky-600 via-sky-500 to-sky-500' },
        indigo: { iconBg: 'bg-indigo-50 dark:bg-indigo-900/20', iconText: 'text-indigo-500', banner: 'from-indigo-600 via-indigo-500 to-indigo-500' },
    } as const;
    const tonePill = (tone: 'good' | 'warn' | 'bad' | 'neutral') => ({
        good:    'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
        warn:    'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
        bad:     'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50',
        neutral: 'bg-slate-50 dark:bg-[#1A2D48] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]',
    }[tone]);
    const accent = accentMap[info.accent];

    return (
        <div
            className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#132338] rounded-2xl w-full max-w-lg max-h-[85vh] shadow-2xl border border-slate-200 dark:border-[#243A58] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Banner header */}
                <div className={`flex items-center gap-3 bg-gradient-to-r ${accent.banner} px-5 py-3.5 text-white`}>
                    <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
                        <Icon size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/80">Dashboard KPI</p>
                        <h3 className="text-base font-bold leading-tight">{info.title} — how to read this tile</h3>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close" className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 dark:hover:bg-[#1A2D48]/60 flex items-center justify-center transition-colors shrink-0"
                    >
                        <XIcon size={15} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="px-5 py-4 space-y-4 overflow-y-auto no-scrollbar text-[13px] text-slate-700 dark:text-[#CBD5E1] leading-relaxed">
                    <section>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] mb-1.5">What it shows</h4>
                        <p>{info.purpose}</p>
                    </section>

                    <section>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] mb-1.5">Where the data comes from</h4>
                        <p>{info.dataSource}</p>
                    </section>

                    <section>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] mb-2">Possible states</h4>
                        <div className="space-y-1.5">
                            {info.states.map((s, i) => (
                                <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${tonePill(s.tone)}`}>
                                    <span className="text-[11px] font-bold whitespace-nowrap shrink-0 pt-0.5">{s.label}</span>
                                    <span className="text-[12px] leading-snug">{s.meaning}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] mb-1.5">How to act on it</h4>
                        <p>{info.coachingAction}</p>
                    </section>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-[#1A2D48] flex justify-end bg-slate-50/60 dark:bg-[#0F1C30] shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};
