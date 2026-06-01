// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LockIcon, SparklesIcon, XIcon } from 'lucide-react';
import { TIER_LABEL, type Tier, type Feature } from '../../utils/tierFeatures';

interface UpgradePromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    feature: Feature | null;
    requiredTier: Tier | null;
    currentTier: Tier | null;
}

const FEATURE_BLURB: Partial<Record<Feature, string>> = {
    wellness:     'Daily FIFA/IOC wellness check-ins, auto-flag alerts, injury & illness tracking.',
    conditioning: 'Wattbike protocols, HR monitoring, prescribed conditioning sessions.',
    injuries:     'Body-map injury reports and RTP tracking.',
    acwr:         'ACWR load monitoring with individualised safe-band thresholds.',
    gps:          'GPS CSV import with smart column auto-detection (Catapult, Polar, STATSports, any provider).',
    reporting:    'Reporting Hub with GPS Insights, Data Hub, Tracking Hub.',
    analytics:    'Analytics Hub — 5 terminals including Scenario Modelling, Dose-Response, F-V Profile.',
    planner:      'Periodization Planner — block/microcycle scheduling.',
    lab:          'Performance Lab.',
};

export const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
    isOpen, onClose, feature, requiredTier, currentTier,
}) => {
    const navigate = useNavigate();
    if (!isOpen || !feature || !requiredTier) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md bg-white dark:bg-[#132338] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#243A58] overflow-hidden"
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A2D48]"
                    aria-label="Close"
                >
                    <XIcon size={16} />
                </button>

                <div className="p-6 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <LockIcon size={26} className="text-white" />
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-1.5">
                        {TIER_LABEL[requiredTier]} feature
                    </p>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0] mb-2">
                        Upgrade to unlock
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-[#CBD5E1] mb-5 leading-relaxed">
                        {FEATURE_BLURB[feature] || 'This capability is part of a higher plan.'}
                    </p>

                    <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] mb-5">
                        You're currently on <span className="font-semibold text-slate-700 dark:text-[#E2E8F0]">{currentTier ? TIER_LABEL[currentTier] : 'no plan'}</span>.
                        Upgrade to <span className="font-semibold text-indigo-600 dark:text-indigo-300">{TIER_LABEL[requiredTier]}</span> to access this.
                    </div>

                    <button
                        onClick={() => { onClose(); navigate('/settings'); }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <SparklesIcon size={16} />
                        View plans & upgrade
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full mt-2 py-2 text-[12px] text-slate-500 dark:text-[#94A3B8] hover:text-slate-700"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
};
