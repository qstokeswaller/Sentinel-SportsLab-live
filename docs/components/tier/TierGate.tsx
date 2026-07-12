import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LockIcon, SparklesIcon } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { hasFeatureAccess, requiredTierFor, TIER_LABEL, type Feature } from '../../utils/tierFeatures';

interface TierGateProps {
    feature: Feature;
    children: React.ReactNode;
}

/**
 * Route-level tier guard. Renders an inline "Upgrade required" panel when the
 * current org's subscription tier doesn't include `feature`. Used to block
 * direct URL access to higher-tier pages (Wellness, Conditioning, ACWR, etc.)
 * while keeping the URL so users can bookmark + revisit after upgrading.
 */
export const TierGate: React.FC<TierGateProps> = ({ feature, children }) => {
    const navigate = useNavigate();
    const { currentOrg, orgLoading } = useAppState();

    // Render nothing while we don't yet know the user's tier — covers both the
    // "still loading" case and the brief window where loading completes but
    // currentOrg hasn't been populated yet (e.g. immediately after invite
    // acceptance, before AppStateContext refreshes). Otherwise users would see
    // a flash of the "Upgrade required" panel on pages they actually have access to.
    if (orgLoading || !currentOrg) return null;

    const tier = currentOrg?.tier || null;
    if (hasFeatureAccess(tier, feature)) return <>{children}</>;

    const required = requiredTierFor(feature);

    return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="max-w-md w-full text-center bg-white dark:bg-[#132338] rounded-2xl border border-slate-200 dark:border-[#243A58] p-8 shadow-sm">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <LockIcon size={26} className="text-white" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-1.5">
                    {TIER_LABEL[required]} feature
                </p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0] mb-2">
                    This page is not included in your plan
                </h2>
                <p className="text-sm text-slate-600 dark:text-[#CBD5E1] mb-5 leading-relaxed">
                    Your organisation is on the <span className="font-semibold text-slate-700 dark:text-[#E2E8F0]">{tier ? TIER_LABEL[tier] : 'no'}</span> plan.
                    Upgrade to <span className="font-semibold text-indigo-600 dark:text-indigo-300">{TIER_LABEL[required]}</span> to unlock this.
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex-1 py-2.5 border border-slate-200 dark:border-[#243A58] text-slate-700 dark:text-[#CBD5E1] text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors"
                    >
                        Back to dashboard
                    </button>
                    <button
                        onClick={() => navigate('/settings')}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <SparklesIcon size={16} />
                        Upgrade
                    </button>
                </div>
            </div>
        </div>
    );
};
